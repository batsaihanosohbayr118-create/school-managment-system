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
import type { GradeEntry } from '@shared/api-types';

export default function GradesScreen() {
  const { data, error, loading, refetch, isOffline } = useApiData('grades', api.grades);
  const { session } = useAuth();
  const { t } = useLanguage();
  const dangerColor = useThemeColor({}, 'danger');
  const mutedColor = useThemeColor({}, 'muted');
  const isTeacher = session?.role === 'teacher';

  // Picks up a row a teacher just added via /grade-entry — that screen
  // doesn't know how to reach back into this one's state, so refetch instead.
  useFocusEffect(
    useCallback(() => {
      refetch();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  function confirmDelete(grade: GradeEntry) {
    Alert.alert(t.common.deleteRecord, t.common.deleteWarning(`${grade.student} · ${grade.subject}`), [
      { text: t.common.cancel, style: 'cancel' },
      {
        text: t.common.delete,
        style: 'destructive',
        onPress: async () => {
          try {
            await api.deleteGrade(grade.id);
            refetch();
          } catch {
            Alert.alert(t.common.deleteFailed);
          }
        }
      }
    ]);
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
      data={data?.grades ?? []}
      keyExtractor={(grade) => grade.id}
      onRefresh={refetch}
      refreshing={loading}
      ListHeaderComponent={isOffline ? <OfflineBanner /> : null}
      ListEmptyComponent={
        <View style={styles.center}>
          <Text style={{ color: mutedColor }}>{t.common.noGradesYet}</Text>
        </View>
      }
      renderItem={({ item }) => <GradeRow grade={item} onDelete={isTeacher ? () => confirmDelete(item) : undefined} />}
    />
  );
}

function GradeRow({ grade, onDelete }: { grade: GradeEntry; onDelete?: () => void }) {
  const mutedColor = useThemeColor({}, 'muted');
  const tint = useThemeColor({}, 'tint');
  const successColor = useThemeColor({}, 'success');
  const warningColor = useThemeColor({}, 'warning');
  const dangerColor = useThemeColor({}, 'danger');
  const scoreColor = gradeColor(grade.score, { successColor, warningColor, dangerColor });

  return (
    <Card style={styles.card}>
      <View style={styles.rowHeader}>
        <Text style={styles.subject}>{grade.subject}</Text>
        <View style={styles.rowActions}>
          <Text style={[styles.score, { color: scoreColor ?? tint }]}>{grade.scoreLabel}</Text>
          {onDelete ? (
            <Pressable onPress={onDelete} hitSlop={10} style={styles.deleteButton}>
              <SymbolView name="trash" size={16} tintColor={dangerColor} />
            </Pressable>
          ) : null}
        </View>
      </View>
      <Text style={[styles.meta, { color: mutedColor }]}>
        {grade.student} · {grade.semester}
      </Text>
    </Card>
  );
}

/** null defers to the tint color — used when the score can't be parsed. */
function gradeColor(
  score: number | null,
  tones: { successColor: string; warningColor: string; dangerColor: string }
): string | null {
  if (score === null) return null;
  if (score >= 80) return tones.successColor;
  if (score >= 60) return tones.warningColor;
  return tones.dangerColor;
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
  rowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
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
  },
  score: {
    fontSize: 20,
    fontWeight: '800'
  }
});
