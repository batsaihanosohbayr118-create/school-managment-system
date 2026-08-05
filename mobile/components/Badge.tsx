import { StyleSheet } from 'react-native';

import { Text, useThemeColor } from './Themed';

export type BadgeTone = 'success' | 'danger' | 'warning' | 'neutral';

const toneColorKeys = {
  success: { text: 'success', bg: 'successMuted' },
  danger: { text: 'danger', bg: 'dangerMuted' },
  warning: { text: 'warning', bg: 'warningMuted' },
  neutral: { text: 'muted', bg: 'border' }
} as const;

/** A small colored status pill — Present/Absent/Late, Paid/Unpaid, etc. */
export function Badge({ label, tone = 'neutral' }: { label: string; tone?: BadgeTone }) {
  const keys = toneColorKeys[tone];
  const color = useThemeColor({}, keys.text);
  const backgroundColor = useThemeColor({}, keys.bg);

  return <Text style={[styles.badge, { color, backgroundColor }]}>{label}</Text>;
}

const POSITIVE = new Set(['present', 'paid']);
const NEGATIVE = new Set(['absent', 'unpaid']);
const CAUTION = new Set(['late', 'partial', 'pending']);

/** Maps a free-text status value (Present, Unpaid, Partial, ...) to a tone. */
export function statusTone(status: string): BadgeTone {
  const normalized = status.trim().toLowerCase();
  if (POSITIVE.has(normalized)) return 'success';
  if (NEGATIVE.has(normalized)) return 'danger';
  if (CAUTION.has(normalized)) return 'warning';
  return 'neutral';
}

const styles = StyleSheet.create({
  badge: {
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 999,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    overflow: 'hidden'
  }
});
