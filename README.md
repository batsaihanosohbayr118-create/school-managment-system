# EduCore School Management System

Premium modern school management system built with Next.js, React, TypeScript, PostgreSQL, Supabase helpers, Framer Motion, Recharts, and reusable UI components.

## Navigation flow

```
Landing Page (/)  ->  Login (/login)  ->  Authentication  ->  Role dashboard
```

After login each user is redirected to their own dashboard:

| Role    | Dashboard route        |
| ------- | ---------------------- |
| Admin   | `/admin/dashboard`     |
| Teacher | `/teacher/dashboard`   |
| Student | `/student/dashboard`   |
| Parent  | `/parent/dashboard`    |

There is **no public registration** — accounts are created by an administrator
from **`/admin/users`** (Create / Edit / Delete / Reset password / Search / Filter).

Route protection: a signed-in user may only open the dashboard matching their
role; anyone else is redirected to their own. The guard lives in
`components/dashboard/DashboardApp.tsx`, with `middleware.ts` normalizing routes
and applying security headers.

## Modules

- Public landing page + login-only authentication (forgot-password supported)
- Role-based dashboards: Admin, Teacher, Student, Parent
- Admin user management (`/admin/users`)
- Students, teachers, classes
- Attendance, grades, payments
- Timetable, announcements, settings
- Responsive glassmorphism UI with dark/light mode
- Production PostgreSQL APIs for school resources

## Demo mode (no Supabase)

If `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` are not set, the
app runs a fully client-side demo with four seeded accounts:

| Role    | Username | Password     |
| ------- | -------- | ------------ |
| Admin   | admin    | `Admin@123`  |
| Teacher | teacher  | `Teacher@123`|
| Student | student  | `Student@123`|
| Parent  | parent   | `Parent@123` |

## Supabase

Add these to `.env.local` for Supabase Auth:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SITE_URL=
# Server-only. Enables admin user provisioning at /admin/users.
SUPABASE_SERVICE_ROLE_KEY=
```

Run the SQL in `database/supabase-schema.sql` inside Supabase SQL Editor.
The normalized target schema lives in `database/schema.sql`.

Each Supabase user must carry `role` in `user_metadata`
(`admin` | `teacher` | `student` | `parent`) — that is what drives the
post-login redirect and dashboard access.

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
