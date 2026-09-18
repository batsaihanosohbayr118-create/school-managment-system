import { useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Link, Tabs } from 'expo-router';
import { Animated, Platform, Pressable, StyleSheet, View } from 'react-native';
import type { MobileTab } from '@shared/roles';
import { visibleTabsByRole } from '@shared/roles';
import type { AppCopy, Language } from '@shared/i18n-tables';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useClientOnlyValue } from '@/components/useClientOnlyValue';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';

/**
 * MobileTab -> the file name expo-router matches it to, and its SF Symbol
 * icon. "home" maps to "index" — the tab group's default route — everything
 * else is named after the tab itself.
 */
const tabMeta: Record<MobileTab, { routeName: string; icon: keyof typeof Ionicons.glyphMap }> = {
  home: { routeName: 'index', icon: 'home' },
  timetable: { routeName: 'timetable', icon: 'calendar' },
  subjects: { routeName: 'subjects', icon: 'book' },
  grades: { routeName: 'grades', icon: 'bar-chart' },
  attendance: { routeName: 'attendance', icon: 'checkmark-circle' },
  announcements: { routeName: 'announcements', icon: 'megaphone' }
};

/**
 * shared/i18n-tables.ts's `nav` table covers 4 of the 5 tabs directly
 * (its keys are the wider set of web NavModule names, which happen to
 * match these tab names exactly); "home" has no web equivalent to borrow.
 */
function tabTitle(tab: MobileTab, t: AppCopy, language: Language): string {
  switch (tab) {
    case 'home':
      return language === 'mn' ? 'Нүүр' : 'Home';
    case 'timetable':
      return t.nav.timetable.label;
    case 'subjects':
      return t.nav.subjects.label;
    case 'grades':
      return t.nav.grades.label;
    case 'attendance':
      return t.nav.attendance.label;
    case 'announcements':
      return t.nav.announcements.label;
  }
}

/** Where a teacher's "+" on a tab's header should lead, if anywhere. */
const addEntryRouteByTab: Partial<Record<MobileTab, string>> = {
  attendance: '/attendance-entry',
  grades: '/grade-entry',
  timetable: '/timetable-entry'
};

/**
 * The header "+" spins a half-turn as soon as the finger touches down —
 * `onPressIn`, not `onPress`, because Link's `asChild` clones its own
 * `onPress` (the navigation) onto this Pressable, and defining one here too
 * would race it.
 */
function AddButton({ href, tintColor, badgeColor }: { href: string; tintColor: string; badgeColor: string }) {
  const rotation = useRef(new Animated.Value(0)).current;

  function spin() {
    rotation.setValue(0);
    Animated.timing(rotation, { toValue: 1, duration: 350, useNativeDriver: true }).start();
  }

  const rotate = rotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });

  return (
    <Link href={href} asChild>
      <Pressable
        style={StyleSheet.flatten([headerButtonStyles.badge, { backgroundColor: badgeColor, marginRight: 10 }])}
        onPressIn={spin}
      >
        {({ pressed }) => (
          <Animated.View style={{ transform: [{ rotate }], opacity: pressed ? 0.5 : 1 }}>
            <Ionicons name="add" size={20} color={tintColor} />
          </Animated.View>
        )}
      </Pressable>
    </Link>
  );
}

const headerButtonStyles = StyleSheet.create({
  badge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center'
  }
});

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { session } = useAuth();
  const { t, language } = useLanguage();

  // The root layout's auth gate never lets an admin session reach this
  // group, so `session` here is always a teacher/student/parent by the time
  // this renders. Falling back to an empty tab list rather than throwing
  // keeps a brief render-before-redirect from crashing instead of just
  // showing nothing for a frame.
  const tabs = session ? visibleTabsByRole[session.role] : [];
  const isTeacher = session?.role === 'teacher';

  const settingsButton = (
    <Link href="/settings" asChild>
      <Pressable
        style={StyleSheet.flatten([headerButtonStyles.badge, { backgroundColor: Colors[colorScheme].tintMuted, marginRight: 16 }])}
      >
        {({ pressed }) => (
          <Ionicons name="settings-outline" size={19} color={Colors[colorScheme].tint} style={{ opacity: pressed ? 0.5 : 1 }} />
        )}
      </Pressable>
    </Link>
  );

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme].tint,
        tabBarInactiveTintColor: Colors[colorScheme].tabIconDefault,
        // Disable the static render of the header on web
        // to prevent a hydration error in React Navigation v6.
        headerShown: useClientOnlyValue(false, true),
        headerShadowVisible: false,
        // None of these follow the ambient NavigationThemeProvider theme set
        // in the root layout — bottom-tabs (unlike native-stack) doesn't
        // apply it to its header, tab bar, or scene container, so all three
        // default to a light background regardless of the app's own
        // dark-mode override.
        headerStyle: { backgroundColor: Colors[colorScheme].card },
        headerTintColor: Colors[colorScheme].text,
        // A floating capsule rather than a bar flush with the screen edge —
        // absolute positioning takes it out of layout, which is why
        // sceneStyle below carries extra bottom padding so scrollable
        // content has room to clear it instead of hiding underneath.
        tabBarStyle: {
          position: 'absolute',
          left: 16,
          right: 16,
          bottom: Platform.OS === 'ios' ? 28 : 18,
          height: 64,
          borderRadius: 28,
          borderTopWidth: 0,
          paddingHorizontal: 10,
          backgroundColor: Colors[colorScheme].card,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.15,
          shadowRadius: 16,
          elevation: 8
        },
        tabBarItemStyle: { height: 64 },
        tabBarShowLabel: false,
        // The library's own vertical-tab button style hardcodes
        // `justifyContent: 'flex-start'` (it's built for icon-above-label,
        // top-aligned) — tabBarItemStyle can't reach that inner style, only
        // the outer wrapper around it, so the icon sat near the top of the
        // 64px bar with empty space below it. Re-rendering the button
        // ourselves and appending a centering override after its own
        // `style` array is the only way to win that merge. Plain Pressable,
        // not @react-navigation/elements' PlatformPressable — since SDK 56
        // expo-router's Metro plugin hard-blocks app code importing
        // @react-navigation/* directly (own bundled fork now); it doesn't
        // give ripple-on-Android/opacity-on-iOS, but is otherwise identical
        // here since bottom-tabs already supplies its own press styling.
        //
        // `props` is typed `any`: bottom-tabs' BottomTabBarButtonProps
        // resolves its View/ref/event types against the react-navigation
        // packages' own react-native instance (hoisted to the workspace
        // root), a different nominal source than mobile's own react-native
        // that Pressable here resolves against — the same dual-package
        // situation metro.config.js's singleton forcing already handles at
        // the bundler level, just surfacing here as a tsc-only mismatch.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        tabBarButton: (props: any) => (
          <Pressable {...props} style={[props.style, { justifyContent: 'center', alignItems: 'center' }]} />
        ),
        sceneStyle: { backgroundColor: Colors[colorScheme].background, paddingBottom: 90 }
      }}
    >
      {tabs.map((tab) => {
        const meta = tabMeta[tab];
        const addRoute = isTeacher ? addEntryRouteByTab[tab] : undefined;

        // Always a real function, never `undefined` — an explicit
        // `headerRight: undefined` in a screen's own options is a present
        // key, not a missing one, so it was masking screenOptions'
        // shared default instead of falling back to it (every tab without
        // a "+" was rendering with no header icons at all, gear included).
        return (
          <Tabs.Screen
            key={tab}
            name={meta.routeName}
            options={{
              title: tabTitle(tab, t, language),
              // The active tab gets a small filled circle behind its icon;
              // inactive tabs stay plain — six tabs share the floating bar,
              // so an inline label (variable width per tab) squeezed or
              // distorted the indicator instead of reading as a fixed pill.
              tabBarIcon: ({ color, focused }) => (
                <View
                  style={{
                    width: 40,
                    height: 40,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 20,
                    backgroundColor: focused ? Colors[colorScheme].tint : 'transparent'
                  }}
                >
                  <Ionicons name={meta.icon} color={focused ? '#fff' : color} size={22} />
                </View>
              ),
              headerRight: () => (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  {addRoute ? (
                    <AddButton href={addRoute} tintColor={Colors[colorScheme].tint} badgeColor={Colors[colorScheme].tintMuted} />
                  ) : null}
                  {settingsButton}
                </View>
              )
            }}
          />
        );
      })}
    </Tabs>
  );
}
