import { createClient } from "@supabase/supabase-js";
import { authService, isSupabaseConfigured } from "@/lib/supabase";
import { demoSessionKey, isRole } from "@/lib/auth-flow";
import type { Role } from "@/lib/types";

export type SchoolSession = {
  role: Role;
  email: string;
  name: string;
  avatarUrl: string;
  source: "supabase" | "demo";
};

function getServerSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

export async function getClientSchoolHeaders(): Promise<Record<string, string>> {
  if (typeof window === "undefined") {
    return {};
  }

  if (isSupabaseConfigured) {
    const { data } = await authService.getSession();
    const token = data.session?.access_token;

    if (token) {
      return {
        Authorization: `Bearer ${token}`
      };
    }
  }

  const rawDemoSession = window.sessionStorage.getItem(demoSessionKey);
  if (rawDemoSession) {
    return {
      "x-demo-session": rawDemoSession
    };
  }

  return {};
}

export async function resolveRequestSession(request: Request): Promise<SchoolSession | null> {
  const authHeader = request.headers.get("authorization") ?? "";
  if (authHeader.toLowerCase().startsWith("bearer ")) {
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
      source: "supabase"
    };
  }

  const demoHeader = request.headers.get("x-demo-session");
  if (!demoHeader) return null;

  try {
    const parsed = JSON.parse(demoHeader) as {
      role?: unknown;
      email?: unknown;
      name?: unknown;
      avatarUrl?: unknown;
    };

    return {
      role: isRole(parsed.role) ? parsed.role : "student",
      email: typeof parsed.email === "string" ? parsed.email : "",
      name: typeof parsed.name === "string" ? parsed.name : "",
      avatarUrl: typeof parsed.avatarUrl === "string" ? parsed.avatarUrl : "",
      source: "demo"
    };
  } catch {
    return null;
  }
}
