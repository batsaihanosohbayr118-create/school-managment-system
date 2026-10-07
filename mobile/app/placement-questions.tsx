import { useCallback } from 'react';
import { Link, Stack, useFocusEffect } from 'expo-router';
import { Pressable, RefreshControl, SectionList, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { LevelPill } from '@/components/PlacementLevel';
import { SkeletonList } from '@/components/Skeleton';
import { Text, View, useThemeColor } from '@/components/Themed';
import { api } from '@/lib/api';
import { useLanguage } from '@/lib/language-context';
import { useApiData } from '@/lib/use-api';
import { ANSWER_LETTERS, CEFR_LEVELS } from '@shared/placement';

/** The English teacher's question list, grouped by level. Tap to edit. */
export default function PlacementQuestionsScreen() {
  const { data, error, loading, refetch } = useApiData('placement', api.placement);
  const { t } = useLanguage();
  const tint = useThemeColor({}, 'tint');
  const tintMuted = useThemeColor({}, 'tintMuted');
  const mutedColor = useThemeColor({}, 'muted');
  const successColor = useThemeColor({}, 'success');
  const dangerColor = useThemeColor({}, 'danger');

  useFocusEffect(
    useCallback(() => {
      refetch();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const header = (
    <Stack.Screen
      options={{
        title: t.placement.questions,
        headerRight: () => (
          <Link href="/placement-question-edit" asChild>
            <Pressable
              style={StyleSheet.flatten([styles.addButton, { backgroundColor: tintMuted }])}
              accessibilityLabel={t.placement.addQuestion}
            >
              <Ionicons name="add" size={20} color={tint} />
            </Pressable>
          </Link>
        )
      }}
    />
  );

  if (loading) {
    return (
      <>
        {header}
        <SkeletonList />
      </>
    );
  }

  if (error && !data) {
    return (
      <View style={styles.center}>
        {header}
        <Text style={{ color: dangerColor }}>{error.message}</Text>
      </View>
    );
  }

  const questions = data?.questions ?? [];
  const sections = CEFR_LEVELS.map((level) => ({
    level,
    data: questions.filter((question) => question.level === level)
  })).filter((section) => section.data.length > 0);

  return (
    <>
      {header}
      <SectionList
        contentContainerStyle={styles.content}
        sections={sections}
        keyExtractor={(question) => question.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor={tint} colors={[tint]} />}
        stickySectionHeadersEnabled={false}
        ListEmptyComponent={<EmptyState icon="help-circle-outline" label={t.placement.noQuestions} />}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <LevelPill level={section.level} />
            <Text style={[styles.sectionName, { color: mutedColor }]}>
              {t.placement.levels[section.level].name} · {section.data.length}
            </Text>
          </View>
        )}
        renderItem={({ item }) => {
          const answerIndex = ANSWER_LETTERS.indexOf((item.answer ?? '') as (typeof ANSWER_LETTERS)[number]);

          return (
            <Link href={{ pathname: '/placement-question-edit', params: { id: item.id } }} asChild>
              <Pressable>
                {({ pressed }) => (
                  <Card style={[styles.card, pressed && styles.pressed]}>
                    <Text style={styles.question}>{item.question}</Text>
                    <View style={styles.answerRow}>
                      <Ionicons name="checkmark-circle" size={15} color={successColor} />
                      <Text style={[styles.answer, { color: mutedColor }]} numberOfLines={1}>
                        {item.answer}. {answerIndex >= 0 ? item.options[answerIndex] : ''}
                      </Text>
                    </View>
                  </Card>
                )}
              </Pressable>
            </Link>
          );
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20
  },
  content: {
    padding: 16,
    paddingBottom: 48
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center'
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
    marginBottom: 8,
    backgroundColor: 'transparent'
  },
  sectionName: {
    fontSize: 14,
    fontWeight: '700'
  },
  card: {
    gap: 6
  },
  pressed: {
    opacity: 0.7
  },
  question: {
    fontSize: 16,
    fontWeight: '600'
  },
  answerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'transparent'
  },
  answer: {
    fontSize: 13,
    flexShrink: 1
  }
});
