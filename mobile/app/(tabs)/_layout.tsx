import { SymbolView } from 'expo-symbols';
import { Link, Tabs } from 'expo-router';
import { Pressable, View } from 'react-native';
import type { SFSymbol } from 'sf-symbols-typescript';
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
const tabMeta: Record<MobileTab, { routeName: string; icon: SFSymbol }> = {
  home: { routeName: 'index', icon: 'house.fill' },
  timetable: { routeName: 'timetable', icon: 'calendar' },
  grades: { routeName: 'grades', icon: 'chart.bar.fill' },
  attendance: { routeName: 'attendance', icon: 'checkmark.circle.fill' },
  announcements: { routeName: 'announcements', icon: 'megaphone.fill' }
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
          <SymbolView name="gearshape" size={22} tintColor={Colors[colorScheme].text} style={{ opacity: pressed ? 0.5 : 1 }} />
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
        headerShown: useClientOnlyValue(false, true)
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
              tabBarIcon: ({ color }) => <SymbolView name={meta.icon} tintColor={color} size={26} />,
              headerRight: () => (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  {addRoute ? (
                    <Link href={addRoute} asChild>
                      <Pressable style={{ marginRight: 15 }}>
                        {({ pressed }) => (
                          <SymbolView
                            name="plus"
                            size={22}
                            tintColor={Colors[colorScheme].text}
                            style={{ opacity: pressed ? 0.5 : 1 }}
                          />
                        )}
                      </Pressable>
                    </Link>
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
