import { describe, expect, it } from "vitest";
import type { ResourceTable } from "@/lib/school-db";
import {
  toAnnouncementEntries,
  toAttendanceEntries,
  toGradeEntries,
  toPaymentEntries,
  toTimetableSlots
} from "@/lib/mobile/projections";

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

const payments: ResourceTable = {
  columns: ["Student", "Amount", "Status", "Due Date"],
  ids: ["PA-1", "PA-2"],
  rows: [
    ["Бат", "$2,840", "Unpaid", "2026-06-01"],
    ["Бат", "Waived", "Paid", "2026-05-01"]
  ]
};

describe("toPaymentEntries", () => {
  it("parses a formatted amount while keeping the label", () => {
    const [first] = toPaymentEntries(payments);
    expect(first.id).toBe("PA-1");
    expect(first.amount).toBe(2840);
    expect(first.amountLabel).toBe("$2,840");
    expect(first.status).toBe("Unpaid");
    expect(first.dueDate).toBe("2026-06-01");
  });

  it("nulls the number for a non-numeric amount", () => {
    const [, second] = toPaymentEntries(payments);
    expect(second.amount).toBeNull();
    expect(second.amountLabel).toBe("Waived");
  });

  it("resolves the two-word Due Date column", () => {
    expect(() => toPaymentEntries(payments)).not.toThrow();
  });
});

const announcements: ResourceTable = {
  columns: ["Title", "Content", "Audience", "Date"],
  ids: ["AN-1"],
  rows: [["Амралт", "Даваа гарагт хичээл болохгүй", "All", "2026-05-18"]]
};

describe("toAnnouncementEntries", () => {
  it("maps the row", () => {
    expect(toAnnouncementEntries(announcements)[0]).toEqual({
      id: "AN-1",
      title: "Амралт",
      content: "Даваа гарагт хичээл болохгүй",
      audience: "All",
      date: "2026-05-18"
    });
  });
});
