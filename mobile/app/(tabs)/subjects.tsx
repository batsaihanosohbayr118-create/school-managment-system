import { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { FlatList, Pressable, RefreshControl, StyleSheet } from 'react-native';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';

import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { OfflineBanner } from '@/components/OfflineBanner';
import { SkeletonList } from '@/components/Skeleton';
import { Text, View, useThemeColor } from '@/components/Themed';
import { api } from '@/lib/api';
import { useLanguage } from '@/lib/language-context';
import { useAuth } from '@/lib/auth-context';
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

type CategoryAccent = 'tint' | 'purple' | 'success' | 'warning';

function iconForSubject(subject: SubjectEntry): keyof typeof Ionicons.glyphMap {
  const haystack = `${subject.name} ${subject.category}`.toLowerCase();
  return SUBJECT_ICONS.find(([pattern]) => pattern.test(haystack))?.[1] ?? 'book';
}

function SubjectRow({ subject, index }: { subject: SubjectEntry; index: number }) {
  const { language, t } = useLanguage();
  const { session } = useAuth();
  const router = useRouter();
  const accent = accentFor(index);
  const accentColor = useThemeColor({}, accent);
  const accentMuted = useThemeColor({}, `${accent}Muted` as const);
  const categoryColors = {
    tint: { color: useThemeColor({}, 'tint'), muted: useThemeColor({}, 'tintMuted') },
    purple: { color: useThemeColor({}, 'purple'), muted: useThemeColor({}, 'purpleMuted') },
    success: { color: useThemeColor({}, 'success'), muted: useThemeColor({}, 'successMuted') },
    warning: { color: useThemeColor({}, 'warning'), muted: useThemeColor({}, 'warningMuted') }
  };
  const mutedColor = useThemeColor({}, 'muted');
  const borderColor = useThemeColor({}, 'border');
  const cardAltColor = useThemeColor({}, 'cardAlt');

  const subjectName = translateValue(subject.name, language);
  const categories: {
    icon: keyof typeof Ionicons.glyphMap;
    bgIcon: keyof typeof Ionicons.glyphMap;
    title: string;
    subtitle: string;
    category: 'topic' | 'lesson' | 'video' | 'assignment';
    accent: CategoryAccent;
  }[] = [
    { icon: 'list', bgIcon: 'list', title: t.subjectContent.categoryLabels.topic, subtitle: t.subjectContent.categorySubtitles.topic, category: 'topic', accent: 'tint' },
    { icon: 'book', bgIcon: 'book', title: t.subjectContent.categoryLabels.lesson, subtitle: t.subjectContent.categorySubtitles.lesson, category: 'lesson', accent: 'purple' },
    { icon: 'videocam', bgIcon: 'play', title: t.subjectContent.categoryLabels.video, subtitle: t.subjectContent.categorySubtitles.video, category: 'video', accent: 'success' },
    { icon: 'clipboard', bgIcon: 'checkmark-done', title: t.subjectContent.categoryLabels.assignment, subtitle: t.subjectContent.categorySubtitles.assignment, category: 'assignment', accent: 'warning' }
  ];

  return (
      <View style={styles.subjectPressable}>
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.icon, { backgroundColor: accentMuted }]}> 
              {iconForSubject(subject) === 'calculator' ? (
                <FontAwesome5 name="calculator" size={24} color={accentColor} />
              ) : (
                <Ionicons name={iconForSubject(subject)} size={24} color={accentColor} />
              )}
            </View>
            <View style={styles.titleGroup}>
              <Text style={styles.name} numberOfLines={1}>
                {subjectName}
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
            <View style={[styles.tagRow, { borderBottomColor: borderColor }]}>
              {subject.category ? (
                <View style={[styles.subjectTag, styles.primarySubjectTag, { backgroundColor: accentColor }]}> 
                  <Ionicons name="school" size={14} color="#fff" />
                  <Text style={styles.primarySubjectTagText}>{translateValue(subject.category, language)}</Text>
                </View>
              ) : null}
              {subject.gradeLevels ? (
                <View style={[styles.subjectTag, { backgroundColor: accentMuted }]}> 
                  <Ionicons name="time-outline" size={14} color={mutedColor} />
                  <Text style={[styles.subjectTagText, { color: mutedColor }]}>{translateValue(subject.gradeLevels, language)}</Text>
                </View>
              ) : null}
            </View>
          ) : null}

          <View style={[styles.categoryGrid, { backgroundColor: cardAltColor }]}>
            {categories.map((category) => (
              <Pressable
                key={category.category}
                onPress={(event) => {
                  event.stopPropagation();
                  router.push({ pathname: '/subject-content', params: { id: subject.id, name: subjectName, category: category.category } });
                }}
                style={[styles.categoryCard, { backgroundColor: categoryColors[category.accent].muted, borderColor }]}
              >
                <Ionicons
                  name={category.bgIcon}
                  size={78}
                  color={categoryColors[category.accent].color}
                  style={styles.categoryBgIcon}
                />
                <View style={[styles.categoryIcon, { backgroundColor: categoryColors[category.accent].color }]}>
                  {category.category === 'assignment' ? (
                    <FontAwesome5 name="clipboard-check" size={21} color="#fff" />
                  ) : (
                    <Ionicons name={category.icon} size={21} color="#fff" />
                  )}
                </View>
                <Text style={styles.categoryTitle} numberOfLines={2}>{category.title}</Text>
                <Text style={[styles.categorySubtitle, { color: mutedColor }]} numberOfLines={2}>{category.subtitle}</Text>
                <Ionicons name="chevron-forward" size={18} color={categoryColors[category.accent].color} style={styles.categoryArrow} />
              </Pressable>
            ))}
          </View>

          {session?.role === 'teacher' ? (
            <Pressable
              onPress={(event) => {
                event.stopPropagation();
                router.push({ pathname: '/subject-add', params: { id: subject.id, name: subjectName, mode: 'menu' } });
              }}
              style={styles.addContentButton}
            >
                <Ionicons name="add-circle-outline" size={21} color="#fff" />
              <Text style={styles.addContentButtonText}>{t.subjectContent.addContent}</Text>
                <Ionicons name="arrow-forward" size={21} color="#fff" />
            </Pressable>
          ) : null}
        </Card>
      </View>
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
    marginBottom: 10,
    padding: 14,
    borderRadius: 18
  },
  subjectPressable: {
    marginBottom: 0
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    // Not a plain `gap` + fixed-width combo: with only 2 items per row, any
    // width under 50% leaves the leftover space (100% - 2×width) sitting
    // entirely after the second card, not split — a visibly lopsided right
    // margin. `space-between` with a `width` of exactly half instead pins
    // card 1 to the left edge and card 2 to the right edge, so both sides
    // match by construction; `rowGap` alone (not `gap`, which would also
    // add unwanted horizontal columnGap on top of the space-between) spaces
    // the two rows apart.
    justifyContent: 'space-between',
    rowGap: 10,
    marginTop: 14,
    padding: 10,
    borderRadius: 14
  },
  categoryCard: {
    width: '48%',
    minHeight: 148,
    padding: 14,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#d9dee8',
    justifyContent: 'flex-start',
    position: 'relative',
    overflow: 'hidden'
  },
  categoryBgIcon: {
    position: 'absolute',
    right: -16,
    bottom: -16,
    opacity: 0.16,
    transform: [{ rotate: '-10deg' }]
  },
  categoryIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '800'
  },
  categorySubtitle: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
    lineHeight: 16,
    paddingRight: 6
  },
  categoryArrow: {
    position: 'absolute',
    top: 14,
    right: 14
  },
  addContentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#2563eb'
  },
  addContentButtonText: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
    fontWeight: '700'
  },
  pressed: {
    opacity: 0.7
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    backgroundColor: 'transparent'
  },
  icon: {
    width: 56,
    height: 56,
    borderRadius: 16,
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
    fontSize: 18,
    fontWeight: '800'
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
    gap: 8,
    marginTop: 10,
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    backgroundColor: 'transparent'
  },
  subjectTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999
  },
  primarySubjectTag: {
    paddingHorizontal: 13
  },
  primarySubjectTagText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700'
  },
  subjectTagText: {
    fontSize: 13,
    fontWeight: '700'
  }
});
