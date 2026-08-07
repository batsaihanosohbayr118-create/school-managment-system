import { StyleSheet } from 'react-native';

import { Text, useThemeColor } from './Themed';

export type BadgeTone = 'success' | 'danger' | 'warning' | 'neutral' | 'tint' | 'purple' | 'pink';

const toneColorKeys = {
  success: { text: 'success', bg: 'successMuted' },
  danger: { text: 'danger', bg: 'dangerMuted' },
  warning: { text: 'warning', bg: 'warningMuted' },
  neutral: { text: 'muted', bg: 'border' },
  tint: { text: 'tint', bg: 'tintMuted' },
  purple: { text: 'purple', bg: 'purpleMuted' },
  pink: { text: 'pink', bg: 'pinkMuted' }
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

/**
 * Maps an announcement's free-text Audience field to a tone. The admin form
 * has no fixed dropdown for it, so this matches loosely by keyword — same
 * approach as the server's push-notification targeting — across both the
 * English and Mongolian labels the app actually produces.
 */
export function audienceTone(audience: string): BadgeTone {
  const normalized = audience.trim().toLowerCase();
  if (normalized.includes('teacher') || normalized.includes('багш')) return 'tint';
  if (normalized.includes('student') || normalized.includes('сурагч')) return 'purple';
  if (normalized.includes('parent') || normalized.includes('эцэг') || normalized.includes('эх')) return 'pink';
  return 'success';
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
