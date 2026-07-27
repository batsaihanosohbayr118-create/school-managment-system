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
