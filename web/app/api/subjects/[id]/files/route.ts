import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { resolveRequestSession } from "@/lib/school-session-server";
import { requireSubjectContentAccess } from "@/lib/school-db";
import { storeSubjectFile } from "@/lib/subject-storage";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * Stores one attachment for a learning material and returns where it lives.
 *
 * Unlike the content route's upload, this does not add a lesson to the
 * subject — the material row is what points at the file.
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

  try {
    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ message: "No file was uploaded" }, { status: 400 });
    }

    const parsed = path.parse(file.name);
    const baseName = (parsed.name || "file").replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 80);
    const ext = parsed.ext.replace(/[^a-zA-Z0-9.]/g, "").slice(0, 16);

    const stored = await storeSubjectFile({
      subjectId,
      fileName: `${Date.now()}-${baseName}${ext}`,
      contentType: file.type,
      data: Buffer.from(await file.arrayBuffer())
    });

    return NextResponse.json({
      url: stored.url,
      fileName: file.name,
      fileType: ext.replace(".", "").toUpperCase() || file.type || "FILE"
    });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "File could not be uploaded" },
      { status: 400 }
    );
  }
}
