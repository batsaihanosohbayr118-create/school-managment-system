import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Alert, FlatList, RefreshControl, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { OfflineBanner } from '@/components/OfflineBanner';
import { ProgressRing } from '@/components/ProgressRing';
import { SearchBar } from '@/components/SearchBar';
import { SkeletonList } from '@/components/Skeleton';
import { SwipeableRow } from '@/components/SwipeableRow';
import { Text, View, useThemeColor } from '@/components/Themed';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { accentForSubjectName, iconForSubjectName } from '@/lib/subject-visual';
import { useApiData } from '@/lib/use-api';
import type { GradeEntry } from '@shared/api-types';

export default function GradesScreen() {
  const { data, error, loading, refetch, isOffline } = useApiData('grades', api.grades);
  const { session } = useAuth();
  const { t } = useLanguage();
  const [query, setQuery] = useState('');
  const dangerColor = useThemeColor({}, 'danger');
  const tint = useThemeColor({}, 'tint');
  const isTeacher = session?.role === 'teacher';

  // Picks up a row a teacher just added via /grade-entry — that screen
  // doesn't know how to reach back into this one's state, so refetch instead.
  useFocusEffect(
    useCallback(() => {
      refetch();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const grades = data?.grades ?? [];
  const filteredGrades = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return grades;
    return grades.filter((grade) => {
      const haystack = [grade.subject, grade.student, grade.scoreLabel, grade.semester]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [grades, query]);

  async function handleDelete(grade: GradeEntry) {
    try {
      await api.deleteGrade(grade.id);
      refetch();
    } catch {
      Alert.alert(t.common.deleteFailed);
    }
  }

  if (loading) {
    return <SkeletonList />;
  }

  if (error && !isOffline) {
    return (
      <View style={styles.center}>
        <Text style={{ color: dangerColor }}>{error.message}</Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={filteredGrades}
      keyExtractor={(grade) => grade.id}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor={tint} colors={[tint]} />}
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={
        <>
          {isOffline ? <OfflineBanner /> : null}
          {grades.length > 0 ? <SearchBar value={query} onChangeText={setQuery} placeholder={t.common.searchGrades} /> : null}
        </>
      }
      ListEmptyComponent={
        <EmptyState icon="bar-chart-outline" label={query ? t.common.noGradesMatchSearch : t.common.noGradesYet} />
      }
      renderItem={({ item }) => (
        <SwipeableRow deleteLabel={t.common.delete} onDelete={isTeacher ? () => handleDelete(item) : undefined}>
          <GradeRow grade={item} />
        </SwipeableRow>
      )}
    />
  );
}

function GradeRow({ grade }: { grade: GradeEntry }) {
  // By the subject's own name, not the row's index — two rows for the same
  // subject (different students) must look the same, not alternate.
  const accent = accentForSubjectName(grade.subject);
  const icon = iconForSubjectName(grade.subject);
  const mutedColor = useThemeColor({}, 'muted');
  const accentColor = useThemeColor({}, accent);
  const accentMuted = useThemeColor({}, `${accent}Muted` as const);
  const trackColor = useThemeColor({}, 'border');
  const dangerColor = useThemeColor({}, 'danger');
  // A failing score always reads as danger regardless of the card's own
  // accent cycle — that signal matters more than the decorative variety.
  const ringColor = grade.score !== null && grade.score < 60 ? dangerColor : accentColor;

  return (
    <Card style={[styles.card, { borderLeftColor: accentColor }]}>
      <View style={styles.row}>
        <View style={[styles.icon, { backgroundColor: accentMuted }]}>
          <Ionicons name={icon} size={20} color={accentColor} />
        </View>
        <View style={styles.info}>
          <Text style={styles.subject} numberOfLines={1}>{grade.subject}</Text>
          <Text style={[styles.meta, { color: mutedColor }]} numberOfLines={1}>
            {grade.student} · {grade.semester}
          </Text>
          <View style={[styles.tag, { backgroundColor: accentMuted }]}>
            <Ionicons name="bar-chart" size={12} color={accentColor} />
            <Text style={[styles.tagText, { color: accentColor }]} numberOfLines={1}>{grade.semester}</Text>
          </View>
        </View>
        <ProgressRing percent={grade.score ?? 0} color={ringColor} trackColor={trackColor} label={grade.scoreLabel} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  content: {
    padding: 16
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20
  },
  card: {
    marginBottom: 0,
    borderLeftWidth: 3
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'transparent'
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center'
  },
  info: {
    flex: 1,
    minWidth: 0,
    gap: 4,
    backgroundColor: 'transparent'
  },
  subject: {
    fontSize: 17,
    fontWeight: '700'
  },
  meta: {
    fontSize: 13
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    marginTop: 2,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999
  },
  tagText: {
    fontSize: 11,
    fontWeight: '700'
  }
});
