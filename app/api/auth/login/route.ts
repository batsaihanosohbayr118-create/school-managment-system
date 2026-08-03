import { NextResponse } from "next/server";
import { authenticate } from "@/lib/auth-db";
import { issueToken } from "@/lib/auth-token";
import { preflight, withCors } from "@/lib/cors";

export const runtime = "nodejs";

const METHODS = ["POST"];

// The mobile app's browser preview (and any Expo dev client) calls this
// cross-origin, same as /api/mobile/* — without this, the POST has no
// Content-Type-triggered preflight handler and the browser blocks it before
// the response body is ever read, which mobile/lib/auth.ts reports as
// "No connection." even though the request never actually failed.
export const OPTIONS = preflight(METHODS);

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    identifier?: string;
    password?: string;
  } | null;

  const identifier = body?.identifier?.trim() ?? "";
  const password = body?.password ?? "";

  if (!identifier || !password) {
    return withCors(
      NextResponse.json({ message: "Identifier and password are required." }, { status: 400 }),
      request,
      METHODS
    );
  }

  try {
    const account = await authenticate(identifier, password);

    // Same response for "no such user" and "wrong password" so the endpoint
    // cannot be used to discover which accounts exist.
    if (!account) {
      return withCors(NextResponse.json({ message: "invalid-credentials" }, { status: 401 }), request, METHODS);
    }

    const token = issueToken({
      sub: account.id,
      email: account.email,
      name: account.name,
      role: account.role,
      avatarUrl: account.avatarUrl
    });

    return withCors(NextResponse.json({ token, user: account }), request, METHODS);
  } catch (error) {
    return withCors(
      NextResponse.json(
        { message: error instanceof Error ? error.message : "Sign-in failed." },
        { status: 500 }
      ),
      request,
      METHODS
    );
  }
}
