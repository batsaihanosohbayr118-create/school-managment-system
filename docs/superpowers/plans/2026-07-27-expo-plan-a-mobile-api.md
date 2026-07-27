# Expo Mobile — Plan A: Typed Mobile API

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expose the existing school data to a native client as typed, role-scoped JSON, without duplicating any authorization logic.

**Architecture:** New `/api/mobile/*` route handlers call the existing `listResource()` and `createResource()` and project their `{columns, ids, rows}` results into typed objects. Response types live in `shared/`, imported by both the routes and (in Plan B) the Expo client. All four pre-existing route handlers plus the new ones gain CORS, since a native client is cross-origin.

**Tech Stack:** Next.js 16.2.6 route handlers, TypeScript 6.0.3, Vitest (new), npm workspaces (new).

**Spec:** `docs/superpowers/specs/2026-07-27-expo-mobile-app-design.md`

**Scope boundary:** This plan produces a verifiable API and nothing else. No Expo project, no screens, no auth UI — those are Plan B. Plan A is done when every endpoint returns correct typed data for every role, proven with curl and Vitest.

---

## The one rule that must not be broken

Route handlers in this plan **never write SQL and never re-implement a role
check**. They call `listResource` / `createResource` and project the result.

If a mobile endpoint issued its own query, the authorization rules would exist in
two places and would eventually diverge. The failure mode is a student reading
another student's grades. Task 11 verifies this end to end.

## Verified constraints these tasks depend on

Confirmed by reading `lib/school-db.ts` while writing the spec — do not
re-derive, but do not contradict either:

- `listResource(resource, ctx)` with `ctx.mode === "page"` **throws**
  `"subjectId is required."` for a student or parent on attendance, grades,
  assignments, materials, or timetable when `ctx.subjectId` is absent
  (`school-db.ts:790-795`). **Use summary mode** — omit `mode`.
- `createResource` computes `const role = context?.session.role ?? "admin"`
  (`school-db.ts:975`). Passing no context silently grants admin. Every route
  must pass a real context.
- `requireManageAccess` (`school-db.ts:827`) with `manageRolesFor`
  (`school-db.ts:806`) already restricts writes: `attendance` and `grades` are
  `{admin, teacher}`; `payments` and `announcements` are `{admin}` only.
- Every value in a `ResourceTable` is a string. `rowToArray` maps everything
  through `stringValue` (`school-db.ts:507-534`). Scores arrive as `"92"`,
  payment amounts as `"$2,840"`, timetable times as free text like
  `"08:30-09:15"`.

## File structure

| File | Responsibility | Task |
| --- | --- | --- |
| `vitest.config.ts` | Test runner | 1 |
| `shared/api-types.ts` | Response contract shared with the Expo client | 2 |
| `shared/api-error.ts` | Failure classification used by both clients | 3 |
| `lib/cors.ts` | CORS headers + preflight factory | 4 |
| `lib/mobile/table.ts` | Column-by-name lookup and value coercion | 5 |
| `lib/mobile/projections.ts` | `ResourceTable` → typed objects | 5, 6, 7 |
| `lib/mobile/route-helpers.ts` | Auth + CORS + error mapping for mobile routes | 8 |
| `app/api/mobile/*/route.ts` | The endpoints | 9, 10 |

---

### Task 1: npm workspaces, shared directory, Vitest

**Files:**
- Create: `vitest.config.ts`, `shared/.gitkeep`
- Modify: `package.json`, `tsconfig.json`

- [ ] **Step 1: Install Vitest**

```bash
npm i -D vitest@^3
```

- [ ] **Step 2: Declare the workspace and test scripts**

In `package.json`, add a top-level `"workspaces"` key (the `mobile` package does
not exist yet; it is created in Plan B, and npm tolerates the entry only once the
directory exists — so add it in Plan B instead). For now add only the scripts:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 3: Make `@shared/*` resolvable**

In `tsconfig.json`, extend `compilerOptions.paths` so it reads:

```json
"paths": {
  "@/*": ["./*"],
  "@shared/*": ["./shared/*"]
}
```

- [ ] **Step 4: Create the Vitest config**

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["lib/**/__tests__/**/*.test.ts", "shared/__tests__/**/*.test.ts"]
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      "@shared": path.resolve(__dirname, "shared")
    }
  }
});
```

- [ ] **Step 5: Write a failing smoke test**

Create `shared/__tests__/smoke.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { isRole } from "@/lib/auth-flow";

describe("test harness", () => {
  it("resolves the @ alias", () => {
    expect(isRole("teacher")).toBe(true);
    expect(isRole("principal")).toBe(false);
  });
});
```

- [ ] **Step 6: Run it**

Run: `npm test`
Expected: PASS, 1 test. If the alias fails to resolve, fix `vitest.config.ts`
before continuing — every later task depends on it.

- [ ] **Step 7: Confirm the web build is untouched**

```bash
npx tsc --noEmit
npm run build
```

Expected: both pass.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json tsconfig.json vitest.config.ts shared
git commit -m "test: add vitest and a shared/ directory

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: Shared response contract

**Files:**
- Create: `shared/api-types.ts`

- [ ] **Step 1: Write the types**

Create `shared/api-types.ts`:

```ts
/**
 * The contract between the mobile API routes and the Expo client.
 *
 * Imported by both sides so a shape change breaks the build rather than
 * failing at runtime on a phone.
 *
 * Design note: the underlying tables store every value as a string
 * (`rowToArray` in lib/school-db.ts maps everything through `stringValue`).
 * Fields that we parse therefore come in pairs — a parsed value that may be
 * null, and the original label. A phone should render the label and use the
 * parsed number only for sorting or arithmetic.
 */
export type MobileRole = "admin" | "teacher" | "student" | "parent";

export type MobileProfile = {
  email: string;
  name: string;
  role: MobileRole;
  avatarUrl: string;
};

export type TimetableSlot = {
  id: string;
  subject: string;
  day: string;
  /** Original free-text time, e.g. "08:30-09:15". Always render this. */
  timeLabel: string;
  /** Parsed start, "HH:MM", or null when timeLabel is not a range. */
  startsAt: string | null;
  endsAt: string | null;
  teacher: string;
  className: string;
};

export type GradeEntry = {
  id: string;
  student: string;
  subject: string;
  scoreLabel: string;
  score: number | null;
  semester: string;
};

export type AttendanceEntry = {
  id: string;
  student: string;
  subject: string;
  date: string;
  status: string;
};

export type PaymentEntry = {
  id: string;
  student: string;
  /** Original label, e.g. "$2,840". Always render this. */
  amountLabel: string;
  amount: number | null;
  status: string;
  dueDate: string;
};

export type AnnouncementEntry = {
  id: string;
  title: string;
  content: string;
  audience: string;
  date: string;
};

export type MobileErrorBody = { message: string };

export type TimetableResponse = { slots: TimetableSlot[] };
export type GradesResponse = { grades: GradeEntry[] };
export type AttendanceResponse = { entries: AttendanceEntry[] };
export type PaymentsResponse = { payments: PaymentEntry[] };
export type AnnouncementsResponse = { announcements: AnnouncementEntry[] };
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add shared/api-types.ts
git commit -m "feat: add the shared mobile API contract

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3: Shared error classification

**Files:**
- Create: `shared/api-error.ts`
- Test: `shared/__tests__/api-error.test.ts`

- [ ] **Step 1: Write the failing test**

Create `shared/__tests__/api-error.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { ApiError, classifyStatus } from "@shared/api-error";

describe("classifyStatus", () => {
  it("maps 401 to session-expired", () => {
    expect(classifyStatus(401)).toBe("session-expired");
  });

  it("maps 403 to forbidden", () => {
    expect(classifyStatus(403)).toBe("forbidden");
  });

  it("maps other 4xx to bad-request", () => {
    expect(classifyStatus(400)).toBe("bad-request");
    expect(classifyStatus(404)).toBe("bad-request");
  });

  it("maps 5xx to server-error", () => {
    expect(classifyStatus(500)).toBe("server-error");
    expect(classifyStatus(503)).toBe("server-error");
  });
});

describe("ApiError", () => {
  it("carries the kind and message", () => {
    const error = new ApiError("forbidden", "Not allowed.");
    expect(error.kind).toBe("forbidden");
    expect(error.message).toBe("Not allowed.");
    expect(error).toBeInstanceOf(Error);
  });

  it("exposes offline as its own kind", () => {
    expect(new ApiError("offline", "No connection.").kind).toBe("offline");
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test`
Expected: FAIL — cannot resolve `@shared/api-error`.

- [ ] **Step 3: Write the implementation**

Create `shared/api-error.ts`:

```ts
/**
 * A client that collapses every failure into a bare Error cannot tell "you are
 * offline" from "your session expired". On a phone those need different
 * responses: one shows cached data, the other returns to the login screen.
 */
export type ApiErrorKind =
  | "offline"
  | "session-expired"
  | "forbidden"
  | "bad-request"
  | "server-error";

export class ApiError extends Error {
  readonly kind: ApiErrorKind;

  constructor(kind: ApiErrorKind, message: string) {
    super(message);
    this.name = "ApiError";
    this.kind = kind;
  }
}

export function classifyStatus(status: number): ApiErrorKind {
  if (status === 401) return "session-expired";
  if (status === 403) return "forbidden";
  if (status >= 500) return "server-error";
  return "bad-request";
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npm test`
Expected: PASS, 7 tests total.

- [ ] **Step 5: Commit**

```bash
git add shared/api-error.ts shared/__tests__/api-error.test.ts
git commit -m "feat: add shared API failure classification

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 4: CORS for cross-origin clients

**Files:**
- Create: `lib/cors.ts`
- Test: `lib/__tests__/cors.test.ts`
- Modify: `app/api/school/[resource]/route.ts`, `app/api/admin/users/route.ts`, `app/api/subjects/[id]/content/route.ts`, `app/api/records/route.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/__tests__/cors.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { corsHeaders, isAllowedOrigin } from "@/lib/cors";

describe("isAllowedOrigin", () => {
  it("allows the Expo dev client origin", () => {
    expect(isAllowedOrigin("http://localhost:8081")).toBe(true);
  });

  it("rejects an arbitrary site", () => {
    expect(isAllowedOrigin("https://evil.example")).toBe(false);
  });

  it("rejects a null origin", () => {
    expect(isAllowedOrigin(null)).toBe(false);
  });
});

describe("corsHeaders", () => {
  it("echoes an allowed origin rather than using a wildcard", () => {
    const headers = corsHeaders("http://localhost:8081", ["GET", "POST"]);
    expect(headers["Access-Control-Allow-Origin"]).toBe("http://localhost:8081");
  });

  it("never emits a wildcard, because these endpoints carry bearer tokens", () => {
    const headers = corsHeaders("http://localhost:8081", ["GET"]);
    expect(Object.values(headers)).not.toContain("*");
  });

  it("returns nothing for a disallowed origin", () => {
    expect(corsHeaders("https://evil.example", ["GET"])).toEqual({});
  });

  it("advertises the headers the session resolver reads", () => {
    const headers = corsHeaders("http://localhost:8081", ["GET"]);
    const allowed = headers["Access-Control-Allow-Headers"].toLowerCase();
    expect(allowed).toContain("authorization");
    expect(allowed).toContain("x-demo-session");
    expect(allowed).toContain("content-type");
  });

  it("lists the given methods plus OPTIONS", () => {
    expect(corsHeaders("http://localhost:8081", ["GET", "DELETE"])["Access-Control-Allow-Methods"])
      .toBe("GET, DELETE, OPTIONS");
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test`
Expected: FAIL — cannot resolve `@/lib/cors`.

- [ ] **Step 3: Write the implementation**

Create `lib/cors.ts`:

```ts
import { NextResponse } from "next/server";

/**
 * A React Native client is cross-origin. Because `resolveRequestSession` reads
 * the `Authorization` header, every request is a non-simple request and
 * preflights.
 *
 * No wildcard: these endpoints accept bearer tokens. A native release build
 * sends no Origin header at all, in which case CORS does not apply and the
 * request proceeds normally — the entries below exist for the Expo dev client
 * and web callers.
 */
const staticOrigins = [
  "http://localhost:8081",  // Expo dev server
  "http://localhost:19006", // Expo web
  "http://localhost:3000"   // local Next dev
];

function allowedOrigins(): Set<string> {
  const extra = (process.env.MOBILE_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  return new Set([...staticOrigins, ...extra]);
}

export function isAllowedOrigin(origin: string | null): boolean {
  return origin !== null && allowedOrigins().has(origin);
}

export function corsHeaders(origin: string | null, methods: string[]): Record<string, string> {
  if (!isAllowedOrigin(origin)) return {};

  return {
    "Access-Control-Allow-Origin": origin as string,
    "Access-Control-Allow-Methods": [...methods, "OPTIONS"].join(", "),
    "Access-Control-Allow-Headers": "authorization, content-type, x-demo-session",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin"
  };
}

/** The `OPTIONS` export a route uses to answer preflight. */
export function preflight(methods: string[]) {
  return async function OPTIONS(request: Request) {
    return new NextResponse(null, { status: 204, headers: corsHeaders(request.headers.get("origin"), methods) });
  };
}

/** Copies CORS headers onto a response a handler already built. */
export function withCors<T extends NextResponse>(response: T, request: Request, methods: string[]): T {
  for (const [key, value] of Object.entries(corsHeaders(request.headers.get("origin"), methods))) {
    response.headers.set(key, value);
  }
  return response;
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npm test`
Expected: PASS, 15 tests total.

- [ ] **Step 5: Apply to the four existing routes**

The exported verbs were confirmed while planning — use exactly these:

| File | `METHODS` |
| --- | --- |
| `app/api/school/[resource]/route.ts` | `["GET", "POST", "PATCH", "DELETE"]` |
| `app/api/admin/users/route.ts` | `["GET", "POST", "PATCH", "DELETE"]` |
| `app/api/subjects/[id]/content/route.ts` | `["GET", "POST"]` |
| `app/api/records/route.ts` | `["GET", "POST"]` |

In each file add the import, the exact `METHODS` line for that file from the
table, and the `OPTIONS` export. For `app/api/school/[resource]/route.ts` that
is verbatim:

```ts
import { preflight, withCors } from "@/lib/cors";

const METHODS = ["GET", "POST", "PATCH", "DELETE"];

export const OPTIONS = preflight(METHODS);
```

`app/api/admin/users/route.ts` uses the same `METHODS` array.
`app/api/subjects/[id]/content/route.ts` and `app/api/records/route.ts` both use:

```ts
const METHODS = ["GET", "POST"];
```

Then wrap every `return NextResponse.json(...)`:

```ts
// before
return NextResponse.json({ message: "Unauthorized." }, { status: 401 });

// after
return withCors(NextResponse.json({ message: "Unauthorized." }, { status: 401 }), request, METHODS);
```

Use whatever the handler names its `Request` parameter — `GET` in
`app/api/school/[resource]/route.ts` names it `_request`, the others use
`request`.

Count the call sites first so you know when you are done:

Run: `grep -c "NextResponse.json" app/api/school/\[resource\]/route.ts app/api/admin/users/route.ts app/api/subjects/\[id\]/content/route.ts app/api/records/route.ts`

- [ ] **Step 6: Verify the preflight against a running server**

```bash
npm run dev
```

In another terminal:

```bash
curl -si -X OPTIONS http://localhost:3000/api/school/students \
  -H "Origin: http://localhost:8081" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: authorization" | head -20
```

Expected: `HTTP/1.1 204` with `Access-Control-Allow-Origin: http://localhost:8081`.

```bash
curl -si -X OPTIONS http://localhost:3000/api/school/students -H "Origin: https://evil.example" | head -20
```

Expected: 204 with **no** `Access-Control-Allow-Origin` header.

- [ ] **Step 7: Commit**

```bash
git add lib/cors.ts lib/__tests__/cors.test.ts app/api
git commit -m "feat: add CORS for cross-origin native clients

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 5: Table helpers and the timetable projection

**Files:**
- Create: `lib/mobile/table.ts`, `lib/mobile/projections.ts`
- Test: `lib/mobile/__tests__/table.test.ts`, `lib/mobile/__tests__/projections.test.ts`

- [ ] **Step 1: Write the failing table-helper test**

Create `lib/mobile/__tests__/table.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { columnIndex, parseMoney, parseScore, parseTimeRange } from "@/lib/mobile/table";

const columns = ["Subject", "Day", "Time", "Teacher", "Class"];

describe("columnIndex", () => {
  it("finds a column by name", () => {
    expect(columnIndex(columns, "Time")).toBe(2);
  });

  it("is case-insensitive", () => {
    expect(columnIndex(columns, "time")).toBe(2);
  });

  it("throws with a useful message when the column is gone", () => {
    expect(() => columnIndex(columns, "Room")).toThrow(/Room/);
  });
});

describe("parseScore", () => {
  it("parses a plain number", () => {
    expect(parseScore("92")).toBe(92);
  });

  it("parses a decimal", () => {
    expect(parseScore("87.5")).toBe(87.5);
  });

  it("returns null for empty input", () => {
    expect(parseScore("")).toBeNull();
  });

  it("returns null for text", () => {
    expect(parseScore("N/A")).toBeNull();
  });
});

describe("parseMoney", () => {
  it("strips a currency symbol and separators", () => {
    expect(parseMoney("$2,840")).toBe(2840);
  });

  it("handles a bare number", () => {
    expect(parseMoney("500")).toBe(500);
  });

  it("returns null for text", () => {
    expect(parseMoney("Unpaid")).toBeNull();
  });

  it("returns null for empty input", () => {
    expect(parseMoney("")).toBeNull();
  });
});

describe("parseTimeRange", () => {
  it("splits a hyphenated range", () => {
    expect(parseTimeRange("08:30-09:15")).toEqual({ startsAt: "08:30", endsAt: "09:15" });
  });

  it("tolerates spaces around the hyphen", () => {
    expect(parseTimeRange("08:30 - 09:15")).toEqual({ startsAt: "08:30", endsAt: "09:15" });
  });

  it("returns nulls for a single time", () => {
    expect(parseTimeRange("08:30")).toEqual({ startsAt: null, endsAt: null });
  });

  it("returns nulls for free text", () => {
    expect(parseTimeRange("Morning")).toEqual({ startsAt: null, endsAt: null });
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test`
Expected: FAIL — cannot resolve `@/lib/mobile/table`.

- [ ] **Step 3: Write the table helpers**

Create `lib/mobile/table.ts`:

```ts
/**
 * Helpers for projecting a `ResourceTable` into typed objects.
 *
 * Columns are resolved by name, never by index, so reordering
 * `resourceColumns` in lib/school-db.ts cannot silently corrupt a mobile
 * response — it throws instead.
 *
 * Every table value is a string (`rowToArray` maps everything through
 * `stringValue`), so the parsers below all return null rather than NaN when the
 * source is free text.
 */
export function columnIndex(columns: string[], name: string): number {
  const index = columns.findIndex((column) => column.toLowerCase() === name.toLowerCase());
  if (index < 0) {
    throw new Error(`Column "${name}" is missing. Available: ${columns.join(", ")}`);
  }
  return index;
}

export function parseScore(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseMoney(value: string): number | null {
  const digits = value.replace(/[^0-9.-]/g, "");
  if (!digits) return null;

  const parsed = Number(digits);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseTimeRange(value: string): { startsAt: string | null; endsAt: string | null } {
  const match = value.match(/^\s*(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})\s*$/);
  if (!match) return { startsAt: null, endsAt: null };

  return { startsAt: match[1], endsAt: match[2] };
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npm test`
Expected: PASS, 30 tests total.

- [ ] **Step 5: Write the failing timetable projection test**

Create `lib/mobile/__tests__/projections.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { ResourceTable } from "@/lib/school-db";
import { toTimetableSlots } from "@/lib/mobile/projections";

const timetable: ResourceTable = {
  columns: ["Subject", "Day", "Time", "Teacher", "Class"],
  ids: ["TI-1", "TI-2"],
  rows: [
    ["Математик", "Мягмар", "08:30-09:15", "Б.Дорж", "11а"],
    ["Физик", "Лхагва", "Morning", "С.Оюун", "11а"]
  ]
};

describe("toTimetableSlots", () => {
  it("maps every row with its id", () => {
    const slots = toTimetableSlots(timetable);
    expect(slots).toHaveLength(2);
    expect(slots[0].id).toBe("TI-1");
    expect(slots[0].subject).toBe("Математик");
    expect(slots[0].teacher).toBe("Б.Дорж");
    expect(slots[0].className).toBe("11а");
  });

  it("parses a time range into start and end", () => {
    const [first] = toTimetableSlots(timetable);
    expect(first.startsAt).toBe("08:30");
    expect(first.endsAt).toBe("09:15");
  });

  it("keeps the original label so the UI can always render something", () => {
    const [, second] = toTimetableSlots(timetable);
    expect(second.timeLabel).toBe("Morning");
    expect(second.startsAt).toBeNull();
    expect(second.endsAt).toBeNull();
  });

  it("returns an empty array for an empty table", () => {
    expect(toTimetableSlots({ columns: timetable.columns, ids: [], rows: [] })).toEqual([]);
  });

  it("throws when a source column has been renamed", () => {
    const broken: ResourceTable = { ...timetable, columns: ["Subject", "Weekday", "Time", "Teacher", "Class"] };
    expect(() => toTimetableSlots(broken)).toThrow(/Day/);
  });
});
```

- [ ] **Step 6: Run it to verify it fails**

Run: `npm test`
Expected: FAIL — cannot resolve `@/lib/mobile/projections`.

- [ ] **Step 7: Write the projection**

Create `lib/mobile/projections.ts`:

```ts
import type { ResourceTable } from "@/lib/school-db";
import type { TimetableSlot } from "@shared/api-types";
import { columnIndex, parseTimeRange } from "./table";

export function toTimetableSlots(table: ResourceTable): TimetableSlot[] {
  const subject = columnIndex(table.columns, "Subject");
  const day = columnIndex(table.columns, "Day");
  const time = columnIndex(table.columns, "Time");
  const teacher = columnIndex(table.columns, "Teacher");
  const className = columnIndex(table.columns, "Class");

  return table.rows.map((row, index) => {
    const timeLabel = row[time] ?? "";
    const { startsAt, endsAt } = parseTimeRange(timeLabel);

    return {
      id: table.ids[index] ?? "",
      subject: row[subject] ?? "",
      day: row[day] ?? "",
      timeLabel,
      startsAt,
      endsAt,
      teacher: row[teacher] ?? "",
      className: row[className] ?? ""
    };
  });
}
```

- [ ] **Step 8: Run it to verify it passes**

Run: `npm test`
Expected: PASS, 35 tests total.

- [ ] **Step 9: Commit**

```bash
git add lib/mobile shared
git commit -m "feat: project the timetable table into typed slots

Columns resolve by name so a rename in school-db.ts throws instead of
silently shifting values.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 6: Grades and attendance projections

**Files:**
- Modify: `lib/mobile/projections.ts`, `lib/mobile/__tests__/projections.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `lib/mobile/__tests__/projections.test.ts`:

```ts
import { toAttendanceEntries, toGradeEntries } from "@/lib/mobile/projections";

const grades: ResourceTable = {
  columns: ["Student", "Subject", "Score", "Semester"],
  ids: ["GR-1", "GR-2"],
  rows: [
    ["Бат", "Математик", "92", "Намар"],
    ["Бат", "Физик", "N/A", "Намар"]
  ]
};

describe("toGradeEntries", () => {
  it("parses a numeric score", () => {
    const [first] = toGradeEntries(grades);
    expect(first.id).toBe("GR-1");
    expect(first.student).toBe("Бат");
    expect(first.subject).toBe("Математик");
    expect(first.score).toBe(92);
    expect(first.scoreLabel).toBe("92");
    expect(first.semester).toBe("Намар");
  });

  it("keeps the label and nulls the number when the score is not numeric", () => {
    const [, second] = toGradeEntries(grades);
    expect(second.score).toBeNull();
    expect(second.scoreLabel).toBe("N/A");
  });

  it("throws when a column is renamed", () => {
    expect(() => toGradeEntries({ ...grades, columns: ["Student", "Subject", "Mark", "Semester"] })).toThrow(/Score/);
  });
});

const attendance: ResourceTable = {
  columns: ["Student", "Subject", "Date", "Status"],
  ids: ["AT-1"],
  rows: [["Бат", "Математик", "2026-05-18", "Present"]]
};

describe("toAttendanceEntries", () => {
  it("maps the row", () => {
    const [first] = toAttendanceEntries(attendance);
    expect(first).toEqual({
      id: "AT-1",
      student: "Бат",
      subject: "Математик",
      date: "2026-05-18",
      status: "Present"
    });
  });

  it("returns an empty array for no rows", () => {
    expect(toAttendanceEntries({ ...attendance, ids: [], rows: [] })).toEqual([]);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test`
Expected: FAIL — `toGradeEntries` and `toAttendanceEntries` are not exported.

- [ ] **Step 3: Write the projections**

Append to `lib/mobile/projections.ts`:

```ts
import type { AttendanceEntry, GradeEntry } from "@shared/api-types";
import { parseScore } from "./table";

export function toGradeEntries(table: ResourceTable): GradeEntry[] {
  const student = columnIndex(table.columns, "Student");
  const subject = columnIndex(table.columns, "Subject");
  const score = columnIndex(table.columns, "Score");
  const semester = columnIndex(table.columns, "Semester");

  return table.rows.map((row, index) => {
    const scoreLabel = row[score] ?? "";

    return {
      id: table.ids[index] ?? "",
      student: row[student] ?? "",
      subject: row[subject] ?? "",
      scoreLabel,
      score: parseScore(scoreLabel),
      semester: row[semester] ?? ""
    };
  });
}

export function toAttendanceEntries(table: ResourceTable): AttendanceEntry[] {
  const student = columnIndex(table.columns, "Student");
  const subject = columnIndex(table.columns, "Subject");
  const date = columnIndex(table.columns, "Date");
  const status = columnIndex(table.columns, "Status");

  return table.rows.map((row, index) => ({
    id: table.ids[index] ?? "",
    student: row[student] ?? "",
    subject: row[subject] ?? "",
    date: row[date] ?? "",
    status: row[status] ?? ""
  }));
}
```

Merge the new imports into the existing import statements at the top of the file
rather than adding duplicates — the `ResourceTable` and `columnIndex` imports
already exist from Task 5.

- [ ] **Step 4: Run it to verify it passes**

Run: `npm test`
Expected: PASS, 40 tests total.

- [ ] **Step 5: Commit**

```bash
git add lib/mobile
git commit -m "feat: project grades and attendance into typed entries

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 7: Payments and announcements projections

**Files:**
- Modify: `lib/mobile/projections.ts`, `lib/mobile/__tests__/projections.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `lib/mobile/__tests__/projections.test.ts`:

```ts
import { toAnnouncementEntries, toPaymentEntries } from "@/lib/mobile/projections";

const payments: ResourceTable = {
  columns: ["Student", "Amount", "Status", "Due Date"],
  ids: ["PA-1", "PA-2"],
  rows: [
    ["Бат", "$2,840", "Unpaid", "2026-06-01"],
    ["Бат", "Waived", "Paid", "2026-05-01"]
  ]
};

describe("toPaymentEntries", () => {
  it("parses a formatted amount while keeping the label", () => {
    const [first] = toPaymentEntries(payments);
    expect(first.id).toBe("PA-1");
    expect(first.amount).toBe(2840);
    expect(first.amountLabel).toBe("$2,840");
    expect(first.status).toBe("Unpaid");
    expect(first.dueDate).toBe("2026-06-01");
  });

  it("nulls the number for a non-numeric amount", () => {
    const [, second] = toPaymentEntries(payments);
    expect(second.amount).toBeNull();
    expect(second.amountLabel).toBe("Waived");
  });

  it("resolves the two-word Due Date column", () => {
    expect(() => toPaymentEntries(payments)).not.toThrow();
  });
});

const announcements: ResourceTable = {
  columns: ["Title", "Content", "Audience", "Date"],
  ids: ["AN-1"],
  rows: [["Амралт", "Даваа гарагт хичээл болохгүй", "All", "2026-05-18"]]
};

describe("toAnnouncementEntries", () => {
  it("maps the row", () => {
    expect(toAnnouncementEntries(announcements)[0]).toEqual({
      id: "AN-1",
      title: "Амралт",
      content: "Даваа гарагт хичээл болохгүй",
      audience: "All",
      date: "2026-05-18"
    });
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test`
Expected: FAIL — the two functions are not exported.

- [ ] **Step 3: Write the projections**

Append to `lib/mobile/projections.ts`:

```ts
import type { AnnouncementEntry, PaymentEntry } from "@shared/api-types";
import { parseMoney } from "./table";

export function toPaymentEntries(table: ResourceTable): PaymentEntry[] {
  const student = columnIndex(table.columns, "Student");
  const amount = columnIndex(table.columns, "Amount");
  const status = columnIndex(table.columns, "Status");
  const dueDate = columnIndex(table.columns, "Due Date");

  return table.rows.map((row, index) => {
    const amountLabel = row[amount] ?? "";

    return {
      id: table.ids[index] ?? "",
      student: row[student] ?? "",
      amountLabel,
      amount: parseMoney(amountLabel),
      status: row[status] ?? "",
      dueDate: row[dueDate] ?? ""
    };
  });
}

export function toAnnouncementEntries(table: ResourceTable): AnnouncementEntry[] {
  const title = columnIndex(table.columns, "Title");
  const content = columnIndex(table.columns, "Content");
  const audience = columnIndex(table.columns, "Audience");
  const date = columnIndex(table.columns, "Date");

  return table.rows.map((row, index) => ({
    id: table.ids[index] ?? "",
    title: row[title] ?? "",
    content: row[content] ?? "",
    audience: row[audience] ?? "",
    date: row[date] ?? ""
  }));
}
```

Again, merge imports into the existing statements.

- [ ] **Step 4: Run it to verify it passes**

Run: `npm test`
Expected: PASS, 44 tests total.

- [ ] **Step 5: Commit**

```bash
git add lib/mobile
git commit -m "feat: project payments and announcements into typed entries

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 8: Shared route helper

**Files:**
- Create: `lib/mobile/route-helpers.ts`

- [ ] **Step 1: Write the helper**

Create `lib/mobile/route-helpers.ts`:

```ts
import { NextResponse } from "next/server";
import { resolveRequestSession } from "@/lib/school-session";
import type { SchoolRequestContext } from "@/lib/school-db";
import { preflight, withCors } from "@/lib/cors";

/**
 * Every mobile route follows the same shape: resolve the session, refuse
 * without one, run the handler, map thrown errors to a status, attach CORS.
 *
 * The context is always passed to school-db helpers. `createResource` computes
 * `context?.session.role ?? "admin"`, so calling it without a context silently
 * grants admin.
 *
 * Note: `mode` is deliberately left unset. `listResource` throws
 * "subjectId is required." for a student or parent in page mode; summary mode
 * returns every row they are allowed to see, which is what a phone screen wants.
 */
export function errorStatus(error: unknown): number {
  const message = error instanceof Error ? error.message.toLowerCase() : "";

  if (message.includes("unauthorized")) return 401;
  if (message.includes("permission") || message.includes("not allowed")) return 403;
  if (message.includes("required") || message.includes("invalid")) return 400;

  return 500;
}

export function errorMessage(error: unknown): string {
  return error instanceof Error && error.message ? error.message : "Request failed.";
}

export type MobileHandler<T> = (context: SchoolRequestContext, request: Request) => Promise<T>;

/** Wraps a handler with session resolution, error mapping, and CORS. */
export function mobileRoute<T>(methods: string[], handler: MobileHandler<T>) {
  return async function route(request: Request) {
    const session = await resolveRequestSession(request);

    if (!session) {
      return withCors(NextResponse.json({ message: "Unauthorized." }, { status: 401 }), request, methods);
    }

    try {
      const body = await handler({ session }, request);
      return withCors(NextResponse.json(body), request, methods);
    } catch (error) {
      return withCors(
        NextResponse.json({ message: errorMessage(error) }, { status: errorStatus(error) }),
        request,
        methods
      );
    }
  };
}

export { preflight };
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: passes. If `SchoolRequestContext` rejects `{ session }`, check whether
`mode` and `subjectId` are optional in its definition (`lib/school-db.ts:15-19`)
— they are, so `{ session }` is valid.

- [ ] **Step 3: Commit**

```bash
git add lib/mobile/route-helpers.ts
git commit -m "feat: add the shared mobile route wrapper

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 9: Read endpoints

**Files:**
- Create: `app/api/mobile/me/route.ts`, `app/api/mobile/timetable/route.ts`, `app/api/mobile/grades/route.ts`, `app/api/mobile/attendance/route.ts`, `app/api/mobile/announcements/route.ts`, `app/api/mobile/payments/route.ts`

- [ ] **Step 1: Write the profile endpoint**

Create `app/api/mobile/me/route.ts`:

```ts
import type { MobileProfile } from "@shared/api-types";
import { mobileRoute, preflight } from "@/lib/mobile/route-helpers";

export const runtime = "nodejs";

const METHODS = ["GET"];

export const OPTIONS = preflight(METHODS);

export const GET = mobileRoute<MobileProfile>(METHODS, async ({ session }) => ({
  email: session.email,
  name: session.name,
  role: session.role,
  avatarUrl: session.avatarUrl
}));
```

- [ ] **Step 2: Write the timetable endpoint**

Create `app/api/mobile/timetable/route.ts`:

```ts
import type { TimetableResponse } from "@shared/api-types";
import { listResource } from "@/lib/school-db";
import { toTimetableSlots } from "@/lib/mobile/projections";
import { mobileRoute, preflight } from "@/lib/mobile/route-helpers";

export const runtime = "nodejs";

const METHODS = ["GET"];

export const OPTIONS = preflight(METHODS);

export const GET = mobileRoute<TimetableResponse>(METHODS, async (context) => ({
  slots: toTimetableSlots(await listResource("timetable", context))
}));
```

- [ ] **Step 3: Write grades, attendance, and announcements**

`app/api/mobile/grades/route.ts`:

```ts
import type { GradesResponse } from "@shared/api-types";
import { listResource } from "@/lib/school-db";
import { toGradeEntries } from "@/lib/mobile/projections";
import { mobileRoute, preflight } from "@/lib/mobile/route-helpers";

export const runtime = "nodejs";

const METHODS = ["GET", "POST"];

export const OPTIONS = preflight(METHODS);

export const GET = mobileRoute<GradesResponse>(METHODS, async (context) => ({
  grades: toGradeEntries(await listResource("grades", context))
}));
```

`app/api/mobile/attendance/route.ts`:

```ts
import type { AttendanceResponse } from "@shared/api-types";
import { listResource } from "@/lib/school-db";
import { toAttendanceEntries } from "@/lib/mobile/projections";
import { mobileRoute, preflight } from "@/lib/mobile/route-helpers";

export const runtime = "nodejs";

const METHODS = ["GET", "POST"];

export const OPTIONS = preflight(METHODS);

export const GET = mobileRoute<AttendanceResponse>(METHODS, async (context) => ({
  entries: toAttendanceEntries(await listResource("attendance", context))
}));
```

`app/api/mobile/announcements/route.ts`:

```ts
import type { AnnouncementsResponse } from "@shared/api-types";
import { listResource } from "@/lib/school-db";
import { toAnnouncementEntries } from "@/lib/mobile/projections";
import { mobileRoute, preflight } from "@/lib/mobile/route-helpers";

export const runtime = "nodejs";

const METHODS = ["GET"];

export const OPTIONS = preflight(METHODS);

export const GET = mobileRoute<AnnouncementsResponse>(METHODS, async (context) => ({
  announcements: toAnnouncementEntries(await listResource("announcements", context))
}));
```

`app/api/mobile/payments/route.ts`:

```ts
import type { PaymentsResponse } from "@shared/api-types";
import { listResource } from "@/lib/school-db";
import { toPaymentEntries } from "@/lib/mobile/projections";
import { mobileRoute, preflight } from "@/lib/mobile/route-helpers";

export const runtime = "nodejs";

const METHODS = ["GET"];

export const OPTIONS = preflight(METHODS);

export const GET = mobileRoute<PaymentsResponse>(METHODS, async (context) => ({
  payments: toPaymentEntries(await listResource("payments", context))
}));
```

Payments needs no extra role guard: `filterResourceTable` already returns no
rows for a teacher (`school-db.ts:744`), and admin sees everything.

- [ ] **Step 4: Verify**

```bash
npx tsc --noEmit
npm test
npm run build
```

Expected: all pass, and the build lists six new `/api/mobile/*` routes.

- [ ] **Step 5: Smoke-test one endpoint**

With `npm run dev` running, and a valid Supabase access token in `$TOKEN`
(obtain it by signing in on the web and reading the session from devtools):

```bash
curl -s http://localhost:3000/api/mobile/timetable -H "Authorization: Bearer $TOKEN" | head -40
```

Expected: JSON with a `slots` array of objects, not `columns`/`rows`.

Then confirm the 401 path:

```bash
curl -si http://localhost:3000/api/mobile/timetable | head -5
```

Expected: `HTTP/1.1 401`.

- [ ] **Step 6: Commit**

```bash
git add app/api/mobile
git commit -m "feat: add typed mobile read endpoints

Each route calls the existing listResource so role scoping is reused
rather than reimplemented.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 10: Teacher write endpoints

**Files:**
- Modify: `app/api/mobile/attendance/route.ts`, `app/api/mobile/grades/route.ts`

- [ ] **Step 1: Add the attendance write**

Append to `app/api/mobile/attendance/route.ts`:

```ts
import { createResource } from "@/lib/school-db";

type AttendanceWriteBody = {
  student?: string;
  subject?: string;
  date?: string;
  status?: string;
};

export const POST = mobileRoute<AttendanceResponse>(METHODS, async (context, request) => {
  const body = (await request.json().catch(() => null)) as AttendanceWriteBody | null;

  if (!body?.student || !body?.status) {
    throw new Error("student and status are required.");
  }

  // requireManageAccess inside createResource rejects any role outside
  // {admin, teacher}; ensureTeacherSubject forces a teacher onto their own
  // subject. Neither check is repeated here.
  const table = await createResource(
    "attendance",
    {
      Student: body.student,
      Subject: body.subject ?? "",
      Date: body.date ?? "",
      Status: body.status
    },
    context
  );

  return { entries: toAttendanceEntries(table) };
});
```

Merge `createResource` into the existing `@/lib/school-db` import rather than
adding a second import statement.

- [ ] **Step 2: Add the grades write**

Append to `app/api/mobile/grades/route.ts`:

```ts
import { createResource } from "@/lib/school-db";

type GradeWriteBody = {
  student?: string;
  subject?: string;
  score?: number | string;
  semester?: string;
};

export const POST = mobileRoute<GradesResponse>(METHODS, async (context, request) => {
  const body = (await request.json().catch(() => null)) as GradeWriteBody | null;

  if (!body?.student || body.score === undefined || body.score === null || body.score === "") {
    throw new Error("student and score are required.");
  }

  const table = await createResource(
    "grades",
    {
      Student: body.student,
      Subject: body.subject ?? "",
      Score: String(body.score),
      Semester: body.semester ?? ""
    },
    context
  );

  return { grades: toGradeEntries(table) };
});
```

- [ ] **Step 3: Verify**

```bash
npx tsc --noEmit
npm test
npm run build
```

Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add app/api/mobile
git commit -m "feat: add teacher attendance and grade write endpoints

Authorization comes from requireManageAccess and ensureTeacherSubject in
school-db.ts; the routes add no role checks of their own.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 11: Cross-role API verification

**Files:** none — this task produces evidence.

- [ ] **Step 1: Obtain a token per role**

You need four Supabase access tokens, one per role. Sign in on the web as each
and copy `access_token` from the session in devtools (Application →
sessionStorage → the `sb-<ref>-auth-token` entry).

If the roles do not exist yet, they must be created by an admin at
`/admin/users`, which requires `SUPABASE_SERVICE_ROLE_KEY` — currently unset.
Set it before this task.

Export them:

```bash
export TOK_ADMIN=... TOK_TEACHER=... TOK_STUDENT=... TOK_PARENT=...
```

- [ ] **Step 2: Confirm reads are scoped**

With `npm run dev` running:

```bash
for role in ADMIN TEACHER STUDENT PARENT; do
  tok=$(eval echo \$TOK_$role)
  echo "--- $role grades ---"
  curl -s http://localhost:3000/api/mobile/grades -H "Authorization: Bearer $tok" \
    | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const g=JSON.parse(s).grades||[];console.log(g.length+' rows:', [...new Set(g.map(x=>x.student))].join(', '))})"
done
```

Expected:

- admin — every student
- teacher — only students in the teacher's own subjects
- student — only that student's own name
- parent — only their child's name

**A student or parent seeing more than one name is a failure. Stop and fix it
before continuing.**

- [ ] **Step 3: Confirm writes are refused for the wrong roles**

```bash
curl -si -X POST http://localhost:3000/api/mobile/grades \
  -H "Authorization: Bearer $TOK_STUDENT" \
  -H "Content-Type: application/json" \
  -d '{"student":"Бат","subject":"Математик","score":100,"semester":"Намар"}' | head -5
```

Expected: `HTTP/1.1 403` and a message about permission. **Not 200, not a
created row.**

Repeat with `$TOK_PARENT` — also 403. Then with `$TOK_TEACHER`:

```bash
curl -si -X POST http://localhost:3000/api/mobile/grades \
  -H "Authorization: Bearer $TOK_TEACHER" \
  -H "Content-Type: application/json" \
  -d '{"student":"Бат","subject":"Математик","score":88,"semester":"Намар"}' | head -5
```

Expected: `HTTP/1.1 200` with a `grades` array.

- [ ] **Step 4: Confirm payments visibility**

```bash
curl -s http://localhost:3000/api/mobile/payments -H "Authorization: Bearer $TOK_TEACHER"
```

Expected: `{"payments":[]}` — teachers see no payment rows
(`school-db.ts:744`).

- [ ] **Step 5: Confirm typed shapes**

```bash
curl -s http://localhost:3000/api/mobile/timetable -H "Authorization: Bearer $TOK_STUDENT" | head -30
```

Expected: objects with `subject`, `day`, `timeLabel`, `startsAt`, `endsAt` —
no `columns` or `rows` key anywhere in the response.

- [ ] **Step 6: Full static check**

```bash
npm test
npx tsc --noEmit
npm run lint
npm run build
git status --porcelain
```

Expected: all pass; `git status` empty.

- [ ] **Step 7: Record the results**

Append the Step 2 row counts and the Step 3 status codes to the spec under a new
`## Plan A verification` heading, then:

```bash
git add docs/superpowers/specs/2026-07-27-expo-mobile-app-design.md
git commit -m "docs: record Plan A cross-role API verification

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## What Plan B covers

Plan A ends with a verified API and no client. Plan B builds the Expo app
against `shared/api-types.ts`:

- Expo Router project under `mobile/`, the `"workspaces": ["mobile"]` key in the
  root `package.json` (deferred from Task 1 because npm needs the directory to
  exist), and Metro `watchFolders` for `shared/`
- Splitting `lib/i18n.ts`: the translation tables move to
  `shared/i18n-tables.ts`, while `getInitialLanguage`, `getStoredLanguage`, and
  `languageStorageKey` stay behind and re-export the tables so no web import
  path changes
- `shared/roles.ts` — role → visible mobile tabs
- Supabase auth with `expo-secure-store`, Face ID via
  `expo-local-authentication`, Google OAuth via `expo-auth-session`
- Tab navigation driven by `shared/roles.ts`; the admin web-only screen
- Screens: Home, Timetable, Grades, Attendance, Announcements, Payments,
  Settings; teacher attendance and grade entry
- Offline read cache in `AsyncStorage` with a stale banner
- Device verification on a physical iPhone
