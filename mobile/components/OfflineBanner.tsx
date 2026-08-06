import { StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Text, View, useThemeColor } from './Themed';
import { useLanguage } from '@/lib/language-context';

/** Shown above cached data when the last refresh failed because the device is offline. */
export function OfflineBanner() {
  const { t } = useLanguage();
  const warningColor = useThemeColor({}, 'warning');
  const backgroundColor = useThemeColor({}, 'warningMuted');

  return (
    <View style={[styles.banner, { backgroundColor }]}>
      <Ionicons name="cloud-offline-outline" size={14} color={warningColor} />
      <Text style={[styles.text, { color: warningColor }]}>{t.common.offlineShowingSavedData}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 12
  },
  text: {
    fontSize: 13,
    fontWeight: '600',
    flexShrink: 1
  }
});
