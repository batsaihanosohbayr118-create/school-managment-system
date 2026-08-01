import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import type { Role } from "@shared/roles";
import { isRole } from "@shared/roles";

/**
 * Browser-side counterpart to lib/auth-client.ts on the web — same
 * app-issued token, same Neon-backed /api/auth/* endpoints, just stored in
 * SecureStore (Keychain-backed on iOS) instead of sessionStorage, and read
 * async since SecureStore's API is async.
 *
 * There is no Supabase project involved anymore: the mobile app used to
 * authenticate against Supabase directly while the web app used its own
 * session store, which meant a person needed two separate accounts. Both
 * clients now go through the same /api/auth/* endpoints backed by the same
 * app_users table (lib/auth-db.ts).
 */
const TOKEN_KEY = "educore_mobile_token";

const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;

if (!baseUrl) {
  throw new Error("EXPO_PUBLIC_API_BASE_URL must be set (mobile/.env.local).");
}

// SecureStore has no web implementation — web is a dev-preview target only
// (the shipped app is iOS/Android), so localStorage is an acceptable
// fallback rather than plumbing a third storage strategy through the design.
const storage =
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

export async function getToken(): Promise<string | null> {
  return storage.getItem(TOKEN_KEY);
}

async function setToken(token: string) {
  await storage.setItem(TOKEN_KEY, token);
}

export async function clearToken() {
  await storage.removeItem(TOKEN_KEY);
}

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  avatarUrl: string;
};

/**
 * Base64url -> UTF-8 string, without relying on Buffer (not global in
 * Hermes) or TextDecoder (not guaranteed present on this Expo SDK). atob is
 * global on RN 0.72+ but only decodes to a Latin1 byte string, so the UTF-8
 * re-assembly below is still needed — names on this app are routinely
 * Mongolian Cyrillic, multi-byte in UTF-8, and would come out mangled
 * without it.
 */
function base64UrlToUtf8(input: string): string {
  let base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) base64 += "=";

  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

  let result = "";
  let i = 0;
  while (i < bytes.length) {
    const byte1 = bytes[i++];
    if (byte1 < 0x80) {
      result += String.fromCharCode(byte1);
    } else if (byte1 < 0xe0) {
      const byte2 = bytes[i++];
      result += String.fromCharCode(((byte1 & 0x1f) << 6) | (byte2 & 0x3f));
    } else if (byte1 < 0xf0) {
      const byte2 = bytes[i++];
      const byte3 = bytes[i++];
      result += String.fromCharCode(((byte1 & 0x0f) << 12) | ((byte2 & 0x3f) << 6) | (byte3 & 0x3f));
    } else {
      const byte2 = bytes[i++];
      const byte3 = bytes[i++];
      const byte4 = bytes[i++];
      const codepoint = ((byte1 & 0x07) << 18) | ((byte2 & 0x3f) << 12) | ((byte3 & 0x3f) << 6) | (byte4 & 0x3f);
      const surrogate = codepoint - 0x10000;
      result += String.fromCharCode(0xd800 + (surrogate >> 10), 0xdc00 + (surrogate & 0x3ff));
    }
  }
  return result;
}

/**
 * Decodes the token's payload without checking the signature — safe because
 * nothing here grants access. A tampered token simply fails on the server.
 * Mirrors the web's lib/auth-client.ts readToken().
 */
export function readToken(token: string): SessionUser | null {
  const body = token.split(".")[0];
  if (!body) return null;

  try {
    const payload = JSON.parse(base64UrlToUtf8(body)) as {
      sub?: unknown;
      email?: unknown;
      name?: unknown;
      role?: unknown;
      avatarUrl?: unknown;
      exp?: unknown;
    };

    if (typeof payload.exp !== "number" || payload.exp * 1000 <= Date.now()) return null;

    return {
      id: typeof payload.sub === "string" ? payload.sub : "",
      email: typeof payload.email === "string" ? payload.email : "",
      name: typeof payload.name === "string" ? payload.name : "",
      role: isRole(payload.role) ? payload.role : "student",
      avatarUrl: typeof payload.avatarUrl === "string" ? payload.avatarUrl : ""
    };
  } catch {
    return null;
  }
}

async function readMessage(response: Response) {
  const body = (await response.json().catch(() => null)) as { message?: string } | null;
  return body?.message ?? "Request failed.";
}

export const authService = {
  async signIn(identifier: string, password: string): Promise<{ error: string | null }> {
    let response: Response;
    try {
      response = await fetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password })
      });
    } catch {
      return { error: "No connection." };
    }

    if (!response.ok) return { error: await readMessage(response) };

    const { token } = (await response.json()) as { token: string };
    await setToken(token);
    return { error: null };
  },

  async signOut() {
    await clearToken();
  },

  async updateProfile({ avatarUrl }: { avatarUrl: string }): Promise<{ error: string | null }> {
    const token = await getToken();
    if (!token) return { error: "not-signed-in" };

    let response: Response;
    try {
      response = await fetch(`${baseUrl}/api/auth/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ avatarUrl })
      });
    } catch {
      return { error: "No connection." };
    }

    if (!response.ok) return { error: await readMessage(response) };

    const { token: nextToken } = (await response.json()) as { token: string };
    await setToken(nextToken);
    return { error: null };
  }
};
