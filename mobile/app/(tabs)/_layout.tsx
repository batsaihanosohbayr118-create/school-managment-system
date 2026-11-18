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

const tabMeta: Record<MobileTab, { routeName: string; icon: keyof typeof Ionicons.glyphMap }> = {
  home: { routeName: 'index', icon: 'home' },
  timetable: { routeName: 'timetable', icon: 'calendar' },
  subjects: { routeName: 'subjects', icon: 'book' },
  grades: { routeName: 'grades', icon: 'bar-chart' },
  attendance: { routeName: 'attendance', icon: 'checkmark-circle' },
  announcements: { routeName: 'announcements', icon: 'megaphone' }
};

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
  
        headerStyle: { backgroundColor: Colors[colorScheme].card },
        headerTintColor: Colors[colorScheme].text,
        
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
    
        tabBarButton: (props: any) => (
          <Pressable {...props} style={[props.style, { justifyContent: 'center', alignItems: 'center' }]} />
        ),
        sceneStyle: { backgroundColor: Colors[colorScheme].background, paddingBottom: 90 }
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
              title: tabTitle(tab, t, language),
             
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
