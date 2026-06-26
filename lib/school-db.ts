import { Pool } from "pg";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import type { NavModule } from "@/lib/types";
import { getCurrentUserEmailAndRole } from "./supabase";
import { subjectCatalog } from "@/lib/subjects";

export type SchoolResource = Exclude<NavModule, "dashboard" | "settings">;

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

type LocalStore = Record<SchoolResource, LocalResourceRow[]>;

declare global {
  var eduCorePool: Pool | undefined;
  var eduCoreReady: Promise<void> | undefined;
}

const resourceColumns: Record<SchoolResource, string[]> = {
  students: ["Name", "Class", "Attendance", "GPA", "Payment", "Parent Email"],
  teachers: ["Name", "Subject", "Email", "Experience", "Salary", "Contact", "Classes"],
  subjects: ["Name", "Category", "Grade Levels"],
  classes: ["Class", "Section", "Teacher", "Students", "Schedule"],
  attendance: ["Student", "Class", "Date", "Status"],
  grades: ["Student", "Subject", "Score", "Semester", "Student Email"],
  payments: ["Student", "Amount", "Status", "Due Date"],
  timetable: ["Day", "Time", "Subject", "Teacher", "Class"],
  announcements: ["Title", "Content", "Audience", "Date"]
};

const localStoreRoot = process.env.VERCEL ? path.join(tmpdir(), "educore") : path.join(process.cwd(), ".local-data");
const localStorePath = path.join(localStoreRoot, "school-store.json");

const localSeedData: LocalStore = {
  students: [],
  teachers: [],
  subjects: subjectCatalog.map((subject) => ({
    id: subject.id,
    name: subject.name,
    category: subject.category,
    grade_levels: subject.gradeLevels,
    createdAt: "2026-05-18T00:00:00.000Z"
  })),
  classes: [],
  attendance: [],
  grades: [],
  payments: [],
  timetable: [],
  announcements: []
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
    CREATE TABLE IF NOT EXISTS students (
      id TEXT PRIMARY KEY,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      gender TEXT NOT NULL,
      birth_date TEXT NOT NULL,
      address TEXT NOT NULL,
      parent_name TEXT NOT NULL,
      parent_email TEXT,
      class_name TEXT NOT NULL,
      roll_number TEXT NOT NULL,
      attendance INTEGER NOT NULL DEFAULT 0,
      gpa NUMERIC NOT NULL DEFAULT 0,
      payment_status TEXT NOT NULL DEFAULT 'Unpaid',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS teachers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      subject TEXT NOT NULL,
      email TEXT NOT NULL,
      experience TEXT NOT NULL,
      salary TEXT NOT NULL,
      contact TEXT NOT NULL,
      classes TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS subjects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT '',
      grade_levels TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS class_rooms (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      section TEXT NOT NULL,
      teacher TEXT NOT NULL,
      students INTEGER NOT NULL DEFAULT 0,
      schedule TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS attendance_records (
      id TEXT PRIMARY KEY,
      student TEXT NOT NULL,
      class_name TEXT NOT NULL,
      date TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS grade_records (
      id TEXT PRIMARY KEY,
      student TEXT NOT NULL,
      student_email TEXT NOT NULL,
      subject TEXT NOT NULL,
      score INTEGER NOT NULL DEFAULT 0,
      semester TEXT NOT NULL,
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
      day TEXT NOT NULL,
      time TEXT NOT NULL,
      subject TEXT NOT NULL,
      teacher TEXT NOT NULL,
      class_name TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS announcements (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      audience TEXT NOT NULL,
      date TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    ALTER TABLE students ADD COLUMN IF NOT EXISTS parent_email TEXT;
    ALTER TABLE grade_records ADD COLUMN IF NOT EXISTS student_email TEXT NOT NULL DEFAULT '';
  `);

  await seedIfEmpty();
}

async function seedIfEmpty() {
  const pool = getPool();

  await pool.query(`
    INSERT INTO subjects (id, name, category, grade_levels)
    VALUES
      ('SB-MATH', 'Mathematics', 'Core', 'Grade 7-12'),
      ('SB-MN-LANG', 'Mongolian Language', 'Core', 'Grade 7-12'),
      ('SB-MN-LIT', 'Mongolian Literature', 'Core', 'Grade 7-12'),
      ('SB-EN', 'English', 'Language', 'Grade 7-12'),
      ('SB-RU', 'Russian', 'Language', 'Grade 7-12'),
      ('SB-HIST', 'History', 'Social Science', 'Grade 7-12'),
      ('SB-SOC', 'Social Studies', 'Social Science', 'Grade 7-12'),
      ('SB-GEO', 'Geography', 'Social Science', 'Grade 7-12'),
      ('SB-PHY', 'Physics', 'Science', 'Grade 8-12'),
      ('SB-CHEM', 'Chemistry', 'Science', 'Grade 8-12'),
      ('SB-BIO', 'Biology', 'Science', 'Grade 7-12'),
      ('SB-CS', 'Computer Science', 'Technology', 'Grade 7-12'),
      ('SB-PE', 'Physical Education', 'Wellbeing', 'Grade 7-12'),
      ('SB-ART', 'Art', 'Arts', 'Grade 7-12'),
      ('SB-MUSIC', 'Music', 'Arts', 'Grade 7-12'),
      ('SB-TECH', 'Technology', 'Technology', 'Grade 7-12'),
      ('SB-HEALTH', 'Health', 'Wellbeing', 'Grade 7-12'),
      ('SB-CIVIC', 'Civic Education', 'Social Science', 'Grade 7-12')
    ON CONFLICT (id) DO NOTHING;
  `);
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
      return [values.Name, values.Class, "0%", "0", values.Payment || "Unpaid", values["Parent Email"]].map(stringValue);
    case "teachers":
      return [
        values.Name,
        values.Subject,
        values.Email,
        values.Experience,
        values.Salary,
        phoneValue(values.Contact),
        values.Classes
      ].map(stringValue);
    case "subjects":
      return [values.Name, values.Category, values["Grade Levels"]].map(stringValue);
    case "classes":
      return [values.Class, values.Section, values.Teacher, "0", "Mon-Fri"].map(stringValue);
    case "attendance":
      return [values.Student, values.Class, values.Date || new Date().toISOString().slice(0, 10), values.Status || "Present"].map(stringValue);
    case "grades":
      return [values.Student, values.Subject, `${numberValue(values.Score)}%`, values.Semester, values["Student Email"]].map(stringValue);
    case "payments":
      return [values.Student, values.Amount || "$0", values.Status || "Unpaid", values["Due Date"]].map(stringValue);
    case "timetable":
      return [values.Day, values.Time, values.Subject, values.Teacher, ""].map(stringValue);
    case "announcements":
      return [values.Title, values.Content, values.Audience || "All", new Date().toISOString().slice(0, 10)].map(stringValue);
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

function logDatabaseFallback(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  console.warn(`PostgreSQL unavailable; using local file store at ${localStorePath}.`, message);
}

function rowToArray(resource: SchoolResource, row: QueryRow | LocalResourceRow) {
  switch (resource) {
    case "students":
      return [row.full_name, row.class_name, `${row.attendance}%`, row.gpa, row.payment_status, row.parent_email].map(stringValue);
    case "teachers":
      return [row.name, row.subject, row.email, row.experience, row.salary, phoneValue(row.contact), row.classes].map(stringValue);
    case "subjects":
      return [row.name, row.category, row.grade_levels].map(stringValue);
    case "classes":
      return [row.name, row.section, row.teacher, row.students, row.schedule].map(stringValue);
    case "attendance":
      return [row.student, row.class_name, row.date, row.status].map(stringValue);
    case "grades":
      return [row.student, row.subject, `${row.score}%`, row.semester, row.student_email].map(stringValue);
    case "payments":
      return [row.student, row.amount, row.status, row.due_date].map(stringValue);
    case "timetable":
      return [row.day, row.time, row.subject, row.teacher, row.class_name].map(stringValue);
    case "announcements":
      return [row.title, row.content, row.audience, row.date].map(stringValue);
  }
}

function tableName(resource: SchoolResource) {
  const names: Record<SchoolResource, string> = {
    students: "students",
    teachers: "teachers",
    subjects: "subjects",
    classes: "class_rooms",
    attendance: "attendance_records",
    grades: "grade_records",
    payments: "payment_records",
    timetable: "timetable_slots",
    announcements: "announcements"
  };

  return names[resource];
}

export function isSchoolResource(resource: string): resource is SchoolResource {
  return resource in resourceColumns;
}

export async function listResource(resource: SchoolResource): Promise<ResourceTable> {
  try {
    await ensureSchoolDatabase();

    const { email, role } = await getCurrentUserEmailAndRole();

    const filters: string[] = [];
    const params: string[] = [];

    if (resource === "grades" && role === "student" && email) {
      params.push(email);
      filters.push(`student_email = $${params.length}`);
    } else if ((resource === "grades" || resource === "attendance" || resource === "payments") && role === "parent" && email) {
      params.push(email);
      const parentParam = `$${params.length}`;

      if (resource === "grades") {
        filters.push(`student_email IN (SELECT email FROM students WHERE parent_email = ${parentParam})`);
      } else {
        filters.push(`student IN (SELECT full_name FROM students WHERE parent_email = ${parentParam})`);
      }
    }

    const result = await getPool().query<QueryRow>(`
      SELECT *
      FROM ${tableName(resource)}
      ${filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : ""}
      ORDER BY created_at DESC, id DESC
    `, params);

    return {
      columns: resourceColumns[resource],
      ids: result.rows.map((row) => stringValue(row.id)),
      rows: result.rows.map((row) => rowToArray(resource, row))
    };
  } catch (error) {
    logDatabaseFallback(error);
    return listLocalResource(resource);
  }
}

export async function createResource(resource: SchoolResource, values: Record<string, string>) {
  try {
    await ensureSchoolDatabase();

    const pool = getPool();
    const id = `${resource.slice(0, 2).toUpperCase()}-${Date.now().toString().slice(-6)}`;

    switch (resource) {
      case "students":
        await pool.query(
          `INSERT INTO students (id, full_name, email, phone, gender, birth_date, address, parent_name, parent_email, class_name, roll_number, attendance, gpa, payment_status)
           VALUES ($1, $2, $3, $4, 'Unknown', '', '', $5, $6, $7, $8, 0, 0, $9)`,
          [id, values.Name, `${id.toLowerCase()}@educore.mn`, values.Phone ?? "", values["Parent name"] ?? "", values["Parent Email"] ?? "", values.Class ?? "", id, values.Payment ?? "Unpaid"]
        );
        break;
      case "teachers":
        await pool.query(
          `INSERT INTO teachers (id, name, subject, email, experience, salary, contact, classes)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            id,
            values.Name,
            values.Subject,
            values.Email ?? `${id.toLowerCase()}@educore.mn`,
            values.Experience ?? "",
            values.Salary ?? "",
            phoneValue(values.Contact),
            values.Classes ?? ""
          ]
        );
        break;
      case "subjects":
        await pool.query(
          `INSERT INTO subjects (id, name, category, grade_levels)
           VALUES ($1, $2, $3, $4)`,
          [id, values.Name, values.Category ?? "", values["Grade Levels"] ?? ""]
        );
        break;
      case "classes":
        await pool.query(
          `INSERT INTO class_rooms (id, name, section, teacher, students, schedule)
           VALUES ($1, $2, $3, $4, 0, 'Mon-Fri')`,
          [id, values.Class, values.Section ?? "", values.Teacher ?? ""]
        );
        break;
      case "attendance":
        await pool.query(
          `INSERT INTO attendance_records (id, student, class_name, date, status)
           VALUES ($1, $2, $3, $4, $5)`,
          [id, values.Student, values.Class ?? "", values.Date ?? new Date().toISOString().slice(0, 10), values.Status ?? "Present"]
        );
        break;
      case "grades":
        await pool.query(
          `INSERT INTO grade_records (id, student, student_email, subject, score, semester)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [id, values.Student, values["Student Email"] ?? "", values.Subject, Number(values.Score ?? 0), values.Semester ?? ""]
        );
        break;
      case "payments":
        await pool.query(
          `INSERT INTO payment_records (id, student, amount, status, due_date)
           VALUES ($1, $2, $3, $4, $5)`,
          [id, values.Student, values.Amount ?? "$0", values.Status ?? "Unpaid", values["Due Date"] ?? ""]
        );
        break;
      case "timetable":
        await pool.query(
          `INSERT INTO timetable_slots (id, day, time, subject, teacher, class_name)
           VALUES ($1, $2, $3, $4, $5, '')`,
          [id, values.Day, values.Time ?? "", values.Subject ?? "", values.Teacher ?? ""]
        );
        break;
      case "announcements":
        await pool.query(
          `INSERT INTO announcements (id, title, content, audience, date)
           VALUES ($1, $2, $3, $4, $5)`,
          [id, values.Title, values.Content ?? "", values.Audience ?? "All", new Date().toISOString().slice(0, 10)]
        );
        break;
    }

    return listResource(resource);
  } catch (error) {
    logDatabaseFallback(error);
    return createLocalResource(resource, values);
  }
}

export async function deleteResource(resource: SchoolResource, id: string) {
  try {
    await ensureSchoolDatabase();
    await getPool().query(`DELETE FROM ${tableName(resource)} WHERE id = $1`, [id]);
    return listResource(resource);
  } catch (error) {
    logDatabaseFallback(error);
    return deleteLocalResource(resource, id);
  }
}

export async function updateResource(resource: SchoolResource, id: string, values: Record<string, string>) {
  try {
    await ensureSchoolDatabase();

    const pool = getPool();

    switch (resource) {
      case "students":
        await pool.query(
          `UPDATE students
           SET full_name = $1, class_name = $2, attendance = $3, gpa = $4, payment_status = $5, parent_email = $6
           WHERE id = $7`,
          [values.Name, values.Class, numberValue(values.Attendance), numberValue(values.GPA), values.Payment ?? "Unpaid", values["Parent Email"] ?? "", id]
        );
        break;
      case "teachers":
        await pool.query(
          `UPDATE teachers
           SET name = $1, subject = $2, email = $3, experience = $4, salary = $5, contact = $6, classes = $7
           WHERE id = $8`,
          [
            values.Name,
            values.Subject,
            values.Email ?? "",
            values.Experience ?? "",
            values.Salary ?? "",
            phoneValue(values.Contact),
            values.Classes ?? "",
            id
          ]
        );
        break;
      case "subjects":
        await pool.query(
          `UPDATE subjects
           SET name = $1, category = $2, grade_levels = $3
           WHERE id = $4`,
          [values.Name, values.Category ?? "", values["Grade Levels"] ?? "", id]
        );
        break;
      case "classes":
        await pool.query(
          `UPDATE class_rooms
           SET name = $1, section = $2, teacher = $3, students = $4, schedule = $5
           WHERE id = $6`,
          [values.Class, values.Section, values.Teacher, numberValue(values.Students), values.Schedule ?? "", id]
        );
        break;
      case "attendance":
        await pool.query(
          `UPDATE attendance_records
           SET student = $1, class_name = $2, date = $3, status = $4
           WHERE id = $5`,
          [values.Student, values.Class, values.Date, values.Status, id]
        );
        break;
      case "grades":
        await pool.query(
          `UPDATE grade_records
           SET student = $1, student_email = $2, subject = $3, score = $4, semester = $5
           WHERE id = $6`,
          [values.Student, values["Student Email"] ?? "", values.Subject, numberValue(values.Score), values.Semester, id]
        );
        break;
      case "payments":
        await pool.query(
          `UPDATE payment_records
           SET student = $1, amount = $2, status = $3, due_date = $4
           WHERE id = $5`,
          [values.Student, values.Amount, values.Status, values["Due Date"], id]
        );
        break;
      case "timetable":
        await pool.query(
          `UPDATE timetable_slots
           SET day = $1, time = $2, subject = $3, teacher = $4, class_name = $5
           WHERE id = $6`,
          [values.Day, values.Time, values.Subject, values.Teacher, values.Class, id]
        );
        break;
      case "announcements":
        await pool.query(
          `UPDATE announcements
           SET title = $1, content = $2, audience = $3, date = $4
           WHERE id = $5`,
          [values.Title, values.Content, values.Audience, values.Date, id]
        );
        break;
    }

    return listResource(resource);
  } catch (error) {
    logDatabaseFallback(error);
    return updateLocalResource(resource, id, values);
  }
}