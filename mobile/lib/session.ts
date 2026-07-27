import type { Role } from "@shared/roles";
import { resolveRole } from "@shared/roles";
import { supabase } from "./supabase";

export type ActiveSession = {
  role: Role;
  email: string;
  name: string;
  avatarUrl: string;
};

/**
 * Mirrors the web's resolveActiveSession (lib/auth-flow.ts) — same
 * user_metadata shape, same "unknown role defaults to student" rule via
 * shared/roles.ts's resolveRole, just backed by the SecureStore-persisted
 * mobile session instead of sessionStorage.
 */
export async function resolveActiveSession(): Promise<ActiveSession | null> {
  const { data } = await supabase.auth.getSession();
  const session = data.session;
  if (!session) return null;

  const metadata = session.user.user_metadata ?? {};

  return {
    role: resolveRole(metadata.role),
    email: session.user.email ?? "",
    name: typeof metadata.name === "string" ? metadata.name : "",
    avatarUrl: typeof metadata.avatar_url === "string" ? metadata.avatar_url : ""
  };
}
