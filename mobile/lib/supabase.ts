import "react-native-url-polyfill/auto";
import { Platform } from "react-native";
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

// SecureStore is Keychain/Keystore-backed and has no web implementation —
// `getValueWithKeyAsync` doesn't exist there. Web is a dev-preview target
// only (the shipped app is iOS/Android), so localStorage is an acceptable
// fallback rather than plumbing a third storage strategy through the design.
const secureStoreAdapter =
  Platform.OS === "web"
    ? {
        getItem: (key: string) => Promise.resolve(window.localStorage.getItem(key)),
        setItem: (key: string, value: string) => {
          window.localStorage.setItem(key, value);
          return Promise.resolve();
        },
        removeItem: (key: string) => {
          window.localStorage.removeItem(key);
          return Promise.resolve();
        }
      }
    : {
        getItem: (key: string) => SecureStore.getItemAsync(key),
        setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
        removeItem: (key: string) => SecureStore.deleteItemAsync(key)
      };

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: secureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
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
  /**
   * Mirrors the web app's authService.updateProfile (lib/supabase.ts) —
   * same avatar_url metadata field, so a profile picture set from either
   * client shows up on the other. `updateUser` fires a "USER_UPDATED"
   * auth-state event, which AuthProvider's onAuthStateChange listener
   * already resolves into a fresh session — no separate refresh needed here.
   */
  async updateProfile({ avatarUrl }: { avatarUrl: string }) {
    return supabase.auth.updateUser({ data: { avatar_url: avatarUrl } });
  },
  async getSession() {
    return supabase.auth.getSession();
  },
  onAuthStateChange(callback: (event: string) => void) {
    return supabase.auth.onAuthStateChange((event) => callback(event));
  }
};
