import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput
} from 'react-native';
import { SymbolView } from 'expo-symbols';

import { Card } from '@/components/Card';
import { Text, View, useThemeColor } from '@/components/Themed';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // TextInput isn't a Themed component, so it doesn't pick up dark mode's
  // colors on its own — typed text was invisible (black on black) before
  // these were added.
  const textColor = useThemeColor({}, 'text');
  const placeholderColor = useThemeColor({}, 'muted');
  const cardColor = useThemeColor({}, 'card');
  const borderColor = useThemeColor({}, 'border');
  const tint = useThemeColor({}, 'tint');
  const dangerColor = useThemeColor({}, 'danger');
  const dangerMuted = useThemeColor({}, 'dangerMuted');

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    const { error: signInError } = await signIn(email.trim(), password);
    setSubmitting(false);
    if (signInError) {
      setError(signInError === 'invalid-credentials' ? t.mobileForms.invalidCredentials : signInError);
    }
    // On success, signIn() already updated `session`; the root layout's
    // redirect effect takes it from there.
  }

  const canSubmit = !submitting && !!email && !!password;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Image
            source={require('@/assets/images/logo.png')}
            style={styles.crest}
            resizeMode="contain"
          />
          <Text style={styles.title}>Nova Mind Academy</Text>
          <Text style={[styles.subtitle, { color: placeholderColor }]}>Sign in to continue</Text>
        </View>

        <Card style={[styles.formCard, { borderColor, backgroundColor: cardColor }]}>
          <View style={styles.field}>
            <SymbolView name="envelope.fill" size={17} tintColor={placeholderColor} />
            <TextInput
              style={[styles.input, { color: textColor }]}
              placeholder="Email"
              placeholderTextColor={placeholderColor}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              editable={!submitting}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: borderColor }]} />

          <View style={styles.field}>
            <SymbolView name="lock.fill" size={17} tintColor={placeholderColor} />
            <TextInput
              style={[styles.input, { color: textColor }]}
              placeholder="Password"
              placeholderTextColor={placeholderColor}
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
              editable={!submitting}
            />
            <Pressable
              onPress={() => setShowPassword((prev) => !prev)}
              hitSlop={8}
              style={styles.eyeButton}
            >
              <SymbolView
                name={showPassword ? 'eye.slash.fill' : 'eye.fill'}
                size={17}
                tintColor={placeholderColor}
              />
            </Pressable>
          </View>
        </Card>

        {error ? (
          <View style={[styles.errorBanner, { backgroundColor: dangerMuted }]}>
            <SymbolView name="exclamationmark.triangle.fill" size={15} tintColor={dangerColor} />
            <Text style={[styles.errorText, { color: dangerColor }]}>{error}</Text>
          </View>
        ) : null}

        <Pressable
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: tint },
            pressed && canSubmit && styles.buttonPressed,
            !canSubmit && styles.buttonDisabled
          ]}
          onPress={handleSubmit}
          disabled={!canSubmit}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.buttonText}>Log in</Text>
              <SymbolView name="arrow.right" size={16} tintColor="#fff" />
            </>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
    backgroundColor: 'transparent'
  },
  crest: {
    width: 140,
    height: 140
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0.2
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    marginTop: 6
  },
  formCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingVertical: 2
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    backgroundColor: 'transparent'
  },
  input: {
    flex: 1,
    fontSize: 16
  },
  eyeButton: {
    paddingLeft: 8,
    paddingVertical: 4
  },
  divider: {
    height: StyleSheet.hairlineWidth
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 14
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600'
  },
  button: {
    borderRadius: 12,
    paddingVertical: 15,
    marginTop: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.15)',
    elevation: 3
  },
  buttonPressed: {
    opacity: 0.85
  },
  buttonDisabled: {
    opacity: 0.5
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16
  }
});