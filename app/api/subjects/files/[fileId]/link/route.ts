import { NextResponse } from "next/server";
import { issueFileSignature } from "@/lib/auth-token";
import { resolveRequestSession } from "@/lib/school-session-server";
import { subjectFileStoragePath } from "@/lib/subject-storage";
import { createSignedDownloadUrl } from "@/lib/subject-object-storage";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ fileId: string }>;
};

/**
 * Hands an authenticated caller a few-minute link to one attachment, for
 * opening in a browser that cannot carry the Authorization header. Grants
 * exactly what the file route already grants any signed-in user.
 *
 * `url` is what to load directly: for a file in Storage, the signed Storage
 * URL itself (a <video> keeps re-requesting ranges, which would outlive the
 * five-minute `path`). `path` stays as it was for the mobile app.
 */
export async function GET(request: Request, context: RouteContext) {
  const session = await resolveRequestSession(request);
  if (!session) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const { fileId } = await context.params;
  const { exp, sig } = issueFileSignature(fileId);
  const path = `/api/subjects/files/${encodeURIComponent(fileId)}?exp=${exp}&sig=${encodeURIComponent(sig)}`;

  const storagePath = await subjectFileStoragePath(fileId).catch(() => null);
  const url = storagePath ? await createSignedDownloadUrl(storagePath) : path;

  return NextResponse.json({ path, url, expiresAt: exp });
}
