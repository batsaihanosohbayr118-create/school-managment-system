import { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Link } from 'expo-router';
import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { SymbolView } from 'expo-symbols';
import type { SFSymbol } from 'sf-symbols-typescript';

import { Card } from '@/components/Card';
import { OfflineBanner } from '@/components/OfflineBanner';
import { Text, View, useThemeColor } from '@/components/Themed';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { useLanguage } from '@/lib/language-context';
import { useApiData } from '@/lib/use-api';
import { normalizeDayName, translateValue } from '@shared/i18n-tables';
import type { GradeEntry, TimetableSlot } from '@shared/api-types';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const today = DAY_NAMES[new Date().getDay()];

export default function HomeScreen() {
  const { session } = useAuth();
  const isTeacher = session?.role === 'teacher';
  const { language, t } = useLanguage();
  const mutedColor = useThemeColor({}, 'muted');
  const dangerColor = useThemeColor({}, 'danger');
  const tint = useThemeColor({}, 'tint');
  const tintMuted = useThemeColor({}, 'tintMuted');

  const timetable = useApiData('timetable', api.timetable);
  const grades = useApiData('grades', api.grades);

  useFocusEffect(
    useCallback(() => {
      timetable.refetch();
      grades.refetch();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const todaysSlots = (timetable.data?.slots ?? [])
    .filter((slot) => normalizeDayName(slot.day) === today)
    .sort((a, b) => (a.startsAt ?? '').localeCompare(b.startsAt ?? ''));

  // The server already returns newest-first (created_at desc); take the top 3.
  const latestGrades = (grades.data?.grades ?? []).slice(0, 3);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {(timetable.isOffline || grades.isOffline) ? <OfflineBanner /> : null}

      <SectionHeader icon="calendar" label={isTeacher ? t.common.todaysClasses : t.common.todaysSchedule} />
      {timetable.loading ? (
        <Text style={{ color: mutedColor }}>{t.common.loading}</Text>
      ) : timetable.error && !timetable.isOffline ? (
        <Text style={{ color: dangerColor }}>{timetable.error.message}</Text>
      ) : todaysSlots.length === 0 ? (
        <Text style={{ color: mutedColor }}>{t.common.nothingScheduledFor(translateValue(today, language))}</Text>
      ) : (
        todaysSlots.map((slot) => <TimetableRow key={slot.id} slot={slot} />)
      )}

      {!isTeacher && (
        <>
          <SectionHeader icon="chart.bar.fill" label={t.common.latestGrades} />
          {grades.loading ? (
            <Text style={{ color: mutedColor }}>{t.common.loading}</Text>
          ) : grades.error && !grades.isOffline ? (
            <Text style={{ color: dangerColor }}>{grades.error.message}</Text>
          ) : latestGrades.length === 0 ? (
            <Text style={{ color: mutedColor }}>{t.common.noGradesYet}</Text>
          ) : (
            latestGrades.map((grade) => <GradeRow key={grade.id} grade={grade} />)
          )}

          <Link href="/payments" asChild>
            {/* Link's web `asChild` forwards this style straight onto the underlying
                <a> tag, bypassing react-native-web's array flattening — an array
                (rather than one merged object) crashes react-dom's style setter. */}
            <Pressable style={StyleSheet.flatten([styles.paymentsLink, { backgroundColor: tintMuted }])}>
              {({ pressed }) => (
                <View style={[styles.paymentsLinkInner, pressed && { opacity: 0.6 }]}>
                  <SymbolView name="creditcard" size={18} tintColor={tint} />
                  <Text style={[styles.paymentsLinkText, { color: tint }]}>{t.common.viewPayments}</Text>
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 26,
    marginBottom: 8,
    backgroundColor: 'transparent'
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
    justifyContent: 'space-between',
    backgroundColor: 'transparent'
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
    paddingVertical: 13,
    borderRadius: 14
  },
  paymentsLinkInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'transparent'
  },
  paymentsLinkText: {
    fontWeight: '700',
    fontSize: 15
  }
});
