import { describe, expect, it } from "vitest";
import { isLunchDate, lunchAmount, MAX_LUNCH_DAYS, normalizeLunchDates } from "@shared/lunch";

describe("isLunchDate", () => {
  it("accepts a weekday", () => {
    expect(isLunchDate("2026-10-21")).toBe(true); // Wednesday
  });

  it("rejects weekends", () => {
    expect(isLunchDate("2026-10-24")).toBe(false); // Saturday
    expect(isLunchDate("2026-10-25")).toBe(false); // Sunday
  });

  it("rejects malformed and impossible dates", () => {
    expect(isLunchDate("2026-2-03")).toBe(false);
    expect(isLunchDate("2026-02-30")).toBe(false);
    expect(isLunchDate("not a date")).toBe(false);
  });
});

describe("normalizeLunchDates", () => {
  it("dedupes and sorts", () => {
    expect(normalizeLunchDates(["2026-10-22", "2026-10-21", "2026-10-22"])).toEqual(["2026-10-21", "2026-10-22"]);
  });

  it("rejects an empty selection, a weekend, and a non-list", () => {
    expect(() => normalizeLunchDates([])).toThrow(/invalid/i);
    expect(() => normalizeLunchDates(["2026-10-24"])).toThrow(/invalid/i);
    expect(() => normalizeLunchDates("2026-10-21")).toThrow(/invalid/i);
    expect(() => normalizeLunchDates([20261021])).toThrow(/invalid/i);
  });

  it("caps the number of days", () => {
    const weekdays: string[] = [];
    for (let day = new Date(Date.UTC(2026, 0, 1)); weekdays.length <= MAX_LUNCH_DAYS; day.setUTCDate(day.getUTCDate() + 1)) {
      const iso = day.toISOString().slice(0, 10);
      if (isLunchDate(iso)) weekdays.push(iso);
    }
    expect(() => normalizeLunchDates(weekdays)).toThrow(/at most/);
  });
});

describe("lunchAmount", () => {
  it("is 5000 per day", () => {
    expect(lunchAmount(3)).toBe(15000);
  });
});
