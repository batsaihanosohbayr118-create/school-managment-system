import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { FlatList, Pressable, RefreshControl, StyleSheet, useWindowDimensions } from 'react-native';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';

import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { OfflineBanner } from '@/components/OfflineBanner';
import { SearchBar } from '@/components/SearchBar';
import { SkeletonList } from '@/components/Skeleton';
import { Text, View, useThemeColor } from '@/components/Themed';
import { api } from '@/lib/api';
import { useLanguage } from '@/lib/language-context';
import { useAuth } from '@/lib/auth-context';
import { accentForSubjectName, iconForSubjectName } from '@/lib/subject-visual';
import { useApiData } from '@/lib/use-api';
import { translateValue } from '@shared/i18n-tables';
import type { SubjectEntry } from '@shared/api-types';

export default function SubjectsScreen() {
  const { data, error, loading, refetch, isOffline } = useApiData('subjects', api.subjects);
  const { language, t } = useLanguage();
  const { session } = useAuth();
  const [query, setQuery] = useState('');
  const dangerColor = useThemeColor({}, 'danger');
  const tint = useThemeColor({}, 'tint');
  // Students and parents browse read-only, so subjects page sideways instead
  // of stacking; teachers keep the stacked list, since they also need the
  // full-width "Add content" row at the bottom of each card. Cards stay full
  // width — one subject per page — rather than shrinking to fit several on
  // screen.
  const isReadOnlyViewer = session?.role === 'student' || session?.role === 'parent';
  const { width: windowWidth } = useWindowDimensions();
  const horizontalCardWidth = windowWidth - styles.container.paddingHorizontal * 2;

  useFocusEffect(
    useCallback(() => {
      refetch();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const subjects = data?.subjects ?? [];
  const filteredSubjects = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return subjects;
    return subjects.filter((subject) => {
      const haystack = [
        subject.name,
        translateValue(subject.name, language),
        subject.category,
        subject.category ? translateValue(subject.category, language) : '',
        subject.teacher
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(needle);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjects, query, language]);

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
    <View style={styles.container}>
      {isOffline ? <OfflineBanner /> : null}
      {subjects.length > 0 ? (
        <SearchBar value={query} onChangeText={setQuery} placeholder={t.common.searchSubjects} />
      ) : null}

      <FlatList
        style={styles.flex}
        contentContainerStyle={isReadOnlyViewer ? styles.contentHorizontal : styles.content}
        data={filteredSubjects}
        keyExtractor={(subject) => subject.id}
        horizontal={isReadOnlyViewer}
        showsHorizontalScrollIndicator={false}
        pagingEnabled={isReadOnlyViewer}
        snapToInterval={isReadOnlyViewer ? horizontalCardWidth + 16 : undefined}
        decelerationRate={isReadOnlyViewer ? 'fast' : undefined}
        refreshControl={isReadOnlyViewer ? undefined : <RefreshControl refreshing={loading} onRefresh={refetch} tintColor={tint} colors={[tint]} />}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <EmptyState
            icon="book-outline"
            label={query ? t.common.noSubjectsMatchSearch : t.common.noSubjectsYet}
          />
        }
        renderItem={({ item }) =>
          isReadOnlyViewer ? (
            <View style={[styles.horizontalCard, { width: horizontalCardWidth }]}>
              <SubjectRow subject={item} />
            </View>
          ) : (
            <SubjectRow subject={item} />
          )
        }
      />
    </View>
  );
}

type CategoryAccent = 'tint' | 'purple' | 'success' | 'warning';

function SubjectRow({ subject }: { subject: SubjectEntry }) {
  const { language, t } = useLanguage();
  const { session } = useAuth();
  const router = useRouter();
  // By the subject's own name, not the row's index — the same subject must
  // look the same everywhere it appears (e.g. also on the grades tab).
  const accent = accentForSubjectName(subject.name);
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
              {iconForSubjectName(subject.name, subject.category) === 'calculator' ? (
                <FontAwesome5 name="calculator" size={24} color={accentColor} />
              ) : (
                <Ionicons name={iconForSubjectName(subject.name, subject.category)} size={24} color={accentColor} />
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
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16
  },
  flex: {
    flex: 1
  },
  content: {
    paddingBottom: 16
  },
  contentHorizontal: {
    paddingBottom: 16,
    paddingRight: 4,
    alignItems: 'flex-start'
  },
  horizontalCard: {
    marginRight: 16
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
