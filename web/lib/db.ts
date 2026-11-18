import { Pool } from "pg";

export type DbRecord = {
  id: string;
  module: string;
  name: string;
  owner: string;
  status: string;
  amount: string;
  createdAt: string;
};

type SeedRecord = Omit<DbRecord, "createdAt">;

type RecordRow = {
  id: string;
  module: string;
  name: string;
  owner: string;
  status: string;
  amount: string;
  created_at: Date | string;
};

declare global {
  var schoolPgPool: Pool | undefined;
  var schoolPgReady: Promise<void> | undefined;
}

const modules = [
  "School Overview",
  "Front Office",
  "Student Info",
  "Online Course",
  "Multi Branch",
  "Live Classes",
  "Behavior Records",
  "Income & Expense",
  "CBSE Examination",
  "Examinations",
  "Attendance",
  "Academics",
  "Lesson Plan",
  "Human Resource",
  "Communicate",
  "Fees Collection"
];

const seedRecords: SeedRecord[] = modules.flatMap((moduleName, index) => {
  const code = getModulePrefix(moduleName);

  return [
    {
      id: `${code}-${index + 1}01`,
      module: moduleName,
      name: `${moduleName} daily review`,
      owner: index % 2 === 0 ? "Admin Team" : "Coordinator",
      status: index % 3 === 0 ? "Open" : "Ready",
      amount: index % 2 === 0 ? "$2,840" : "12 items"
    },
    {
      id: `${code}-${index + 1}02`,
      module: moduleName,
      name: `${moduleName} follow-up list`,
      owner: index % 2 === 0 ? "Finance" : "Office",
      status: index % 3 === 1 ? "Pending" : "Done",
      amount: index % 2 === 0 ? "$1,250" : "6 tasks"
    },
    {
      id: `${code}-${index + 1}03`,
      module: moduleName,
      name: `${moduleName} monthly report`,
      owner: index % 2 === 0 ? "Principal" : "Registrar",
      status: index % 3 === 2 ? "Review" : "Published",
      amount: index % 2 === 0 ? "54 records" : "92%"
    }
  ];
});

function getDatabaseUrl() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set. Add it to .env.local before using PostgreSQL.");
  }

  return process.env.DATABASE_URL;
}

function getPool() {
  if (!globalThis.schoolPgPool) {
    globalThis.schoolPgPool = new Pool({
      connectionString: getDatabaseUrl(),
      max: 10,
      ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined
    });
  }

  return globalThis.schoolPgPool;
}

async function ensureDatabase() {
  if (!globalThis.schoolPgReady) {
    globalThis.schoolPgReady = initializeDatabase().catch((error) => {
      globalThis.schoolPgReady = undefined;
      throw error;
    });
  }

  return globalThis.schoolPgReady;
}

async function initializeDatabase() {
  const pool = getPool();

  await pool.query(`
    CREATE TABLE IF NOT EXISTS records (
      id TEXT PRIMARY KEY,
      module TEXT NOT NULL,
      name TEXT NOT NULL,
      owner TEXT NOT NULL,
      status TEXT NOT NULL,
      amount TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS records_module_created_idx
      ON records (module, created_at DESC);
  `);

  const countResult = await pool.query<{ count: string }>("SELECT COUNT(*) as count FROM records");

  if (Number(countResult.rows[0]?.count ?? 0) > 0) return;

  const values: unknown[] = [];
  const placeholders = seedRecords
    .map((record, index) => {
      const offset = index * 6;
      values.push(record.id, record.module, record.name, record.owner, record.status, record.amount);

      return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6})`;
    })
    .join(", ");

  await pool.query(
    `
    INSERT INTO records (id, module, name, owner, status, amount)
    VALUES ${placeholders}
    ON CONFLICT (id) DO NOTHING
  `,
    values
  );
}

function mapRecord(row: RecordRow): DbRecord {
  const createdAt = row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at;

  return {
    id: row.id,
    module: row.module,
    name: row.name,
    owner: row.owner,
    status: row.status,
    amount: row.amount,
    createdAt
  };
}

export function getModulePrefix(moduleName: string) {
  return moduleName
    .split(/\s|&/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export async function listRecords(moduleName: string) {
  await ensureDatabase();

  const result = await getPool().query<RecordRow>(
    `
    SELECT id, module, name, owner, status, amount, created_at
    FROM records
    WHERE module = $1
    ORDER BY created_at DESC, id DESC
  `,
    [moduleName]
  );

  return result.rows.map(mapRecord);
}

export async function createRecord(record: Omit<DbRecord, "createdAt">) {
  await ensureDatabase();

  const result = await getPool().query<RecordRow>(
    `
    INSERT INTO records (id, module, name, owner, status, amount)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id, module, name, owner, status, amount, created_at
  `,
    [record.id, record.module, record.name, record.owner, record.status, record.amount]
  );

  return mapRecord(result.rows[0]);
}
