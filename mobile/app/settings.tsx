import { useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, Image, Platform, Pressable, StyleSheet, Switch } from 'react-native';
import { SymbolView } from 'expo-symbols';
import * as ImagePicker from 'expo-image-picker';
import { languages } from '@shared/i18n-tables';

import { Card } from '@/components/Card';
import { Text, View, useThemeColor } from '@/components/Themed';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { useTheme } from '@/lib/theme-context';

export default function SettingsScreen() {
  const { session, signOut, updateAvatar } = useAuth();
  const { preference, setPreference } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const mutedColor = useThemeColor({}, 'muted');
  const tint = useThemeColor({}, 'tint');
  const dangerColor = useThemeColor({}, 'danger');
  const borderColor = useThemeColor({}, 'border');
  const cardColor = useThemeColor({}, 'card');

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
      quality: 0.5,
      base64: true
    });
    if (result.canceled || !result.assets[0]?.base64) return;

    setUploadingAvatar(true);
    // Stored as a data URI directly in Supabase auth's avatar_url metadata —
    // same approach the web app's profile editor uses (DashboardApp.tsx),
    // no separate storage bucket involved.
    const dataUri = `data:image/jpeg;base64,${result.assets[0].base64}`;
    const { error } = await updateAvatar(dataUri);
    setUploadingAvatar(false);
    if (error) setAvatarError(t.mobileForms.avatarUpdateFailed);
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
                <SymbolView name="pencil" size={11} tintColor="#fff" />
              )}
            </View>
          </Pressable>
          <View style={styles.accountInfo}>
            <Text style={styles.value}>{name}</Text>
            <Text style={[styles.role, { color: tint }]}>{session.role}</Text>
          </View>
        </Card>
      ) : null}

      {avatarError ? <Text style={[styles.avatarError, { color: dangerColor }]}>{avatarError}</Text> : null}

      <Text style={[styles.sectionTitle, { color: mutedColor }]}>{t.common.appearance}</Text>
      <Card style={[styles.toggleRow, { borderColor, backgroundColor: cardColor }]}>
        <View style={styles.toggleLabel}>
          <SymbolView name={isDark ? 'moon.fill' : 'sun.max.fill'} size={17} tintColor={mutedColor} />
          <Text style={styles.toggleText}>{isDark ? 'Dark' : 'Light'}</Text>
        </View>
        <Switch
          value={isDark}
          onValueChange={(value) => setPreference(value ? 'dark' : 'light')}
          trackColor={{ false: borderColor, true: tint }}
          thumbColor="#fff"
        />
      </Card>

      <Text style={[styles.sectionTitle, { color: mutedColor }]}>{t.common.language}</Text>
      <Card style={[styles.toggleRow, { borderColor, backgroundColor: cardColor }]}>
        <View style={styles.toggleLabel}>
          <SymbolView name="globe" size={17} tintColor={mutedColor} />
          <Text style={styles.toggleText}>{isSecondLanguage ? secondLanguage.name : firstLanguage.name}</Text>
        </View>
        <Switch
          value={isSecondLanguage}
          onValueChange={(value) => setLanguage(value ? secondLanguage.id : firstLanguage.id)}
          trackColor={{ false: borderColor, true: tint }}
          thumbColor="#fff"
        />
      </Card>

      <Pressable style={[styles.signOut, { borderColor: dangerColor, backgroundColor: dangerColor }]} onPress={() => signOut()}>
        <SymbolView name="rectangle.portrait.and.arrow.right" size={17} tintColor="#fff" />
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
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 22,
    marginBottom: 8
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 12,
    paddingHorizontal: 14
  },
  toggleLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'transparent'
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