import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Alert, Animated, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { OfflineBanner } from '@/components/OfflineBanner';
import { SearchBar } from '@/components/SearchBar';
import { SkeletonList } from '@/components/Skeleton';
import { SwipeableRow } from '@/components/SwipeableRow';
import { Text, View, useThemeColor } from '@/components/Themed';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { accentForSubjectName } from '@/lib/subject-visual';
import { useApiData } from '@/lib/use-api';
import { normalizeDayName, translateValue, WEEKDAYS_EN } from '@shared/i18n-tables';
import type { TimetableSlot } from '@shared/api-types';

export default function TimetableScreen() {
  const { data, error, loading, refetch, isOffline } = useApiData('timetable', api.timetable);
  const { session } = useAuth();
  const { language, t } = useLanguage();
  const [query, setQuery] = useState('');
  const dangerColor = useThemeColor({}, 'danger');
  const tint = useThemeColor({}, 'tint');
  const mutedColor = useThemeColor({}, 'muted');
  const textColor = useThemeColor({}, 'text');
  const tintMuted = useThemeColor({}, 'tintMuted');
  const cardColor = useThemeColor({}, 'card');
  const borderColor = useThemeColor({}, 'border');
  const daysRef = useRef<ScrollView>(null);
  const scrolledToDay = useRef(false);
  const isTeacher = session?.role === 'teacher';

  // Picks up a slot a teacher just added via /timetable-entry — that screen
  // doesn't know how to reach back into this one's state, so refetch instead.
  useFocusEffect(
    useCallback(() => {
      refetch();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const slots = data?.slots ?? [];

  // Monday–Friday always; a weekend day only when something is scheduled on it.
  const days = useMemo(() => {
    const used = new Set(slots.map((slot) => normalizeDayName(slot.day)));
    return WEEKDAYS_EN.map((day, index) => ({ day, index })).filter(({ day, index }) => index < 5 || used.has(day));
  }, [slots]);
  const today = WEEKDAYS_EN[(new Date().getDay() + 6) % 7];
  const [pickedDay, setPickedDay] = useState<string | null>(null);
  const selectedDay = pickedDay ?? (days.some(({ day }) => day === today) ? today : WEEKDAYS_EN[0]);
  const searching = query.trim() !== '';

  // The first day after the picked one (wrapping round the week) that has classes.
  const nextClassDay = useMemo(() => {
    const start = WEEKDAYS_EN.indexOf(selectedDay as (typeof WEEKDAYS_EN)[number]);
    for (let step = 1; step < 7; step++) {
      const day = WEEKDAYS_EN[(start + step) % 7];
      const count = slots.filter((slot) => normalizeDayName(slot.day) === day).length;
      if (count > 0) return { day, count };
    }
    return null;
  }, [slots, selectedDay]);

  const filteredSlots = useMemo(() => {
    const needle = query.trim().toLowerCase();
    // A search looks across the whole week; otherwise show the picked day in time order.
    if (!needle) {
      return slots
        .filter((slot) => normalizeDayName(slot.day) === selectedDay)
        .sort((a, b) => (a.startsAt ?? a.timeLabel).localeCompare(b.startsAt ?? b.timeLabel));
    }
    return slots.filter((slot) => {
      const haystack = [slot.subject, slot.teacher, slot.className, translateValue(slot.day, language), slot.timeLabel]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(needle);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slots, query, language, selectedDay]);

  async function handleDelete(slot: TimetableSlot) {
    try {
      await api.deleteTimetable(slot.id);
      refetch();
    } catch {
      Alert.alert(t.common.deleteFailed);
    }
  }

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
    <FlatList showsVerticalScrollIndicator={false}
      style={styles.container}
      contentContainerStyle={styles.content}
      data={filteredSlots}
      keyExtractor={(slot) => slot.id}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor={tint} colors={[tint]} />}
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={
        <>
          {isOffline ? <OfflineBanner /> : null}
          {slots.length > 0 ? <SearchBar value={query} onChangeText={setQuery} placeholder={t.common.searchTimetable} /> : null}
          {slots.length > 0 && !searching ? (
            <ScrollView
              ref={daysRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.days}
              contentContainerStyle={styles.daysContent}
            >
              {days.map(({ day }) => {
                const active = day === selectedDay;
                const count = slots.filter((slot) => normalizeDayName(slot.day) === day).length;
                return (
                  <Pressable
                    key={day}
                    onPress={() => setPickedDay(day)}
                    // Bring the opening day (often Thursday/Friday, off-screen) into view once.
                    onLayout={(event) => {
                      if (active && !scrolledToDay.current) {
                        scrolledToDay.current = true;
                        daysRef.current?.scrollTo({ x: Math.max(0, event.nativeEvent.layout.x - 16), animated: false });
                      }
                    }}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: active }}
                    style={[styles.day, { backgroundColor: active ? tint : cardColor, borderColor: active ? tint : borderColor }]}
                  >
                    {day === today ? <View style={[styles.todayDot, { backgroundColor: active ? '#fff' : tint }]} /> : null}
                    <Text style={[styles.dayName, { color: active ? '#fff' : textColor }]}>{translateValue(day, language)}</Text>
                    <View style={[styles.dayCount, { backgroundColor: active ? 'rgba(255,255,255,0.25)' : tintMuted }]}>
                      <Text style={[styles.dayCountText, { color: active ? '#fff' : count > 0 ? tint : mutedColor }]}>{count}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : null}
        </>
      }
      ListEmptyComponent={
        !searching && slots.length > 0 ? (
          <DayOff
            day={selectedDay}
            nextDay={nextClassDay}
            onShowNext={nextClassDay ? () => setPickedDay(nextClassDay.day) : undefined}
          />
        ) : (
          <EmptyState icon="calendar-outline" label={searching ? t.common.noTimetableMatchSearch : t.common.noTimetableSlotsYet} />
        )
      }
      renderItem={({ item }) => (
        <SwipeableRow deleteLabel={t.common.delete} onDelete={isTeacher ? () => handleDelete(item) : undefined}>
          <SlotRow slot={item} showDay={searching} />
        </SwipeableRow>
      )}
    />
  );
}

/**
 * The picked day has no classes: the home screen's sunny "day off" card, plus
 * a shortcut to the next day that does have some.
 */
function DayOff({
  day,
  nextDay,
  onShowNext
}: {
  day: string;
  nextDay: { day: string; count: number } | null;
  onShowNext?: () => void;
}) {
  const { language, t } = useLanguage();
  const tint = useThemeColor({}, 'tint');
  const mutedColor = useThemeColor({}, 'muted');
  const [pulse] = useState(() => new Animated.Value(1));
  const [spin] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const animation = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1.08, duration: 1200, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1, duration: 1200, useNativeDriver: true })
        ]),
        Animated.timing(spin, { toValue: 1, duration: 4800, useNativeDriver: true })
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [pulse, spin]);

  return (
    <View style={[styles.dayOff, { borderColor: `${tint}80`, backgroundColor: `${tint}20` }]}>
      <View style={[styles.dayOffAccent, { backgroundColor: tint }]} />
      <Animated.View
        style={[
          styles.dayOffIcon,
          { backgroundColor: `${tint}35` },
          { transform: [{ scale: pulse }, { rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }
        ]}
      >
        <Ionicons name="sunny-outline" size={28} color={tint} />
      </Animated.View>
      <Text style={styles.dayOffTitle}>{t.common.dayOffTitle(translateValue(day, language))}</Text>
      <Text style={[styles.dayOffBody, { color: mutedColor }]}>{t.common.dayOffBody}</Text>
      {nextDay && onShowNext ? (
        <Pressable
          onPress={onShowNext}
          accessibilityRole="button"
          style={({ pressed }) => [styles.dayOffButton, { backgroundColor: tint }, pressed && styles.dayOffPressed]}
        >
          <Text style={styles.dayOffButtonText}>{t.common.dayOffNext(translateValue(nextDay.day, language), nextDay.count)}</Text>
          <Ionicons name="arrow-forward" size={16} color="#fff" />
        </Pressable>
      ) : null}
    </View>
  );
}

/** `showDay` adds the weekday tag — only needed when a search mixes days. */
function SlotRow({ slot, showDay }: { slot: TimetableSlot; showDay: boolean }) {
  const { language } = useLanguage();
  const mutedColor = useThemeColor({}, 'muted');
  // By the subject's own name, not the row's index — the same subject must
  // look the same everywhere it appears (also on the grades/attendance tabs).
  const accentColor = useThemeColor({}, accentForSubjectName(slot.subject));
  const accentMuted = useThemeColor({}, `${accentForSubjectName(slot.subject)}Muted` as const);

  return (
    <Card style={[styles.card, { borderLeftColor: accentColor }]}>
      <View style={styles.row}>
        <View style={[styles.icon, { backgroundColor: accentMuted }]}>
          {/* The timetable tab's own icon, matching the tab bar. */}
          <Ionicons name="calendar" size={20} color={accentColor} />
        </View>
        <View style={styles.info}>
          <Text style={styles.subject} numberOfLines={1}>{slot.subject}</Text>
          <View style={styles.metaGroup}>
            <Ionicons name="person-outline" size={12} color={mutedColor} />
            <Text style={styles.meta} numberOfLines={1}>{slot.teacher} · {slot.className}</Text>
          </View>
        </View>
        <View style={styles.side}>
          {showDay ? (
            <View style={[styles.dayTag, { backgroundColor: accentMuted }]}>
              <Text style={[styles.dayTagText, { color: accentColor }]} numberOfLines={1}>
                {translateValue(slot.day, language)}
              </Text>
            </View>
          ) : null}
          <View style={styles.timeGroup}>
            <Ionicons name="time-outline" size={11} color={mutedColor} />
            <Text style={[styles.time, { color: mutedColor }]}>{slot.timeLabel}</Text>
          </View>
        </View>
      </View>
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
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20
  },
  // Bleeds past the list's 16px padding so the strip scrolls edge to edge.
  days: {
    marginHorizontal: -16,
    marginBottom: 14
  },
  daysContent: {
    gap: 8,
    paddingHorizontal: 16
  },
  day: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingLeft: 14,
    paddingRight: 10,
    borderRadius: 14,
    borderWidth: 1
  },
  dayName: {
    fontSize: 14,
    fontWeight: '700'
  },
  dayCount: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center'
  },
  dayCountText: {
    fontSize: 12,
    fontWeight: '800'
  },
  todayDot: {
    width: 6,
    height: 6,
    borderRadius: 3
  },
  dayOff: {
    alignItems: 'center',
    borderWidth: 0.5,
    borderStyle: 'dashed',
    borderRadius: 20,
    paddingHorizontal: 22,
    paddingTop: 30,
    paddingBottom: 24,
    marginTop: 4,
    overflow: 'hidden'
  },
  dayOffAccent: {
    position: 'absolute',
    top: 0,
    left: 32,
    right: 32,
    height: 3,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3
  },
  dayOffIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14
  },
  dayOffTitle: {
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center'
  },
  dayOffBody: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: 6
  },
  dayOffButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 18,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 999
  },
  dayOffPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.97 }]
  },
  dayOffButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700'
  },
  card: {
    marginBottom: 0,
    borderLeftWidth: 3
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'transparent'
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center'
  },
  info: {
    flex: 1,
    minWidth: 0,
    gap: 4,
    backgroundColor: 'transparent'
  },
  subject: {
    fontSize: 17,
    fontWeight: '700'
  },
  metaGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'transparent'
  },
  meta: {
    fontSize: 13,
    flexShrink: 1
  },
  side: {
    alignItems: 'flex-end',
    gap: 6,
    backgroundColor: 'transparent'
  },
  dayTag: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999
  },
  dayTagText: {
    fontSize: 11,
    fontWeight: '700'
  },
  timeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'transparent'
  },
  time: {
    fontSize: 12,
    fontWeight: '500'
  }
});
