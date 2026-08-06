import { FlatList, RefreshControl, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Badge } from '@/components/Badge';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { LoadingState } from '@/components/LoadingState';
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
  const tint = useThemeColor({}, 'tint');

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
      data={data?.announcements ?? []}
      keyExtractor={(entry) => entry.id}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor={tint} colors={[tint]} />}
      ListHeaderComponent={isOffline ? <OfflineBanner /> : null}
      ListEmptyComponent={<EmptyState icon="megaphone-outline" label={t.common.noAnnouncementsYet} />}
      renderItem={({ item }) => <AnnouncementRow entry={item} />}
    />
  );
}

function AnnouncementRow({ entry }: { entry: AnnouncementEntry }) {
  const tint = useThemeColor({}, 'tint');
  const tintMuted = useThemeColor({}, 'tintMuted');
  const mutedColor = useThemeColor({}, 'muted');

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View style={[styles.iconBadge, { backgroundColor: tintMuted }]}>
          <Ionicons name="megaphone" size={15} color={tint} />
        </View>
        <Text style={styles.title}>{entry.title}</Text>
      </View>
      <Text style={styles.body}>{entry.content}</Text>
      <View style={styles.footer}>
        <Badge label={entry.audience} tone="neutral" />
        <Text style={[styles.date, { color: mutedColor }]}>{entry.date}</Text>
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
    gap: 8
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'transparent'
  },
  iconBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center'
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    flex: 1
  },
  body: {
    fontSize: 15,
    lineHeight: 20
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
    backgroundColor: 'transparent'
  },
  date: {
    fontSize: 13,
    fontWeight: '600'
  }
});
