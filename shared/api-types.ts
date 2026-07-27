/**
 * The contract between the mobile API routes and the Expo client.
 *
 * Imported by both sides so a shape change breaks the build rather than
 * failing at runtime on a phone.
 *
 * Design note: the underlying tables store every value as a string
 * (`rowToArray` in lib/school-db.ts maps everything through `stringValue`).
 * Fields that we parse therefore come in pairs — a parsed value that may be
 * null, and the original label. A phone should render the label and use the
 * parsed number only for sorting or arithmetic.
 */
export type MobileRole = "admin" | "teacher" | "student" | "parent";

export type MobileProfile = {
  email: string;
  name: string;
  role: MobileRole;
  avatarUrl: string;
};

export type TimetableSlot = {
  id: string;
  subject: string;
  day: string;
  /** Original free-text time, e.g. "08:30-09:15". Always render this. */
  timeLabel: string;
  /** Parsed start, "HH:MM", or null when timeLabel is not a range. */
  startsAt: string | null;
  endsAt: string | null;
  teacher: string;
  className: string;
};

export type GradeEntry = {
  id: string;
  student: string;
  subject: string;
  scoreLabel: string;
  score: number | null;
  semester: string;
};

export type AttendanceEntry = {
  id: string;
  student: string;
  subject: string;
  date: string;
  status: string;
};

export type PaymentEntry = {
  id: string;
  student: string;
  /** Original label, e.g. "$2,840". Always render this. */
  amountLabel: string;
  amount: number | null;
  status: string;
  dueDate: string;
};

export type AnnouncementEntry = {
  id: string;
  title: string;
  content: string;
  audience: string;
  date: string;
};

export type MobileErrorBody = { message: string };

export type TimetableResponse = { slots: TimetableSlot[] };
export type GradesResponse = { grades: GradeEntry[] };
export type AttendanceResponse = { entries: AttendanceEntry[] };
export type PaymentsResponse = { payments: PaymentEntry[] };
export type AnnouncementsResponse = { announcements: AnnouncementEntry[] };
