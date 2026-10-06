/**
 * Pure attendance summaries for the mobile Home card: overall counts, the
 * current run of attended days, and a Monday-first view of this week.
 * Kept free of React/RN so vitest can cover it.
 */

export type AttendanceDayStatus = "present" | "absent" | "none" | "future";

export type AttendanceStats = {
  attended: number;
  total: number;
  percent: number;
  /** Consecutive most-recent recorded days (up to today) with attendance. */
  streak: number;
  /** Monday..Sunday of the week containing `now`. */
  week: AttendanceDayStatus[];
};

export function isPresentStatus(status: string): boolean {
  const normalized = status.trim().toLowerCase();
  return normalized === "present" || normalized === "ирсэн" || normalized === "presented";
}

function localDateKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Normalizes an entry date to YYYY-MM-DD, or null if it can't be read. */
export function toDateKey(value: string): string | null {
  const iso = /^(\d{4}-\d{2}-\d{2})/.exec(value.trim());
  if (iso) return iso[1];
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : localDateKey(parsed);
}

export function computeAttendanceStats(
  entries: ReadonlyArray<{ date: string; status: string }>,
  now: Date = new Date()
): AttendanceStats {
  const attended = entries.filter((entry) => isPresentStatus(entry.status)).length;
  const total = entries.length;

  // A day counts as attended if any of that day's records is present.
  const dayPresent = new Map<string, boolean>();
  for (const entry of entries) {
    const key = toDateKey(entry.date);
    if (!key) continue;
    dayPresent.set(key, (dayPresent.get(key) ?? false) || isPresentStatus(entry.status));
  }

  const todayKey = localDateKey(now);
  let streak = 0;
  const recordedDays = [...dayPresent.keys()].filter((key) => key <= todayKey).sort().reverse();
  for (const key of recordedDays) {
    if (!dayPresent.get(key)) break;
    streak += 1;
  }

  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7));
  const week: AttendanceDayStatus[] = [];
  for (let offset = 0; offset < 7; offset += 1) {
    const key = localDateKey(new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + offset));
    const present = dayPresent.get(key);
    if (present !== undefined) week.push(present ? "present" : "absent");
    else week.push(key > todayKey ? "future" : "none");
  }

  return {
    attended,
    total,
    percent: total ? Math.round((attended / total) * 100) : 0,
    streak,
    week
  };
}
