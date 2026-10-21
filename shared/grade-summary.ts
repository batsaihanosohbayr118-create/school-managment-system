/**
 * Turns raw grade rows (a 0–100 score per subject per semester) into what the
 * grades screen shows: letter grades, a 4.0-scale GPA, and a per-semester trend.
 */

export type LetterGrade = { letter: string; points: number };

/** The common Mongolian 4.0 scale: [minimum score, letter, grade points]. */
const SCALE: [number, string, number][] = [
  [96, "A", 4.0],
  [91, "A-", 3.7],
  [88, "B+", 3.3],
  [84, "B", 3.0],
  [81, "B-", 2.7],
  [78, "C+", 2.3],
  [74, "C", 2.0],
  [71, "C-", 1.7],
  [68, "D+", 1.3],
  [64, "D", 1.0],
  [60, "D-", 0.7]
];

export function letterGrade(score: number): LetterGrade {
  const band = SCALE.find(([min]) => score >= min);
  return band ? { letter: band[1], points: band[2] } : { letter: "F", points: 0 };
}

export type GradeInput = { subject: string; score: number | null; semester: string };

export type SubjectSummary = LetterGrade & { subject: string; score: number };

/**
 * Distinct, non-empty semesters, oldest first. The API returns grades newest
 * first, so the order a semester first appears from the end is its age.
 */
export function semestersInOrder(grades: GradeInput[]): string[] {
  const seen: string[] = [];
  for (let i = grades.length - 1; i >= 0; i--) {
    const semester = grades[i].semester.trim();
    if (semester && !seen.includes(semester)) seen.push(semester);
  }
  return seen;
}

/**
 * One row per subject — several scores for the same subject are averaged —
 * for one semester, or for all of them when `semester` is null. Rows without
 * a numeric score are left out. Sorted by subject name.
 */
export function summarizeSubjects(grades: GradeInput[], semester: string | null): SubjectSummary[] {
  const bySubject = new Map<string, { subject: string; total: number; count: number }>();

  for (const grade of grades) {
    if (grade.score === null) continue;
    if (semester !== null && grade.semester.trim() !== semester) continue;

    const key = grade.subject.trim().toLowerCase();
    const entry = bySubject.get(key) ?? { subject: grade.subject.trim(), total: 0, count: 0 };
    entry.total += grade.score;
    entry.count += 1;
    bySubject.set(key, entry);
  }

  return [...bySubject.values()]
    .map(({ subject, total, count }) => {
      const score = Math.round(total / count);
      return { subject, score, ...letterGrade(score) };
    })
    .sort((a, b) => a.subject.localeCompare(b.subject));
}

/** Mean grade points, rounded to two decimals; null when there is nothing to average. */
export function gradePointAverage(subjects: SubjectSummary[]): number | null {
  if (subjects.length === 0) return null;
  const total = subjects.reduce((sum, subject) => sum + subject.points, 0);
  return Math.round((total / subjects.length) * 100) / 100;
}

/** Mean score out of 100, rounded; null when there is nothing to average. */
export function averageScore(subjects: SubjectSummary[]): number | null {
  if (subjects.length === 0) return null;
  return Math.round(subjects.reduce((sum, subject) => sum + subject.score, 0) / subjects.length);
}

/** GPA per semester, oldest first, skipping semesters with no scores. */
export function semesterTrend(grades: GradeInput[]): { semester: string; gpa: number }[] {
  return semestersInOrder(grades).flatMap((semester) => {
    const gpa = gradePointAverage(summarizeSubjects(grades, semester));
    return gpa === null ? [] : [{ semester, gpa }];
  });
}
