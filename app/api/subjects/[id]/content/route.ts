import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import path from "path";
import type { SubjectContent, SubjectLesson, SubjectTopic } from "@/lib/types";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const BUCKET = "subjects";

type RouteContext = {
  params: Promise<{ id: string }>;
};

async function safeSubjectId(context: RouteContext) {
  const { id } = await context.params;
  const safeId = id.replace(/[^a-zA-Z0-9_-]/g, "");
  if (!safeId) throw new Error("Invalid subject id");
  return safeId;
}

function emptySubjectContent(subjectId: string): SubjectContent {
  return { subjectId, topics: [], lessons: [], assignments: [] };
}

async function readSubjectContent(subjectId: string) {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .download(`${subjectId}/content.json`);

  if (error || !data) return emptySubjectContent(subjectId);

  const text = await data.text();
  return JSON.parse(text) as SubjectContent;
}

async function writeSubjectContent(subjectId: string, content: SubjectContent) {
  const blob = new Blob([JSON.stringify(content, null, 2)], {
    type: "application/json",
  });

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(`${subjectId}/content.json`, blob, { upsert: true });

  if (error) throw new Error("Could not save content: " + error.message);
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
    const storedFileName = safeFileName(file.name, index);
    const filePath = `${subjectId}/files/${storedFileName}`;
    const buffer = await file.arrayBuffer();

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(filePath, buffer, { contentType: file.type, upsert: true });

    if (error) throw new Error("File upload failed: " + error.message);

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(filePath);

    uploadedLessons.push({
      id: `L-FILE-${Date.now()}-${index + 1}`,
      title: requestedTitle && files.length === 1 ? requestedTitle : lessonTitleFromFile(file.name),
      topicId,
      duration: requestedDuration || undefined,
      fileName: file.name,
      fileUrl: urlData.publicUrl,
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
    const subjectId = await safeSubjectId(context);
    const content = await readSubjectContent(subjectId);
    return NextResponse.json(
      content.lessons.length || content.topics.length || content.assignments.length
        ? content
        : null
    );
  } catch {
    return NextResponse.json(null);
  }
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const subjectId = await safeSubjectId(context);
    const contentType = req.headers.get("content-type") ?? "";

    if (contentType.includes("multipart/form-data")) {
      return NextResponse.json(await uploadFiles(req, subjectId));
    }

    const content: SubjectContent = await req.json();
    await writeSubjectContent(subjectId, { ...content, subjectId });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Subject content could not be saved" },
      { status: 400 }
    );
  }
}