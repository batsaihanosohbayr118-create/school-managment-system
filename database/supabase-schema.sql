CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  gender TEXT NOT NULL DEFAULT 'Unknown',
  birth_date TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  parent_name TEXT NOT NULL DEFAULT '',
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

INSERT INTO students (id, full_name, email, phone, gender, birth_date, address, parent_name, class_name, roll_number, attendance, gpa, payment_status)
VALUES
  ('ST-1001', 'Anand Bayarsaikhan', 'anand@educore.mn', '+976 9911 2030', 'Male', '2010-03-12', 'Ulaanbaatar, Khan-Uul', 'Bayarsaikhan', 'Grade 8A', '08A-01', 96, 3.8, 'Paid'),
  ('ST-1002', 'Saruul Enkhjin', 'saruul@educore.mn', '+976 8800 4412', 'Female', '2011-07-08', 'Ulaanbaatar, Bayanzurkh', 'Enkhjin', 'Grade 7B', '07B-09', 89, 3.5, 'Partial'),
  ('ST-1003', 'Temuulen Ganbat', 'temuulen@educore.mn', '+976 9505 1177', 'Male', '2009-11-21', 'Ulaanbaatar, Sukhbaatar', 'Ganbat', 'Grade 9A', '09A-12', 78, 3.1, 'Unpaid')
ON CONFLICT (id) DO NOTHING;

INSERT INTO teachers (id, name, subject, email, experience, salary, contact, classes)
VALUES
  ('TC-201', 'Ms. Saraa', 'Mathematics', 'saraa@educore.mn', '8 years', '$1,450', '+976 9919 8000', 'Grade 8A, Grade 9A'),
  ('TC-202', 'Mr. Bold', 'Physics', 'bold@educore.mn', '6 years', '$1,320', '+976 8808 5500', 'Grade 9A'),
  ('TC-203', 'Ms. Nomin', 'English', 'nomin@educore.mn', '5 years', '$1,280', '+976 9900 8080', 'Grade 7B, Grade 8A')
ON CONFLICT (id) DO NOTHING;

INSERT INTO class_rooms (id, name, section, teacher, students, schedule)
VALUES
  ('CL-8A', 'Grade 8', 'A', 'Ms. Saraa', 32, 'Mon-Fri'),
  ('CL-7B', 'Grade 7', 'B', 'Ms. Nomin', 29, 'Mon-Fri'),
  ('CL-9A', 'Grade 9', 'A', 'Mr. Bold', 34, 'Mon-Fri')
ON CONFLICT (id) DO NOTHING;

INSERT INTO attendance_records (id, student, class_name, date, status)
VALUES
  ('AT-1', 'Anand Bayarsaikhan', 'Grade 8A', '2026-05-18', 'Present'),
  ('AT-2', 'Saruul Enkhjin', 'Grade 7B', '2026-05-18', 'Late'),
  ('AT-3', 'Temuulen Ganbat', 'Grade 9A', '2026-05-18', 'Absent')
ON CONFLICT (id) DO NOTHING;

INSERT INTO grade_records (id, student, subject, score, semester)
VALUES
  ('GR-1', 'Anand Bayarsaikhan', 'Mathematics', 94, 'Spring 2026'),
  ('GR-2', 'Saruul Enkhjin', 'English', 88, 'Spring 2026'),
  ('GR-3', 'Temuulen Ganbat', 'Physics', 81, 'Spring 2026')
ON CONFLICT (id) DO NOTHING;

INSERT INTO payment_records (id, student, amount, status, due_date)
VALUES
  ('PY-1', 'Anand Bayarsaikhan', '$450', 'Paid', '2026-05-01'),
  ('PY-2', 'Saruul Enkhjin', '$450', 'Partial', '2026-05-10'),
  ('PY-3', 'Temuulen Ganbat', '$450', 'Unpaid', '2026-05-15')
ON CONFLICT (id) DO NOTHING;

INSERT INTO timetable_slots (id, day, time, subject, teacher, class_name)
VALUES
  ('TT-1', 'Monday', '09:00', 'Mathematics', 'Ms. Saraa', 'Grade 8A'),
  ('TT-2', 'Tuesday', '10:30', 'Physics', 'Mr. Bold', 'Grade 9A'),
  ('TT-3', 'Wednesday', '11:30', 'English', 'Ms. Nomin', 'Grade 7B')
ON CONFLICT (id) DO NOTHING;

INSERT INTO announcements (id, title, content, audience, date)
VALUES
  ('AN-1', 'Midterm timetable published', 'Students can now view upcoming midterm schedules.', 'All', '2026-05-18'),
  ('AN-2', 'Teacher workshop', 'Professional development workshop starts Friday.', 'Teachers', '2026-05-17'),
  ('AN-3', 'Payment reminder', 'May tuition invoices are due this week.', 'Students', '2026-05-16')
ON CONFLICT (id) DO NOTHING;

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
