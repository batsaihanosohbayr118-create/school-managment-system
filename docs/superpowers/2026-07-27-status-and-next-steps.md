# Status & Next Steps — 2026-07-27

Read this first; it tells you exactly where work stands and what to do next.

## Update: Plan A Tasks 2-10 done

Tasks 2 through 10 of `docs/superpowers/plans/2026-07-27-expo-plan-a-mobile-api.md`
are implemented, tested, and committed on `main` (this branch was merged from
`feat/expo-mobile-api` via PR #1 in the meantime, so everything below lives on
`main` now, not a feature branch).

| Task | Commit |
| --- | --- |
| 2 — `shared/api-types.ts` | `ca203c7` |
| 3 — `shared/api-error.ts` | `69b6107` |
| 4 — CORS for the four existing routes | `0110c8f` |
| 5 — `lib/mobile/table.ts`, `toTimetableSlots` | `eb8d8e0` |
| 6 — `toGradeEntries`, `toAttendanceEntries` | `d5624a4` |
| 7 — `toPaymentEntries`, `toAnnouncementEntries` | `ce869a2` |
| 8 — `lib/mobile/route-helpers.ts` | `17b575d` |
| 9 — six read endpoints under `app/api/mobile/` | `8210615` |
| 10 — teacher write endpoints (attendance, grades) | `0ffe09d` |

Verified after every task: `npm test` (44 tests), `npx tsc --noEmit`, and after
Tasks 9-10 also `npm run build` (all six `/api/mobile/*` routes register) plus a
live CORS preflight check against `npm run dev`. Lint has 6 pre-existing errors
in `components/auth/LoginForm.tsx` and `components/dashboard/DashboardApp.tsx`
unrelated to this work — do not attribute new lint failures to this change
without checking those files first.

## Update: Plan A Task 11 done — Plan A is complete

`SUPABASE_SERVICE_ROLE_KEY` is now set. `DATABASE_URL` was also switched from
the direct-connection host to the session pooler (the direct host is
IPv6-only and unreachable from this network) — see `.env.local`.

Two infrastructure defects had to be fixed before verification meant anything
(both pre-existing, unrelated to Plan A's own code):

- The live Postgres schema had drifted from what `lib/school-db.ts` expects —
  9 columns missing across 5 tables, because `CREATE TABLE IF NOT EXISTS`
  never adds columns to a table that already exists. Fixed with additive
  `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` (no data loss).
- `DATABASE_URL` pointed at an IPv6-only host, so every request was silently
  hitting the local JSON fallback store instead of Postgres.

Verification then found **two real authorization defects**, both fixed and
committed:

- `060fec0` — grades/attendance were scoped by subject only for
  student/parent roles, so a student could read a classmate's grades if they
  shared a class. Now also scoped to the caller's own student identity.
- `1080a8f` — `createResource`/`updateResource`/`deleteResource` ran the
  permission check inside the same `try` block whose `catch` silently retries
  against the local fallback store on any error, so a denied write still
  returned `200` and landed in the local file. The permission check now runs
  before that block.

Full results, including per-role row counts and status codes, are in
`docs/superpowers/specs/2026-07-27-expo-mobile-app-design.md` under
"Plan A verification (2026-07-27)".

**Loose end from this session, not yet cleaned up:**

- Four real Supabase accounts had their passwords reset to a shared temp
  value (`MobileVerify-2026-Temp!`) to obtain per-role tokens:
  `admin@gmail.com`, `amraa@gmail.com`, `bilgee@gmail.com`, `ganbaa@gmail.com`.
  Their original passwords are gone; the owner is resetting these themselves.
  (The test fixture data used alongside these accounts — teacher Amraa,
  students Bilgee/Hangai, parent Ganbaa, and their grades/attendance/
  payments/timetable/announcement rows — has been deleted from production.)

## Plan B — Expo client

In progress on `main` (no feature branch). Design doc:
`docs/superpowers/specs/2026-07-27-expo-mobile-app-design.md`. No task-by-task
plan file was written for Plan B — it's being worked commit-by-commit against
the design doc's own outline instead.

| Done | Commit |
| --- | --- |
| `mobile/` npm workspace, Expo Router (tabs template), `shared/` wired via Metro watchFolders + `@shared/*` | `1bbcaaa` |
| `lib/i18n.ts` split — tables moved to `shared/i18n-tables.ts` | `3e9b79f` |
| `shared/roles.ts` — role → visible tabs, `resolveRole()` | `dd68521` |
| Supabase auth wired (`expo-secure-store`), login screen, admin web-redirect screen, root auth gate | `b2f45b4` |

Verified after each: mobile's own `tsc --noEmit`, root `tsc`/`test`/`lint`/
`build` unaffected, and a Metro web bundle (`npx expo start --web`, `CI=1`)
compiles with no embedded error. **Not verified: an actual device.** This
sandbox is Windows with no Xcode — everything so far is confirmed at the
compile/bundle level only, never by tapping through the app. The owner should
run `cd mobile && npx expo start`, scan the QR code with Expo Go, and try
logging in with one of the four accounts above before more screens get built
on top of unverified auth.

Two Windows-only workarounds worth knowing about if `expo start` misbehaves
later: `mobile/app.json`'s `experiments.typedRoutes` is off and `web.output`
is `"single"` rather than `"static"` — both features route through
`@expo/router-server`, which does a plain Node `require()` for `expo-router`
submodules from wherever `@expo/cli` got hoisted to (the workspace root),
not from `mobile/node_modules` where the real package lives. Only local web
preview hit this; Expo Go over Metro didn't need it disabled.

**Still to build**, in the order the design doc lists them: tab navigation
actually driven by `shared/roles.ts` (the tab bar is still the unmodified
template right now), the Home/Timetable/Grades/Attendance/Announcements/
Payments/Settings screens, teacher attendance and grade entry, Face ID via
`expo-local-authentication`, Google OAuth via `expo-auth-session`, the
offline `AsyncStorage` read cache, and device verification per the design
doc's "Verification" checklist (9 checks, device-only).

## Resolved: the disk-full outage

`npm run build` failed with `ENOSPC: no space left on device` and the shell
stopped returning output entirely. Clearing `.next` recovered enough space to
continue; Plan A Task 1 was then finished and committed.

**Disk headroom is still thin — 6.3 GB free, 97% used.** Expect this to recur,
especially once Expo and its iOS toolchain land. Reclaim more before Plan B:

```bash
df -h /System/Volumes/Data
du -sh ~/Desktop/Projects/*/node_modules 2>/dev/null | sort -h
npm cache clean --force
```

There are 11 project directories under `~/Desktop/Projects`. Their
`node_modules` are usually the largest reclaimable item and are always
restorable with `npm install`. `docker system prune -a` is another large win if
Docker is in use.

## Where the work stands

**Branch:** `feat/expo-mobile-api` (renamed from `docs/ios-app-store-phase1`).
Nothing has been merged to `main`.

### Committed and safe

| Commit | Contents |
| --- | --- |
| `96e233d` | `CLAUDE.md`; Capacitor phase-1 spec |
| `abe9233` | Capacitor phase-1 implementation plan |
| `bb0670e` | Both marked **superseded** — the wrap approach was abandoned |
| `b25cec5` | Expo mobile app design spec (**current**) |
| `68bed6e` | Expo Plan A — typed mobile API (**current**) |
| `4e27360` | Two defect fixes in Plan A |
| `7904a11` | **Plan A Task 1** — vitest + `shared/` |

### Plan A Task 1 — done and verified

- `vitest.config.ts` — new
- `shared/__tests__/smoke.test.ts` — new
- `package.json` — `test` / `test:watch` scripts, `vitest@^3.2.7` devDep
- `tsconfig.json` — `@shared/*` path alias

| Check | Result |
| --- | --- |
| `npm test` | Passed — 1 test, vitest 3.2.7 |
| `npx tsc --noEmit` | Passed |
| `npm run build` | Passed — all 12 routes, 4 API routes dynamic, proxy present |
| Working tree | Clean |

One thing to know when running the build: it regenerates `public/sw.js`,
`public/fallback-<hash>.js`, and `next-env.d.ts`, which are committed artifacts.
The fallback file's hash changes every build. Restore them before committing so
they do not pollute the diff:

```bash
rm -f public/fallback-*.js
git checkout -- next-env.d.ts public/sw.js public/fallback-kMQV8Yz_Vmd_J9x02OIFG.js
```

## Resume here

Continue with **Plan A Task 2** in
`docs/superpowers/plans/2026-07-27-expo-plan-a-mobile-api.md`.

## What remains

### Plan A — typed mobile API (tasks 2-11)

Produces a verifiable API and nothing else. No Expo project yet.

| Task | Work |
| --- | --- |
| 2 | `shared/api-types.ts` — the response contract |
| 3 | `shared/api-error.ts` — failure classification (TDD) |
| 4 | `lib/cors.ts` (TDD) + wrap every `NextResponse.json` in the four existing routes |
| 5 | `lib/mobile/table.ts` + `toTimetableSlots` (TDD) |
| 6 | `toGradeEntries`, `toAttendanceEntries` (TDD) |
| 7 | `toPaymentEntries`, `toAnnouncementEntries` (TDD) |
| 8 | `lib/mobile/route-helpers.ts` — session + error mapping + CORS |
| 9 | Six read endpoints under `app/api/mobile/` |
| 10 | Teacher write endpoints: POST attendance, POST grades |
| 11 | Cross-role curl verification — **blocked on the owner**, see below |

### Plan B — Expo client (not yet written)

Deliberately not written yet. Plan A Task 1 Step 6 and Task 8 Step 2 both have
"if this does not resolve, fix it" branches whose outcome determines Plan B's
Metro configuration and the exact context shape the client mirrors. Writing it
now would mean writing against two unverified assumptions.

Plan B will cover: the Expo Router project under `mobile/`, the
`"workspaces": ["mobile"]` key, Metro `watchFolders` for `shared/`, splitting
the translation tables out of `lib/i18n.ts` into `shared/i18n-tables.ts`,
`shared/roles.ts`, Supabase auth on `expo-secure-store`, Face ID via
`expo-local-authentication`, Google OAuth via `expo-auth-session`, the screens,
the offline read cache, and device verification.

## Owner prerequisites — start these now, they have lead times

- **Apple Developer Program** — $99/year, approval takes days
- **Xcode** with a signing team configured
- **`SUPABASE_SERVICE_ROLE_KEY`** — currently unset. Without it `/admin/users`
  returns 501, so you cannot create the four role accounts Plan A Task 11 needs,
  nor the demo account App Store Review requires
- **`NEXT_PUBLIC_SITE_URL`** — currently unset
- Bundle ID proposed: `mn.novamind.academy`

## Decisions made, and why

**Capacitor wrap → abandoned.** Its own phases 1-4 ended with a webview *plus*
Capacitor plugins *plus* two Swift targets, paying the native cost while keeping
Guideline 4.2 exposure.

**Expo, scoped narrower than the web.** A native rewrite is viable here because
role scoping, request auth, and the schema are all server-side already, so it is
a **UI-only** rewrite. Admin stays on the web: a 3,549-line admin CRUD dashboard
on a phone is a worse product however it is built.

**New typed endpoints rather than reusing the table shape.** `/api/school/*`
returns `{columns, ids, rows}` with every value stringified.

**The load-bearing rule:** the new `/api/mobile/*` routes call the existing
`listResource` / `createResource` and never write their own SQL. If they did,
authorization would live in two places and eventually diverge — a student
reading another student's grades. Plan A Task 11 proves it end to end.

## Verified constraints — do not re-derive, do not contradict

- `listResource` with `mode: "page"` **throws** `"subjectId is required."` for a
  student or parent on attendance, grades, assignments, materials, or timetable
  (`lib/school-db.ts:790-795`). Mobile uses summary mode — omit `mode`.
- `createResource` computes `context?.session.role ?? "admin"`
  (`lib/school-db.ts:975`) — calling it without a context silently grants admin.
- Write authorization already exists: `requireManageAccess`
  (`lib/school-db.ts:827`) with `manageRolesFor` (`lib/school-db.ts:806`).
  `attendance` and `grades` are `{admin, teacher}`.
- `output: 'export'` fails on route handlers rather than skipping them. Relevant
  only to the abandoned approach, recorded so nobody retries it blindly.

## Known web-side defects, deliberately not fixed

Found while designing the Capacitor approach. Both affect the web app and are
out of scope for the mobile work:

- `lib/supabase.ts:27` pins the Supabase session to `sessionStorage`, so closing
  the browser signs the user out. Arguably intended on web.
- `components/NoConnection.tsx:37` probes `/favicon.ico` and blocks the whole
  screen. The probe works on the web, so this is cosmetic there.
