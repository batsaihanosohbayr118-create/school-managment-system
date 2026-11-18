import { NextRequest, NextResponse } from "next/server";
import { resolveRequestSession } from "@/lib/school-session-server";
import { requireSubjectContentAccess } from "@/lib/school-db";
import { storageObjectPath } from "@/lib/subject-files";
import { newSubjectFileId } from "@/lib/subject-storage";
import { MAX_OBJECT_BYTES, createSignedUploadUrl, isObjectStorageConfigured } from "@/lib/subject-object-storage";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * Step one of a direct upload: hands the subject's teacher (or an admin) a
 * signed URL to PUT one file into Storage. The bytes never pass through this
 * function, which is the point — Vercel would reject anything over 4.5MB.
 * Step two is POST ./uploads/<fileId>, once the PUT has finished.
 *
 * Answers 503 when Storage is not configured, which tells the client to fall
 * back to the multipart upload on the content route.
 */
export async function POST(req: NextRequest, context: RouteContext) {
  const session = await resolveRequestSession(req);
  if (!session) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const { id } = await context.params;
  const subjectId = id.replace(/[^a-zA-Z0-9_-]/g, "");
  if (!subjectId) {
    return NextResponse.json({ message: "Invalid subject id" }, { status: 400 });
  }

  try {
    await requireSubjectContentAccess({ session }, subjectId);
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Forbidden." }, { status: 403 });
  }

  if (!isObjectStorageConfigured()) {
    return NextResponse.json({ message: "File storage is not configured." }, { status: 503 });
  }

  try {
    const body = (await req.json().catch(() => ({}))) as { fileName?: unknown; size?: unknown };
    const fileName = typeof body.fileName === "string" ? body.fileName.trim() : "";
    const size = typeof body.size === "number" ? body.size : 0;

    if (!fileName || size <= 0) {
      return NextResponse.json({ message: "No file was uploaded" }, { status: 400 });
    }
    if (size > MAX_OBJECT_BYTES) {
      return NextResponse.json(
        { message: `File is larger than the ${MAX_OBJECT_BYTES / 1024 / 1024}MB limit.`, maxBytes: MAX_OBJECT_BYTES },
        { status: 413 }
      );
    }

    const fileId = newSubjectFileId();
    const uploadUrl = await createSignedUploadUrl(storageObjectPath(subjectId, fileId, fileName));
    return NextResponse.json({ fileId, uploadUrl, maxBytes: MAX_OBJECT_BYTES });
  } catch (error) {
    console.error("Could not start a subject file upload.", error);
    return NextResponse.json({ message: "File upload could not be started." }, { status: 500 });
  }
}
