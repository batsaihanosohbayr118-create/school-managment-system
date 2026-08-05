import { View as DefaultView, StyleSheet } from 'react-native';

import { useThemeColor } from './Themed';
import type { ViewProps } from './Themed';

/** A themed card surface — rounded, softly elevated, distinct from the page background. */
export function Card(props: ViewProps) {
  const { style, lightColor, darkColor, ...otherProps } = props;
  const backgroundColor = useThemeColor({ light: lightColor, dark: darkColor }, 'card');
  const borderColor = useThemeColor({}, 'border');
  const shadowColor = useThemeColor({}, 'shadow');

  return (
    <DefaultView
      style={[styles.card, { backgroundColor, borderColor, shadowColor }, style]}
      {...otherProps}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 15,
    marginBottom: 10,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
});
