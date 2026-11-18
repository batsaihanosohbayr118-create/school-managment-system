import { NextRequest, NextResponse } from "next/server";
import { resolveRequestSession } from "@/lib/school-session-server";
import { requireSubjectContentAccess } from "@/lib/school-db";
import { STORED_FILE_ID, appendFileLessons, storageObjectPath } from "@/lib/subject-files";
import { readSubjectContent, recordStoredObject, writeSubjectContent } from "@/lib/subject-storage";
import { MAX_OBJECT_BYTES, objectInfo, removeObjects } from "@/lib/subject-object-storage";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string; fileId: string }>;
};

type CompleteBody = {
  fileName?: unknown;
  lesson?: { title?: unknown; topicId?: unknown; duration?: unknown } | null;
};

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Step two of a direct upload: the browser has PUT the file into Storage, so
 * record it as /api/subjects/files/<fileId>. With `lesson`, it also becomes a
 * lesson in the subject's content (what the multipart upload used to do);
 * without, only the file is stored, for a material row to point at.
 *
 * Size and type come from Storage, not from the request.
 */
export async function POST(req: NextRequest, context: RouteContext) {
  const session = await resolveRequestSession(req);
  if (!session) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const { id, fileId } = await context.params;
  const subjectId = id.replace(/[^a-zA-Z0-9_-]/g, "");
  if (!subjectId || !STORED_FILE_ID.test(fileId)) {
    return NextResponse.json({ message: "Invalid upload" }, { status: 400 });
  }

  try {
    await requireSubjectContentAccess({ session }, subjectId);
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Forbidden." }, { status: 403 });
  }

  try {
    const body = (await req.json().catch(() => ({}))) as CompleteBody;
    const fileName = text(body.fileName);
    if (!fileName) {
      return NextResponse.json({ message: "Invalid upload" }, { status: 400 });
    }

    const storagePath = storageObjectPath(subjectId, fileId, fileName);
    const info = await objectInfo(storagePath);
    if (!info) {
      return NextResponse.json({ message: "The file has not been uploaded." }, { status: 400 });
    }
    if (info.byteSize > MAX_OBJECT_BYTES) {
      await removeObjects([storagePath]);
      return NextResponse.json({ message: "File is too large." }, { status: 413 });
    }

    const stored = await recordStoredObject({
      id: fileId,
      subjectId,
      fileName,
      contentType: info.contentType,
      byteSize: info.byteSize,
      storagePath
    });

    const ext = fileName.includes(".") ? fileName.slice(fileName.lastIndexOf(".") + 1).toUpperCase() : "";
    const file = { url: stored.url, fileName, fileType: ext || info.contentType || "FILE" };

    if (!body.lesson) {
      return NextResponse.json({ file });
    }

    const content = await readSubjectContent(subjectId);
    const nextContent = appendFileLessons(
      { ...content, subjectId },
      [{ fileName, url: stored.url, contentType: info.contentType, byteSize: info.byteSize }],
      { title: text(body.lesson.title), topicId: text(body.lesson.topicId), duration: text(body.lesson.duration) }
    );
    await writeSubjectContent(subjectId, nextContent);

    return NextResponse.json({ file, content: nextContent });
  } catch (error) {
    console.error("Could not finish a subject file upload.", error);
    return NextResponse.json({ message: "File upload could not be finished." }, { status: 500 });
  }
}
