import { NextResponse } from "next/server";
import { issueFileSignature } from "@/lib/auth-token";
import { resolveRequestSession } from "@/lib/school-session-server";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ fileId: string }>;
};

/**
 * Hands an authenticated caller a few-minute link to one attachment, for
 * opening in a browser that cannot carry the Authorization header. Grants
 * exactly what the file route already grants any signed-in user.
 */
export async function GET(request: Request, context: RouteContext) {
  const session = await resolveRequestSession(request);
  if (!session) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const { fileId } = await context.params;
  const { exp, sig } = issueFileSignature(fileId);
  const path = `/api/subjects/files/${encodeURIComponent(fileId)}?exp=${exp}&sig=${encodeURIComponent(sig)}`;

  return NextResponse.json({ path, expiresAt: exp });
}
