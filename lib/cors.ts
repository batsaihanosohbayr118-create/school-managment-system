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
