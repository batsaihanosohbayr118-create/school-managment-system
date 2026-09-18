import { useMemo, useState } from 'react';
import { Alert, FlatList, RefreshControl, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { audienceTone, Badge } from '@/components/Badge';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { OfflineBanner } from '@/components/OfflineBanner';
import { SearchBar } from '@/components/SearchBar';
import { SkeletonList } from '@/components/Skeleton';
import { SwipeableRow } from '@/components/SwipeableRow';
import { Text, View, useThemeColor } from '@/components/Themed';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { useApiData } from '@/lib/use-api';
import type { AnnouncementEntry } from '@shared/api-types';

export default function AnnouncementsScreen() {
  const { data, error, loading, refetch, isOffline } = useApiData('announcements', api.announcements);
  const { session } = useAuth();
  const { t } = useLanguage();
  const [query, setQuery] = useState('');
  const dangerColor = useThemeColor({}, 'danger');
  const tint = useThemeColor({}, 'tint');
  const canManage = session?.role === 'admin' || session?.role === 'teacher';

  const announcements = data?.announcements ?? [];
  const filteredAnnouncements = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return announcements;
    return announcements.filter((entry) => {
      const haystack = [entry.title, entry.content, entry.audience, entry.date]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [announcements, query]);

  async function handleDelete(entry: AnnouncementEntry) {
    try {
      await api.deleteAnnouncement(entry.id);
      refetch();
    } catch {
      Alert.alert(t.common.deleteFailed);
    }
  }

  if (loading) {
    return <SkeletonList variant="announcement" count={4} />;
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
      data={filteredAnnouncements}
      keyExtractor={(entry) => entry.id}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor={tint} colors={[tint]} />}
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={
        <>
          {isOffline ? <OfflineBanner /> : null}
          {announcements.length > 0 ? (
            <SearchBar value={query} onChangeText={setQuery} placeholder={t.common.searchAnnouncements} />
          ) : null}
        </>
      }
      ListEmptyComponent={
        <EmptyState icon="megaphone-outline" label={query ? t.common.noAnnouncementsMatchSearch : t.common.noAnnouncementsYet} />
      }
      renderItem={({ item }) => (
        <SwipeableRow deleteLabel={t.common.delete} onDelete={canManage ? () => handleDelete(item) : undefined}>
          <AnnouncementRow entry={item} />
        </SwipeableRow>
      )}
    />
  );
}

function AnnouncementRow({ entry }: { entry: AnnouncementEntry }) {
  // Colored by audience (teacher/student/parent/all), same tone as the badge
  // below — groups announcements visually without changing the icon itself,
  // which stays the megaphone regardless of audience.
  const tone = audienceTone(entry.audience);
  const accentColor = useThemeColor({}, tone);
  const accentMuted = useThemeColor({}, `${tone}Muted` as const);
  const mutedColor = useThemeColor({}, 'muted');

  return (
    <Card style={[styles.card, { borderLeftColor: accentColor }]}>
      <View style={styles.header}>
        <View style={[styles.iconBadge, { backgroundColor: accentMuted }]}>
          <Ionicons name="megaphone" size={20} color={accentColor} />
        </View>
        <Text style={styles.title} numberOfLines={1}>{entry.title}</Text>
      </View>
      <Text style={styles.body}>{entry.content}</Text>
      <View style={styles.footer}>
        <Badge label={entry.audience} tone={tone} />
        <View style={styles.dateGroup}>
          <Ionicons name="calendar-outline" size={11} color={mutedColor} />
          <Text style={[styles.date, { color: mutedColor }]}>{entry.date}</Text>
        </View>
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
    gap: 8,
    marginBottom: 0,
    borderLeftWidth: 3
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'transparent'
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
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
  dateGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'transparent'
  },
  date: {
    fontSize: 13,
    fontWeight: '600'
  }
});
