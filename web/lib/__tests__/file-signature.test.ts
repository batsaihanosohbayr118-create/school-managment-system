import { beforeAll, describe, expect, it } from "vitest";
import { FILE_LINK_TTL_SECONDS, issueFileSignature, verifyFileSignature } from "@/lib/auth-token";

beforeAll(() => {
  process.env.AUTH_SECRET = "test-secret-that-is-at-least-32-chars-long";
});

describe("file signatures", () => {
  const now = Date.UTC(2026, 9, 7, 12, 0, 0);

  it("accepts a fresh signature for the same file", () => {
    const { exp, sig } = issueFileSignature("F-1", now);
    expect(verifyFileSignature("F-1", String(exp), sig, now)).toBe(true);
  });

  it("rejects the signature for a different file", () => {
    const { exp, sig } = issueFileSignature("F-1", now);
    expect(verifyFileSignature("F-2", String(exp), sig, now)).toBe(false);
  });

  it("rejects an expired link", () => {
    const { exp, sig } = issueFileSignature("F-1", now);
    expect(verifyFileSignature("F-1", String(exp), sig, now + (FILE_LINK_TTL_SECONDS + 1) * 1000)).toBe(false);
  });

  it("rejects a tampered expiry", () => {
    const { exp, sig } = issueFileSignature("F-1", now);
    expect(verifyFileSignature("F-1", String(exp + 3600), sig, now)).toBe(false);
  });

  it("rejects missing parameters", () => {
    expect(verifyFileSignature("F-1", null, null, now)).toBe(false);
  });
});
