import { NextRequest, NextResponse } from "next/server";
import path from "path";
import type { SubjectContent, SubjectLesson, SubjectTopic } from "@/lib/types";
import { resolveRequestSession } from "@/lib/school-session-server";
import { preflight, withCors } from "@/lib/cors";
import {
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

function safeFileName(fileName: string, index: number) {
  const parsed = path.parse(fileName);
  const baseName = (parsed.name || `file-${index + 1}`)
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .slice(0, 80);
  const ext = parsed.ext.replace(/[^a-zA-Z0-9.]/g, "").slice(0, 16);
  return `${Date.now()}-${index + 1}-${baseName}${ext}`;
}

function lessonTitleFromFile(fileName: string) {
  return path.parse(fileName).name.replace(/[-_]+/g, " ").trim() || fileName;
}

function fileTopic(content: SubjectContent): { topics: SubjectTopic[]; topicId: string } {
  const existing = content.topics.find((t) => t.id === "T-FILES");
  if (existing) return { topics: content.topics, topicId: existing.id };
  return {
    topics: [
      ...content.topics,
      {
        id: "T-FILES",
        title: "Uploaded lesson files",
        description: "Word, PowerPoint, PDF, video, and other prepared lesson materials",
      },
    ],
    topicId: "T-FILES",
  };
}

function uploadTopic(content: SubjectContent, requestedTopicId: string) {
  if (!requestedTopicId) return fileTopic(content);
  const existing = content.topics.find((t) => t.id === requestedTopicId);
  if (existing) return { topics: content.topics, topicId: existing.id };
  return {
    topics: [...content.topics, { id: requestedTopicId, title: "General topic" }],
    topicId: requestedTopicId,
  };
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
  const requestedTitle = stringFormValue(formData, "title");
  const requestedTopicId = stringFormValue(formData, "topicId");
  const requestedDuration = stringFormValue(formData, "duration");

  if (files.length === 0) throw new Error("No files were uploaded");

  const content = await readSubjectContent(subjectId);
  const { topics, topicId } = uploadTopic(content, requestedTopicId);
  const uploadedLessons: SubjectLesson[] = [];

  for (const [index, file] of files.entries()) {
    const stored = await storeSubjectFile({
      subjectId,
      fileName: safeFileName(file.name, index),
      contentType: file.type,
      data: Buffer.from(await file.arrayBuffer())
    });

    uploadedLessons.push({
      id: `L-FILE-${Date.now()}-${index + 1}`,
      title: requestedTitle && files.length === 1 ? requestedTitle : lessonTitleFromFile(file.name),
      topicId,
      duration: requestedDuration || undefined,
      fileName: file.name,
      fileUrl: stored.url,
      fileType: file.type || path.extname(file.name).replace(".", "").toUpperCase(),
      fileSize: file.size,
      uploadedAt: new Date().toISOString(),
    });
  }

  const nextContent = {
    ...content,
    subjectId,
    topics,
    lessons: [...content.lessons, ...uploadedLessons],
  };

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
    const contentType = req.headers.get("content-type") ?? "";

    if (contentType.includes("multipart/form-data")) {
      return withCors(NextResponse.json(await uploadFiles(req, subjectId)), req, METHODS);
    }

    const content: SubjectContent = await req.json();
    await writeSubjectContent(subjectId, { ...content, subjectId });
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
