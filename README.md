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
NEXT_PUBLIC_SITE_URL=
```

Run the SQL in `database/supabase-schema.sql` inside Supabase SQL Editor.

For Google login, use the Supabase dashboard values exactly:

- `NEXT_PUBLIC_SUPABASE_URL`: Project Settings -> API -> Project URL, for example `https://your-project-ref.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Project Settings -> API -> publishable or anon public key
- `NEXT_PUBLIC_SITE_URL`: the production Vercel URL, for example `https://school-management-system-silk.vercel.app`

In Supabase Auth -> URL Configuration:

- Site URL: your production Vercel URL
- Redirect URLs: your production Vercel URL and `http://localhost:3000/**`

In Supabase Auth -> Providers -> Google, enable Google and add the Client ID and Client Secret from Google Cloud. In Google Cloud, the authorized redirect URI must be the Supabase callback URL shown on that Google provider page.

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

For Vercel, keep Root Directory empty or use `.`. Add `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `NEXT_PUBLIC_SITE_URL` in project environment variables, then redeploy after changing them.
