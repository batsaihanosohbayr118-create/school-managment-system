import type { PlacementResponse, PlacementResultsResponse } from "@shared/api-types";
import { PLACEMENT_SUBJECT, isPlacementSubject } from "@shared/placement";
import { deleteResource, listResource, submitPlacementTest } from "@/lib/school-db";
import { toPlacementQuestions, toPlacementResults, toSubjectEntries } from "@/lib/mobile/projections";
import { mobileRoute, preflight } from "@/lib/mobile/route-helpers";

export const runtime = "nodejs";

const METHODS = ["GET", "POST", "DELETE"];

export const OPTIONS = preflight(METHODS);

/**
 * Everything the placement screen needs in one request. Every list goes
 * through listResource, so the role scoping — a student's answer key
 * blanked, a parent seeing only their child's result, a teacher of another
 * subject seeing nothing — is decided in lib/school-db.ts, not here.
 */
export const GET = mobileRoute<PlacementResponse>(METHODS, async (context) => {
  const [questions, results, subjects] = await Promise.all([
    listResource("placementQuestions", context),
    listResource("placementResults", context),
    listResource("subjects", context)
  ]);

  const role = context.session.role;

  return {
    subject: PLACEMENT_SUBJECT,
    enrolled: toSubjectEntries(subjects).some((subject) => isPlacementSubject(subject.name)),
    // The data layer already blanked the key for students; dropping the
    // field as well keeps an empty "answer" from ever reaching their phone.
    questions: toPlacementQuestions(questions, role === "teacher" || role === "admin"),
    results: toPlacementResults(results)
  };
});

type SubmitBody = { answers?: unknown };

/** A student hands in the test; grading happens in submitPlacementTest. */
export const POST = mobileRoute<PlacementResultsResponse>(METHODS, async (context, request) => {
  const body = (await request.json().catch(() => null)) as SubmitBody | null;
  const answers = body?.answers;

  if (!answers || typeof answers !== "object" || Array.isArray(answers)) {
    throw new Error("answers are required.");
  }

  const cleaned = Object.fromEntries(
    Object.entries(answers as Record<string, unknown>).filter((entry): entry is [string, string] => typeof entry[1] === "string")
  );

  return { results: toPlacementResults(await submitPlacementTest(cleaned, context)) };
});

/** The English teacher resets a result so the student can sit the test again. */
export const DELETE = mobileRoute<PlacementResultsResponse>(METHODS, async (context, request) => {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) throw new Error("id is required.");

  return { results: toPlacementResults(await deleteResource("placementResults", id, context)) };
});
