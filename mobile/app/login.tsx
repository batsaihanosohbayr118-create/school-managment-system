import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput } from 'react-native';

import { Text, View, useThemeColor } from '@/components/Themed';
import { useAuth } from '@/lib/auth-context';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // TextInput isn't a Themed component, so it doesn't pick up dark mode's
  // colors on its own — typed text was invisible (black on black) before
  // these were added.
  const textColor = useThemeColor({}, 'text');
  const placeholderColor = useThemeColor({}, 'muted');
  const inputBg = useThemeColor({}, 'card');
  const borderColor = useThemeColor({}, 'border');
  const tint = useThemeColor({}, 'tint');
  const dangerColor = useThemeColor({}, 'danger');

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    const { error: signInError } = await signIn(email.trim(), password);
    setSubmitting(false);
    if (signInError) setError(signInError);
    // On success, AuthProvider's onAuthStateChange updates `session`; the
    // root layout's redirect effect takes it from there.
  }

  const inputStyle = [styles.input, { color: textColor, backgroundColor: inputBg, borderColor }];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Nova Mind Academy</Text>
      <Text style={[styles.subtitle, { color: placeholderColor }]}>Sign in to continue</Text>

      <TextInput
        style={inputStyle}
        placeholder="Email"
        placeholderTextColor={placeholderColor}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        editable={!submitting}
      />
      <TextInput
        style={inputStyle}
        placeholder="Password"
        placeholderTextColor={placeholderColor}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        editable={!submitting}
      />

      {error ? <Text style={[styles.error, { color: dangerColor }]}>{error}</Text> : null}

      <Pressable
        style={[styles.button, { backgroundColor: tint }, submitting && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={submitting || !email || !password}
      >
        {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Log in</Text>}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    gap: 12
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center'
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 20
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16
  },
  error: {
    marginTop: 4
  },
  button: {
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10
  },
  buttonDisabled: {
    opacity: 0.6
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16
  }
});
