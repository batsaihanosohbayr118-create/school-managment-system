import { StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Card } from '@/components/Card';
import { Text, View, useThemeColor } from '@/components/Themed';
import { useLanguage } from '@/lib/language-context';
import type { PlacementResult } from '@shared/api-types';
import { normalizeCefrLevel, type CefrLevel } from '@shared/placement';

/** One accent per CEFR level, warm (beginner) to green (advanced). */
const levelAccent: Record<CefrLevel, 'warning' | 'pink' | 'tint' | 'purple' | 'success'> = {
  A1: 'warning',
  A2: 'pink',
  B1: 'tint',
  B2: 'purple',
  C1: 'success'
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

/** The full result: level badge, its name and meaning, score and date. */
export function LevelResultCard({ result, heading, footnote }: { result: PlacementResult; heading: string; footnote?: string }) {
  const { t } = useLanguage();
  const { color, muted } = useLevelColors(result.level);
  const mutedColor = useThemeColor({}, 'muted');
  const level = normalizeCefrLevel(result.level);
  const copy = level ? t.placement.levels[level] : null;

  return (
    <Card style={styles.card}>
      <Text style={[styles.heading, { color: mutedColor }]}>{heading}</Text>
      <View style={[styles.badge, { backgroundColor: muted, borderColor: color }]}>
        <Text style={[styles.badgeText, { color }]}>{result.level}</Text>
      </View>
      {copy ? (
        <>
          <Text style={styles.levelName}>{copy.name}</Text>
          <Text style={[styles.description, { color: mutedColor }]}>{copy.description}</Text>
        </>
      ) : null}

      <View style={styles.stats}>
        <View style={styles.stat}>
          <Ionicons name="checkmark-done-outline" size={16} color={mutedColor} />
          <Text style={[styles.statLabel, { color: mutedColor }]}>{t.placement.score}</Text>
          <Text style={styles.statValue}>
            {result.correct ?? '—'} / {result.total ?? '—'}
          </Text>
        </View>
        <View style={styles.stat}>
          <Ionicons name="calendar-outline" size={16} color={mutedColor} />
          <Text style={[styles.statLabel, { color: mutedColor }]}>{t.placement.takenOn}</Text>
          <Text style={styles.statValue}>{result.date}</Text>
        </View>
      </View>

      {footnote ? <Text style={[styles.footnote, { color: mutedColor }]}>{footnote}</Text> : null}
    </Card>
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
  card: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8
  },
  heading: {
    fontSize: 14,
    fontWeight: '600'
  },
  badge: {
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 6
  },
  badgeText: {
    fontSize: 38,
    fontWeight: '800'
  },
  levelName: {
    fontSize: 20,
    fontWeight: '800'
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    paddingHorizontal: 8
  },
  stats: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
    backgroundColor: 'transparent'
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'transparent'
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500'
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700'
  },
  footnote: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 10
  }
});
