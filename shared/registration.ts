/**
 * Self-registration rules, shared by the web form, the mobile form and the
 * server (lib/school-db.ts registerAccount), so all three agree on what is
 * acceptable. The server re-checks everything; the forms only check early.
 */

/** Admin is never self-registered — admins are made by other admins. */
export const REGISTRATION_ROLES = ["student", "parent", "teacher"] as const;
export type RegistrationRole = (typeof REGISTRATION_ROLES)[number];

/** Same minimum as the admin "Add User" form. */
export const MIN_PASSWORD_LENGTH = 8;

export type RegistrationInput = {
  role: RegistrationRole;
  name: string;
  email: string;
  password: string;
  phone?: string;
  /** Student: the subjects they take. Empty means the school's default set. */
  subjects?: string[];
  /** Teacher: the one subject they teach. */
  subject?: string;
  /** Parent: their child's sign-in, which proves they may see the child's data. */
  childEmail?: string;
  childPassword?: string;
};

/** Error codes the server returns and both forms translate. */
export type RegistrationErrorCode =
  | "invalid-role"
  | "name-required"
  | "invalid-email"
  | "weak-password"
  | "email-taken"
  | "subject-required"
  | "subject-not-found"
  | "subject-taken"
  | "child-credentials-invalid"
  | "child-has-parent";

export type RegistrationResponse =
  | { status: "signed-in"; token: string }
  /** A teacher: created, but cannot sign in until an admin approves. */
  | { status: "pending-approval" };

/** The registration form's pick lists. `hasTeacher` subjects cannot be chosen by a teacher. */
export type RegistrationOptions = { subjects: { name: string; hasTeacher: boolean }[] };

export function isRegistrationRole(value: unknown): value is RegistrationRole {
  return typeof value === "string" && (REGISTRATION_ROLES as readonly string[]).includes(value);
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

/**
 * The checks that need no database: returns the first problem, or null.
 * Whether an email or subject is taken is left to the server.
 */
export function validateRegistration(input: RegistrationInput): RegistrationErrorCode | null {
  if (!isRegistrationRole(input.role)) return "invalid-role";
  if (!input.name.trim()) return "name-required";
  if (!isValidEmail(input.email)) return "invalid-email";
  if (input.password.length < MIN_PASSWORD_LENGTH) return "weak-password";
  if (input.role === "teacher" && !input.subject?.trim()) return "subject-required";
  if (input.role === "parent" && (!input.childEmail?.trim() || !input.childPassword)) return "child-credentials-invalid";
  return null;
}
