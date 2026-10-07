import { Link } from 'expo-router';
import { Alert, FlatList, Pressable, RefreshControl, View as PlainView, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { OfflineBanner } from '@/components/OfflineBanner';
import { PlacementNotice } from '@/components/PlacementNotice';
import { levelGradient } from '@/components/PlacementLevel';
import { Text, useThemeColor } from '@/components/Themed';
import { api } from '@/lib/api';
import { useLanguage } from '@/lib/language-context';
import type { PlacementResponse, PlacementResult } from '@shared/api-types';
import { CEFR_LEVELS, normalizeCefrLevel } from '@shared/placement';

const OVERVIEW_GRADIENT: [string, string] = ['#3b82f6', '#7c3aed'];

function percentOf(result: PlacementResult) {
  return result.correct !== null && result.total ? Math.round((result.correct / result.total) * 100) : 0;
}

/**
 * The English teacher's view: a summary of the class, how the students
 * spread across the levels, and every result with a reset button.
 */
export function PlacementTeacherView({
  data,
  refetch,
  loading,
  isOffline
}: {
  data: PlacementResponse;
  refetch: () => void;
  loading: boolean;
  isOffline: boolean;
}) {
  const { t } = useLanguage();
  const tint = useThemeColor({}, 'tint');

  if (!data.enrolled) {
    return <PlacementNotice icon="lock-closed" title={t.placement.lockedTitle} body={t.placement.notEnglishTeacher} />;
  }

  function confirmReset(result: PlacementResult) {
    Alert.alert(t.placement.resetTitle, `${result.student} — ${t.placement.resetBody}`, [
      { text: t.placement.cancel, style: 'cancel' },
      {
        text: t.placement.reset,
        style: 'destructive',
        onPress: async () => {
          try {
            await api.resetPlacementResult(result.id);
            refetch();
          } catch {
            Alert.alert(t.common.deleteFailed);
          }
        }
      }
    ]);
  }

  return (
    <FlatList
      contentContainerStyle={styles.content}
      data={data.results}
      keyExtractor={(result) => result.id}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor={tint} colors={[tint]} />}
      ListHeaderComponent={
        <>
          {isOffline ? <OfflineBanner /> : null}
          <Overview data={data} />
          {data.results.length > 0 ? <Distribution results={data.results} /> : null}
          <PlainView style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t.placement.results}</Text>
            {data.results.length > 0 ? (
              <PlainView style={[styles.countBubble, { backgroundColor: `${tint}1f` }]}>
                <Text style={[styles.countBubbleText, { color: tint }]}>{data.results.length}</Text>
              </PlainView>
            ) : null}
          </PlainView>
        </>
      }
      ListEmptyComponent={<EmptyState icon="people-outline" label={t.placement.noResults} />}
      renderItem={({ item }) => <ResultRow result={item} onReset={() => confirmReset(item)} />}
    />
  );
}

function Overview({ data }: { data: PlacementResponse }) {
  const { t } = useLanguage();
  const tested = data.results.length;
  const average = tested ? Math.round(data.results.reduce((sum, result) => sum + percentOf(result), 0) / tested) : null;

  return (
    <PlainView style={styles.heroShadow}>
      <LinearGradient colors={OVERVIEW_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <PlainView style={[styles.bubble, styles.bubbleLarge]} />
        <PlainView style={[styles.bubble, styles.bubbleSmall]} />

        <PlainView style={styles.heroTop}>
          <PlainView style={styles.heroIcon}>
            <Ionicons name="school" size={22} color="#fff" />
          </PlainView>
          <Text style={styles.heroTitle}>{t.placement.overviewTitle}</Text>
        </PlainView>

        <PlainView style={styles.heroCountRow}>
          <Text style={styles.heroCount}>{tested}</Text>
          <Text style={styles.heroCountLabel}>{t.placement.studentsTested}</Text>
        </PlainView>

        <PlainView style={styles.heroStats}>
          <PlainView style={styles.heroStat}>
            <Text style={styles.heroStatValue}>{average === null ? '—' : `${average}%`}</Text>
            <Text style={styles.heroStatLabel}>{t.placement.averageScore}</Text>
          </PlainView>
          <PlainView style={styles.heroDivider} />
          <PlainView style={styles.heroStat}>
            <Text style={styles.heroStatValue}>{data.questions.length}</Text>
            <Text style={styles.heroStatLabel}>{t.placement.questionsInTest}</Text>
          </PlainView>
        </PlainView>

        <Link href="/placement-questions" asChild>
          {/* One flattened style object: Link's web asChild forwards it as-is. */}
          <Pressable style={StyleSheet.flatten(styles.editButton)}>
            {({ pressed }) => (
              <PlainView style={[styles.editButtonInner, pressed && styles.pressed]}>
                <Ionicons name="create-outline" size={18} color={OVERVIEW_GRADIENT[1]} />
                <Text style={[styles.editButtonText, { color: OVERVIEW_GRADIENT[1] }]}>{t.placement.editQuestions}</Text>
                <Ionicons name="chevron-forward" size={16} color={OVERVIEW_GRADIENT[1]} />
              </PlainView>
            )}
          </Pressable>
        </Link>
      </LinearGradient>
    </PlainView>
  );
}

/** One column per level; the tallest column is the most common level. */
function Distribution({ results }: { results: PlacementResult[] }) {
  const { t } = useLanguage();
  const trackColor = useThemeColor({}, 'border');
  const mutedColor = useThemeColor({}, 'muted');

  const counts = CEFR_LEVELS.map((level) => results.filter((result) => normalizeCefrLevel(result.level) === level).length);
  const max = Math.max(1, ...counts);

  return (
    <Card style={styles.distributionCard}>
      <Text style={styles.cardTitle}>{t.placement.levelDistribution}</Text>
      <PlainView style={styles.columns}>
        {CEFR_LEVELS.map((level, index) => {
          const count = counts[index];
          const [from, to] = levelGradient[level];

          return (
            <PlainView key={level} style={styles.column}>
              <Text style={[styles.columnCount, { color: count ? to : mutedColor }]}>{count}</Text>
              <PlainView style={[styles.columnTrack, { backgroundColor: trackColor }]}>
                {count ? (
                  <LinearGradient colors={[from, to]} style={[styles.columnFill, { height: `${(count / max) * 100}%` }]} />
                ) : null}
              </PlainView>
              <Text style={[styles.columnLabel, { color: count ? to : mutedColor }]}>{level}</Text>
            </PlainView>
          );
        })}
      </PlainView>
    </Card>
  );
}

function ResultRow({ result, onReset }: { result: PlacementResult; onReset: () => void }) {
  const { t } = useLanguage();
  const mutedColor = useThemeColor({}, 'muted');
  const trackColor = useThemeColor({}, 'border');
  const dangerColor = useThemeColor({}, 'danger');
  const level = normalizeCefrLevel(result.level) ?? 'A1';
  const [from, to] = levelGradient[level];
  const percent = percentOf(result);

  return (
    <Card style={styles.row}>
      <LinearGradient colors={[from, to]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.rowBadge}>
        <Text style={styles.rowBadgeText}>{result.level}</Text>
      </LinearGradient>

      <PlainView style={styles.rowCopy}>
        <PlainView style={styles.rowTop}>
          <Text style={styles.rowName} numberOfLines={1}>
            {result.student}
          </Text>
          <Text style={[styles.rowScore, { color: to }]}>
            {result.correct ?? '—'}/{result.total ?? '—'}
          </Text>
        </PlainView>
        <PlainView style={[styles.rowTrack, { backgroundColor: trackColor }]}>
          <LinearGradient colors={[from, to]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.rowFill, { width: `${percent}%` }]} />
        </PlainView>
        <PlainView style={styles.rowMeta}>
          <Ionicons name="calendar-outline" size={12} color={mutedColor} />
          <Text style={[styles.rowDate, { color: mutedColor }]}>{result.date}</Text>
        </PlainView>
      </PlainView>

      <Pressable
        onPress={onReset}
        hitSlop={8}
        accessibilityLabel={t.placement.reset}
        style={({ pressed }) => [styles.resetButton, { backgroundColor: `${dangerColor}1a` }, pressed && styles.pressed]}
      >
        <Ionicons name="refresh" size={18} color={dangerColor} />
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 48
  },
  pressed: {
    opacity: 0.7
  },
  heroShadow: {
    borderRadius: 24,
    marginBottom: 14,
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.28,
    shadowRadius: 18,
    elevation: 8
  },
  hero: {
    borderRadius: 24,
    padding: 20,
    overflow: 'hidden'
  },
  bubble: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)'
  },
  bubbleLarge: {
    width: 170,
    height: 170,
    top: -60,
    right: -40
  },
  bubbleSmall: {
    width: 100,
    height: 100,
    bottom: -36,
    left: -24
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  heroIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  heroTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800'
  },
  heroCountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginTop: 16
  },
  heroCount: {
    color: '#fff',
    fontSize: 44,
    fontWeight: '900'
  },
  heroCountLabel: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 14,
    fontWeight: '600',
    flexShrink: 1
  },
  heroStats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    paddingVertical: 12,
    marginTop: 12
  },
  heroStat: {
    flex: 1,
    alignItems: 'center',
    gap: 2
  },
  heroStatValue: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800'
  },
  heroStatLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    fontWeight: '600'
  },
  heroDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.3)'
  },
  editButton: {
    marginTop: 14,
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 16
  },
  editButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8
  },
  editButtonText: {
    fontSize: 15,
    fontWeight: '800'
  },
  distributionCard: {
    paddingTop: 16
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 12
  },
  columns: {
    flexDirection: 'row',
    gap: 10
  },
  column: {
    flex: 1,
    alignItems: 'center',
    gap: 6
  },
  columnCount: {
    fontSize: 14,
    fontWeight: '800'
  },
  columnTrack: {
    width: '100%',
    height: 76,
    borderRadius: 10,
    justifyContent: 'flex-end',
    overflow: 'hidden'
  },
  columnFill: {
    width: '100%',
    borderRadius: 10
  },
  columnLabel: {
    fontSize: 13,
    fontWeight: '800'
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    marginBottom: 10
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800'
  },
  countBubble: {
    minWidth: 24,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    alignItems: 'center'
  },
  countBubbleText: {
    fontSize: 13,
    fontWeight: '800'
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  rowBadge: {
    width: 50,
    height: 50,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center'
  },
  rowBadgeText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '900'
  },
  rowCopy: {
    flex: 1,
    minWidth: 0,
    gap: 6
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8
  },
  rowName: {
    fontSize: 16,
    fontWeight: '700',
    flexShrink: 1
  },
  rowScore: {
    fontSize: 14,
    fontWeight: '800'
  },
  rowTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden'
  },
  rowFill: {
    height: 6,
    borderRadius: 3
  },
  rowMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  rowDate: {
    fontSize: 12,
    fontWeight: '500'
  },
  resetButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center'
  }
});
