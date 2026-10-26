import { describe, expect, it } from "vitest";
import {
  STORED_FILE_ID,
  appendFileLessons,
  referencedFileIds,
  removedFileIds,
  safeStoredName,
  storageObjectPath
} from "@/lib/subject-files";

const lesson = (id: string, fileUrl?: string) => ({ id, title: id, topicId: "T", fileUrl });

describe("referencedFileIds", () => {
  it("collects stored-file ids and ignores external or missing urls", () => {
    const ids = referencedFileIds({ lessons: [lesson("a", "/api/subjects/files/F-1"), lesson("b", "https://example.com/x.pdf"), lesson("c")] });
    expect([...ids]).toEqual(["F-1"]);
  });
});

describe("removedFileIds", () => {
  it("returns only files the save dropped", () => {
    const before = { lessons: [lesson("a", "/api/subjects/files/F-1"), lesson("b", "/api/subjects/files/F-2")] };
    const after = { lessons: [lesson("b", "/api/subjects/files/F-2")] };
    expect(removedFileIds(before, after)).toEqual(["F-1"]);
  });

  it("never touches a file that was not referenced before", () => {
    expect(removedFileIds({ lessons: [] }, { lessons: [] })).toEqual([]);
  });
});

describe("safeStoredName", () => {
  it("keeps the extension and replaces what a storage key should not hold", () => {
    expect(safeStoredName("Unit 1 – Hello world.mp4")).toBe("Unit-1-Hello-world.mp4");
  });

  it("falls back to 'file' for a name with nothing ASCII in it", () => {
    expect(safeStoredName("Англи хэл.pdf")).toBe("file.pdf");
  });
});

describe("storageObjectPath", () => {
  it("is scoped under the subject and rebuilt the same way every time", () => {
    expect(storageObjectPath("SB-EN", "F-abc123", "a b.pdf")).toBe("SB-EN/F-abc123-a-b.pdf");
    expect(storageObjectPath("SB-EN", "F-abc123", "a b.pdf")).toBe(storageObjectPath("SB-EN", "F-abc123", "a b.pdf"));
  });
});

describe("STORED_FILE_ID", () => {
  it("accepts ids the store hands out and rejects path tricks", () => {
    expect(STORED_FILE_ID.test(`F-${Date.now().toString(36)}0a1b2c3d`)).toBe(true);
    expect(STORED_FILE_ID.test("F-abc/../x")).toBe(false);
  });
});

describe("appendFileLessons", () => {
  const empty = { subjectId: "S", topics: [], lessons: [], assignments: [] };
  const file = (fileName: string) => ({ fileName, url: `/api/subjects/files/${fileName}`, contentType: "video/mp4", byteSize: 10 });
  const now = new Date("2026-10-26T00:00:00Z");

  it("files lessons under the uploaded-files topic when none is asked for", () => {
    const next = appendFileLessons(empty, [file("intro_video.mp4")], {}, now);
    expect(next.topics.map((t) => t.id)).toEqual(["T-FILES"]);
    expect(next.lessons[0]).toMatchObject({ title: "intro video", topicId: "T-FILES", fileType: "video/mp4", fileSize: 10 });
  });

  it("uses the given title only for a single file", () => {
    expect(appendFileLessons(empty, [file("a.mp4")], { title: "Lesson 1" }, now).lessons[0].title).toBe("Lesson 1");
    const two = appendFileLessons(empty, [file("a.mp4"), file("b.mp4")], { title: "Lesson 1" }, now);
    expect(two.lessons.map((l) => l.title)).toEqual(["a", "b"]);
  });

  it("puts a lesson under an existing topic", () => {
    const withTopic = { ...empty, topics: [{ id: "T-1", title: "Grammar" }] };
    const next = appendFileLessons(withTopic, [file("a.mp4")], { topicId: "T-1" }, now);
    expect(next.topics).toHaveLength(1);
    expect(next.lessons[0].topicId).toBe("T-1");
  });
});
