import { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { FlatList, StyleSheet } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { Card } from '@/components/Card';
import { Text, View, useThemeColor } from '@/components/Themed';
import { api } from '@/lib/api';
import { useApiData } from '@/lib/use-api';
import type { TimetableSlot } from '@shared/api-types';

export default function TimetableScreen() {
  const { data, error, loading, refetch } = useApiData(api.timetable);
  const dangerColor = useThemeColor({}, 'danger');
  const mutedColor = useThemeColor({}, 'muted');

  // Picks up a slot a teacher just added via /timetable-entry — that screen
  // doesn't know how to reach back into this one's state, so refetch instead.
  useFocusEffect(
    useCallback(() => {
      refetch();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

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
      data={data?.slots ?? []}
      keyExtractor={(slot) => slot.id}
      onRefresh={refetch}
      refreshing={loading}
      ListEmptyComponent={
        <View style={styles.center}>
          <Text style={{ color: mutedColor }}>No timetable slots yet.</Text>
        </View>
      }
      renderItem={({ item }) => <SlotRow slot={item} />}
    />
  );
}

function SlotRow({ slot }: { slot: TimetableSlot }) {
  const tint = useThemeColor({}, 'tint');
  const mutedColor = useThemeColor({}, 'muted');

  return (
    <Card style={styles.card}>
      <View style={styles.cardHeader}>
        <SymbolView name="calendar" size={18} tintColor={tint} />
        <Text style={styles.subject}>{slot.subject}</Text>
      </View>
      <Text style={[styles.meta, { color: mutedColor }]}>
        {slot.day} · {slot.timeLabel}
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
    gap: 8,
    marginBottom: 2
  },
  subject: {
    fontSize: 17,
    fontWeight: '700'
  },
  meta: {
    fontSize: 14
  }
});
