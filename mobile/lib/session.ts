import type { Role } from "@shared/roles";
import { getToken, readToken, clearToken } from "./auth";

export type ActiveSession = {
  role: Role;
  email: string;
  name: string;
  avatarUrl: string;
};

/**
 * Reads the stored token and decodes it — no network call. Mirrors the
 * web's authService.getSession() (lib/auth-client.ts). An expired or
 * corrupt token is treated as signed-out and cleared, same as a stale
 * Supabase session used to be.
 */
export async function resolveActiveSession(): Promise<ActiveSession | null> {
  const token = await getToken();
  if (!token) return null;

  const user = readToken(token);
  if (!user) {
    await clearToken();
    return null;
  }

  return {
    role: user.role,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl
  };
}
