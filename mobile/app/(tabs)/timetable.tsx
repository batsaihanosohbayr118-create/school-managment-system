import { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { FlatList, StyleSheet } from 'react-native';

import { Text, View } from '@/components/Themed';
import { api } from '@/lib/api';
import { useApiData } from '@/lib/use-api';
import type { TimetableSlot } from '@shared/api-types';

export default function TimetableScreen() {
  const { data, error, loading, refetch } = useApiData(api.timetable);

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
      data={data?.slots ?? []}
      keyExtractor={(slot) => slot.id}
      onRefresh={refetch}
      refreshing={loading}
      ListEmptyComponent={
        <View style={styles.center}>
          <Text>No timetable slots yet.</Text>
        </View>
      }
      renderItem={({ item }) => <SlotRow slot={item} />}
    />
  );
}

function SlotRow({ slot }: { slot: TimetableSlot }) {
  return (
    <View style={styles.row}>
      <Text style={styles.subject}>{slot.subject}</Text>
      <Text style={styles.meta}>
        {slot.day} · {slot.timeLabel}
      </Text>
      <Text style={styles.meta}>
        {slot.teacher} · {slot.className}
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
  subject: {
    fontSize: 17,
    fontWeight: '600'
  },
  meta: {
    fontSize: 14,
    opacity: 0.7,
    marginTop: 2
  }
});
