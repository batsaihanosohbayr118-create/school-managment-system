import { AccountConflictError, accountEmailTaken, approveAccount, authenticate, createAccount, findAccountById } from "@/lib/auth-db";
import { validateRegistration, type RegistrationErrorCode, type RegistrationInput, type RegistrationOptions } from "@shared/registration";
import type { SchoolSession } from "@/lib/school-session";
import { type SchoolRequestContext, normalizedToken, rawRowValues, stringValue } from "./base";
import { fetchRawTable } from "./local-store";
import { createResource, listResource } from "./resources";

/**
 * Self-registration acts with admin rights, but only through the fixed values
 * built in registerAccount — never with anything a client could steer into
 * another resource or another person's record.
 */
const REGISTRATION_SESSION: SchoolSession = { role: "admin", email: "registration@system", name: "Registration", avatarUrl: "", source: "neon" };

export class RegistrationError extends Error {
  constructor(public code: RegistrationErrorCode) {
    super(code);
  }
}

/** Subject names from the subjects table, with whether each already has a teacher. */
export async function registrationOptions(): Promise<RegistrationOptions> {
  const table = await listResource("subjects", { session: REGISTRATION_SESSION });
  const name = table.columns.indexOf("Name");
  const teacher = table.columns.indexOf("Teacher");
  const subjects = table.rows
    .map((row) => ({ name: stringValue(row[name]).trim(), hasTeacher: stringValue(row[teacher]).trim() !== "" }))
    .filter((subject) => subject.name)
    .sort((a, b) => a.name.localeCompare(b.name));
  return { subjects };
}

/** Any account or school record (student, teacher, parent) already using this email. */
async function emailInUse(email: string) {
  if (await accountEmailTaken(email)) return true;
  const target = normalizedToken(email);
  for (const resource of ["students", "teachers", "parents"] as const) {
    const rows = await fetchRawTable(resource);
    // Email is the second column of all three.
    if (rows.some((row) => normalizedToken(rawRowValues(resource, row)[1]) === target)) return true;
  }
  return false;
}

/** The subject by name (case-insensitive), or the reason it cannot be taught by a new teacher. */
async function openSubjectFor(subjectName: string) {
  const { subjects } = await registrationOptions();
  const subject = subjects.find((entry) => normalizedToken(entry.name) === normalizedToken(subjectName));
  if (!subject) throw new RegistrationError("subject-not-found");
  if (subject.hasTeacher) throw new RegistrationError("subject-taken");
  return subject.name;
}

/**
 * Creates an account for someone signing themselves up.
 *
 *  - student — the student record and login, through createResource exactly as
 *    the admin form does. Only the subjects they pick that actually exist are kept.
 *  - parent  — only after the child's own email and password check out, which
 *    is what stops anyone who merely knows a child's email from linking to them.
 *  - teacher — a login only, marked unapproved, so it cannot sign in. The
 *    teacher record that grants access to a subject is made on approval
 *    (approveTeacher), by an admin.
 *
 * Returns "signed-in" when the caller may sign in now, "pending-approval" for a teacher.
 */
export async function registerAccount(input: RegistrationInput): Promise<"signed-in" | "pending-approval"> {
  const problem = validateRegistration(input);
  if (problem) throw new RegistrationError(problem);

  const name = input.name.trim();
  const email = input.email.trim();
  const phone = input.phone?.trim() ?? "";
  if (await emailInUse(email)) throw new RegistrationError("email-taken");

  const context: SchoolRequestContext = { session: REGISTRATION_SESSION };

  if (input.role === "student") {
    const { subjects } = await registrationOptions();
    const known = new Map(subjects.map((subject) => [normalizedToken(subject.name), subject.name]));
    const picked = (input.subjects ?? []).map((subject) => known.get(normalizedToken(subject))).filter((subject): subject is string => Boolean(subject));
    await createResource("students", { Name: name, Email: email, Password: input.password, Phone: phone, Subjects: [...new Set(picked)].join(", ") }, context);
    return "signed-in";
  }

  if (input.role === "parent") {
    const child = await authenticate(input.childEmail ?? "", input.childPassword ?? "");
    if (!child || child.role !== "student") throw new RegistrationError("child-credentials-invalid");

    const student = (await fetchRawTable("students")).find((row) => normalizedToken(rawRowValues("students", row)[1]) === normalizedToken(child.email));
    if (!student) throw new RegistrationError("child-credentials-invalid");
    // "Parent Email", the seventh students column.
    if (stringValue(rawRowValues("students", student)[6]).trim()) throw new RegistrationError("child-has-parent");

    await createResource("parents", { Name: name, Email: email, Password: input.password, Phone: phone, Student: child.email }, context);
    return "signed-in";
  }

  const subject = await openSubjectFor(input.subject ?? "");
  try {
    await createAccount({ email, password: input.password, name, role: "teacher", phone, subject, approved: false });
  } catch (error) {
    if (error instanceof AccountConflictError) throw new RegistrationError("email-taken");
    throw error;
  }
  return "pending-approval";
}

/**
 * Lets a self-registered teacher in: creates their teacher record for the
 * subject they asked for (through createResource, so the one-teacher-per-
 * subject rule still holds), then marks the login approved. Returns null
 * when there is nothing to approve.
 */
export async function approveTeacher(accountId: string, context: SchoolRequestContext) {
  if (context.session.role !== "admin") throw new Error("You do not have permission to approve accounts.");

  // Null: nothing to approve (gone, not a teacher, or approved already).
  const account = await findAccountById(accountId);
  if (!account || account.role !== "teacher" || account.approved) return null;

  const subject = await openSubjectFor(account.subject);
  await createResource("teachers", { Name: account.name, Email: account.email, Subject: subject, Contact: account.phone }, context);
  return approveAccount(accountId);
}
