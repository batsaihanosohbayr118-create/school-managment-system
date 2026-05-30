create extension if not exists pgcrypto;

do $$
begin
  create type user_role as enum ('admin', 'teacher', 'student');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type attendance_status as enum ('Present', 'Absent', 'Late');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type payment_status as enum ('Paid', 'Unpaid', 'Partial');
exception
  when duplicate_object then null;
end $$;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text unique not null,
  password text,
  role user_role not null default 'student',
  created_at timestamptz not null default now()
);

create table if not exists classes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  section text not null,
  created_at timestamptz not null default now()
);

create table if not exists students (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  class_id uuid references classes(id),
  parent_name text,
  phone text,
  gender text,
  birth_date date,
  address text,
  roll_number text,
  profile_image text,
  created_at timestamptz not null default now()
);

create table if not exists teachers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  subject text not null,
  experience text,
  salary numeric,
  contact_info text,
  created_at timestamptz not null default now()
);

create table if not exists subjects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  teacher_id uuid references teachers(id),
  created_at timestamptz not null default now()
);

create table if not exists attendance (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id) on delete cascade,
  date date not null,
  status attendance_status not null,
  created_at timestamptz not null default now()
);

create table if not exists grades (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id) on delete cascade,
  subject_id uuid references subjects(id),
  score numeric not null check (score >= 0 and score <= 100),
  semester text,
  created_at timestamptz not null default now()
);

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id) on delete cascade,
  amount numeric not null,
  status payment_status not null default 'Unpaid',
  due_date date,
  created_at timestamptz not null default now()
);

create table if not exists announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  audience text not null default 'All',
  created_at timestamptz not null default now()
);

create table if not exists timetable (
  id uuid primary key default gen_random_uuid(),
  class_id uuid references classes(id),
  subject_id uuid references subjects(id),
  teacher_id uuid references teachers(id),
  day text not null,
  start_time time not null,
  end_time time not null,
  created_at timestamptz not null default now()
);

create table if not exists class_rooms (
  id text primary key,
  name text not null,
  section text not null,
  teacher text not null,
  students integer not null default 0,
  schedule text not null,
  created_at timestamptz not null default now()
);

create table if not exists attendance_records (
  id text primary key,
  student text not null,
  class_name text not null,
  date text not null,
  status text not null,
  created_at timestamptz not null default now()
);

create table if not exists grade_records (
  id text primary key,
  student text not null,
  subject text not null,
  score integer not null default 0,
  semester text not null,
  created_at timestamptz not null default now()
);

create table if not exists payment_records (
  id text primary key,
  student text not null,
  amount text not null,
  status text not null,
  due_date text not null,
  created_at timestamptz not null default now()
);

create table if not exists timetable_slots (
  id text primary key,
  day text not null,
  time text not null,
  subject text not null,
  teacher text not null,
  class_name text not null,
  created_at timestamptz not null default now()
);
