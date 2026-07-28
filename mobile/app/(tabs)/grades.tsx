import { FlatList, StyleSheet } from 'react-native';

import { Text, View } from '@/components/Themed';
import { api } from '@/lib/api';
import { useApiData } from '@/lib/use-api';
import type { GradeEntry } from '@shared/api-types';

export default function GradesScreen() {
  const { data, error, loading, refetch } = useApiData(api.grades);

  if (loading) {
    return (
      <View style={styles.center}>
        <Text>Loading…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error.message}</Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      data={data?.grades ?? []}
      keyExtractor={(grade) => grade.id}
      onRefresh={refetch}
      refreshing={loading}
      ListEmptyComponent={
        <View style={styles.center}>
          <Text>No grades yet.</Text>
        </View>
      }
      renderItem={({ item }) => <GradeRow grade={item} />}
    />
  );
}

function GradeRow({ grade }: { grade: GradeEntry }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowHeader}>
        <Text style={styles.subject}>{grade.subject}</Text>
        <Text style={styles.score}>{grade.scoreLabel}</Text>
      </View>
      <Text style={styles.meta}>
        {grade.student} · {grade.semester}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20
  },
  error: {
    color: '#dc2626'
  },
  row: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#8884'
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  subject: {
    fontSize: 17,
    fontWeight: '600'
  },
  score: {
    fontSize: 17,
    fontWeight: '700'
  },
  meta: {
    fontSize: 14,
    opacity: 0.7,
    marginTop: 2
  }
});
