import type { TimetableResponse } from "@shared/api-types";
import { listResource } from "@/lib/school-db";
import { toTimetableSlots } from "@/lib/mobile/projections";
import { mobileRoute, preflight } from "@/lib/mobile/route-helpers";

export const runtime = "nodejs";

const METHODS = ["GET"];

export const OPTIONS = preflight(METHODS);

export const GET = mobileRoute<TimetableResponse>(METHODS, async (context) => ({
  slots: toTimetableSlots(await listResource("timetable", context))
}));
