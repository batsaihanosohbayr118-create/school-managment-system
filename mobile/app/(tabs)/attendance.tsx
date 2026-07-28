import { FlatList, StyleSheet } from 'react-native';

import { Text, View } from '@/components/Themed';
import { api } from '@/lib/api';
import { useApiData } from '@/lib/use-api';
import type { AttendanceEntry } from '@shared/api-types';

export default function AttendanceScreen() {
  const { data, error, loading, refetch } = useApiData(api.attendance);

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
      data={data?.entries ?? []}
      keyExtractor={(entry) => entry.id}
      onRefresh={refetch}
      refreshing={loading}
      ListEmptyComponent={
        <View style={styles.center}>
          <Text>No attendance records yet.</Text>
        </View>
      }
      renderItem={({ item }) => <AttendanceRow entry={item} />}
    />
  );
}

function AttendanceRow({ entry }: { entry: AttendanceEntry }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowHeader}>
        <Text style={styles.subject}>{entry.subject}</Text>
        <Text style={styles.status}>{entry.status}</Text>
      </View>
      <Text style={styles.meta}>
        {entry.student} · {entry.date}
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
  status: {
    fontSize: 15,
    fontWeight: '600'
  },
  meta: {
    fontSize: 14,
    opacity: 0.7,
    marginTop: 2
  }
});
