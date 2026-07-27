import { describe, expect, it } from "vitest";
import { isRole } from "@/lib/auth-flow";

describe("test harness", () => {
  it("resolves the @ alias", () => {
    expect(isRole("teacher")).toBe(true);
    expect(isRole("principal")).toBe(false);
  });
});
