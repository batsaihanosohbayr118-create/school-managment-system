# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repo layout

One repo, npm workspaces (`web`, `mobile`):

```
web/      Next.js web app (app/, components/, lib/, public/, its own package.json)
mobile/   Expo app
shared/   pure TS used by both — @shared/*
```

Unless a path below starts with `mobile/`, `shared/` or `docs/`, it is relative to `web/`
(`lib/i18n.ts` means `web/lib/i18n.ts`). Dependencies are hoisted to the root
`node_modules`; run `npm install` from the repo root. Vercel's Root Directory is `web`.

## Commands

Run from the repo root (they forward to the `web` workspace) or from inside `web/`.

```bash
npm run dev          # dev server (http://localhost:3000)
npm run build        # production build
npm run start        # serve the build
npm run lint         # eslint .
npm test             # vitest run
npm run test:watch   # vitest
npm run db:up        # docker compose up -d postgres
npm run db:down      # docker compose down
```

`dev`/`build`/`start` go through `scripts/run-next.mjs`, which spawns the Next binary with
`NEXT_TEST_WASM_DIR` pointed at `@next/swc-wasm-nodejs` (the native SWC binary is not used here).
Running `npx next dev` directly is **not** equivalent — always use the npm scripts.

**Test coverage is partial and deliberate.** Vitest covers pure logic only —
`shared/` and `lib/mobile/`, matched by `vitest.config.ts`. React components,
route handlers, and anything touching Postgres have no tests. The exceptions are
`lib/__tests__/teacher-subject-scope.test.ts` and `production-no-fallback.test.ts`, which drive
`school-db` through its local-store fallback (`LOCAL_STORE_DIR` temp dir, no real database) to
pin the teacher-own-subject write checks and the no-fallback-on-Vercel rule. Do not assume a
passing suite exercised a change to `components/dashboard/` or most of `lib/school-db/`.

The verification loop:

```bash
npm run lint
npm test
(cd web && npx tsc --noEmit)   # tsconfig already sets noEmit
npm run build
```

A build rewrites the committed `next-env.d.ts`. Restore it before committing
so it stays out of the diff:

```bash
git checkout -- web/next-env.d.ts
```

## Local database

`docker-compose.yml` publishes Postgres on **5433** (db `school_management`, user/pass
`postgres`/`postgres`). The placeholder in `.env.example` does not match it — the working local
value is:

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/school_management
```

Tables are created on the first API request by `initializeSchoolDatabase()` in `lib/school-db/schema.ts`.

## Mobile app — work in progress

A native iOS app is being built with Expo. It is **not** a wrapper around this
web app; that approach was designed, then abandoned. The web app here is
unchanged by it apart from new `/api/mobile/*` routes, CORS, and a `shared/`
directory.

Start here before touching anything mobile-related:

| Document | Purpose |
| --- | --- |
| `docs/superpowers/2026-07-27-status-and-next-steps.md` | Current state, what is verified, what is next |
| `docs/mobile-app-brief.md` | Non-technical summary (Mongolian) for the team |
| `docs/superpowers/specs/2026-07-27-expo-mobile-app-design.md` | The design |
| `docs/superpowers/plans/2026-07-27-expo-plan-a-mobile-api.md` | Plan A, task by task |

Two documents in `docs/superpowers/` carry a **SUPERSEDED** banner (the
Capacitor spec and its plan). They are kept for the constraints they record.
Do not execute them.

**The rule that governs the mobile API:** `/api/mobile/*` route handlers call
the existing `listResource` / `createResource` and project the result. They
never write their own SQL and never re-implement a role check. Duplicating that
logic is how a student ends up able to read another student's grades.

**English placement test** (mobile only): `placementQuestions` / `placementResults`
are `SchoolResource`s with no web `NavModule` — `components/dashboard/dashboard-shared.ts` keeps its own
narrower `SchoolResource` alias. Grading is `submitPlacementTest()` in
`lib/school-db/placement.ts`; the answer-keyed starter bank is `lib/placement-bank.ts` and
must stay out of `shared/`, which is bundled into the phone app.

`@shared/*` resolves to the root `shared/` — configured in `web/tsconfig.json`,
`web/vitest.config.ts` (whose `root` is the repo root so shared tests run), `mobile/tsconfig.json`
and `mobile/metro.config.js`, so keep them in sync. `web/next.config.mjs` sets
`experimental.externalDir` so Next compiles TS from outside `web/`.

## Architecture

### Two swappable backends, both with silent fallbacks

**Auth** — Supabase when `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set;
otherwise the app runs a client-side demo (`lib/demo-auth.ts`, sessionStorage, four seeded
accounts). `isSupabaseConfigured` from `lib/supabase.ts` is the branch flag, and every auth path
checks it. Supabase sessions are stored in `window.sessionStorage`, not cookies.

**Data** — `lib/school-db` talks to Postgres via `DATABASE_URL`. **Locally, on any Postgres
failure it silently falls back to a JSON file store** (`web/.local-data/school-store.json`, or
`$LOCAL_STORE_DIR`) with only a `console.warn` — if local data looks odd, check for that warning
first. **On Vercel the fallback is off**: `logDatabaseFallback()` (which every fallback catch calls
first) throws instead, and pg errors reach the client as a generic "Database is temporarily
unavailable" message. Pinned by `lib/__tests__/production-no-fallback.test.ts`.

### Auth is client-side; route protection is layered

- `proxy.ts` (Next 16's successor to `middleware.ts` — the README's mention of `middleware.ts` is
  stale) cannot see the session. It only normalizes `/admin` → `/admin/dashboard` and sets
  security headers.
- The **authoritative per-role guard** is the `useEffect` in
  `AppShell` in `components/dashboard/DashboardApp.tsx`. Each `app/<role>/dashboard/page.tsx` is a
  5-line shell rendering `<DashboardApp lockedRole="..." />`; the guard bounces a user whose session
  role ≠ `lockedRole` to `dashboardPathForRole(theirRole)`.
- API routes authenticate independently via `resolveRequestSession()` (`lib/school-session.ts`):
  `Authorization: Bearer <supabase token>`, or the `x-demo-session` header in demo mode.

**Never `fetch("/api/school/...")` directly from the client** — go through `lib/school-api.ts`,
which injects those headers via `getClientSchoolHeaders()`. A direct fetch returns 401.

`lib/auth-flow.ts` is the single source of truth for role → dashboard route. Role comes from
Supabase `user_metadata.role` and **defaults to `student`** whenever it is missing or invalid.

### Row-level authorization lives in the data layer

`allowedSubjectNames()` and `filterResourceTable()` in `lib/school-db/access.ts` scope every resource per
role (teacher → their subjects, student → their own rows, parent → their child's rows, admin → all).
The UI does not filter; it renders whatever the API returns as a `{ columns, ids, rows }` table.

Adding a resource or a column means touching four spots in `lib/school-db/` — the `CREATE TABLE`
block in `initializeSchoolDatabase` (`schema.ts`), `resourceColumns` and `rowToArray` (`base.ts`),
and the role filter (`access.ts`) — plus `visibleModulesByRole`
(`components/dashboard/dashboard-shared.ts`) for navigation.

### Other conventions

- `@/*` resolves to `web/` (`web/tsconfig.json`).
- `components/dashboard/DashboardApp.tsx` (`AppShell`) renders **all four** role dashboards; the
  `lockedRole` prop is what differentiates them. The modules, table, charts, settings and subject
  content editor are split into sibling files; shared types/helpers are in `dashboard-shared.ts`.
- `lib/school-db.ts` is only the public re-export list; the code is in `lib/school-db/` (see the
  header comment there). Import from `@/lib/school-db`, not the inner files.
- i18n is en/mn lookup tables in `lib/i18n.ts` (`translateColumn` / `translateValue` /
  `translations`). New user-facing strings and new column/value names need entries there. The
  landing page defaults to `mn`.
- Next config lives in `web/next.config.mjs` (the only one).
- The web app is **not** a PWA any more (`next-pwa`, the manifest and the offline page were
  removed). `public/sw.js` is a hand-written kill switch that clears old caches and unregisters
  itself for browsers that installed the old service worker — do not delete it or add a new one.
- Accounts are made by an admin (`/admin/users`, or a record's Password field) **or by
  self-registration** (`/register` on web, `mobile/app/register.tsx`, both calling
  `app/api/auth/register` → `registerAccount()` in `lib/school-db/registration.ts`). Students sign straight in;
  a parent must give their child's email *and password*; a teacher's account starts with
  `app_users.approved = false`, cannot sign in (`/api/auth/login` returns `pending-approval`), and
  gets their teacher record only when an admin approves them on `/admin/users`. Rules shared by
  all three are in `shared/registration.ts`. Admin can never be self-registered.

## Files that are not what they look like

- `database/schema.sql` is an aspirational normalized target schema, **not** what runs. The live
  tables are created at runtime by `initializeSchoolDatabase()`. `database/supabase-schema.sql` is
  meant to be pasted into the Supabase SQL editor.
- `public/sw.js` looks unused but is deliberate: it is a kill-switch that clears the old next-pwa
  service worker from browsers that installed it. Keep it.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
