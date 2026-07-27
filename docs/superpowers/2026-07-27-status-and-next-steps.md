# Status & Next Steps — 2026-07-27

Handoff written mid-execution because the machine ran out of disk space. Read
this first; it tells you exactly where work stopped and what to do next.

## BLOCKER: disk full

`npm run build` failed with `ENOSPC: no space left on device`, and afterwards no
shell command could run at all — the tooling could not even write its own output
file. **Nothing can proceed until space is freed.**

Diagnose and clear:

```bash
df -h /System/Volumes/Data
rm -rf ~/Desktop/Projects/school-managment-system/.next
npm cache clean --force
du -sh ~/Desktop/Projects/*/node_modules 2>/dev/null | sort -h
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

### Uncommitted, on disk right now

Plan A Task 1 was written but never committed:

- `vitest.config.ts` — new
- `shared/__tests__/smoke.test.ts` — new
- `package.json` — added `test` / `test:watch` scripts, `vitest@^3.2.7` devDep
- `tsconfig.json` — added the `@shared/*` path alias

These files are in place. Do not rewrite them; just finish verifying and commit.

### Verification actually performed — stated plainly

| Check | Result |
| --- | --- |
| `npm test` | **Passed** — 1 test, vitest 3.2.7 |
| `npx tsc --noEmit` | **Passed** — no errors |
| `npm run build` | **Did not complete.** Compiled successfully and generated all 12 pages, then failed writing build traces with `ENOSPC`. This is a disk failure, not a code failure — but it means the build is *unverified*, not verified. |
| Task 1 commit | **Not done** |

An attempt to `rm -rf .next` was made but could not be confirmed, because the
shell had already stopped returning output.

## Resume here

1. Free disk space (above).
2. Re-run the Task 1 verification: `npm test`, `npx tsc --noEmit`,
   `npm run build`. All three must pass before committing.
3. Commit Task 1:
   ```bash
   git add package.json package-lock.json tsconfig.json vitest.config.ts shared
   git commit -m "test: add vitest and a shared/ directory"
   ```
4. Continue with Plan A Task 2 in
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
