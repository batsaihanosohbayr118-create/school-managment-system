import { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { FlatList, RefreshControl, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Badge } from '@/components/Badge';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { OfflineBanner } from '@/components/OfflineBanner';
import { SkeletonList } from '@/components/Skeleton';
import { Text, View, useThemeColor } from '@/components/Themed';
import { api } from '@/lib/api';
import { useLanguage } from '@/lib/language-context';
import { useApiData } from '@/lib/use-api';
import { translateValue } from '@shared/i18n-tables';
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
      renderItem={({ item, index }) => <SubjectRow subject={item} index={index} />}
    />
  );
}

/** Cycles subjects through the app's accent palette so the list reads as a set of cards, not a flat table. */
const ACCENTS = ['tint', 'purple', 'pink', 'success', 'warning'] as const;

function accentFor(index: number) {
  return ACCENTS[index % ACCENTS.length];
}

/**
 * Loose keyword match against name + category (English from the catalog, but
 * an admin can type anything, Mongolian included) — same approach as
 * Badge.tsx's audienceTone. Order matters: "Social Science" and "Computer
 * Science" both contain "science", so those compound categories must be
 * checked before the plain science/physics pattern or they'd falsely match
 * it. Falls through to a plain book for anything unrecognized rather than
 * guessing wrong.
 */
const SUBJECT_ICONS: [RegExp, keyof typeof Ionicons.glyphMap][] = [
  [/math|calc|тоо|математик/, 'calculator'],
  [/social|history|geography|civic|нийгм|түүх|газар зүй/, 'earth'],
  [/computer|programming|мэдээлэл/, 'laptop'],
  [/english|language|literature|хэл/, 'language'],
  [/physic|chemistry|biology|science|хими|физик|биологи|шинжлэх/, 'flask'],
  [/art|drawing|дүрслэх/, 'color-palette'],
  [/music|хөгжим/, 'musical-notes'],
  [/(physical education|sport|fitness|биеийн тамир)/, 'basketball']
];

function iconForSubject(subject: SubjectEntry): keyof typeof Ionicons.glyphMap {
  const haystack = `${subject.name} ${subject.category}`.toLowerCase();
  return SUBJECT_ICONS.find(([pattern]) => pattern.test(haystack))?.[1] ?? 'book';
}

function SubjectRow({ subject, index }: { subject: SubjectEntry; index: number }) {
  const { language } = useLanguage();
  const accent = accentFor(index);
  const accentColor = useThemeColor({}, accent);
  const accentMuted = useThemeColor({}, `${accent}Muted` as const);
  const mutedColor = useThemeColor({}, 'muted');
  const borderColor = useThemeColor({}, 'border');

  return (
    <Card style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={[styles.icon, { backgroundColor: accentMuted }]}>
          <Ionicons name={iconForSubject(subject)} size={18} color={accentColor} />
        </View>
        <View style={styles.titleGroup}>
          <Text style={styles.name} numberOfLines={1}>
            {translateValue(subject.name, language)}
          </Text>
          {subject.teacher ? (
            <Text style={[styles.teacher, { color: mutedColor }]} numberOfLines={1}>
              {subject.teacher}
            </Text>
          ) : null}
        </View>
        {subject.code ? (
          <Text style={[styles.code, { color: accentColor, backgroundColor: accentMuted }]}>{subject.code}</Text>
        ) : null}
      </View>

      {subject.category || subject.gradeLevels ? (
        <View style={[styles.tagRow, { borderTopColor: borderColor }]}>
          {subject.category ? <Badge label={translateValue(subject.category, language)} tone={accent} /> : null}
          {subject.gradeLevels ? <Badge label={translateValue(subject.gradeLevels, language)} tone="neutral" /> : null}
        </View>
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
    gap: 0,
    marginBottom: 10
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    backgroundColor: 'transparent'
  },
  icon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  titleGroup: {
    flex: 1,
    minWidth: 0,
    gap: 2,
    backgroundColor: 'transparent'
  },
  name: {
    fontSize: 16,
    fontWeight: '700'
  },
  teacher: {
    fontSize: 13,
    fontWeight: '500'
  },
  code: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth, 
    backgroundColor: 'transparent'
  }
});
