CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  gender TEXT NOT NULL DEFAULT 'Unknown',
  birth_date TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  parent_name TEXT NOT NULL DEFAULT '',
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
  experience TEXT NOT NULL DEFAULT '',
  salary TEXT NOT NULL DEFAULT '',
  contact TEXT NOT NULL DEFAULT '',
  classes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS class_rooms (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  section TEXT NOT NULL DEFAULT '',
  teacher TEXT NOT NULL DEFAULT '',
  students INTEGER NOT NULL DEFAULT 0,
  schedule TEXT NOT NULL DEFAULT 'Mon-Fri',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS attendance_records (
  id TEXT PRIMARY KEY,
  student TEXT NOT NULL,
  class_name TEXT NOT NULL DEFAULT '',
  date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Present',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS grade_records (
  id TEXT PRIMARY KEY,
  student TEXT NOT NULL,
  student_email TEXT NOT NULL DEFAULT '',
  subject TEXT NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  semester TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payment_records (
  id TEXT PRIMARY KEY,
  student TEXT NOT NULL,
  amount TEXT NOT NULL DEFAULT '$0',
  status TEXT NOT NULL DEFAULT 'Unpaid',
  due_date TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS timetable_slots (
  id TEXT PRIMARY KEY,
  day TEXT NOT NULL,
  time TEXT NOT NULL DEFAULT '',
  subject TEXT NOT NULL DEFAULT '',
  teacher TEXT NOT NULL DEFAULT '',
  class_name TEXT NOT NULL DEFAULT '',
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

ALTER TABLE students ADD COLUMN IF NOT EXISTS parent_email TEXT;
ALTER TABLE grade_records ADD COLUMN IF NOT EXISTS student_email TEXT NOT NULL DEFAULT '';

ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE grade_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE timetable_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON students TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON teachers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON class_rooms TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON attendance_records TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON grade_records TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON payment_records TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON timetable_slots TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON announcements TO authenticated;

DROP POLICY IF EXISTS "Authenticated users can select students" ON students;
DROP POLICY IF EXISTS "Authenticated users can insert students" ON students;
DROP POLICY IF EXISTS "Authenticated users can update students" ON students;
DROP POLICY IF EXISTS "Authenticated users can delete students" ON students;
CREATE POLICY "Authenticated users can select students" ON students FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert students" ON students FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update students" ON students FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete students" ON students FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can select teachers" ON teachers;
DROP POLICY IF EXISTS "Authenticated users can insert teachers" ON teachers;
DROP POLICY IF EXISTS "Authenticated users can update teachers" ON teachers;
DROP POLICY IF EXISTS "Authenticated users can delete teachers" ON teachers;
CREATE POLICY "Authenticated users can select teachers" ON teachers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert teachers" ON teachers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update teachers" ON teachers FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete teachers" ON teachers FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can select class_rooms" ON class_rooms;
DROP POLICY IF EXISTS "Authenticated users can insert class_rooms" ON class_rooms;
DROP POLICY IF EXISTS "Authenticated users can update class_rooms" ON class_rooms;
DROP POLICY IF EXISTS "Authenticated users can delete class_rooms" ON class_rooms;
CREATE POLICY "Authenticated users can select class_rooms" ON class_rooms FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert class_rooms" ON class_rooms FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update class_rooms" ON class_rooms FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete class_rooms" ON class_rooms FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can select attendance_records" ON attendance_records;
DROP POLICY IF EXISTS "Authenticated users can insert attendance_records" ON attendance_records;
DROP POLICY IF EXISTS "Authenticated users can update attendance_records" ON attendance_records;
DROP POLICY IF EXISTS "Authenticated users can delete attendance_records" ON attendance_records;
CREATE POLICY "Authenticated users can select attendance_records" ON attendance_records FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert attendance_records" ON attendance_records FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update attendance_records" ON attendance_records FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete attendance_records" ON attendance_records FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can select grade_records" ON grade_records;
DROP POLICY IF EXISTS "Authenticated users can insert grade_records" ON grade_records;
DROP POLICY IF EXISTS "Authenticated users can update grade_records" ON grade_records;
DROP POLICY IF EXISTS "Authenticated users can delete grade_records" ON grade_records;
CREATE POLICY "Authenticated users can select grade_records" ON grade_records FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert grade_records" ON grade_records FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update grade_records" ON grade_records FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete grade_records" ON grade_records FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can select payment_records" ON payment_records;
DROP POLICY IF EXISTS "Authenticated users can insert payment_records" ON payment_records;
DROP POLICY IF EXISTS "Authenticated users can update payment_records" ON payment_records;
DROP POLICY IF EXISTS "Authenticated users can delete payment_records" ON payment_records;
CREATE POLICY "Authenticated users can select payment_records" ON payment_records FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert payment_records" ON payment_records FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update payment_records" ON payment_records FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete payment_records" ON payment_records FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can select timetable_slots" ON timetable_slots;
DROP POLICY IF EXISTS "Authenticated users can insert timetable_slots" ON timetable_slots;
DROP POLICY IF EXISTS "Authenticated users can update timetable_slots" ON timetable_slots;
DROP POLICY IF EXISTS "Authenticated users can delete timetable_slots" ON timetable_slots;
CREATE POLICY "Authenticated users can select timetable_slots" ON timetable_slots FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert timetable_slots" ON timetable_slots FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update timetable_slots" ON timetable_slots FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete timetable_slots" ON timetable_slots FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can select announcements" ON announcements;
DROP POLICY IF EXISTS "Authenticated users can insert announcements" ON announcements;
DROP POLICY IF EXISTS "Authenticated users can update announcements" ON announcements;
DROP POLICY IF EXISTS "Authenticated users can delete announcements" ON announcements;
CREATE POLICY "Authenticated users can select announcements" ON announcements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert announcements" ON announcements FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update announcements" ON announcements FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete announcements" ON announcements FOR DELETE TO authenticated USING (true);