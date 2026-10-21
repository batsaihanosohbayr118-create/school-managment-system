import { useEffect, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  type TextInputProps
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

import { Text, View, useThemeColor } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import { authService } from '@/lib/auth';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import {
  MIN_PASSWORD_LENGTH,
  REGISTRATION_ROLES,
  validateRegistration,
  type RegistrationErrorCode,
  type RegistrationOptions,
  type RegistrationRole
} from '@shared/registration';

const ROLE_ICONS: Record<RegistrationRole, keyof typeof Ionicons.glyphMap> = {
  student: 'school',
  parent: 'people',
  teacher: 'book'
};

/**
 * Self-registration. Students and parents land signed in (the root layout's
 * gate then takes them on, through the app-fee lock for a student); a teacher
 * sees a "waiting for approval" card and goes back to sign in later.
 */
export default function RegisterScreen() {
  const { register } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const copy = t.register;

  const textColor = useThemeColor({}, 'text');
  const mutedColor = useThemeColor({}, 'muted');
  const cardColor = useThemeColor({}, 'card');
  const fieldColor = useThemeColor({}, 'background');
  const borderColor = useThemeColor({}, 'border');
  const tint = useThemeColor({}, 'tint');
  const tintMuted = useThemeColor({}, 'tintMuted');
  const purple = useThemeColor({}, 'purple');
  const dangerColor = useThemeColor({}, 'danger');
  const dangerMuted = useThemeColor({}, 'dangerMuted');
  const successColor = useThemeColor({}, 'success');
  const shadowColor = useThemeColor({}, 'shadow');

  const [role, setRole] = useState<RegistrationRole>('student');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [subject, setSubject] = useState('');
  const [childEmail, setChildEmail] = useState('');
  const [childPassword, setChildPassword] = useState('');
  const [options, setOptions] = useState<RegistrationOptions | null>(null);
  const [optionsFailed, setOptionsFailed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let mounted = true;
    authService.registrationOptions().then((result) => {
      if (!mounted) return;
      if (result) setOptions(result);
      else setOptionsFailed(true);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const messageFor = (code: string) => copy.errors[code as RegistrationErrorCode] ?? (code === 'No connection.' ? code : copy.failed);

  function toggleSubject(subjectName: string) {
    setSubjects((current) => (current.includes(subjectName) ? current.filter((item) => item !== subjectName) : [...current, subjectName]));
  }

  async function handleSubmit() {
    setError(null);
    const input = { role, name, email: email.trim(), password, phone, subjects, subject, childEmail: childEmail.trim(), childPassword };
    const problem = validateRegistration(input);
    if (problem) {
      setError(messageFor(problem));
      return;
    }

    setSubmitting(true);
    const result = await register(input);
    setSubmitting(false);
    if (result.error) setError(messageFor(result.error));
    else if (result.pending) setPending(true);
    // Signed in: the root layout's gate moves on from this screen.
  }

  const chipStyle = (active: boolean) => [
    styles.chip,
    { borderColor: active ? tint : borderColor, backgroundColor: active ? tint : fieldColor }
  ];

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar style="light" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.heroClip}>
          <LinearGradient colors={isDark ? ['#1c3f92', '#4b248e'] : [tint, purple]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
            <Pressable onPress={() => router.back()} hitSlop={10} style={styles.back} accessibilityRole="button" accessibilityLabel={copy.backToLogin}>
              <Ionicons name="chevron-back" size={22} color="#fff" />
            </Pressable>
            <Text style={styles.title}>{copy.title}</Text>
            <Text style={styles.subtitle}>{copy.subtitle}</Text>
          </LinearGradient>
        </View>

        <View style={[styles.sheet, { backgroundColor: cardColor, shadowColor }]}>
          {pending ? (
            <View style={styles.pending}>
              <Ionicons name="checkmark-circle" size={56} color={successColor} />
              <Text style={styles.pendingTitle}>{copy.pendingTitle}</Text>
              <Text style={[styles.pendingBody, { color: mutedColor }]}>{copy.pendingBody}</Text>
              <Pressable style={[styles.button, { backgroundColor: tint, shadowColor: tint }]} onPress={() => router.replace('/login')}>
                <Text style={styles.buttonText}>{copy.backToLogin}</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <View style={styles.roles}>
                {REGISTRATION_ROLES.map((option) => {
                  const active = option === role;
                  return (
                    <Pressable
                      key={option}
                      onPress={() => setRole(option)}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: active }}
                      style={[styles.role, { borderColor: active ? tint : borderColor, backgroundColor: active ? tintMuted : fieldColor }]}
                    >
                      <Ionicons name={ROLE_ICONS[option]} size={22} color={active ? tint : mutedColor} />
                      <Text style={[styles.roleText, { color: active ? tint : textColor }]}>{copy.roles[option]}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <Text style={[styles.hint, { color: mutedColor }]}>{copy.roleHints[role]}</Text>

              <Field icon="person" label={copy.fields.name} fieldColor={fieldColor} tint={tint} tintMuted={tintMuted}>
                <TextInput style={[styles.value, { color: textColor }]} value={name} onChangeText={setName} autoComplete="name" editable={!submitting} />
              </Field>
              <Field icon="mail" label={copy.fields.email} fieldColor={fieldColor} tint={tint} tintMuted={tintMuted}>
                <TextInput
                  style={[styles.value, { color: textColor }]}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  placeholder="you@example.com"
                  placeholderTextColor={mutedColor}
                  editable={!submitting}
                />
              </Field>
              <Field icon="call" label={copy.fields.phone} fieldColor={fieldColor} tint={tint} tintMuted={tintMuted}>
                <TextInput style={[styles.value, { color: textColor }]} value={phone} onChangeText={setPhone} keyboardType="phone-pad" editable={!submitting} />
              </Field>
              <Field
                icon="lock-closed"
                label={copy.fields.password}
                fieldColor={fieldColor}
                tint={tint}
                tintMuted={tintMuted}
                trailing={
                  <Pressable onPress={() => setShowPassword((prev) => !prev)} hitSlop={8}>
                    <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={18} color={mutedColor} />
                  </Pressable>
                }
              >
                <TextInput
                  style={[styles.value, { color: textColor }]}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  placeholder={copy.passwordHint(MIN_PASSWORD_LENGTH)}
                  placeholderTextColor={mutedColor}
                  editable={!submitting}
                />
              </Field>

              {role === 'student' ? (
                <View style={styles.group}>
                  <Text style={styles.groupLabel}>{copy.fields.subjects}</Text>
                  <View style={styles.chips}>
                    {(options?.subjects ?? []).map((entry) => {
                      const active = subjects.includes(entry.name);
                      return (
                        <Pressable key={entry.name} onPress={() => toggleSubject(entry.name)} style={chipStyle(active)} accessibilityState={{ selected: active }}>
                          <Text style={[styles.chipText, { color: active ? '#fff' : textColor }]}>{entry.name}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                  <Text style={[styles.hint, { color: mutedColor }]}>{optionsFailed ? copy.loadFailed : copy.subjectsHint}</Text>
                </View>
              ) : null}

              {role === 'parent' ? (
                <>
                  <Field icon="mail" label={copy.fields.childEmail} fieldColor={fieldColor} tint={tint} tintMuted={tintMuted}>
                    <TextInput
                      style={[styles.value, { color: textColor }]}
                      value={childEmail}
                      onChangeText={setChildEmail}
                      autoCapitalize="none"
                      autoCorrect={false}
                      keyboardType="email-address"
                      editable={!submitting}
                    />
                  </Field>
                  <Field icon="key" label={copy.fields.childPassword} fieldColor={fieldColor} tint={tint} tintMuted={tintMuted}>
                    <TextInput
                      style={[styles.value, { color: textColor }]}
                      value={childPassword}
                      onChangeText={setChildPassword}
                      secureTextEntry
                      autoCapitalize="none"
                      editable={!submitting}
                    />
                  </Field>
                  <Text style={[styles.hint, { color: mutedColor }]}>{copy.parentNote}</Text>
                </>
              ) : null}

              {role === 'teacher' ? (
                <View style={styles.group}>
                  <Text style={styles.groupLabel}>{copy.fields.subject}</Text>
                  <View style={styles.chips}>
                    {(options?.subjects ?? []).map((entry) => {
                      const active = subject === entry.name;
                      return (
                        <Pressable
                          key={entry.name}
                          disabled={entry.hasTeacher}
                          onPress={() => setSubject(entry.name)}
                          style={[chipStyle(active), entry.hasTeacher && styles.chipDisabled]}
                          accessibilityState={{ selected: active, disabled: entry.hasTeacher }}
                        >
                          <Text style={[styles.chipText, { color: active ? '#fff' : textColor }]}>
                            {entry.name}
                            {entry.hasTeacher ? ` · ${copy.subjectTaken}` : ''}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                  <Text style={[styles.hint, { color: mutedColor }]}>{optionsFailed ? copy.loadFailed : copy.teacherNote}</Text>
                </View>
              ) : null}

              {error ? (
                <View style={[styles.errorBanner, { backgroundColor: dangerMuted }]}>
                  <Ionicons name="warning" size={15} color={dangerColor} />
                  <Text style={[styles.errorText, { color: dangerColor }]}>{error}</Text>
                </View>
              ) : null}

              <Pressable
                style={({ pressed }) => [styles.button, { backgroundColor: tint, shadowColor: tint }, pressed && styles.buttonPressed, submitting && styles.buttonDisabled]}
                onPress={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Text style={styles.buttonText}>{copy.submit}</Text>
                    <Ionicons name="arrow-forward" size={16} color="#fff" />
                  </>
                )}
              </Pressable>

              <View style={styles.footerRow}>
                <Text style={{ color: mutedColor }}>{copy.haveAccount}</Text>
                <Pressable onPress={() => router.back()} hitSlop={8} accessibilityRole="link">
                  <Text style={[styles.footerLink, { color: tint }]}>{copy.signIn}</Text>
                </Pressable>
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/** Same labeled input row as the sign-in screen. */
function Field({
  icon,
  label,
  fieldColor,
  tint,
  tintMuted,
  trailing,
  children
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  fieldColor: string;
  tint: string;
  tintMuted: string;
  trailing?: ReactNode;
  children: React.ReactElement<TextInputProps>;
}) {
  return (
    <View style={[styles.field, { backgroundColor: fieldColor }]}>
      <View style={[styles.fieldIcon, { backgroundColor: tintMuted }]}>
        <Ionicons name={icon} size={16} color={tint} />
      </View>
      <View style={styles.fieldTextArea}>
        <Text style={styles.fieldLabel}>{label}</Text>
        {children}
      </View>
      {trailing}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40
  },
  heroClip: {
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    overflow: 'hidden'
  },
  hero: {
    alignItems: 'center',
    paddingTop: 64,
    paddingBottom: 44,
    paddingHorizontal: 24
  },
  back: {
    position: 'absolute',
    top: 56,
    left: 18,
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)'
  },
  title: {
    fontFamily: 'Baloo2_800ExtraBold',
    fontSize: 28,
    color: '#ffffff',
    textAlign: 'center'
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 4,
    color: 'rgba(255,255,255,0.85)'
  },
  sheet: {
    marginTop: -24,
    marginHorizontal: 18,
    borderRadius: 26,
    padding: 18,
    gap: 12,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 4
  },
  roles: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: 'transparent'
  },
  role: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1.5
  },
  roleText: {
    fontSize: 13,
    fontWeight: '800'
  },
  hint: {
    fontSize: 12,
    lineHeight: 17
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  fieldIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  fieldTextArea: {
    flex: 1,
    backgroundColor: 'transparent'
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    opacity: 0.55,
    marginBottom: 2
  },
  value: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    padding: 0
  },
  group: {
    gap: 8,
    backgroundColor: 'transparent'
  },
  groupLabel: {
    fontSize: 13,
    fontWeight: '700'
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    backgroundColor: 'transparent'
  },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7
  },
  chipDisabled: {
    opacity: 0.4
  },
  chipText: {
    fontSize: 13,
    fontWeight: '700'
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600'
  },
  button: {
    borderRadius: 30,
    paddingVertical: 16,
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    alignSelf: 'stretch',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4
  },
  buttonPressed: {
    opacity: 0.85
  },
  buttonDisabled: {
    opacity: 0.6
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'transparent'
  },
  footerLink: {
    fontWeight: '800'
  },
  pending: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    backgroundColor: 'transparent'
  },
  pendingTitle: {
    fontSize: 20,
    fontWeight: '800'
  },
  pendingBody: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 8
  }
});
