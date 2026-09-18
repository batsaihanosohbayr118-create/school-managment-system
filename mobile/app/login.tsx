import { useState, type ReactElement, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  type TextInputProps
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

import { Text, View, useThemeColor } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const { t } = useLanguage();
  const isDark = useColorScheme() === 'dark';
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
  const fieldColor = useThemeColor({}, 'background');
  const tint = useThemeColor({}, 'tint');
  const purple = useThemeColor({}, 'purple');
  const tintMuted = useThemeColor({}, 'tintMuted');
  const dangerColor = useThemeColor({}, 'danger');
  const dangerMuted = useThemeColor({}, 'dangerMuted');
  const shadowColor = useThemeColor({}, 'shadow');

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
      {/* The hero uses a fixed brand gradient rather than the dynamic theme
          tint — a consistent first-impression identity regardless of the
          device's light/dark setting, same reasoning apps like this usually
          apply to their sign-in screen specifically. */}
      <StatusBar style="light" />
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        bounces={false}
      >
        {/* expo-linear-gradient's native view doesn't reliably clip to its own
            asymmetric (bottom-only) borderRadius on its own — wrapping it in
            a plain View that owns the radius + overflow:hidden clips it
            properly across platforms. */}
        <View style={styles.heroClip}>
          <LinearGradient
            colors={isDark ? ['#1c3f92', '#4b248e'] : [tint, purple]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            <View style={[styles.heroBlobLarge, { backgroundColor: '#ffffff' }]} />
            <View style={[styles.heroBlobSmall, { backgroundColor: '#ffffff' }]} />

            <Image source={require('@/assets/images/logo.png')} style={styles.crest} resizeMode="contain" />
            <Text style={styles.title}>
              Nova <Text style={styles.titleAccent}>Mind</Text> Academy
            </Text>
            <Text style={styles.subtitle}>Welcome back — sign in to continue</Text>
          </LinearGradient>
        </View>

        <View style={[styles.sheet, { backgroundColor: cardColor, shadowColor }]}>
          <FieldBox
            icon="mail"
            label="Email address"
            fieldColor={fieldColor}
            iconTint={tint}
            iconMuted={tintMuted}
          >
            <TextInput
              style={[styles.value, { color: textColor }]}
              placeholder="you@example.com"
              placeholderTextColor={placeholderColor}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              editable={!submitting}
            />
          </FieldBox>

          <FieldBox
            icon="lock-closed"
            label="Password"
            fieldColor={fieldColor}
            iconTint={tint}
            iconMuted={tintMuted}
            trailing={
              <Pressable onPress={() => setShowPassword((prev) => !prev)} hitSlop={8}>
                <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={18} color={placeholderColor} />
              </Pressable>
            }
          >
            <TextInput
              style={[styles.value, { color: textColor }]}
              placeholder="••••••••"
              placeholderTextColor={placeholderColor}
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
              editable={!submitting}
            />
          </FieldBox>

          {error ? (
            <View style={[styles.errorBanner, { backgroundColor: dangerMuted }]}>
              <Ionicons name="warning" size={15} color={dangerColor} />
              <Text style={[styles.errorText, { color: dangerColor }]}>{error}</Text>
            </View>
          ) : null}

          <Pressable
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: tint, shadowColor: tint },
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
                <Ionicons name="arrow-forward" size={16} color="#fff" />
              </>
            )}
          </Pressable>
        </View>

        <View style={styles.footerImageWrap} pointerEvents="none">
          <Text style={[styles.footerMessage, { color: isDark ? '#8db7ff' : '#3975ed' }]}>Better{`\n`}Students{`\n`}Brighter{`\n`}Future</Text>
          <View style={[styles.footerUnderline, { backgroundColor: isDark ? '#8db7ff' : '#3975ed' }]} />
          <Image source={require('@/assets/images/login.png')} style={styles.footerImage} resizeMode="contain" />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/** A labeled input row: icon badge, small muted label, bold value below — the
 * "floating label already floated" look, on its own tinted pill background. */
function FieldBox({
  icon,
  label,
  fieldColor,
  iconTint,
  iconMuted,
  trailing,
  children
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  fieldColor: string;
  iconTint: string;
  iconMuted: string;
  trailing?: ReactNode;
  children: ReactElement<TextInputProps>;
}) {
  return (
    <View style={[styles.field, { backgroundColor: fieldColor }]}>
      <View style={[styles.fieldIcon, { backgroundColor: iconMuted }]}>
        <Ionicons name={icon} size={16} color={iconTint} />
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
    flexGrow: 1
  },
  heroClip: {
    borderBottomLeftRadius: 48,
    borderBottomRightRadius: 48,
    overflow: 'hidden'
  },
  hero: {
    alignItems: 'center',
    paddingTop: 80,
    paddingBottom: 64,
    paddingHorizontal: 24
  },
  heroBlobLarge: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    opacity: 0.12,
    top: -90,
    right: -60
  },
  heroBlobSmall: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    opacity: 0.1,
    bottom: -50,
    left: -40
  },
  crest: {
    width: 96,
    height: 96 / (503 / 387),
    marginBottom: 6
  },
  title: {
    fontFamily: 'Baloo2_800ExtraBold',
    fontSize: 28,
    textAlign: 'center',
    letterSpacing: 0.2,
    color: '#ffffff'
  },
  titleAccent: {
    color: '#a9d6ff'
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 6,
    color: 'rgba(255,255,255,0.85)'
  },
  sheet: {
    marginTop: 24,
    marginHorizontal: 20,
    borderRadius: 26,
    padding: 20,
    gap: 12,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 4
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
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4
  },
  buttonPressed: {
    opacity: 0.85
  },
  buttonDisabled: {
    opacity: 0.5,
    shadowOpacity: 0
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16
  },
  footerImageWrap: {
    width: '100%',
    height: 280,
    position: 'relative',
    marginTop: 18,
    marginBottom: 0
  },
  footerMessage: {
    position: 'absolute',
    left: 24,
    bottom: 68,
    width: 145,
    fontFamily: 'Caveat_700Bold',
    fontSize: 28,
    lineHeight: 34,
    color: '#3975ed',
    transform: [{ rotate: '-7deg' }]
  },
  footerUnderline: {
    position: 'absolute',
    left: 38,
    bottom: 62,
    width: 92,
    height: 2,
    borderRadius: 2,
    transform: [{ rotate: '-7deg' }]
  },
  footerImage: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: '54%',
    height: 240
  }
});
