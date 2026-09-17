import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Link } from 'expo-router';
import { Animated, Image, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Card } from '@/components/Card';
import { OfflineBanner } from '@/components/OfflineBanner';
import { SkeletonHome } from '@/components/Skeleton';
import { Text, View, useThemeColor } from '@/components/Themed';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { useLanguage } from '@/lib/language-context';
import { useApiData } from '@/lib/use-api';
import { normalizeDayName, translateValue } from '@shared/i18n-tables';
import type { AttendanceEntry, GradeEntry, TimetableSlot } from '@shared/api-types';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const today = DAY_NAMES[new Date().getDay()];

export default function HomeScreen() {
  const { session } = useAuth();
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
  const sunPulse = useRef(new Animated.Value(1)).current;
  const sunRotation = useRef(new Animated.Value(0)).current;
  const isTeacher = session?.role === 'teacher';
  const { language, t } = useLanguage();
  const mutedColor = useThemeColor({}, 'muted');
  const dangerColor = useThemeColor({}, 'danger');
  const success = useThemeColor({}, 'success');
  const tint = useThemeColor({}, 'tint');
  const tintMuted = useThemeColor({}, 'tintMuted');
  const purple = useThemeColor({}, 'purple');
  const purpleMuted = useThemeColor({}, 'purpleMuted');

  useEffect(() => {
    const animation = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(sunPulse, { toValue: 1.08, duration: 1200, useNativeDriver: true }),
          Animated.timing(sunPulse, { toValue: 1, duration: 1200, useNativeDriver: true })
        ]),
        Animated.timing(sunRotation, { toValue: 1, duration: 4800, useNativeDriver: true })
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [sunPulse, sunRotation]);

  const timetable = useApiData('timetable', api.timetable);
  const grades = useApiData('grades', api.grades);
  const announcements = useApiData('announcements', api.announcements);
  const attendance = useApiData('attendance', api.attendance);

  useFocusEffect(
    useCallback(() => {
      timetable.refetch();
      grades.refetch();
      announcements.refetch();
      attendance.refetch();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const todaysSlots = (timetable.data?.slots ?? [])
    .filter((slot) => normalizeDayName(slot.day) === today)
    .sort((a, b) => (a.startsAt ?? '').localeCompare(b.startsAt ?? ''));

  // The server already returns newest-first (created_at desc); take the top 3.
  const latestGrades = (grades.data?.grades ?? []).slice(0, 3);

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const newAnnouncementsCount = (announcements.data?.announcements ?? []).filter((entry) => {
    const posted = new Date(entry.date);
    return !Number.isNaN(posted.getTime()) && posted >= weekAgo;
  }).length;
  const attendanceEntries = attendance.data?.entries ?? [];
  const attendedCount = attendanceEntries.filter(isPresentAttendance).length;
  const attendanceTotal = attendanceEntries.length;
  const attendancePercent = attendanceTotal ? Math.round((attendedCount / attendanceTotal) * 100) : 0;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? t.common.goodMorning : hour < 18 ? t.common.goodAfternoon : t.common.goodEvening;
  const greetingEmoji = '👋';
  const name = session?.name || session?.email || '';
  const initial = name.trim().charAt(0).toUpperCase() || '?';

  if (timetable.loading || grades.loading) {
    return (
      <ScrollView style={styles.container}>
        <SkeletonHome />
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {(timetable.isOffline || grades.isOffline) ? <OfflineBanner /> : null}

      <View style={[styles.greetingPanel, { backgroundColor: tintMuted, borderColor: `${tint}30` }]}>
        {session?.avatarUrl && !avatarLoadFailed ? (
          <Image
            source={{ uri: session.avatarUrl }}
            style={styles.avatar}
            onError={() => setAvatarLoadFailed(true)}
          />
        ) : (
          <View style={[styles.avatar, { backgroundColor: tint }]}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
        )}
        <View style={styles.greetingText}>
          <Text style={[styles.greetingLabel, { color: mutedColor }]}>
            {greetingEmoji} {greeting}
          </Text>
          <Text style={styles.greetingName}>{name}</Text>
        </View>
        <View style={[styles.greetingAccent, { backgroundColor: tint }]} />
      </View>

      <View style={styles.statRow}>
        <View style={[styles.statLink, { backgroundColor: tintMuted }]}>
          <Link href="/timetable" asChild>
            <Pressable style={({ pressed }) => [styles.statTile, pressed && styles.pressedTile]}>
              <View style={[styles.statIcon, { backgroundColor: `${tint}18` }]}> 
                <Ionicons name="calendar" size={17} color={tint} />
              </View>
              <Text style={[styles.statValue, { color: tint }]}>{todaysSlots.length}</Text>
              <Text style={[styles.statLabel, { color: mutedColor }]}>{t.common.classesToday}</Text>
            </Pressable>
          </Link>
        </View>
        <View style={[styles.statLink, { backgroundColor: purpleMuted }]}>
          <Link href="/announcements" asChild>
            <Pressable style={({ pressed }) => [styles.statTile, pressed && styles.pressedTile]}>
              <View style={[styles.statIcon, { backgroundColor: `${purple}18` }]}> 
                <Ionicons name="megaphone" size={17} color={purple} />
              </View>
              <Text style={[styles.statValue, { color: purple }]}>{newAnnouncementsCount}</Text>
              <Text style={[styles.statLabel, { color: mutedColor }]}>{t.common.newAnnouncements}</Text>
            </Pressable>
          </Link>
        </View>
      </View>

      <AttendanceSummary
        attendedCount={attendedCount}
        totalCount={attendanceTotal}
        percentage={attendancePercent}
        tint={success}
        mutedColor={mutedColor}
        language={language}
      />

      <SectionHeader icon="calendar-outline" label={isTeacher ? t.common.todaysClasses : t.common.todaysSchedule} />
      {timetable.loading ? (
        <Text style={{ color: mutedColor }}>{t.common.loading}</Text>
      ) : timetable.error && !timetable.isOffline ? (
        <Text style={{ color: dangerColor }}>{timetable.error.message}</Text>
      ) : todaysSlots.length === 0 ? (
        <View style={[styles.emptySchedule, { borderColor: `${tint}80`, backgroundColor: `${tint}20` }]}>
          <View style={[styles.emptyScheduleAccent, { backgroundColor: tint }]} />
          <Animated.View
            style={[
              styles.emptyScheduleIcon,
              { backgroundColor: `${tint}35` },
              {
                transform: [
                  { scale: sunPulse },
                  { rotate: sunRotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }
                ]
              }
            ]}
          >
            <Ionicons name="sunny-outline" size={25} color={tint} />
          </Animated.View>
          <Text style={[styles.emptyScheduleTitle, { color: tint }]}>{t.common.todayIsAQuietDay}</Text>
          <Text style={[styles.emptyScheduleText, { color: mutedColor }]}>
            {t.common.nothingScheduledFor(translateValue(today, language))}
          </Text>
        </View>
      ) : (
        <Card style={styles.scheduleCard}>
          {todaysSlots.map((slot, index) => (
            <TimetableRow key={slot.id} slot={slot} isLast={index === todaysSlots.length - 1} />
          ))}
        </Card>
      )}

      {!isTeacher && (
        <>
          <SectionHeader icon="bar-chart-outline" label={t.common.latestGrades} />
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
                  <Ionicons name="card-outline" size={18} color={tint} />
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

function isPresentAttendance(entry: AttendanceEntry) {
  const status = entry.status.trim().toLowerCase();
  return status === 'present' || status === 'ирсэн' || status === 'presented';
}

function AttendanceSummary({
  attendedCount,
  totalCount,
  percentage,
  tint,
  mutedColor,
  language
}: {
  attendedCount: number;
  totalCount: number;
  percentage: number;
  tint: string;
  mutedColor: string;
  language: 'en' | 'mn';
}) {
  const cardColor = useThemeColor({}, 'card');
  const borderColor = useThemeColor({}, 'border');
  const shadowColor = useThemeColor({}, 'shadow');

  return (
    <Link href="/attendance" asChild>
      <Pressable style={styles.attendanceSummary}>
        {({ pressed }) => (
          <View
            style={[
              styles.attendanceSummaryInner,
              { backgroundColor: cardColor, borderColor, shadowColor },
              pressed && { opacity: 0.72 }
            ]}
          >
            <View style={styles.attendanceHeader}>
              <View style={styles.attendanceTitleGroup}>
                <View style={[styles.attendanceIcon, { backgroundColor: `${tint}22` }]}>
                  <Ionicons name="stats-chart" size={18} color={tint} />
                </View>
                <Text style={styles.attendanceTitle}>{language === 'mn' ? 'Миний ирц' : 'My attendance'}</Text>
              </View>
              <View style={styles.attendanceDetails}>
                <Text style={[styles.attendanceDetailsText, { color: tint }]}>
                  {language === 'mn' ? 'Дэлгэрэнгүй' : 'Details'}
                </Text>
                <Ionicons name="chevron-forward" size={17} color={tint} />
              </View>
            </View>
            <View style={styles.attendanceMetricRow}>
              <Text style={[styles.attendancePercent, { color: tint }]}>{percentage}%</Text>
              <Text style={[styles.attendanceCount, { color: mutedColor }]}>
                {attendedCount} / {totalCount} {language === 'mn' ? 'удаа' : 'sessions'}
              </Text>
            </View>
            <View style={[styles.progressTrack, { backgroundColor: `${tint}18` }]}>
              <View style={[styles.progressFill, { width: `${percentage}%`, backgroundColor: tint }]} />
            </View>
          </View>
        )}
      </Pressable>
    </Link>
  );
}

function SectionHeader({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  const mutedColor = useThemeColor({}, 'muted');
  const tint = useThemeColor({}, 'tint');
  return (
    <View style={styles.sectionHeader}>
      <Ionicons name={icon} size={14} color={tint} />
      <Text style={[styles.sectionTitle, { color: mutedColor }]}>{label}</Text>
    </View>
  );
}

function TimetableRow({ slot, isLast }: { slot: TimetableSlot; isLast: boolean }) {
  const { language } = useLanguage();
  const mutedColor = useThemeColor({}, 'muted');
  const tint = useThemeColor({}, 'tint');
  const success = useThemeColor({}, 'success');
  const warning = useThemeColor({}, 'warning');
  const borderColor = useThemeColor({}, 'border');
  const status = getSlotStatus(slot);
  const statusColor = status === 'completed' ? success : status === 'current' ? tint : warning;
  const statusKey = status === 'completed' ? 'Done' : status === 'current' ? 'Now' : 'Upcoming';
  const statusLabel = translateValue(statusKey, language);

  return (
    <View style={[styles.scheduleRow, !isLast && { borderBottomColor: borderColor, borderBottomWidth: StyleSheet.hairlineWidth }]}>
      <Text style={[styles.scheduleTime, { color: mutedColor }]}>{slot.timeLabel}</Text>
      <View style={[styles.scheduleDot, { backgroundColor: statusColor }]} />
      <View style={styles.scheduleInfo}>
        <Text style={styles.rowTitle} numberOfLines={1}>{translateValue(slot.subject, language)}</Text>
        <Text style={[styles.rowMeta, { color: mutedColor }]} numberOfLines={1}>{slot.className}</Text>
      </View>
      <View style={[styles.statusPill, { backgroundColor: `${statusColor}18` }]}>
        <Ionicons name={status === 'completed' ? 'checkmark-circle' : status === 'current' ? 'radio-button-on' : 'time-outline'} size={12} color={statusColor} />
        <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
      </View>
    </View>
  );
}

function getSlotStatus(slot: TimetableSlot): 'completed' | 'current' | 'upcoming' {
  if (!slot.startsAt || !slot.endsAt) return 'upcoming';
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const [startHour, startMinute] = slot.startsAt.split(':').map(Number);
  const [endHour, endMinute] = slot.endsAt.split(':').map(Number);
  const start = startHour * 60 + startMinute;
  const end = endHour * 60 + endMinute;
  if (currentMinutes >= end) return 'completed';
  if (currentMinutes >= start) return 'current';
  return 'upcoming';
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
  greetingPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 0,
    borderRadius: 22,
    padding: 14,
    overflow: 'hidden'
  },
  greetingAccent: {
    position: 'absolute',
    width: 72,
    height: 72,
    borderRadius: 36,
    right: -24,
    top: -24,
    opacity: 0.12
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff'
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700'
  },
  greetingText: {
    backgroundColor: 'transparent'
  },
  greetingLabel: {
    fontSize: 13,
    fontWeight: '600'
  },
  greetingName: {
    fontSize: 21,
    fontWeight: '800'
  },
  statRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
    backgroundColor: 'transparent'
  },
  statLink: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    minHeight: 116,
    padding: 15
  },
  statTile: {
    flex: 1,
    borderRadius: 16,
    padding: 0,
    gap: 5,
    minHeight: 86,
    height: '100%',
    width: '100%',
    backgroundColor: 'transparent'
  },
  pressedTile: {
    opacity: 0.72
  },
  statIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800'
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600'
  },
  attendanceSummary: {
    marginTop: 12,
    borderRadius: 17
  },
  attendanceSummaryInner: {
    borderRadius: 17,
    padding: 12,
    gap: 7,
    borderWidth: StyleSheet.hairlineWidth,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2
  },
  attendanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'transparent'
  },
  attendanceTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'transparent'
  },
  attendanceIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center'
  },
  attendanceTitle: {
    fontSize: 15,
    fontWeight: '800'
  },
  attendanceDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: 'transparent'
  },
  attendanceDetailsText: {
    fontSize: 13,
    fontWeight: '700'
  },
  attendanceMetricRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 12,
    backgroundColor: 'transparent'
  },
  attendancePercent: {
    fontSize: 29,
    lineHeight: 33,
    fontWeight: '900'
  },
  attendanceCount: {
    fontSize: 14,
    fontWeight: '600'
  },
  progressTrack: {
    height: 7,
    borderRadius: 4,
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    borderRadius: 5
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 28,
    marginBottom: 10,
    backgroundColor: 'transparent'
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  card: {
    gap: 5,
    marginBottom: 9,
    borderRadius: 15
  },
  scheduleCard: {
    paddingVertical: 2,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 0
  },
  scheduleRow: {
    minHeight: 70,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    gap: 9,
    backgroundColor: 'transparent'
  },
  scheduleTime: {
    width: 68,
    fontSize: 12,
    fontWeight: '600'
  },
  scheduleDot: {
    width: 8,
    height: 8,
    borderRadius: 4
  },
  scheduleInfo: {
    flex: 1,
    minWidth: 0,
    gap: 3,
    backgroundColor: 'transparent'
  },
  statusPill: {
    minWidth: 70,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 6
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700'
  },
  emptySchedule: {
    alignItems: 'center',
    borderWidth: 0.5,
    borderStyle: 'dashed',
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingTop: 26,
    paddingBottom: 22,
    marginTop: 2,
    marginBottom: 4,
    overflow: 'hidden'
  },
  emptyScheduleAccent: {
    position: 'absolute',
    top: 0,
    left: 28,
    right: 28,
    height: 3,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3
  },
  emptyScheduleIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10
  },
  emptyScheduleTitle: {
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 5
  },
  emptyScheduleText: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center'
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
