import { StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Text, View, useThemeColor } from './Themed';

/** Centered icon + message shown in place of an empty list. */
export function EmptyState({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  const mutedColor = useThemeColor({}, 'muted');

  return (
    <View style={styles.center}>
      <Ionicons name={icon} size={38} color={mutedColor} style={styles.icon} />
      <Text style={[styles.label, { color: mutedColor }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12
  },
  icon: {
    opacity: 0.5
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center'
  }
});
