# Expo Mobile App — Design

**Date:** 2026-07-27
**Status:** Approved for planning
**Supersedes:** `docs/superpowers/specs/2026-07-27-ios-app-store-phase1-design.md`

## Context

The goal is an App Store-publishable iOS app for Nova Mind Academy. An Android
AAB already exists, generated externally from the PWA.

A Capacitor wrap was designed first and abandoned before implementation. The
deciding argument came from that spec itself: its phases 1-4 end with a webview
*plus* Capacitor plugins *plus* two Swift targets (Home Screen widget, native
attendance screen). That pays the native cost while keeping the App Store Review
Guideline 4.2 (Minimum Functionality) exposure.

A native rewrite is viable here specifically because **it is a UI-only rewrite**:

| Already exists, reused unchanged | Where |
| --- | --- |
| Role-scoped row filtering | `lib/school-db.ts` — `allowedSubjectNames`, `filterResourceTable` |
| Bearer-token request auth | `lib/school-session.ts` — `resolveRequestSession` |
| Postgres schema, seeding, file-store fallback | `lib/school-db.ts` |
| Supabase Auth, roles in `user_metadata` | `lib/supabase.ts` |

What gets rewritten is presentation: `DashboardApp.tsx` (3,549 lines), the
landing page, login, and `admin/users` — and most of that is out of scope
because admin stays on the web.

## Scope

Mobile ships the flows people open on a phone. Everything else stays on the web.

**Student and parent (read-only):**
Home (today's schedule + latest grades), Timetable, Grades, Attendance,
Announcements, Payments, Settings (language, sign out).

**Teacher (read plus two writes):**
Home (today's classes), Take attendance, Enter grades, Timetable,
Announcements, Settings.

**Admin:** web only. Signing in as an admin on mobile shows a screen explaining
that administration lives on the web, with a link.

**Explicitly out of the first version:** subjects, assignments, materials,
classes, students/teachers/parents directories, admin CRUD, file upload and
download, push notifications, offline write-sync.

## Non-goals

- Feature parity with the web dashboard. A 3,549-line admin CRUD screen on a
  phone is a worse product regardless of how it is built.
- Replacing the web app. The web remains the full-capability surface.

## Architecture

### Repository layout

One repo, npm workspaces. The web app stays at the root so the Vercel project
needs no reconfiguration.

```
school-managment-system/
├─ app/ lib/ components/      Next.js web — unchanged
├─ app/api/mobile/            NEW typed endpoints
├─ shared/
│   ├─ api-types.ts           imported by both web and mobile
│   ├─ roles.ts               role → visible mobile tabs
│   └─ i18n-tables.ts         the pure translation tables
├─ mobile/                    NEW Expo Router app
└─ package.json               workspaces: ["mobile"]
```

`lib/i18n.ts` splits: the translation tables are plain data and move to
`shared/i18n-tables.ts`; the `window`-dependent helpers (`getInitialLanguage`,
`getStoredLanguage`, `languageStorageKey`) stay in `lib/i18n.ts` and re-export
the tables so no web import path changes.

Expo requires Metro `watchFolders` and `nodeModulesPaths` configuration to
resolve `shared/` across the workspace boundary. This is the one piece of
friction in this layout and is a known, documented Expo monorepo setup.

### Typed mobile endpoints

**The single most important rule in this design: the new endpoints must not
write their own queries.** They call the existing `listResource()` and project
its result into typed objects.

```
GET /api/mobile/timetable
  └─ resolveRequestSession(request)      existing — Bearer token → role, email
      └─ listResource("timetable", ctx)  existing — applies role scoping
          └─ toTimetableSlots(table)     NEW — projection only
```

If a mobile endpoint issued its own SQL, the authorization rules would live in
two places and would eventually diverge. The failure mode is a student seeing
another student's grades. Reusing `listResource` makes that structurally
impossible: teacher-sees-own-subjects, student-sees-own-rows, and
parent-sees-their-child's-rows all come along unchanged.

**Use `mode: "summary"`, the default.** Verified in `lib/school-db.ts:790-795`:
with `mode: "page"`, `listResource` **throws** `"subjectId is required."` for a
student or parent requesting attendance, grades, assignments, materials, or
timetable without a `subjectId`. Summary mode returns every scoped row, which is
what a "my grades" screen wants.

Projection happens server-side, once, rather than in every client. The existing
tables stringify everything — `rowToArray` maps every value through
`stringValue` — so parsing `"92"` into a number and `"08:30-09:15"` into two
times belongs at this boundary.

**Endpoints:**

| Route | Method | Source resource | Roles |
| --- | --- | --- | --- |
| `/api/mobile/me` | GET | session only | all |
| `/api/mobile/timetable` | GET | `timetable` | all |
| `/api/mobile/grades` | GET | `grades` | all |
| `/api/mobile/attendance` | GET | `attendance` | all |
| `/api/mobile/announcements` | GET | `announcements` | all |
| `/api/mobile/payments` | GET | `payments` | student, parent |
| `/api/mobile/attendance` | POST | `attendance` | teacher |
| `/api/mobile/grades` | POST | `grades` | teacher |

Writes go through the existing `createResource` / `updateResource`. Write
authorization is already enforced there and is reused as-is:

- `requireManageAccess` (`lib/school-db.ts:827`) rejects the caller unless their
  role is in `manageRolesFor(resource)` (`lib/school-db.ts:806`). For
  `attendance` and `grades` that set is `{admin, teacher}`, so a student or
  parent POST fails with "You do not have permission to manage this resource."
- `ensureTeacherSubject` (`lib/school-db.ts:951`) additionally forces a
  teacher's write onto their own assigned subject, so a teacher cannot record
  grades for a subject they do not teach.

One caveat the mobile routes must respect: `createResource` computes
`const role = context?.session.role ?? "admin"` — **it defaults to admin when no
context is passed**. Every mobile route must pass the resolved
`SchoolRequestContext`, never call these helpers without one. `resolveRequestSession`
returning `null` must produce a 401 before any write helper is reached.

Source column orders, confirmed from `resourceColumns` in `lib/school-db.ts`:

- `timetable` → `["Subject", "Day", "Time", "Teacher", "Class"]`
- `grades` → `["Student", "Subject", "Score", "Semester"]`
- `attendance` → `["Student", "Subject", "Date", "Status"]`
- `payments` → `["Student", "Amount", "Status", "Due Date"]`
- `announcements` → `["Title", "Content", "Audience", "Date"]`

Projections must resolve columns **by name**, not by index, so a column
reordering in `school-db.ts` cannot silently corrupt mobile responses.

### Shared types

`shared/api-types.ts` holds the response contract. Both the route handlers and
the Expo client import it, so a shape change breaks the build on both sides
rather than at runtime on a user's phone.

### Authentication

`@supabase/supabase-js` runs in React Native with `react-native-url-polyfill`.
The session store is `expo-secure-store` (Keychain-backed) — the same conclusion
the superseded spec reached, on a different runtime.

Face ID via `expo-local-authentication` gates reading the stored token. Every
unhappy path — no biometry enrolled, prompt cancelled, hardware unavailable —
falls through to the normal login screen. Biometric failure must never lock a
user out.

Google OAuth uses `expo-auth-session`, which runs in `ASWebAuthenticationSession`
rather than an embedded webview. Google rejects OAuth from embedded webviews with
`disallowed_useragent`; this is the same constraint the superseded spec recorded.

### Navigation

Expo Router with a tab layout. `shared/roles.ts` maps role → visible tabs,
mirroring the web's `visibleModulesByRole` (`DashboardApp.tsx:129`) but with the
reduced mobile set:

- student, parent: Home · Timetable · Grades · Attendance · Announcements
  (Payments is reached from Home, not a tab)
- teacher: Home · Attendance · Grades · Timetable · Announcements
- admin: a single screen directing them to the web

The role comes from Supabase `user_metadata.role` and **defaults to `student`**
when absent — matching `lib/auth-flow.ts`. Keep that default identical; a
divergence between web and mobile defaults would be a silent privilege
difference.

### Offline

Read-only. The last successful response per endpoint is cached in
`AsyncStorage` (not SecureStore — this is not credential material) and shown
when a request fails at the transport layer. A banner indicates stale data.

Teacher writes are blocked offline with a clear message. No sync queue: a
partial write-sync implementation risks corrupting attendance and grade records,
and it is not needed for a first release.

### Error handling

Reuse the classification from `lib/api-error.ts` (carried over from the
superseded plan):

| Condition | Response |
| --- | --- |
| Transport failure | Cached data + stale banner |
| 401 | Clear the stored token, return to login |
| 403 | "You do not have permission" — no retry |
| Other 4xx | Show the server message |
| 5xx | "Try again later" + retry |

### CORS

The Expo client is cross-origin, so the four existing route handlers plus the
new mobile routes need CORS. This is the `lib/cors.ts` work from the superseded
plan with a different allowed origin. Do not use a wildcard: these endpoints
carry bearer tokens.

## Carried over from the superseded plan

Three items survive the pivot and are folded into this design rather than
rewritten: CORS on the route handlers, `lib/api-error.ts`, and setting
`NEXT_PUBLIC_SITE_URL`.

## Known web-side defects, deliberately left alone

These were found while designing the Capacitor approach. They affect the **web**
app and are not fixed by this work. They are recorded so they are not lost, and
scheduling them is a separate decision:

- `lib/supabase.ts:27` pins the Supabase session to `sessionStorage`, so closing
  the browser signs the user out. That is arguably intended on web; it was only
  a defect for a packaged app.
- `components/NoConnection.tsx:37` probes `/favicon.ico` and blocks the whole
  screen. On the web the probe works, so this is cosmetic there.

## Prerequisites (owner action)

Not blocking development; blocking release. The first two have multi-day lead
times.

- Apple Developer Program membership ($99/year)
- Xcode with a configured signing team
- `SUPABASE_SERVICE_ROLE_KEY` — currently unset. Needed to provision the demo
  account App Store Review requires, which must be a real Supabase user with
  `user_metadata.role` set.
- `NEXT_PUBLIC_SITE_URL` — currently unset
- Bundle ID: `mn.novamind.academy`

## Verification

The web repo has no test framework. This design adds Vitest for the projection
functions, which are pure and are the code most likely to break silently:
given a `ResourceTable`, does `toTimetableSlots` produce the right typed objects,
including when a column is missing or a value is unparseable.

Device verification on a physical iPhone:

1. Sign in as each of student, parent, teacher — each sees only its own tabs.
2. Force-quit and reopen — Face ID, then still signed in.
3. Deny Face ID — login screen appears, app stays usable.
4. A student's Grades screen shows only that student's rows.
5. A teacher's Grades screen shows only their subjects.
6. Airplane mode — cached data renders with a stale banner; a teacher write is
   blocked with a message.
7. Google sign-in opens a system browser sheet, not an embedded webview.
8. Sign in as admin — the web-only screen appears.
9. With a student's token, `POST /api/mobile/grades` via curl — must return 403,
   not a created row. The UI never offers this, so it has to be tested at the
   API.

Checks 4, 5, and 9 are the ones that matter most: they prove the reused
`listResource` read scoping and `requireManageAccess` write scoping actually
reach the mobile client.

## Risks

| Risk | Mitigation |
| --- | --- |
| Authorization diverges between web and mobile | Endpoints call `listResource`; never their own SQL. Device checks 4 and 5 verify it end to end. |
| Metro cannot resolve `shared/` across the workspace | Standard Expo monorepo config; validated in the first implementation task before any screens are built |
| Column rename in `school-db.ts` breaks a projection | Projections resolve columns by name and fail loudly; Vitest covers the missing-column case |
| App Store rejection | A real native app with device integrations is a far stronger 4.2 position than a webview. Not zero risk, but not the same class of risk. |

## Future work (not this spec)

- Push notifications for announcements, grades, and payment reminders
- Subjects, assignments, and materials, including file upload from camera
- Offline write-sync queue for teacher attendance and grades
- Home Screen widget showing today's schedule
- Retiring the externally generated Android AAB in favour of the Expo Android
  build, so both platforms ship from this codebase
