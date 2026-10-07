import { useState } from 'react';
import { Animated, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

/** The placement screens' header color, shared by their buttons and logo. */
export const HEADER_GRADIENT: [string, string] = ['#3b82f6', '#7c3aed'];

/**
 * A round gradient header button that squeezes on touch with a light tap of
 * haptics. Pass it through `gradientHeaderItem` on iOS so the system's
 * liquid-glass capsule doesn't draw a white ring around it.
 */
export function GradientHeaderButton({
  icon,
  onPress,
  accessibilityLabel
}: {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  accessibilityLabel: string;
}) {
  const [scale] = useState(() => new Animated.Value(1));

  function animateTo(value: number) {
    Animated.spring(scale, { toValue: value, friction: 5, tension: 300, useNativeDriver: true }).start();
  }

  return (
    <Pressable
      onPressIn={() => {
        animateTo(0.86);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      }}
      onPressOut={() => animateTo(1)}
      onPress={onPress}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <Animated.View style={[styles.shadow, { transform: [{ scale }] }]}>
        <LinearGradient colors={HEADER_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.button}>
          <Ionicons
            name={icon}
            size={22}
            color="#fff"
            // A chevron glyph sits right of its box's center; nudge it back.
            style={icon === 'chevron-back' ? styles.chevronNudge : undefined}
          />
        </LinearGradient>
      </Animated.View>
    </Pressable>
  );
}

/**
 * iOS 26 wraps a plain headerLeft/headerRight in its own white "liquid glass"
 * capsule; as a custom item the element can opt out of that background.
 */
export function gradientHeaderItem(element: React.ReactElement) {
  return () => [{ type: 'custom' as const, element, hidesSharedBackground: true }];
}

const styles = StyleSheet.create({
  shadow: {
    borderRadius: 20,
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4
  },
  button: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center'
  },
  chevronNudge: {
    marginLeft: -2
  }
});
