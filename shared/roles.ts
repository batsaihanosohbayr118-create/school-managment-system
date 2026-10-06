import type { Language, Role } from "./i18n-tables";

export type { Role };

/**
 * Role -> visible mobile tabs. Mirrors the web's visibleModulesByRole
 * (DashboardApp.tsx:129) but with the reduced set the mobile design scopes
 * to — see docs/superpowers/specs/2026-07-27-expo-mobile-app-design.md.
 *
 * Payments has no tab: student/parent reach it from Home. Admin gets no
 * tabs at all — signing in as admin on mobile shows a single screen
 * directing them to the web, not a tab layout.
 */
export type MobileTab = "home" | "timetable" | "subjects" | "grades" | "attendance" | "announcements";

export const visibleTabsByRole: Record<Role, MobileTab[]> = {
  admin: [],
  teacher: ["home", "attendance", "grades", "timetable", "subjects", "announcements"],
  student: ["home", "timetable", "subjects", "grades", "attendance", "announcements"],
  parent: ["home", "timetable", "subjects", "grades", "attendance", "announcements"]
};

/**
 * The role a session resolves to when `user_metadata.role` is missing or
 * invalid. Must stay "student" on both web (lib/auth-flow.ts's
 * `resolveActiveSession`) and mobile — a divergence here would be a silent
 * privilege difference between the two clients.
 */
export const defaultRole: Role = "student";

export function isRole(value: unknown): value is Role {
  return value === "admin" || value === "teacher" || value === "student" || value === "parent";
}

/** Applies the same "unknown role -> student" default web and mobile share. */
export function resolveRole(value: unknown): Role {
  return isRole(value) ? value : defaultRole;
}

const roleLabels: Record<Role, Record<Language, string>> = {
  admin: { en: "Admin", mn: "Админ" },
  teacher: { en: "Teacher", mn: "Багш" },
  student: { en: "Student", mn: "Сурагч" },
  parent: { en: "Parent", mn: "Эцэг эх" }
};

/**
 * Display label for a session role. Roles are stored lowercase, which
 * translateValue's case-sensitive table never matches — so "teacher"
 * rendered untranslated. Unknown values are shown as-is.
 */
export function roleLabel(role: string, language: Language): string {
  return isRole(role) ? roleLabels[role][language] : role;
}
