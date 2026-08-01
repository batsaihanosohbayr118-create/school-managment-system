import { NextResponse } from "next/server";
import { readSubjectFile } from "@/lib/subject-storage";
import { resolveRequestSession } from "@/lib/school-session-server";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ fileId: string }>;
};

/**
 * Serves a lesson attachment out of Neon.
 *
 * Unlike the public bucket URLs this replaced, every download is behind the
 * session check — attachments are no longer readable by anyone with the link.
 */
export async function GET(request: Request, context: RouteContext) {
  const session = await resolveRequestSession(request);
  if (!session) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const { fileId } = await context.params;

  try {
    const file = await readSubjectFile(fileId);
    if (!file) {
      return NextResponse.json({ message: "File not found." }, { status: 404 });
    }

    return new NextResponse(new Uint8Array(file.data), {
      headers: {
        "Content-Type": file.contentType,
        "Content-Length": String(file.byteSize),
        "Content-Disposition": `inline; filename="${encodeURIComponent(file.fileName)}"`,
        "Cache-Control": "private, max-age=3600"
      }
    });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Download failed." },
      { status: 500 }
    );
  }
}
