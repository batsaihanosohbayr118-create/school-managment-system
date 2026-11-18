import { NextResponse } from "next/server";

/**
 * A React Native client is cross-origin. Because `resolveRequestSession` reads
 * the `Authorization` header, every request is a non-simple request and
 * preflights.
 *
 * No wildcard: these endpoints accept bearer tokens. A native release build
 * sends no Origin header at all, in which case CORS does not apply and the
 * request proceeds normally — the entries below exist for the Expo dev client,
 * Expo Go, and web callers.
 */
const staticOrigins = [
  "http://localhost:8081",  // Expo dev server
  "http://localhost:19006", // Expo web
  "http://localhost:3000"   // local Next dev
];

// Metro/Expo dev servers are reached over LAN by IP (e.g. http://192.168.1.23:8081)
// whenever the client is a physical device rather than a simulator on the same
// machine — most notably Expo Go, whose JS runtime enforces CORS unlike a real
// native build. The static localhost entries above never match that case, so
// every request (including GET) got silently dropped at the preflight step.
const devLanOriginPattern = /^http:\/\/(\d{1,3}\.){3}\d{1,3}:(8081|19006)$/;

function allowedOrigins(): Set<string> {
  const extra = (process.env.MOBILE_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  return new Set([...staticOrigins, ...extra]);
}

export function isAllowedOrigin(origin: string | null): boolean {
  if (origin === null) return false;
  return allowedOrigins().has(origin) || devLanOriginPattern.test(origin);
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

  // Every mobile response carries per-user data behind a bearer token.
  // Next's default "public, max-age=0, must-revalidate" is still cacheable —
  // a client (or intermediate cache) that skips revalidation under flaky
  // connectivity can replay a stale response, including a stale error, well
  // after the condition that caused it is gone.
  response.headers.set("Cache-Control", "no-store");

  return response;
}
