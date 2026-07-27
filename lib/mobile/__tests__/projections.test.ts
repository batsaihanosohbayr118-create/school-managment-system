import { describe, expect, it } from "vitest";
import type { ResourceTable } from "@/lib/school-db";
import { toAttendanceEntries, toGradeEntries, toTimetableSlots } from "@/lib/mobile/projections";

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

const grades: ResourceTable = {
  columns: ["Student", "Subject", "Score", "Semester"],
  ids: ["GR-1", "GR-2"],
  rows: [
    ["Бат", "Математик", "92", "Намар"],
    ["Бат", "Физик", "N/A", "Намар"]
  ]
};

describe("toGradeEntries", () => {
  it("parses a numeric score", () => {
    const [first] = toGradeEntries(grades);
    expect(first.id).toBe("GR-1");
    expect(first.student).toBe("Бат");
    expect(first.subject).toBe("Математик");
    expect(first.score).toBe(92);
    expect(first.scoreLabel).toBe("92");
    expect(first.semester).toBe("Намар");
  });

  it("keeps the label and nulls the number when the score is not numeric", () => {
    const [, second] = toGradeEntries(grades);
    expect(second.score).toBeNull();
    expect(second.scoreLabel).toBe("N/A");
  });

  it("throws when a column is renamed", () => {
    expect(() => toGradeEntries({ ...grades, columns: ["Student", "Subject", "Mark", "Semester"] })).toThrow(/Score/);
  });
});

const attendance: ResourceTable = {
  columns: ["Student", "Subject", "Date", "Status"],
  ids: ["AT-1"],
  rows: [["Бат", "Математик", "2026-05-18", "Present"]]
};

describe("toAttendanceEntries", () => {
  it("maps the row", () => {
    const [first] = toAttendanceEntries(attendance);
    expect(first).toEqual({
      id: "AT-1",
      student: "Бат",
      subject: "Математик",
      date: "2026-05-18",
      status: "Present"
    });
  });

  it("returns an empty array for no rows", () => {
    expect(toAttendanceEntries({ ...attendance, ids: [], rows: [] })).toEqual([]);
  });
});
