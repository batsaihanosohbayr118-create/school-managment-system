import { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { FlatList, RefreshControl, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { OfflineBanner } from '@/components/OfflineBanner';
import { SkeletonList } from '@/components/Skeleton';
import { Text, View, useThemeColor } from '@/components/Themed';
import { api } from '@/lib/api';
import { useLanguage } from '@/lib/language-context';
import { useApiData } from '@/lib/use-api';
import type { SubjectEntry } from '@shared/api-types';

export default function SubjectsScreen() {
  const { data, error, loading, refetch, isOffline } = useApiData('subjects', api.subjects);
  const { t } = useLanguage();
  const dangerColor = useThemeColor({}, 'danger');
  const tint = useThemeColor({}, 'tint');

  useFocusEffect(
    useCallback(() => {
      refetch();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

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
      data={data?.subjects ?? []}
      keyExtractor={(subject) => subject.id}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor={tint} colors={[tint]} />}
      ListHeaderComponent={isOffline ? <OfflineBanner /> : null}
      ListEmptyComponent={<EmptyState icon="book-outline" label={t.common.noSubjectsYet} />}
      renderItem={({ item }) => <SubjectRow subject={item} />}
    />
  );
}

function SubjectRow({ subject }: { subject: SubjectEntry }) {
  const tint = useThemeColor({}, 'tint');
  const mutedColor = useThemeColor({}, 'muted');

  return (
    <Card style={styles.card}>
      <View style={styles.cardHeader}>
        <Ionicons name="book" size={18} color={tint} />
        <Text style={styles.name}>{subject.name}</Text>
        {subject.code ? <Text style={[styles.code, { color: mutedColor }]}>{subject.code}</Text> : null}
      </View>
      {subject.teacher ? (
        <Text style={[styles.meta, { color: mutedColor }]}>{subject.teacher}</Text>
      ) : null}
      {subject.category || subject.gradeLevels ? (
        <Text style={[styles.meta, { color: mutedColor }]}>
          {[subject.category, subject.gradeLevels].filter(Boolean).join(' · ')}
        </Text>
      ) : null}
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
  name: {
    fontSize: 17,
    fontWeight: '700',
    flexShrink: 1
  },
  code: {
    fontSize: 13,
    fontWeight: '600'
  },
  meta: {
    fontSize: 14
  }
});
