import { useState } from 'react';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, Image, Platform, Pressable, ScrollView, StyleSheet, Switch, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { languages } from '@shared/i18n-tables';
import { roleLabel } from '@shared/roles';

import { Card } from '@/components/Card';
import { Text, View, useThemeColor } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { useTheme } from '@/lib/theme-context';

type IconName = keyof typeof Ionicons.glyphMap;

// Each settings row gets its own iOS-style colored icon tile.
const ROW_COLORS = {
  personal: '#3b82f6',
  name: '#6366f1',
  email: '#8b5cf6',
  phone: '#22c55e',
  role: '#f59e0b',
  password: '#ec4899',
  appearance: '#0ea5e9',
  language: '#14b8a6'
} as const;

export default function SettingsScreen() {
  const router = useRouter();
  const { session, signOut, updateAvatar, updatePhone } = useAuth();
  const { preference, setPreference } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [personalInfoOpen, setPersonalInfoOpen] = useState(false);
  const [phoneEditing, setPhoneEditing] = useState(false);
  const [phoneDraft, setPhoneDraft] = useState('');
  const [phoneSaving, setPhoneSaving] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const mutedColor = useThemeColor({}, 'muted');
  const tint = useThemeColor({}, 'tint');
  const dangerColor = useThemeColor({}, 'danger');
  const dangerStrongColor = useThemeColor({}, 'dangerStrong');
  const borderColor = useThemeColor({}, 'border');
  const textColor = useThemeColor({}, 'text');
  const inputBg = useThemeColor({}, 'background');
  const isLight = useColorScheme() === 'light';
  // The theme's border color is near-white in light mode; an off switch needs a visible track.
  const switchOffColor = isLight ? '#cbd5e1' : 'rgba(255,255,255,0.22)';
  const mn = language === 'mn';

  const name = session?.name || session?.email || '';
  const initial = name.trim().charAt(0).toUpperCase() || '?';
  const appVersion = Constants.expoConfig?.version;

  const isDark = preference === 'dark';
  const secondLanguage = languages[1] ?? languages[0];
  const firstLanguage = languages[0];
  const isSecondLanguage = language === secondLanguage.id;

  async function handlePickAvatar() {
    setAvatarError(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setAvatarError(t.mobileForms.photoPermissionDenied);
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8
    });
    const asset = result.canceled ? null : result.assets[0];
    if (!asset?.uri) return;

    setUploadingAvatar(true);
    try {
      const compactImage = await ImageManipulator.manipulateAsync(
        asset.uri,
        [{ resize: { width: 48, height: 48 } }],
        { compress: 0.15, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );
      const dataUri = compactImage.base64 ? `data:image/jpeg;base64,${compactImage.base64}` : '';
      const { error } = dataUri ? await updateAvatar(dataUri) : { error: 'image-processing-failed' };
      if (error) setAvatarError(t.mobileForms.avatarUpdateFailed);
    } catch {
      setAvatarError(t.mobileForms.avatarUpdateFailed);
    } finally {
      setUploadingAvatar(false);
    }
  }

  function openPhoneEditor() {
    setPhoneError(null);
    setPhoneDraft(session?.phone ?? '');
    setPhoneEditing(true);
  }

  async function handleSavePhone() {
    setPhoneError(null);
    setPhoneSaving(true);
    try {
      const { error } = await updatePhone(phoneDraft.trim());
      if (error) {
        setPhoneError(t.mobileForms.phoneUpdateFailed);
      } else {
        setPhoneEditing(false);
      }
    } finally {
      setPhoneSaving(false);
    }
  }

  const divider = <View style={[styles.divider, { backgroundColor: borderColor }]} />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: t.nav.settings.label }} />

      {session ? (
        <View style={[styles.heroWrap, { shadowColor: isLight ? '#0e7490' : '#000' }]}>
          <View style={[styles.hero, { backgroundColor: isLight ? '#9fd8dc' : '#0b1a3f' }]}>
            {/* Same artwork as the Home profile card. Own padding-free layer so
                the require()d image sizes to the card, not its intrinsic pixels. */}
            <View style={[StyleSheet.absoluteFill, styles.transparent]} pointerEvents="none">
              <Image
                source={
                  isLight
                    ? require('@/assets/images/profile-card-bg.jpg')
                    : require('@/assets/images/profile-card-bg-dark.jpg')
                }
                style={styles.heroImage}
                resizeMode="cover"
              />
            </View>
            <LinearGradient
              colors={
                isLight
                  ? ['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.65)']
                  : ['rgba(5,10,30,0.25)', 'rgba(5,10,30,0.8)']
              }
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />

            <Pressable onPress={handlePickAvatar} disabled={uploadingAvatar} style={styles.avatarPress}>
              <LinearGradient
                colors={isLight ? ['#38bdf8', '#818cf8', '#f472b6'] : ['#60a5fa', '#a78bfa', '#f472b6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.avatarRing}
              >
                <View style={[styles.avatarGap, { backgroundColor: isLight ? '#e6f7f8' : '#0b1a3f' }]}>
                  {session.avatarUrl ? (
                    <Image source={{ uri: session.avatarUrl }} style={styles.avatar} />
                  ) : (
                    <LinearGradient colors={['#3b82f6', '#1d4ed8']} style={styles.avatar}>
                      <Text style={styles.avatarText}>{initial}</Text>
                    </LinearGradient>
                  )}
                </View>
              </LinearGradient>
              <View style={[styles.avatarEdit, { backgroundColor: tint, borderColor: isLight ? '#ffffff' : '#0b1a3f' }]}>
                {uploadingAvatar ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Ionicons name="camera" size={13} color="#fff" />
                )}
              </View>
            </Pressable>

            <Text style={[styles.heroName, { color: isLight ? '#0f172a' : '#ffffff' }]} numberOfLines={1}>
              {name}
            </Text>
            {session.email && session.email !== name ? (
              <Text
                style={[styles.heroEmail, { color: isLight ? '#334155' : 'rgba(255,255,255,0.75)' }]}
                numberOfLines={1}
              >
                {session.email}
              </Text>
            ) : null}
            <LinearGradient
              colors={['#3b82f6', '#6366f1']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.rolePill}
            >
              <Ionicons name="shield-checkmark" size={12} color="#fff" />
              <Text style={styles.rolePillText}>{roleLabel(session.role, language)}</Text>
            </LinearGradient>
          </View>
        </View>
      ) : null}

      {avatarError ? <Text style={[styles.errorText, { color: dangerColor }]}>{avatarError}</Text> : null}

      {session ? (
        <>
          <Text style={[styles.sectionTitle, { color: mutedColor }]}>{mn ? 'Бүртгэл' : 'Account'}</Text>
          <Card style={styles.groupCard}>
            <Pressable
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              onPress={() => setPersonalInfoOpen((open) => !open)}
              accessibilityRole="button"
              accessibilityState={{ expanded: personalInfoOpen }}
            >
              <RowLabel icon="person" color={ROW_COLORS.personal} label={mn ? 'Хувийн мэдээлэл' : 'Personal information'} />
              <Ionicons name={personalInfoOpen ? 'chevron-up' : 'chevron-down'} size={18} color={mutedColor} />
            </Pressable>

            {personalInfoOpen ? (
              <>
                {divider}
                <View style={styles.row}>
                  <RowLabel icon="id-card" color={ROW_COLORS.name} label={t.columns.Name} />
                  <Text style={[styles.rowValue, { color: mutedColor }]} numberOfLines={1}>{name}</Text>
                </View>

                {divider}
                <View style={styles.row}>
                  <RowLabel icon="mail" color={ROW_COLORS.email} label={t.columns.Email} />
                  <Text style={[styles.rowValue, { color: mutedColor }]} numberOfLines={1}>{session.email || '—'}</Text>
                </View>

                {divider}
                {phoneEditing ? (
                  <View style={styles.phoneEditRow}>
                    <IconTile icon="call" color={ROW_COLORS.phone} />
                    <TextInput
                      style={[styles.phoneInput, { color: textColor, backgroundColor: inputBg, borderColor }]}
                      placeholder={t.mobileForms.phonePlaceholder}
                      placeholderTextColor={mutedColor}
                      value={phoneDraft}
                      onChangeText={setPhoneDraft}
                      editable={!phoneSaving}
                      keyboardType="phone-pad"
                      autoFocus
                    />
                    <Pressable
                      onPress={() => setPhoneEditing(false)}
                      disabled={phoneSaving}
                      hitSlop={8}
                      style={[styles.phoneAction, { backgroundColor: `${mutedColor}22` }]}
                    >
                      <Ionicons name="close" size={17} color={mutedColor} />
                    </Pressable>
                    <Pressable
                      onPress={handleSavePhone}
                      disabled={phoneSaving}
                      hitSlop={8}
                      style={[styles.phoneAction, { backgroundColor: tint }]}
                    >
                      {phoneSaving ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <Ionicons name="checkmark" size={17} color="#fff" />
                      )}
                    </Pressable>
                  </View>
                ) : (
                  <Pressable style={({ pressed }) => [styles.row, pressed && styles.rowPressed]} onPress={openPhoneEditor}>
                    <RowLabel icon="call" color={ROW_COLORS.phone} label={t.columns.Phone} />
                    <View style={styles.rowValueGroup}>
                      <Text style={[styles.rowValue, { color: mutedColor }]} numberOfLines={1}>
                        {session.phone || '—'}
                      </Text>
                      <Ionicons name="pencil" size={13} color={tint} />
                    </View>
                  </Pressable>
                )}
                {phoneError ? <Text style={[styles.errorText, { color: dangerColor }]}>{phoneError}</Text> : null}

                {divider}
                <View style={styles.row}>
                  <RowLabel icon="shield-checkmark" color={ROW_COLORS.role} label={mn ? 'Эрх' : 'Role'} />
                  <Text style={[styles.rowValue, { color: mutedColor }]} numberOfLines={1}>
                    {roleLabel(session.role, language)}
                  </Text>
                </View>
              </>
            ) : null}

            {divider}
            <Pressable
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              onPress={() => router.push('/change-password')}
            >
              <RowLabel icon="key" color={ROW_COLORS.password} label={t.mobileForms.changePassword} />
              <Ionicons name="chevron-forward" size={18} color={mutedColor} />
            </Pressable>
          </Card>
        </>
      ) : null}

      <Text style={[styles.sectionTitle, { color: mutedColor }]}>{t.common.general}</Text>
      <Card style={styles.groupCard}>
        <View style={styles.row}>
          <RowLabel icon={isDark ? 'moon' : 'sunny'} color={ROW_COLORS.appearance} label={t.common.appearance} />
          <Switch
            value={isDark}
            onValueChange={(value) => setPreference(value ? 'dark' : 'light')}
            trackColor={{ false: switchOffColor, true: tint }}
            ios_backgroundColor={switchOffColor}
            thumbColor="#fff"
          />
        </View>

        {divider}
        <View style={styles.row}>
          <RowLabel
            icon="globe"
            color={ROW_COLORS.language}
            label={isSecondLanguage ? secondLanguage.name : firstLanguage.name}
          />
          <Switch
            value={isSecondLanguage}
            onValueChange={(value) => setLanguage(value ? secondLanguage.id : firstLanguage.id)}
            trackColor={{ false: switchOffColor, true: tint }}
            ios_backgroundColor={switchOffColor}
            thumbColor="#fff"
          />
        </View>
      </Card>

      <Pressable
        style={({ pressed }) => [
          styles.signOut,
          { backgroundColor: `${dangerStrongColor}14`, borderColor: `${dangerStrongColor}40` },
          pressed && styles.rowPressed
        ]}
        onPress={() => signOut()}
      >
        <View style={[styles.signOutIcon, { backgroundColor: dangerStrongColor }]}>
          <Ionicons name="log-out-outline" size={16} color="#fff" />
        </View>
        <Text style={[styles.signOutText, { color: dangerStrongColor }]}>{t.common.logout}</Text>
      </Pressable>

      {appVersion ? (
        <Text style={[styles.version, { color: mutedColor }]}>Nova Mind Academy · v{appVersion}</Text>
      ) : null}

      <StatusBar style={Platform.OS === 'ios' ? 'light' : 'auto'} />
    </ScrollView>
  );
}

function IconTile({ icon, color }: { icon: IconName; color: string }) {
  return (
    <View style={[styles.iconTile, { backgroundColor: color }]}>
      <Ionicons name={icon} size={15} color="#fff" />
    </View>
  );
}

function RowLabel({ icon, color, label }: { icon: IconName; color: string; label: string }) {
  return (
    <View style={styles.rowLabel}>
      <IconTile icon={icon} color={color} />
      <Text style={styles.rowText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  content: {
    padding: 16,
    paddingBottom: 40
  },
  transparent: {
    backgroundColor: 'transparent'
  },
  heroWrap: {
    borderRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 4
  },
  hero: {
    alignItems: 'center',
    borderRadius: 24,
    paddingTop: 22,
    paddingBottom: 18,
    paddingHorizontal: 20,
    overflow: 'hidden'
  },
  heroImage: {
    width: '100%',
    height: '100%'
  },
  avatarPress: {
    width: 92,
    height: 92,
    marginBottom: 10
  },
  avatarRing: {
    width: 92,
    height: 92,
    borderRadius: 46,
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatarGap: {
    width: 85,
    height: 85,
    borderRadius: 42.5,
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatar: {
    width: 79,
    height: 79,
    borderRadius: 39.5,
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatarText: {
    color: '#fff',
    fontSize: 30,
    fontWeight: '800'
  },
  avatarEdit: {
    position: 'absolute',
    right: 0,
    bottom: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center'
  },
  heroName: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4
  },
  heroEmail: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2
  },
  rolePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginTop: 10
  },
  rolePillText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800'
  },
  errorText: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 8
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 24,
    marginBottom: 8,
    marginLeft: 4
  },
  groupCard: {
    paddingVertical: 2,
    paddingHorizontal: 14,
    borderRadius: 18
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    backgroundColor: 'transparent'
  },
  rowPressed: {
    opacity: 0.6
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 44
  },
  rowLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexShrink: 0,
    backgroundColor: 'transparent'
  },
  iconTile: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center'
  },
  rowText: {
    fontSize: 15,
    fontWeight: '600'
  },
  rowValue: {
    flexShrink: 1,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
    marginLeft: 12
  },
  rowValueGroup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    backgroundColor: 'transparent'
  },
  phoneEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    backgroundColor: 'transparent'
  },
  phoneInput: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14
  },
  phoneAction: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center'
  },
  signOut: {
    marginTop: 28,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth
  },
  signOutIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center'
  },
  signOutText: {
    fontWeight: '800',
    fontSize: 16
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 16
  }
});
