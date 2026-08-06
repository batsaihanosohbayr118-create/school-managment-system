import { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Alert, FlatList, RefreshControl, StyleSheet } from 'react-native';

import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { LoadingState } from '@/components/LoadingState';
import { OfflineBanner } from '@/components/OfflineBanner';
import { SwipeableRow } from '@/components/SwipeableRow';
import { Text, View, useThemeColor } from '@/components/Themed';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { useApiData } from '@/lib/use-api';
import type { GradeEntry } from '@shared/api-types';

export default function GradesScreen() {
  const { data, error, loading, refetch, isOffline } = useApiData('grades', api.grades);
  const { session } = useAuth();
  const { t } = useLanguage();
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

  async function handleDelete(grade: GradeEntry) {
    try {
      await api.deleteGrade(grade.id);
      refetch();
    } catch {
      Alert.alert(t.common.deleteFailed);
    }
  }

  if (loading) {
    return <LoadingState />;
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
      data={data?.grades ?? []}
      keyExtractor={(grade) => grade.id}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor={tint} colors={[tint]} />}
      ListHeaderComponent={isOffline ? <OfflineBanner /> : null}
      ListEmptyComponent={<EmptyState icon="bar-chart-outline" label={t.common.noGradesYet} />}
      renderItem={({ item }) => (
        <SwipeableRow deleteLabel={t.common.delete} onDelete={isTeacher ? () => handleDelete(item) : undefined}>
          <GradeRow grade={item} />
        </SwipeableRow>
      )}
    />
  );
}

function GradeRow({ grade }: { grade: GradeEntry }) {
  const mutedColor = useThemeColor({}, 'muted');
  const tint = useThemeColor({}, 'tint');
  const successColor = useThemeColor({}, 'success');
  const warningColor = useThemeColor({}, 'warning');
  const dangerColor = useThemeColor({}, 'danger');
  const scoreColor = gradeColor(grade.score, { successColor, warningColor, dangerColor });

  return (
    <Card style={styles.card}>
      <View style={styles.rowHeader}>
        <Text style={styles.subject}>{grade.subject}</Text>
        <Text style={[styles.score, { color: scoreColor ?? tint }]}>{grade.scoreLabel}</Text>
      </View>
      <Text style={[styles.meta, { color: mutedColor }]}>
        {grade.student} · {grade.semester}
      </Text>
    </Card>
  );
}

/** null defers to the tint color — used when the score can't be parsed. */
function gradeColor(
  score: number | null,
  tones: { successColor: string; warningColor: string; dangerColor: string }
): string | null {
  if (score === null) return null;
  if (score >= 80) return tones.successColor;
  if (score >= 60) return tones.warningColor;
  return tones.dangerColor;
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
    gap: 3,
    marginBottom: 0
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'transparent'
  },
  subject: {
    fontSize: 17,
    fontWeight: '700'
  },
  meta: {
    fontSize: 14
  },
  score: {
    fontSize: 20,
    fontWeight: '800'
  }
});
