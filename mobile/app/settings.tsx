import { StatusBar } from 'expo-status-bar';
import { Platform, Pressable, StyleSheet } from 'react-native';

import { Card } from '@/components/Card';
import { Text, View, useThemeColor } from '@/components/Themed';
import { useAuth } from '@/lib/auth-context';

export default function SettingsScreen() {
  const { session, signOut } = useAuth();
  const mutedColor = useThemeColor({}, 'muted');
  const tint = useThemeColor({}, 'tint');
  const dangerColor = useThemeColor({}, 'danger');

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>

      {session ? (
        <Card style={styles.section}>
          <Text style={[styles.label, { color: mutedColor }]}>Signed in as</Text>
          <Text style={styles.value}>{session.name || session.email}</Text>
          <Text style={[styles.role, { color: tint }]}>{session.role}</Text>
        </Card>
      ) : null}

      {/* Language switching (shared/i18n-tables.ts has the en/mn tables the
          web app uses) is not wired up yet. */}

      <Pressable style={[styles.signOut, { borderColor: dangerColor }]} onPress={() => signOut()}>
        <Text style={[styles.signOutText, { color: dangerColor }]}>Log out</Text>
      </Pressable>

      <StatusBar style={Platform.OS === 'ios' ? 'light' : 'auto'} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    gap: 12
  },
  title: {
    fontSize: 26,
    fontWeight: '800'
  },
  section: {
    marginTop: 16,
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
