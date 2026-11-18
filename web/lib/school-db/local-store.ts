import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { defaultStudentSubjectsValue } from "@/lib/subjects";
import { PLACEMENT_SUBJECT } from "@shared/placement";
import { type DbRow, type LocalResourceRow, type LocalStore, type QueryRow, type ResourceTable, type SchoolResource, getPool, localSeedData, localStoreFallbackEnabled, localStorePath, numberValue, phoneValue, resourceColumns, rowToArray, stringValue, tableName } from "./base";
import { ensureSchoolDatabase } from "./schema";

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

  if (resource === "payments" && values.length === columns.length - 1) {
    values.push("Tuition");
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

export async function readLocalStore() {
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

export async function writeLocalStore(store: LocalStore) {
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
      return [values.Subject, values.Title, values["File URL"] ?? "", values["Due Date"] ?? "", values["Max Score"] ?? "100", values.Description ?? ""].map(stringValue);
    case "materials":
      return [values.Subject, values.Title, values["File Type"] ?? "", values["Uploaded By"] ?? "", values["File URL"] ?? ""].map(stringValue);
    case "attendance":
      return [values.Student, values.Subject, values.Date || new Date().toISOString().slice(0, 10), values.Status || "Present"].map(stringValue);
    case "grades":
      return [values.Student, values.Subject, `${numberValue(values.Score)}`, values.Semester ?? ""].map(stringValue);
    case "payments":
      return [values.Student, values.Amount || "0₮", values.Status || "Unpaid", values["Due Date"] ?? "", values["Fee Type"] || "Tuition"].map(stringValue);
    case "timetable":
      return [values.Subject, values.Day, values.Time ?? "", values.Teacher ?? "", values.Class ?? ""].map(stringValue);
    case "announcements":
      return [values.Title, values.Content ?? "", values.Audience || "All", values.Date ?? new Date().toISOString().slice(0, 10)].map(stringValue);
    case "wellbeing":
      return [values.Question, values.Category || "General", values.Note ?? "", values.Date || new Date().toISOString().slice(0, 10)].map(stringValue);
    case "placementQuestions":
      return [PLACEMENT_SUBJECT, values.Level, values.Question, values["Option A"], values["Option B"], values["Option C"], values["Option D"], values.Answer].map(stringValue);
    case "placementResults":
      return [values.Student, values.Subject, values.Level, values.Correct, values.Total, values.Date || new Date().toISOString().slice(0, 10)].map(stringValue);
  }
}

export async function createLocalResource(resource: SchoolResource, values: Record<string, string>) {
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

export async function updateLocalResource(resource: SchoolResource, id: string, values: Record<string, string>) {
  const store = await readLocalStore();
  const columns = resourceColumns[resource];
  const row = store[resource].find((item) => item.id === id);

  if (row) {
    row.values = columns.map((column) => stringValue(values[column]));
  }

  await writeLocalStore(store);
  return toResourceTable(resource, store[resource]);
}

export async function deleteLocalResource(resource: SchoolResource, id: string) {
  const store = await readLocalStore();
  store[resource] = store[resource].filter((row) => row.id !== id);
  await writeLocalStore(store);
  return toResourceTable(resource, store[resource]);
}

/**
 * Every catch that falls back to the local store goes through here first. Where
 * the fallback is disabled (production) it throws instead, so the request fails
 * visibly rather than reporting success for a write that went nowhere. Errors
 * from pg (they carry a string `code`: SQLSTATE or ECONNREFUSED/ETIMEDOUT...)
 * become a generic message so connection details never reach the client;
 * anything else is rethrown unchanged.
 */
export function logDatabaseFallback(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (!localStoreFallbackEnabled) {
    console.error("[school-db] PostgreSQL request failed:", message);
    if (typeof (error as { code?: unknown } | null)?.code === "string") {
      throw new Error("Database is temporarily unavailable. Please try again.");
    }
    throw error;
  }
  console.warn(`PostgreSQL unavailable; using local file store at ${localStorePath}.`, message);
}

export async function fetchRawTable(resource: SchoolResource): Promise<DbRow[] | LocalResourceRow[]> {
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

export async function subjectRows() {
  return fetchRawTable("subjects");
}
