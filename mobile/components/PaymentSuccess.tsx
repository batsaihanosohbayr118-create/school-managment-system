import { useEffect, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import { paymentPalettes } from '@/components/payment-palette';
import { useLanguage } from '@/lib/language-context';

const SUCCESS_GRADIENT = ['#34d399', '#059669'] as const;
const SUCCESS_GLOW = '#10b981';

/** Sparkles scattered around the badge: [left, top, size, delay] relative to the 200×200 stage. */
const SPARKLES: [number, number, number, number][] = [
  [18, 30, 18, 120],
  [160, 14, 14, 220],
  [176, 128, 20, 320],
  [6, 140, 12, 420],
  [96, -6, 10, 520]
];

function pad(value: number) {
  return String(value).padStart(2, '0');
}

/** "2026-10-19 18:31" — built by hand so it doesn't depend on Hermes' Intl support. */
function formatNow() {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

export function PaymentSuccess({ amountLabel, onDone }: { amountLabel: string; onDone: () => void }) {
  const { t } = useLanguage();
  const isDark = useColorScheme() === 'dark';
  const palette = isDark ? paymentPalettes.dark : paymentPalettes.light;
  const insets = useSafeAreaInsets();

  const [paidAt] = useState(formatNow);
  const [pop] = useState(() => new Animated.Value(0));
  const [pulse] = useState(() => new Animated.Value(0));
  const [rise] = useState(() => new Animated.Value(0));
  const [sparkles] = useState(() => SPARKLES.map(() => new Animated.Value(0)));

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

    Animated.spring(pop, { toValue: 1, friction: 5, tension: 120, useNativeDriver: true }).start();
    Animated.timing(rise, { toValue: 1, duration: 520, delay: 180, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    Animated.stagger(
      90,
      sparkles.map((value, index) =>
        Animated.timing(value, { toValue: 1, duration: 420, delay: SPARKLES[index][3], useNativeDriver: true })
      )
    ).start();

    const loop = Animated.loop(
      Animated.timing(pulse, { toValue: 1, duration: 1800, easing: Easing.out(Easing.quad), useNativeDriver: true })
    );
    loop.start();
    return () => loop.stop();
  }, [pop, pulse, rise, sparkles]);

  const riseStyle = {
    opacity: rise,
    transform: [{ translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }]
  };

  return (
    <View style={styles.screen}>
      <LinearGradient colors={palette.background} start={{ x: 0, y: 0 }} end={{ x: 0.6, y: 1 }} style={StyleSheet.absoluteFill} />
      <View pointerEvents="none" style={[styles.orb, styles.orbTop, { backgroundColor: 'rgba(16,185,129,0.16)' }]} />
      <View pointerEvents="none" style={[styles.orb, styles.orbBottom, { backgroundColor: palette.orbB }]} />

      <View style={[styles.body, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.stage}>
          {/* An expanding, fading ring behind the badge. */}
          <Animated.View
            style={[
              styles.ring,
              {
                borderColor: SUCCESS_GLOW,
                opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0] }),
                transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.5] }) }]
              }
            ]}
          />
          <Animated.View style={[styles.badgeShadow, { transform: [{ scale: pop }] }]}>
            <LinearGradient colors={SUCCESS_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.badge}>
              <Ionicons name="checkmark" size={64} color="#fff" />
            </LinearGradient>
          </Animated.View>
          {SPARKLES.map(([left, top, size], index) => (
            <Animated.View
              key={index}
              pointerEvents="none"
              style={[
                styles.sparkle,
                {
                  left,
                  top,
                  opacity: sparkles[index],
                  transform: [{ scale: sparkles[index].interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] }) }]
                }
              ]}
            >
              <Ionicons name="sparkles" size={size} color={index % 2 ? '#fbbf24' : '#6ee7b7'} />
            </Animated.View>
          ))}
        </View>

        <Animated.View style={[styles.copy, riseStyle]}>
          <Text style={[styles.title, { color: palette.text }]}>{t.qpay.paidTitle}</Text>
          <Text style={[styles.subtitle, { color: palette.meta }]}>{t.qpay.paidSubtitle}</Text>
        </Animated.View>

        <Animated.View style={[styles.cardShadow, { shadowColor: palette.glow }, riseStyle]}>
          <LinearGradient colors={palette.card} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.card, { borderColor: palette.cardBorder }]}>
            <Text style={[styles.amountLabel, { color: palette.meta }]}>{t.qpay.amountPaid}</Text>
            <Text style={[styles.amount, { color: palette.text }]} numberOfLines={1} adjustsFontSizeToFit>
              {amountLabel}
            </Text>
            <View style={[styles.divider, { backgroundColor: palette.divider }]} />
            <ReceiptRow icon="qr-code-outline" label={t.qpay.method} value="QPay" color={palette.meta} valueColor={palette.text} />
            <ReceiptRow icon="time-outline" label={t.qpay.paidAt} value={paidAt} color={palette.meta} valueColor={palette.text} />
          </LinearGradient>
        </Animated.View>

        <View style={styles.spacer} />

        <Animated.View style={[styles.fullWidth, riseStyle]}>
          <Pressable
            onPress={onDone}
            style={({ pressed }) => [styles.buttonShadow, { shadowColor: palette.glow }, pressed && styles.pressed]}
            accessibilityRole="button"
          >
            <LinearGradient colors={palette.button} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.button}>
              <Text style={styles.buttonText}>{t.qpay.done}</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </LinearGradient>
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

function ReceiptRow({
  icon,
  label,
  value,
  color,
  valueColor
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  color: string;
  valueColor: string;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowLabel}>
        <Ionicons name={icon} size={16} color={color} />
        <Text style={[styles.rowLabelText, { color }]}>{label}</Text>
      </View>
      <Text style={[styles.rowValue, { color: valueColor }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1
  },
  orb: {
    position: 'absolute',
    borderRadius: 999
  },
  orbTop: {
    width: 380,
    height: 380,
    top: -140,
    left: -120
  },
  orbBottom: {
    width: 420,
    height: 420,
    bottom: -220,
    right: -160
  },
  body: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 22
  },
  stage: {
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24
  },
  ring: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 3
  },
  badgeShadow: {
    borderRadius: 60,
    shadowColor: SUCCESS_GLOW,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.55,
    shadowRadius: 22,
    elevation: 10
  },
  badge: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.35)'
  },
  sparkle: {
    position: 'absolute'
  },
  copy: {
    alignItems: 'center',
    marginTop: 8,
    gap: 8
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.4
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 21,
    paddingHorizontal: 12
  },
  cardShadow: {
    alignSelf: 'stretch',
    marginTop: 28,
    borderRadius: 24,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 18,
    elevation: 6
  },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    alignItems: 'center',
    overflow: 'hidden'
  },
  amountLabel: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8
  },
  amount: {
    fontSize: 38,
    fontWeight: '800',
    letterSpacing: -0.6,
    marginTop: 4
  },
  divider: {
    alignSelf: 'stretch',
    height: StyleSheet.hairlineWidth,
    marginVertical: 16
  },
  row: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 5
  },
  rowLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  rowLabelText: {
    fontSize: 14,
    fontWeight: '500'
  },
  rowValue: {
    fontSize: 15,
    fontWeight: '700'
  },
  spacer: {
    flex: 1,
    minHeight: 24
  },
  fullWidth: {
    alignSelf: 'stretch'
  },
  buttonShadow: {
    borderRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
    elevation: 6
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }]
  },
  button: {
    height: 56,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)'
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700'
  }
});
