import { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Link } from 'expo-router';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { Text, View } from '@/components/Themed';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { useApiData } from '@/lib/use-api';
import type { GradeEntry, TimetableSlot } from '@shared/api-types';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const today = DAY_NAMES[new Date().getDay()];

export default function HomeScreen() {
  const { session } = useAuth();
  const isTeacher = session?.role === 'teacher';

  const timetable = useApiData(api.timetable);
  const grades = useApiData(api.grades);

  useFocusEffect(
    useCallback(() => {
      timetable.refetch();
      grades.refetch();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const todaysSlots = (timetable.data?.slots ?? [])
    .filter((slot) => slot.day === today)
    .sort((a, b) => (a.startsAt ?? '').localeCompare(b.startsAt ?? ''));

  // The server already returns newest-first (created_at desc); take the top 3.
  const latestGrades = (grades.data?.grades ?? []).slice(0, 3);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Home</Text>
      {session ? <Text style={styles.subtitle}>{session.name || session.email}</Text> : null}

      <Text style={styles.sectionTitle}>{isTeacher ? "Today's classes" : "Today's schedule"}</Text>
      {timetable.loading ? (
        <Text style={styles.muted}>Loading…</Text>
      ) : timetable.error ? (
        <Text style={styles.error}>{timetable.error.message}</Text>
      ) : todaysSlots.length === 0 ? (
        <Text style={styles.muted}>Nothing scheduled for {today}.</Text>
      ) : (
        todaysSlots.map((slot) => <TimetableRow key={slot.id} slot={slot} />)
      )}

      {!isTeacher && (
        <>
          <Text style={styles.sectionTitle}>Latest grades</Text>
          {grades.loading ? (
            <Text style={styles.muted}>Loading…</Text>
          ) : grades.error ? (
            <Text style={styles.error}>{grades.error.message}</Text>
          ) : latestGrades.length === 0 ? (
            <Text style={styles.muted}>No grades yet.</Text>
          ) : (
            latestGrades.map((grade) => <GradeRow key={grade.id} grade={grade} />)
          )}

          <Link href="/payments" asChild>
            <Pressable style={styles.paymentsLink}>
              <Text style={styles.paymentsLinkText}>View payments</Text>
            </Pressable>
          </Link>
        </>
      )}
    </ScrollView>
  );
}

function TimetableRow({ slot }: { slot: TimetableSlot }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowTitle}>{slot.subject}</Text>
      <Text style={styles.rowMeta}>
        {slot.timeLabel} · {slot.className}
      </Text>
    </View>
  );
}

function GradeRow({ grade }: { grade: GradeEntry }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowHeader}>
        <Text style={styles.rowTitle}>{grade.subject}</Text>
        <Text style={styles.score}>{grade.scoreLabel}</Text>
      </View>
      <Text style={styles.rowMeta}>
        {grade.student} · {grade.semester}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  content: {
    padding: 20,
    gap: 8
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold'
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.7
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    textTransform: 'uppercase',
    opacity: 0.6,
    marginTop: 24,
    marginBottom: 4
  },
  muted: {
    opacity: 0.6,
    paddingVertical: 8
  },
  error: {
    color: '#dc2626',
    paddingVertical: 8
  },
  row: {
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#8884'
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: '600'
  },
  rowMeta: {
    fontSize: 14,
    opacity: 0.7,
    marginTop: 2
  },
  score: {
    fontSize: 16,
    fontWeight: '700'
  },
  paymentsLink: {
    marginTop: 20,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#2563eb'
  },
  paymentsLinkText: {
    color: '#2563eb',
    fontWeight: '600',
    fontSize: 15
  }
});
