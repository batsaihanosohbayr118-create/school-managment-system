import { describe, expect, it } from "vitest";
import { defaultRole, isRole, resolveRole, visibleTabsByRole } from "@shared/roles";

describe("isRole", () => {
  it("accepts the four known roles", () => {
    expect(isRole("admin")).toBe(true);
    expect(isRole("teacher")).toBe(true);
    expect(isRole("student")).toBe(true);
    expect(isRole("parent")).toBe(true);
  });

  it("rejects anything else", () => {
    expect(isRole("superadmin")).toBe(false);
    expect(isRole(undefined)).toBe(false);
    expect(isRole(null)).toBe(false);
  });
});

describe("resolveRole", () => {
  it("passes through a valid role", () => {
    expect(resolveRole("teacher")).toBe("teacher");
  });

  it("defaults to student for anything invalid, matching lib/auth-flow.ts", () => {
    expect(resolveRole("nonsense")).toBe(defaultRole);
    expect(resolveRole(undefined)).toBe("student");
  });
});

describe("visibleTabsByRole", () => {
  it("gives admin no tabs — mobile shows a web-redirect screen instead", () => {
    expect(visibleTabsByRole.admin).toEqual([]);
  });

  it("gives student and parent the same read-only tab set", () => {
    expect(visibleTabsByRole.student).toEqual(visibleTabsByRole.parent);
  });

  it("never puts payments in a tab list — it's reached from Home", () => {
    for (const tabs of Object.values(visibleTabsByRole)) {
      expect(tabs).not.toContain("payments");
    }
  });

  it("gives the teacher attendance and grades, which they can write to", () => {
    expect(visibleTabsByRole.teacher).toContain("attendance");
    expect(visibleTabsByRole.teacher).toContain("grades");
  });
});
