import { StatusBar } from 'expo-status-bar';
import { Platform, Pressable, StyleSheet } from 'react-native';

import { Text, View } from '@/components/Themed';
import { useAuth } from '@/lib/auth-context';

export default function SettingsScreen() {
  const { session, signOut } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>

      {session ? (
        <View style={styles.section}>
          <Text style={styles.label}>Signed in as</Text>
          <Text style={styles.value}>{session.name || session.email}</Text>
          <Text style={styles.role}>{session.role}</Text>
        </View>
      ) : null}

      {/* Language switching (shared/i18n-tables.ts has the en/mn tables the
          web app uses) is not wired up yet. */}

      <Pressable style={styles.signOut} onPress={() => signOut()}>
        <Text style={styles.signOutText}>Log out</Text>
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
    fontSize: 24,
    fontWeight: 'bold'
  },
  section: {
    marginTop: 16
  },
  label: {
    fontSize: 13,
    opacity: 0.6
  },
  value: {
    fontSize: 17,
    fontWeight: '600'
  },
  role: {
    fontSize: 14,
    opacity: 0.7,
    textTransform: 'capitalize'
  },
  signOut: {
    marginTop: 32,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#dc2626',
    borderRadius: 8
  },
  signOutText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16
  }
});
