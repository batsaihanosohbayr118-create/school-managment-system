"use client";

import type { Role } from "@/lib/types";
import { isRole } from "@/lib/auth-flow";

/**
 * Browser-side authentication against the app's own Neon-backed endpoints.
 *
 * The token is opaque to the client: it is stored, echoed back on every
 * request, and its payload is read only to render the current user. All
 * verification happens server-side in lib/auth-token.ts.
 */

export const tokenStorageKey = "educore_token";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  avatarUrl: string;
};

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.sessionStorage.getItem(tokenStorageKey);
}

function setToken(token: string) {
  window.sessionStorage.setItem(tokenStorageKey, token);
}

export function clearToken() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(tokenStorageKey);
}

/**
 * Reads the payload without checking the signature — safe because nothing here
 * grants access. A tampered token simply fails on the server.
 */
export function readToken(token: string): SessionUser | null {
  const body = token.split(".")[0];
  if (!body) return null;

  try {
    const payload = JSON.parse(atob(body.replace(/-/g, "+").replace(/_/g, "/"))) as {
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
  return body?.message ?? "request-failed";
}

export const authService = {
  async signIn(identifier: string, password: string): Promise<{ user: SessionUser } | { error: string }> {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier, password })
    });

    if (!response.ok) return { error: await readMessage(response) };

    const { token, user } = (await response.json()) as { token: string; user: SessionUser };
    setToken(token);
    return { user };
  },

  getSession(): SessionUser | null {
    const token = getToken();
    if (!token) return null;

    const user = readToken(token);
    if (!user) {
      clearToken();
      return null;
    }

    return user;
  },

  signOut() {
    clearToken();
  },

  async updateProfile(values: { name?: string; email?: string; avatarUrl?: string }) {
    return patchProfile(values);
  },

  async changePassword(currentPassword: string, newPassword: string) {
    return patchProfile({ currentPassword, newPassword });
  }
};

async function patchProfile(payload: Record<string, unknown>): Promise<{ user: SessionUser } | { error: string }> {
  const token = getToken();
  if (!token) return { error: "not-signed-in" };

  const response = await fetch("/api/auth/profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  });

  if (!response.ok) return { error: await readMessage(response) };

  const body = (await response.json()) as { token: string; user: SessionUser };
  setToken(body.token);
  return { user: body.user };
}
