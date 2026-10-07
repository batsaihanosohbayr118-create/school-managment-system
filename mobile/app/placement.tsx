import { useCallback, useState } from 'react';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { Card } from '@/components/Card';
import { GradientHeaderButton, gradientHeaderItem } from '@/components/GradientHeaderButton';
import { OfflineBanner } from '@/components/OfflineBanner';
import { PlacementNotice } from '@/components/PlacementNotice';
import { LevelResultCard } from '@/components/PlacementLevel';
import { PlacementTeacherView } from '@/components/PlacementTeacher';
import { SkeletonList } from '@/components/Skeleton';
import { Text, View, useThemeColor } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { useApiData } from '@/lib/use-api';
import { ApiError } from '@shared/api-error';
import type { PlacementQuestion, PlacementResponse, PlacementResult } from '@shared/api-types';
import { ANSWER_LETTERS } from '@shared/placement';

/**
 * The English placement test. One screen, three audiences:
 * a student sits the test (once) and sees their level; a parent sees their
 * child's level; the English teacher sees every result and can reset one so
 * the student may retake it.
 */
export default function PlacementScreen() {
  const { data, error, loading, refetch, isOffline } = useApiData('placement', api.placement);
  const { session } = useAuth();
  const router = useRouter();
  const { t } = useLanguage();
  const dangerColor = useThemeColor({}, 'danger');
  const scheme = useColorScheme();
  const backdrop = BACKDROP[scheme === 'dark' ? 'dark' : 'light'];

  // Picks up questions the teacher just edited on another screen.
  useFocusEffect(
    useCallback(() => {
      refetch();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const backButton = <GradientHeaderButton icon="chevron-back" onPress={() => router.back()} accessibilityLabel={t.placement.back} />;

  // The header takes the gradient's top color, so bar and page read as one.
  const header = (
    <Stack.Screen
      options={{
        title: t.placement.title,
        headerShadowVisible: false,
        headerStyle: { backgroundColor: backdrop[0] },
        headerBackVisible: false,
        headerLeft: () => backButton,
        unstable_headerLeftItems: gradientHeaderItem(backButton),
        headerTitle: ''
      }}
    />
  );

  let body: React.ReactNode;
  if (loading) {
    body = <SkeletonList />;
  } else if (!data) {
    body = (
      <View style={[styles.center, styles.transparent]}>
        <Text style={{ color: dangerColor }}>{error?.message ?? t.common.loading}</Text>
      </View>
    );
  } else if (session?.role === 'teacher') {
    body = <PlacementTeacherView data={data} refetch={refetch} loading={loading} isOffline={isOffline} />;
  } else if (session?.role === 'parent') {
    body = <ParentView data={data} isOffline={isOffline} />;
  } else {
    body = <StudentView data={data} refetch={refetch} isOffline={isOffline} />;
  }

  return (
    <LinearGradient colors={backdrop} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.backdrop}>
      {header}
      {body}
    </LinearGradient>
  );
}

/** The page's soft blue → violet wash; the first color is also the header's. */
const BACKDROP: Record<'light' | 'dark', [string, string]> = {
  light: ['#e3ecff', '#f1e8ff'],
  dark: ['#141a42', '#2a1c5c']
};

function StudentView({ data, refetch, isOffline }: { data: PlacementResponse; refetch: () => void; isOffline: boolean }) {
  const { t } = useLanguage();
  const tint = useThemeColor({}, 'tint');
  const mutedColor = useThemeColor({}, 'muted');
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState<PlacementResult | null>(null);

  const result = finished ?? data.results[0] ?? null;

  if (!data.enrolled) {
    return <PlacementNotice icon="school" title={t.placement.notEnrolledTitle} body={t.placement.notEnrolled} />;
  }

  if (result) {
    return (
      <ScrollView contentContainerStyle={styles.content}>
        {isOffline ? <OfflineBanner /> : null}
        <LevelResultCard result={result} heading={t.placement.yourLevel} footnote={t.placement.retakeHint} />
      </ScrollView>
    );
  }

  if (data.questions.length === 0) {
    return <PlacementNotice icon="help" title={t.placement.noQuestionsTitle} body={t.placement.noQuestions} />;
  }

  if (started) {
    return (
      <TestRunner
        questions={data.questions}
        onFinished={(results) => {
          setFinished(results[0] ?? null);
          refetch();
        }}
      />
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      {isOffline ? <OfflineBanner /> : null}
      <Card style={styles.introCard}>
        <View style={[styles.introIcon, { backgroundColor: tint }]}>
          <Ionicons name="language" size={34} color="#fff" />
        </View>
        <Text style={styles.introTitle}>{t.placement.introTitle}</Text>
        <Text style={[styles.introCount, { color: tint }]}>
          {data.questions.length} {t.placement.questionsCount} · A1 → C1
        </Text>
        <Text style={[styles.introBody, { color: mutedColor }]}>{t.placement.introBody}</Text>
        <Pressable style={[styles.primaryButton, { backgroundColor: tint }]} onPress={() => setStarted(true)}>
          <Text style={styles.primaryButtonText}>{t.placement.start}</Text>
        </Pressable>
      </Card>
    </ScrollView>
  );
}

/** One question per page; answers are only sent — and graded — at the end. */
function TestRunner({ questions, onFinished }: { questions: PlacementQuestion[]; onFinished: (results: PlacementResult[]) => void }) {
  const { t } = useLanguage();
  const tint = useThemeColor({}, 'tint');
  const tintMuted = useThemeColor({}, 'tintMuted');
  const borderColor = useThemeColor({}, 'border');
  const trackColor = useThemeColor({}, 'border');
  const mutedColor = useThemeColor({}, 'muted');
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const question = questions[index];
  const isLast = index === questions.length - 1;
  const answeredCount = questions.filter((item) => answers[item.id]).length;

  async function submit() {
    setSubmitting(true);
    try {
      const response = await api.submitPlacement(answers);
      onFinished(response.results);
    } catch (err) {
      Alert.alert(err instanceof ApiError ? err.message : t.placement.submitFailed);
    } finally {
      setSubmitting(false);
    }
  }

  function confirmSubmit() {
    const unanswered = questions.length - answeredCount;
    Alert.alert(
      t.placement.confirmSubmitTitle,
      unanswered > 0 ? `${unanswered} ${t.placement.unanswered}. ${t.placement.confirmSubmitBody}` : undefined,
      [
        { text: t.placement.cancel, style: 'cancel' },
        { text: t.placement.submit, onPress: submit }
      ]
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.progressHeader}>
        <Text style={[styles.progressLabel, { color: mutedColor }]}>
          {t.placement.questionOf} {index + 1} / {questions.length}
        </Text>
      </View>
      <View style={[styles.progressTrack, { backgroundColor: trackColor }]}>
        <View style={[styles.progressFill, { backgroundColor: tint, width: `${((index + 1) / questions.length) * 100}%` }]} />
      </View>

      <Card style={styles.questionCard}>
        <Text style={styles.questionText}>{question.question}</Text>
      </Card>

      {question.options.map((option, optionIndex) => {
        const letter = ANSWER_LETTERS[optionIndex];
        const selected = answers[question.id] === letter;

        return (
          <Pressable
            key={letter}
            onPress={() => setAnswers((current) => ({ ...current, [question.id]: letter }))}
            disabled={submitting}
            style={({ pressed }) => [
              styles.option,
              { borderColor: selected ? tint : borderColor, backgroundColor: selected ? tintMuted : 'transparent' },
              pressed && styles.pressed
            ]}
          >
            <View style={[styles.optionLetter, { backgroundColor: selected ? tint : tintMuted }]}>
              <Text style={[styles.optionLetterText, { color: selected ? '#fff' : tint }]}>{letter}</Text>
            </View>
            <Text style={styles.optionText}>{option}</Text>
          </Pressable>
        );
      })}

      <View style={styles.navRow}>
        <Pressable
          style={[styles.secondaryButton, { borderColor }, index === 0 && styles.disabled]}
          onPress={() => setIndex((current) => current - 1)}
          disabled={index === 0 || submitting}
        >
          <Text style={styles.secondaryButtonText}>{t.placement.back}</Text>
        </Pressable>
        <Pressable
          style={[styles.primaryButton, styles.navPrimary, { backgroundColor: tint }, submitting && styles.disabled]}
          onPress={isLast ? confirmSubmit : () => setIndex((current) => current + 1)}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryButtonText}>{isLast ? t.placement.submit : t.placement.next}</Text>
          )}
        </Pressable>
      </View>
    </ScrollView>
  );
}

function ParentView({ data, isOffline }: { data: PlacementResponse; isOffline: boolean }) {
  const { t } = useLanguage();

  if (!data.enrolled) {
    return <PlacementNotice icon="school" title={t.placement.notEnrolledTitle} body={t.placement.notEnrolled} />;
  }

  const result = data.results[0];
  if (!result) {
    return <PlacementNotice icon="hourglass" title={t.placement.notTakenTitle} body={t.placement.notTakenParent} colors={['#f59e0b', '#ea580c']} />;
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      {isOffline ? <OfflineBanner /> : null}
      <LevelResultCard result={result} heading={`${result.student} · ${t.placement.childLevel}`} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1
  },
  transparent: {
    backgroundColor: 'transparent'
  },
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
  introCard: {
    alignItems: 'center',
    paddingVertical: 28,
    gap: 10
  },
  introIcon: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4
  },
  introTitle: {
    fontSize: 21,
    fontWeight: '800',
    textAlign: 'center'
  },
  introCount: {
    fontSize: 14,
    fontWeight: '700'
  },
  introBody: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    paddingHorizontal: 4
  },
  primaryButton: {
    marginTop: 10,
    paddingVertical: 14,
    paddingHorizontal: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16
  },
  progressHeader: {
    backgroundColor: 'transparent',
    marginBottom: 8
  },
  progressLabel: {
    fontSize: 13,
    fontWeight: '600'
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 16
  },
  progressFill: {
    height: 6,
    borderRadius: 3
  },
  questionCard: {
    paddingVertical: 22,
    marginBottom: 14
  },
  questionText: {
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 28
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 10
  },
  optionLetter: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center'
  },
  optionLetterText: {
    fontWeight: '800',
    fontSize: 15
  },
  optionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500'
  },
  pressed: {
    opacity: 0.7
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 10,
    backgroundColor: 'transparent'
  },
  navPrimary: {
    flex: 1,
    marginTop: 0
  },
  secondaryButton: {
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: 12,
    borderWidth: 1.5
  },
  secondaryButtonText: {
    fontWeight: '700',
    fontSize: 16
  },
  disabled: {
    opacity: 0.4
  }
});
