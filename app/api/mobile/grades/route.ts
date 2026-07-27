import type { GradesResponse } from "@shared/api-types";
import { listResource } from "@/lib/school-db";
import { toGradeEntries } from "@/lib/mobile/projections";
import { mobileRoute, preflight } from "@/lib/mobile/route-helpers";

export const runtime = "nodejs";

const METHODS = ["GET", "POST"];

export const OPTIONS = preflight(METHODS);

export const GET = mobileRoute<GradesResponse>(METHODS, async (context) => ({
  grades: toGradeEntries(await listResource("grades", context))
}));
