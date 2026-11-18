import { describe, expect, it } from "vitest";
import { columnIndex, parseMoney, parseScore, parseTimeRange } from "@/lib/mobile/table";

const columns = ["Subject", "Day", "Time", "Teacher", "Class"];

describe("columnIndex", () => {
  it("finds a column by name", () => {
    expect(columnIndex(columns, "Time")).toBe(2);
  });

  it("is case-insensitive", () => {
    expect(columnIndex(columns, "time")).toBe(2);
  });

  it("throws with a useful message when the column is gone", () => {
    expect(() => columnIndex(columns, "Room")).toThrow(/Room/);
  });
});

describe("parseScore", () => {
  it("parses a plain number", () => {
    expect(parseScore("92")).toBe(92);
  });

  it("parses a decimal", () => {
    expect(parseScore("87.5")).toBe(87.5);
  });

  it("returns null for empty input", () => {
    expect(parseScore("")).toBeNull();
  });

  it("returns null for text", () => {
    expect(parseScore("N/A")).toBeNull();
  });
});

describe("parseMoney", () => {
  it("strips a currency symbol and separators", () => {
    expect(parseMoney("$2,840")).toBe(2840);
  });

  it("handles a bare number", () => {
    expect(parseMoney("500")).toBe(500);
  });

  it("returns null for text", () => {
    expect(parseMoney("Unpaid")).toBeNull();
  });

  it("returns null for empty input", () => {
    expect(parseMoney("")).toBeNull();
  });
});

describe("parseTimeRange", () => {
  it("splits a hyphenated range", () => {
    expect(parseTimeRange("08:30-09:15")).toEqual({ startsAt: "08:30", endsAt: "09:15" });
  });

  it("tolerates spaces around the hyphen", () => {
    expect(parseTimeRange("08:30 - 09:15")).toEqual({ startsAt: "08:30", endsAt: "09:15" });
  });

  it("returns nulls for a single time", () => {
    expect(parseTimeRange("08:30")).toEqual({ startsAt: null, endsAt: null });
  });

  it("returns nulls for free text", () => {
    expect(parseTimeRange("Morning")).toEqual({ startsAt: null, endsAt: null });
  });
});
