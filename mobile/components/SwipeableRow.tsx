import { useRef, type ReactNode } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useThemeColor } from './Themed';

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

  // No Swipeable in this branch, so there's no action-column height to match —
  // the wrapper's margin is safe to keep here (it's zeroed on the Card itself
  // only for the swipeable branch below).
  if (!onDelete) return <View style={styles.wrapper}>{children}</View>;

  function renderRightActions(progress: Animated.AnimatedInterpolation<number>) {
    const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1], extrapolate: 'clamp' });

    return (
      <Pressable
        accessibilityLabel={deleteLabel}
        onPress={() => {
          swipeableRef.current?.close();
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          onDelete?.();
        }}
        style={styles.action}
      >
        <Animated.View style={[styles.actionInner, { backgroundColor: dangerStrong, transform: [{ scale }] }]}> 
          <Ionicons name="trash" size={19} color="#fff" />
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
    width: 64,
    alignItems: 'center',
    justifyContent: 'center'
  },
  actionInner: {
    width: 56,
    height: 56,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center'
  }
});
