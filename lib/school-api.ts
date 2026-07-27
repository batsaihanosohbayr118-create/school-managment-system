import { getClientSchoolHeaders } from "./school-session";
import type { ResourceTable, SchoolRequestMode, SchoolResource } from "./school-db";

export type SchoolResourceRequestOptions = {
  mode?: SchoolRequestMode;
  subjectId?: string | null;
};

function buildResourceUrl(resource: SchoolResource, options?: SchoolResourceRequestOptions, search = "") {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);

  if (options?.mode) params.set("mode", options.mode);
  if (options?.subjectId) params.set("subjectId", options.subjectId);

  const query = params.toString();
  return `/api/school/${resource}${query ? `?${query}` : ""}`;
}

async function requestSchoolResource<T>(resource: SchoolResource, init: RequestInit = {}, options?: SchoolResourceRequestOptions, search = ""): Promise<T> {
  const headers = await getClientSchoolHeaders();
  const response = await fetch(buildResourceUrl(resource, options, search), {
    ...init,
    headers: {
      Accept: "application/json",
      ...headers,
      ...(init.headers ?? {})
    }
  });

  const payload = (await response.json().catch(() => null)) as { message?: string } | ResourceTable | null;

  if (!response.ok) {
    throw new Error((payload as { message?: string } | null)?.message ?? "Request failed.");
  }

  return payload as T;
}

export async function listSchoolResource(resource: SchoolResource, options?: SchoolResourceRequestOptions) {
  return requestSchoolResource<ResourceTable>(resource, undefined, options);
}

export async function createSchoolResource(resource: SchoolResource, values: Record<string, string>, options?: SchoolResourceRequestOptions) {
  return requestSchoolResource<ResourceTable>(
    resource,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ values })
    },
    options
  );
}

export async function updateSchoolResource(resource: SchoolResource, id: string, values: Record<string, string>, options?: SchoolResourceRequestOptions) {
  return requestSchoolResource<ResourceTable>(
    resource,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ id, values })
    },
    options
  );
}

export async function deleteSchoolResource(resource: SchoolResource, id: string, options?: SchoolResourceRequestOptions) {
  return requestSchoolResource<ResourceTable>(resource, { method: "DELETE" }, options, `?id=${encodeURIComponent(id)}`);
}
