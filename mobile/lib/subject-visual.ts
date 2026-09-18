import type { Ionicons } from '@expo/vector-icons';

/** Cycles subjects through the app's accent palette so lists read as a set
 * of cards, not a flat table. */
export const SUBJECT_ACCENTS = ['tint', 'purple', 'pink', 'success', 'warning'] as const;
export type SubjectAccent = (typeof SUBJECT_ACCENTS)[number];

/**
 * Loose keyword match against name + category (English from the catalog, but
 * an admin can type anything, Mongolian included) — same approach as
 * Badge.tsx's audienceTone. Order matters: "Social Science" and "Computer
 * Science" both contain "science", so those compound categories must be
 * checked before the plain science/physics pattern or they'd falsely match
 * it. Falls through to a plain book for anything unrecognized rather than
 * guessing wrong.
 */
const SUBJECT_ICON_PATTERNS: [RegExp, keyof typeof Ionicons.glyphMap][] = [
  [/math|calc|тоо|математик/, 'calculator'],
  [/social|history|geography|civic|нийгм|түүх|газар зүй/, 'earth'],
  [/computer|programming|мэдээлэл/, 'laptop'],
  [/english|language|literature|хэл/, 'language'],
  [/physic|chemistry|biology|science|хими|физик|биологи|шинжлэх/, 'flask'],
  [/art|drawing|дүрслэх/, 'color-palette'],
  [/music|хөгжим/, 'musical-notes'],
  [/(physical education|sport|fitness|биеийн тамир)/, 'basketball']
];

export function iconForSubjectName(name: string, category?: string): keyof typeof Ionicons.glyphMap {
  const haystack = `${name} ${category ?? ''}`.toLowerCase();
  return SUBJECT_ICON_PATTERNS.find(([pattern]) => pattern.test(haystack))?.[1] ?? 'book';
}

/** A stable hash of the subject's own name — not the row's index — so the
 * same subject always gets the same accent color no matter where (or how
 * many times) it appears in a list. */
export function accentForSubjectName(name: string): SubjectAccent {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  return SUBJECT_ACCENTS[Math.abs(hash) % SUBJECT_ACCENTS.length];
}
