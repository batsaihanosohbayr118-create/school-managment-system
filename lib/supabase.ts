import { createClient } from "@supabase/supabase-js";
import type { Role } from "@/lib/types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export function getAuthRedirectUrl(path = "/") {
  if (typeof window !== "undefined") {
    return new URL(path, window.location.origin).toString();
  }

  let baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.NEXT_PUBLIC_VERCEL_URL ??
    "http://localhost:3000";

  baseUrl = baseUrl.startsWith("http") ? baseUrl : `https://${baseUrl}`;

  return new URL(path, baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`).toString();
}

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        storage: typeof window === "undefined" ? undefined : window.sessionStorage
      }
    })
  : null;

export const authService = {
  async signIn(email: string, password: string) {
    if (!supabase) {
      return { error: null, demo: true };
    }

    return supabase.auth.signInWithPassword({ email, password });
  },
  async signUp(email: string, password: string, name: string, role: Role) {
    if (!supabase) {
      return { error: null, demo: true };
    }

    return supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          role
        }
      }
    });
  },
  async resetPassword(email: string) {
    if (!supabase) {
      return { error: null, demo: true };
    }

    return supabase.auth.resetPasswordForEmail(email);
  },
  async verifyRecoveryCode(email: string, token: string) {
    if (!supabase) {
      return { error: new Error("Supabase is not configured.") };
    }

    return supabase.auth.verifyOtp({
      email,
      token,
      type: "recovery"
    });
  },
  async updatePassword(password: string) {
    if (!supabase) {
      return { error: new Error("Supabase is not configured.") };
    }

    return supabase.auth.updateUser({ password });
  },
  async signInWithGoogle(redirectTo: string) {
    if (!supabase) {
      return { error: new Error("Supabase is not configured.") };
    }

    return supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        skipBrowserRedirect: true
      }
    });
  },
  async getSession() {
    if (!supabase) {
      return { data: { session: null }, error: null };
    }

    return supabase.auth.getSession();
  },
  async signOut() {
    if (!supabase) {
      return { error: null };
    }

    return supabase.auth.signOut();
  },
  async updateProfile({ name, avatarUrl, email }: { name?: string; avatarUrl?: string; email?: string }) {
    if (!supabase) {
      return { data: { user: null }, error: null, demo: true };
    }

    const metadata: Record<string, unknown> = {};
    if (typeof name === "string") metadata.name = name;
    if (typeof avatarUrl === "string") metadata.avatar_url = avatarUrl;

    const payload: { email?: string; data?: Record<string, unknown> } = {};
    if (email) payload.email = email;
    if (Object.keys(metadata).length > 0) payload.data = metadata;

    return supabase.auth.updateUser(payload);
  }
};

// New function to get current user's email and role
export async function getCurrentUserEmailAndRole(): Promise<{ email: string | null; role: Role | null }> {
  if (!supabase) {
    return { email: null, role: null };
  }
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session) {
    return { email: null, role: null };
  }
  const user = session.user;
  const role = user.user_metadata?.role as Role | undefined;
  return { email: user.email ?? null, role: role ?? null };
};