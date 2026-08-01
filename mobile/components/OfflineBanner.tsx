import { StyleSheet } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { Text, View, useThemeColor } from './Themed';

/** Shown above cached data when the last refresh failed because the device is offline. */
export function OfflineBanner() {
  const mutedColor = useThemeColor({}, 'muted');
  const borderColor = useThemeColor({}, 'border');

  return (
    <View style={[styles.banner, { borderColor }]}>
      <SymbolView name="wifi.slash" size={14} tintColor={mutedColor} />
      <Text style={[styles.text, { color: mutedColor }]}>Offline — showing saved data</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth
  },
  text: {
    fontSize: 13,
    fontWeight: '600'
  }
});
