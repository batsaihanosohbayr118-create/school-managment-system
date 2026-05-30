import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!)
  : null;

export const authService = {
  async signIn(email: string, password: string) {
    if (!supabase) {
      return { error: null, demo: true };
    }

    return supabase.auth.signInWithPassword({ email, password });
  },
  async signUp(email: string, password: string, name: string) {
    if (!supabase) {
      return { error: null, demo: true };
    }

    return supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name
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
  async signInWithGoogle(redirectTo: string) {
    if (!supabase) {
      return { error: new Error("Supabase is not configured.") };
    }

    return supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo
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
  }
};
