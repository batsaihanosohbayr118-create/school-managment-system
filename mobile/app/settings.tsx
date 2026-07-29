import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform, Pressable, StyleSheet } from 'react-native';
import { SymbolView } from 'expo-symbols';
import type { SFSymbol } from 'sf-symbols-typescript';
import { languages } from '@shared/i18n-tables';

import { Card } from '@/components/Card';
import { Text, View, useThemeColor } from '@/components/Themed';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { useTheme, type ThemePreference } from '@/lib/theme-context';

const THEME_OPTIONS: { value: ThemePreference; label: string; icon: SFSymbol }[] = [
  { value: 'system', label: 'System', icon: 'circle.lefthalf.filled' },
  { value: 'light', label: 'Light', icon: 'sun.max.fill' },
  { value: 'dark', label: 'Dark', icon: 'moon.fill' }
];

export default function SettingsScreen() {
  const { session, signOut } = useAuth();
  const { preference, setPreference } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const mutedColor = useThemeColor({}, 'muted');
  const tint = useThemeColor({}, 'tint');
  const dangerColor = useThemeColor({}, 'danger');
  const borderColor = useThemeColor({}, 'border');
  const cardColor = useThemeColor({}, 'card');

  const name = session?.name || session?.email || '';
  const initial = name.trim().charAt(0).toUpperCase() || '?';

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: t.nav.settings.label }} />
      <Text style={styles.title}>{t.common.account}</Text>

      {session ? (
        <Card style={styles.accountCard}>
          <View style={[styles.avatar, { backgroundColor: tint }]}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <View style={styles.accountInfo}>
            <Text style={styles.value}>{name}</Text>
            <Text style={[styles.role, { color: tint }]}>{session.role}</Text>
          </View>
        </Card>
      ) : null}

      <Text style={[styles.sectionTitle, { color: mutedColor }]}>{t.common.appearance}</Text>
      <View style={[styles.segmented, { borderColor, backgroundColor: cardColor }]}>
        {THEME_OPTIONS.map((option) => {
          const active = preference === option.value;
          return (
            <Pressable
              key={option.value}
              style={[styles.segment, active && { backgroundColor: tint }]}
              onPress={() => setPreference(option.value)}
            >
              <SymbolView name={option.icon} size={16} tintColor={active ? '#fff' : mutedColor} />
              <Text style={[styles.segmentText, { color: active ? '#fff' : mutedColor }]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={[styles.sectionTitle, { color: mutedColor }]}>{t.common.language}</Text>
      <View style={[styles.segmented, { borderColor, backgroundColor: cardColor }]}>
        {languages.map((option) => {
          const active = language === option.id;
          return (
            <Pressable
              key={option.id}
              style={[styles.segment, active && { backgroundColor: tint }]}
              onPress={() => setLanguage(option.id)}
            >
              <Text style={[styles.segmentText, { color: active ? '#fff' : mutedColor }]}>{option.name}</Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable style={[styles.signOut, { borderColor: dangerColor }]} onPress={() => signOut()}>
        <SymbolView name="rectangle.portrait.and.arrow.right" size={17} tintColor={dangerColor} />
        <Text style={[styles.signOutText, { color: dangerColor }]}>{t.common.logout}</Text>
      </Pressable>

      <StatusBar style={Platform.OS === 'ios' ? 'light' : 'auto'} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    gap: 6
  },
  title: {
    fontSize: 26,
    fontWeight: '800'
  },
  accountCard: {
    marginTop: 16,
    marginBottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800'
  },
  accountInfo: {
    flex: 1,
    gap: 2
  },
  value: {
    fontSize: 17,
    fontWeight: '700'
  },
  role: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'capitalize'
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 22,
    marginBottom: 8
  },
  segmented: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    padding: 4,
    gap: 4
  },
  segment: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 9,
    alignItems: 'center',
    gap: 4
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '700'
  },
  signOut: {
    marginTop: 32,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 10,
    borderWidth: 1.5
  },
  signOutText: {
    fontWeight: '700',
    fontSize: 16
  }
});
