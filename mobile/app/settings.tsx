import { StatusBar } from 'expo-status-bar';
import { Platform, Pressable, StyleSheet } from 'react-native';
import { languages } from '@shared/i18n-tables';

import { Card } from '@/components/Card';
import { Text, View, useThemeColor } from '@/components/Themed';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { useTheme, type ThemePreference } from '@/lib/theme-context';

const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' }
];

export default function SettingsScreen() {
  const { session, signOut } = useAuth();
  const { preference, setPreference } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const mutedColor = useThemeColor({}, 'muted');
  const tint = useThemeColor({}, 'tint');
  const dangerColor = useThemeColor({}, 'danger');
  const borderColor = useThemeColor({}, 'border');

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t.common.account}</Text>

      {session ? (
        <Card style={styles.section}>
          <Text style={[styles.label, { color: mutedColor }]}>Signed in as</Text>
          <Text style={styles.value}>{session.name || session.email}</Text>
          <Text style={[styles.role, { color: tint }]}>{session.role}</Text>
        </Card>
      ) : null}

      <Text style={[styles.sectionTitle, { color: mutedColor }]}>{t.common.appearance}</Text>
      <View style={[styles.segmented, { borderColor }]}>
        {THEME_OPTIONS.map((option) => {
          const active = preference === option.value;
          return (
            <Pressable
              key={option.value}
              style={[styles.segment, active && { backgroundColor: tint }]}
              onPress={() => setPreference(option.value)}
            >
              <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={[styles.sectionTitle, { color: mutedColor }]}>{t.common.language}</Text>
      <View style={[styles.segmented, { borderColor }]}>
        {languages.map((option) => {
          const active = language === option.id;
          return (
            <Pressable
              key={option.id}
              style={[styles.segment, active && { backgroundColor: tint }]}
              onPress={() => setLanguage(option.id)}
            >
              <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{option.name}</Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable style={[styles.signOut, { borderColor: dangerColor }]} onPress={() => signOut()}>
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
  section: {
    marginTop: 16,
    marginBottom: 6,
    gap: 2
  },
  label: {
    fontSize: 13,
    fontWeight: '600'
  },
  value: {
    fontSize: 18,
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
    marginTop: 20,
    marginBottom: 8
  },
  segmented: {
    flexDirection: 'row',
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden'
  },
  segment: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center'
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '600'
  },
  segmentTextActive: {
    color: '#fff'
  },
  signOut: {
    marginTop: 32,
    paddingVertical: 13,
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1.5
  },
  signOutText: {
    fontWeight: '700',
    fontSize: 16
  }
});
