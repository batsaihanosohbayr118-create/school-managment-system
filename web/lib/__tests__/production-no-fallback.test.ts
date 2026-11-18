import { existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeAll, describe, expect, it, vi } from "vitest";

// On Vercel the local JSON store must never stand in for Postgres: a write
// during a database outage has to fail, not answer "saved" and vanish.
const scratch = mkdtempSync(path.join(tmpdir(), "no-fallback-"));
const admin = { session: { role: "admin" as const, email: "a@t.mn", name: "A", avatarUrl: "", source: "neon" as const } };

let db: typeof import("@/lib/school-db");

beforeAll(async () => {
  process.env.VERCEL = "1";
  process.env.LOCAL_STORE_DIR = scratch;
  // Nothing listens on port 1: pg fails fast with ECONNREFUSED (a coded error).
  process.env.DATABASE_URL = "postgresql://u:p@127.0.0.1:1/none";
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  db = await import("@/lib/school-db");
});

describe("database unavailable in production", () => {
  it("fails a write with a generic message instead of using the local store", async () => {
    await expect(
      db.createResource("announcements", { Title: "Hi", Content: "Hello", Audience: "All", Date: "2026-01-01" }, admin)
    ).rejects.toThrow("Database is temporarily unavailable. Please try again.");
    expect(existsSync(path.join(scratch, "school-store.json"))).toBe(false);
  });

  it("fails a read the same way", async () => {
    await expect(db.listResource("grades", { ...admin, mode: "summary" })).rejects.toThrow("Database is temporarily unavailable");
    expect(existsSync(path.join(scratch, "school-store.json"))).toBe(false);
  });
});
