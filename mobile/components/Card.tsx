import { View as DefaultView, StyleSheet } from 'react-native';

import { useThemeColor } from './Themed';
import type { ViewProps } from './Themed';

/** A themed card surface — rounded, bordered, distinct from the page background. */
export function Card(props: ViewProps) {
  const { style, lightColor, darkColor, ...otherProps } = props;
  const backgroundColor = useThemeColor({ light: lightColor, dark: darkColor }, 'card');
  const borderColor = useThemeColor({}, 'border');

  return <DefaultView style={[styles.card, { backgroundColor, borderColor }, style]} {...otherProps} />;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    marginBottom: 10,
  },
});
