/**
 * The English placement test: how answers turn into a CEFR level.
 *
 * Pure and dependency-free — imported by the server (to grade) and the Expo
 * app (to label levels). The question bank itself, with its answer key, lives
 * in lib/placement-bank.ts instead: anything in shared/ is bundled into the
 * phone app, and a student could read the answers out of it.
 */
export const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1"] as const;

export type CefrLevel = (typeof CEFR_LEVELS)[number];

export const ANSWER_LETTERS = ["A", "B", "C", "D"] as const;

export type AnswerLetter = (typeof ANSWER_LETTERS)[number];

/** Matches the subject catalogue's name (lib/subjects.ts, id SB-EN). */
export const PLACEMENT_SUBJECT = "English";

/** A level counts as passed at this share of correct answers or above. */
export const PASS_RATIO = 0.6;

export function isCefrLevel(value: unknown): value is CefrLevel {
  return typeof value === "string" && (CEFR_LEVELS as readonly string[]).includes(value.trim().toUpperCase());
}

export function normalizeCefrLevel(value: string): CefrLevel | null {
  const upper = value.trim().toUpperCase();
  return isCefrLevel(upper) ? (upper as CefrLevel) : null;
}

export function normalizeAnswerLetter(value: string): AnswerLetter | null {
  const upper = value.trim().toUpperCase();
  return (ANSWER_LETTERS as readonly string[]).includes(upper) ? (upper as AnswerLetter) : null;
}

export function isPlacementSubject(value: string): boolean {
  return value.trim().toLowerCase() === PLACEMENT_SUBJECT.toLowerCase();
}

export type LevelTally = { correct: number; total: number };

export type GradableQuestion = { id: string; level: string; answer: string };

export type PlacementScore = {
  level: CefrLevel;
  correct: number;
  total: number;
  byLevel: Record<CefrLevel, LevelTally>;
};

/**
 * Walks the levels from easiest up and stops at the first one the student
 * did not pass; the level reached is where they are placed. A level with no
 * questions is skipped rather than treated as failed, so a teacher deleting
 * every B1 question does not cap everyone at A2.
 *
 * Failing even A1 still places a student at A1 — it is the beginners' class.
 */
export function placementLevel(byLevel: Record<CefrLevel, LevelTally>): CefrLevel {
  let reached: CefrLevel = "A1";

  for (const level of CEFR_LEVELS) {
    const { correct, total } = byLevel[level];
    if (total === 0) continue;
    if (correct / total < PASS_RATIO) break;
    reached = level;
  }

  return reached;
}

/**
 * Grades a submission. `answers` maps question id -> chosen letter; a missing
 * or unrecognized answer counts as wrong, never as skipped, so leaving the
 * hard questions blank cannot raise a level.
 */
export function scorePlacement(questions: GradableQuestion[], answers: Record<string, string>): PlacementScore {
  const byLevel = Object.fromEntries(CEFR_LEVELS.map((level) => [level, { correct: 0, total: 0 }])) as Record<CefrLevel, LevelTally>;

  for (const question of questions) {
    const level = normalizeCefrLevel(question.level);
    const key = normalizeAnswerLetter(question.answer);
    if (!level || !key) continue;

    byLevel[level].total += 1;
    const given = normalizeAnswerLetter(answers[question.id] ?? "");
    if (given === key) byLevel[level].correct += 1;
  }

  const tallies = Object.values(byLevel);

  return {
    level: placementLevel(byLevel),
    correct: tallies.reduce((sum, tally) => sum + tally.correct, 0),
    total: tallies.reduce((sum, tally) => sum + tally.total, 0),
    byLevel
  };
}
