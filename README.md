# EduCore School Management System

Premium modern school management system built with Next.js, React, TypeScript, PostgreSQL, Supabase helpers, Framer Motion, Recharts, and reusable UI components.

## Modules

- Authentication pages: login, register, forgot password
- Role-aware dashboard: Admin, Teacher, Student
- Students, teachers, classes
- Attendance, grades, payments
- Timetable, announcements, settings
- Responsive glassmorphism UI with dark/light mode
- Production PostgreSQL APIs for school resources

## Supabase

Add these to `.env.local` for Supabase Auth:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Run the SQL in `database/supabase-schema.sql` inside Supabase SQL Editor.

## PostgreSQL Setup

Create `.env.local` from `.env.example`, then start PostgreSQL:

```bash
npm run db:up
```

The app initializes production school tables and seed data automatically on the first API request.

```bash
npm run dev
```

Production resource APIs:

- `GET /api/school/students`
- `GET /api/school/teachers`
- `GET /api/school/classes`
- `GET /api/school/attendance`
- `GET /api/school/grades`
- `GET /api/school/payments`
- `GET /api/school/timetable`
- `GET /api/school/announcements`
- `POST /api/school/:resource`
- `DELETE /api/school/:resource?id=...`

## Deploy

For Vercel, keep Root Directory empty or use `.`. Add `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in project environment variables.
