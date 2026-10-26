import type { SubjectContent, SubjectLesson, SubjectTopic } from "@/lib/types";

const FILE_URL = /^\/api\/subjects\/files\/([^/?#]+)/;

/** Ids of the stored attachments a subject's content points at. */
export function referencedFileIds(content: Pick<SubjectContent, "lessons"> | null | undefined): Set<string> {
  const ids = new Set<string>();
  for (const lesson of content?.lessons ?? []) {
    const match = lesson.fileUrl?.match(FILE_URL);
    if (match) ids.add(decodeURIComponent(match[1]));
  }
  return ids;
}

/**
 * Attachments a save dropped: referenced before, not after. Only these are
 * deleted — never "everything unreferenced", which would also catch a file an
 * upload has stored but not yet linked into the content.
 */
export function removedFileIds(before: Pick<SubjectContent, "lessons"> | null | undefined, after: Pick<SubjectContent, "lessons">): string[] {
  const kept = referencedFileIds(after);
  return [...referencedFileIds(before)].filter((id) => !kept.has(id));
}

function splitFileName(fileName: string) {
  const dot = fileName.lastIndexOf(".");
  return dot > 0 ? { name: fileName.slice(0, dot), ext: fileName.slice(dot) } : { name: fileName, ext: "" };
}

/** A storage-safe rendering of an uploaded file's name, keeping its extension. */
export function safeStoredName(fileName: string) {
  const { name, ext } = splitFileName(fileName);
  const base = name.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "file";
  return `${base}${ext.replace(/[^a-zA-Z0-9.]/g, "").slice(0, 16)}`;
}

/**
 * Where a subject's uploaded object lives in the Storage bucket. Derived, not
 * remembered: the upload and the later "it's uploaded" call both rebuild it
 * from the same inputs, so a caller cannot point a file row at another
 * subject's object.
 */
export function storageObjectPath(subjectId: string, fileId: string, fileName: string) {
  return `${subjectId}/${fileId}-${safeStoredName(fileName)}`;
}

export const STORED_FILE_ID = /^F-[a-z0-9]{6,24}$/;

export function lessonTitleFromFile(fileName: string) {
  return splitFileName(fileName).name.replace(/[-_]+/g, " ").trim() || fileName;
}

function uploadTopic(content: SubjectContent, requestedTopicId: string): { topics: SubjectTopic[]; topicId: string } {
  if (!requestedTopicId) {
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
  const existing = content.topics.find((t) => t.id === requestedTopicId);
  if (existing) return { topics: content.topics, topicId: existing.id };
  return {
    topics: [...content.topics, { id: requestedTopicId, title: "General topic" }],
    topicId: requestedTopicId,
  };
}

export type UploadedLessonFile = { fileName: string; url: string; contentType: string; byteSize: number };

/**
 * Adds one lesson per uploaded file. A title only applies to a single-file
 * upload; with several, each lesson is named after its file.
 */
export function appendFileLessons(
  content: SubjectContent,
  files: UploadedLessonFile[],
  options: { title?: string; topicId?: string; duration?: string } = {},
  now = new Date()
): SubjectContent {
  const { topics, topicId } = uploadTopic(content, options.topicId ?? "");
  const lessons: SubjectLesson[] = files.map((file, index) => ({
    id: `L-FILE-${now.getTime()}-${index + 1}`,
    title: options.title && files.length === 1 ? options.title : lessonTitleFromFile(file.fileName),
    topicId,
    duration: options.duration || undefined,
    fileName: file.fileName,
    fileUrl: file.url,
    fileType: file.contentType || splitFileName(file.fileName).ext.replace(".", "").toUpperCase(),
    fileSize: file.byteSize,
    uploadedAt: now.toISOString(),
  }));

  return { ...content, topics, lessons: [...content.lessons, ...lessons] };
}
