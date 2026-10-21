/**
 * The school lunch fee. Shared so the phone shows the same price the server
 * bills — the server recomputes the amount from the dates and never trusts a
 * total sent by the client.
 */
export const LUNCH_FEE_PER_DAY = 5000;

/** More than any month has school days; caps one payment at roughly a month. */
export const MAX_LUNCH_DAYS = 31;

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/** A real calendar date written YYYY-MM-DD that falls on Monday–Friday. */
export function isLunchDate(value: string): boolean {
  const match = DATE_PATTERN.exec(value);
  if (!match) return false;

  const [year, month, day] = [Number(match[1]), Number(match[2]) - 1, Number(match[3])];
  const date = new Date(Date.UTC(year, month, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month || date.getUTCDate() !== day) return false;

  const weekday = date.getUTCDay();
  return weekday !== 0 && weekday !== 6;
}

/**
 * Validates and normalizes a lunch selection: unique, sorted school days, at
 * least one and at most MAX_LUNCH_DAYS. Throws with an "invalid" message, which
 * the mobile routes map to 400.
 */
export function normalizeLunchDates(dates: unknown): string[] {
  if (!Array.isArray(dates) || dates.some((date) => typeof date !== "string")) {
    throw new Error("Invalid lunch dates: expected a list of YYYY-MM-DD strings.");
  }

  const unique = [...new Set(dates as string[])].sort();
  if (unique.length === 0) throw new Error("Invalid lunch dates: select at least one day.");
  if (unique.length > MAX_LUNCH_DAYS) throw new Error(`Invalid lunch dates: at most ${MAX_LUNCH_DAYS} days per payment.`);

  const bad = unique.find((date) => !isLunchDate(date));
  if (bad) throw new Error(`Invalid lunch date: ${bad} is not a school day.`);

  return unique;
}

export function lunchAmount(days: number): number {
  return days * LUNCH_FEE_PER_DAY;
}
