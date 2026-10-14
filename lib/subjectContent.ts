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

export type UploadedMaterialFile = { url: string; fileName: string; fileType: string };

/** Stores one material attachment without adding it to the subject's lessons. */
export async function uploadMaterialFile(subjectId: string, file: File): Promise<UploadedMaterialFile> {
  const formData = new FormData();
  formData.append("file", file);

  const headers = await getClientSchoolHeaders();
  const res = await fetch(`/api/subjects/${subjectId}/files`, {
    method: "POST",
    headers,
    body: formData,
  });

  if (!res.ok) {
    const payload = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new Error(payload?.message ?? "File could not be uploaded");
  }

  return await res.json() as UploadedMaterialFile;
}

/**
 * Opens a stored attachment in a new tab. The tab cannot send the session
 * header, so it gets a short-lived signed link instead. The tab is opened
 * before the await so popup blockers treat it as part of the click.
 */
export async function openStoredFile(fileUrl: string) {
  const target = window.open("", "_blank");
  const match = fileUrl.match(/^\/api\/subjects\/files\/([^/?#]+)/);

  if (!match) {
    if (target) target.location.href = fileUrl;
    return;
  }

  try {
    const headers = await getClientSchoolHeaders();
    const res = await fetch(`/api/subjects/files/${match[1]}/link`, { headers });
    if (!res.ok) throw new Error("File link could not be created");
    const { path } = await res.json() as { path: string };
    if (target) target.location.href = path;
  } catch (error) {
    target?.close();
    throw error;
  }
}
