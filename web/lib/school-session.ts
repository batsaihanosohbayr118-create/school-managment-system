import type { Role } from "@/lib/types";

/**
 * Client-safe half of the session helpers.
 *
 * Token *verification* lives in school-session-server.ts because it pulls in
 * node:crypto — importing it from here would drag that into the browser bundle.
 */

export type SchoolSession = {
  role: Role;
  email: string;
  name: string;
  avatarUrl: string;
  source: "neon";
};

/** Attaches the caller's bearer token to API requests made from the browser. */
export async function getClientSchoolHeaders(): Promise<Record<string, string>> {
  if (typeof window === "undefined") return {};

  const { getToken } = await import("@/lib/auth-client");
  const token = getToken();

  return token ? { Authorization: `Bearer ${token}` } : {};
}
