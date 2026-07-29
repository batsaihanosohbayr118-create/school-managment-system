import { FlatList, StyleSheet } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { Card } from '@/components/Card';
import { Text, View, useThemeColor } from '@/components/Themed';
import { api } from '@/lib/api';
import { useApiData } from '@/lib/use-api';
import type { AnnouncementEntry } from '@shared/api-types';

export default function AnnouncementsScreen() {
  const { data, error, loading, refetch } = useApiData(api.announcements);
  const dangerColor = useThemeColor({}, 'danger');
  const mutedColor = useThemeColor({}, 'muted');

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
      data={data?.announcements ?? []}
      keyExtractor={(entry) => entry.id}
      onRefresh={refetch}
      refreshing={loading}
      ListEmptyComponent={
        <View style={styles.center}>
          <Text style={{ color: mutedColor }}>No announcements yet.</Text>
        </View>
      }
      renderItem={({ item }) => <AnnouncementRow entry={item} />}
    />
  );
}

function AnnouncementRow({ entry }: { entry: AnnouncementEntry }) {
  const tint = useThemeColor({}, 'tint');
  const mutedColor = useThemeColor({}, 'muted');

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <SymbolView name="megaphone.fill" size={16} tintColor={tint} />
        <Text style={styles.title}>{entry.title}</Text>
      </View>
      <Text style={styles.body}>{entry.content}</Text>
      <Text style={[styles.meta, { color: mutedColor }]}>
        {entry.audience} · {entry.date}
      </Text>
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
    gap: 4
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  title: {
    fontSize: 17,
    fontWeight: '700'
  },
  body: {
    fontSize: 15,
    lineHeight: 20
  },
  meta: {
    fontSize: 13,
    marginTop: 4
  }
});
