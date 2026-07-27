import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Proxy (Next.js 16's successor to middleware) — the first layer of route
 * protection.
 *
 * Authentication in this app is client-side (Supabase stores its session in
 * sessionStorage, and demo mode uses sessionStorage too), so the session token
 * is NOT available to the server. The authoritative per-role access check
 * therefore lives in the client guard inside `components/dashboard/DashboardApp`
 * (and the `/admin/*` page guards). This proxy complements that by:
 *
 *  1. Normalizing structural routes (e.g. `/admin` -> `/admin/dashboard`).
 *  2. Retiring the removed public registration route (`/register` -> `/login`).
 *  3. Applying baseline security headers to every response.
 *
 * To move enforcement fully server-side, switch to cookie-based Supabase SSR
 * (`@supabase/ssr`) and read the session from cookies here.
 */

const ROLE_ROOTS = new Set(["/admin", "/teacher", "/student", "/parent"]);

function withSecurityHeaders(response: NextResponse) {
  response.headers.set("X-Frame-Options", "SAMEORIGIN");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-DNS-Prefetch-Control", "on");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  return response;
}

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public registration was removed — send any stale links to login.
  if (pathname === "/register") {
    return withSecurityHeaders(NextResponse.redirect(new URL("/login", request.url)));
  }

  // A bare role root resolves to that role's dashboard.
  if (ROLE_ROOTS.has(pathname)) {
    return withSecurityHeaders(NextResponse.redirect(new URL(`${pathname}/dashboard`, request.url)));
  }

  return withSecurityHeaders(NextResponse.next());
}

export const config = {
  // Run on application routes; skip Next internals, the PWA assets, and static files.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|workbox-|offline.html|icon-|data/).*)"]
};
