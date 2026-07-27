/**
 * A client that collapses every failure into a bare Error cannot tell "you are
 * offline" from "your session expired". On a phone those need different
 * responses: one shows cached data, the other returns to the login screen.
 */
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
