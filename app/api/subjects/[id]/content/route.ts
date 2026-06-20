import { NextRequest, NextResponse } from "next/server";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import type { SubjectContent, SubjectLesson, SubjectTopic } from "@/lib/types";

const dataDir = path.join(process.cwd(), "public/data/subjects");

type RouteContext = {
  params: Promise<{ id: string }>;
};

async function safeSubjectId(context: RouteContext) {
  const { id } = await context.params;
  const safeId = id.replace(/[^a-zA-Z0-9_-]/g, "");

  if (!safeId) {
    throw new Error("Invalid subject id");
  }

  return safeId;
}

function subjectFilePath(subjectId: string) {
  return path.join(dataDir, `${subjectId}.json`);
}

function subjectFilesDir(subjectId: string) {
  return path.join(dataDir, subjectId, "files");
}

function publicSubjectFileUrl(subjectId: string, fileName: string) {
  return `/data/subjects/${subjectId}/files/${encodeURIComponent(fileName)}`;
}

function emptySubjectContent(subjectId: string): SubjectContent {
  return {
    subjectId,
    topics: [],
    lessons: [],
    assignments: []
  };
}

async function readSubjectContent(subjectId: string) {
  try {
    const file = await readFile(subjectFilePath(subjectId), "utf-8");
    return JSON.parse(file) as SubjectContent;
  } catch {
    return emptySubjectContent(subjectId);
  }
}

async function writeSubjectContent(subjectId: string, content: SubjectContent) {
  await mkdir(dataDir, { recursive: true });
  await writeFile(subjectFilePath(subjectId), `${JSON.stringify(content, null, 2)}\n`, "utf-8");
}

function safeFileName(fileName: string, index: number) {
  const parsed = path.parse(fileName);
  const baseName = (parsed.name || `lesson-file-${index + 1}`)
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || `lesson-file-${index + 1}`;
  const extension = parsed.ext.replace(/[^a-zA-Z0-9.]/g, "").slice(0, 16);

  return `${Date.now()}-${index + 1}-${baseName}${extension}`;
}

function lessonTitleFromFile(fileName: string) {
  const title = path.parse(fileName).name.replace(/[-_]+/g, " ").trim();
  return title || fileName;
}

function fileTopic(content: SubjectContent): { topics: SubjectTopic[]; topicId: string } {
  const existingTopic = content.topics.find((topic) => topic.id === "T-FILES");

  if (existingTopic) {
    return { topics: content.topics, topicId: existingTopic.id };
  }

  return {
    topics: [
      ...content.topics,
      {
        id: "T-FILES",
        title: "Uploaded lesson files",
        description: "Word, PowerPoint, PDF, video, and other prepared lesson materials"
      }
    ],
    topicId: "T-FILES"
  };
}

function stringFormValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function uploadTopic(content: SubjectContent, requestedTopicId: string): { topics: SubjectTopic[]; topicId: string } {
  if (!requestedTopicId) return fileTopic(content);

  const existingTopic = content.topics.find((topic) => topic.id === requestedTopicId);
  if (existingTopic) return { topics: content.topics, topicId: existingTopic.id };

  return {
    topics: [
      ...content.topics,
      {
        id: requestedTopicId,
        title: "General topic"
      }
    ],
    topicId: requestedTopicId
  };
}

async function uploadFiles(req: NextRequest, subjectId: string) {
  const formData = await req.formData();
  const files = formData
    .getAll("files")
    .filter((value): value is File => value instanceof File && value.size > 0);
  const requestedTitle = stringFormValue(formData, "title");
  const requestedTopicId = stringFormValue(formData, "topicId");
  const requestedDuration = stringFormValue(formData, "duration");

  if (files.length === 0) {
    throw new Error("No files were uploaded");
  }

  const content = await readSubjectContent(subjectId);
  const { topics, topicId } = uploadTopic(content, requestedTopicId);
  const filesDir = subjectFilesDir(subjectId);

  await mkdir(filesDir, { recursive: true });

  const uploadedLessons: SubjectLesson[] = [];

  for (const [index, file] of files.entries()) {
    const storedFileName = safeFileName(file.name, index);
    const buffer = Buffer.from(await file.arrayBuffer());

    await writeFile(path.join(filesDir, storedFileName), buffer);

    uploadedLessons.push({
      id: `L-FILE-${Date.now()}-${index + 1}`,
      title: requestedTitle && files.length === 1 ? requestedTitle : lessonTitleFromFile(file.name),
      topicId,
      duration: requestedDuration || undefined,
      fileName: file.name,
      fileUrl: publicSubjectFileUrl(subjectId, storedFileName),
      fileType: file.type || path.extname(file.name).replace(".", "").toUpperCase(),
      fileSize: file.size,
      uploadedAt: new Date().toISOString()
    });
  }

  const nextContent = {
    ...content,
    subjectId,
    topics,
    lessons: [...content.lessons, ...uploadedLessons]
  };

  await writeSubjectContent(subjectId, nextContent);

  return nextContent;
}

export async function GET(_: NextRequest, context: RouteContext) {
  try {
    const subjectId = await safeSubjectId(context);
    const content = await readSubjectContent(subjectId);

    return NextResponse.json(content.lessons.length || content.topics.length || content.assignments.length ? content : null);
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
