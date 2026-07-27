import type { AnnouncementsResponse } from "@shared/api-types";
import { listResource } from "@/lib/school-db";
import { toAnnouncementEntries } from "@/lib/mobile/projections";
import { mobileRoute, preflight } from "@/lib/mobile/route-helpers";

export const runtime = "nodejs";

const METHODS = ["GET"];

export const OPTIONS = preflight(METHODS);

export const GET = mobileRoute<AnnouncementsResponse>(METHODS, async (context) => ({
  announcements: toAnnouncementEntries(await listResource("announcements", context))
}));
