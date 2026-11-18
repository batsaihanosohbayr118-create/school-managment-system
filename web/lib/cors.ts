import { NextResponse } from "next/server";

const staticOrigins = [
  "http://localhost:8081",  // Expo dev server
  "http://localhost:19006", // Expo web
  "http://localhost:3000"   // local Next dev
];

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

  response.headers.set("Cache-Control", "no-store");

  return response;
}
