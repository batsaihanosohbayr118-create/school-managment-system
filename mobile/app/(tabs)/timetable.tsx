import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Alert, FlatList, RefreshControl, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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
import type { TimetableSlot } from '@shared/api-types';

export default function TimetableScreen() {
  const { data, error, loading, refetch, isOffline } = useApiData('timetable', api.timetable);
  const { session } = useAuth();
  const { language, t } = useLanguage();
  const [query, setQuery] = useState('');
  const dangerColor = useThemeColor({}, 'danger');
  const tint = useThemeColor({}, 'tint');
  const isTeacher = session?.role === 'teacher';

  // Picks up a slot a teacher just added via /timetable-entry — that screen
  // doesn't know how to reach back into this one's state, so refetch instead.
  useFocusEffect(
    useCallback(() => {
      refetch();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const slots = data?.slots ?? [];
  const filteredSlots = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return slots;
    return slots.filter((slot) => {
      const haystack = [slot.subject, slot.teacher, slot.className, translateValue(slot.day, language), slot.timeLabel]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(needle);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slots, query, language]);

  async function handleDelete(slot: TimetableSlot) {
    try {
      await api.deleteTimetable(slot.id);
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
      data={filteredSlots}
      keyExtractor={(slot) => slot.id}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor={tint} colors={[tint]} />}
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={
        <>
          {isOffline ? <OfflineBanner /> : null}
          {slots.length > 0 ? <SearchBar value={query} onChangeText={setQuery} placeholder={t.common.searchTimetable} /> : null}
        </>
      }
      ListEmptyComponent={
        <EmptyState icon="calendar-outline" label={query ? t.common.noTimetableMatchSearch : t.common.noTimetableSlotsYet} />
      }
      renderItem={({ item }) => (
        <SwipeableRow deleteLabel={t.common.delete} onDelete={isTeacher ? () => handleDelete(item) : undefined}>
          <SlotRow slot={item} />
        </SwipeableRow>
      )}
    />
  );
}

function SlotRow({ slot }: { slot: TimetableSlot }) {
  const { language } = useLanguage();
  const mutedColor = useThemeColor({}, 'muted');
  // By the subject's own name, not the row's index — the same subject must
  // look the same everywhere it appears (also on the grades/attendance tabs).
  const accentColor = useThemeColor({}, accentForSubjectName(slot.subject));
  const accentMuted = useThemeColor({}, `${accentForSubjectName(slot.subject)}Muted` as const);
  const icon = iconForSubjectName(slot.subject);

  return (
    <Card style={[styles.card, { borderLeftColor: accentColor }]}>
      <View style={styles.row}>
        <View style={[styles.icon, { backgroundColor: accentMuted }]}>
          <Ionicons name={icon} size={20} color={accentColor} />
        </View>
        <View style={styles.info}>
          <Text style={styles.subject} numberOfLines={1}>{slot.subject}</Text>
          <View style={styles.metaGroup}>
            <Ionicons name="person-outline" size={12} color={mutedColor} />
            <Text style={styles.meta} numberOfLines={1}>{slot.teacher} · {slot.className}</Text>
          </View>
        </View>
        <View style={styles.side}>
          <View style={[styles.dayTag, { backgroundColor: accentMuted }]}>
            <Text style={[styles.dayTagText, { color: accentColor }]} numberOfLines={1}>
              {translateValue(slot.day, language)}
            </Text>
          </View>
          <View style={styles.timeGroup}>
            <Ionicons name="time-outline" size={11} color={mutedColor} />
            <Text style={[styles.time, { color: mutedColor }]}>{slot.timeLabel}</Text>
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
  meta: {
    fontSize: 13,
    flexShrink: 1
  },
  side: {
    alignItems: 'flex-end',
    gap: 6,
    backgroundColor: 'transparent'
  },
  dayTag: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999
  },
  dayTagText: {
    fontSize: 11,
    fontWeight: '700'
  },
  timeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'transparent'
  },
  time: {
    fontSize: 12,
    fontWeight: '500'
  }
});
