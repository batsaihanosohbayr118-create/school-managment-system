import { FlatList, StyleSheet } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { Card } from '@/components/Card';
import { OfflineBanner } from '@/components/OfflineBanner';
import { Text, View, useThemeColor } from '@/components/Themed';
import { api } from '@/lib/api';
import { useLanguage } from '@/lib/language-context';
import { useApiData } from '@/lib/use-api';
import type { AnnouncementEntry } from '@shared/api-types';

export default function AnnouncementsScreen() {
  const { data, error, loading, refetch, isOffline } = useApiData('announcements', api.announcements);
  const { t } = useLanguage();
  const dangerColor = useThemeColor({}, 'danger');
  const mutedColor = useThemeColor({}, 'muted');

  if (loading) {
    return (
      <View style={styles.center}>
        <Text style={{ color: mutedColor }}>{t.common.loading}</Text>
      </View>
    );
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
      data={data?.announcements ?? []}
      keyExtractor={(entry) => entry.id}
      onRefresh={refetch}
      refreshing={loading}
      ListHeaderComponent={isOffline ? <OfflineBanner /> : null}
      ListEmptyComponent={
        <View style={styles.center}>
          <Text style={{ color: mutedColor }}>{t.common.noAnnouncementsYet}</Text>
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
    gap: 8,
    backgroundColor: 'transparent'
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
