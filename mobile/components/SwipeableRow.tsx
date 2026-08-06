import { useRef, type ReactNode } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { Text, useThemeColor } from './Themed';

/**
 * Wraps a row in a left-swipe-to-reveal delete action, matching the
 * iMessage/WhatsApp pattern. Deletes immediately on tap — the swipe itself
 * is the deliberate first step, a second confirmation dialog would just be
 * friction on top of friction.
 *
 * The row's own bottom margin is moved from the child (a Card) to this
 * wrapper: Swipeable sizes its action column to match its child's box
 * *including* that child's margin, so leaving the margin on the Card made
 * the revealed delete button taller than the card itself. Callers must zero
 * out the Card's own marginBottom for this to line up.
 *
 * Renders children unwrapped when `onDelete` is omitted (read-only viewers
 * — student/parent — never get the gesture at all, not just a hidden one).
 */
export function SwipeableRow({
  onDelete,
  deleteLabel,
  children
}: {
  onDelete?: () => void;
  deleteLabel: string;
  children: ReactNode;
}) {
  const swipeableRef = useRef<Swipeable>(null);
  const dangerStrong = useThemeColor({}, 'dangerStrong');

  if (!onDelete) return <>{children}</>;

  function renderRightActions(progress: Animated.AnimatedInterpolation<number>) {
    const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1], extrapolate: 'clamp' });

    return (
      <Pressable
        onPress={() => {
          swipeableRef.current?.close();
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          onDelete?.();
        }}
        style={[styles.action, { backgroundColor: dangerStrong }]}
      >
        <Animated.View style={[styles.actionInner, { transform: [{ scale }] }]}>
          <Ionicons name="trash" size={19} color="#fff" />
          <Text style={styles.label}>{deleteLabel}</Text>
        </Animated.View>
      </Pressable>
    );
  }

  return (
    <View style={styles.wrapper}>
      <Swipeable
        ref={swipeableRef}
        renderRightActions={renderRightActions}
        rightThreshold={44}
        overshootRight={false}
        friction={2}
        onSwipeableWillOpen={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
      >
        {children}
      </Swipeable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 10
  },
  action: {
    flex: 1,
    width: 76,
    marginLeft: 8,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center'
  },
  actionInner: {
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'transparent'
  },
  label: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700'
  }
});
