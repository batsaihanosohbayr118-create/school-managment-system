# iOS App Store Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Package the existing Next.js school management app as a Capacitor iOS app that bundles the web UI, keeps users signed in across restarts behind Face ID, talks to the Vercel API over CORS, and opens usefully with no network.

**Architecture:** One repo, two build targets. The Vercel target is unchanged. A mobile target runs `next build` with `output: 'export'` after relocating `app/api` and `proxy.ts` (which are incompatible with static export), producing static assets that Capacitor bundles into an iOS app. The bundled app calls the Vercel API at an absolute origin, so every route handler gains CORS. Supabase's session store becomes a swappable adapter — `sessionStorage` on web, Keychain on native — and Face ID gates reading the refresh token out of Keychain.

**Tech Stack:** Next.js 16.2.6 (webpack, SWC-WASM), React 19.2.6, TypeScript 6.0.3, Supabase Auth, plus three additions installed during the plan: Capacitor (iOS), Vitest, and Keychain/biometrics plugins whose exact versions are pinned at install time in Tasks 8 and 9.

**Spec:** `docs/superpowers/specs/2026-07-27-ios-app-store-phase1-design.md`

---

## Deviation from the approved spec

The spec's Verification section says "There is no test framework in this repo. Verification is static checks plus a manual device pass." This plan **adds Vitest** (Task 1) because four units in this phase are pure functions with real branching — API URL construction, error classification, CORS header generation, and storage adapter selection — and they are exactly the code that fails silently in a packaged app where you cannot attach a debugger easily.

Native behaviour (Keychain, Face ID, the actual iOS build) is still verified manually on a device. If you want to cut scope, Task 1 is the cleanest thing to drop; every later task then verifies via `npx tsc --noEmit` plus its manual step.

## New bug found during planning (not in the spec)

`components/NoConnection.tsx:37` probes connectivity with `fetch("/favicon.ico")`. In the packaged app that path is a **bundled local asset**, so the probe always succeeds and offline is never detected. The same component is also a full-screen blocking overlay, which contradicts the spec's "show cached data with an offline banner". Both are fixed in Task 10.

## Owner prerequisites (not tasks — no code unblocks these)

None of these block development. Tasks 1-12 can all be completed without them.
They block **shipping**, and the first two have multi-day lead times, so start
them now rather than at the end.

- [ ] Apple Developer Program membership ($99/year, approval takes days)
- [ ] Xcode installed, and a signing team selected in the project
- [ ] Set `SUPABASE_SERVICE_ROLE_KEY` in the server environment. Without it
      `/admin/users` returns 501, so you cannot provision the demo account that
      App Store Review requires. That account must be a real Supabase user with
      `user_metadata.role` set — Supabase-only mode has no seeded logins.
- [ ] Set `NEXT_PUBLIC_SITE_URL` in `.env` to the production origin (Task 11
      Step 3 also depends on this)

## File structure

| File | Responsibility | Task |
| --- | --- | --- |
| `vitest.config.ts` | Test runner config | 1 |
| `next.config.mobile.mjs` | Static-export build config for the mobile target | 2 |
| `scripts/build-mobile.mjs` | Relocate API routes, build, restore unconditionally | 2 |
| `capacitor.config.ts` | Capacitor app identity + `webDir` | 3 |
| `lib/api-base.ts` | Resolve the API origin for the current platform | 4 |
| `lib/cors.ts` | CORS headers + `OPTIONS` handler factory | 6 |
| `lib/api-error.ts` | Typed failure classification for API responses | 7 |
| `lib/session-storage.ts` | Supabase storage adapter: web vs native | 8 |
| `lib/biometric-gate.ts` | Face ID / Touch ID unlock, always falls through to login | 9 |
| `lib/offline-cache.ts` | Last-known-good resource cache | 10 |
| `components/OfflineBanner.tsx` | Non-blocking offline indicator (replaces `NoConnection`) | 10 |

---

### Task 1: Add Vitest for pure-logic units

**Files:**
- Create: `vitest.config.ts`
- Create: `lib/__tests__/smoke.test.ts`
- Modify: `package.json`

- [ ] **Step 1: Install Vitest**

```bash
npm i -D vitest@^3
```

- [ ] **Step 2: Create the config**

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["lib/__tests__/**/*.test.ts"]
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, ".") }
  }
});
```

- [ ] **Step 3: Write a failing smoke test**

Create `lib/__tests__/smoke.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { isRole } from "@/lib/auth-flow";

describe("test harness", () => {
  it("resolves the @ alias and runs assertions", () => {
    expect(isRole("admin")).toBe(true);
    expect(isRole("principal")).toBe(false);
  });
});
```

- [ ] **Step 4: Add the scripts**

In `package.json`, add to `"scripts"`:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 5: Run the test**

Run: `npm test`
Expected: PASS, 1 test. If the `@` alias fails to resolve, the `resolve.alias` block is wrong — fix it before continuing, every later task depends on it.

- [ ] **Step 6: Commit**

```bash
git add vitest.config.ts lib/__tests__/smoke.test.ts package.json package-lock.json
git commit -m "test: add vitest for pure-logic units

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: Mobile build target

**Files:**
- Create: `next.config.mobile.mjs`
- Create: `scripts/build-mobile.mjs`
- Modify: `package.json`, `.gitignore`

- [ ] **Step 1: Confirm the failure this task works around**

Temporarily add `output: "export"` to `next.config.js` and run `npm run build`.

Expected: build fails with
`Error: export const dynamic = "force-static"/export const revalidate not configured on route "/api/admin/users" with "output: export"`

Revert `next.config.js` before continuing (`git checkout -- next.config.js`). This step exists so you see the constraint firsthand rather than trusting the plan.

- [ ] **Step 2: Create the mobile config**

Create `next.config.mobile.mjs`:

```js
/** @type {import('next').NextConfig} */
export default {
  reactStrictMode: false,
  output: "export",
  distDir: ".next-mobile",
  // DashboardApp.tsx uses next/image; the Next image optimizer needs a server.
  images: { unoptimized: true }
  // next-pwa is intentionally absent: the native shell already bundles assets,
  // and a service worker inside WKWebView fights Capacitor's asset serving.
};
```

- [ ] **Step 3: Create the build script**

Create `scripts/build-mobile.mjs`:

```js
import { execFileSync } from "node:child_process";
import { existsSync, renameSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const stash = path.join(root, ".mobile-build-stash");

// Files that static export cannot compile. Relocated for the duration of the build.
const relocations = [
  { from: path.join(root, "app", "api"), to: path.join(stash, "api") },
  { from: path.join(root, "proxy.ts"), to: path.join(stash, "proxy.ts") }
];

function assertCleanTree() {
  const status = execFileSync("git", ["status", "--porcelain"], { encoding: "utf8" }).trim();
  if (status) {
    console.error(
      "Refusing to build: the working tree is dirty.\n" +
        "This script moves app/api and proxy.ts out of the tree and restores them\n" +
        "afterwards. If it is interrupted with uncommitted work present, recovery\n" +
        "is manual. Commit or stash first.\n\n" + status
    );
    process.exit(1);
  }
}

function assertApiBase() {
  const value = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!value || !/^https:\/\//.test(value)) {
    console.error(
      "Refusing to build: NEXT_PUBLIC_API_BASE_URL must be set to the https origin\n" +
        "of the deployed API. It is inlined at build time and cannot be changed\n" +
        "without shipping a new binary.\n" +
        "Example: NEXT_PUBLIC_API_BASE_URL=https://your-app.vercel.app npm run build:mobile"
    );
    process.exit(1);
  }
}

function moveAway() {
  mkdirSync(stash, { recursive: true });
  for (const { from, to } of relocations) {
    if (existsSync(from)) renameSync(from, to);
  }
}

function restore() {
  for (const { from, to } of relocations) {
    if (existsSync(to)) renameSync(to, from);
  }
  rmSync(stash, { recursive: true, force: true });
}

let restored = false;
function restoreOnce() {
  if (restored) return;
  restored = true;
  restore();
}

process.on("SIGINT", () => { restoreOnce(); process.exit(130); });
process.on("SIGTERM", () => { restoreOnce(); process.exit(143); });

assertCleanTree();
assertApiBase();

moveAway();
try {
  execFileSync(
    process.execPath,
    [path.join(root, "node_modules", "next", "dist", "bin", "next"), "build", "--webpack"],
    {
      stdio: "inherit",
      env: {
        ...process.env,
        NEXT_TEST_WASM_DIR: path.join(root, "node_modules", "@next", "swc-wasm-nodejs"),
        NODE_ENV: "production",
        NEXT_CONFIG_FILE: "next.config.mobile.mjs"
      }
    }
  );
} finally {
  restoreOnce();
}

console.log("\nMobile build complete.");
```

Note: `NEXT_CONFIG_FILE` is not a documented Next option. Step 5 verifies whether Next actually honours it; if it does not, fall back to swapping `next.config.js` inside the same try/finally (add it to `relocations` and copy `next.config.mobile.mjs` into place).

- [ ] **Step 4: Wire up the script and ignores**

In `package.json` `"scripts"`, add:

```json
"build:mobile": "node scripts/build-mobile.mjs"
```

Append to `.gitignore`:

```
out
.next-mobile
.mobile-build-stash
ios/App/App/public
ios/App/Pods
```

- [ ] **Step 5: Commit, then run it and find the export directory**

The script refuses to run on a dirty tree, so commit first — this is the task's
real commit, there is no second one at the end.

```bash
git add next.config.mobile.mjs scripts/build-mobile.mjs package.json .gitignore
git commit -m "build: add static-export mobile target

Relocates app/api and proxy.ts during the build because output: 'export'
fails on route handlers rather than skipping them. Restores in a finally
block and refuses to run on a dirty tree.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"

NEXT_PUBLIC_API_BASE_URL=https://example.vercel.app npm run build:mobile
ls -la out .next-mobile 2>/dev/null
```

Expected: the build prints `✓ Generating static pages ... (10/10)` and lists 8 routes as `○ (Static)`.

Then confirm which directory holds the exported HTML — the spec flags this as unverified. If `out/index.html` exists, `webDir` in Task 3 is `out`. If instead the HTML is under `.next-mobile/`, use that path. **Record the answer in the Task 3 config; do not guess.**

If the build failed with a config error, apply the `NEXT_CONFIG_FILE` fallback described in Step 3.

- [ ] **Step 6: Verify the tree was restored**

Run: `git status --porcelain`
Expected: empty output. `app/api/` and `proxy.ts` must be back.

Also test the failure path:

```bash
echo "dirty" > /tmp/x && cp /tmp/x ./scratch-dirty.txt
NEXT_PUBLIC_API_BASE_URL=https://example.vercel.app npm run build:mobile
```

Expected: exits 1 with "Refusing to build: the working tree is dirty." Then `rm scratch-dirty.txt`.

If Step 5 required the `NEXT_CONFIG_FILE` fallback, amend the commit now:

```bash
git add -A && git commit --amend --no-edit
```

---

### Task 3: Capacitor iOS project

**Files:**
- Create: `capacitor.config.ts`
- Create: `ios/` (generated)
- Modify: `package.json`

- [ ] **Step 1: Install Capacitor**

```bash
npm i @capacitor/core @capacitor/ios
npm i -D @capacitor/cli
```

- [ ] **Step 2: Create the config**

Create `capacitor.config.ts`. Set `webDir` to whatever Task 2 Step 5 established:

```ts
import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "mn.novamind.academy",
  appName: "Nova Mind Academy",
  webDir: "out",
  ios: {
    contentInset: "always"
  }
};

export default config;
```

- [ ] **Step 3: Generate the iOS project**

```bash
NEXT_PUBLIC_API_BASE_URL=https://example.vercel.app npm run build:mobile
npx cap add ios
npx cap sync ios
```

Expected: an `ios/` directory appears and `cap sync` reports copying web assets.

- [ ] **Step 4: Confirm the webview origin**

Open `ios/App/App/Info.plist` and the generated Capacitor config. Record the scheme the app serves from — Capacitor iOS defaults to `capacitor://localhost`. **This exact string is the CORS origin in Task 6.** If your Capacitor version uses a different default, use that value instead and note it in the Task 6 code.

- [ ] **Step 5: Launch on the simulator**

```bash
npx cap open ios
```

In Xcode, select a simulator and Run.

Expected: the landing page renders. Login will not work yet (no CORS, no API base wiring) — that is expected at this task.

- [ ] **Step 6: Commit**

```bash
git add capacitor.config.ts ios package.json package-lock.json
git commit -m "feat: add Capacitor iOS project

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 4: API base URL resolution

**Files:**
- Create: `lib/api-base.ts`
- Test: `lib/__tests__/api-base.test.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/__tests__/api-base.test.ts`:

```ts
import { afterEach, describe, expect, it } from "vitest";
import { buildApiUrl } from "@/lib/api-base";

const original = process.env.NEXT_PUBLIC_API_BASE_URL;

afterEach(() => {
  process.env.NEXT_PUBLIC_API_BASE_URL = original;
});

describe("buildApiUrl", () => {
  it("returns a relative path when no base is configured", () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = "";
    expect(buildApiUrl("/api/school/students")).toBe("/api/school/students");
  });

  it("prefixes the configured origin", () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = "https://school.vercel.app";
    expect(buildApiUrl("/api/school/students")).toBe("https://school.vercel.app/api/school/students");
  });

  it("does not double the slash when the base has a trailing slash", () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = "https://school.vercel.app/";
    expect(buildApiUrl("/api/school/students")).toBe("https://school.vercel.app/api/school/students");
  });

  it("preserves query strings", () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = "https://school.vercel.app";
    expect(buildApiUrl("/api/school/grades?mode=page")).toBe(
      "https://school.vercel.app/api/school/grades?mode=page"
    );
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test`
Expected: FAIL — `Failed to resolve import "@/lib/api-base"`

- [ ] **Step 3: Write the implementation**

Create `lib/api-base.ts`:

```ts
/**
 * The packaged iOS app is served from `capacitor://localhost`, so relative API
 * paths resolve against the bundle and 404. On native, every API call must go
 * to the deployed origin.
 *
 * NEXT_PUBLIC_ variables are inlined at build time, so this value is baked into
 * the binary. `scripts/build-mobile.mjs` refuses to build without it.
 */
export function getApiBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
  return configured.endsWith("/") ? configured.slice(0, -1) : configured;
}

/** Joins the configured API origin with a root-relative path. */
export function buildApiUrl(pathAndQuery: string): string {
  const base = getApiBaseUrl();
  if (!base) return pathAndQuery;

  return `${base}${pathAndQuery.startsWith("/") ? "" : "/"}${pathAndQuery}`;
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npm test`
Expected: PASS, 5 tests total (4 here + smoke).

- [ ] **Step 5: Commit**

```bash
git add lib/api-base.ts lib/__tests__/api-base.test.ts
git commit -m "feat: resolve API base URL for the native origin

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 5: Route all API calls through the base URL

**Files:**
- Modify: `lib/school-api.ts:16`
- Modify: `lib/subjectContent.ts:13,25,55`

- [ ] **Step 1: Update the resource URL builder**

In `lib/school-api.ts`, add the import:

```ts
import { buildApiUrl } from "./api-base";
```

Then change the return of `buildResourceUrl` from:

```ts
  return `/api/school/${resource}${query ? `?${query}` : ""}`;
```

to:

```ts
  return buildApiUrl(`/api/school/${resource}${query ? `?${query}` : ""}`);
```

- [ ] **Step 2: Update subject content calls**

In `lib/subjectContent.ts`, add:

```ts
import { buildApiUrl } from "./api-base";
```

Replace all three occurrences of:

```ts
`/api/subjects/${subjectId}/content`
```

with:

```ts
buildApiUrl(`/api/subjects/${subjectId}/content`)
```

They appear in `loadSubjectContent`, `saveSubjectContent`, and `uploadSubjectFiles`.

- [ ] **Step 3: Verify nothing else builds a relative API URL**

Run: `grep -rn '"/api/\|`/api/' lib components app --include='*.ts' --include='*.tsx' | grep -v __tests__`
Expected: every remaining hit is inside `app/api/` itself (route definitions) or already wrapped in `buildApiUrl`. Wrap anything that is not.

- [ ] **Step 4: Type-check and confirm the web build is unaffected**

```bash
npx tsc --noEmit
npm run build
```

Expected: both succeed. With `NEXT_PUBLIC_API_BASE_URL` unset, `buildApiUrl` returns the same relative paths as before, so web behaviour is unchanged.

- [ ] **Step 5: Commit**

```bash
git add lib/school-api.ts lib/subjectContent.ts
git commit -m "feat: send API calls to the configured origin

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 6: CORS for the Capacitor origin

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
  it("allows the Capacitor iOS origin", () => {
    expect(isAllowedOrigin("capacitor://localhost")).toBe(true);
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
    const headers = corsHeaders("capacitor://localhost", ["GET", "POST"]);
    expect(headers["Access-Control-Allow-Origin"]).toBe("capacitor://localhost");
  });

  it("never emits a wildcard, because these endpoints carry bearer tokens", () => {
    const headers = corsHeaders("capacitor://localhost", ["GET"]);
    expect(Object.values(headers)).not.toContain("*");
  });

  it("returns no CORS headers for a disallowed origin", () => {
    expect(corsHeaders("https://evil.example", ["GET"])).toEqual({});
  });

  it("advertises the headers the session resolver reads", () => {
    const headers = corsHeaders("capacitor://localhost", ["GET"]);
    const allowed = headers["Access-Control-Allow-Headers"].toLowerCase();
    expect(allowed).toContain("authorization");
    expect(allowed).toContain("x-demo-session");
    expect(allowed).toContain("content-type");
  });

  it("lists the methods it was given plus OPTIONS", () => {
    const headers = corsHeaders("capacitor://localhost", ["GET", "DELETE"]);
    expect(headers["Access-Control-Allow-Methods"]).toBe("GET, DELETE, OPTIONS");
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test`
Expected: FAIL — `Failed to resolve import "@/lib/cors"`

- [ ] **Step 3: Write the implementation**

Create `lib/cors.ts`:

```ts
import { NextResponse } from "next/server";

/**
 * The packaged iOS app makes cross-origin calls from `capacitor://localhost`.
 * Because `resolveRequestSession` reads the `Authorization` header, every one of
 * those calls is a non-simple request and preflights.
 *
 * No wildcard origin: these endpoints accept bearer tokens.
 */
const allowedOrigins = new Set([
  "capacitor://localhost", // Capacitor iOS default
  "http://localhost:3000"  // local web dev against a deployed API
]);

export function isAllowedOrigin(origin: string | null): boolean {
  return origin !== null && allowedOrigins.has(origin);
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

/** Builds the `OPTIONS` handler a route exports for preflight. */
export function preflight(methods: string[]) {
  return async function OPTIONS(request: Request) {
    return new NextResponse(null, {
      status: 204,
      headers: corsHeaders(request.headers.get("origin"), methods)
    });
  };
}

/** Copies CORS headers onto a response produced by a route handler. */
export function withCors<T extends NextResponse>(response: T, request: Request, methods: string[]): T {
  const headers = corsHeaders(request.headers.get("origin"), methods);
  for (const [key, value] of Object.entries(headers)) {
    response.headers.set(key, value);
  }
  return response;
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npm test`
Expected: PASS, 11 tests total.

- [ ] **Step 5: Apply to the school resource route**

In `app/api/school/[resource]/route.ts`, add:

```ts
import { preflight, withCors } from "@/lib/cors";

const METHODS = ["GET", "POST", "PATCH", "DELETE"];

export const OPTIONS = preflight(METHODS);
```

Then wrap every `return NextResponse.json(...)` in that file with `withCors(..., request, METHODS)`. For example, the `GET` early return becomes:

```ts
  if (!isSchoolResource(resource)) {
    return withCors(NextResponse.json({ message: "Unknown resource." }, { status: 404 }), _request, METHODS);
  }
```

and its success return becomes:

```ts
    return withCors(NextResponse.json(await listResource(resource, resolved)), _request, METHODS);
```

Note the `GET` handler names its first parameter `_request`. Use that name inside `GET`, and `request` inside `POST`, `PATCH`, and `DELETE`.

- [ ] **Step 6: Apply to the remaining three routes**

The exported verbs were confirmed while writing this plan — use exactly these:

| File | Add at the top | Verbs to wrap |
| --- | --- | --- |
| `app/api/admin/users/route.ts` | `const METHODS = ["GET", "POST", "PATCH", "DELETE"];` | GET, POST, PATCH, DELETE |
| `app/api/subjects/[id]/content/route.ts` | `const METHODS = ["GET", "POST"];` | GET, POST |
| `app/api/records/route.ts` | `const METHODS = ["GET", "POST"];` | GET, POST |

In each file add:

```ts
import { preflight, withCors } from "@/lib/cors";

const METHODS = [/* the list from the table above */];

export const OPTIONS = preflight(METHODS);
```

Then wrap every `return NextResponse.json(...)` in that file:

```ts
// before
return NextResponse.json({ message: "Unauthorized." }, { status: 401 });

// after
return withCors(NextResponse.json({ message: "Unauthorized." }, { status: 401 }), request, METHODS);
```

Use whatever the handler names its `Request` parameter — some are `request`, some `_request`.

Every `NextResponse.json(...)` returned to a client must pass through `withCors`. A missed return is a request that succeeds in the browser and fails in the app. Count them first so you know when you are done:

Run: `grep -c "NextResponse.json" app/api/admin/users/route.ts "app/api/subjects/[id]/content/route.ts" app/api/records/route.ts`

- [ ] **Step 7: Verify the preflight**

```bash
npm run dev
```

In a second terminal:

```bash
curl -i -X OPTIONS http://localhost:3000/api/school/students \
  -H "Origin: capacitor://localhost" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: authorization"
```

Expected: `HTTP/1.1 204`, with `Access-Control-Allow-Origin: capacitor://localhost` present.

Then confirm a disallowed origin gets nothing:

```bash
curl -i -X OPTIONS http://localhost:3000/api/school/students -H "Origin: https://evil.example"
```

Expected: 204 with **no** `Access-Control-Allow-Origin` header.

- [ ] **Step 8: Commit**

```bash
git add lib/cors.ts lib/__tests__/cors.test.ts app/api
git commit -m "feat: allow CORS from the Capacitor origin

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 7: Typed API failures

**Files:**
- Create: `lib/api-error.ts`
- Test: `lib/__tests__/api-error.test.ts`
- Modify: `lib/school-api.ts:19-37`

- [ ] **Step 1: Write the failing test**

Create `lib/__tests__/api-error.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { ApiError, classifyStatus } from "@/lib/api-error";

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
Expected: FAIL — `Failed to resolve import "@/lib/api-error"`

- [ ] **Step 3: Write the implementation**

Create `lib/api-error.ts`:

```ts
/**
 * `school-api.ts` used to collapse every failure into a bare Error, so the UI
 * could not tell "you are offline" from "your session expired". In the packaged
 * app those need different responses: one shows cached data, the other returns
 * to login.
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
Expected: PASS, 17 tests total.

- [ ] **Step 5: Use it in the request helper**

In `lib/school-api.ts`, add:

```ts
import { ApiError, classifyStatus } from "./api-error";
```

Replace the body of `requestSchoolResource` (currently lines 19-37) with:

```ts
async function requestSchoolResource<T>(resource: SchoolResource, init: RequestInit = {}, options?: SchoolResourceRequestOptions, search = ""): Promise<T> {
  const headers = await getClientSchoolHeaders();

  let response: Response;
  try {
    response = await fetch(buildResourceUrl(resource, options, search), {
      ...init,
      headers: {
        Accept: "application/json",
        ...headers,
        ...(init.headers ?? {})
      }
    });
  } catch {
    // fetch only rejects on a transport failure — DNS, no route, TLS.
    throw new ApiError("offline", "No connection to the server.");
  }

  const payload = (await response.json().catch(() => null)) as { message?: string } | ResourceTable | null;

  if (!response.ok) {
    const message = (payload as { message?: string } | null)?.message ?? "Request failed.";
    throw new ApiError(classifyStatus(response.status), message);
  }

  return payload as T;
}
```

- [ ] **Step 6: Verify**

```bash
npm test
npx tsc --noEmit
```

Expected: both pass. Existing `catch (error)` sites still work — `ApiError` extends `Error`, so any code reading `error.message` is unaffected.

- [ ] **Step 7: Commit**

```bash
git add lib/api-error.ts lib/__tests__/api-error.test.ts lib/school-api.ts
git commit -m "feat: distinguish offline, auth, and server API failures

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 8: Session storage adapter

**Files:**
- Create: `lib/session-storage.ts`
- Test: `lib/__tests__/session-storage.test.ts`
- Modify: `lib/supabase.ts:24-30`, `lib/auth-flow.ts:56-60`, `lib/school-session.ts:30-54`

- [ ] **Step 1: Verify the secure storage plugin before writing against it**

```bash
npm view capacitor-secure-storage-plugin version
npm view capacitor-secure-storage-plugin repository.url
```

Open the package README and confirm the method names and return shapes. The code below assumes `SecureStoragePlugin.get({ key })` resolves `{ value: string }` and **rejects** when the key is absent, and that `set`, `remove`, and `clear` exist.

If the API differs, adapt only the `nativeStore` object in Step 3 — the interface it satisfies stays the same. If the package looks unmaintained (no release in over a year, open issues about iOS 18+), stop and raise it: the spec lists a small custom Keychain plugin as the fallback.

Do **not** substitute `@capacitor/preferences`. That is `UserDefaults` — unencrypted — and this stores a refresh token.

- [ ] **Step 2: Write the failing test**

Create `lib/__tests__/session-storage.test.ts`:

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { createMemoryStore, type SessionStore } from "@/lib/session-storage";

describe("createMemoryStore", () => {
  let store: SessionStore;

  beforeEach(() => {
    store = createMemoryStore();
  });

  it("returns null for a key that was never set", async () => {
    expect(await store.getItem("missing")).toBeNull();
  });

  it("round-trips a value", async () => {
    await store.setItem("token", "abc123");
    expect(await store.getItem("token")).toBe("abc123");
  });

  it("overwrites an existing value", async () => {
    await store.setItem("token", "first");
    await store.setItem("token", "second");
    expect(await store.getItem("token")).toBe("second");
  });

  it("removes a value", async () => {
    await store.setItem("token", "abc123");
    await store.removeItem("token");
    expect(await store.getItem("token")).toBeNull();
  });

  it("tolerates removing a key that is not present", async () => {
    await expect(store.removeItem("missing")).resolves.toBeUndefined();
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `npm test`
Expected: FAIL — `Failed to resolve import "@/lib/session-storage"`

- [ ] **Step 4: Write the implementation**

Create `lib/session-storage.ts`:

```ts
import { Capacitor } from "@capacitor/core";
import { SecureStoragePlugin } from "capacitor-secure-storage-plugin";

/**
 * Supabase's auth client accepts any store matching this shape, sync or async.
 *
 * Why this exists: `lib/supabase.ts` used to pin the session to
 * `window.sessionStorage`. iOS clears sessionStorage when the app is
 * terminated, so every cold start forced a fresh login. On native the session
 * belongs in the Keychain — it is a credential.
 *
 * Web behaviour is deliberately unchanged: still sessionStorage, so signing out
 * of a browser tab keeps working the way it does today.
 */
export type SessionStore = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};

/** In-memory store. Used in tests and as the SSR no-op. */
export function createMemoryStore(): SessionStore {
  const map = new Map<string, string>();

  return {
    async getItem(key) {
      return map.has(key) ? (map.get(key) as string) : null;
    },
    async setItem(key, value) {
      map.set(key, value);
    },
    async removeItem(key) {
      map.delete(key);
    }
  };
}

function createWebStore(): SessionStore {
  return {
    async getItem(key) {
      return window.sessionStorage.getItem(key);
    },
    async setItem(key, value) {
      window.sessionStorage.setItem(key, value);
    },
    async removeItem(key) {
      window.sessionStorage.removeItem(key);
    }
  };
}

function createNativeStore(): SessionStore {
  return {
    async getItem(key) {
      try {
        const { value } = await SecureStoragePlugin.get({ key });
        return value;
      } catch {
        // The plugin rejects rather than returning null when a key is absent.
        return null;
      }
    },
    async setItem(key, value) {
      await SecureStoragePlugin.set({ key, value });
    },
    async removeItem(key) {
      try {
        await SecureStoragePlugin.remove({ key });
      } catch {
        // Removing an absent key is not an error for our callers.
      }
    }
  };
}

export const isNative = (): boolean => Capacitor.isNativePlatform();

let cached: SessionStore | null = null;

export function getSessionStore(): SessionStore {
  if (cached) return cached;

  if (typeof window === "undefined") {
    cached = createMemoryStore();
  } else if (isNative()) {
    cached = createNativeStore();
  } else {
    cached = createWebStore();
  }

  return cached;
}
```

- [ ] **Step 5: Run it to verify it passes**

Run: `npm test`
Expected: PASS, 22 tests total.

- [ ] **Step 6: Point Supabase at the adapter**

In `lib/supabase.ts`, add:

```ts
import { getSessionStore } from "@/lib/session-storage";
```

Replace lines 24-30:

```ts
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        storage: typeof window === "undefined" ? undefined : window.sessionStorage
      }
    })
  : null;
```

with:

```ts
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        storage: typeof window === "undefined" ? undefined : getSessionStore(),
        persistSession: true,
        autoRefreshToken: true
      }
    })
  : null;
```

- [ ] **Step 7: Stop wiping the demo session on native**

`lib/auth-flow.ts:59` calls `window.localStorage.removeItem(demoSessionKey)` on every session resolve. Replace that line:

```ts
  // Demo mode never persists across a full sign-out, so stale localStorage is cleared.
  window.localStorage.removeItem(demoSessionKey);
```

with:

```ts
  // Demo mode never persists across a full sign-out, so stale localStorage is
  // cleared — but only on web. On native the session lives in the Keychain and
  // must survive app restarts.
  if (!isNative()) {
    window.localStorage.removeItem(demoSessionKey);
  }
```

and add the import:

```ts
import { isNative } from "@/lib/session-storage";
```

- [ ] **Step 8: Route the demo header through the adapter**

In `lib/school-session.ts`, add:

```ts
import { getSessionStore } from "@/lib/session-storage";
```

In `getClientSchoolHeaders`, replace:

```ts
  const rawDemoSession = window.sessionStorage.getItem(demoSessionKey);
```

with:

```ts
  const rawDemoSession = await getSessionStore().getItem(demoSessionKey);
```

- [ ] **Step 9: Verify**

```bash
npm test
npx tsc --noEmit
npm run build
```

Expected: all pass.

Then confirm the browser is unaffected: `npm run dev`, sign in, reload the page — you should still be signed in within the tab, and closing the tab should still sign you out. That is the pre-existing web behaviour and it must not change.

- [ ] **Step 10: Commit**

```bash
git add lib/session-storage.ts lib/__tests__/session-storage.test.ts lib/supabase.ts lib/auth-flow.ts lib/school-session.ts package.json package-lock.json
git commit -m "feat: store the native session in the Keychain

sessionStorage is cleared when iOS terminates the app, forcing a fresh
login on every cold start. Web keeps sessionStorage; native uses a
Keychain-backed store behind a shared interface.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 9: Face ID unlock

**Files:**
- Create: `lib/biometric-gate.ts`
- Test: `lib/__tests__/biometric-gate.test.ts`
- Modify: `components/dashboard/DashboardApp.tsx:1065`, `ios/App/App/Info.plist`

- [ ] **Step 1: Install and verify the biometrics plugin**

```bash
npm i @aparajita/capacitor-biometric-auth
npm view @aparajita/capacitor-biometric-auth version
```

Read its README and confirm: `BiometricAuth.checkBiometry()` resolves an object with `isAvailable`, and `BiometricAuth.authenticate({ reason })` resolves on success and rejects on failure or cancel. Adapt Step 4 if the shapes differ.

- [ ] **Step 2: Write the failing test**

Create `lib/__tests__/biometric-gate.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { decideGate } from "@/lib/biometric-gate";

describe("decideGate", () => {
  it("skips the prompt on web", () => {
    expect(decideGate({ native: false, hasStoredSession: true, biometryAvailable: true })).toBe("allow");
  });

  it("sends the user to login when there is no stored session", () => {
    expect(decideGate({ native: true, hasStoredSession: false, biometryAvailable: true })).toBe("login");
  });

  it("prompts when native, session stored, biometry available", () => {
    expect(decideGate({ native: true, hasStoredSession: true, biometryAvailable: true })).toBe("prompt");
  });

  it("allows through when biometry is unavailable rather than locking the user out", () => {
    expect(decideGate({ native: true, hasStoredSession: true, biometryAvailable: false })).toBe("allow");
  });
});
```

The fourth case is the important one: a device with no enrolled biometry must not become an unusable app.

- [ ] **Step 3: Run it to verify it fails**

Run: `npm test`
Expected: FAIL — `Failed to resolve import "@/lib/biometric-gate"`

- [ ] **Step 4: Write the implementation**

Create `lib/biometric-gate.ts`:

```ts
import { BiometricAuth } from "@aparajita/capacitor-biometric-auth";
import { getSessionStore, isNative } from "@/lib/session-storage";

/**
 * Face ID does not authenticate against Supabase. It gates access to the
 * refresh token already sitting in the Keychain.
 *
 * Failure never locks the user out — every unhappy path lands on the normal
 * login screen, which still works.
 */
export type GateDecision = "allow" | "prompt" | "login";

export type GateInputs = {
  native: boolean;
  hasStoredSession: boolean;
  biometryAvailable: boolean;
};

export function decideGate({ native, hasStoredSession, biometryAvailable }: GateInputs): GateDecision {
  if (!native) return "allow";
  if (!hasStoredSession) return "login";
  if (!biometryAvailable) return "allow";
  return "prompt";
}

async function biometryAvailable(): Promise<boolean> {
  try {
    const info = await BiometricAuth.checkBiometry();
    return Boolean(info.isAvailable);
  } catch {
    return false;
  }
}

/**
 * Resolves true when the app may proceed to the dashboard, false when the user
 * must sign in again.
 */
export async function unlock(supabaseStorageKey: string): Promise<boolean> {
  const stored = await getSessionStore().getItem(supabaseStorageKey);

  const decision = decideGate({
    native: isNative(),
    hasStoredSession: stored !== null,
    biometryAvailable: await biometryAvailable()
  });

  if (decision === "allow") return true;
  if (decision === "login") return false;

  try {
    await BiometricAuth.authenticate({
      reason: "Nova Mind Academy-д нэвтрэх",
      cancelTitle: "Болих",
      allowDeviceCredential: true
    });
    return true;
  } catch {
    // Cancelled, failed, or locked out — fall through to the login screen.
    return false;
  }
}
```

- [ ] **Step 5: Run it to verify it passes**

Run: `npm test`
Expected: PASS, 26 tests total.

- [ ] **Step 6: Find the Supabase storage key**

Supabase namespaces its session key by project ref, e.g. `sb-<project-ref>-auth-token`. Derive it rather than hardcoding — in `lib/supabase.ts` add:

```ts
/** The key supabase-js uses for its session, derived from the project ref. */
export const supabaseStorageKey = (() => {
  if (!supabaseUrl) return "";
  const ref = new URL(supabaseUrl).hostname.split(".")[0];
  return `sb-${ref}-auth-token`;
})();
```

Verify it by signing in on the web and checking `sessionStorage` in devtools — the key you see must match this string exactly. If it does not, correct the derivation before continuing; `unlock()` silently returns `false` for a wrong key, which looks like "Face ID never appears".

- [ ] **Step 7: Call the gate on cold start**

In `components/dashboard/DashboardApp.tsx`, add:

```ts
import { unlock } from "@/lib/biometric-gate";
import { supabaseStorageKey } from "@/lib/supabase";
```

Inside the `checkAuth` function in the `useEffect` at line 1065, immediately after `if (isSupabaseConfigured) {`, insert:

```ts
        const unlocked = await unlock(supabaseStorageKey);
        if (!unlocked) {
          if (!ignore) router.replace("/login");
          return;
        }
```

On web `unlock` returns `true` without prompting, so browser behaviour is unchanged.

- [ ] **Step 8: Add the iOS usage string**

In `ios/App/App/Info.plist`, add inside the top-level `<dict>`:

```xml
<key>NSFaceIDUsageDescription</key>
<string>Хадгалагдсан нэвтрэлтээ Face ID-аар баталгаажуулна.</string>
```

Without this key the app **crashes** the first time it requests Face ID. This is not optional.

- [ ] **Step 9: Verify**

```bash
npm test
npx tsc --noEmit
npm run build
NEXT_PUBLIC_API_BASE_URL=https://example.vercel.app npm run build:mobile
npx cap sync ios
```

Expected: all succeed.

- [ ] **Step 10: Commit**

```bash
git add lib/biometric-gate.ts lib/__tests__/biometric-gate.test.ts lib/supabase.ts components/dashboard/DashboardApp.tsx ios/App/App/Info.plist package.json package-lock.json
git commit -m "feat: gate the stored session behind Face ID

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 10: Offline detection and cached reads

**Files:**
- Create: `lib/offline-cache.ts`
- Create: `components/OfflineBanner.tsx`
- Test: `lib/__tests__/offline-cache.test.ts`
- Modify: `app/layout.tsx:3,37`
- Delete: `components/NoConnection.tsx`

- [ ] **Step 1: Understand what is broken**

`components/NoConnection.tsx:37` probes with `fetch("/favicon.ico")`. In the packaged app that is a bundled local file, so the probe always succeeds and offline is never detected. The component is also a full-screen blocking overlay, which contradicts showing cached data.

The replacement probes the **API origin** and renders a non-blocking banner.

- [ ] **Step 2: Write the failing test**

Create `lib/__tests__/offline-cache.test.ts`:

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { createMemoryStore } from "@/lib/session-storage";
import { readCachedResource, writeCachedResource } from "@/lib/offline-cache";

const table = { columns: ["Name"], ids: ["s1"], rows: [["Bat"]] };

describe("offline cache", () => {
  let store: ReturnType<typeof createMemoryStore>;

  beforeEach(() => {
    store = createMemoryStore();
  });

  it("returns null when nothing is cached", async () => {
    expect(await readCachedResource(store, "students")).toBeNull();
  });

  it("round-trips a resource table", async () => {
    await writeCachedResource(store, "students", table);
    expect(await readCachedResource(store, "students")).toEqual(table);
  });

  it("keeps resources in separate slots", async () => {
    await writeCachedResource(store, "students", table);
    expect(await readCachedResource(store, "grades")).toBeNull();
  });

  it("returns null rather than throwing on corrupt JSON", async () => {
    await store.setItem("educore_cache_students", "{not json");
    expect(await readCachedResource(store, "students")).toBeNull();
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `npm test`
Expected: FAIL — `Failed to resolve import "@/lib/offline-cache"`

- [ ] **Step 4: Write the implementation**

Create `lib/offline-cache.ts`:

```ts
import type { SessionStore } from "@/lib/session-storage";
import type { ResourceTable, SchoolResource } from "@/lib/school-db";

/**
 * Last-known-good copy of each resource table, so the packaged app shows
 * something useful with no network.
 *
 * Read-only by design. Queuing offline writes is deferred — a partial sync
 * implementation risks corrupting attendance and grade records.
 */
const prefix = "educore_cache_";

export async function writeCachedResource(
  store: SessionStore,
  resource: SchoolResource,
  table: ResourceTable
): Promise<void> {
  await store.setItem(`${prefix}${resource}`, JSON.stringify(table));
}

export async function readCachedResource(
  store: SessionStore,
  resource: SchoolResource
): Promise<ResourceTable | null> {
  const raw = await store.getItem(`${prefix}${resource}`);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as ResourceTable;
  } catch {
    return null;
  }
}
```

- [ ] **Step 5: Run it to verify it passes**

Run: `npm test`
Expected: PASS, 30 tests total.

- [ ] **Step 6: Fill and fall back to the cache**

In `lib/school-api.ts`, add these two imports. `ApiError` is **already imported** by Task 7 — do not add a second import statement for it:

```ts
import { getSessionStore } from "./session-storage";
import { readCachedResource, writeCachedResource } from "./offline-cache";
```

The existing line from Task 7 stays as it is:

```ts
import { ApiError, classifyStatus } from "./api-error";
```

Replace `listSchoolResource` with:

```ts
export async function listSchoolResource(resource: SchoolResource, options?: SchoolResourceRequestOptions) {
  const store = getSessionStore();

  try {
    const table = await requestSchoolResource<ResourceTable>(resource, undefined, options);
    await writeCachedResource(store, resource, table);
    return table;
  } catch (error) {
    if (error instanceof ApiError && error.kind === "offline") {
      const cached = await readCachedResource(store, resource);
      if (cached) return cached;
    }
    throw error;
  }
}
```

Leave the create/update/delete helpers untouched — offline writes stay blocked, and they will surface the `offline` ApiError.

- [ ] **Step 7: Write the banner**

Create `components/OfflineBanner.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { buildApiUrl } from "@/lib/api-base";

/**
 * Non-blocking offline indicator.
 *
 * Replaces NoConnection, which probed `/favicon.ico` — a bundled local asset in
 * the packaged app, so its probe always succeeded and offline was never
 * detected. This probes the API origin instead, and never covers the UI, so
 * cached data stays readable.
 */
export default function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function verify() {
      try {
        await fetch(buildApiUrl("/api/school/students"), { method: "HEAD", cache: "no-store" });
        if (!cancelled) setIsOffline(false);
      } catch {
        if (!cancelled) setIsOffline(true);
      }
    }

    const handleOffline = () => void verify();
    const handleOnline = () => void verify();

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    void verify();

    return () => {
      cancelled = true;
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div
      role="status"
      className="fixed inset-x-0 bottom-0 z-50 flex items-center justify-center gap-2 bg-amber-500 px-4 py-2 text-sm font-medium text-white"
    >
      <span>Офлайн байна — хадгалагдсан мэдээллийг харуулж байна.</span>
    </div>
  );
}
```

A `HEAD` to an authenticated endpoint returns 401 when online without a session — that still proves connectivity, because `fetch` only rejects on transport failure.

- [ ] **Step 8: Swap the component in**

In `app/layout.tsx`, change line 3:

```tsx
import NoConnectionBanner from "@/components/NoConnection";
```

to:

```tsx
import OfflineBanner from "@/components/OfflineBanner";
```

and line 37:

```tsx
        <NoConnectionBanner />
```

to:

```tsx
        <OfflineBanner />
```

Then delete the old component:

```bash
git rm components/NoConnection.tsx
```

- [ ] **Step 9: Verify**

```bash
npm test
npx tsc --noEmit
npm run build
```

Expected: all pass. Confirm nothing still imports the deleted file:

Run: `grep -rn "NoConnection" app components lib`
Expected: no output.

- [ ] **Step 10: Commit**

```bash
git add lib/offline-cache.ts lib/__tests__/offline-cache.test.ts lib/school-api.ts components/OfflineBanner.tsx app/layout.tsx
git commit -m "feat: detect offline against the API and serve cached reads

NoConnection probed /favicon.ico, which is a bundled asset in the packaged
app and always resolves, so offline was never detected. The replacement
probes the API origin and does not block the UI.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 11: Google sign-in outside the webview

**Files:**
- Modify: `lib/supabase.ts:81-93`

- [ ] **Step 1: Install the browser plugin**

```bash
npm i @capacitor/browser
```

- [ ] **Step 2: Open OAuth in a system browser sheet**

Google rejects OAuth from embedded webviews with `disallowed_useragent`. In `lib/supabase.ts`, add:

```ts
import { Browser } from "@capacitor/browser";
import { isNative } from "@/lib/session-storage";
```

Replace `signInWithGoogle` (lines 81-93) with:

```ts
  async signInWithGoogle(redirectTo: string) {
    if (!supabase) {
      return { error: new Error("Supabase is not configured.") };
    }

    const result = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        skipBrowserRedirect: true
      }
    });

    if (result.data?.url) {
      // Google blocks OAuth inside WKWebView, so native opens the system
      // browser sheet (ASWebAuthenticationSession) and returns via deep link.
      if (isNative()) {
        await Browser.open({ url: result.data.url, presentationStyle: "popover" });
      } else {
        window.location.href = result.data.url;
      }
    }

    return result;
  },
```

Check whether the current caller already navigates to `result.data.url` — if it does, remove that navigation from the caller so it does not happen twice. Find it with:

Run: `grep -rn "signInWithGoogle" components app`

- [ ] **Step 3: Register the redirect URL in Supabase**

In the Supabase dashboard → Authentication → URL Configuration → Redirect URLs, add:

```
capacitor://localhost
capacitor://localhost/**
```

Also set `NEXT_PUBLIC_SITE_URL` in `.env` to the production origin — it is currently unset, and `getAuthRedirectUrl` falls back to a guessed value without it.

- [ ] **Step 4: Verify**

```bash
npx tsc --noEmit
npm run build
```

Expected: both pass. Web Google sign-in must still work — test it with `npm run dev` before moving on.

- [ ] **Step 5: Commit**

```bash
git add lib/supabase.ts package.json package-lock.json
git commit -m "feat: run Google OAuth in a system browser on native

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 12: Device verification pass

**Files:** none — this task produces evidence, not code.

- [ ] **Step 1: Build and install on a physical device**

The simulator does not exercise Keychain or biometry realistically. Use a real iPhone.

```bash
NEXT_PUBLIC_API_BASE_URL=https://<your-vercel-origin> npm run build:mobile
npx cap sync ios
npx cap open ios
```

In Xcode: select your device, set the signing team, Run.

- [ ] **Step 2: Work through the checklist**

Record pass/fail for each. Do not mark this task complete with any failure outstanding.

| # | Check | Expected |
| --- | --- | --- |
| 1 | Cold start with no stored session | Login screen, no Face ID prompt |
| 2 | Sign in with email + password | Reaches the role dashboard, data loads |
| 3 | **Force-quit, reopen** | Face ID prompt, then dashboard — still signed in |
| 4 | Deny the Face ID prompt | Login screen appears, app stays usable |
| 5 | Airplane mode, reopen | App opens, cached tables render, amber offline banner shows |
| 6 | Airplane mode, attempt a create | Clear error message, no silent failure |
| 7 | Restore network | Banner clears, fresh data loads |
| 8 | Google sign-in | Opens a system browser sheet, not the webview, and returns to the app |
| 9 | Sign in as each of the four roles | Each reaches only its own dashboard |
| 10 | Sign out | Returns to login; reopening does not restore the session |

Check 3 is the regression this phase exists for — it fails on `main` today.

- [ ] **Step 3: Confirm the repo is clean**

```bash
git status --porcelain
npm test
npx tsc --noEmit
npm run lint
npm run build
```

Expected: no output from `git status`; everything else passes.

- [ ] **Step 4: Record the result**

Append the checklist with pass/fail and the device/iOS version to the spec file under a new `## Phase 1 verification` heading, then:

```bash
git add docs/superpowers/specs/2026-07-27-ios-app-store-phase1-design.md
git commit -m "docs: record phase 1 device verification results

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

- [ ] **Step 5: Stop here — do not submit to App Store**

Phase 1 produces a webview app with a biometric lock. That is not a sufficient Guideline 4.2 argument. Push notifications (Phase 2) are the strongest 4.2 argument in the target set. Submitting now risks a rejection that is recorded against the app.

---

## Follow-up phases (not in this plan)

- **Phase 2 — Push:** APNs certificates, device-token table, server-side send on announcement / grade / payment events.
- **Phase 3 — Device APIs:** camera assignment upload, iOS Calendar sync, native share, offline write-sync queue.
- **Phase 4 — Swift targets:** Home Screen widget (separate Xcode target), native attendance screen for teachers.
- Migrating the Android AAB pipeline to Capacitor so both platforms share one config.
