import { useState } from 'react';
import { Stack, useRouter } from 'expo-router';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';

import { Text, View, useThemeColor } from '@/components/Themed';
import { authService } from '@/lib/auth';
import { useLanguage } from '@/lib/language-context';

export default function ChangePasswordScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  // TextInput isn't a Themed component, so it doesn't pick up dark mode's
  // colors on its own — typed text was invisible (black on black) before.
  const textColor = useThemeColor({}, 'text');
  const placeholderColor = useThemeColor({}, 'muted');
  const inputBg = useThemeColor({}, 'card');
  const borderColor = useThemeColor({}, 'border');
  const tint = useThemeColor({}, 'tint');
  const dangerColor = useThemeColor({}, 'danger');
  const successColor = useThemeColor({}, 'success');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setError(null);
    setSuccess(false);

    if (newPassword.length < 6) {
      setError(t.mobileForms.passwordTooShort);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t.mobileForms.passwordMismatch);
      return;
    }

    setSubmitting(true);
    try {
      const { error: apiError } = await authService.changePassword({ currentPassword, newPassword });
      if (apiError === 'current-password-invalid') {
        setError(t.mobileForms.currentPasswordInvalid);
      } else if (apiError) {
        setError(t.mobileForms.saveFailed);
      } else {
        setSuccess(true);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } finally {
      setSubmitting(false);
    }
  }

  const inputStyle = [styles.input, { color: textColor, backgroundColor: inputBg, borderColor }];
  const canSubmit = !submitting && currentPassword && newPassword && confirmPassword;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        <Stack.Screen options={{ title: t.mobileForms.changePassword }} />
        <Text style={styles.title}>{t.mobileForms.changePassword}</Text>

        <Text style={[styles.label, { color: placeholderColor }]}>{t.mobileForms.currentPassword}</Text>
        <TextInput
          style={inputStyle}
          placeholderTextColor={placeholderColor}
          value={currentPassword}
          onChangeText={setCurrentPassword}
          editable={!submitting}
          secureTextEntry
          autoFocus
        />

        <Text style={[styles.label, { color: placeholderColor }]}>{t.mobileForms.newPassword}</Text>
        <TextInput
          style={inputStyle}
          placeholderTextColor={placeholderColor}
          value={newPassword}
          onChangeText={setNewPassword}
          editable={!submitting}
          secureTextEntry
        />

        <Text style={[styles.label, { color: placeholderColor }]}>{t.mobileForms.confirmPassword}</Text>
        <TextInput
          style={inputStyle}
          placeholderTextColor={placeholderColor}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          editable={!submitting}
          secureTextEntry
        />

        {error ? <Text style={[styles.error, { color: dangerColor }]}>{error}</Text> : null}
        {success ? <Text style={[styles.success, { color: successColor }]}>{t.mobileForms.passwordUpdated}</Text> : null}

        <Pressable
          style={[styles.submit, { backgroundColor: tint }, !canSubmit && styles.submitDisabled]}
          onPress={handleSubmit}
          disabled={!canSubmit}
        >
          {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>{t.mobileForms.save}</Text>}
        </Pressable>

        <Pressable style={styles.cancel} onPress={() => router.back()} disabled={submitting}>
          <Text style={[styles.cancelText, { color: placeholderColor }]}>{t.common.cancel}</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  content: {
    padding: 20,
    paddingBottom: 48,
    gap: 6
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 12
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 14
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 16,
    marginTop: 4
  },
  error: {
    marginTop: 16,
    fontSize: 13,
    fontWeight: '600'
  },
  success: {
    marginTop: 16,
    fontSize: 13,
    fontWeight: '600'
  },
  submit: {
    marginTop: 24,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3
  },
  submitDisabled: {
    opacity: 0.5
  },
  submitText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16
  },
  cancel: {
    marginTop: 14,
    paddingVertical: 10,
    alignItems: 'center'
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '600'
  }
});
