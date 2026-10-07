import { describe, expect, it } from "vitest";
import { referencedFileIds, removedFileIds } from "@/lib/subject-files";

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
