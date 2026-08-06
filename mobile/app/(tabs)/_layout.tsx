import { useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Link, Tabs } from 'expo-router';
import { Animated, Pressable, View } from 'react-native';
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
function AddButton({ href, tintColor }: { href: string; tintColor: string }) {
  const rotation = useRef(new Animated.Value(0)).current;

  function spin() {
    rotation.setValue(0);
    Animated.timing(rotation, { toValue: 1, duration: 350, useNativeDriver: true }).start();
  }

  const rotate = rotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });

  return (
    <Link href={href} asChild>
      <Pressable style={{ marginRight: 15 }} onPressIn={spin}>
        {({ pressed }) => (
          <Animated.View style={{ transform: [{ rotate }], opacity: pressed ? 0.5 : 1 }}>
            <Ionicons name="add" size={22} color={tintColor} />
          </Animated.View>
        )}
      </Pressable>
    </Link>
  );
}

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
      <Pressable style={{ marginRight: 15 }}>
        {({ pressed }) => (
          <Ionicons name="settings-outline" size={22} color={Colors[colorScheme].text} style={{ opacity: pressed ? 0.5 : 1 }} />
        )}
      </Pressable>
    </Link>
  );

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme].tint,
        // Disable the static render of the header on web
        // to prevent a hydration error in React Navigation v6.
        headerShown: useClientOnlyValue(false, true),
        headerShadowVisible: false
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
              tabBarIcon: ({ color, focused }) => (
                <View
                  style={{
                    width: 40,
                    height: 28,
                    borderRadius: 14,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: focused ? Colors[colorScheme].tintMuted : 'transparent'
                  }}
                >
                  <Ionicons name={meta.icon} color={color} size={24} />
                </View>
              ),
              headerRight: () => (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  {addRoute ? <AddButton href={addRoute} tintColor={Colors[colorScheme].text} /> : null}
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
