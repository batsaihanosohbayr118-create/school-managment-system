import { ApiError, classifyStatus } from "@shared/api-error";
import type {
  AnnouncementsResponse,
  AttendanceResponse,
  GradesResponse,
  MobileErrorBody,
  MobileProfile,
  PaymentsResponse,
  TimetableResponse
} from "@shared/api-types";
import { supabase } from "./supabase";

const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;

if (!baseUrl) {
  throw new Error("EXPO_PUBLIC_API_BASE_URL must be set (mobile/.env.local).");
}

async function authHeader(): Promise<HeadersInit> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  // No session means the auth gate already has the user on /login; a request
  // fired anyway (e.g. a stale screen mid-redirect) should 401, not silently
  // hit an unauthenticated endpoint.
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: { ...(await authHeader()), "Content-Type": "application/json", ...init?.headers }
    });
  } catch {
    throw new ApiError("offline", "No connection.");
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as MobileErrorBody | null;
    throw new ApiError(classifyStatus(response.status), body?.message ?? "Request failed.");
  }

  return response.json() as Promise<T>;
}

export const api = {
  me: () => request<MobileProfile>("/api/mobile/me"),
  timetable: () => request<TimetableResponse>("/api/mobile/timetable"),
  grades: () => request<GradesResponse>("/api/mobile/grades"),
  attendance: () => request<AttendanceResponse>("/api/mobile/attendance"),
  announcements: () => request<AnnouncementsResponse>("/api/mobile/announcements"),
  payments: () => request<PaymentsResponse>("/api/mobile/payments"),
  postAttendance: (body: { student: string; subject?: string; date?: string; status: string }) =>
    request<AttendanceResponse>("/api/mobile/attendance", { method: "POST", body: JSON.stringify(body) }),
  postGrade: (body: { student: string; subject?: string; score: number | string; semester?: string }) =>
    request<GradesResponse>("/api/mobile/grades", { method: "POST", body: JSON.stringify(body) }),
  postTimetable: (body: { subject: string; teacher?: string; class?: string; day: string; time: string }) =>
    request<TimetableResponse>("/api/mobile/timetable", { method: "POST", body: JSON.stringify(body) })
};
