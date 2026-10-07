import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useFocusEffect } from 'expo-router';
import { Animated, Image, Pressable, ScrollView, StyleSheet, type ImageSourcePropType } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { Card } from '@/components/Card';
import { AttendanceCard } from '@/components/AttendanceCard';
import { OfflineBanner } from '@/components/OfflineBanner';
import { SkeletonHome } from '@/components/Skeleton';
import { Text, View, useThemeColor } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { useLanguage } from '@/lib/language-context';
import { useApiData } from '@/lib/use-api';
import { normalizeDayName, translateValue } from '@shared/i18n-tables';
import { computeAttendanceStats } from '@shared/attendance-stats';
import type { GradeEntry, TimetableSlot } from '@shared/api-types';
import { roleLabel } from '@shared/roles';

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
  const tint = useThemeColor({}, 'tint');
  const placementColor = useThemeColor({}, 'purple');
  const scheme = useColorScheme();
  const isLight = scheme === 'light';
  const card = isLight ? PROFILE_CARD_LIGHT : PROFILE_CARD_DARK;

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
  const attendanceStats = computeAttendanceStats(attendance.data?.entries ?? []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? t.common.goodMorning : hour < 18 ? t.common.goodAfternoon : t.common.goodEvening;
  const greetingEmoji = '👑';
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

      <View style={[styles.greetingPanelWrap, { shadowColor: card.shadow }]}>
        <View style={[styles.greetingPanel, { borderColor: card.border, backgroundColor: card.base }]}>
          {/* The photo sits in its own padding-free layer: a require()d image
              otherwise takes its intrinsic pixel size, and percentage sizes
              would resolve against the card's padded content box. */}
          <View style={[StyleSheet.absoluteFill, styles.greetingBgLayer]} pointerEvents="none">
            <Image
              source={card.image}
              style={styles.greetingBg}
              resizeMode="cover"
            />
          </View>
          {/* Dark mode only: a soft wash behind the text. */}
          {card.overlay ? (
            <LinearGradient
              colors={card.overlay}
              locations={[0, 0.6, 1]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />
          ) : null}

          <View style={styles.greetingContent}>
            <View style={styles.avatarRing}>
              <LinearGradient
                colors={card.ring}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.avatarRingGradient}
              />
              <View style={[styles.avatarGap, { backgroundColor: card.ringGap }]}>
                {session?.avatarUrl && !avatarLoadFailed ? (
                  <Image
                    source={{ uri: session.avatarUrl }}
                    style={styles.avatar}
                    onError={() => setAvatarLoadFailed(true)}
                  />
                ) : (
                  <LinearGradient colors={card.avatar} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.avatar}>
                    <Text style={styles.avatarText}>{initial}</Text>
                  </LinearGradient>
                )}
              </View>
              <View style={[styles.avatarStatus, { borderColor: card.ringGap }]} />
            </View>
            <View style={styles.greetingText}>
              <Text style={[styles.greetingLabel, { color: card.label }]} numberOfLines={1}>
                {greetingEmoji} {greeting}
              </Text>
              <Text style={[styles.greetingName, { color: card.name }]} numberOfLines={1}>{name}</Text>
              <LinearGradient
                colors={['#3b82f6', '#6366f1']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.roleBadge}
              >
                <Ionicons name="shield-checkmark" size={11} color="#fff" />
                <Text style={styles.roleBadgeText}>{roleLabel(session?.role ?? '', language)}</Text>
              </LinearGradient>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.statRow}>
        {/* The flex-sizing wrapper stays a plain View, not part of the
            <Link asChild> chain — a function-valued `style` on the Link's
            direct child confuses expo-router's Slot cloning (same class of
            bug as passing it an array), so the Pressable it clones onto
            keeps a plain style and the "pressed" look only affects the
            LinearGradient inside, via the render-prop children. */}
        <View style={[styles.statLinkWrap, { shadowColor: '#2563eb' }]}>
          <Link href="/timetable" asChild>
            <Pressable style={styles.statLinkPress}>
              {({ pressed }) => (
                <LinearGradient
                  colors={['#3b82f6', '#1d4ed8']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0.7 }}
                  style={[styles.statLink, pressed && styles.pressedTile]}
                >
                  <View style={styles.statGlowOuter} pointerEvents="none" />
                  <Ionicons name="calendar" size={44} color="rgba(255,255,255,0.14)" style={styles.statBgIcon} />
                  <View style={styles.statIcon}>
                    <Ionicons name="calendar-outline" size={18} color="#fff" />
                  </View>
                  <Text style={styles.statValue}>{todaysSlots.length}</Text>
                  <View style={styles.statFooterRow}>
                    <Text style={styles.statLabel}>{t.common.classesToday}</Text>
                    <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.75)" />
                  </View>
                </LinearGradient>
              )}
            </Pressable>
          </Link>
        </View>
        <View style={[styles.statLinkWrap, { shadowColor: '#7c3aed' }]}>
          <Link href="/announcements" asChild>
            <Pressable style={styles.statLinkPress}>
              {({ pressed }) => (
                <LinearGradient
                  colors={['#a78bfa', '#7c3aed']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0.7 }}
                  style={[styles.statLink, pressed && styles.pressedTile]}
                >
                  <View style={styles.statGlowOuter} pointerEvents="none" />
                  <Ionicons name="megaphone" size={44} color="rgba(255,255,255,0.14)" style={styles.statBgIcon} />
                  <View style={styles.statIcon}>
                    <Ionicons name="megaphone-outline" size={18} color="#fff" />
                  </View>
                  <Text style={styles.statValue}>{newAnnouncementsCount}</Text>
                  <View style={styles.statFooterRow}>
                    <Text style={styles.statLabel}>{t.common.newAnnouncements}</Text>
                    <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.75)" />
                  </View>
                </LinearGradient>
              )}
            </Pressable>
          </Link>
        </View>
      </View>

      <AttendanceCard stats={attendanceStats} language={language} isParent={session?.role === 'parent'} />

      <SectionHeader
        icon="calendar-outline"
        label={isTeacher ? t.common.todaysClasses : t.common.todaysSchedule}
        href="/timetable"
      />
      {timetable.loading ? (
        <Text style={{ color: mutedColor }}>{t.common.loading}</Text>
      ) : timetable.error && !timetable.isOffline ? (
        <Text style={{ color: dangerColor }}>{timetable.error.message}</Text>
      ) : (
        <Link href="/timetable" asChild>
          {/* Plain style object: Link's asChild forwards it as-is (see paymentsLink). */}
          <Pressable style={styles.scheduleLink}>
            {({ pressed }) =>
              todaysSlots.length === 0 ? (
                <View
                  style={[
                    styles.emptySchedule,
                    { borderColor: `${tint}80`, backgroundColor: `${tint}20` },
                    pressed && styles.schedulePressed
                  ]}
                >
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
                <Card style={[styles.scheduleCard, pressed && styles.schedulePressed]}>
                  {todaysSlots.map((slot, index) => (
                    <TimetableRow key={slot.id} slot={slot} isLast={index === todaysSlots.length - 1} />
                  ))}
                </Card>
              )
            }
          </Pressable>
        </Link>
      )}

      {/* Every role reaches the placement test from here: a student sits it,
          a parent sees their child's level, the English teacher manages it. */}
      <Link href="/placement" asChild>
        <Pressable style={StyleSheet.flatten([styles.paymentsLink, styles.placementLink, { backgroundColor: placementColor }])}>
          {({ pressed }) => (
            <View style={[styles.paymentsLinkInner, pressed && styles.paymentsLinkPressed]}>
              <View style={[styles.paymentsLinkCopy, styles.shrink]}>
                <View style={[styles.paymentsLinkIcon, { backgroundColor: 'rgba(255,255,255,0.22)' }]}>
                  <Ionicons name="language-outline" size={17} color="#fff" />
                </View>
                <Text style={[styles.paymentsLinkText, styles.shrink, { color: '#fff' }]}>{t.placement.homeLink}</Text>
              </View>
              <Ionicons name="arrow-forward-circle" size={24} color="#fff" />
            </View>
          )}
        </Pressable>
      </Link>

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
            <Pressable style={StyleSheet.flatten([styles.paymentsLink, { backgroundColor: tint }])}>
              {({ pressed }) => (
                <View style={[styles.paymentsLinkInner, pressed && styles.paymentsLinkPressed]}>
                  <View style={styles.paymentsLinkCopy}>
                    <View style={[styles.paymentsLinkIcon, { backgroundColor: 'rgba(255,255,255,0.22)' }]}>
                      <Ionicons name="card-outline" size={17} color="#fff" />
                    </View>
                    <Text style={[styles.paymentsLinkText, { color: '#fff' }]}>{t.common.viewPayments}</Text>
                  </View>
                  <Ionicons name="arrow-forward-circle" size={24} color="#fff" />
                </View>
              )}
            </Pressable>
          </Link>
        </>
      )}
    </ScrollView>
  );
}

type ProfileCardPalette = {
  base: string;
  image: ImageSourcePropType;
  overlay: [string, string, string] | null;
  border: string;
  shadow: string;
  avatar: [string, string];
  ring: [string, string, string];
  ringGap: string;
  label: string;
  name: string;
};

// Light: the photo as-is; navy text directly on its pale left side.
const PROFILE_CARD_LIGHT: ProfileCardPalette = {
  base: '#9fd8dc',
  image: require('@/assets/images/profile-card-bg.jpg'),
  overlay: null,
  border: 'rgba(37,99,235,0.12)',
  shadow: '#2563eb',
  avatar: ['#3b82f6', '#1d4ed8'],
  ring: ['#38bdf8', '#818cf8', '#f472b6'],
  ringGap: '#e6f7f8',
  label: '#475569',
  name: '#0f172a'
};

// Dark: night-desk photo, lightly darkened on the left; white text.
const PROFILE_CARD_DARK: ProfileCardPalette = {
  base: '#0b1a3f',
  image: require('@/assets/images/profile-card-bg-dark.jpg'),
  // Light touch: the photo is already dark, this just steadies the text side.
  overlay: ['rgba(5,10,30,0.55)', 'rgba(5,10,30,0.15)', 'rgba(5,10,30,0)'],
  border: 'rgba(96,165,250,0.22)',
  shadow: '#000',
  avatar: ['#3b82f6', '#1d4ed8'],
  ring: ['#60a5fa', '#a78bfa', '#f472b6'],
  ringGap: '#0b1a3f',
  label: 'rgba(255,255,255,0.75)',
  name: '#ffffff'
};

function SectionHeader({
  icon,
  label,
  href
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  href?: '/timetable';
}) {
  const mutedColor = useThemeColor({}, 'muted');
  const tint = useThemeColor({}, 'tint');
  return (
    <View style={styles.sectionHeader}>
      <Ionicons name={icon} size={14} color={tint} />
      <Text style={[styles.sectionTitle, { color: mutedColor }]}>{label}</Text>
      {href ? (
        <Link href={href} asChild>
          <Pressable style={styles.sectionArrow} hitSlop={10}>
            <Ionicons name="chevron-forward" size={20} color={tint} />
          </Pressable>
        </Link>
      ) : null}
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
      <Text style={[styles.scheduleTime, { color: mutedColor }]} numberOfLines={1} adjustsFontSizeToFit>{slot.timeLabel}</Text>
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
  greetingPanelWrap: {
    borderRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 4
  },
  greetingPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 24,
    padding: 14,
    // Both profile-card-bg images are pre-cropped to this ratio, so they show whole.
    aspectRatio: 2.3,
    overflow: 'hidden'
  },
  greetingBgLayer: {
    backgroundColor: 'transparent'
  },
  greetingBg: {
    width: '100%',
    height: '100%'
  },
  greetingContent: {
    // Leave the right side of the photo visible.
    maxWidth: '72%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'transparent'
  },
  avatarRing: {
    width: 62,
    height: 62,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4
  },
  avatarRingGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 31
  },
  avatarGap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800'
  },
  avatarStatus: {
    position: 'absolute',
    right: 0,
    bottom: 1,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2.5,
    backgroundColor: '#22c55e'
  },
  greetingText: {
    flexShrink: 1,
    backgroundColor: 'transparent'
  },
  greetingLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3
  },
  greetingName: {
    fontSize: 21,
    fontWeight: '800',
    letterSpacing: -0.4,
    lineHeight: 26,
    marginTop: 1
  },
  roleBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 6
  },
  roleBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.2
  },
  statRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
    backgroundColor: 'transparent'
  },
  statLinkWrap: {
    flex: 1,
    borderRadius: 24,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 4
  },
  statLinkPress: {
    flex: 1
  },
  statLink: {
    flex: 1,
    width: '100%',
    borderRadius: 24,
    overflow: 'hidden',
    minHeight: 100,
    padding: 16
  },
  statGlowOuter: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    top: -45,
    right: -35,
    backgroundColor: 'rgba(255,255,255,0.08)'
  },
  statBgIcon: {
    position: 'absolute',
    right: 2,
    bottom: 6,
    transform: [{ rotate: '6deg' }]
  },
  pressedTile: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }]
  },
  statIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    backgroundColor: 'rgba(255,255,255,0.2)'
  },
  statValue: {
    fontSize: 26,
    fontWeight: '800',
    color: '#fff'
  },
  statFooterRow: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'transparent'
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)'
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
  scheduleLink: {
    borderRadius: 18
  },
  schedulePressed: {
    opacity: 0.8,
    transform: [{ scale: 0.99 }]
  },
  sectionArrow: {
    marginLeft: 'auto'
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
    width: 84,
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
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 17,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3
  },
  placementLink: {
    marginBottom: 4
  },
  shrink: {
    flexShrink: 1
  },
  paymentsLinkInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'transparent'
  },
  paymentsLinkPressed: {
    opacity: 0.72,
    transform: [{ scale: 0.985 }]
  },
  paymentsLinkCopy: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'transparent'
  },
  paymentsLinkIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center'
  },
  paymentsLinkText: {
    fontWeight: '700',
    fontSize: 15
  }
});
