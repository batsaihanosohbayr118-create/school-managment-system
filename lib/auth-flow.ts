import type { Role } from "@/lib/types";
import { authService, isSupabaseConfigured } from "@/lib/supabase";

/**
 * Single source of truth for the login -> role-based dashboard flow.
 *
 * The four roles each own a dedicated dashboard route. Both the login redirect
 * and the per-route access guard resolve the destination through the helpers
 * here so the mapping can never drift between call sites.
 */

export const demoSessionKey = "educore_session";

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
 * Resolves the current session for both auth backends:
 * - Supabase (when configured): reads the session + user_metadata.role.
 * - Demo mode: reads the sessionStorage payload written at login.
 *
 * Returns null when there is no authenticated user.
 */
export async function resolveActiveSession(): Promise<ActiveSession | null> {
  if (isSupabaseConfigured) {
    const { data } = await authService.getSession();
    const session = data.session;
    if (!session) return null;

    const metadata = session.user.user_metadata ?? {};
    const role = isRole(metadata.role) ? metadata.role : "student";

    return {
      role,
      email: session.user.email ?? "",
      name: typeof metadata.name === "string" ? metadata.name : "",
      avatarUrl: typeof metadata.avatar_url === "string" ? metadata.avatar_url : ""
    };
  }

  if (typeof window === "undefined") return null;

  // Demo mode never persists across a full sign-out, so stale localStorage is cleared.
  window.localStorage.removeItem(demoSessionKey);
  const raw = window.sessionStorage.getItem(demoSessionKey);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as { email?: unknown; role?: unknown; name?: unknown; avatarUrl?: unknown };
    return {
      role: isRole(parsed.role) ? parsed.role : "student",
      email: typeof parsed.email === "string" ? parsed.email : "",
      name: typeof parsed.name === "string" ? parsed.name : "",
      avatarUrl: typeof parsed.avatarUrl === "string" ? parsed.avatarUrl : ""
    };
  } catch {
    return null;
  }
}
