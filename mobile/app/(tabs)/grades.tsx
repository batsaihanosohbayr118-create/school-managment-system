import { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { FlatList, StyleSheet } from 'react-native';

import { Card } from '@/components/Card';
import { Text, View, useThemeColor } from '@/components/Themed';
import { api } from '@/lib/api';
import { useApiData } from '@/lib/use-api';
import type { GradeEntry } from '@shared/api-types';

export default function GradesScreen() {
  const { data, error, loading, refetch } = useApiData(api.grades);
  const dangerColor = useThemeColor({}, 'danger');
  const mutedColor = useThemeColor({}, 'muted');

  // Picks up a row a teacher just added via /grade-entry — that screen
  // doesn't know how to reach back into this one's state, so refetch instead.
  useFocusEffect(
    useCallback(() => {
      refetch();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <Text style={{ color: mutedColor }}>Loading…</Text>
      </View>
    );
  }

  if (error) {
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
      onRefresh={refetch}
      refreshing={loading}
      ListEmptyComponent={
        <View style={styles.center}>
          <Text style={{ color: mutedColor }}>No grades yet.</Text>
        </View>
      }
      renderItem={({ item }) => <GradeRow grade={item} />}
    />
  );
}

function GradeRow({ grade }: { grade: GradeEntry }) {
  const mutedColor = useThemeColor({}, 'muted');
  const tint = useThemeColor({}, 'tint');
  const scoreColor = gradeColor(grade.score);

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
function gradeColor(score: number | null): string | null {
  if (score === null) return null;
  if (score >= 80) return '#16a34a';
  if (score >= 60) return '#d97706';
  return '#dc2626';
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
    gap: 3
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
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
