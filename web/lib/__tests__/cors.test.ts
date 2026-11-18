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

  it("allows a LAN Metro/Expo-web origin (a physical device reaching the dev server by IP)", () => {
    expect(isAllowedOrigin("http://192.168.10.197:8081")).toBe(true);
    expect(isAllowedOrigin("http://10.0.0.5:19006")).toBe(true);
  });

  it("rejects a LAN IP on a port that isn't Metro/Expo-web", () => {
    expect(isAllowedOrigin("http://192.168.10.197:3000")).toBe(false);
  });

  it("rejects a non-IP host even on a dev port", () => {
    expect(isAllowedOrigin("http://evil.example:8081")).toBe(false);
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
