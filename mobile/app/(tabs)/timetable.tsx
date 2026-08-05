import { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Alert, FlatList, Pressable, StyleSheet } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { Card } from '@/components/Card';
import { OfflineBanner } from '@/components/OfflineBanner';
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
  const { t, language } = useLanguage();
  const dangerColor = useThemeColor({}, 'danger');
  const mutedColor = useThemeColor({}, 'muted');
  const isTeacher = session?.role === 'teacher';

  // Picks up a slot a teacher just added via /timetable-entry — that screen
  // doesn't know how to reach back into this one's state, so refetch instead.
  useFocusEffect(
    useCallback(() => {
      refetch();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  function confirmDelete(slot: TimetableSlot) {
    Alert.alert(
      t.common.deleteRecord,
      t.common.deleteWarning(`${slot.subject} · ${translateValue(slot.day, language)} ${slot.timeLabel}`),
      [
        { text: t.common.cancel, style: 'cancel' },
        {
          text: t.common.delete,
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteTimetable(slot.id);
              refetch();
            } catch {
              Alert.alert(t.common.deleteFailed);
            }
          }
        }
      ]
    );
  }

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
      data={data?.slots ?? []}
      keyExtractor={(slot) => slot.id}
      onRefresh={refetch}
      refreshing={loading}
      ListHeaderComponent={isOffline ? <OfflineBanner /> : null}
      ListEmptyComponent={
        <View style={styles.center}>
          <Text style={{ color: mutedColor }}>{t.common.noTimetableSlotsYet}</Text>
        </View>
      }
      renderItem={({ item }) => <SlotRow slot={item} onDelete={isTeacher ? () => confirmDelete(item) : undefined} />}
    />
  );
}

function SlotRow({ slot, onDelete }: { slot: TimetableSlot; onDelete?: () => void }) {
  const { language } = useLanguage();
  const tint = useThemeColor({}, 'tint');
  const mutedColor = useThemeColor({}, 'muted');
  const dangerColor = useThemeColor({}, 'danger');

  return (
    <Card style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <SymbolView name="calendar" size={18} tintColor={tint} />
          <Text style={styles.subject}>{slot.subject}</Text>
        </View>
        {onDelete ? (
          <Pressable onPress={onDelete} hitSlop={10} style={styles.deleteButton}>
            <SymbolView name="trash" size={16} tintColor={dangerColor} />
          </Pressable>
        ) : null}
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
    gap: 3
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
    backgroundColor: 'transparent'
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'transparent'
  },
  deleteButton: {
    padding: 2
  },
  subject: {
    fontSize: 17,
    fontWeight: '700'
  },
  meta: {
    fontSize: 14
  }
});
