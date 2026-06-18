import type { SubjectContent } from "@/lib/types";

export async function loadSubjectContent(subjectId: string): Promise<SubjectContent | null> {
  try {
    const res = await fetch(`/api/subjects/${subjectId}/content`);
    if (!res.ok) return null;
    return await res.json() as SubjectContent;
  } catch {
    return null;
  }
}

export async function saveSubjectContent(
  subjectId: string,
  content: SubjectContent
): Promise<void> {
  const res = await fetch(`/api/subjects/${subjectId}/content`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(content),
  });

  if (!res.ok) {
    const payload = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new Error(payload?.message ?? "Subject content could not be saved");
  }
}

export async function uploadSubjectFiles(
  subjectId: string,
  files: File[]
): Promise<SubjectContent> {
  const formData = new FormData();

  files.forEach((file) => {
    formData.append("files", file);
  });

  const res = await fetch(`/api/subjects/${subjectId}/content`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const payload = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new Error(payload?.message ?? "Subject files could not be uploaded");
  }

  return await res.json() as SubjectContent;
}
