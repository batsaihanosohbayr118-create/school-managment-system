import { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { FlatList, StyleSheet } from 'react-native';

import { Badge, statusTone } from '@/components/Badge';
import { Card } from '@/components/Card';
import { OfflineBanner } from '@/components/OfflineBanner';
import { Text, View, useThemeColor } from '@/components/Themed';
import { api } from '@/lib/api';
import { useLanguage } from '@/lib/language-context';
import { useApiData } from '@/lib/use-api';
import { translateValue } from '@shared/i18n-tables';
import type { AttendanceEntry } from '@shared/api-types';

export default function AttendanceScreen() {
  const { data, error, loading, refetch, isOffline } = useApiData('attendance', api.attendance);
  const { t } = useLanguage();
  const dangerColor = useThemeColor({}, 'danger');
  const mutedColor = useThemeColor({}, 'muted');

  // Picks up a row a teacher just added via /attendance-entry — that screen
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
      data={data?.entries ?? []}
      keyExtractor={(entry) => entry.id}
      onRefresh={refetch}
      refreshing={loading}
      ListHeaderComponent={isOffline ? <OfflineBanner /> : null}
      ListEmptyComponent={
        <View style={styles.center}>
          <Text style={{ color: mutedColor }}>{t.common.noAttendanceRecordsYet}</Text>
        </View>
      }
      renderItem={({ item }) => <AttendanceRow entry={item} />}
    />
  );
}

function AttendanceRow({ entry }: { entry: AttendanceEntry }) {
  const { language } = useLanguage();
  const mutedColor = useThemeColor({}, 'muted');

  return (
    <Card style={styles.card}>
      <View style={styles.rowHeader}>
        <Text style={styles.subject}>{entry.subject}</Text>
        <Badge label={translateValue(entry.status, language)} tone={statusTone(entry.status)} />
      </View>
      <Text style={[styles.meta, { color: mutedColor }]}>
        {entry.student} · {entry.date}
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
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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