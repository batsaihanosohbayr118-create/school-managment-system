import { useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View as RNView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, Polyline, Text as SvgText } from 'react-native-svg';

import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { OfflineBanner } from '@/components/OfflineBanner';
import { ProgressRing } from '@/components/ProgressRing';
import { Text, View, useThemeColor } from '@/components/Themed';
import { api } from '@/lib/api';
import { useLanguage } from '@/lib/language-context';
import { accentForSubjectName, iconForSubjectName } from '@/lib/subject-visual';
import { useApiData } from '@/lib/use-api';
import type { GradeEntry } from '@shared/api-types';
import { averageScore, gradePointAverage, semestersInOrder, semesterTrend, summarizeSubjects, type SubjectSummary } from '@shared/grade-summary';
import { translateValue } from '@shared/i18n-tables';

/** Same in both themes: white copy on the screen's one bold surface. */
const GPA_GRADIENT = ['#1e3a8a', '#1d4ed8', '#3b82f6'] as const;
const TREND_POINTS = 5;

/** The school year starts in September. */
function schoolYearStart(now = new Date()) {
  return now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
}

/**
 * The student / parent grades view: a GPA summary for the picked semester,
 * every subject with its letter grade, and the GPA trend across semesters.
 * Teachers keep the plain list in app/(tabs)/grades.tsx.
 */
export function GradesOverview({ grades, loading, refetch, isOffline }: { grades: GradeEntry[]; loading: boolean; refetch: () => void; isOffline: boolean }) {
  const { language, t } = useLanguage();
  const tint = useThemeColor({}, 'tint');
  const mutedColor = useThemeColor({}, 'muted');
  const borderColor = useThemeColor({}, 'border');
  const cardColor = useThemeColor({}, 'card');
  const subjects = useApiData('subjects', api.subjects);

  const semesters = useMemo(() => semestersInOrder(grades), [grades]);
  // null = the whole year. Until the user picks, follow the newest semester.
  const [picked, setPicked] = useState<string | null | undefined>(undefined);
  const selected = picked === undefined || (picked !== null && !semesters.includes(picked)) ? (semesters[semesters.length - 1] ?? null) : picked;

  const summary = useMemo(() => summarizeSubjects(grades, selected), [grades, selected]);
  const gpa = gradePointAverage(summary);
  const average = averageScore(summary);
  const trend = useMemo(() => semesterTrend(grades).slice(-TREND_POINTS), [grades]);

  const previousSemester = selected === null ? null : semesters[semesters.indexOf(selected) - 1];
  const previousGpa = previousSemester ? gradePointAverage(summarizeSubjects(grades, previousSemester)) : null;
  const delta = gpa !== null && previousGpa !== null ? Math.round((gpa - previousGpa) * 10) / 10 : null;

  const teachers = useMemo(() => {
    const map = new Map<string, string>();
    for (const subject of subjects.data?.subjects ?? []) {
      if (subject.teacher) map.set(subject.name.trim().toLowerCase(), subject.teacher);
    }
    return map;
  }, [subjects.data]);

  // Graded subjects first, then the enrolled ones with no score yet, so the
  // list is never blank just because a teacher hasn't entered anything.
  const rows = useMemo(() => {
    const graded = new Set(summary.map((subject) => subject.subject.toLowerCase()));
    const ungraded = (subjects.data?.subjects ?? [])
      .map((subject) => subject.name.trim())
      .filter((name, index, names) => name && !graded.has(name.toLowerCase()) && names.indexOf(name) === index)
      .sort((a, b) => a.localeCompare(b));
    return [
      ...summary.map((subject) => ({ name: subject.subject, summary: subject as SubjectSummary | null })),
      ...ungraded.map((name) => ({ name, summary: null }))
    ];
  }, [summary, subjects.data]);

  const cheer = gpa === null ? null : gpa >= 3.5 ? t.gradesView.cheers.great : gpa >= 2.5 ? t.gradesView.cheers.good : t.gradesView.cheers.focus;
  const tabs: (string | null)[] = [...semesters, null];

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor={tint} colors={[tint]} />}
    >
      {isOffline ? <OfflineBanner /> : null}
      <Text style={[styles.year, { color: mutedColor }]}>{t.gradesView.schoolYear(schoolYearStart())}</Text>

      {/* With no semesters there is nothing to switch between — "Year total" alone is noise. */}
      {semesters.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
          {tabs.map((semester) => {
            const active = semester === selected;
            return (
              <Pressable
                key={semester ?? '__year'}
                onPress={() => setPicked(semester)}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                style={[styles.tab, { borderColor: active ? tint : borderColor, backgroundColor: active ? tint : cardColor }]}
              >
                <Text style={[styles.tabText, { color: active ? '#fff' : mutedColor }]}>
                  {semester === null ? t.gradesView.wholeYear : translateValue(semester, language)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}

      <LinearGradient colors={GPA_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gpaCard}>
        <RNView style={styles.gpaCopy}>
          <Text style={styles.gpaLabel}>{t.gradesView.gpa}</Text>
          <Text style={styles.gpaValue}>
            {gpa === null ? '—' : gpa.toFixed(1)}
            <Text style={styles.gpaScale}> / 4.0</Text>
          </Text>
          {gpa === null ? <Text style={styles.deltaText}>{t.gradesView.noGradesHint}</Text> : null}
          {delta !== null && delta !== 0 ? (
            <RNView style={styles.delta}>
              <Ionicons name={delta > 0 ? 'arrow-up' : 'arrow-down'} size={14} color={delta > 0 ? '#4ade80' : '#fca5a5'} />
              <Text style={styles.deltaText}>
                {t.gradesView.fromPrevious}{' '}
                <Text style={{ color: delta > 0 ? '#4ade80' : '#fca5a5', fontWeight: '800' }}>
                  {delta > 0 ? '+' : ''}
                  {delta.toFixed(1)}
                </Text>
              </Text>
            </RNView>
          ) : null}
          <RNView style={styles.gpaTrack}>
            <RNView style={[styles.gpaFill, { width: `${((gpa ?? 0) / 4) * 100}%` }]} />
          </RNView>
        </RNView>
        <RNView style={styles.ringWrap}>
          <ProgressRing
            percent={average ?? 0}
            color="#fff"
            trackColor="rgba(255,255,255,0.18)"
            size={92}
            strokeWidth={9}
            label={average === null ? '—' : `${average}%`}
          />
          <Text style={styles.ringCaption}>{t.gradesView.overallAverage}</Text>
        </RNView>
      </LinearGradient>

      {cheer ? (
        <Card style={styles.cheer}>
          <LinearGradient colors={['#fbbf24', '#d97706']} style={styles.cheerIcon}>
            <Ionicons name="trophy" size={22} color="#fff" />
          </LinearGradient>
          <View style={styles.cheerCopy}>
            <Text style={styles.cheerTitle}>{cheer.title}</Text>
            <Text style={[styles.cheerBody, { color: mutedColor }]}>{cheer.body}</Text>
          </View>
        </Card>
      ) : null}

      <Text style={styles.sectionTitle}>{t.gradesView.subjectGrades}</Text>
      {rows.length === 0 ? (
        <EmptyState icon="bar-chart-outline" label={t.common.noGradesYet} />
      ) : (
        rows.map((row) => <SubjectRow key={row.name} name={row.name} summary={row.summary} teacher={teachers.get(row.name.toLowerCase())} />)
      )}

      {trend.length >= 2 ? <TrendCard trend={trend} /> : null}
    </ScrollView>
  );
}

function badgeAccent(points: number) {
  if (points >= 3.7) return 'success' as const;
  if (points >= 2.7) return 'tint' as const;
  if (points >= 1.7) return 'warning' as const;
  return 'danger' as const;
}

/** `summary` is null for an enrolled subject that has no score yet. */
function SubjectRow({ name, summary, teacher }: { name: string; summary: SubjectSummary | null; teacher?: string }) {
  const { language, t } = useLanguage();
  const accent = accentForSubjectName(name);
  const accentColor = useThemeColor({}, accent);
  const accentMuted = useThemeColor({}, `${accent}Muted` as const);
  const mutedColor = useThemeColor({}, 'muted');
  const trackColor = useThemeColor({}, 'border');
  const badge = badgeAccent(summary?.points ?? 0);
  const badgeColor = useThemeColor({}, badge);
  const badgeMuted = useThemeColor({}, `${badge}Muted` as const);
  const score = summary?.score ?? 0;

  return (
    <Card style={styles.subjectCard}>
      <View style={styles.subjectRow}>
        <View style={[styles.subjectIcon, { backgroundColor: accentMuted }]}>
          <Ionicons name={iconForSubjectName(name)} size={20} color={accentColor} />
        </View>
        <View style={styles.subjectCopy}>
          <Text style={styles.subjectName} numberOfLines={1}>
            {translateValue(name, language)}
          </Text>
          {teacher ? (
            <Text style={[styles.subjectTeacher, { color: mutedColor }]} numberOfLines={1}>
              {t.gradesView.teacher(teacher)}
            </Text>
          ) : null}
        </View>
        <Text style={[styles.score, !summary && { color: mutedColor }]}>
          {summary ? summary.score : '—'}
          <Text style={[styles.scoreMax, { color: mutedColor }]}>/100</Text>
        </Text>
        {summary ? (
          <View style={[styles.badge, { backgroundColor: badgeMuted }]}>
            <Text style={[styles.badgeText, { color: badgeColor }]}>{summary.letter}</Text>
          </View>
        ) : null}
      </View>
      <View style={[styles.bar, { backgroundColor: trackColor }]}>
        <View style={[styles.barFill, { width: `${Math.min(100, Math.max(0, score))}%`, backgroundColor: accentColor }]} />
      </View>
    </Card>
  );
}

const CHART_HEIGHT = 92;
const CHART_PAD = 22;
/** Space above the line for the GPA values and below it for the semester names. */
const VALUE_BAND = 20;
const LABEL_BAND = 24;

function TrendCard({ trend }: { trend: { semester: string; gpa: number }[] }) {
  const { language, t } = useLanguage();
  const tint = useThemeColor({}, 'tint');
  const tintMuted = useThemeColor({}, 'tintMuted');
  const mutedColor = useThemeColor({}, 'muted');
  const textColor = useThemeColor({}, 'text');
  const cardColor = useThemeColor({}, 'card');
  const [width, setWidth] = useState(0);

  const min = Math.min(...trend.map((point) => point.gpa));
  const max = Math.max(...trend.map((point) => point.gpa));
  const span = max - min || 1;
  const points = trend.map((point, index) => ({
    ...point,
    x: CHART_PAD + (index * (width - CHART_PAD * 2)) / (trend.length - 1),
    y: VALUE_BAND + (1 - (point.gpa - min) / span) * (CHART_HEIGHT - VALUE_BAND - LABEL_BAND)
  }));

  return (
    <Card style={styles.trendCard}>
      <View style={styles.trendHeader}>
        <View style={[styles.trendIcon, { backgroundColor: tintMuted }]}>
          <Ionicons name="trending-up" size={20} color={tint} />
        </View>
        <View style={styles.subjectCopy}>
          <Text style={styles.subjectName}>{t.gradesView.trendTitle}</Text>
          <Text style={[styles.subjectTeacher, { color: mutedColor }]}>{t.gradesView.trendSubtitle(trend.length)}</Text>
        </View>
      </View>
      <View style={styles.chart} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
        {width > 0 ? (
          <Svg width={width} height={CHART_HEIGHT}>
            <Polyline points={points.map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke={tint} strokeWidth={2.5} strokeLinejoin="round" />
            {points.map((p) => (
              <Circle key={p.semester} cx={p.x} cy={p.y} r={4.5} fill={tint} stroke={cardColor} strokeWidth={2} />
            ))}
            {points.map((p) => (
              <SvgText key={`v-${p.semester}`} x={p.x} y={p.y - 9} fill={textColor} fontSize={11} fontWeight="700" textAnchor="middle">
                {p.gpa.toFixed(1)}
              </SvgText>
            ))}
            {points.map((p) => (
              <SvgText key={`l-${p.semester}`} x={p.x} y={CHART_HEIGHT - 6} fill={mutedColor} fontSize={11} fontWeight="600" textAnchor="middle">
                {translateValue(p.semester, language)}
              </SvgText>
            ))}
          </Svg>
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  content: {
    padding: 16,
    paddingBottom: 28
  },
  year: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 12
  },
  tabs: {
    gap: 8,
    paddingBottom: 16
  },
  tab: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 9
  },
  tabText: {
    fontSize: 14,
    fontWeight: '700'
  },
  gpaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 22,
    padding: 18,
    marginBottom: 12
  },
  gpaCopy: {
    flex: 1,
    minWidth: 0
  },
  gpaLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    fontWeight: '700'
  },
  gpaValue: {
    color: '#fff',
    fontSize: 40,
    fontWeight: '800',
    marginTop: 4
  },
  gpaScale: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 18,
    fontWeight: '700'
  },
  delta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2
  },
  deltaText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    fontWeight: '600'
  },
  gpaTrack: {
    height: 6,
    borderRadius: 3,
    marginTop: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.2)'
  },
  gpaFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: '#93c5fd'
  },
  ringWrap: {
    alignItems: 'center',
    gap: 6
  },
  ringCaption: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    fontWeight: '600'
  },
  cheer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 0
  },
  cheerIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center'
  },
  cheerCopy: {
    flex: 1,
    gap: 2,
    backgroundColor: 'transparent'
  },
  cheerTitle: {
    fontSize: 15,
    fontWeight: '800'
  },
  cheerBody: {
    fontSize: 13,
    lineHeight: 18
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    marginTop: 22,
    marginBottom: 10
  },
  subjectCard: {
    gap: 10
  },
  subjectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'transparent'
  },
  subjectIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center'
  },
  subjectCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
    backgroundColor: 'transparent'
  },
  subjectName: {
    fontSize: 15,
    fontWeight: '700'
  },
  subjectTeacher: {
    fontSize: 12
  },
  score: {
    fontSize: 18,
    fontWeight: '800'
  },
  scoreMax: {
    fontSize: 12,
    fontWeight: '600'
  },
  badge: {
    minWidth: 34,
    height: 30,
    borderRadius: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center'
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '800'
  },
  bar: {
    height: 5,
    borderRadius: 3,
    overflow: 'hidden'
  },
  barFill: {
    height: '100%',
    borderRadius: 3
  },
  trendCard: {
    marginTop: 10
  },
  trendHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'transparent'
  },
  trendIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center'
  },
  chart: {
    height: CHART_HEIGHT,
    marginTop: 10,
    backgroundColor: 'transparent'
  }
});
