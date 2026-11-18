import "server-only";

import { verifyToken } from "@/lib/auth-token";
import type { SchoolSession } from "@/lib/school-session";

/**
 * Verifies the bearer token on an incoming API request. Returns null when the
 * request is unauthenticated, the signature is wrong, or the token has expired.
 */
export async function resolveRequestSession(request: Request): Promise<SchoolSession | null> {
  const header = request.headers.get("authorization") ?? "";
  if (!header.toLowerCase().startsWith("bearer ")) return null;

  const token = header.slice(7).trim();
  if (!token) return null;

  const payload = verifyToken(token);
  if (!payload) return null;

  return {
    role: payload.role,
    email: payload.email,
    name: payload.name,
    avatarUrl: payload.avatarUrl,
    source: "neon"
  };
}
