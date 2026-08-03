import { NextResponse } from "next/server";
import { AccountConflictError, authenticate, findAccountById, updateAccount } from "@/lib/auth-db";
import { issueToken, verifyToken } from "@/lib/auth-token";
import { preflight, withCors } from "@/lib/cors";

export const runtime = "nodejs";

const METHODS = ["PATCH"];

export const OPTIONS = preflight(METHODS);

function callerFrom(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  if (!header.toLowerCase().startsWith("bearer ")) return null;
  return verifyToken(header.slice(7).trim());
}

/** Updates the signed-in user's own profile, or their password. */
export async function PATCH(request: Request) {
  const caller = callerFrom(request);
  if (!caller) {
    return withCors(NextResponse.json({ message: "Not signed in." }, { status: 401 }), request, METHODS);
  }

  const body = (await request.json().catch(() => null)) as {
    name?: string;
    email?: string;
    avatarUrl?: string;
    currentPassword?: string;
    newPassword?: string;
  } | null;

  if (!body) {
    return withCors(NextResponse.json({ message: "Invalid request body." }, { status: 400 }), request, METHODS);
  }

  try {
    // Changing a password requires proving the current one, so a stolen token
    // alone cannot lock the real owner out.
    if (body.newPassword) {
      const existing = await findAccountById(caller.sub);
      if (!existing) {
        return withCors(NextResponse.json({ message: "Account not found." }, { status: 404 }), request, METHODS);
      }

      const confirmed = await authenticate(existing.email, body.currentPassword ?? "");
      if (!confirmed) {
        return withCors(
          NextResponse.json({ message: "current-password-invalid" }, { status: 403 }),
          request,
          METHODS
        );
      }
    }

    const account = await updateAccount(caller.sub, {
      name: body.name,
      email: body.email,
      avatarUrl: body.avatarUrl,
      password: body.newPassword
    });

    if (!account) {
      return withCors(NextResponse.json({ message: "Account not found." }, { status: 404 }), request, METHODS);
    }

    // The token carries name/email/avatar, so re-issue it after an edit.
    const token = issueToken({
      sub: account.id,
      email: account.email,
      name: account.name,
      role: account.role,
      avatarUrl: account.avatarUrl
    });

    return withCors(NextResponse.json({ token, user: account }), request, METHODS);
  } catch (error) {
    if (error instanceof AccountConflictError) {
      return withCors(NextResponse.json({ message: error.message }, { status: 409 }), request, METHODS);
    }
    return withCors(
      NextResponse.json(
        { message: error instanceof Error ? error.message : "Update failed." },
        { status: 500 }
      ),
      request,
      METHODS
    );
  }
}
