import "server-only";

/**
 * Lesson attachments in Supabase Storage, spoken to over its REST API.
 *
 * Vercel caps a function's request and response bodies at 4.5MB, so a video
 * can neither be uploaded through an API route nor served back out of one.
 * Instead the browser uploads straight to a signed Storage URL and plays the
 * file from a signed download URL; our routes only decide who gets those URLs.
 * The bucket is private — nothing in it is readable without a signature.
 */

const BUCKET = "subject-files";

/** Supabase's free plan rejects anything larger, whatever the bucket says. */
export const MAX_OBJECT_BYTES = 50 * 1024 * 1024;

/** Long enough to watch a lesson video through; Range requests reuse the URL. */
const DOWNLOAD_TTL_SECONDS = 2 * 60 * 60;

declare global {
  var subjectBucketReady: Promise<void> | undefined;
}

function storageConfig() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? { base: `${url.replace(/\/+$/, "")}/storage/v1`, key } : null;
}

export function isObjectStorageConfigured() {
  return storageConfig() !== null;
}

async function storageFetch(path: string, init: RequestInit = {}) {
  const config = storageConfig();
  if (!config) throw new Error("File storage is not configured.");

  return fetch(`${config.base}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${config.key}`, apikey: config.key, ...init.headers }
  });
}

async function storageJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  // Storage rejects a JSON content type on an empty body, so only set it with one.
  const res = await storageFetch(path, {
    ...init,
    headers: init.body ? { "Content-Type": "application/json", ...init.headers } : init.headers
  });
  if (!res.ok) {
    throw new Error(`File storage request failed (${res.status}): ${await res.text().catch(() => "")}`);
  }
  return await res.json() as T;
}

function objectPath(path: string) {
  return `${BUCKET}/${path.split("/").map(encodeURIComponent).join("/")}`;
}

async function createBucket() {
  const existing = await storageFetch(`/bucket/${BUCKET}`);
  if (existing.ok) return;

  await storageJson("/bucket", {
    method: "POST",
    body: JSON.stringify({ id: BUCKET, name: BUCKET, public: false, file_size_limit: MAX_OBJECT_BYTES })
  });
}

function ensureBucket() {
  if (!globalThis.subjectBucketReady) {
    globalThis.subjectBucketReady = createBucket().catch((error) => {
      globalThis.subjectBucketReady = undefined;
      throw error;
    });
  }

  return globalThis.subjectBucketReady;
}

/** An absolute URL the browser PUTs the file to; good for one upload, to this path only. */
export async function createSignedUploadUrl(path: string) {
  await ensureBucket();
  const { url } = await storageJson<{ url: string }>(`/object/upload/sign/${objectPath(path)}`, { method: "POST" });
  return `${storageConfig()!.base}${url}`;
}

/** Size and type of an uploaded object, or null when nothing was uploaded there. */
export async function objectInfo(path: string): Promise<{ byteSize: number; contentType: string } | null> {
  const res = await storageFetch(`/object/authenticated/${objectPath(path)}`, { method: "HEAD" });
  if (!res.ok) return null;

  return {
    byteSize: Number(res.headers.get("content-length") ?? 0),
    contentType: res.headers.get("content-type") ?? "application/octet-stream"
  };
}

export async function createSignedDownloadUrl(path: string) {
  const { signedURL } = await storageJson<{ signedURL: string }>(`/object/sign/${objectPath(path)}`, {
    method: "POST",
    body: JSON.stringify({ expiresIn: DOWNLOAD_TTL_SECONDS })
  });
  return `${storageConfig()!.base}${signedURL}`;
}

export async function removeObjects(paths: string[]) {
  if (paths.length === 0) return;
  await storageJson(`/object/${BUCKET}`, { method: "DELETE", body: JSON.stringify({ prefixes: paths }) });
}
