import type { Role } from "@/lib/types";
import { demoSessionKey, isRole } from "@/lib/auth-flow";

/**
 * Client-side credential store used ONLY when Supabase is not configured
 * (isSupabaseConfigured === false). It powers the login page and the Admin
 * "Manage Users" screen so the whole flow works out of the box without a
 * backend. When Supabase IS configured, real Supabase Auth is used instead
 * and this module is bypassed.
 */

export type DemoUser = {
  id: string;
  name: string;
  username: string;
  email: string;
  password: string;
  role: Role;
  createdAt: string;
};

const demoUsersKey = "educore_demo_users";

const seedUsers: Omit<DemoUser, "id" | "createdAt">[] = [
  { name: "Admin User", username: "admin", email: "admin@novamind.mn", password: "Admin@123", role: "admin" },
  { name: "Teacher User", username: "teacher", email: "teacher@novamind.mn", password: "Teacher@123", role: "teacher" },
  { name: "Student User", username: "student", email: "student@novamind.mn", password: "Student@123", role: "student" },
  { name: "Parent User", username: "parent", email: "parent@novamind.mn", password: "Parent@123", role: "parent" }
];

function makeId() {
  return `US-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}

export function listDemoUsers(): DemoUser[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(demoUsersKey) ?? "[]") as Partial<DemoUser>[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((u) => typeof u.email === "string" && isRole(u.role))
      .map((u) => ({
        id: typeof u.id === "string" ? u.id : makeId(),
        name: typeof u.name === "string" ? u.name : "",
        username: typeof u.username === "string" ? u.username : "",
        email: u.email as string,
        password: typeof u.password === "string" ? u.password : "",
        role: u.role as Role,
        createdAt: typeof u.createdAt === "string" ? u.createdAt : new Date().toISOString()
      }));
  } catch {
    return [];
  }
}

function writeUsers(users: DemoUser[]) {
  window.localStorage.setItem(demoUsersKey, JSON.stringify(users));
}

/** Creates the four default accounts the first time the app runs in demo mode. */
export function seedDemoUsers(): DemoUser[] {
  if (typeof window === "undefined") return [];
  const existing = listDemoUsers();
  if (existing.length > 0) return existing;

  const seeded: DemoUser[] = seedUsers.map((u) => ({
    ...u,
    id: makeId(),
    createdAt: new Date().toISOString()
  }));
  writeUsers(seeded);
  return seeded;
}

export function findDemoUserByIdentifier(identifier: string): DemoUser | undefined {
  const key = normalize(identifier);
  return listDemoUsers().find((u) => normalize(u.email) === key || normalize(u.username) === key);
}

export type DemoAuthResult = { user: DemoUser } | { error: string };

export function authenticateDemoUser(identifier: string, password: string): DemoAuthResult {
  const user = findDemoUserByIdentifier(identifier);
  if (!user || user.password !== password) {
    return { error: "invalid" };
  }
  return { user };
}

/** Persists the active demo session, mirroring Supabase's sessionStorage strategy. */
export function startDemoSession(user: DemoUser) {
  window.localStorage.removeItem(demoSessionKey);
  window.sessionStorage.setItem(
    demoSessionKey,
    JSON.stringify({ email: user.email, name: user.name, role: user.role, avatarUrl: "" })
  );
}

export type DemoUserInput = {
  name: string;
  username: string;
  email: string;
  password: string;
  role: Role;
};

export function createDemoUser(input: DemoUserInput): DemoAuthResult {
  const users = listDemoUsers();
  const email = input.email.trim();
  const username = input.username.trim();

  if (users.some((u) => normalize(u.email) === normalize(email))) {
    return { error: "email-exists" };
  }
  if (username && users.some((u) => normalize(u.username) === normalize(username))) {
    return { error: "username-exists" };
  }

  const user: DemoUser = {
    id: makeId(),
    name: input.name.trim(),
    username,
    email,
    password: input.password,
    role: input.role,
    createdAt: new Date().toISOString()
  };
  writeUsers([user, ...users]);
  return { user };
}

export function updateDemoUser(id: string, input: Partial<DemoUserInput>): DemoAuthResult {
  const users = listDemoUsers();
  const index = users.findIndex((u) => u.id === id);
  if (index < 0) return { error: "not-found" };

  const next = { ...users[index] };
  if (typeof input.name === "string") next.name = input.name.trim();
  if (typeof input.username === "string") next.username = input.username.trim();
  if (typeof input.email === "string") next.email = input.email.trim();
  if (typeof input.role === "string" && isRole(input.role)) next.role = input.role;
  if (typeof input.password === "string" && input.password.length > 0) next.password = input.password;

  // Guard against email/username collisions with other users.
  if (users.some((u) => u.id !== id && normalize(u.email) === normalize(next.email))) {
    return { error: "email-exists" };
  }
  if (next.username && users.some((u) => u.id !== id && normalize(u.username) === normalize(next.username))) {
    return { error: "username-exists" };
  }

  users[index] = next;
  writeUsers(users);
  return { user: next };
}

export function deleteDemoUser(id: string): boolean {
  const users = listDemoUsers();
  const next = users.filter((u) => u.id !== id);
  if (next.length === users.length) return false;
  writeUsers(next);
  return true;
}

export function resetDemoUserPassword(id: string, password: string): DemoAuthResult {
  return updateDemoUser(id, { password });
}
