import type { AnnouncementsResponse } from "@shared/api-types";
import { deleteResource, listResource } from "@/lib/school-db";
import { toAnnouncementEntries } from "@/lib/mobile/projections";
import { mobileRoute, preflight } from "@/lib/mobile/route-helpers";

export const runtime = "nodejs";

const METHODS = ["GET", "DELETE"];

export const OPTIONS = preflight(METHODS);

export const GET = mobileRoute<AnnouncementsResponse>(METHODS, async (context) => ({
  announcements: toAnnouncementEntries(await listResource("announcements", context))
}));

export const DELETE = mobileRoute<AnnouncementsResponse>(METHODS, async (context, request) => {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) throw new Error("id is required.");

  // requireManageAccess inside deleteResource rejects any role outside
  // {admin, teacher}; not repeated here.
  const table = await deleteResource("announcements", id, context);
  return { announcements: toAnnouncementEntries(table) };
});
