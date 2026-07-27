import { NextResponse } from "next/server";
import { AccountConflictError, authenticate, findAccountById, updateAccount } from "@/lib/auth-db";
import { issueToken, verifyToken } from "@/lib/auth-token";

export const runtime = "nodejs";

function callerFrom(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  if (!header.toLowerCase().startsWith("bearer ")) return null;
  return verifyToken(header.slice(7).trim());
}

/** Updates the signed-in user's own profile, or their password. */
export async function PATCH(request: Request) {
  const caller = callerFrom(request);
  if (!caller) {
    return NextResponse.json({ message: "Not signed in." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    name?: string;
    email?: string;
    avatarUrl?: string;
    currentPassword?: string;
    newPassword?: string;
  } | null;

  if (!body) {
    return NextResponse.json({ message: "Invalid request body." }, { status: 400 });
  }

  try {
    // Changing a password requires proving the current one, so a stolen token
    // alone cannot lock the real owner out.
    if (body.newPassword) {
      const existing = await findAccountById(caller.sub);
      if (!existing) return NextResponse.json({ message: "Account not found." }, { status: 404 });

      const confirmed = await authenticate(existing.email, body.currentPassword ?? "");
      if (!confirmed) {
        return NextResponse.json({ message: "current-password-invalid" }, { status: 403 });
      }
    }

    const account = await updateAccount(caller.sub, {
      name: body.name,
      email: body.email,
      avatarUrl: body.avatarUrl,
      password: body.newPassword
    });

    if (!account) return NextResponse.json({ message: "Account not found." }, { status: 404 });

    // The token carries name/email/avatar, so re-issue it after an edit.
    const token = issueToken({
      sub: account.id,
      email: account.email,
      name: account.name,
      role: account.role,
      avatarUrl: account.avatarUrl
    });

    return NextResponse.json({ token, user: account });
  } catch (error) {
    if (error instanceof AccountConflictError) {
      return NextResponse.json({ message: error.message }, { status: 409 });
    }
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Update failed." },
      { status: 500 }
    );
  }
}
