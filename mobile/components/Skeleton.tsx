import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, type DimensionValue } from 'react-native';

import { Card } from './Card';
import { View, useThemeColor } from './Themed';

/** A single pulsing placeholder bar — the building block every skeleton below is made of. */
export function SkeletonBlock({
  width,
  height = 14,
  radius = 6,
  style
}: {
  width: DimensionValue;
  height?: number;
  radius?: number;
  style?: object;
}) {
  const borderColor = useThemeColor({}, 'border');
  const opacity = useRef(new Animated.Value(0.55)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.55, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        { width, height, borderRadius: radius, backgroundColor: borderColor, opacity },
        style
      ]}
    />
  );
}

/** Matches AttendanceRow/GradeRow/PaymentRow/TimetableRow's shape: a title-ish
 * bar and a value/badge-ish bar on one line, a shorter meta bar below. */
export function SkeletonRow() {
  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <SkeletonBlock width="45%" height={17} />
        <SkeletonBlock width={60} height={20} radius={10} />
      </View>
      <SkeletonBlock width="65%" height={13} />
    </Card>
  );
}

/** Matches AnnouncementRow's shape: icon badge + title, two body lines, a footer row. */
export function SkeletonAnnouncementRow() {
  return (
    <Card style={styles.card}>
      <View style={styles.announcementHeader}>
        <SkeletonBlock width={30} height={30} radius={15} />
        <SkeletonBlock width="55%" height={17} />
      </View>
      <SkeletonBlock width="90%" height={13} />
      <SkeletonBlock width="70%" height={13} />
      <View style={styles.header}>
        <SkeletonBlock width={70} height={20} radius={10} />
        <SkeletonBlock width={60} height={13} />
      </View>
    </Card>
  );
}

/** Drop-in replacement for a FlatList still waiting on its first response —
 * same outer padding as the real list, so content doesn't jump on load. */
export function SkeletonList({ count = 5, variant = 'row' }: { count?: number; variant?: 'row' | 'announcement' }) {
  const Row = variant === 'announcement' ? SkeletonAnnouncementRow : SkeletonRow;
  return (
    <View style={styles.list}>
      {Array.from({ length: count }).map((_, index) => (
        <Row key={index} />
      ))}
    </View>
  );
}

/** Matches HomeScreen's layout: greeting row, two stat tiles, one schedule row. */
export function SkeletonHome() {
  const tintMuted = useThemeColor({}, 'tintMuted');

  return (
    <View style={styles.list}>
      <View style={styles.homeGreeting}>
        <SkeletonBlock width={48} height={48} radius={24} />
        <View style={styles.homeGreetingText}>
          <SkeletonBlock width={90} height={13} />
          <SkeletonBlock width={120} height={21} />
        </View>
      </View>

      <View style={styles.homeStatRow}>
        <View style={[styles.homeStatTile, { backgroundColor: tintMuted }]}>
          <SkeletonBlock width={18} height={18} radius={5} />
          <SkeletonBlock width={30} height={22} />
          <SkeletonBlock width="70%" height={12} />
        </View>
        <View style={[styles.homeStatTile, { backgroundColor: tintMuted }]}>
          <SkeletonBlock width={18} height={18} radius={5} />
          <SkeletonBlock width={30} height={22} />
          <SkeletonBlock width="70%" height={12} />
        </View>
      </View>

      <SkeletonBlock width={140} height={13} style={styles.homeSectionLabel} />
      <SkeletonRow />
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    padding: 16
  },
  homeGreeting: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  homeGreetingText: {
    gap: 6
  },
  homeStatRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18
  },
  homeStatTile: {
    flex: 1,
    borderRadius: 16,
    padding: 14,
    gap: 8
  },
  homeSectionLabel: {
    marginTop: 26,
    marginBottom: 8
  },
  card: {
    gap: 8
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'transparent'
  },
  announcementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'transparent'
  }
});
