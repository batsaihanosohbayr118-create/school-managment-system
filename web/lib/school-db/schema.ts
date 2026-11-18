import { subjectCatalog } from "@/lib/subjects";
import { placementBank } from "@/lib/placement-bank";
import { PLACEMENT_SUBJECT, isPlacementSubject } from "@shared/placement";
import { getPool } from "./base";

export async function ensureSchoolDatabase() {
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

    ALTER TABLE assignments ADD COLUMN IF NOT EXISTS file_url TEXT NOT NULL DEFAULT '';

    -- A students table created from database/supabase-schema.sql had class_name
    -- NOT NULL with no default; the student INSERT never sets it, so every add
    -- failed and silently fell back to the JSON store.
    ALTER TABLE students ALTER COLUMN class_name SET DEFAULT '';

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
      fee_type TEXT NOT NULL DEFAULT 'Tuition',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- Only an unpaid "App fee" locks the mobile app; existing rows are tuition.
    ALTER TABLE payment_records ADD COLUMN IF NOT EXISTS fee_type TEXT NOT NULL DEFAULT 'Tuition';

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

    CREATE TABLE IF NOT EXISTS placement_questions (
      id TEXT PRIMARY KEY,
      subject_id TEXT NOT NULL DEFAULT '',
      subject TEXT NOT NULL DEFAULT '',
      level TEXT NOT NULL,
      question TEXT NOT NULL,
      option_a TEXT NOT NULL DEFAULT '',
      option_b TEXT NOT NULL DEFAULT '',
      option_c TEXT NOT NULL DEFAULT '',
      option_d TEXT NOT NULL DEFAULT '',
      answer TEXT NOT NULL,
      created_by TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS placement_results (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL DEFAULT '',
      subject_id TEXT NOT NULL DEFAULT '',
      student TEXT NOT NULL DEFAULT '',
      subject TEXT NOT NULL DEFAULT '',
      level TEXT NOT NULL,
      correct INTEGER NOT NULL DEFAULT 0,
      total INTEGER NOT NULL DEFAULT 0,
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

  // The placement bank is the exception to the rule above, and only while the
  // table is completely empty: a test with no questions is useless, whereas
  // the teacher deleting one starter question must stay deleted.
  const placementCount = await pool.query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM placement_questions`);
  if (Number(placementCount.rows[0]?.count ?? 0) === 0) {
    const english = subjectCatalog.find((subject) => isPlacementSubject(subject.name));
    for (const question of placementBank) {
      await pool.query(
        `INSERT INTO placement_questions (id, subject_id, subject, level, question, option_a, option_b, option_c, option_d, answer)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (id) DO NOTHING`,
        [question.id, english?.id ?? "", PLACEMENT_SUBJECT, question.level, question.question, ...question.options, question.answer]
      );
    }
  }
}
