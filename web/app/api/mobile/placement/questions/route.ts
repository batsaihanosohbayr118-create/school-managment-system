import type { PlacementQuestionsResponse } from "@shared/api-types";
import { createResource, deleteResource, updateResource } from "@/lib/school-db";
import { toPlacementQuestions } from "@/lib/mobile/projections";
import { mobileRoute, preflight } from "@/lib/mobile/route-helpers";

export const runtime = "nodejs";

const METHODS = ["POST", "PATCH", "DELETE"];

export const OPTIONS = preflight(METHODS);

type QuestionBody = {
  level?: string;
  question?: string;
  options?: unknown;
  answer?: string;
};

/**
 * Maps the phone's shape onto the table's columns. Validation (level, answer
 * letter, four non-empty options) and the English-teacher check both live in
 * lib/school-db.ts.
 */
async function questionValues(request: Request): Promise<Record<string, string>> {
  const body = (await request.json().catch(() => null)) as QuestionBody | null;
  if (!body) throw new Error("A question is required.");

  const options = Array.isArray(body.options) ? body.options.map((option) => (typeof option === "string" ? option : "")) : [];

  return {
    Level: body.level ?? "",
    Question: body.question ?? "",
    "Option A": options[0] ?? "",
    "Option B": options[1] ?? "",
    "Option C": options[2] ?? "",
    "Option D": options[3] ?? "",
    Answer: body.answer ?? ""
  };
}

function requiredId(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) throw new Error("id is required.");
  return id;
}

export const POST = mobileRoute<PlacementQuestionsResponse>(METHODS, async (context, request) => ({
  questions: toPlacementQuestions(await createResource("placementQuestions", await questionValues(request), context), true)
}));

export const PATCH = mobileRoute<PlacementQuestionsResponse>(METHODS, async (context, request) => {
  const id = requiredId(request);
  return { questions: toPlacementQuestions(await updateResource("placementQuestions", id, await questionValues(request), context), true) };
});

export const DELETE = mobileRoute<PlacementQuestionsResponse>(METHODS, async (context, request) => ({
  questions: toPlacementQuestions(await deleteResource("placementQuestions", requiredId(request), context), true)
}));
