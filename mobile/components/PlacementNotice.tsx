import { useEffect, useState } from 'react';
import { Animated, Easing, View as PlainView, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { HEADER_GRADIENT } from '@/components/GradientHeaderButton';
import { Text, useThemeColor } from '@/components/Themed';

/**
 * A full-screen notice for the placement screens — "teachers only",
 * "not taken yet" and the like. A gradient medallion with soft halo rings
 * that fades in and then floats gently.
 */
export function PlacementNotice({
  icon,
  title,
  body,
  colors = HEADER_GRADIENT
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  body: string;
  colors?: [string, string];
}) {
  const mutedColor = useThemeColor({}, 'muted');
  const [appear] = useState(() => new Animated.Value(0));
  const [float] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.timing(appear, { toValue: 1, duration: 450, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(float, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(float, { toValue: 0, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true })
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [appear, float]);

  const [from, to] = colors;

  return (
    <PlainView style={styles.center}>
      <Animated.View
        style={[
          styles.art,
          {
            opacity: appear,
            transform: [
              { translateY: float.interpolate({ inputRange: [0, 1], outputRange: [0, -8] }) },
              { scale: appear.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) }
            ]
          }
        ]}
      >
        <PlainView style={[styles.haloOuter, { backgroundColor: `${to}12` }]} />
        <PlainView style={[styles.haloInner, { backgroundColor: `${to}22` }]} />
        <PlainView style={[styles.medallionShadow, { shadowColor: to }]}>
          <LinearGradient colors={[from, to]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.medallion}>
            <Ionicons name={icon} size={46} color="#fff" />
          </LinearGradient>
        </PlainView>
        <PlainView style={[styles.sparkle, styles.sparkleOne, { backgroundColor: from }]} />
        <PlainView style={[styles.sparkle, styles.sparkleTwo, { backgroundColor: to }]} />
      </Animated.View>

      <Animated.View style={[styles.copy, { opacity: appear }]}>
        <Text style={styles.title}>{title}</Text>
        <Text style={[styles.body, { color: mutedColor }]}>{body}</Text>
      </Animated.View>
    </PlainView>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 60
  },
  art: {
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20
  },
  haloOuter: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100
  },
  haloInner: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75
  },
  medallionShadow: {
    borderRadius: 52,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10
  },
  medallion: {
    width: 104,
    height: 104,
    borderRadius: 52,
    alignItems: 'center',
    justifyContent: 'center'
  },
  sparkle: {
    position: 'absolute',
    borderRadius: 999
  },
  sparkleOne: {
    width: 14,
    height: 14,
    top: 24,
    right: 30,
    opacity: 0.8
  },
  sparkleTwo: {
    width: 9,
    height: 9,
    bottom: 34,
    left: 28,
    opacity: 0.6
  },
  copy: {
    alignItems: 'center',
    gap: 8
  },
  title: {
    fontSize: 21,
    fontWeight: '800',
    textAlign: 'center'
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center'
  }
});
