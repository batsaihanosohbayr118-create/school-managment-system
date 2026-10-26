import { NextRequest, NextResponse } from "next/server";
import type { SubjectContent } from "@/lib/types";
import { resolveRequestSession } from "@/lib/school-session-server";
import { preflight, withCors } from "@/lib/cors";
import { requireSubjectContentAccess } from "@/lib/school-db";
import { appendFileLessons, removedFileIds, safeStoredName, type UploadedLessonFile } from "@/lib/subject-files";
import {
  deleteSubjectFiles,
  readSubjectContent,
  storeSubjectFile,
  writeSubjectContent
} from "@/lib/subject-storage";

export const runtime = "nodejs";

const METHODS = ["GET", "POST"];

export const OPTIONS = preflight(METHODS);

type RouteContext = {
  params: Promise<{ id: string }>;
};

async function safeSubjectId(context: RouteContext) {
  const { id } = await context.params;
  const safeId = id.replace(/[^a-zA-Z0-9_-]/g, "");
  if (!safeId) throw new Error("Invalid subject id");
  return safeId;
}

function stringFormValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

async function uploadFiles(req: NextRequest, subjectId: string) {
  const formData = await req.formData();
  const files = formData
    .getAll("files")
    .filter((v): v is File => v instanceof File && v.size > 0);

  if (files.length === 0) throw new Error("No files were uploaded");

  const uploaded: UploadedLessonFile[] = [];

  for (const [index, file] of files.entries()) {
    const stored = await storeSubjectFile({
      subjectId,
      fileName: `${Date.now()}-${index + 1}-${safeStoredName(file.name)}`,
      contentType: file.type,
      data: Buffer.from(await file.arrayBuffer())
    });
    uploaded.push({ fileName: file.name, url: stored.url, contentType: file.type, byteSize: file.size });
  }

  const content = await readSubjectContent(subjectId);
  const nextContent = appendFileLessons({ ...content, subjectId }, uploaded, {
    title: stringFormValue(formData, "title"),
    topicId: stringFormValue(formData, "topicId"),
    duration: stringFormValue(formData, "duration"),
  });

  await writeSubjectContent(subjectId, nextContent);
  return nextContent;
}

export async function GET(_: NextRequest, context: RouteContext) {
  try {
    const session = await resolveRequestSession(_);
    if (!session) {
      return withCors(NextResponse.json({ message: "Unauthorized." }, { status: 401 }), _, METHODS);
    }

    const subjectId = await safeSubjectId(context);
    const content = await readSubjectContent(subjectId);
    return withCors(
      NextResponse.json(
        content.lessons.length || content.topics.length || content.assignments.length
          ? content
          : null
      ),
      _,
      METHODS
    );
  } catch {
    return withCors(NextResponse.json(null), _, METHODS);
  }
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const session = await resolveRequestSession(req);
    if (!session) {
      return withCors(NextResponse.json({ message: "Unauthorized." }, { status: 401 }), req, METHODS);
    }

    const subjectId = await safeSubjectId(context);

    // Reading a subject's lesson content is open to any signed-in role (a
    // student or parent needs to see it); changing it is for an admin or that
    // subject's own teacher. The check lives in the data layer.
    try {
      await requireSubjectContentAccess({ session }, subjectId);
    } catch (error) {
      return withCors(
        NextResponse.json({ message: error instanceof Error ? error.message : "Forbidden." }, { status: 403 }),
        req,
        METHODS
      );
    }
    const contentType = req.headers.get("content-type") ?? "";

    if (contentType.includes("multipart/form-data")) {
      return withCors(NextResponse.json(await uploadFiles(req, subjectId)), req, METHODS);
    }

    const content: SubjectContent = await req.json();
    const previous = await readSubjectContent(subjectId);
    await writeSubjectContent(subjectId, { ...content, subjectId });

    // A deleted file lesson takes its stored attachment with it, instead of
    // leaving the bytes orphaned in subject_files.
    try {
      await deleteSubjectFiles(subjectId, removedFileIds(previous, content));
    } catch (error) {
      console.warn("Could not delete removed subject files.", error);
    }
    return withCors(NextResponse.json({ success: true }), req, METHODS);
  } catch (error) {
    return withCors(
      NextResponse.json(
        { message: error instanceof Error ? error.message : "Subject content could not be saved" },
        { status: 400 }
      ),
      req,
      METHODS
    );
  }
}
