import type { SubjectContent } from "@/lib/types";
import { getClientSchoolHeaders } from "./school-session";

type UploadSubjectFilesOptions = {
  title?: string;
  topicId?: string;
  duration?: string;
};

export async function loadSubjectContent(subjectId: string): Promise<SubjectContent | null> {
  try {
    const headers = await getClientSchoolHeaders();
    const res = await fetch(`/api/subjects/${subjectId}/content`, { headers });
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
  const headers = await getClientSchoolHeaders();
  const res = await fetch(`/api/subjects/${subjectId}/content`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(content),
  });

  if (!res.ok) {
    const payload = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new Error(payload?.message ?? "Subject content could not be saved");
  }
}

export async function uploadSubjectFiles(
  subjectId: string,
  files: File[],
  options: UploadSubjectFilesOptions = {}
): Promise<SubjectContent> {
  const formData = new FormData();

  files.forEach((file) => {
    formData.append("files", file);
  });

  if (options.title) formData.append("title", options.title);
  if (options.topicId) formData.append("topicId", options.topicId);
  if (options.duration) formData.append("duration", options.duration);

  const headers = await getClientSchoolHeaders();
  const res = await fetch(`/api/subjects/${subjectId}/content`, {
    method: "POST",
    headers,
    body: formData,
  });

  if (!res.ok) {
    const payload = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new Error(payload?.message ?? "Subject files could not be uploaded");
  }

  return await res.json() as SubjectContent;
}
