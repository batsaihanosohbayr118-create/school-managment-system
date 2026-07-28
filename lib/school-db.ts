import { Pool, type PoolClient } from "pg";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import type { NavModule, Role } from "@/lib/types";
import { defaultStudentSubjects, defaultStudentSubjectsValue, subjectCatalog } from "@/lib/subjects";
import { AccountConflictError, createAccount, setAccountPassword } from "@/lib/auth-db";
import type { SchoolSession } from "./school-session";

export type SchoolResource = Exclude<NavModule, "dashboard" | "settings">;

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

type LocalResourceRow = {
  id: string;
  createdAt: string;
  values?: string[];
} & Record<string, string | number | string[] | undefined>;

type QueryRow = Record<string, string | number | Date | null | undefined>;
type DbRow = Record<string, string | number | boolean | null | undefined>;

type LocalStore = Record<SchoolResource, LocalResourceRow[]>;

declare global {
  var eduCorePool: Pool | undefined;
  var eduCoreReady: Promise<void> | undefined;
}

const resourceColumns: Record<SchoolResource, string[]> = {
  students: ["Name", "Email", "Subjects", "Attendance", "GPA", "Payment", "Parent Email"],
  teachers: ["Name", "Email", "Subject", "Experience", "Salary", "Contact"],
  parents: ["Name", "Email", "Student", "Phone", "Occupation"],
  subjects: ["Name", "Code", "Description", "Teacher", "Category", "Grade Levels"],
  assignments: ["Subject", "Title", "Type", "Due Date", "Max Score", "Description"],
  materials: ["Subject", "Title", "File Type", "Uploaded By"],
  attendance: ["Student", "Subject", "Date", "Status"],
  grades: ["Student", "Subject", "Score", "Semester"],
  payments: ["Student", "Amount", "Status", "Due Date"],
  timetable: ["Subject", "Day", "Time", "Teacher", "Class"],
  announcements: ["Title", "Content", "Audience", "Date"],
  wellbeing: ["Question", "Category", "Note", "Date"]
};

const localStoreRoot = process.env.VERCEL ? path.join(tmpdir(), "educore") : path.join(process.cwd(), ".local-data");
const localStorePath = path.join(localStoreRoot, "school-store.json");

const localSeedData: LocalStore = {
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
  wellbeing: []
};

function getDatabaseUrl() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set.");
  }

  return process.env.DATABASE_URL;
}

function getPool() {
  if (!globalThis.eduCorePool) {
    globalThis.eduCorePool = new Pool({
      connectionString: getDatabaseUrl(),
      max: 10,
      ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined
    });
  }

  return globalThis.eduCorePool;
}

async function ensureSchoolDatabase() {
  if (!globalThis.eduCoreReady) {
    globalThis.eduCoreReady = initializeSchoolDatabase().catch((error) => {
      globalThis.eduCoreReady = undefined;
      throw error;
    });
  }

  return globalThis.eduCoreReady;
}

async function initializeSchoolDatabase() {
  const pool = getPool();

  await pool.query(`
    CREATE TABLE IF NOT EXISTS subjects (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      teacher TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL DEFAULT '',
      grade_levels TEXT NOT NULL DEFAULT '',
      teacher_id TEXT UNIQUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS teachers (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      subject TEXT NOT NULL DEFAULT '',
      subject_id TEXT UNIQUE,
      experience TEXT NOT NULL DEFAULT '',
      salary TEXT NOT NULL DEFAULT '',
      contact TEXT NOT NULL DEFAULT '',
      classes TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS students (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      full_name TEXT NOT NULL,
      phone TEXT NOT NULL DEFAULT '',
      gender TEXT NOT NULL DEFAULT 'Unknown',
      birth_date TEXT NOT NULL DEFAULT '',
      address TEXT NOT NULL DEFAULT '',
      parent_name TEXT NOT NULL DEFAULT '',
      parent_email TEXT DEFAULT '',
      parent_id TEXT UNIQUE,
      class_name TEXT NOT NULL DEFAULT '',
      roll_number TEXT NOT NULL DEFAULT '',
      attendance INTEGER NOT NULL DEFAULT 0,
      gpa NUMERIC NOT NULL DEFAULT 0,
      payment_status TEXT NOT NULL DEFAULT 'Unpaid',
      subjects TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS parents (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      student TEXT NOT NULL DEFAULT '',
      student_email TEXT UNIQUE NOT NULL DEFAULT '',
      student_id TEXT UNIQUE,
      phone TEXT NOT NULL DEFAULT '',
      occupation TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS student_subjects (
      student_id TEXT NOT NULL,
      subject_id TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (student_id, subject_id)
    );

    CREATE TABLE IF NOT EXISTS attendance_records (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL DEFAULT '',
      subject_id TEXT NOT NULL DEFAULT '',
      student TEXT NOT NULL DEFAULT '',
      subject TEXT NOT NULL DEFAULT '',
      class_name TEXT NOT NULL DEFAULT '',
      date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Present',
      recorded_by TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS grade_records (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL DEFAULT '',
      subject_id TEXT NOT NULL DEFAULT '',
      student TEXT NOT NULL DEFAULT '',
      subject TEXT NOT NULL DEFAULT '',
      score NUMERIC NOT NULL DEFAULT 0,
      semester TEXT NOT NULL DEFAULT '',
      entered_by TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS assignments (
      id TEXT PRIMARY KEY,
      subject_id TEXT NOT NULL DEFAULT '',
      subject TEXT NOT NULL DEFAULT '',
      teacher_id TEXT NOT NULL DEFAULT '',
      teacher TEXT NOT NULL DEFAULT '',
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      type TEXT NOT NULL DEFAULT 'Homework',
      max_score NUMERIC NOT NULL DEFAULT 100,
      due_date TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS assignment_submissions (
      id TEXT PRIMARY KEY,
      assignment_id TEXT NOT NULL,
      student_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Assigned',
      score NUMERIC,
      submitted_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (assignment_id, student_id)
    );

    CREATE TABLE IF NOT EXISTS learning_materials (
      id TEXT PRIMARY KEY,
      subject_id TEXT NOT NULL DEFAULT '',
      subject TEXT NOT NULL DEFAULT '',
      uploaded_by TEXT NOT NULL DEFAULT '',
      uploaded_by_name TEXT NOT NULL DEFAULT '',
      title TEXT NOT NULL,
      file_url TEXT NOT NULL DEFAULT '',
      file_type TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS payment_records (
      id TEXT PRIMARY KEY,
      student TEXT NOT NULL,
      amount TEXT NOT NULL,
      status TEXT NOT NULL,
      due_date TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS timetable_slots (
      id TEXT PRIMARY KEY,
      subject_id TEXT NOT NULL DEFAULT '',
      subject TEXT NOT NULL DEFAULT '',
      teacher_id TEXT NOT NULL DEFAULT '',
      teacher TEXT NOT NULL DEFAULT '',
      class_name TEXT NOT NULL DEFAULT '',
      day TEXT NOT NULL,
      time TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS announcements (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL DEFAULT '',
      audience TEXT NOT NULL DEFAULT 'All',
      date TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS wellbeing_prompts (
      id TEXT PRIMARY KEY,
      question TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'General',
      note TEXT NOT NULL DEFAULT '',
      date TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await seedIfEmpty();
}

/**
 * Seeds the subject catalogue from `subjectCatalog`, which is the single source
 * of truth. Do NOT re-add a hardcoded list here: this runs on every server
 * start, so anything listed is resurrected after an administrator deletes it.
 */
async function seedIfEmpty() {
  const pool = getPool();

  for (const subject of subjectCatalog) {
    await pool.query(
      `INSERT INTO subjects (id, code, name, description, category, grade_levels)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO NOTHING`,
      [subject.id, subject.code, subject.name, subject.description, subject.category, subject.gradeLevels]
    );
  }
}

function stringValue(value: unknown) {
  if (value === null || typeof value === "undefined") return "";
  return String(value);
}

function phoneValue(value: unknown) {
  return stringValue(value)
    .replace(/^\+?976[\s-]*/, "")
    .trim();
}

function numberValue(value: unknown) {
  const parsed = Number(String(value ?? "0").replace("%", ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function cloneSeedData(): LocalStore {
  return JSON.parse(JSON.stringify(localSeedData));
}

function seedRowValues(resource: SchoolResource, id: string) {
  const row = localSeedData[resource].find((item) => item.id === id);
  return row ? row.values || rowToArray(resource, row) : null;
}

function normalizeLocalRow(resource: SchoolResource, row: LocalResourceRow): LocalResourceRow {
  const columns = resourceColumns[resource];
  const seedValues = seedRowValues(resource, row.id);
  const values = row.values ? [...row.values] : rowToArray(resource, row);

  if (resource === "students" && values.length === columns.length - 1) {
    values.push(seedValues?.[columns.length - 1] ?? "");
  }

  if (resource === "grades" && values.length === columns.length - 1) {
    values.push(seedValues?.[columns.length - 1] ?? "");
  }

  return {
    ...row,
    values: columns.map((_, index) => stringValue(values[index] ?? seedValues?.[index] ?? "")),
    createdAt: stringValue(row.createdAt) || new Date().toISOString()
  };
}

function normalizeLocalStore(value: unknown): LocalStore {
  const base = cloneSeedData();

  if (!value || typeof value !== "object") return base;

  const parsed = value as Partial<Record<SchoolResource, LocalResourceRow[]>>;

  for (const resource of Object.keys(resourceColumns) as SchoolResource[]) {
    const rows = parsed[resource];

    if (Array.isArray(rows)) {
      base[resource] = rows.map((row) => normalizeLocalRow(resource, row));
    }
  }

  return base;
}

async function readLocalStore() {
  try {
    const file = await readFile(localStorePath, "utf8");
    return normalizeLocalStore(JSON.parse(file) as unknown);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      console.warn("Local school store could not be read. Recreating seed data.", error);
    }

    const store = cloneSeedData();
    await writeLocalStore(store);
    return store;
  }
}

async function writeLocalStore(store: LocalStore) {
  await mkdir(path.dirname(localStorePath), { recursive: true });
  await writeFile(localStorePath, `${JSON.stringify(store, null, 2)}\n`, "utf8");
}

function toResourceTable(resource: SchoolResource, rows: LocalResourceRow[]): ResourceTable {
  const sortedRows = [...rows].sort((first, second) => {
    const byDate = new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime();
    return byDate || second.id.localeCompare(first.id);
  });

  return {
    columns: resourceColumns[resource],
    ids: sortedRows.map((row) => row.id),
    rows: sortedRows.map((row) => row.values || rowToArray(resource, row))
  };
}

async function listLocalResource(resource: SchoolResource): Promise<ResourceTable> {
  const store = await readLocalStore();
  return toResourceTable(resource, store[resource]);
}

function valuesForCreatedResource(resource: SchoolResource, values: Record<string, string>) {
  switch (resource) {
    case "students":
      return [
        values.Name,
        values.Email || `${Date.now().toString().slice(-6)}@educore.mn`,
        values.Subjects?.trim() || defaultStudentSubjectsValue,
        values.Attendance ?? "0%",
        values.GPA ?? "0",
        values.Payment || "Unpaid",
        values["Parent Email"] ?? ""
      ].map(stringValue);
    case "teachers":
      return [
        values.Name,
        values.Email || `${Date.now().toString().slice(-6)}@educore.mn`,
        values.Subject,
        values.Experience,
        values.Salary,
        phoneValue(values.Contact)
      ].map(stringValue);
    case "parents":
      return [
        values.Name,
        values.Email || `${Date.now().toString().slice(-6)}@educore.mn`,
        values.Student,
        values.Phone,
        values.Occupation
      ].map(stringValue);
    case "subjects":
      return [values.Name, values.Code, values.Description, values.Teacher, values.Category, values["Grade Levels"]].map(stringValue);
    case "assignments":
      return [values.Subject, values.Title, values.Type ?? "Homework", values["Due Date"] ?? "", values["Max Score"] ?? "100", values.Description ?? ""].map(stringValue);
    case "materials":
      return [values.Subject, values.Title, values["File Type"] ?? "", values["Uploaded By"] ?? ""].map(stringValue);
    case "attendance":
      return [values.Student, values.Subject, values.Date || new Date().toISOString().slice(0, 10), values.Status || "Present"].map(stringValue);
    case "grades":
      return [values.Student, values.Subject, `${numberValue(values.Score)}`, values.Semester ?? ""].map(stringValue);
    case "payments":
      return [values.Student, values.Amount || "$0", values.Status || "Unpaid", values["Due Date"] ?? ""].map(stringValue);
    case "timetable":
      return [values.Subject, values.Day, values.Time ?? "", values.Teacher ?? "", values.Class ?? ""].map(stringValue);
    case "announcements":
      return [values.Title, values.Content ?? "", values.Audience || "All", values.Date ?? new Date().toISOString().slice(0, 10)].map(stringValue);
    case "wellbeing":
      return [values.Question, values.Category || "General", values.Note ?? "", values.Date || new Date().toISOString().slice(0, 10)].map(stringValue);
  }
}

async function createLocalResource(resource: SchoolResource, values: Record<string, string>) {
  const store = await readLocalStore();
  const row: LocalResourceRow = {
    id: `${resource.slice(0, 2).toUpperCase()}-${Date.now().toString().slice(-6)}`,
    values: valuesForCreatedResource(resource, values),
    createdAt: new Date().toISOString()
  };

  store[resource] = [row, ...store[resource]];
  await writeLocalStore(store);
  return toResourceTable(resource, store[resource]);
}

async function updateLocalResource(resource: SchoolResource, id: string, values: Record<string, string>) {
  const store = await readLocalStore();
  const columns = resourceColumns[resource];
  const row = store[resource].find((item) => item.id === id);

  if (row) {
    row.values = columns.map((column) => stringValue(values[column]));
  }

  await writeLocalStore(store);
  return toResourceTable(resource, store[resource]);
}

async function deleteLocalResource(resource: SchoolResource, id: string) {
  const store = await readLocalStore();
  store[resource] = store[resource].filter((row) => row.id !== id);
  await writeLocalStore(store);
  return toResourceTable(resource, store[resource]);
}

/**
 * A rule the caller broke — a duplicate parent, a missing subject. Unlike a
 * dropped connection this must never fall through to the local file store:
 * doing so writes the rejected row anyway and answers 201, which is how a
 * student ended up with two parents.
 */
class ValidationError extends Error {}

function logDatabaseFallback(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  console.warn(`PostgreSQL unavailable; using local file store at ${localStorePath}.`, message);
}

function rowToArray(resource: SchoolResource, row: QueryRow | DbRow | LocalResourceRow) {
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
      return [row.subject, row.title, row.type, row.due_date, row.max_score, row.description].map(stringValue);
    case "materials":
      return [row.subject, row.title, row.file_type, row.uploaded_by_name || row.uploaded_by].map(stringValue);
    case "attendance":
      return [row.student, row.subject, row.date, row.status].map(stringValue);
    case "grades":
      return [row.student, row.subject, `${row.score}`, row.semester].map(stringValue);
    case "payments":
      return [row.student, row.amount, row.status, row.due_date].map(stringValue);
    case "timetable":
      return [row.subject, row.day, row.time, row.teacher, row.class_name].map(stringValue);
    case "announcements":
      return [row.title, row.content, row.audience, row.date].map(stringValue);
    case "wellbeing":
      return [row.question, row.category, row.note, row.date].map(stringValue);
  }
}

function tableName(resource: SchoolResource) {
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
    wellbeing: "wellbeing_prompts"
  };

  return names[resource];
}

export function isSchoolResource(resource: string): resource is SchoolResource {
  return resource in resourceColumns;
}

function normalizedToken(value: unknown) {
  return stringValue(value).trim().toLowerCase();
}

function csvList(value: unknown) {
  return stringValue(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

async function fetchRawTable(resource: SchoolResource): Promise<DbRow[] | LocalResourceRow[]> {
  try {
    await ensureSchoolDatabase();
    const result = await getPool().query<QueryRow>(`SELECT * FROM ${tableName(resource)} ORDER BY created_at DESC, id DESC`);
    return result.rows as DbRow[];
  } catch (error) {
    logDatabaseFallback(error);
    const store = await readLocalStore();
    return store[resource];
  }
}

async function subjectRows() {
  return fetchRawTable("subjects");
}

async function allowedSubjectNames(context: SchoolRequestContext) {
  const role = context.session.role;
  const email = context.session.email;

  if (role === "admin") {
    const rows = await subjectRows();
    return new Set(rows.map((row) => normalizedToken(row.name)).filter(Boolean));
  }

  if (role === "teacher") {
    const teachers = await fetchRawTable("teachers");
    const teacher = teachers.find((row) => normalizedToken((row as DbRow).email) === normalizedToken(email));
    return new Set(csvList((teacher as DbRow | undefined)?.subject).map(normalizedToken).filter(Boolean));
  }

  if (role === "student") {
    const students = await fetchRawTable("students");
    const student = students.find((row) => normalizedToken((row as DbRow).email) === normalizedToken(email));
    return new Set(csvList((student as DbRow | undefined)?.subjects).map(normalizedToken).filter(Boolean));
  }

  if (role === "parent") {
    const parents = await fetchRawTable("parents");
    const parent = parents.find((row) => normalizedToken((row as DbRow).email) === normalizedToken(email));
    const studentEmail = normalizedToken((parent as DbRow | undefined)?.student_email);
    if (!studentEmail) return new Set<string>();

    const students = await fetchRawTable("students");
    const student = students.find((row) => normalizedToken((row as DbRow).email) === studentEmail);
    return new Set(csvList((student as DbRow | undefined)?.subjects).map(normalizedToken).filter(Boolean));
  }

  return new Set<string>();
}

function filterByColumnValues(table: ResourceTable, columnName: string, allowedValues: Set<string>) {
  const index = table.columns.findIndex((column) => column.toLowerCase() === columnName.toLowerCase());
  if (index < 0) return { ...table, ids: [], rows: [] };

  const ids: string[] = [];
  const rows: string[][] = [];

  table.rows.forEach((row, rowIndex) => {
    const values = csvList(row[index]).map(normalizedToken);
    const matches = values.some((value) => allowedValues.has(value));
    if (matches) {
      rows.push(row);
      ids.push(table.ids[rowIndex] ?? "");
    }
  });

  return { ...table, ids, rows };
}

async function filterResourceTable(
  resource: SchoolResource,
  table: ResourceTable,
  context: SchoolRequestContext,
  accessibleSubjects: Set<string>,
  allSubjects: DbRow[]
) {
  const role = context.session.role;
  const email = normalizedToken(context.session.email);
  const subjectNameById = (subjectId: string) => {
    const normalized = normalizedToken(subjectId);
    const match = allSubjects.find((row) => normalizedToken((row as DbRow).id) === normalized || normalizedToken((row as DbRow).code) === normalized);
    return normalizedToken(match?.name);
  };

  if (resource === "students") {
    if (role === "admin") return table;
    if (role === "teacher") return filterByColumnValues(table, "Subjects", accessibleSubjects);
    if (role === "student") {
      const index = table.columns.findIndex((column) => column.toLowerCase() === "email");
      if (index < 0) return { ...table, ids: [], rows: [] };
      return {
        ...table,
        ids: table.ids.filter((_, rowIndex) => normalizedToken(table.rows[rowIndex]?.[index]) === email),
        rows: table.rows.filter((row) => normalizedToken(row[index]) === email)
      };
    }
    if (role === "parent") {
      const index = table.columns.findIndex((column) => column.toLowerCase() === "parent email");
      if (index < 0) return { ...table, ids: [], rows: [] };
      return {
        ...table,
        ids: table.ids.filter((_, rowIndex) => normalizedToken(table.rows[rowIndex]?.[index]) === email),
        rows: table.rows.filter((row) => normalizedToken(row[index]) === email)
      };
    }
  }

  if (resource === "teachers") {
    if (role === "admin") return table;
    if (role === "teacher") {
      const index = table.columns.findIndex((column) => column.toLowerCase() === "email");
      if (index < 0) return { ...table, ids: [], rows: [] };
      return {
        ...table,
        ids: table.ids.filter((_, rowIndex) => normalizedToken(table.rows[rowIndex]?.[index]) === email),
        rows: table.rows.filter((row) => normalizedToken(row[index]) === email)
      };
    }
    return { ...table, ids: [], rows: [] };
  }

  if (resource === "parents") {
    if (role === "admin") return table;
    if (role === "parent") {
      const index = table.columns.findIndex((column) => column.toLowerCase() === "email");
      if (index < 0) return { ...table, ids: [], rows: [] };
      return {
        ...table,
        ids: table.ids.filter((_, rowIndex) => normalizedToken(table.rows[rowIndex]?.[index]) === email),
        rows: table.rows.filter((row) => normalizedToken(row[index]) === email)
      };
    }
    return { ...table, ids: [], rows: [] };
  }

  if (resource === "subjects") {
    if (role === "admin") return table;
    return filterByColumnValues(table, "Name", accessibleSubjects);
  }

  if (resource === "assignments" || resource === "materials" || resource === "attendance" || resource === "grades" || resource === "timetable") {
    if (role === "admin") {
      const subjectId = normalizedToken(context.subjectId);
      if (subjectId) {
        const index = table.columns.findIndex((column) => column.toLowerCase() === "subject");
        if (index >= 0) {
          const targetName = subjectNameById(subjectId);
          const filtered = table.rows.map((row) => normalizedToken(row[index]) === targetName);
          return {
            ...table,
            ids: table.ids.filter((_, rowIndex) => filtered[rowIndex]),
            rows: table.rows.filter((row) => normalizedToken(row[index]) === targetName)
          };
        }
      }
      return table;
    }

    const index = table.columns.findIndex((column) => column.toLowerCase() === "subject");
    if (index < 0) return { ...table, ids: [], rows: [] };

    const subjectFilter = normalizedToken(context.subjectId);
    if (context.mode === "page" && (role === "student" || role === "parent") && !subjectFilter) {
      return { ...table, ids: [], rows: [] };
    }

    const allowed = subjectFilter ? new Set([subjectNameById(subjectFilter) || subjectFilter]) : accessibleSubjects;
    return filterByColumnValues(table, "Subject", allowed);
  }

  if (resource === "payments") {
    if (role === "admin") return table;
    if (role === "teacher") return { ...table, ids: [], rows: [] };

    const studentSet = new Set<string>();
    const studentsIndex = table.columns.findIndex((column) => column.toLowerCase() === "student");
    if (studentsIndex < 0) return { ...table, ids: [], rows: [] };

    if (role === "student") {
      const students = await fetchRawTable("students");
      const student = students.find((row) => normalizedToken((row as DbRow).email) === email);
      if (!student) return { ...table, ids: [], rows: [] };
      studentSet.add(normalizedToken((student as DbRow).full_name));
    }

    if (role === "parent") {
      const parents = await fetchRawTable("parents");
      const parent = parents.find((row) => normalizedToken((row as DbRow).email) === email);
      const studentEmail = normalizedToken((parent as DbRow | undefined)?.student_email);
      if (!studentEmail) return { ...table, ids: [], rows: [] };
      const students = await fetchRawTable("students");
      const student = students.find((row) => normalizedToken((row as DbRow).email) === studentEmail);
      if (student) studentSet.add(normalizedToken((student as DbRow).full_name));
    }

    return {
      ...table,
      ids: table.ids.filter((_, rowIndex) => studentSet.has(normalizedToken(table.rows[rowIndex]?.[studentsIndex]))),
      rows: table.rows.filter((row) => studentSet.has(normalizedToken(row[studentsIndex])))
    };
  }

  return table;
}

async function fetchFilteredTable(resource: SchoolResource, context: SchoolRequestContext) {
  const rawRows = await fetchRawTable(resource);
  const allSubjects = (await subjectRows()) as DbRow[];
  const table: ResourceTable = {
    columns: resourceColumns[resource],
    ids: rawRows.map((row) => stringValue((row as DbRow).id ?? (row as LocalResourceRow).id)),
    rows: rawRows.map((row) => rowToArray(resource, row))
  };

  const accessibleSubjects = await allowedSubjectNames(context);
  return await filterResourceTable(resource, table, context, accessibleSubjects, allSubjects);
}

export async function listResource(resource: SchoolResource, context: SchoolRequestContext): Promise<ResourceTable> {
  if (context.mode === "page" && (resource === "attendance" || resource === "grades" || resource === "assignments" || resource === "materials" || resource === "timetable")) {
    if ((context.session.role === "student" || context.session.role === "parent") && !context.subjectId) {
      throw new Error("subjectId is required.");
    }
  }

  try {
    await ensureSchoolDatabase();
    return await fetchFilteredTable(resource, context);
  } catch (error) {
    logDatabaseFallback(error);
    return fetchFilteredTable(resource, context);
  }
}

function manageRolesFor(resource: SchoolResource) {
  switch (resource) {
    case "students":
    case "teachers":
    case "parents":
    case "subjects":
    case "payments":
    case "announcements":
    case "wellbeing":
      return new Set<Role>(["admin"]);
    case "attendance":
    case "grades":
    case "assignments":
    case "materials":
    case "timetable":
      return new Set<Role>(["admin", "teacher"]);
    default:
      return new Set<Role>(["admin"]);
  }
}

function requireManageAccess(resource: SchoolResource, role: Role) {
  if (!manageRolesFor(resource).has(role)) {
    throw new Error("You do not have permission to manage this resource.");
  }
}

async function resolveSubjectByToken(pool: Pool | null, token: string) {
  const normalized = token.trim();
  if (!normalized) return null;

  if (pool) {
    const result = await pool.query<QueryRow>(
      `
      SELECT id, name, code, teacher_id
      FROM subjects
      WHERE id = $1 OR code = $1 OR name = $1
      LIMIT 1
    `,
      [normalized]
    );

    return result.rows[0] ?? null;
  }

  const store = await readLocalStore();
  return store.subjects.find((row) => normalizedToken(row.id) === normalizedToken(token) || normalizedToken((row as DbRow).code) === normalizedToken(token) || normalizedToken((row as DbRow).name) === normalizedToken(token)) ?? null;
}

async function resolveTeacherByToken(pool: Pool | null, token: string) {
  const normalized = token.trim();
  if (!normalized) return null;

  if (pool) {
    const result = await pool.query<QueryRow>(
      `
      SELECT id, name, email, subject, subject_id
      FROM teachers
      WHERE id = $1 OR email = $1 OR name = $1
      LIMIT 1
    `,
      [normalized]
    );

    return result.rows[0] ?? null;
  }

  const store = await readLocalStore();
  return store.teachers.find((row) => normalizedToken(row.id) === normalizedToken(token) || normalizedToken((row as DbRow).email) === normalizedToken(token) || normalizedToken((row as DbRow).name) === normalizedToken(token)) ?? null;
}

async function resolveStudentByToken(pool: Pool | null, token: string) {
  const normalized = token.trim();
  if (!normalized) return null;

  if (pool) {
    const result = await pool.query<QueryRow>(
      `
      SELECT id, full_name, email, subjects, parent_email, parent_id
      FROM students
      WHERE id = $1 OR email = $1 OR full_name = $1
      LIMIT 1
    `,
      [normalized]
    );

    return result.rows[0] ?? null;
  }

  const store = await readLocalStore();
  return store.students.find((row) => normalizedToken(row.id) === normalizedToken(token) || normalizedToken((row as DbRow).email) === normalizedToken(token) || normalizedToken((row as DbRow).full_name) === normalizedToken(token)) ?? null;
}

async function resolveParentByToken(pool: Pool | null, token: string) {
  const normalized = token.trim();
  if (!normalized) return null;

  if (pool) {
    const result = await pool.query<QueryRow>(
      `
      SELECT id, name, email, student, student_email, student_id
      FROM parents
      WHERE id = $1 OR email = $1 OR name = $1
      LIMIT 1
    `,
      [normalized]
    );

    return result.rows[0] ?? null;
  }

  const store = await readLocalStore();
  return store.parents.find((row) => normalizedToken(row.id) === normalizedToken(token) || normalizedToken((row as DbRow).email) === normalizedToken(token) || normalizedToken((row as DbRow).name) === normalizedToken(token)) ?? null;
}

function subjectNamesFromTokens(tokens: string[]) {
  return tokens.map((token) => token.trim()).filter(Boolean);
}

/**
 * Falls back to the school-wide default set. A student with no subjects can see
 * nothing at all, so an empty field is never what the administrator meant.
 */
function getRequestedSubjects(values: Record<string, string>) {
  const requested = subjectNamesFromTokens(csvList(values.Subjects));
  return requested.length > 0 ? requested : [...defaultStudentSubjects];
}

async function replaceStudentSubjects(pool: Pool, studentId: string, subjectPairs: { id: string; name: string }[]) {
  await pool.query(`DELETE FROM student_subjects WHERE student_id = $1`, [studentId]);
  for (const subject of subjectPairs) {
    await pool.query(`INSERT INTO student_subjects (student_id, subject_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [studentId, subject.id]);
  }
}

async function getAssignedSubjectNameForTeacher(pool: Pool, teacherEmail: string) {
  const result = await pool.query<QueryRow>(
    `
    SELECT s.name
    FROM teachers t
    JOIN subjects s ON s.teacher_id = t.id
    WHERE t.email = $1
    LIMIT 1
  `,
    [teacherEmail]
  );

  return stringValue(result.rows[0]?.name);
}

async function ensureTeacherSubject(pool: Pool, context: SchoolRequestContext | undefined, subjectToken: string | undefined) {
  if (!context || context.session.role !== "teacher") {
    return subjectToken;
  }

  const assignedSubject = await getAssignedSubjectNameForTeacher(pool, context.session.email);
  if (!assignedSubject) {
    throw new ValidationError("Teacher does not have an assigned subject.");
  }

  const requestedSubject = stringValue(subjectToken).trim();
  if (requestedSubject && normalizedToken(requestedSubject) !== normalizedToken(assignedSubject)) {
    throw new ValidationError("Teachers can only manage their assigned subject.");
  }

  return assignedSubject;
}

/**
 * A school record does not by itself let that person sign in — the login lives
 * in `app_users`. When the administrator supplies a password we provision both.
 *
 * The two must share an email. Row-level access looks the session email up in
 * `students.email` (a student) or `parents.email` (a parent), so a mismatch
 * signs them into an app with nothing in it.
 *
 * `create` refuses an email that is already taken; `set` also accepts an
 * existing account and just changes its password, which is how someone added
 * before this field existed finally gets a login.
 */
async function applyLogin(
  mode: "create" | "set",
  role: Extract<Role, "student" | "parent" | "teacher">,
  values: Record<string, string>,
  /** What the account is tied to: a parent's child, or a teacher's subject. */
  link?: { studentEmail?: string; subject?: string }
) {
  const password = values.Password?.trim();
  if (!password) return;

  const email = values.Email?.trim();
  if (!email) {
    throw new ValidationError("Email is required when you set a password.");
  }

  const account = { email, password, name: values.Name?.trim() || email, role, ...link };

  try {
    if (mode === "create") {
      await createAccount(account);
    } else {
      await setAccountPassword(account);
    }
  } catch (error) {
    if (error instanceof AccountConflictError) {
      throw new ValidationError(`An account with this ${error.field} already exists.`);
    }
    throw error;
  }
}

export async function createResource(resource: SchoolResource, values: Record<string, string>, context?: SchoolRequestContext) {
  // Outside the try: a permission failure is not a database failure, and must
  // never fall through to the local-store write below.
  requireManageAccess(resource, context?.session.role ?? "admin");

  if (resource === "students") {
    await applyLogin("create", "student", values);
  }

  try {
    await ensureSchoolDatabase();

    const pool = getPool();
    const id = `${resource.slice(0, 2).toUpperCase()}-${Date.now().toString().slice(-6)}`;

    switch (resource) {
      case "students": {
        const subjects = getRequestedSubjects(values);
        await pool.query(
          `
          INSERT INTO students (id, email, full_name, phone, gender, birth_date, address, parent_name, parent_email, roll_number, attendance, gpa, payment_status, subjects)
          VALUES ($1, $2, $3, $4, 'Unknown', '', '', $5, $6, $7, 0, 0, $8, $9)
        `,
          [id, values.Email || `${id.toLowerCase()}@educore.mn`, values.Name, values.Phone ?? "", values["Parent name"] ?? "", values["Parent Email"] ?? "", id, values.Payment ?? "Unpaid", subjects.join(", ")]
        );
        const subjectPairs = await Promise.all(subjects.map(async (subjectToken) => {
          const subject = await resolveSubjectByToken(pool, subjectToken);
          return subject ? { id: stringValue(subject.id), name: stringValue(subject.name) } : null;
        }));
        await replaceStudentSubjects(pool, id, subjectPairs.filter((item): item is { id: string; name: string } => Boolean(item)));
        break;
      }
      case "teachers": {
        const subject = await resolveSubjectByToken(pool, values.Subject);
        if (!subject) throw new ValidationError("Subject is required.");
        const existingTeacher = await pool.query<QueryRow>(`SELECT id, subject_id FROM teachers WHERE subject_id = $1 AND id <> $2 LIMIT 1`, [subject.id, id]);
        if (existingTeacher.rows.length > 0) throw new ValidationError("That subject already has a teacher.");
        await applyLogin("create", "teacher", values, { subject: stringValue(subject.name) });
        await pool.query(
          `
          INSERT INTO teachers (id, email, name, subject, subject_id, experience, salary, contact)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `,
          [id, values.Email || `${id.toLowerCase()}@educore.mn`, values.Name, stringValue(subject.name), stringValue(subject.id), values.Experience ?? "", values.Salary ?? "", phoneValue(values.Contact)]
        );
        await pool.query(`UPDATE subjects SET teacher_id = $1, teacher = $2 WHERE id = $3`, [id, values.Name, subject.id]);
        break;
      }
      case "parents": {
        const student = await resolveStudentByToken(pool, values.Student);
        if (!student) throw new ValidationError("Student is required.");
        if (stringValue((student as DbRow).parent_id)) throw new ValidationError("This student already has a parent account.");
        // Before the INSERT: a taken email must fail without leaving a parent
        // row that nobody can sign in as.
        await applyLogin("create", "parent", values, { studentEmail: stringValue((student as DbRow).email) });
        await pool.query(
          `
          INSERT INTO parents (id, email, name, student, student_email, student_id, phone, occupation)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `,
          [id, values.Email || `${id.toLowerCase()}@educore.mn`, values.Name, stringValue((student as DbRow).full_name), stringValue((student as DbRow).email), stringValue((student as DbRow).id), values.Phone ?? "", values.Occupation ?? ""]
        );
        await pool.query(`UPDATE students SET parent_id = $1, parent_email = $2, parent_name = $3 WHERE id = $4`, [id, values.Email || `${id.toLowerCase()}@educore.mn`, values.Name, stringValue((student as DbRow).id)]);
        break;
      }
      case "subjects": {
        const teacher = values.Teacher ? await resolveTeacherByToken(pool, values.Teacher) : null;
        if (teacher && stringValue((teacher as DbRow).subject_id)) throw new ValidationError("That teacher is already assigned to another subject.");
        await pool.query(
          `
          INSERT INTO subjects (id, code, name, description, teacher, category, grade_levels, teacher_id)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `,
          [id, values.Code ?? id, values.Name, values.Description ?? "", teacher ? stringValue((teacher as DbRow).name) : "", values.Category ?? "", values["Grade Levels"] ?? "", teacher ? stringValue((teacher as DbRow).id) : null]
        );
        if (teacher) {
          await pool.query(`UPDATE teachers SET subject_id = $1, subject = $2 WHERE id = $3`, [id, values.Name, stringValue((teacher as DbRow).id)]);
        }
        break;
      }
      case "assignments": {
        const subject = values.Subject ? await resolveSubjectByToken(pool, values.Subject) : null;
        const subjectName = subject ? stringValue(subject.name) : values.Subject;
        const teacherName = context?.session.role === "teacher" ? (await getAssignedSubjectNameForTeacher(pool, context.session.email)) : values.Teacher ?? "";
        await pool.query(
          `
          INSERT INTO assignments (id, subject_id, subject, teacher_id, teacher, title, description, type, max_score, due_date)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `,
          [id, subject ? stringValue(subject.id) : "", subjectName, "", teacherName, values.Title, values.Description ?? "", values.Type ?? "Homework", numberValue(values["Max Score"] ?? 100), values["Due Date"] ?? ""]
        );
        break;
      }
      case "materials": {
        const subject = values.Subject ? await resolveSubjectByToken(pool, values.Subject) : null;
        const subjectName = subject ? stringValue(subject.name) : values.Subject;
        await pool.query(
          `
          INSERT INTO learning_materials (id, subject_id, subject, uploaded_by, uploaded_by_name, title, file_url, file_type)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `,
          [id, subject ? stringValue(subject.id) : "", subjectName, context?.session.email ?? "", context?.session.name ?? "", values.Title, values["File URL"] ?? "", values["File Type"] ?? ""]
        );
        break;
      }
      case "attendance": {
        const subject = values.Subject ? await resolveSubjectByToken(pool, values.Subject) : null;
        const subjectName = subject ? stringValue(subject.name) : values.Subject;
        const student = await resolveStudentByToken(pool, values.Student);
        await pool.query(
          `
          INSERT INTO attendance_records (id, student_id, subject_id, student, subject, date, status, recorded_by)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `,
          [id, stringValue((student as DbRow | null)?.id), subject ? stringValue(subject.id) : "", values.Student, subjectName, values.Date ?? new Date().toISOString().slice(0, 10), values.Status ?? "Present", context?.session.email ?? ""]
        );
        break;
      }
      case "grades": {
        const subject = values.Subject ? await resolveSubjectByToken(pool, values.Subject) : null;
        const student = await resolveStudentByToken(pool, values.Student);
        await pool.query(
          `
          INSERT INTO grade_records (id, student_id, subject_id, student, subject, score, semester, entered_by)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `,
          [id, stringValue((student as DbRow | null)?.id), subject ? stringValue(subject.id) : "", values.Student, subject ? stringValue(subject.name) : values.Subject, numberValue(values.Score), values.Semester ?? "", context?.session.email ?? ""]
        );
        break;
      }
      case "payments":
        await pool.query(
          `INSERT INTO payment_records (id, student, amount, status, due_date)
           VALUES ($1, $2, $3, $4, $5)`,
          [id, values.Student, values.Amount ?? "$0", values.Status ?? "Unpaid", values["Due Date"] ?? ""]
        );
        break;
      case "timetable": {
        const subject = values.Subject ? await resolveSubjectByToken(pool, values.Subject) : null;
        await pool.query(
          `
          INSERT INTO timetable_slots (id, subject_id, subject, teacher_id, teacher, class_name, day, time)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `,
          [id, subject ? stringValue(subject.id) : "", subject ? stringValue(subject.name) : values.Subject, "", values.Teacher ?? "", values.Class ?? "", values.Day ?? "", values.Time ?? ""]
        );
        break;
      }
      case "announcements":
        await pool.query(
          `INSERT INTO announcements (id, title, content, audience, date)
           VALUES ($1, $2, $3, $4, $5)`,
          [id, values.Title, values.Content ?? "", values.Audience ?? "All", values.Date ?? new Date().toISOString().slice(0, 10)]
        );
        break;
      case "wellbeing":
        await pool.query(
          `INSERT INTO wellbeing_prompts (id, question, category, note, date)
           VALUES ($1, $2, $3, $4, $5)`,
          [id, values.Question, values.Category || "General", values.Note ?? "", values.Date || new Date().toISOString().slice(0, 10)]
        );
        break;
    }

    return listResource(resource, context ?? { session: { role: "admin", email: "", name: "", avatarUrl: "", source: "neon" }, mode: "summary" });
  } catch (error) {
    if (error instanceof ValidationError) throw error;
    logDatabaseFallback(error);
    return createLocalResource(resource, values);
  }
}

export async function deleteResource(resource: SchoolResource, id: string, context?: SchoolRequestContext) {
  requireManageAccess(resource, context?.session.role ?? "admin");

  try {
    await ensureSchoolDatabase();

    // Deleting a parent has to release the student too. students.parent_id is
    // what blocks a second parent, so leaving it set would strand that student:
    // they could never be attached to anyone again.
    if (resource === "parents") {
      await getPool().query(
        `UPDATE students SET parent_id = NULL, parent_email = '', parent_name = '' WHERE parent_id = $1`,
        [id]
      );
    }

    // Likewise a subject must not keep showing a teacher who no longer exists.
    if (resource === "teachers") {
      await getPool().query(`UPDATE subjects SET teacher_id = NULL, teacher = '' WHERE teacher_id = $1`, [id]);
    }

    await getPool().query(`DELETE FROM ${tableName(resource)} WHERE id = $1`, [id]);
    return listResource(resource, context ?? { session: { role: "admin", email: "", name: "", avatarUrl: "", source: "neon" }, mode: "summary" });
  } catch (error) {
    if (error instanceof ValidationError) throw error;
    logDatabaseFallback(error);
    return deleteLocalResource(resource, id);
  }
}

export async function updateResource(resource: SchoolResource, id: string, values: Record<string, string>, context?: SchoolRequestContext) {
  requireManageAccess(resource, context?.session.role ?? "admin");

  if (resource === "students") {
    await applyLogin("set", "student", values);
  }

  try {
    await ensureSchoolDatabase();
    const pool = getPool();

    switch (resource) {
      case "students": {
        const subjects = getRequestedSubjects(values);
        // COALESCE on the fields the edit dialog does not show: passing "" for a
        // key the form never sent would erase a value the admin cannot even see.
        await pool.query(
          `
          UPDATE students
          SET full_name = $1, email = $2, subjects = $3, attendance = $4, gpa = $5, payment_status = $6, parent_email = $7, parent_name = COALESCE($8, parent_name)
          WHERE id = $9
        `,
          [values.Name, values.Email ?? "", subjects.join(", "), numberValue(values.Attendance), numberValue(values.GPA), values.Payment ?? "Unpaid", values["Parent Email"] ?? "", values["Parent name"] ?? null, id]
        );
        const subjectPairs = await Promise.all(subjects.map(async (subjectToken) => {
          const subject = await resolveSubjectByToken(pool, subjectToken);
          return subject ? { id: stringValue(subject.id), name: stringValue(subject.name) } : null;
        }));
        await replaceStudentSubjects(pool, id, subjectPairs.filter((item): item is { id: string; name: string } => Boolean(item)));
        break;
      }
      case "teachers": {
        const subject = await resolveSubjectByToken(pool, values.Subject);
        if (!subject) throw new ValidationError("Subject is required.");
        const conflictingTeacher = await pool.query<QueryRow>(`SELECT id FROM teachers WHERE subject_id = $1 AND id <> $2 LIMIT 1`, [subject.id, id]);
        if (conflictingTeacher.rows.length > 0) throw new ValidationError("That subject already has a teacher.");
        await applyLogin("set", "teacher", values, { subject: stringValue(subject.name) });
        await pool.query(
          `
          UPDATE teachers
          SET name = $1, email = $2, subject = $3, subject_id = $4, experience = COALESCE($5, experience), salary = $6, contact = $7
          WHERE id = $8
        `,
          [values.Name, values.Email ?? "", stringValue(subject.name), stringValue(subject.id), values.Experience ?? null, values.Salary ?? "", phoneValue(values.Contact), id]
        );
        await pool.query(`UPDATE subjects SET teacher_id = $1, teacher = $2 WHERE id = $3`, [id, values.Name, subject.id]);
        break;
      }
      case "parents": {
        const student = await resolveStudentByToken(pool, values.Student);
        if (!student) throw new ValidationError("Student is required.");
        const conflictingParent = await pool.query<QueryRow>(`SELECT id FROM parents WHERE student_id = $1 AND id <> $2 LIMIT 1`, [stringValue((student as DbRow).id), id]);
        if (conflictingParent.rows.length > 0) throw new ValidationError("This student already has a parent account.");
        await applyLogin("set", "parent", values, { studentEmail: stringValue((student as DbRow).email) });
        await pool.query(
          `
          UPDATE parents
          SET name = $1, email = $2, student = $3, student_email = $4, student_id = $5, phone = $6, occupation = COALESCE($7, occupation)
          WHERE id = $8
        `,
          [values.Name, values.Email ?? "", stringValue((student as DbRow).full_name), stringValue((student as DbRow).email), stringValue((student as DbRow).id), values.Phone ?? "", values.Occupation ?? null, id]
        );
        await pool.query(`UPDATE students SET parent_id = $1, parent_email = $2, parent_name = $3 WHERE id = $4`, [id, values.Email ?? "", values.Name, stringValue((student as DbRow).id)]);
        break;
      }
      case "subjects": {
        const teacher = values.Teacher ? await resolveTeacherByToken(pool, values.Teacher) : null;
        if (teacher && stringValue((teacher as DbRow).subject_id) && stringValue((teacher as DbRow).subject_id) !== id) {
          throw new ValidationError("That teacher is already assigned to another subject.");
        }
        await pool.query(
          `
          UPDATE subjects
          SET code = $1, name = $2, description = $3, teacher = $4, category = $5, grade_levels = $6, teacher_id = $7
          WHERE id = $8
        `,
          [values.Code ?? id, values.Name, values.Description ?? "", teacher ? stringValue((teacher as DbRow).name) : "", values.Category ?? "", values["Grade Levels"] ?? "", teacher ? stringValue((teacher as DbRow).id) : null, id]
        );
        if (teacher) {
          await pool.query(`UPDATE teachers SET subject_id = $1, subject = $2 WHERE id = $3`, [id, values.Name, stringValue((teacher as DbRow).id)]);
        }
        break;
      }
      case "assignments": {
        const subject = values.Subject ? await resolveSubjectByToken(pool, values.Subject) : null;
        await pool.query(
          `
          UPDATE assignments
          SET subject_id = $1, subject = $2, title = $3, description = $4, type = $5, max_score = $6, due_date = $7
          WHERE id = $8
        `,
          [subject ? stringValue(subject.id) : "", subject ? stringValue(subject.name) : values.Subject, values.Title, values.Description ?? "", values.Type ?? "Homework", numberValue(values["Max Score"] ?? 100), values["Due Date"] ?? "", id]
        );
        break;
      }
      case "materials": {
        const subject = values.Subject ? await resolveSubjectByToken(pool, values.Subject) : null;
        await pool.query(
          `
          UPDATE learning_materials
          SET subject_id = $1, subject = $2, uploaded_by = $3, uploaded_by_name = $4, title = $5, file_url = $6, file_type = $7
          WHERE id = $8
        `,
          [subject ? stringValue(subject.id) : "", subject ? stringValue(subject.name) : values.Subject, context?.session.email ?? "", context?.session.name ?? "", values.Title, values["File URL"] ?? "", values["File Type"] ?? "", id]
        );
        break;
      }
      case "attendance": {
        const subject = values.Subject ? await resolveSubjectByToken(pool, values.Subject) : null;
        const student = await resolveStudentByToken(pool, values.Student);
        await pool.query(
          `
          UPDATE attendance_records
          SET student_id = $1, subject_id = $2, student = $3, subject = $4, date = $5, status = $6, recorded_by = $7
          WHERE id = $8
        `,
          [stringValue((student as DbRow | null)?.id), subject ? stringValue(subject.id) : "", values.Student, subject ? stringValue(subject.name) : values.Subject, values.Date ?? "", values.Status ?? "Present", context?.session.email ?? "", id]
        );
        break;
      }
      case "grades": {
        const subject = values.Subject ? await resolveSubjectByToken(pool, values.Subject) : null;
        const student = await resolveStudentByToken(pool, values.Student);
        await pool.query(
          `
          UPDATE grade_records
          SET student_id = $1, subject_id = $2, student = $3, subject = $4, score = $5, semester = $6, entered_by = $7
          WHERE id = $8
        `,
          [stringValue((student as DbRow | null)?.id), subject ? stringValue(subject.id) : "", values.Student, subject ? stringValue(subject.name) : values.Subject, numberValue(values.Score), values.Semester ?? "", context?.session.email ?? "", id]
        );
        break;
      }
      case "payments":
        await pool.query(
          `UPDATE payment_records
           SET student = $1, amount = $2, status = $3, due_date = $4
           WHERE id = $5`,
          [values.Student, values.Amount, values.Status, values["Due Date"], id]
        );
        break;
      case "timetable": {
        const subject = values.Subject ? await resolveSubjectByToken(pool, values.Subject) : null;
        await pool.query(
          `
          UPDATE timetable_slots
          SET subject_id = $1, subject = $2, teacher_id = $3, teacher = $4, class_name = $5, day = $6, time = $7
          WHERE id = $8
        `,
          [subject ? stringValue(subject.id) : "", subject ? stringValue(subject.name) : values.Subject, "", values.Teacher ?? "", values.Class ?? "", values.Day ?? "", values.Time ?? "", id]
        );
        break;
      }
      case "announcements":
        await pool.query(
          `UPDATE announcements
           SET title = $1, content = $2, audience = $3, date = $4
           WHERE id = $5`,
          [values.Title, values.Content, values.Audience, values.Date, id]
        );
        break;
      case "wellbeing":
        await pool.query(
          `UPDATE wellbeing_prompts
           SET question = $1, category = $2, note = $3, date = $4
           WHERE id = $5`,
          [values.Question, values.Category, values.Note, values.Date, id]
        );
        break;
    }

    return listResource(resource, context ?? { session: { role: "admin", email: "", name: "", avatarUrl: "", source: "neon" }, mode: "summary" });
  } catch (error) {
    if (error instanceof ValidationError) throw error;
    logDatabaseFallback(error);
    return updateLocalResource(resource, id, values);
  }
}
