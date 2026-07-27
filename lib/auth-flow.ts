import type { Role } from "@/lib/types";

/**
 * Single source of truth for the login -> role-based dashboard flow.
 *
 * The four roles each own a dedicated dashboard route. Both the login redirect
 * and the per-route access guard resolve the destination through the helpers
 * here so the mapping can never drift between call sites.
 */

export const ROLES: Role[] = ["admin", "teacher", "student", "parent"];

export function isRole(value: unknown): value is Role {
  return value === "admin" || value === "teacher" || value === "student" || value === "parent";
}

/** Maps a role to its protected dashboard route, e.g. "admin" -> "/admin/dashboard". */
export function dashboardPathForRole(role: Role): string {
  return `/${role}/dashboard`;
}

export type ActiveSession = {
  role: Role;
  email: string;
  name: string;
  avatarUrl: string;
};

/**
 * Resolves the current browser session from the stored token. Returns null when
 * there is no token, or when it has expired.
 */
export async function resolveActiveSession(): Promise<ActiveSession | null> {
  if (typeof window === "undefined") return null;

  const { authService } = await import("@/lib/auth-client");
  const user = authService.getSession();
  if (!user) return null;

  return { role: user.role, email: user.email, name: user.name, avatarUrl: user.avatarUrl };
}
