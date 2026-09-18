import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { useThemeColor } from './Themed';
import { useColorScheme } from './useColorScheme';

const SHIMMER_WIDTH = 70;

/** A frosted-glass, pill-shaped search field with a light sweep that glints
 * across it every few seconds, and a clear (×) button once there's text. */
export function SearchBar({
  value,
  onChangeText,
  placeholder
}: {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
}) {
  const colorScheme = useColorScheme();
  const mutedColor = useThemeColor({}, 'muted');
  const textColor = useThemeColor({}, 'text');
  const cardColor = useThemeColor({}, 'card');
  const tint = useThemeColor({}, 'tint');
  // A tint wash over the blur — the blur alone reads as barely-there on a
  // plain page background, this is what gives the "frosted glass" a visible
  // surface instead of just fuzzing whatever's behind it. A plain white wash
  // in dark mode read as flat gray, out of place against the app's navy
  // theme — the card color's own navy, not white, is what it should tint
  // toward there.
  const overlayColor = colorScheme === 'dark' ? `${cardColor}cc` : 'rgba(255,255,255,0.45)';
  const borderColor = colorScheme === 'dark' ? `${tint}40` : 'rgba(255,255,255,0.6)';

  const [barWidth, setBarWidth] = useState(280);
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(1400),
        Animated.timing(shimmer, { toValue: 1, duration: 1300, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 0, useNativeDriver: true })
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer]);

  const shimmerTranslate = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [-SHIMMER_WIDTH, barWidth + SHIMMER_WIDTH]
  });

  return (
    <BlurView
      intensity={40}
      tint={colorScheme === 'dark' ? 'dark' : 'light'}
      style={[styles.bar, { borderColor }]}
      onLayout={(event) => setBarWidth(event.nativeEvent.layout.width)}
    >
      {/* A plain (non-Themed) absolute-fill View — Themed's View paints an
          opaque page background, which would hide the blur underneath it. */}
      <View style={[styles.overlay, { backgroundColor: overlayColor }]} pointerEvents="none" />
      <Animated.View style={[styles.shimmer, { transform: [{ translateX: shimmerTranslate }, { rotate: '18deg' }] }]} pointerEvents="none">
        <LinearGradient
          colors={['transparent', 'rgba(255,255,255,0.35)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.shimmerGradient}
        />
      </Animated.View>
      <Ionicons name="search" size={17} color={mutedColor} style={styles.icon} />
      <TextInput
        style={[styles.input, { color: textColor }]}
        placeholder={placeholder}
        placeholderTextColor={mutedColor}
        value={value}
        onChangeText={onChangeText}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
      />
      {value ? (
        <Pressable onPress={() => onChangeText('')} hitSlop={8} style={styles.clearButton}>
          <Ionicons name="close-circle" size={17} color={mutedColor} />
        </Pressable>
      ) : null}
    </BlurView>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 2
  },
  overlay: {
    ...StyleSheet.absoluteFill
  },
  shimmer: {
    position: 'absolute',
    top: -20,
    bottom: -20,
    width: SHIMMER_WIDTH
  },
  shimmerGradient: {
    flex: 1
  },
  icon: {
    zIndex: 1
  },
  input: {
    flex: 1,
    fontSize: 15,
    padding: 0,
    zIndex: 1
  },
  clearButton: {
    zIndex: 1
  }
});
