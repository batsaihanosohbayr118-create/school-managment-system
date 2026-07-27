# iOS App Store — Phase 1: Native Shell & Session Foundation

> **SUPERSEDED 2026-07-27.** This design was abandoned before implementation in
> favour of a scoped Expo app. The deciding argument came from this document
> itself: phases 1-4 end with a webview *plus* Capacitor plugins *plus* two
> Swift targets, which pays the native cost while keeping the Guideline 4.2
> exposure. Because all role-scoping is server-side in `lib/school-db.ts` and
> `/api/school/[resource]` already returns a generic table shape, a native
> client is a UI-only rewrite, not a backend rewrite.
>
> Kept for the constraints it records, which remain true and are cited by the
> replacement spec: the `output: 'export'` failure, the `sessionStorage` session
> defect, the missing CORS headers, and the `/favicon.ico` offline probe bug.

**Date:** 2026-07-27
**Status:** Superseded — not implemented
**Phase:** 1 of 4 (abandoned)

## Context

The app currently ships as a Next.js 16 web app with PWA config. An Android AAB
already exists, produced externally from the PWA (no `android/`, `capacitor.config`,
or `twa-manifest.json` in this repo). The goal is an iOS build publishable to the
App Store.

Two decisions were made before this spec:

1. **Native depth:** deep native integration, to survive App Store Review
   Guideline 4.2 (Minimum Functionality). Full target set: push notifications,
   Face ID, offline, native share, camera assignment upload, iOS Calendar sync,
   Home Screen widget, native attendance screen for teachers.
2. **Content delivery:** the web UI is **bundled into the app** (static export),
   with API calls going out to the existing Vercel deployment. Not a remote-URL
   webview.

That full target set is four independent subsystems and is not one spec. This
document covers **Phase 1 only**.

## Goal

Produce a Capacitor iOS app that:

- builds from this repo with the web UI bundled,
- keeps a user signed in across app restarts,
- unlocks with Face ID / Touch ID,
- opens and shows last-known data with no network,
- completes Google sign-in outside the webview.

## Explicit non-goal

**Phase 1 output is not submittable to the App Store.** What it produces is a
webview app with a biometric lock. That is not a sufficient Guideline 4.2
argument on its own. Push notifications (Phase 2) are the strongest 4.2 argument
in the full target set. Do not submit for review before Phase 2 is done.

## Prerequisites (owner action, blocking)

These are outside the codebase and block shipping, not development:

| Item | Status | Note |
| --- | --- | --- |
| Apple Developer Program | Not confirmed | $99/year, approval takes days |
| Xcode | Not confirmed | macOS present |
| `SUPABASE_SERVICE_ROLE_KEY` | **Unset** | Needed to provision the demo account Apple Review requires. Without it `/admin/users` returns 501. |
| `NEXT_PUBLIC_SITE_URL` | **Unset** | Auth redirects fall back to a guessed origin |
| Bundle ID | Proposed | `mn.novamind.academy` |

The Apple reviewer demo account must be a real Supabase user with
`user_metadata.role` set. Supabase-only mode has no seeded demo logins.

## Architecture

### Build split

One repo, two build targets.

| Target | Command | Output | Consumer |
| --- | --- | --- | --- |
| Web + API | `npm run build` | `.next/` | Vercel (unchanged) |
| Mobile client | `npm run build:mobile` | `out/` → `npx cap sync ios` | Xcode |

**Why a script is required.** `output: 'export'` does not skip route handlers —
it fails the build. Verified on 2026-07-27:

```
Error: export const dynamic = "force-static"/export const revalidate not
configured on route "/api/admin/users" with "output: export"
Build error occurred: Failed to collect page data for /api/admin/users
```

Two workarounds were tested:

- `pageExtensions: ["tsx"]` (route handlers are all `route.ts`, pages are all
  `.tsx`) — **rejected**, breaks Next's internal module resolution:
  `Can't resolve private-next-app-dir/admin/dashboard/page` for every page.
- Temporarily relocating `app/api` and `proxy.ts` out of the tree — **works**.
  All 8 routes prerendered as static (`/`, `/login`, `/forgot-password`,
  `/admin/dashboard`, `/admin/users`, `/teacher/dashboard`,
  `/student/dashboard`, `/parent/dashboard`).

  Caveat: the trial run confirmed compilation and static prerendering from the
  build log. It did **not** confirm the on-disk export directory, because
  `distDir` was overridden during the trial. Confirming where the exported HTML
  lands, and pointing `webDir` in `capacitor.config.ts` at it, is the first
  implementation step.

`proxy.ts` must also be relocated: proxy/middleware is incompatible with static
export. Its three jobs are handled elsewhere in the native app — route
normalization is irrelevant (the app boots straight into a role dashboard),
`/register` redirect is dead, and security headers do not apply to bundled
assets.

**`scripts/build-mobile.mjs` contract:**

1. Refuse to run if `git status --porcelain` is non-empty. A crash mid-build
   with a dirty tree makes the relocation unrecoverable by `git checkout`.
2. Move `app/api` and `proxy.ts` to a temp location.
3. Run `next build` with `next.config.mobile.mjs`.
4. **Restore in a `finally` block**, unconditionally, including on signal.
5. Non-zero exit if the build failed.

**`next.config.mobile.mjs`:**

```js
{
  reactStrictMode: false,
  output: "export",
  distDir: ".next-mobile",
  images: { unoptimized: true },  // DashboardApp.tsx uses next/image
  // next-pwa disabled: the native shell does not need a service worker
}
```

Add `out/`, `.next-mobile/`, and `ios/App/App/public/` to `.gitignore`.

### Session persistence and Face ID

These are one mechanism, not two features. Face ID does not authenticate against
Supabase — it gates access to a stored refresh token.

**Current behaviour.** `lib/supabase.ts:27` pins Supabase's session store to
`window.sessionStorage`. On iOS, sessionStorage is cleared when the app is
terminated, so every cold start forces a fresh login. This is the single most
visible defect in a packaged build.

**Design.** Introduce a storage adapter selected at runtime:

| Platform | Store | Rationale |
| --- | --- | --- |
| Web | `window.sessionStorage` | Unchanged; no behaviour regression in the browser |
| Native | Keychain | Refresh tokens are credentials |

Use `capacitor-secure-storage-plugin` (Keychain-backed). **Not**
`@capacitor/preferences` — that is `UserDefaults`, unencrypted, and wrong for a
refresh token.

**Cold-start flow:**

```
App launch
  └─ Keychain has refresh token?
       ├─ no  → login screen
       └─ yes → biometry available and enrolled?
                  ├─ no      → login screen
                  └─ yes     → Face ID prompt
                                 ├─ success → read token, restore session, dashboard
                                 └─ fail/cancel → login screen
```

Biometric failure never locks the user out — it always falls through to the
normal login screen.

**Touchpoints:**

- `lib/supabase.ts:27` — replace the hardcoded `storage:` with the adapter.
- `lib/auth-flow.ts:59` — `window.localStorage.removeItem(demoSessionKey)` runs
  unconditionally on every session resolve. Must become adapter-aware.
- `lib/school-session.ts:46` — reads `sessionStorage` for the demo header. Route
  through the same adapter for consistency (demo mode is not used in production
  but the divergence is a trap).

### Networking

The static app runs from `capacitor://localhost`. Two consequences:

**Absolute API URLs.** `lib/school-api.ts:16` builds
`` `/api/school/${resource}` `` — a relative path that resolves against
`capacitor://localhost` and 404s. Add `NEXT_PUBLIC_API_BASE_URL`: empty string on
web (preserving current behaviour), the Vercel origin on native. Same treatment
for `lib/subjectContent.ts` if it builds URLs.

Because this is a `NEXT_PUBLIC_` variable it is **inlined at build time**, not
read at runtime. `build-mobile.mjs` must therefore set it explicitly for the
mobile target, and a wrong value means shipping an app that talks to the wrong
backend — it cannot be corrected without a new binary. Treat it as a release
input and assert it is non-empty before building.

**CORS.** The four route handlers set no CORS headers today. Because
`resolveRequestSession` reads `Authorization`, every request is a non-simple
request and will preflight. Each handler needs:

- an `OPTIONS` export,
- `Access-Control-Allow-Origin: capacitor://localhost`,
- `Access-Control-Allow-Headers: authorization, content-type, x-demo-session`,
- `Access-Control-Allow-Methods` matching the handler's verbs.

Implement once in `lib/cors.ts` and wrap the four handlers, rather than four
copies. Affected: `app/api/school/[resource]/route.ts`,
`app/api/admin/users/route.ts`, `app/api/subjects/[id]/content/route.ts`,
`app/api/records/route.ts`.

Do not use a wildcard origin — these endpoints carry bearer tokens.

**OAuth.** Google blocks OAuth from embedded webviews
(`disallowed_useragent`). `authService.signInWithGoogle` must open through
`@capacitor/browser` (ASWebAuthenticationSession) and return via a deep link.
Add `capacitor://localhost` to Supabase Auth → URL Configuration → Redirect URLs.

### Offline

Phase 1 is read-only offline:

- The app opens with no network (assets are bundled, so this is free).
- Last successful `listSchoolResource` response per resource is cached and shown
  when the network call fails.
- The existing `components/NoConnection.tsx` banner indicates offline state.
- **Writes are blocked** with a clear message while offline.

No sync queue. A partial write-sync implementation risks corrupting attendance
and grade data; it is deferred to Phase 3 where it can be designed properly.

### Error handling

`lib/school-api.ts:33` collapses every failure into a generic `Error`. The UI
cannot distinguish causes. Introduce a typed failure so callers can react:

| Condition | UI response |
| --- | --- |
| No network / fetch rejected | Show cached data + offline banner |
| 401 | Session expired → clear Keychain token, return to login |
| 403 | "You do not have permission" — do not retry |
| 4xx other | Show the server's message |
| 5xx | "Try again later" + retry affordance |

## Verification

There is no test framework in this repo. Verification is static checks plus a
manual device pass.

**Static:**

```bash
npm run lint
npx tsc --noEmit
npm run build          # web/API target still builds
npm run build:mobile   # export target builds, out/ populated
git status --porcelain # must be empty after build:mobile
```

**On a physical device** (the simulator will not exercise Keychain or biometry
realistically):

1. Cold start → Face ID prompt → dashboard loads.
2. **Force-quit the app, reopen → still signed in.** This is the regression test
   proving the sessionStorage fix. It fails on today's code.
3. Airplane mode → app opens, shows cached data, offline banner visible, write
   actions blocked with a message.
4. Google sign-in completes in a system browser sheet, not inside the webview,
   and returns to the app.
5. Deny Face ID at the prompt → login screen appears, app remains usable.
6. Each of the four roles reaches only its own dashboard.

## Risks

| Risk | Mitigation |
| --- | --- |
| `build-mobile.mjs` crashes mid-run and leaves `app/api` moved | Clean-tree precondition + `finally` restore + signal handler |
| CORS misconfigured → empty tables, no visible error | Error handling work above surfaces network failures instead of rendering blank |
| Keychain plugin unmaintained | Verify plugin health at implementation time; Keychain via a small custom plugin is the fallback |
| Static export diverges from the Vercel build | Both targets run in the same verification pass |

## Out of scope (later phases)

- **Phase 2 — Push:** APNs certificates, device-token table, server-side send on
  announcement / grade / payment events. This is the load-bearing 4.2 argument.
- **Phase 3 — Device APIs:** camera assignment upload, iOS Calendar sync, native
  share, offline write-sync queue.
- **Phase 4 — Swift targets:** Home Screen widget (a separate Xcode target;
  Capacitor cannot produce it), native attendance screen for teachers.
- Migrating the existing Android AAB pipeline to Capacitor. Worth doing so both
  platforms share one config, but it is not required for iOS.
