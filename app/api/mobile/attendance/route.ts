import type { AttendanceResponse } from "@shared/api-types";
import { listResource } from "@/lib/school-db";
import { toAttendanceEntries } from "@/lib/mobile/projections";
import { mobileRoute, preflight } from "@/lib/mobile/route-helpers";

export const runtime = "nodejs";

const METHODS = ["GET", "POST"];

export const OPTIONS = preflight(METHODS);

export const GET = mobileRoute<AttendanceResponse>(METHODS, async (context) => ({
  entries: toAttendanceEntries(await listResource("attendance", context))
}));
