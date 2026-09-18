import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Alert, FlatList, RefreshControl, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Badge, statusTone } from '@/components/Badge';
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
import { accentForSubjectName, iconForSubjectName } from '@/lib/subject-visual';
import { useApiData } from '@/lib/use-api';
import { translateValue } from '@shared/i18n-tables';
import type { AttendanceEntry } from '@shared/api-types';

export default function AttendanceScreen() {
  const { data, error, loading, refetch, isOffline } = useApiData('attendance', api.attendance);
  const { session } = useAuth();
  const { language, t } = useLanguage();
  const [query, setQuery] = useState('');
  const dangerColor = useThemeColor({}, 'danger');
  const tint = useThemeColor({}, 'tint');
  const isTeacher = session?.role === 'teacher';

  // Picks up a row a teacher just added via /attendance-entry — that screen
  // doesn't know how to reach back into this one's state, so refetch instead.
  useFocusEffect(
    useCallback(() => {
      refetch();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const entries = data?.entries ?? [];
  const filteredEntries = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return entries;
    return entries.filter((entry) => {
      const haystack = [entry.subject, entry.student, translateValue(entry.status, language), entry.date]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(needle);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, query, language]);

  async function handleDelete(entry: AttendanceEntry) {
    try {
      await api.deleteAttendance(entry.id);
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
      data={filteredEntries}
      keyExtractor={(entry) => entry.id}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor={tint} colors={[tint]} />}
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={
        <>
          {isOffline ? <OfflineBanner /> : null}
          {entries.length > 0 ? <SearchBar value={query} onChangeText={setQuery} placeholder={t.common.searchAttendance} /> : null}
        </>
      }
      ListEmptyComponent={
        <EmptyState icon="checkmark-circle-outline" label={query ? t.common.noAttendanceMatchSearch : t.common.noAttendanceRecordsYet} />
      }
      renderItem={({ item }) => (
        <SwipeableRow deleteLabel={t.common.delete} onDelete={isTeacher ? () => handleDelete(item) : undefined}>
          <AttendanceRow entry={item} />
        </SwipeableRow>
      )}
    />
  );
}

function AttendanceRow({ entry }: { entry: AttendanceEntry }) {
  const { language } = useLanguage();
  const mutedColor = useThemeColor({}, 'muted');
  // By the subject's own name, not the row's index — the same subject must
  // look the same everywhere it appears (also on the grades/subjects tabs).
  const accentColor = useThemeColor({}, accentForSubjectName(entry.subject));
  const accentMuted = useThemeColor({}, `${accentForSubjectName(entry.subject)}Muted` as const);
  const icon = iconForSubjectName(entry.subject);

  return (
    <Card style={[styles.card, { borderLeftColor: accentColor }]}>
      <View style={styles.row}>
        <View style={[styles.icon, { backgroundColor: accentMuted }]}>
          <Ionicons name={icon} size={20} color={accentColor} />
        </View>
        <View style={styles.info}>
          <Text style={styles.subject} numberOfLines={1}>{entry.subject}</Text>
          <View style={styles.metaGroup}>
            <Ionicons name="person-outline" size={12} color={mutedColor} />
            <Text style={styles.student} numberOfLines={1}>{entry.student}</Text>
          </View>
        </View>
        <View style={styles.side}>
          <Badge label={translateValue(entry.status, language)} tone={statusTone(entry.status)} />
          <View style={styles.dateGroup}>
            <Ionicons name="calendar-outline" size={11} color={mutedColor} />
            <Text style={[styles.date, { color: mutedColor }]}>{entry.date}</Text>
          </View>
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
  metaGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'transparent'
  },
  student: {
    fontSize: 13,
    flexShrink: 1
  },
  side: {
    alignItems: 'flex-end',
    gap: 6,
    backgroundColor: 'transparent'
  },
  dateGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'transparent'
  },
  date: {
    fontSize: 12,
    fontWeight: '500'
  }
});
