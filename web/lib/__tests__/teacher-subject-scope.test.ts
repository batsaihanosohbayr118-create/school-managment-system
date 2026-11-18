import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeAll, describe, expect, it, vi } from "vitest";

// Runs against the local-store fallback (no DATABASE_URL), in a throwaway temp dir
// that school-db is pointed at via LOCAL_STORE_DIR.
const scratch = mkdtempSync(path.join(tmpdir(), "teacher-scope-"));
const storeFile = path.join(scratch, "school-store.json");

const teacher = { session: { role: "teacher" as const, email: "math@t.mn", name: "Math T", avatarUrl: "", source: "neon" as const } };

let db: typeof import("@/lib/school-db");

beforeAll(async () => {
  process.env.LOCAL_STORE_DIR = scratch;
  delete process.env.VERCEL;
  delete process.env.DATABASE_URL;
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  mkdirSync(path.dirname(storeFile), { recursive: true });
  writeFileSync(
    storeFile,
    JSON.stringify({
      teachers: [{ id: "T-1", email: "math@t.mn", subject: "Mathematics", createdAt: "2026-01-01", values: ["Math T", "Mathematics", "", "", "", "math@t.mn"] }],
      grades: [
        { id: "GR-MATH", createdAt: "2026-01-01", values: ["Bat", "Mathematics", "90", "1"] },
        { id: "GR-ENG", createdAt: "2026-01-01", values: ["Bat", "English", "80", "1"] }
      ],
      attendance: [{ id: "AT-ENG", createdAt: "2026-01-01", values: ["Bat", "English", "2026-01-01", "Present"] }]
    })
  );
  db = await import("@/lib/school-db");
});

const rows = (resource: string) => (JSON.parse(readFileSync(storeFile, "utf8"))[resource] as { id: string; values: string[] }[]);

describe("teacher subject scope", () => {
  it("rejects a grade for another subject", async () => {
    await expect(db.createResource("grades", { Student: "Bat", Subject: "English", Score: "50", Semester: "1" }, teacher)).rejects.toThrow(/subject you teach/);
  });

  it("rejects attendance for another subject", async () => {
    await expect(db.createResource("attendance", { Student: "Bat", Subject: "English", Date: "2026-01-02", Status: "Absent" }, teacher)).rejects.toThrow(/subject you teach/);
  });

  it("allows own subject (case-insensitive)", async () => {
    await db.createResource("grades", { Student: "Bat", Subject: "mathematics", Score: "70", Semester: "1" }, teacher);
    expect(rows("grades").some((r) => r.values[2] === "70")).toBe(true);
  });

  it("fills in the subject when omitted and the teacher has one", async () => {
    await db.createResource("attendance", { Student: "Bat", Subject: "", Date: "2026-01-03", Status: "Late" }, teacher);
    const row = rows("attendance").find((r) => r.values[3] === "Late");
    expect(row?.values[1]).toBe("Mathematics");
  });

  it("rejects deleting another subject's grade", async () => {
    await expect(db.deleteResource("grades", "GR-ENG", teacher)).rejects.toThrow(/subject you teach/);
    expect(rows("grades").some((r) => r.id === "GR-ENG")).toBe(true);
  });

  it("rejects editing another subject's attendance, even when moving it to own subject", async () => {
    await expect(db.updateResource("attendance", "AT-ENG", { Student: "Bat", Subject: "Mathematics", Date: "2026-01-01", Status: "Absent" }, teacher)).rejects.toThrow(/subject you teach/);
  });

  it("allows deleting own subject's grade", async () => {
    await db.deleteResource("grades", "GR-MATH", teacher);
    expect(rows("grades").some((r) => r.id === "GR-MATH")).toBe(false);
  });

  it("admin is unaffected", async () => {
    const admin = { session: { ...teacher.session, role: "admin" as const } };
    await db.deleteResource("grades", "GR-ENG", admin);
    expect(rows("grades").some((r) => r.id === "GR-ENG")).toBe(false);
  });
});
