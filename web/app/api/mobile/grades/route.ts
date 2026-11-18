import type { GradesResponse } from "@shared/api-types";
import { createResource, deleteResource, listResource } from "@/lib/school-db";
import { toGradeEntries } from "@/lib/mobile/projections";
import { mobileRoute, preflight } from "@/lib/mobile/route-helpers";

export const runtime = "nodejs";

const METHODS = ["GET", "POST", "DELETE"];

export const OPTIONS = preflight(METHODS);

export const GET = mobileRoute<GradesResponse>(METHODS, async (context) => ({
  grades: toGradeEntries(await listResource("grades", context))
}));

type GradeWriteBody = {
  student?: string;
  subject?: string;
  score?: number | string;
  semester?: string;
};

export const POST = mobileRoute<GradesResponse>(METHODS, async (context, request) => {
  const body = (await request.json().catch(() => null)) as GradeWriteBody | null;

  if (!body?.student || body.score === undefined || body.score === null || body.score === "") {
    throw new Error("student and score are required.");
  }

  const table = await createResource(
    "grades",
    {
      Student: body.student,
      Subject: body.subject ?? "",
      Score: String(body.score),
      Semester: body.semester ?? ""
    },
    context
  );

  return { grades: toGradeEntries(table) };
});

export const DELETE = mobileRoute<GradesResponse>(METHODS, async (context, request) => {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) throw new Error("id is required.");

  // requireManageAccess inside deleteResource rejects any role outside
  // {admin, teacher}; not repeated here.
  const table = await deleteResource("grades", id, context);
  return { grades: toGradeEntries(table) };
});
