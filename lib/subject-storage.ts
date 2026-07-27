import { Pool } from "pg";
import { randomBytes } from "node:crypto";
import type { SubjectContent } from "@/lib/types";

/**
 * Subject content and lesson attachments, stored in Neon.
 *
 * Files live in a bytea column rather than object storage. That keeps the app
 * on a single database, at the cost of holding uploads in Postgres — fine for
 * lesson handouts, but not where you would put large video libraries.
 */

declare global {
  var subjectStoragePool: Pool | undefined;
  var subjectStorageReady: Promise<void> | undefined;
}

/** Postgres tolerates larger values, but pushing multi-MB blobs is wasteful. */
export const MAX_FILE_BYTES = 25 * 1024 * 1024;

function getPool() {
  if (!globalThis.subjectStoragePool) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is not set.");
    }

    globalThis.subjectStoragePool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
      ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined
    });
  }

  return globalThis.subjectStoragePool;
}

async function initialize() {
  const pool = getPool();

  await pool.query(`
    CREATE TABLE IF NOT EXISTS subject_content (
      subject_id TEXT PRIMARY KEY,
      content JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS subject_files (
      id TEXT PRIMARY KEY,
      subject_id TEXT NOT NULL,
      file_name TEXT NOT NULL,
      content_type TEXT NOT NULL DEFAULT 'application/octet-stream',
      byte_size INTEGER NOT NULL DEFAULT 0,
      data BYTEA NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`CREATE INDEX IF NOT EXISTS subject_files_subject_idx ON subject_files (subject_id);`);
}

async function ensureReady() {
  if (!globalThis.subjectStorageReady) {
    globalThis.subjectStorageReady = initialize().catch((error) => {
      globalThis.subjectStorageReady = undefined;
      throw error;
    });
  }

  return globalThis.subjectStorageReady;
}

export function emptySubjectContent(subjectId: string): SubjectContent {
  return { subjectId, topics: [], lessons: [], assignments: [] };
}

export async function readSubjectContent(subjectId: string): Promise<SubjectContent> {
  await ensureReady();

  const { rows } = await getPool().query<{ content: SubjectContent }>(
    `SELECT content FROM subject_content WHERE subject_id = $1;`,
    [subjectId]
  );

  return rows[0]?.content ?? emptySubjectContent(subjectId);
}

export async function writeSubjectContent(subjectId: string, content: SubjectContent) {
  await ensureReady();

  await getPool().query(
    `INSERT INTO subject_content (subject_id, content, updated_at)
     VALUES ($1, $2::jsonb, NOW())
     ON CONFLICT (subject_id) DO UPDATE SET content = EXCLUDED.content, updated_at = NOW();`,
    [subjectId, JSON.stringify(content)]
  );
}

export type StoredFile = {
  id: string;
  fileName: string;
  contentType: string;
  byteSize: number;
  data: Buffer;
};

export async function storeSubjectFile(input: {
  subjectId: string;
  fileName: string;
  contentType: string;
  data: Buffer;
}): Promise<{ id: string; url: string }> {
  await ensureReady();

  if (input.data.byteLength > MAX_FILE_BYTES) {
    throw new Error(`File is larger than the ${Math.round(MAX_FILE_BYTES / 1024 / 1024)}MB limit.`);
  }

  const id = `F-${Date.now().toString(36)}${randomBytes(4).toString("hex")}`;

  await getPool().query(
    `INSERT INTO subject_files (id, subject_id, file_name, content_type, byte_size, data)
     VALUES ($1, $2, $3, $4, $5, $6);`,
    [id, input.subjectId, input.fileName, input.contentType || "application/octet-stream", input.data.byteLength, input.data]
  );

  return { id, url: `/api/subjects/files/${id}` };
}

export async function readSubjectFile(id: string): Promise<StoredFile | null> {
  await ensureReady();

  const { rows } = await getPool().query<{
    id: string;
    file_name: string;
    content_type: string;
    byte_size: number;
    data: Buffer;
  }>(`SELECT id, file_name, content_type, byte_size, data FROM subject_files WHERE id = $1;`, [id]);

  const row = rows[0];
  if (!row) return null;

  return {
    id: row.id,
    fileName: row.file_name,
    contentType: row.content_type,
    byteSize: row.byte_size,
    data: row.data
  };
}
