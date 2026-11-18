import type { AttendanceResponse } from "@shared/api-types";
import { createResource, deleteResource, listResource } from "@/lib/school-db";
import { toAttendanceEntries } from "@/lib/mobile/projections";
import { mobileRoute, preflight } from "@/lib/mobile/route-helpers";

export const runtime = "nodejs";

const METHODS = ["GET", "POST", "DELETE"];

export const OPTIONS = preflight(METHODS);

export const GET = mobileRoute<AttendanceResponse>(METHODS, async (context) => ({
  entries: toAttendanceEntries(await listResource("attendance", context))
}));

type AttendanceWriteBody = {
  student?: string;
  subject?: string;
  date?: string;
  status?: string;
};

export const POST = mobileRoute<AttendanceResponse>(METHODS, async (context, request) => {
  const body = (await request.json().catch(() => null)) as AttendanceWriteBody | null;

  if (!body?.student || !body?.status) {
    throw new Error("student and status are required.");
  }

  // requireManageAccess inside createResource rejects any role outside
  // {admin, teacher}; ensureTeacherSubject forces a teacher onto their own
  // subject. Neither check is repeated here.
  const table = await createResource(
    "attendance",
    {
      Student: body.student,
      Subject: body.subject ?? "",
      Date: body.date ?? "",
      Status: body.status
    },
    context
  );

  return { entries: toAttendanceEntries(table) };
});

export const DELETE = mobileRoute<AttendanceResponse>(METHODS, async (context, request) => {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) throw new Error("id is required.");

  // requireManageAccess inside deleteResource rejects any role outside
  // {admin, teacher}; not repeated here.
  const table = await deleteResource("attendance", id, context);
  return { entries: toAttendanceEntries(table) };
});
