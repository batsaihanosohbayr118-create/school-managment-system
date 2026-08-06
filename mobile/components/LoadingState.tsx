import { ActivityIndicator, StyleSheet } from 'react-native';

import { View, useThemeColor } from './Themed';

/** Full-screen centered spinner, used while a screen's first fetch is in flight. */
export function LoadingState() {
  const tint = useThemeColor({}, 'tint');

  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={tint} />
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20
  }
});
