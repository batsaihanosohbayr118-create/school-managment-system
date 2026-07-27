import { describe, expect, it } from "vitest";
import { ApiError, classifyStatus } from "@shared/api-error";

describe("classifyStatus", () => {
  it("maps 401 to session-expired", () => {
    expect(classifyStatus(401)).toBe("session-expired");
  });

  it("maps 403 to forbidden", () => {
    expect(classifyStatus(403)).toBe("forbidden");
  });

  it("maps other 4xx to bad-request", () => {
    expect(classifyStatus(400)).toBe("bad-request");
    expect(classifyStatus(404)).toBe("bad-request");
  });

  it("maps 5xx to server-error", () => {
    expect(classifyStatus(500)).toBe("server-error");
    expect(classifyStatus(503)).toBe("server-error");
  });
});

describe("ApiError", () => {
  it("carries the kind and message", () => {
    const error = new ApiError("forbidden", "Not allowed.");
    expect(error.kind).toBe("forbidden");
    expect(error.message).toBe("Not allowed.");
    expect(error).toBeInstanceOf(Error);
  });

  it("exposes offline as its own kind", () => {
    expect(new ApiError("offline", "No connection.").kind).toBe("offline");
  });
});
