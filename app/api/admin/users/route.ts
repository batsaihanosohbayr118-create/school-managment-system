import { NextResponse } from "next/server";
import {
  AccountConflictError,
  countAdmins,
  createAccount,
  deleteAccount,
  findAccountById,
  isRole,
  listAccounts,
  studentExists,
  updateAccount
} from "@/lib/auth-db";
import { verifyToken, type TokenPayload } from "@/lib/auth-token";
import type { Role } from "@/lib/types";
import { preflight, withCors } from "@/lib/cors";

export const runtime = "nodejs";

const METHODS = ["GET", "POST", "PATCH", "DELETE"];

export const OPTIONS = preflight(METHODS);

/**
 * Role-specific requirements when provisioning an account:
 *
 *  - teacher — must name the subject they teach. Free text on purpose: a school
 *    may hire for a subject before it exists in the catalogue, so this is NOT
 *    checked against the database.
 *  - parent  — must be linked to a student, and that student MUST already exist
 *    in the students table. A guardian for nobody is always a mistake.
 *
 * Returns an error code, or null when the link is acceptable.
 */
async function checkRoleLink(
  role: Role,
  subject: string | undefined,
  studentEmail: string | undefined
): Promise<string | null> {
  if (role === "teacher") {
    return subject?.trim() ? null : "subject-required";
  }

  if (role === "parent") {
    const email = studentEmail?.trim();
    if (!email) return "student-required";
    return (await studentExists(email)) ? null : "student-not-found";
  }

  return null;
}

/**
 * Admin-only account management, backed by Neon.
 *
 * Every request must carry the caller's signed token, and the caller's role
 * must be "admin" — no non-admin can list, create, edit or delete accounts.
 */

type Guarded = { caller: TokenPayload } | { response: NextResponse };

function requireAdmin(request: Request): Guarded {
  const header = request.headers.get("authorization") ?? "";
  if (!header.toLowerCase().startsWith("bearer ")) {
    return { response: NextResponse.json({ message: "Missing authorization token." }, { status: 401 }) };
  }

  const caller = verifyToken(header.slice(7).trim());
  if (!caller) {
    return { response: NextResponse.json({ message: "Invalid session." }, { status: 401 }) };
  }
  if (caller.role !== "admin") {
    return { response: NextResponse.json({ message: "Admin access required." }, { status: 403 }) };
  }

  return { caller };
}

function fail(error: unknown) {
  if (error instanceof AccountConflictError) {
    return NextResponse.json({ message: error.message }, { status: 409 });
  }
  return NextResponse.json(
    { message: error instanceof Error ? error.message : "Request failed." },
    { status: 500 }
  );
}

export async function GET(request: Request) {
  const guard = requireAdmin(request);
  if ("response" in guard) return guard.response;

  try {
    return NextResponse.json({ users: await listAccounts() });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  const guard = requireAdmin(request);
  if ("response" in guard) return guard.response;

  const body = (await request.json().catch(() => null)) as {
    email?: string;
    password?: string;
    name?: string;
    username?: string;
    role?: string;
    subject?: string;
    studentEmail?: string;
  } | null;

  if (!body?.email || !body.password || !isRole(body.role)) {
    return withCors(
      NextResponse.json({ message: "email, password, and a valid role are required." }, { status: 400 }),
      request,
      METHODS
    );
  }

  try {
    const linkError = await checkRoleLink(body.role, body.subject, body.studentEmail);
    if (linkError) {
      return NextResponse.json({ message: linkError }, { status: 400 });
    }

    const user = await createAccount({
      email: body.email,
      password: body.password,
      name: body.name,
      username: body.username,
      role: body.role,
      subject: body.subject,
      studentEmail: body.studentEmail
    });
    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    return fail(error);
  }
}

export async function PATCH(request: Request) {
  const guard = requireAdmin(request);
  if ("response" in guard) return guard.response;

  const body = (await request.json().catch(() => null)) as {
    id?: string;
    email?: string;
    password?: string;
    name?: string;
    username?: string;
    role?: string;
    subject?: string;
    studentEmail?: string;
  } | null;

  if (!body?.id) {
    return withCors(NextResponse.json({ message: "id is required." }, { status: 400 }), request, METHODS);
  }

  // Demoting the last admin would leave nobody able to manage accounts.
  if (isRole(body.role) && body.role !== "admin" && (await countAdmins(body.id)) === 0) {
    return NextResponse.json({ message: "last-admin" }, { status: 409 });
  }

  try {
    // A password-only reset carries no role fields; skip the link check so it
    // does not trip over values the caller never sent.
    const touchesRoleFields =
      isRole(body.role) || typeof body.subject === "string" || typeof body.studentEmail === "string";

    if (touchesRoleFields) {
      const existing = await findAccountById(body.id);
      if (!existing) return NextResponse.json({ message: "Account not found." }, { status: 404 });

      const nextRole = isRole(body.role) ? body.role : existing.role;
      const linkError = await checkRoleLink(
        nextRole,
        body.subject ?? existing.subject,
        body.studentEmail ?? existing.studentEmail
      );
      if (linkError) {
        return NextResponse.json({ message: linkError }, { status: 400 });
      }
    }

    const user = await updateAccount(body.id, {
      email: body.email,
      password: body.password,
      name: body.name,
      username: body.username,
      role: isRole(body.role) ? body.role : undefined,
      subject: body.subject,
      studentEmail: body.studentEmail
    });

    if (!user) return NextResponse.json({ message: "Account not found." }, { status: 404 });
    return NextResponse.json({ user });
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(request: Request) {
  const guard = requireAdmin(request);
  if ("response" in guard) return guard.response;

  const id = new URL(request.url).searchParams.get("id");
  if (!id) {
    return withCors(NextResponse.json({ message: "id is required." }, { status: 400 }), request, METHODS);
  }
  if (id === guard.caller.sub) {
    return NextResponse.json({ message: "cannot-delete-self" }, { status: 409 });
  }
  if ((await countAdmins(id)) === 0) {
    return NextResponse.json({ message: "last-admin" }, { status: 409 });
  }

  try {
    const removed = await deleteAccount(id);
    if (!removed) return NextResponse.json({ message: "Account not found." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return fail(error);
  }
}
