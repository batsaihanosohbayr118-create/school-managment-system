import { FlatList, StyleSheet } from 'react-native';

import { Text, View } from '@/components/Themed';
import { api } from '@/lib/api';
import { useApiData } from '@/lib/use-api';
import type { AnnouncementEntry } from '@shared/api-types';

export default function AnnouncementsScreen() {
  const { data, error, loading, refetch } = useApiData(api.announcements);

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
      data={data?.announcements ?? []}
      keyExtractor={(entry) => entry.id}
      onRefresh={refetch}
      refreshing={loading}
      ListEmptyComponent={
        <View style={styles.center}>
          <Text>No announcements yet.</Text>
        </View>
      }
      renderItem={({ item }) => <AnnouncementRow entry={item} />}
    />
  );
}

function AnnouncementRow({ entry }: { entry: AnnouncementEntry }) {
  return (
    <View style={styles.row}>
      <Text style={styles.title}>{entry.title}</Text>
      <Text style={styles.content}>{entry.content}</Text>
      <Text style={styles.meta}>
        {entry.audience} · {entry.date}
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
  title: {
    fontSize: 17,
    fontWeight: '600'
  },
  content: {
    fontSize: 15,
    marginTop: 4
  },
  meta: {
    fontSize: 13,
    opacity: 0.7,
    marginTop: 6
  }
});
