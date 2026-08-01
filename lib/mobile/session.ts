import "server-only";
import { createClient } from "@supabase/supabase-js";
import { isRole } from "@/lib/auth-flow";
import type { SchoolSession } from "@/lib/school-session";

/**
 * Verifies the Supabase bearer token the Expo app sends.
 *
 * TEMPORARY: the web app moved off Supabase auth to Neon-backed accounts
 * (lib/auth-db.ts / lib/auth-token.ts) — lib/school-session-server.ts's
 * resolveRequestSession() verifies THAT token format, not Supabase's. The
 * mobile app still authenticates against Supabase directly
 * (mobile/lib/supabase.ts) and has not been migrated yet, so /api/mobile/*
 * routes need their own resolver here rather than the web app's. Once
 * mobile moves to the Neon-backed auth, this file — and this split — can
 * go away in favor of lib/school-session-server.ts alone.
 */
function getServerSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) return null;

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

export async function resolveMobileSession(request: Request): Promise<SchoolSession | null> {
  const authHeader = request.headers.get("authorization") ?? "";
  if (!authHeader.toLowerCase().startsWith("bearer ")) return null;

  const token = authHeader.slice(7).trim();
  if (!token) return null;

  const client = getServerSupabaseClient();
  if (!client) return null;

  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) return null;

  const metadata = data.user.user_metadata ?? {};

  return {
    role: isRole(metadata.role) ? metadata.role : "student",
    email: data.user.email ?? "",
    name: typeof metadata.name === "string" ? metadata.name : "",
    avatarUrl: typeof metadata.avatar_url === "string" ? metadata.avatar_url : "",
    source: "neon"
  };
}
