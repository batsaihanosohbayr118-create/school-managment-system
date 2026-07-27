import { Linking, Pressable, StyleSheet } from 'react-native';

import { Text, View } from '@/components/Themed';
import { useAuth } from '@/lib/auth-context';

// Unset until NEXT_PUBLIC_SITE_URL is set on the web deployment (see the
// mobile design spec's prerequisites) — do not hardcode a guessed domain.
const WEB_ADMIN_URL = process.env.EXPO_PUBLIC_WEB_ADMIN_URL;

export default function AdminWebOnlyScreen() {
  const { signOut } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Admin tools live on the web</Text>
      <Text style={styles.body}>
        This app covers the day-to-day screens for teachers, students, and parents. Manage students, teachers,
        classes, and payments from the admin dashboard on the web.
      </Text>

      {WEB_ADMIN_URL ? (
        <Pressable style={styles.button} onPress={() => Linking.openURL(WEB_ADMIN_URL)}>
          <Text style={styles.buttonText}>Open the web dashboard</Text>
        </Pressable>
      ) : null}

      <Pressable style={styles.linkButton} onPress={() => signOut()}>
        <Text style={styles.linkText}>Log out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    gap: 16
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center'
  },
  body: {
    fontSize: 15,
    textAlign: 'center',
    opacity: 0.8
  },
  button: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16
  },
  linkButton: {
    alignItems: 'center',
    paddingVertical: 8
  },
  linkText: {
    color: '#2563eb',
    fontSize: 15
  }
});
