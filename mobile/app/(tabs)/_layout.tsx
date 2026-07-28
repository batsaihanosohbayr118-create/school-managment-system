import { SymbolView } from 'expo-symbols';
import { Link, Tabs } from 'expo-router';
import { Pressable, View } from 'react-native';
import type { SFSymbol } from 'sf-symbols-typescript';
import type { MobileTab } from '@shared/roles';
import { visibleTabsByRole } from '@shared/roles';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useClientOnlyValue } from '@/components/useClientOnlyValue';
import { useAuth } from '@/lib/auth-context';

/**
 * MobileTab -> the file name expo-router matches it to, its label, and its
 * SF Symbol icon. "home" maps to "index" — the tab group's default route —
 * everything else is named after the tab itself.
 */
const tabMeta: Record<MobileTab, { routeName: string; title: string; icon: SFSymbol }> = {
  home: { routeName: 'index', title: 'Home', icon: 'house.fill' },
  timetable: { routeName: 'timetable', title: 'Timetable', icon: 'calendar' },
  grades: { routeName: 'grades', title: 'Grades', icon: 'chart.bar.fill' },
  attendance: { routeName: 'attendance', title: 'Attendance', icon: 'checkmark.circle.fill' },
  announcements: { routeName: 'announcements', title: 'Announcements', icon: 'megaphone.fill' }
};

/** Where a teacher's "+" on a tab's header should lead, if anywhere. */
const addEntryRouteByTab: Partial<Record<MobileTab, string>> = {
  attendance: '/attendance-entry',
  grades: '/grade-entry'
};

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { session } = useAuth();

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
        headerShown: useClientOnlyValue(false, true),
        headerRight: () => settingsButton
      }}
    >
      {tabs.map((tab) => {
        const meta = tabMeta[tab];
        const addRoute = isTeacher ? addEntryRouteByTab[tab] : undefined;

        return (
          <Tabs.Screen
            key={tab}
            name={meta.routeName}
            options={{
              title: meta.title,
              tabBarIcon: ({ color }) => <SymbolView name={meta.icon} tintColor={color} size={26} />,
              headerRight: addRoute
                ? () => (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
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
                      {settingsButton}
                    </View>
                  )
                : undefined
            }}
          />
        );
      })}
    </Tabs>
  );
}
