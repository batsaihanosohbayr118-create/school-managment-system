import { describe, expect, it } from "vitest";
import type { ResourceTable } from "@/lib/school-db";
import { toTimetableSlots } from "@/lib/mobile/projections";

const timetable: ResourceTable = {
  columns: ["Subject", "Day", "Time", "Teacher", "Class"],
  ids: ["TI-1", "TI-2"],
  rows: [
    ["Математик", "Мягмар", "08:30-09:15", "Б.Дорж", "11а"],
    ["Физик", "Лхагва", "Morning", "С.Оюун", "11а"]
  ]
};

describe("toTimetableSlots", () => {
  it("maps every row with its id", () => {
    const slots = toTimetableSlots(timetable);
    expect(slots).toHaveLength(2);
    expect(slots[0].id).toBe("TI-1");
    expect(slots[0].subject).toBe("Математик");
    expect(slots[0].teacher).toBe("Б.Дорж");
    expect(slots[0].className).toBe("11а");
  });

  it("parses a time range into start and end", () => {
    const [first] = toTimetableSlots(timetable);
    expect(first.startsAt).toBe("08:30");
    expect(first.endsAt).toBe("09:15");
  });

  it("keeps the original label so the UI can always render something", () => {
    const [, second] = toTimetableSlots(timetable);
    expect(second.timeLabel).toBe("Morning");
    expect(second.startsAt).toBeNull();
    expect(second.endsAt).toBeNull();
  });

  it("returns an empty array for an empty table", () => {
    expect(toTimetableSlots({ columns: timetable.columns, ids: [], rows: [] })).toEqual([]);
  });

  it("throws when a source column has been renamed", () => {
    const broken: ResourceTable = { ...timetable, columns: ["Subject", "Weekday", "Time", "Teacher", "Class"] };
    expect(() => toTimetableSlots(broken)).toThrow(/Day/);
  });
});
