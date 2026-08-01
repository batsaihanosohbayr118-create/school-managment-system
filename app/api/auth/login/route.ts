import { NextResponse } from "next/server";
import { authenticate } from "@/lib/auth-db";
import { issueToken } from "@/lib/auth-token";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    identifier?: string;
    password?: string;
  } | null;

  const identifier = body?.identifier?.trim() ?? "";
  const password = body?.password ?? "";

  if (!identifier || !password) {
    return NextResponse.json({ message: "Identifier and password are required." }, { status: 400 });
  }

  try {
    const account = await authenticate(identifier, password);

    // Same response for "no such user" and "wrong password" so the endpoint
    // cannot be used to discover which accounts exist.
    if (!account) {
      return NextResponse.json({ message: "invalid-credentials" }, { status: 401 });
    }

    const token = issueToken({
      sub: account.id,
      email: account.email,
      name: account.name,
      role: account.role,
      avatarUrl: account.avatarUrl
    });

    return NextResponse.json({ token, user: account });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Sign-in failed." },
      { status: 500 }
    );
  }
}
