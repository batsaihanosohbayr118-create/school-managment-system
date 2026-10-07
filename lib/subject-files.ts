import type { SubjectContent } from "@/lib/types";

const FILE_URL = /^\/api\/subjects\/files\/([^/?#]+)/;

/** Ids of the stored attachments a subject's content points at. */
export function referencedFileIds(content: Pick<SubjectContent, "lessons"> | null | undefined): Set<string> {
  const ids = new Set<string>();
  for (const lesson of content?.lessons ?? []) {
    const match = lesson.fileUrl?.match(FILE_URL);
    if (match) ids.add(decodeURIComponent(match[1]));
  }
  return ids;
}

/**
 * Attachments a save dropped: referenced before, not after. Only these are
 * deleted — never "everything unreferenced", which would also catch a file an
 * upload has stored but not yet linked into the content.
 */
export function removedFileIds(before: Pick<SubjectContent, "lessons"> | null | undefined, after: Pick<SubjectContent, "lessons">): string[] {
  const kept = referencedFileIds(after);
  return [...referencedFileIds(before)].filter((id) => !kept.has(id));
}
