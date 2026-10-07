import { useEffect, useState } from 'react';
import { Animated, View as PlainView, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { Card } from '@/components/Card';
import { ProgressRing } from '@/components/ProgressRing';
import { Text, View, useThemeColor } from '@/components/Themed';
import { useLanguage } from '@/lib/language-context';
import type { PlacementResult } from '@shared/api-types';
import { CEFR_LEVELS, normalizeCefrLevel, type CefrLevel } from '@shared/placement';

/** One accent per CEFR level, warm (beginner) to green (advanced). */
const levelAccent: Record<CefrLevel, 'warning' | 'pink' | 'tint' | 'purple' | 'success'> = {
  A1: 'warning',
  A2: 'pink',
  B1: 'tint',
  B2: 'purple',
  C1: 'success'
};

/**
 * The hero card's gradient per level. Fixed rather than theme colors: the
 * card carries white text in both light and dark mode, so it needs the same
 * saturated colors in both.
 */
export const levelGradient: Record<CefrLevel, [string, string]> = {
  A1: ['#f59e0b', '#ea580c'],
  A2: ['#ec4899', '#be185d'],
  B1: ['#3b82f6', '#4338ca'],
  B2: ['#8b5cf6', '#6d28d9'],
  C1: ['#10b981', '#047857']
};

const levelIcon: Record<CefrLevel, keyof typeof Ionicons.glyphMap> = {
  A1: 'leaf',
  A2: 'flower',
  B1: 'rocket',
  B2: 'star',
  C1: 'trophy'
};

export function useLevelColors(level: string) {
  const accent = levelAccent[normalizeCefrLevel(level) ?? 'A1'];
  const color = useThemeColor({}, accent);
  const muted = useThemeColor({}, `${accent}Muted` as const);
  return { color, muted };
}

/** The small "B1" pill used in lists. */
export function LevelPill({ level }: { level: string }) {
  const { color, muted } = useLevelColors(level);

  return (
    <View style={[styles.pill, { backgroundColor: muted }]}>
      <Text style={[styles.pillText, { color }]}>{level}</Text>
    </View>
  );
}

/**
 * The full result: a gradient hero with the level, a staircase showing how
 * far up A1 → C1 the student is, and the score and date.
 */
export function LevelResultCard({ result, heading, footnote }: { result: PlacementResult; heading: string; footnote?: string }) {
  const { t } = useLanguage();
  const level = normalizeCefrLevel(result.level) ?? 'A1';
  const copy = t.placement.levels[level];
  const [from, to] = levelGradient[level];
  const mutedColor = useThemeColor({}, 'muted');
  const trackColor = useThemeColor({}, 'border');

  const [pop] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.spring(pop, { toValue: 1, friction: 5, tension: 70, useNativeDriver: true }).start();
  }, [pop]);

  const percent = result.correct !== null && result.total ? Math.round((result.correct / result.total) * 100) : 0;

  return (
    <PlainView>
      <PlainView style={[styles.heroShadow, { shadowColor: to }]}>
        <LinearGradient colors={[from, to]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          {/* Decorative bubbles, purely visual. */}
          <PlainView style={[styles.bubble, styles.bubbleLarge]} />
          <PlainView style={[styles.bubble, styles.bubbleSmall]} />

          <Text style={styles.heroHeading}>{heading}</Text>

          <Animated.View style={[styles.badgeOuter, { opacity: pop, transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }] }]}>
            <PlainView style={styles.badgeInner}>
              <Text style={[styles.badgeText, { color: to }]}>{level}</Text>
            </PlainView>
            <PlainView style={[styles.badgeIcon, { backgroundColor: from }]}>
              <Ionicons name={levelIcon[level]} size={16} color="#fff" />
            </PlainView>
          </Animated.View>

          <Text style={styles.heroName}>{copy.name}</Text>
          <Text style={styles.heroDescription}>{copy.description}</Text>
        </LinearGradient>
      </PlainView>

      <Card style={styles.pathCard}>
        <Text style={styles.cardTitle}>{t.placement.levelPath}</Text>
        <LevelStairs current={level} trackColor={trackColor} mutedColor={mutedColor} />
      </Card>

      <PlainView style={styles.statsRow}>
        <Card style={styles.statCard}>
          <ProgressRing percent={percent} color={to} trackColor={trackColor} size={60} strokeWidth={6} label={`${percent}%`} />
          <PlainView style={styles.statCopy}>
            <Text style={[styles.statLabel, { color: mutedColor }]}>{t.placement.score}</Text>
            <Text style={styles.statValue}>
              {result.correct ?? '—'} / {result.total ?? '—'}
            </Text>
          </PlainView>
        </Card>
        <Card style={styles.statCard}>
          <PlainView style={[styles.dateIcon, { backgroundColor: `${to}1f` }]}>
            <Ionicons name="calendar" size={20} color={to} />
          </PlainView>
          <PlainView style={styles.statCopy}>
            <Text style={[styles.statLabel, { color: mutedColor }]}>{t.placement.takenOn}</Text>
            {/* One line always: a narrow phone otherwise broke "2026-10-07" mid-number. */}
            <Text style={styles.statValueSmall} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
              {result.date}
            </Text>
          </PlainView>
        </Card>
      </PlainView>

      {footnote ? (
        <PlainView style={[styles.footnote, { backgroundColor: `${to}14` }]}>
          <PlainView style={[styles.footnoteAccent, { backgroundColor: to }]} />
          <LinearGradient colors={[from, to]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.footnoteIcon}>
            <Ionicons name="refresh" size={20} color="#fff" />
          </LinearGradient>
          <PlainView style={styles.footnoteCopy}>
            <Text style={[styles.footnoteTitle, { color: to }]}>{t.placement.retakeTitle}</Text>
            <Text style={[styles.footnoteText, { color: mutedColor }]}>{footnote}</Text>
          </PlainView>
        </PlainView>
      ) : null}
    </PlainView>
  );
}

/** Five rising steps; the reached ones are filled in their level's color. */
function LevelStairs({ current, trackColor, mutedColor }: { current: CefrLevel; trackColor: string; mutedColor: string }) {
  const { t } = useLanguage();
  const currentIndex = CEFR_LEVELS.indexOf(current);

  return (
    <PlainView style={styles.stairs}>
      {CEFR_LEVELS.map((step, index) => {
        const reached = index <= currentIndex;
        const isCurrent = index === currentIndex;
        const [from, to] = levelGradient[step];

        return (
          <PlainView key={step} style={styles.stairColumn}>
            {isCurrent ? (
              <PlainView style={[styles.herePin, { backgroundColor: to }]}>
                <Text style={styles.herePinText} numberOfLines={1}>
                  {t.placement.youAreHere}
                </Text>
              </PlainView>
            ) : null}
            {reached ? (
              <LinearGradient colors={[from, to]} style={[styles.step, { height: 22 + index * 14 }, isCurrent && styles.stepCurrent]} />
            ) : (
              <PlainView style={[styles.step, { height: 22 + index * 14, backgroundColor: trackColor }]} />
            )}
            <Text style={[styles.stepLabel, { color: reached ? to : mutedColor }, isCurrent && styles.stepLabelCurrent]}>{step}</Text>
          </PlainView>
        );
      })}
    </PlainView>
  );
}

const styles = StyleSheet.create({
  pill: {
    minWidth: 44,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    alignItems: 'center'
  },
  pillText: {
    fontSize: 14,
    fontWeight: '800'
  },
  heroShadow: {
    borderRadius: 24,
    marginBottom: 14,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 18,
    elevation: 8
  },
  hero: {
    borderRadius: 24,
    alignItems: 'center',
    paddingVertical: 26,
    paddingHorizontal: 20,
    overflow: 'hidden'
  },
  bubble: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)'
  },
  bubbleLarge: {
    width: 180,
    height: 180,
    top: -60,
    right: -50
  },
  bubbleSmall: {
    width: 110,
    height: 110,
    bottom: -40,
    left: -30
  },
  heroHeading: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 14,
    fontWeight: '600'
  },
  badgeOuter: {
    width: 124,
    height: 124,
    borderRadius: 62,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16
  },
  badgeInner: {
    width: 102,
    height: 102,
    borderRadius: 51,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center'
  },
  badgeText: {
    fontSize: 40,
    fontWeight: '900'
  },
  badgeIcon: {
    position: 'absolute',
    right: 4,
    bottom: 4,
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 3,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center'
  },
  heroName: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '900'
  },
  heroDescription: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 6
  },
  pathCard: {
    paddingTop: 16,
    paddingBottom: 14
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 10
  },
  stairs: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingTop: 30
  },
  stairColumn: {
    flex: 1,
    alignItems: 'center'
  },
  herePin: {
    position: 'absolute',
    top: -30,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    zIndex: 1
  },
  herePinText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800'
  },
  step: {
    width: '100%',
    borderRadius: 8
  },
  stepCurrent: {
    borderWidth: 2,
    borderColor: '#fff'
  },
  stepLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 6
  },
  stepLabelCurrent: {
    fontWeight: '900',
    fontSize: 14
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10
  },
  statCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12
  },
  statCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600'
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800'
  },
  statValueSmall: {
    fontSize: 15,
    fontWeight: '800'
  },
  dateIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  footnote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    paddingVertical: 14,
    paddingRight: 14,
    paddingLeft: 18,
    marginTop: 4,
    overflow: 'hidden'
  },
  footnoteAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 5
  },
  footnoteIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center'
  },
  footnoteCopy: {
    flex: 1,
    gap: 3
  },
  footnoteTitle: {
    fontSize: 15,
    fontWeight: '800'
  },
  footnoteText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19
  }
});
