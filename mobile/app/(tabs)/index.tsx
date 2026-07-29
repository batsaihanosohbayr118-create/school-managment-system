import { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Link } from 'expo-router';
import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { SymbolView } from 'expo-symbols';
import type { SFSymbol } from 'sf-symbols-typescript';

import { Card } from '@/components/Card';
import { Text, View, useThemeColor } from '@/components/Themed';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { useApiData } from '@/lib/use-api';
import type { GradeEntry, TimetableSlot } from '@shared/api-types';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const today = DAY_NAMES[new Date().getDay()];

export default function HomeScreen() {
  const { session } = useAuth();
  const isTeacher = session?.role === 'teacher';
  const mutedColor = useThemeColor({}, 'muted');
  const dangerColor = useThemeColor({}, 'danger');
  const tint = useThemeColor({}, 'tint');

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
      {session ? <Text style={[styles.subtitle, { color: mutedColor }]}>{session.name || session.email}</Text> : null}

      <SectionHeader icon="calendar" label={isTeacher ? "Today's classes" : "Today's schedule"} />
      {timetable.loading ? (
        <Text style={{ color: mutedColor }}>Loading…</Text>
      ) : timetable.error ? (
        <Text style={{ color: dangerColor }}>{timetable.error.message}</Text>
      ) : todaysSlots.length === 0 ? (
        <Text style={{ color: mutedColor }}>Nothing scheduled for {today}.</Text>
      ) : (
        todaysSlots.map((slot) => <TimetableRow key={slot.id} slot={slot} />)
      )}

      {!isTeacher && (
        <>
          <SectionHeader icon="chart.bar.fill" label="Latest grades" />
          {grades.loading ? (
            <Text style={{ color: mutedColor }}>Loading…</Text>
          ) : grades.error ? (
            <Text style={{ color: dangerColor }}>{grades.error.message}</Text>
          ) : latestGrades.length === 0 ? (
            <Text style={{ color: mutedColor }}>No grades yet.</Text>
          ) : (
            latestGrades.map((grade) => <GradeRow key={grade.id} grade={grade} />)
          )}

          <Link href="/payments" asChild>
            <Pressable style={[styles.paymentsLink, { borderColor: tint }]}>
              {({ pressed }) => (
                <View style={[styles.paymentsLinkInner, pressed && { opacity: 0.6 }]}>
                  <SymbolView name="creditcard" size={18} tintColor={tint} />
                  <Text style={[styles.paymentsLinkText, { color: tint }]}>View payments</Text>
                </View>
              )}
            </Pressable>
          </Link>
        </>
      )}
    </ScrollView>
  );
}

function SectionHeader({ icon, label }: { icon: SFSymbol; label: string }) {
  const mutedColor = useThemeColor({}, 'muted');
  return (
    <View style={styles.sectionHeader}>
      <SymbolView name={icon} size={13} tintColor={mutedColor} />
      <Text style={[styles.sectionTitle, { color: mutedColor }]}>{label}</Text>
    </View>
  );
}

function TimetableRow({ slot }: { slot: TimetableSlot }) {
  const mutedColor = useThemeColor({}, 'muted');
  return (
    <Card style={styles.card}>
      <Text style={styles.rowTitle}>{slot.subject}</Text>
      <Text style={[styles.rowMeta, { color: mutedColor }]}>
        {slot.timeLabel} · {slot.className}
      </Text>
    </Card>
  );
}

function GradeRow({ grade }: { grade: GradeEntry }) {
  const mutedColor = useThemeColor({}, 'muted');
  const tint = useThemeColor({}, 'tint');
  return (
    <Card style={styles.card}>
      <View style={styles.rowHeader}>
        <Text style={styles.rowTitle}>{grade.subject}</Text>
        <Text style={[styles.score, { color: tint }]}>{grade.scoreLabel}</Text>
      </View>
      <Text style={[styles.rowMeta, { color: mutedColor }]}>
        {grade.student} · {grade.semester}
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
  title: {
    fontSize: 28,
    fontWeight: 'bold'
  },
  subtitle: {
    fontSize: 16,
    marginTop: 2
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 26,
    marginBottom: 8
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  card: {
    gap: 3
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: '700'
  },
  rowMeta: {
    fontSize: 14
  },
  score: {
    fontSize: 18,
    fontWeight: '800'
  },
  paymentsLink: {
    marginTop: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5
  },
  paymentsLinkInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8
  },
  paymentsLinkText: {
    fontWeight: '700',
    fontSize: 15
  }
});
