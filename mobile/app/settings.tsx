import { useState } from 'react';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, Image, Platform, Pressable, StyleSheet, Switch, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { languages, translateValue } from '@shared/i18n-tables';

import { Card } from '@/components/Card';
import { Text, View, useThemeColor } from '@/components/Themed';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { useTheme } from '@/lib/theme-context';

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
  const tintMuted = useThemeColor({}, 'tintMuted');
  const dangerColor = useThemeColor({}, 'danger');
  const dangerStrongColor = useThemeColor({}, 'dangerStrong');
  const borderColor = useThemeColor({}, 'border');
  const cardColor = useThemeColor({}, 'card');
  const textColor = useThemeColor({}, 'text');
  const inputBg = useThemeColor({}, 'card');

  const name = session?.name || session?.email || '';
  const initial = name.trim().charAt(0).toUpperCase() || '?';

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

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: t.nav.settings.label }} />
      <Text style={styles.title}>{t.common.account}</Text>

      {session ? (
        <Card style={styles.accountCard}>
          <Pressable onPress={handlePickAvatar} disabled={uploadingAvatar}>
            {session.avatarUrl ? (
              <Image source={{ uri: session.avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, { backgroundColor: tint }]}>
                <Text style={styles.avatarText}>{initial}</Text>
              </View>
            )}
            <View style={[styles.avatarEdit, { backgroundColor: tint, borderColor: cardColor }]}>
              {uploadingAvatar ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Ionicons name="pencil" size={11} color="#fff" />
              )}
            </View>
          </Pressable>
          <View style={styles.accountInfo}>
            <Text style={styles.value}>{name}</Text>
            <Text style={[styles.role, { color: tint }]}>{translateValue(session.role, language)}</Text>
          </View>
        </Card>
      ) : null}

      {avatarError ? <Text style={[styles.avatarError, { color: dangerColor }]}>{avatarError}</Text> : null}

      {session ? (
        <>
          <Text style={[styles.sectionTitle, { color: mutedColor }]}>
            {language === 'mn' ? 'Хувийн мэдээлэл' : 'Personal information'}
          </Text>
          <Card style={styles.groupCard}>
            <Pressable
              style={styles.toggleRow}
              onPress={() => setPersonalInfoOpen((open) => !open)}
              accessibilityRole="button"
              accessibilityState={{ expanded: personalInfoOpen }}
            >
              <View style={styles.toggleLabel}>
                <View style={[styles.iconBadge, { backgroundColor: tintMuted }]}>
                  <Ionicons name="person-outline" size={15} color={tint} />
                </View>
                <Text style={styles.toggleText}>{language === 'mn' ? 'Хувийн мэдээлэл' : 'Personal information'}</Text>
              </View>
              <Ionicons name={personalInfoOpen ? 'chevron-up' : 'chevron-down'} size={18} color={mutedColor} />
            </Pressable>

            {personalInfoOpen ? (
              <>
                <View style={[styles.divider, { backgroundColor: borderColor }]} />

                <View style={styles.toggleRow}>
                  <View style={styles.toggleLabel}>
                    <View style={[styles.iconBadge, { backgroundColor: tintMuted }]}>
                      <Ionicons name="person-circle-outline" size={15} color={tint} />
                    </View>
                    <Text style={styles.toggleText}>{t.columns.Name}</Text>
                  </View>
                  <Text style={[styles.infoValue, { color: mutedColor }]} numberOfLines={1}>{name}</Text>
                </View>

                <View style={[styles.divider, { backgroundColor: borderColor }]} />

                <View style={styles.toggleRow}>
                  <View style={styles.toggleLabel}>
                    <View style={[styles.iconBadge, { backgroundColor: tintMuted }]}>
                      <Ionicons name="mail-outline" size={15} color={tint} />
                    </View>
                    <Text style={styles.toggleText}>{t.columns.Email}</Text>
                  </View>
                  <Text style={[styles.infoValue, { color: mutedColor }]} numberOfLines={1}>{session.email || '—'}</Text>
                </View>

                <View style={[styles.divider, { backgroundColor: borderColor }]} />

                {phoneEditing ? (
                  <View style={styles.phoneEditRow}>
                    <View style={[styles.toggleLabel, { flex: 1 }]}>
                      <View style={[styles.iconBadge, { backgroundColor: tintMuted }]}>
                        <Ionicons name="call-outline" size={15} color={tint} />
                      </View>
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
                    </View>
                    <View style={styles.phoneEditActions}>
                      <Pressable onPress={() => setPhoneEditing(false)} disabled={phoneSaving} hitSlop={8}>
                        <Ionicons name="close" size={20} color={mutedColor} />
                      </Pressable>
                      <Pressable onPress={handleSavePhone} disabled={phoneSaving} hitSlop={8}>
                        {phoneSaving ? (
                          <ActivityIndicator color={tint} size="small" />
                        ) : (
                          <Ionicons name="checkmark" size={20} color={tint} />
                        )}
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <Pressable style={styles.toggleRow} onPress={openPhoneEditor}>
                    <View style={styles.toggleLabel}>
                      <View style={[styles.iconBadge, { backgroundColor: tintMuted }]}>
                        <Ionicons name="call-outline" size={15} color={tint} />
                      </View>
                      <Text style={styles.toggleText}>{t.columns.Phone}</Text>
                    </View>
                    <View style={styles.phoneValueRow}>
                      <Text style={[styles.infoValue, { color: mutedColor }]} numberOfLines={1}>
                        {session.phone || '—'}
                      </Text>
                      <Ionicons name="pencil" size={13} color={mutedColor} />
                    </View>
                  </Pressable>
                )}

                {phoneError ? <Text style={[styles.avatarError, { color: dangerColor }]}>{phoneError}</Text> : null}

                <View style={[styles.divider, { backgroundColor: borderColor }]} />

                <View style={styles.toggleRow}>
                  <View style={styles.toggleLabel}>
                    <View style={[styles.iconBadge, { backgroundColor: tintMuted }]}>
                      <Ionicons name="shield-checkmark-outline" size={15} color={tint} />
                    </View>
                    <Text style={styles.toggleText}>{language === 'mn' ? 'Эрх' : 'Role'}</Text>
                  </View>
                  <Text style={[styles.infoValue, { color: mutedColor }]} numberOfLines={1}>{translateValue(session.role, language)}</Text>
                </View>

                <View style={[styles.divider, { backgroundColor: borderColor }]} />

                <Pressable style={styles.toggleRow} onPress={() => router.push('/change-password')}>
                  <View style={styles.toggleLabel}>
                    <View style={[styles.iconBadge, { backgroundColor: tintMuted }]}>
                      <Ionicons name="key-outline" size={15} color={tint} />
                    </View>
                    <Text style={styles.toggleText}>{t.mobileForms.changePassword}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={17} color={mutedColor} />
                </Pressable>
              </>
            ) : null}
          </Card>
        </>
      ) : null}

      <Text style={[styles.sectionTitle, { color: mutedColor }]}>{t.common.general}</Text>
      <Card style={styles.groupCard}>
        <View style={styles.toggleRow}>
          <View style={styles.toggleLabel}>
            <View style={[styles.iconBadge, { backgroundColor: tintMuted }]}>
              <Ionicons name={isDark ? 'moon' : 'sunny'} size={15} color={tint} />
            </View>
            <Text style={styles.toggleText}>{t.common.appearance}</Text>
          </View>
          <Switch
            value={isDark}
            onValueChange={(value) => setPreference(value ? 'dark' : 'light')}
            trackColor={{ false: borderColor, true: tint }}
            thumbColor="#fff"
          />
        </View>

        <View style={[styles.divider, { backgroundColor: borderColor }]} />

        <View style={styles.toggleRow}>
          <View style={styles.toggleLabel}>
            <View style={[styles.iconBadge, { backgroundColor: tintMuted }]}>
              <Ionicons name="globe-outline" size={15} color={tint} />
            </View>
            <Text style={styles.toggleText}>{isSecondLanguage ? secondLanguage.name : firstLanguage.name}</Text>
          </View>
          <Switch
            value={isSecondLanguage}
            onValueChange={(value) => setLanguage(value ? secondLanguage.id : firstLanguage.id)}
            trackColor={{ false: borderColor, true: tint }}
            thumbColor="#fff"
          />
        </View>
      </Card>

      <Pressable style={[styles.signOut, { borderColor: dangerStrongColor, backgroundColor: dangerStrongColor }]} onPress={() => signOut()}>
        <Ionicons name="log-out-outline" size={17} color="#fff" />
        <Text style={[styles.signOutText, { color: '#fff' }]}>{t.common.logout}</Text>
      </Pressable>

      <StatusBar style={Platform.OS === 'ios' ? 'light' : 'auto'} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    gap: 6
  },
  title: {
    fontSize: 26,
    fontWeight: '800'
  },
  accountCard: {
    marginTop: 16,
    marginBottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800'
  },
  avatarEdit: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatarError: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4
  },
  accountInfo: {
    flex: 1,
    gap: 2,
    backgroundColor: 'transparent'
  },
  value: {
    fontSize: 17,
    fontWeight: '700'
  },
  role: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'capitalize'
  },
  infoValue: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
    marginLeft: 12
  },
  phoneValueRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
    backgroundColor: 'transparent'
  },
  phoneEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingVertical: 8,
    backgroundColor: 'transparent'
  },
  phoneInput: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 14
  },
  phoneEditActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: 'transparent'
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 22,
    marginBottom: 8
  },
  groupCard: {
    paddingVertical: 4,
    paddingHorizontal: 14
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
    backgroundColor: 'transparent'
  },
  divider: {
    height: StyleSheet.hairlineWidth
  },
  toggleLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexShrink: 0,
    backgroundColor: 'transparent'
  },
  iconBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center'
  },
  toggleText: {
    fontSize: 15,
    fontWeight: '600'
  },
  signOut: {
    marginTop: 32,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 10,
    borderWidth: 1.5
  },
  signOutText: {
    fontWeight: '700',
    fontSize: 16
  }
});