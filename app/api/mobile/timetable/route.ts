import type { TimetableResponse } from "@shared/api-types";
import { createResource, listResource } from "@/lib/school-db";
import { toTimetableSlots } from "@/lib/mobile/projections";
import { mobileRoute, preflight } from "@/lib/mobile/route-helpers";

export const runtime = "nodejs";

const METHODS = ["GET", "POST"];

export const OPTIONS = preflight(METHODS);

export const GET = mobileRoute<TimetableResponse>(METHODS, async (context) => ({
  slots: toTimetableSlots(await listResource("timetable", context))
}));

type TimetableWriteBody = {
  subject?: string;
  teacher?: string;
  class?: string;
  day?: string;
  time?: string;
};

export const POST = mobileRoute<TimetableResponse>(METHODS, async (context, request) => {
  const body = (await request.json().catch(() => null)) as TimetableWriteBody | null;

  if (!body?.subject || !body?.day || !body?.time) {
    throw new Error("subject, day, and time are required.");
  }

  // requireManageAccess inside createResource rejects any role outside
  // {admin, teacher}; not repeated here.
  const table = await createResource(
    "timetable",
    {
      Subject: body.subject,
      Teacher: body.teacher ?? "",
      Class: body.class ?? "",
      Day: body.day,
      Time: body.time
    },
    context
  );

  return { slots: toTimetableSlots(table) };
});
