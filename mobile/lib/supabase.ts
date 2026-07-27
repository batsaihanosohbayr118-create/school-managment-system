import "react-native-url-polyfill/auto";
import * as SecureStore from "expo-secure-store";
import { createClient } from "@supabase/supabase-js";

/**
 * Unlike the web app (lib/supabase.ts), there is no demo-mode fallback here:
 * mobile only ever talks to a real Supabase project, so a missing env var is
 * a setup error, not a state the app should run in.
 *
 * Session storage is expo-secure-store (Keychain-backed on iOS), per the
 * mobile design spec — not AsyncStorage, which is reserved for the
 * read-cache and is not credential material.
 */
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY must be set (mobile/.env.local)."
  );
}

const secureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key)
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: secureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    // No OAuth redirect ever lands in a URL bar on mobile.
    detectSessionInUrl: false
  }
});

export const authService = {
  async signIn(email: string, password: string) {
    return supabase.auth.signInWithPassword({ email, password });
  },
  async signOut() {
    return supabase.auth.signOut();
  },
  async getSession() {
    return supabase.auth.getSession();
  },
  onAuthStateChange(callback: (event: string) => void) {
    return supabase.auth.onAuthStateChange((event) => callback(event));
  }
};
