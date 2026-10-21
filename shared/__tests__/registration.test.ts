import { describe, expect, it } from "vitest";
import { isRegistrationRole, isValidEmail, validateRegistration, type RegistrationInput } from "@shared/registration";

const student: RegistrationInput = { role: "student", name: "Bat", email: "bat@school.mn", password: "secret123" };

describe("isRegistrationRole", () => {
  it("never allows admin", () => {
    expect(isRegistrationRole("admin")).toBe(false);
    expect(isRegistrationRole("teacher")).toBe(true);
    expect(isRegistrationRole(undefined)).toBe(false);
  });
});

describe("isValidEmail", () => {
  it("needs a local part, a domain and a dot", () => {
    expect(isValidEmail("a@b.mn")).toBe(true);
    expect(isValidEmail("a@b")).toBe(false);
    expect(isValidEmail("a b@c.mn")).toBe(false);
  });
});

describe("validateRegistration", () => {
  it("accepts a complete student", () => {
    expect(validateRegistration(student)).toBeNull();
  });

  it("rejects admin even if a client sends it", () => {
    expect(validateRegistration({ ...student, role: "admin" as never })).toBe("invalid-role");
  });

  it("checks name, email and password length in that order", () => {
    expect(validateRegistration({ ...student, name: "  " })).toBe("name-required");
    expect(validateRegistration({ ...student, email: "nope" })).toBe("invalid-email");
    expect(validateRegistration({ ...student, password: "short" })).toBe("weak-password");
  });

  it("needs a subject for a teacher", () => {
    expect(validateRegistration({ ...student, role: "teacher" })).toBe("subject-required");
    expect(validateRegistration({ ...student, role: "teacher", subject: "Math" })).toBeNull();
  });

  it("needs the child's email and password for a parent", () => {
    expect(validateRegistration({ ...student, role: "parent", childEmail: "kid@school.mn" })).toBe("child-credentials-invalid");
    expect(validateRegistration({ ...student, role: "parent", childEmail: "kid@school.mn", childPassword: "x" })).toBeNull();
  });
});
