import { Pool } from "pg";
import path from "node:path";
import type { NavModule } from "@/lib/types";
import { subjectCatalog } from "@/lib/subjects";
import { placementBank } from "@/lib/placement-bank";
import { PLACEMENT_SUBJECT } from "@shared/placement";
import type { SchoolSession } from "@/lib/school-session";

/**
 * The web navigation modules, plus the English placement test's two tables,
 * which exist only for the mobile app and so have no NavModule of their own.
 */
export type SchoolResource = Exclude<NavModule, "dashboard" | "settings"> | "placementQuestions" | "placementResults";

export type SchoolRequestMode = "summary" | "page";

export type SchoolRequestContext = {
  session: SchoolSession;
  mode?: SchoolRequestMode;
  subjectId?: string | null;
};

export type ResourceTable = {
  columns: string[];
  ids: string[];
  rows: string[][];
};

export type LocalResourceRow = {
  id: string;
  createdAt: string;
  values?: string[];
} & Record<string, string | number | string[] | undefined>;

export type QueryRow = Record<string, string | number | Date | null | undefined>;
export type DbRow = Record<string, string | number | boolean | null | undefined>;

export type LocalStore = Record<SchoolResource, LocalResourceRow[]>;

declare global {
  var eduCorePool: Pool | undefined;
  var eduCoreReady: Promise<void> | undefined;
}

export const resourceColumns: Record<SchoolResource, string[]> = {
  students: ["Name", "Email", "Subjects", "Attendance", "GPA", "Payment", "Parent Email"],
  teachers: ["Name", "Email", "Subject", "Experience", "Salary", "Contact"],
  parents: ["Name", "Email", "Student", "Phone", "Occupation"],
  subjects: ["Name", "Code", "Description", "Teacher", "Category", "Grade Levels"],
  assignments: ["Subject", "Title", "File", "Due Date", "Max Score", "Description"],
  materials: ["Subject", "Title", "File Type", "Uploaded By", "File"],
  attendance: ["Student", "Subject", "Date", "Status"],
  grades: ["Student", "Subject", "Score", "Semester"],
  payments: ["Student", "Amount", "Status", "Due Date", "Fee Type"],
  timetable: ["Subject", "Day", "Time", "Teacher", "Class"],
  announcements: ["Title", "Content", "Audience", "Date"],
  wellbeing: ["Question", "Category", "Note", "Date"],
  placementQuestions: ["Subject", "Level", "Question", "Option A", "Option B", "Option C", "Option D", "Answer"],
  placementResults: ["Student", "Subject", "Level", "Correct", "Total", "Date"]
};

// The local JSON store is a development convenience for running without Postgres.
// It is never used on Vercel: there it lived in the function's /tmp, so a write
// during a database blip answered "saved" and then vanished. LOCAL_STORE_DIR
// overrides the location (tests use a temp dir).
export const localStoreFallbackEnabled = !process.env.VERCEL;
const localStoreRoot = process.env.LOCAL_STORE_DIR || path.join(process.cwd(), ".local-data");
export const localStorePath = path.join(localStoreRoot, "school-store.json");

export const localSeedData: LocalStore = {
  students: [],
  teachers: [],
  parents: [],
  subjects: subjectCatalog.map((subject) => ({
    id: subject.id,
    code: subject.code,
    name: subject.name,
    description: subject.description,
    category: subject.category,
    grade_levels: subject.gradeLevels,
    teacher_id: subject.teacherId ?? "",
    createdAt: "2026-05-18T00:00:00.000Z"
  })),
  assignments: [],
  materials: [],
  attendance: [],
  grades: [],
  payments: [],
  timetable: [],
  announcements: [],
  wellbeing: [],
  placementQuestions: placementBank.map((question) => ({
    id: question.id,
    subject: PLACEMENT_SUBJECT,
    level: question.level,
    question: question.question,
    option_a: question.options[0],
    option_b: question.options[1],
    option_c: question.options[2],
    option_d: question.options[3],
    answer: question.answer,
    createdAt: "2026-10-07T00:00:00.000Z"
  })),
  placementResults: []
};

function getDatabaseUrl() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set.");
  }

  return process.env.DATABASE_URL;
}

export function getPool() {
  if (!globalThis.eduCorePool) {
    globalThis.eduCorePool = new Pool({
      connectionString: getDatabaseUrl(),
      max: 10,
      ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined
    });
  }

  return globalThis.eduCorePool;
}

export function stringValue(value: unknown) {
  if (value === null || typeof value === "undefined") return "";
  return String(value);
}

export function phoneValue(value: unknown) {
  return stringValue(value)
    .replace(/^\+?976[\s-]*/, "")
    .trim();
}

export function numberValue(value: unknown) {
  const parsed = Number(String(value ?? "0").replace("%", ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * A rule the caller broke — a duplicate parent, a missing subject. Unlike a
 * dropped connection this must never fall through to the local file store:
 * doing so writes the rejected row anyway and answers 201, which is how a
 * student ended up with two parents.
 */
export class ValidationError extends Error {}

export function rowToArray(resource: SchoolResource, row: QueryRow | DbRow | LocalResourceRow) {
  switch (resource) {
    case "students":
      return [row.full_name, row.email, row.subjects, `${row.attendance}%`, row.gpa, row.payment_status, row.parent_email].map(stringValue);
    case "teachers":
      return [row.name, row.email, row.subject, row.experience, row.salary, phoneValue(row.contact)].map(stringValue);
    case "parents":
      return [row.name, row.email, row.student, row.phone, row.occupation].map(stringValue);
    case "subjects":
      return [row.name, row.code, row.description, row.teacher, row.category, row.grade_levels].map(stringValue);
    case "assignments":
      return [row.subject, row.title, row.file_url, row.due_date, row.max_score, row.description].map(stringValue);
    case "materials":
      return [row.subject, row.title, row.file_type, row.uploaded_by_name || row.uploaded_by, row.file_url].map(stringValue);
    case "attendance":
      return [row.student, row.subject, row.date, row.status].map(stringValue);
    case "grades":
      return [row.student, row.subject, `${row.score}`, row.semester].map(stringValue);
    case "payments":
      return [row.student, row.amount, row.status, row.due_date, row.fee_type || "Tuition"].map(stringValue);
    case "timetable":
      return [row.subject, row.day, row.time, row.teacher, row.class_name].map(stringValue);
    case "announcements":
      return [row.title, row.content, row.audience, row.date].map(stringValue);
    case "wellbeing":
      return [row.question, row.category, row.note, row.date].map(stringValue);
    case "placementQuestions":
      return [row.subject, row.level, row.question, row.option_a, row.option_b, row.option_c, row.option_d, row.answer].map(stringValue);
    case "placementResults":
      return [row.student, row.subject, row.level, row.correct, row.total, row.date].map(stringValue);
  }
}

export function tableName(resource: SchoolResource) {
  const names: Record<SchoolResource, string> = {
    students: "students",
    teachers: "teachers",
    parents: "parents",
    subjects: "subjects",
    assignments: "assignments",
    materials: "learning_materials",
    attendance: "attendance_records",
    grades: "grade_records",
    payments: "payment_records",
    timetable: "timetable_slots",
    announcements: "announcements",
    wellbeing: "wellbeing_prompts",
    placementQuestions: "placement_questions",
    placementResults: "placement_results"
  };

  return names[resource];
}

export function isSchoolResource(resource: string): resource is SchoolResource {
  return resource in resourceColumns;
}

export function normalizedToken(value: unknown) {
  return stringValue(value).trim().toLowerCase();
}

export function csvList(value: unknown) {
  return stringValue(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

/** A local-store row keeps its cells in `values`; a Postgres row only has fields. */
export function rawRowValues(resource: SchoolResource, row: DbRow | LocalResourceRow) {
  return (row as LocalResourceRow).values ?? rowToArray(resource, row);
}
