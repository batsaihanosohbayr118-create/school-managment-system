-- ============================================================================
-- Nova Mind Academy — Normalized School Management Schema (PostgreSQL)
-- ============================================================================
-- Clean, normalized target schema for the four-role system:
--   Admin · Teacher · Student · Parent
--
-- Design notes:
--   * `users` is the single identity table; `role` drives authorization.
--   * `students`, `teachers`, and `parents` are role profiles (1-1 with users).
--   * A parent can have many children and a child many guardians -> the
--     `parent_student` junction table normalizes that many-to-many link.
--   * Academic data (attendance, grades, assignments, schedule, payments,
--     feedback) references the profile tables, not free-text names.
--
-- Accounts are created by administrators only — there is no public sign-up.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin', 'teacher', 'student', 'parent');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE attendance_status AS ENUM ('Present', 'Absent', 'Late');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM ('Paid', 'Unpaid', 'Partial');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE assignment_type AS ENUM ('Homework', 'Quiz', 'Project', 'Exam');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE submission_status AS ENUM ('Assigned', 'Submitted', 'Graded', 'Late', 'Missing');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- Identity
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name     text NOT NULL,
  username      text UNIQUE,
  email         text UNIQUE NOT NULL,
  password_hash text,                         -- null when auth is delegated to Supabase Auth
  role          user_role NOT NULL DEFAULT 'student',
  avatar_url    text,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS users_role_idx ON users (role);

-- ---------------------------------------------------------------------------
-- Academic structure
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS classes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  section     text NOT NULL DEFAULT '',
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (name, section)
);

CREATE TABLE IF NOT EXISTS teachers (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  employee_no  text UNIQUE,
  main_subject text,
  experience   text,
  salary       numeric(12, 2),
  contact_info text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS parents (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  phone        text,
  occupation   text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS students (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  class_id      uuid REFERENCES classes(id) ON DELETE SET NULL,
  roll_number   text,
  gender        text,
  birth_date    date,
  address       text,
  phone         text,
  payment_status payment_status NOT NULL DEFAULT 'Unpaid',
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS students_class_idx ON students (class_id);

-- Many-to-many: a parent may guard several students; a student may have several guardians.
CREATE TABLE IF NOT EXISTS parent_student (
  parent_id   uuid NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
  student_id  uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  relationship text NOT NULL DEFAULT 'Guardian',
  PRIMARY KEY (parent_id, student_id)
);

CREATE TABLE IF NOT EXISTS subjects (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code          text UNIQUE,
  name          text NOT NULL,
  category      text NOT NULL DEFAULT '',
  grade_levels  text NOT NULL DEFAULT '',
  teacher_id    uuid REFERENCES teachers(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Attendance
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS attendance (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class_id    uuid REFERENCES classes(id) ON DELETE SET NULL,
  date        date NOT NULL,
  status      attendance_status NOT NULL DEFAULT 'Present',
  recorded_by uuid REFERENCES teachers(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, date)
);
CREATE INDEX IF NOT EXISTS attendance_student_date_idx ON attendance (student_id, date DESC);

-- ---------------------------------------------------------------------------
-- Grades
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS grades (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  subject_id  uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  score       numeric(5, 2) NOT NULL CHECK (score >= 0 AND score <= 100),
  semester    text NOT NULL DEFAULT '',
  entered_by  uuid REFERENCES teachers(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS grades_student_idx ON grades (student_id);

-- ---------------------------------------------------------------------------
-- Assignments  (+ per-student submission tracking)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS assignments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id  uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  teacher_id  uuid REFERENCES teachers(id) ON DELETE SET NULL,
  title       text NOT NULL,
  description text NOT NULL DEFAULT '',
  type        assignment_type NOT NULL DEFAULT 'Homework',
  max_score   numeric(5, 2) NOT NULL DEFAULT 100,
  due_date    date,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS assignments_subject_idx ON assignments (subject_id);

CREATE TABLE IF NOT EXISTS assignment_submissions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id    uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  status        submission_status NOT NULL DEFAULT 'Assigned',
  score         numeric(5, 2),
  submitted_at  timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (assignment_id, student_id)
);

-- ---------------------------------------------------------------------------
-- Learning materials
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS learning_materials (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id  uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  uploaded_by uuid REFERENCES teachers(id) ON DELETE SET NULL,
  title       text NOT NULL,
  file_url    text,
  file_type   text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Schedule / timetable
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS schedule (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id    uuid REFERENCES classes(id) ON DELETE CASCADE,
  subject_id  uuid REFERENCES subjects(id) ON DELETE SET NULL,
  teacher_id  uuid REFERENCES teachers(id) ON DELETE SET NULL,
  day_of_week text NOT NULL,
  start_time  time NOT NULL,
  end_time    time NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS schedule_class_idx ON schedule (class_id);

-- ---------------------------------------------------------------------------
-- Payments (tuition)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  amount      numeric(12, 2) NOT NULL DEFAULT 0,
  status      payment_status NOT NULL DEFAULT 'Unpaid',
  due_date    date,
  paid_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS payments_student_idx ON payments (student_id);

-- ---------------------------------------------------------------------------
-- Feedback / suggestions (submitted by students)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS feedback (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  uuid REFERENCES students(id) ON DELETE SET NULL,
  subject_id  uuid REFERENCES subjects(id) ON DELETE SET NULL,
  message     text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Announcements
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS announcements (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text NOT NULL,
  content     text NOT NULL DEFAULT '',
  audience    text NOT NULL DEFAULT 'All',
  created_by  uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
