import type { ResourceTable } from "@/lib/school-db";
import type { TimetableSlot } from "@shared/api-types";
import { columnIndex, parseTimeRange } from "./table";

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
