import { Link } from 'expo-router';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';

import { useColorScheme } from '@/components/useColorScheme';
import type { AttendanceStats } from '@shared/attendance-stats';

type Language = 'en' | 'mn';

const RING_SIZE = 100;
const RING_STROKE = 9;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

type Palette = {
  background: [string, string];
  border: string;
  title: string;
  muted: string;
  link: string;
  streak: [string, string];
  streakBorder: string;
  count: [string, string];
  countBorder: string;
  track: string;
  shadow: string;
};

const LIGHT: Palette = {
  background: ['#ffffff', '#f0f6ff'],
  border: 'rgba(37,99,235,0.10)',
  title: '#0f172a',
  muted: '#64748b',
  link: '#059669',
  streak: ['#eef2ff', '#e0f2fe'],
  streakBorder: 'rgba(99,102,241,0.14)',
  count: ['#ecfdf5', '#e0f2fe'],
  countBorder: 'rgba(16,185,129,0.16)',
  track: '#e2e8f0',
  shadow: '#2563eb'
};

const DARK: Palette = {
  background: ['#0b1a3f', '#0f2557'],
  border: 'rgba(96,165,250,0.22)',
  title: '#ffffff',
  muted: 'rgba(255,255,255,0.65)',
  link: '#4ade80',
  streak: ['rgba(99,102,241,0.35)', 'rgba(59,130,246,0.12)'],
  streakBorder: 'rgba(129,140,248,0.30)',
  count: ['rgba(34,197,94,0.28)', 'rgba(45,212,191,0.10)'],
  countBorder: 'rgba(74,222,128,0.30)',
  track: 'rgba(255,255,255,0.08)',
  shadow: '#000'
};

function ringColors(percent: number, hasData: boolean): [string, string] {
  if (!hasData || percent >= 90) return ['#2dd4bf', '#22c55e'];
  if (percent >= 75) return ['#fbbf24', '#f59e0b'];
  return ['#fb7185', '#ef4444'];
}

const SUCCESS_STAR = require('@/assets/images/success-star.png');

function feedback(percent: number, total: number, language: Language) {
  const mn = language === 'mn';
  if (total === 0) {
    return {
      icon: 'calendar-clear-outline' as const,
      image: null,
      color: '#60a5fa',
      hues: ['#3b82f6', '#06b6d4'] as [string, string],
      title: mn ? 'Бүртгэл алга' : 'No records yet',
      text: mn ? 'Ирц бүртгэгдэхээр энд харагдана.' : 'Attendance will appear here once recorded.'
    };
  }
  if (percent >= 90) {
    return {
      icon: 'trophy' as const,
      image: SUCCESS_STAR,
      color: '#facc15',
      hues: ['#7c3aed', '#f59e0b'] as [string, string],
      title: mn ? 'Сайн байна!' : 'Great job!',
      text: mn ? 'Энэ сарыг амжилттай үргэлжлүүлээрэй!' : 'Keep this month going strong!'
    };
  }
  if (percent >= 75) {
    return {
      icon: 'ribbon' as const,
      image: null,
      color: '#f59e0b',
      hues: ['#f59e0b', '#f97316'] as [string, string],
      title: mn ? 'Болж байна!' : 'Doing well!',
      text: mn ? 'Ирцээ тогтвортой байлгаарай.' : 'Keep your attendance steady.'
    };
  }
  return {
    icon: 'alert-circle' as const,
    image: null,
    color: '#f87171',
    hues: ['#ef4444', '#f43f5e'] as [string, string],
    title: mn ? 'Анхаараарай' : 'Heads up',
    text: mn ? 'Хичээлээ тасалдуулахгүй байхыг хичээгээрэй.' : 'Try not to miss more classes.'
  };
}

export function AttendanceCard({
  stats,
  language,
  isParent
}: {
  stats: AttendanceStats;
  language: Language;
  isParent: boolean;
}) {
  const isLight = useColorScheme() === 'light';
  const palette = isLight ? LIGHT : DARK;
  // Light mode reads heavy with 1px borders; use hairlines there.
  const borderWidth = isLight ? StyleSheet.hairlineWidth : 1;
  const mn = language === 'mn';
  const hasData = stats.total > 0;
  const [ringStart, ringEnd] = ringColors(stats.percent, hasData);
  const note = feedback(stats.percent, stats.total, language);
  const dashOffset = RING_CIRCUMFERENCE * (1 - stats.percent / 100);

  return (
    <Link href="/attendance" asChild>
      <Pressable style={StyleSheet.flatten([styles.wrap, { shadowColor: palette.shadow }])}>
        {({ pressed }) => (
          <LinearGradient
            colors={palette.background}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.card, { borderColor: palette.border, borderWidth }, pressed && styles.pressed]}
          >
            <View style={styles.header}>
              <View style={styles.titleGroup}>
                <LinearGradient colors={['#2dd4bf', '#16a34a']} style={styles.headerIcon}>
                  <Ionicons name="stats-chart" size={16} color="#fff" />
                </LinearGradient>
                <Text style={[styles.title, { color: palette.title }]}>
                  {isParent ? (mn ? 'Хүүхдийн ирц' : "Child's attendance") : mn ? 'Миний ирц' : 'My attendance'}
                </Text>
              </View>
              <View style={styles.detailsLink}>
                <Text style={[styles.detailsText, { color: palette.link }]}>{mn ? 'Дэлгэрэнгүй' : 'Details'}</Text>
                <Ionicons name="chevron-forward" size={15} color={palette.link} />
              </View>
            </View>

            <View style={styles.body}>
              <View style={styles.ring}>
                <Svg width={RING_SIZE} height={RING_SIZE}>
                  <Defs>
                    <SvgGradient id="attendanceRing" x1="0" y1="0" x2="1" y2="1">
                      <Stop offset="0" stopColor={ringStart} />
                      <Stop offset="1" stopColor={ringEnd} />
                    </SvgGradient>
                  </Defs>
                  <Circle
                    cx={RING_SIZE / 2}
                    cy={RING_SIZE / 2}
                    r={RING_RADIUS}
                    stroke={palette.track}
                    strokeWidth={RING_STROKE}
                    fill="none"
                  />
                  {stats.percent > 0 ? (
                    <Circle
                      cx={RING_SIZE / 2}
                      cy={RING_SIZE / 2}
                      r={RING_RADIUS}
                      stroke="url(#attendanceRing)"
                      strokeWidth={RING_STROKE}
                      strokeLinecap="round"
                      strokeDasharray={`${RING_CIRCUMFERENCE} ${RING_CIRCUMFERENCE}`}
                      strokeDashoffset={dashOffset}
                      fill="none"
                      transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
                    />
                  ) : null}
                </Svg>
                <View style={styles.ringLabel}>
                  <Text style={[styles.ringPercent, { color: palette.title }]}>{stats.percent}%</Text>
                  <Text style={[styles.ringCaption, { color: palette.muted }]}>{mn ? 'Ирц' : 'Attendance'}</Text>
                </View>
                {hasData ? (
                  <View style={[styles.ringBadge, { backgroundColor: ringEnd, borderColor: palette.background[1] }]}>
                    <Ionicons name={stats.percent >= 75 ? 'checkmark' : 'alert'} size={12} color="#fff" />
                  </View>
                ) : null}
              </View>

              <View style={styles.middle}>
                <LinearGradient
                  colors={palette.streak}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.streakCard, { borderColor: palette.streakBorder, borderWidth }]}
                >
                  <Image source={require('@/assets/images/streak-fire.png')} style={styles.flame} resizeMode="contain" />
                  <View style={styles.streakCopy}>
                    <Text style={[styles.streakValue, { color: palette.title }]}>
                      {stats.streak} {mn ? 'өдөр' : stats.streak === 1 ? 'day' : 'days'}
                    </Text>
                    <Text style={[styles.streakCaption, { color: palette.muted }]}>
                      {mn ? 'дараалан ирсэн' : 'in a row'}
                    </Text>
                  </View>
                </LinearGradient>
                <LinearGradient
                  colors={palette.count}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.countCard, { borderColor: palette.countBorder, borderWidth }]}
                >
                  <View style={styles.countIcon}>
                    <Ionicons name="checkmark-done" size={16} color="#fff" />
                  </View>
                  <View style={styles.streakCopy}>
                    <Text style={[styles.countValue, { color: palette.title }]}>
                      {stats.attended}
                      <Text style={{ color: palette.muted }}> / {stats.total} {mn ? 'удаа' : 'sessions'}</Text>
                    </Text>
                    <Text style={[styles.countCaption, { color: palette.muted }]}>
                      {mn ? 'ирцийн тоо' : 'attended'}
                    </Text>
                  </View>
                </LinearGradient>
              </View>
            </View>

            <LinearGradient
              colors={[`${note.hues[0]}${isLight ? '1F' : '45'}`, `${note.hues[1]}${isLight ? '0D' : '14'}`]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.noteCard, { borderColor: `${note.hues[0]}${isLight ? '26' : '66'}`, borderWidth }]}
            >
              <Ionicons
                name="sparkles"
                size={44}
                color={`${note.hues[1]}${isLight ? '1A' : '26'}`}
                style={styles.noteSparkles}
              />
              <View style={[styles.noteIconGlow, { backgroundColor: `${note.hues[0]}${isLight ? '1F' : '33'}` }]}>
                {note.image ? (
                  <Image source={note.image} style={styles.noteImage} resizeMode="contain" />
                ) : (
                  <Ionicons name={note.icon} size={22} color={note.color} />
                )}
              </View>
              <View style={styles.noteCopy}>
                <View style={styles.noteTitleRow}>
                  <Text style={[styles.noteTitle, { color: palette.title }]}>{note.title}</Text>
                  {hasData ? (
                    <LinearGradient
                      colors={note.hues}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.notePill}
                    >
                      <Text style={styles.notePillText}>{stats.percent}%</Text>
                    </LinearGradient>
                  ) : null}
                </View>
                <Text style={[styles.noteText, { color: palette.muted }]}>{note.text}</Text>
              </View>
            </LinearGradient>

          </LinearGradient>
        )}
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 12,
    borderRadius: 22,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 4
  },
  card: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 14,
    gap: 14,
    overflow: 'hidden'
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }]
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  headerIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center'
  },
  title: {
    fontSize: 16,
    fontWeight: '800'
  },
  detailsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2
  },
  detailsText: {
    fontSize: 13,
    fontWeight: '700'
  },
  body: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  ring: {
    width: RING_SIZE,
    height: RING_SIZE + 6,
    alignItems: 'center'
  },
  ringLabel: {
    position: 'absolute',
    top: 0,
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center'
  },
  ringPercent: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5
  },
  ringCaption: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1
  },
  ringBadge: {
    position: 'absolute',
    bottom: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center'
  },
  middle: {
    flex: 1,
    gap: 10,
    minWidth: 0
  },
  streakCard: {
    alignSelf: 'flex-end',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 8
  },
  flame: {
    width: 28,
    height: 28
  },
  streakCopy: {
    flexShrink: 1
  },
  streakValue: {
    fontSize: 15,
    fontWeight: '800'
  },
  streakCaption: {
    fontSize: 10.5,
    fontWeight: '600'
  },
  countCard: {
    alignSelf: 'flex-end',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 8
  },
  countIcon: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#22c55e'
  },
  countValue: {
    fontSize: 15,
    fontWeight: '800'
  },
  countCaption: {
    fontSize: 10.5,
    fontWeight: '600',
    marginTop: 1
  },
  noteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    overflow: 'hidden'
  },
  noteSparkles: {
    position: 'absolute',
    right: -6,
    bottom: -10,
    transform: [{ rotate: '12deg' }]
  },
  noteIconGlow: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center'
  },
  noteImage: {
    width: 44,
    height: 44
  },
  noteCopy: {
    flex: 1,
    minWidth: 0
  },
  noteTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8
  },
  noteTitle: {
    flexShrink: 1,
    fontSize: 15,
    fontWeight: '800'
  },
  notePill: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3
  },
  notePillText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800'
  },
  noteText: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
    marginTop: 3
  }
});
