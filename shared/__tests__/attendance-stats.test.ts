import { describe, expect, it } from "vitest";
import { computeAttendanceStats, isPresentStatus, toDateKey } from "@shared/attendance-stats";

// Saturday 2026-10-10; its week runs Mon 10-05 .. Sun 10-11.
const now = new Date(2026, 9, 10, 12);

describe("isPresentStatus", () => {
  it("accepts English and Mongolian present values", () => {
    expect(isPresentStatus("Present")).toBe(true);
    expect(isPresentStatus(" ирсэн ")).toBe(true);
    expect(isPresentStatus("Absent")).toBe(false);
  });
});

describe("toDateKey", () => {
  it("keeps the date part of ISO strings", () => {
    expect(toDateKey("2026-10-06")).toBe("2026-10-06");
    expect(toDateKey("2026-10-06T08:00:00Z")).toBe("2026-10-06");
  });

  it("returns null for unreadable dates", () => {
    expect(toDateKey("not a date")).toBeNull();
  });
});

describe("computeAttendanceStats", () => {
  it("handles no records", () => {
    expect(computeAttendanceStats([], now)).toEqual({
      attended: 0,
      total: 0,
      percent: 0,
      streak: 0,
      week: ["none", "none", "none", "none", "none", "none", "future"]
    });
  });

  it("counts the streak back from the latest recorded day until an absence", () => {
    const stats = computeAttendanceStats(
      [
        { date: "2026-10-02", status: "Present" },
        { date: "2026-10-05", status: "Absent" },
        { date: "2026-10-07", status: "Present" },
        { date: "2026-10-09", status: "Present" },
        { date: "2026-10-09", status: "Absent" }
      ],
      now
    );
    expect(stats.streak).toBe(2);
    expect(stats.attended).toBe(3);
    expect(stats.total).toBe(5);
    expect(stats.percent).toBe(60);
    expect(stats.week).toEqual(["absent", "none", "present", "none", "present", "none", "future"]);
  });

  it("ignores records dated after today for the streak", () => {
    const stats = computeAttendanceStats(
      [
        { date: "2026-10-09", status: "Present" },
        { date: "2026-10-11", status: "Absent" }
      ],
      now
    );
    expect(stats.streak).toBe(1);
    expect(stats.week[6]).toBe("absent");
  });
});
