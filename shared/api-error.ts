export type ApiErrorKind =
  | "offline"
  | "session-expired"
  | "forbidden"
  | "bad-request"
  | "server-error";

export class ApiError extends Error {
  readonly kind: ApiErrorKind;

  constructor(kind: ApiErrorKind, message: string) {
    super(message);
    this.name = "ApiError";
    this.kind = kind;
  }
}

export function classifyStatus(status: number): ApiErrorKind {
  if (status === 401) return "session-expired";
  if (status === 403) return "forbidden";
  if (status >= 500) return "server-error";
  return "bad-request";
}
