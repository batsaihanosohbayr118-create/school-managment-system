import type { SubjectsResponse } from "@shared/api-types";
import { listResource } from "@/lib/school-db";
import { toSubjectEntries } from "@/lib/mobile/projections";
import { mobileRoute, preflight } from "@/lib/mobile/route-helpers";

export const runtime = "nodejs";

const METHODS = ["GET"];

export const OPTIONS = preflight(METHODS);

export const GET = mobileRoute<SubjectsResponse>(METHODS, async (context) => ({
  subjects: toSubjectEntries(await listResource("subjects", context))
}));
