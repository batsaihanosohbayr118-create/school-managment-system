import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { Text } from './Themed';

/** A circular progress ring with a centered label — e.g. a score out of 100. */
export function ProgressRing({
  percent,
  color,
  trackColor,
  size = 56,
  strokeWidth = 5,
  label
}: {
  percent: number;
  color: string;
  trackColor: string;
  size?: number;
  strokeWidth?: number;
  label: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, percent));
  const strokeDashoffset = circumference * (1 - clamped / 100);
  const center = size / 2;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle cx={center} cy={center} r={radius} stroke={trackColor} strokeWidth={strokeWidth} fill="none" />
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${center}, ${center}`}
        />
      </Svg>
      <View style={styles.labelWrap} pointerEvents="none">
        <Text style={[styles.label, { color }]} numberOfLines={1} adjustsFontSizeToFit>
          {label}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  labelWrap: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent'
  },
  label: {
    fontSize: 15,
    fontWeight: '800'
  }
});
