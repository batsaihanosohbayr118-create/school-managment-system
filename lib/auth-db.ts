import { Pool } from "pg";
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import type { Role } from "@/lib/types";

/**
 * Account storage, backed by the same Neon database as the rest of the app.
 *
 * Passwords are hashed with scrypt from Node's standard library — no external
 * dependency, and unlike a bare SHA it is deliberately slow and salted.
 */

const scrypt = promisify(scryptCallback) as (
  password: string,
  salt: Buffer,
  keylen: number
) => Promise<Buffer>;

const KEY_LENGTH = 64;

declare global {
  var authPool: Pool | undefined;
  var authReady: Promise<void> | undefined;
}

export type AccountRecord = {
  id: string;
  email: string;
  username: string;
  name: string;
  role: Role;
  avatarUrl: string;
  /** Teachers only — the subject they teach. Free text; not tied to a table. */
  subject: string;
  /** Parents only — the email of the student they are guardian for. */
  studentEmail: string;
  createdAt: string;
};

const ROLES: Role[] = ["admin", "teacher", "student", "parent"];

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as string[]).includes(value);
}

function getPool() {
  if (!globalThis.authPool) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is not set.");
    }

    globalThis.authPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
      ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined
    });
  }

  return globalThis.authPool;
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const derived = await scrypt(password, salt, KEY_LENGTH);
  return `scrypt:${salt.toString("hex")}:${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [scheme, saltHex, hashHex] = stored.split(":");
  if (scheme !== "scrypt" || !saltHex || !hashHex) return false;

  const derived = await scrypt(password, Buffer.from(saltHex, "hex"), KEY_LENGTH);
  const expected = Buffer.from(hashHex, "hex");
  return derived.length === expected.length && timingSafeEqual(derived, expected);
}

/** Accounts shipped so the app is usable immediately — one per role. */
const seedAccounts: { email: string; username: string; name: string; role: Role; password: string }[] = [
  { email: "admin@novamind.mn", username: "demo.admin", name: "Demo Admin", role: "admin", password: "NovaLead@2026!" },
  { email: "teacher@novamind.mn", username: "demo.teacher", name: "Demo Teacher", role: "teacher", password: "NovaTeach@2026!" },
  { email: "student@novamind.mn", username: "demo.student", name: "Demo Student", role: "student", password: "NovaStudy@2026!" },
  { email: "parent@novamind.mn", username: "demo.parent", name: "Demo Parent", role: "parent", password: "NovaParent@2026!" }
];

async function initialize() {
  const pool = getPool();

  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      username TEXT NOT NULL DEFAULT '',
      name TEXT NOT NULL DEFAULT '',
      role TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      avatar_url TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // Role-specific links, added after the table shipped.
  await pool.query(`ALTER TABLE app_users ADD COLUMN IF NOT EXISTS subject TEXT NOT NULL DEFAULT '';`);
  await pool.query(`ALTER TABLE app_users ADD COLUMN IF NOT EXISTS student_email TEXT NOT NULL DEFAULT '';`);

  // Case-insensitive uniqueness: nobody should be able to register "Admin@x"
  // alongside an existing "admin@x".
  await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS app_users_email_key ON app_users (LOWER(email));`);
  await pool.query(
    `CREATE UNIQUE INDEX IF NOT EXISTS app_users_username_key ON app_users (LOWER(username)) WHERE username <> '';`
  );

  for (const account of seedAccounts) {
    const passwordHash = await hashPassword(account.password);
    await pool.query(
      `INSERT INTO app_users (id, email, username, name, role, password_hash)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (LOWER(email)) DO NOTHING;`,
      [`US-${account.role}`, account.email, account.username, account.name, account.role, passwordHash]
    );
  }
}

async function ensureReady() {
  if (!globalThis.authReady) {
    globalThis.authReady = initialize().catch((error) => {
      globalThis.authReady = undefined;
      throw error;
    });
  }

  return globalThis.authReady;
}

type Row = {
  id: string;
  email: string;
  username: string;
  name: string;
  role: string;
  avatar_url: string;
  subject: string;
  student_email: string;
  created_at: Date | string;
};

function mapRow(row: Row): AccountRecord {
  return {
    id: row.id,
    email: row.email,
    username: row.username,
    name: row.name,
    role: isRole(row.role) ? row.role : "student",
    avatarUrl: row.avatar_url,
    subject: row.subject ?? "",
    studentEmail: row.student_email ?? "",
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at)
  };
}

const SELECT = `id, email, username, name, role, avatar_url, subject, student_email, created_at`;

/**
 * A parent account may only be linked to a student that actually exists, so
 * the guardian relationship can never dangle. Matched case-insensitively.
 */
export async function studentExists(email: string): Promise<boolean> {
  await ensureReady();

  try {
    const { rows } = await getPool().query<{ exists: boolean }>(
      `SELECT EXISTS (SELECT 1 FROM students WHERE LOWER(email) = LOWER($1)) AS exists;`,
      [email.trim()]
    );
    return rows[0]?.exists ?? false;
  } catch (error) {
    // The students table is created lazily by school-db; if it is not there
    // yet then there are no students to match, so the link cannot be valid.
    if ((error as { code?: string }).code === "42P01") return false;
    throw error;
  }
}

/** Matches on either email or username, both case-insensitively. */
export async function authenticate(identifier: string, password: string): Promise<AccountRecord | null> {
  await ensureReady();

  const { rows } = await getPool().query<Row & { password_hash: string }>(
    `SELECT ${SELECT}, password_hash FROM app_users
     WHERE LOWER(email) = LOWER($1) OR (username <> '' AND LOWER(username) = LOWER($1))
     LIMIT 1;`,
    [identifier.trim()]
  );

  const row = rows[0];
  if (!row) return null;
  if (!(await verifyPassword(password, row.password_hash))) return null;

  return mapRow(row);
}

export async function listAccounts(): Promise<AccountRecord[]> {
  await ensureReady();
  const { rows } = await getPool().query<Row>(`SELECT ${SELECT} FROM app_users ORDER BY created_at DESC;`);
  return rows.map(mapRow);
}

export async function findAccountById(id: string): Promise<AccountRecord | null> {
  await ensureReady();
  const { rows } = await getPool().query<Row>(`SELECT ${SELECT} FROM app_users WHERE id = $1;`, [id]);
  return rows[0] ? mapRow(rows[0]) : null;
}

export type CreateAccountInput = {
  email: string;
  password: string;
  name?: string;
  username?: string;
  role: Role;
  subject?: string;
  studentEmail?: string;
};

export class AccountConflictError extends Error {
  constructor(public field: "email" | "username") {
    super(`${field}-exists`);
  }
}

function makeId() {
  return `US-${Date.now().toString(36)}${randomBytes(3).toString("hex")}`;
}

/** Postgres surfaces our unique indexes as 23505; translate to a typed error. */
function translateConflict(error: unknown): never {
  const code = (error as { code?: string }).code;
  const constraint = (error as { constraint?: string }).constraint ?? "";
  if (code === "23505") {
    throw new AccountConflictError(constraint.includes("username") ? "username" : "email");
  }
  throw error;
}

export async function createAccount(input: CreateAccountInput): Promise<AccountRecord> {
  await ensureReady();

  const passwordHash = await hashPassword(input.password);

  try {
    const { rows } = await getPool().query<Row>(
      `INSERT INTO app_users (id, email, username, name, role, password_hash, subject, student_email)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING ${SELECT};`,
      [
        makeId(),
        input.email.trim(),
        input.username?.trim() ?? "",
        input.name?.trim() ?? "",
        input.role,
        passwordHash,
        input.role === "teacher" ? (input.subject?.trim() ?? "") : "",
        input.role === "parent" ? (input.studentEmail?.trim() ?? "") : ""
      ]
    );
    return mapRow(rows[0]);
  } catch (error) {
    translateConflict(error);
  }
}

export type UpdateAccountInput = {
  email?: string;
  password?: string;
  name?: string;
  username?: string;
  role?: Role;
  avatarUrl?: string;
  subject?: string;
  studentEmail?: string;
};

export async function updateAccount(id: string, input: UpdateAccountInput): Promise<AccountRecord | null> {
  await ensureReady();

  // Keyed by column so a later rule overwrites an earlier one — Postgres
  // rejects an UPDATE that assigns the same column twice.
  const updates = new Map<string, unknown>();
  const set = (column: string, value: unknown) => updates.set(column, value);

  if (typeof input.email === "string" && input.email.trim()) set("email", input.email.trim());
  if (typeof input.username === "string") set("username", input.username.trim());
  if (typeof input.name === "string") set("name", input.name.trim());
  if (typeof input.avatarUrl === "string") set("avatar_url", input.avatarUrl);
  if (typeof input.subject === "string") set("subject", input.subject.trim());
  if (typeof input.studentEmail === "string") set("student_email", input.studentEmail.trim());

  // Switching role clears the link that belonged to the previous one.
  if (isRole(input.role)) {
    set("role", input.role);
    if (input.role !== "teacher") set("subject", "");
    if (input.role !== "parent") set("student_email", "");
  }
  if (typeof input.password === "string" && input.password.length > 0) {
    set("password_hash", await hashPassword(input.password));
  }

  if (updates.size === 0) return findAccountById(id);

  const values = [...updates.values()];
  const sets = [...updates.keys()].map((column, index) => `${column} = $${index + 1}`);
  values.push(id);

  try {
    const { rows } = await getPool().query<Row>(
      `UPDATE app_users SET ${sets.join(", ")} WHERE id = $${values.length} RETURNING ${SELECT};`,
      values
    );
    return rows[0] ? mapRow(rows[0]) : null;
  } catch (error) {
    translateConflict(error);
  }
}

/**
 * Sets someone's sign-in password, creating the account when they do not have
 * one yet — people added before the password field existed have a school
 * record but no login.
 *
 * The UPDATE is scoped to the given role on purpose: an administrator editing
 * a student or a parent must never be able to reset a teacher's or an admin's
 * password by reusing their email. In that case no row matches, and
 * createAccount raises the email conflict instead.
 */
export async function setAccountPassword(input: {
  email: string;
  name: string;
  password: string;
  role: Role;
  subject?: string;
  studentEmail?: string;
}): Promise<"created" | "updated"> {
  await ensureReady();

  const passwordHash = await hashPassword(input.password);
  const { rowCount } = await getPool().query(
    `UPDATE app_users SET password_hash = $1
     WHERE LOWER(email) = LOWER($2) AND role = $3;`,
    [passwordHash, input.email.trim(), input.role]
  );

  if ((rowCount ?? 0) > 0) return "updated";

  await createAccount(input);
  return "created";
}

export async function deleteAccount(id: string): Promise<boolean> {
  await ensureReady();
  const { rowCount } = await getPool().query(`DELETE FROM app_users WHERE id = $1;`, [id]);
  return (rowCount ?? 0) > 0;
}

export async function countAdmins(excludeId?: string): Promise<number> {
  await ensureReady();
  const { rows } = await getPool().query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM app_users WHERE role = 'admin' AND ($1::text IS NULL OR id <> $1);`,
    [excludeId ?? null]
  );
  return Number(rows[0]?.count ?? 0);
}
