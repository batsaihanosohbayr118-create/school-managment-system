import { NextResponse } from "next/server";
import { authenticate } from "@/lib/auth-db";
import { issueToken } from "@/lib/auth-token";
import { preflight, withCors } from "@/lib/cors";
import { RegistrationError, registerAccount, registrationOptions } from "@/lib/school-db";
import type { RegistrationInput, RegistrationOptions, RegistrationResponse } from "@shared/registration";

export const runtime = "nodejs";

const METHODS = ["GET", "POST"];

// Called cross-origin by the mobile app, same as /api/auth/login.
export const OPTIONS = preflight(METHODS);

function asStringList(value: unknown): string[] | undefined {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : undefined;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/** The subject pick lists for the registration form. Public: subject names only. */
export async function GET(request: Request) {
  try {
    const options: RegistrationOptions = await registrationOptions();
    return withCors(NextResponse.json(options), request, METHODS);
  } catch (error) {
    return withCors(
      NextResponse.json({ message: error instanceof Error ? error.message : "Request failed." }, { status: 500 }),
      request,
      METHODS
    );
  }
}

/**
 * Self-registration. Students and parents are signed straight in (the same
 * token /api/auth/login issues); a teacher gets "pending-approval" and no
 * token. All rules live in registerAccount.
 */
export async function POST(request: Request) {
  const body = ((await request.json().catch(() => null)) ?? {}) as Record<string, unknown>;
  const input = {
    role: body.role,
    name: asString(body.name),
    email: asString(body.email),
    password: asString(body.password),
    phone: asString(body.phone),
    subjects: asStringList(body.subjects),
    subject: asString(body.subject),
    childEmail: asString(body.childEmail),
    childPassword: asString(body.childPassword)
  } as RegistrationInput;

  try {
    const status = await registerAccount(input);
    if (status === "pending-approval") {
      return withCors(NextResponse.json({ status } satisfies RegistrationResponse, { status: 201 }), request, METHODS);
    }

    const account = await authenticate(input.email, input.password);
    if (!account) throw new Error("Sign-in after registration failed.");

    const token = issueToken({
      sub: account.id,
      email: account.email,
      name: account.name,
      role: account.role,
      avatarUrl: account.avatarUrl,
      phone: account.phone
    });
    return withCors(NextResponse.json({ status, token } satisfies RegistrationResponse, { status: 201 }), request, METHODS);
  } catch (error) {
    if (error instanceof RegistrationError) {
      return withCors(
        NextResponse.json({ message: error.code }, { status: error.code === "email-taken" ? 409 : 400 }),
        request,
        METHODS
      );
    }
    return withCors(
      NextResponse.json({ message: error instanceof Error ? error.message : "Registration failed." }, { status: 500 }),
      request,
      METHODS
    );
  }
}
