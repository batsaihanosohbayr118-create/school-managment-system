import { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Alert, FlatList, RefreshControl, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { LoadingState } from '@/components/LoadingState';
import { OfflineBanner } from '@/components/OfflineBanner';
import { SwipeableRow } from '@/components/SwipeableRow';
import { Text, View, useThemeColor } from '@/components/Themed';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { useApiData } from '@/lib/use-api';
import { translateValue } from '@shared/i18n-tables';
import type { TimetableSlot } from '@shared/api-types';

export default function TimetableScreen() {
  const { data, error, loading, refetch, isOffline } = useApiData('timetable', api.timetable);
  const { session } = useAuth();
  const { t } = useLanguage();
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

  async function handleDelete(slot: TimetableSlot) {
    try {
      await api.deleteTimetable(slot.id);
      refetch();
    } catch {
      Alert.alert(t.common.deleteFailed);
    }
  }

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
      data={data?.slots ?? []}
      keyExtractor={(slot) => slot.id}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor={tint} colors={[tint]} />}
      ListHeaderComponent={isOffline ? <OfflineBanner /> : null}
      ListEmptyComponent={<EmptyState icon="calendar-outline" label={t.common.noTimetableSlotsYet} />}
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
  const tint = useThemeColor({}, 'tint');
  const mutedColor = useThemeColor({}, 'muted');

  return (
    <Card style={styles.card}>
      <View style={styles.cardHeader}>
        <Ionicons name="calendar" size={18} color={tint} />
        <Text style={styles.subject}>{slot.subject}</Text>
      </View>
      <Text style={[styles.meta, { color: mutedColor }]}>
        {translateValue(slot.day, language)} · {slot.timeLabel}
      </Text>
      <Text style={[styles.meta, { color: mutedColor }]}>
        {slot.teacher} · {slot.className}
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
    gap: 3,
    marginBottom: 0
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
    backgroundColor: 'transparent'
  },
  subject: {
    fontSize: 17,
    fontWeight: '700'
  },
  meta: {
    fontSize: 14
  }
});
