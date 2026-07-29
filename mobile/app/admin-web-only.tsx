import { Linking, Pressable, StyleSheet } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { Text, View, useThemeColor } from '@/components/Themed';
import { useAuth } from '@/lib/auth-context';

// Unset until NEXT_PUBLIC_SITE_URL is set on the web deployment (see the
// mobile design spec's prerequisites) — do not hardcode a guessed domain.
const WEB_ADMIN_URL = process.env.EXPO_PUBLIC_WEB_ADMIN_URL;

export default function AdminWebOnlyScreen() {
  const { signOut } = useAuth();
  const tint = useThemeColor({}, 'tint');
  const mutedColor = useThemeColor({}, 'muted');

  return (
    <View style={styles.container}>
      <SymbolView name="desktopcomputer" size={40} tintColor={tint} />
      <Text style={styles.title}>Admin tools live on the web</Text>
      <Text style={[styles.body, { color: mutedColor }]}>
        This app covers the day-to-day screens for teachers, students, and parents. Manage students, teachers,
        classes, and payments from the admin dashboard on the web.
      </Text>

      {WEB_ADMIN_URL ? (
        <Pressable style={[styles.button, { backgroundColor: tint }]} onPress={() => Linking.openURL(WEB_ADMIN_URL)}>
          <Text style={styles.buttonText}>Open the web dashboard</Text>
        </Pressable>
      ) : null}

      <Pressable style={styles.linkButton} onPress={() => signOut()}>
        <Text style={[styles.linkText, { color: tint }]}>Log out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 14
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center'
  },
  body: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 21
  },
  button: {
    alignSelf: 'stretch',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16
  },
  linkButton: {
    alignItems: 'center',
    paddingVertical: 8
  },
  linkText: {
    fontSize: 15,
    fontWeight: '600'
  }
});
