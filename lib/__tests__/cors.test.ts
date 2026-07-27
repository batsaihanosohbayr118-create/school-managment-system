import { describe, expect, it } from "vitest";
import { corsHeaders, isAllowedOrigin } from "@/lib/cors";

describe("isAllowedOrigin", () => {
  it("allows the Expo dev client origin", () => {
    expect(isAllowedOrigin("http://localhost:8081")).toBe(true);
  });

  it("rejects an arbitrary site", () => {
    expect(isAllowedOrigin("https://evil.example")).toBe(false);
  });

  it("rejects a null origin", () => {
    expect(isAllowedOrigin(null)).toBe(false);
  });
});

describe("corsHeaders", () => {
  it("echoes an allowed origin rather than using a wildcard", () => {
    const headers = corsHeaders("http://localhost:8081", ["GET", "POST"]);
    expect(headers["Access-Control-Allow-Origin"]).toBe("http://localhost:8081");
  });

  it("never emits a wildcard, because these endpoints carry bearer tokens", () => {
    const headers = corsHeaders("http://localhost:8081", ["GET"]);
    expect(Object.values(headers)).not.toContain("*");
  });

  it("returns nothing for a disallowed origin", () => {
    expect(corsHeaders("https://evil.example", ["GET"])).toEqual({});
  });

  it("advertises the headers the session resolver reads", () => {
    const headers = corsHeaders("http://localhost:8081", ["GET"]);
    const allowed = headers["Access-Control-Allow-Headers"].toLowerCase();
    expect(allowed).toContain("authorization");
    expect(allowed).toContain("x-demo-session");
    expect(allowed).toContain("content-type");
  });

  it("lists the given methods plus OPTIONS", () => {
    expect(corsHeaders("http://localhost:8081", ["GET", "DELETE"])["Access-Control-Allow-Methods"])
      .toBe("GET, DELETE, OPTIONS");
  });
});
