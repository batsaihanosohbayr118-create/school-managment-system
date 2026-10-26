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

export type UploadedMaterialFile = { url: string; fileName: string; fileType: string };

/** Thrown before any bytes are sent, so the UI can say what the limit is. */
export class FileTooLargeError extends Error {
  constructor(readonly fileName: string, readonly maxBytes: number) {
    super(`${fileName} is larger than the ${Math.round(maxBytes / 1024 / 1024)}MB limit`);
  }
}

async function failure(res: Response, fallback: string) {
  const payload = (await res.json().catch(() => null)) as { message?: string } | null;
  return new Error(payload?.message ?? fallback);
}

/**
 * Uploads one file straight into Storage (see app/api/subjects/[id]/uploads),
 * so its size is not bound by the 4.5MB a request through Vercel may carry.
 * Resolves to null when the server has no Storage configured; the caller then
 * uses the multipart route instead.
 */
async function uploadDirect(
  subjectId: string,
  file: File,
  lesson?: UploadSubjectFilesOptions
): Promise<{ file: UploadedMaterialFile; content?: SubjectContent } | null> {
  const headers = await getClientSchoolHeaders();
  const base = `/api/subjects/${encodeURIComponent(subjectId)}/uploads`;

  const signRes = await fetch(base, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ fileName: file.name, size: file.size }),
  });
  if (signRes.status === 503) return null;
  if (signRes.status === 413) {
    const payload = (await signRes.json().catch(() => null)) as { maxBytes?: number } | null;
    throw new FileTooLargeError(file.name, payload?.maxBytes ?? 0);
  }
  if (!signRes.ok) throw await failure(signRes, "File upload could not be started");
  const { fileId, uploadUrl } = await signRes.json() as { fileId: string; uploadUrl: string };

  // Same body shape supabase-js sends to a signed upload URL.
  const body = new FormData();
  body.append("cacheControl", "3600");
  body.append("", file);
  const putRes = await fetch(uploadUrl, { method: "PUT", headers: { "x-upsert": "false" }, body });
  if (!putRes.ok) throw await failure(putRes, "File could not be uploaded");

  const doneRes = await fetch(`${base}/${encodeURIComponent(fileId)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ fileName: file.name, lesson: lesson ?? null }),
  });
  if (!doneRes.ok) throw await failure(doneRes, "File upload could not be finished");
  return await doneRes.json() as { file: UploadedMaterialFile; content?: SubjectContent };
}

export async function uploadSubjectFiles(
  subjectId: string,
  files: File[],
  options: UploadSubjectFilesOptions = {}
): Promise<SubjectContent> {
  let content: SubjectContent | undefined;

  for (const file of files) {
    // A title names a single uploaded lesson; several files are each named after themselves.
    const lesson = files.length === 1 ? options : { topicId: options.topicId, duration: options.duration };
    const result = await uploadDirect(subjectId, file, lesson);
    if (!result) return uploadSubjectFilesMultipart(subjectId, files, options);
    content = result.content;
  }

  if (!content) throw new Error("Subject files could not be uploaded");
  return content;
}

async function uploadSubjectFilesMultipart(
  subjectId: string,
  files: File[],
  options: UploadSubjectFilesOptions
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

/** Stores one material attachment without adding it to the subject's lessons. */
export async function uploadMaterialFile(subjectId: string, file: File): Promise<UploadedMaterialFile> {
  const direct = await uploadDirect(subjectId, file);
  if (direct) return direct.file;

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

const STORED_FILE_URL = /^\/api\/subjects\/files\/([^/?#]+)/;

async function signedFileUrl(fileId: string) {
  const headers = await getClientSchoolHeaders();
  const res = await fetch(`/api/subjects/files/${fileId}/link`, { headers });
  if (!res.ok) throw new Error("File link could not be created");
  const { path, url } = await res.json() as { path: string; url?: string };
  return url ?? path;
}

/**
 * A URL an element can load without the session header — <video src>,
 * <iframe src>. Anything that is not a stored attachment comes back as is.
 */
export async function resolveStoredFileUrl(fileUrl: string) {
  const match = fileUrl.match(STORED_FILE_URL);
  return match ? signedFileUrl(match[1]) : fileUrl;
}

/**
 * Opens a stored attachment in a new tab. The tab cannot send the session
 * header, so it gets a short-lived signed link instead. The tab is opened
 * before the await so popup blockers treat it as part of the click.
 */
export async function openStoredFile(fileUrl: string) {
  const target = window.open("", "_blank");

  try {
    const url = await resolveStoredFileUrl(fileUrl);
    if (target) target.location.href = url;
  } catch (error) {
    target?.close();
    throw error;
  }
}
