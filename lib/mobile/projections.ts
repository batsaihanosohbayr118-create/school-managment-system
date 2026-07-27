import type { ResourceTable } from "@/lib/school-db";
import type { AnnouncementEntry, AttendanceEntry, GradeEntry, PaymentEntry, TimetableSlot } from "@shared/api-types";
import { columnIndex, parseMoney, parseScore, parseTimeRange } from "./table";

export function toTimetableSlots(table: ResourceTable): TimetableSlot[] {
  const subject = columnIndex(table.columns, "Subject");
  const day = columnIndex(table.columns, "Day");
  const time = columnIndex(table.columns, "Time");
  const teacher = columnIndex(table.columns, "Teacher");
  const className = columnIndex(table.columns, "Class");

  return table.rows.map((row, index) => {
    const timeLabel = row[time] ?? "";
    const { startsAt, endsAt } = parseTimeRange(timeLabel);

    return {
      id: table.ids[index] ?? "",
      subject: row[subject] ?? "",
      day: row[day] ?? "",
      timeLabel,
      startsAt,
      endsAt,
      teacher: row[teacher] ?? "",
      className: row[className] ?? ""
    };
  });
}

export function toGradeEntries(table: ResourceTable): GradeEntry[] {
  const student = columnIndex(table.columns, "Student");
  const subject = columnIndex(table.columns, "Subject");
  const score = columnIndex(table.columns, "Score");
  const semester = columnIndex(table.columns, "Semester");

  return table.rows.map((row, index) => {
    const scoreLabel = row[score] ?? "";

    return {
      id: table.ids[index] ?? "",
      student: row[student] ?? "",
      subject: row[subject] ?? "",
      scoreLabel,
      score: parseScore(scoreLabel),
      semester: row[semester] ?? ""
    };
  });
}

export function toAttendanceEntries(table: ResourceTable): AttendanceEntry[] {
  const student = columnIndex(table.columns, "Student");
  const subject = columnIndex(table.columns, "Subject");
  const date = columnIndex(table.columns, "Date");
  const status = columnIndex(table.columns, "Status");

  return table.rows.map((row, index) => ({
    id: table.ids[index] ?? "",
    student: row[student] ?? "",
    subject: row[subject] ?? "",
    date: row[date] ?? "",
    status: row[status] ?? ""
  }));
}

export function toPaymentEntries(table: ResourceTable): PaymentEntry[] {
  const student = columnIndex(table.columns, "Student");
  const amount = columnIndex(table.columns, "Amount");
  const status = columnIndex(table.columns, "Status");
  const dueDate = columnIndex(table.columns, "Due Date");

  return table.rows.map((row, index) => {
    const amountLabel = row[amount] ?? "";

    return {
      id: table.ids[index] ?? "",
      student: row[student] ?? "",
      amountLabel,
      amount: parseMoney(amountLabel),
      status: row[status] ?? "",
      dueDate: row[dueDate] ?? ""
    };
  });
}

export function toAnnouncementEntries(table: ResourceTable): AnnouncementEntry[] {
  const title = columnIndex(table.columns, "Title");
  const content = columnIndex(table.columns, "Content");
  const audience = columnIndex(table.columns, "Audience");
  const date = columnIndex(table.columns, "Date");

  return table.rows.map((row, index) => ({
    id: table.ids[index] ?? "",
    title: row[title] ?? "",
    content: row[content] ?? "",
    audience: row[audience] ?? "",
    date: row[date] ?? ""
  }));
}
