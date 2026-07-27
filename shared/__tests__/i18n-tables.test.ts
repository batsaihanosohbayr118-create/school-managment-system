import { describe, expect, it } from "vitest";
import { translateColumn, translateValue, translations } from "@shared/i18n-tables";

describe("translateColumn", () => {
  it("translates a known column into Mongolian", () => {
    expect(translateColumn("Student", "mn")).toBe("Сурагч");
  });

  it("falls back to the original string for an unknown column", () => {
    expect(translateColumn("Nonexistent", "mn")).toBe("Nonexistent");
  });

  it("leaves English untouched", () => {
    expect(translateColumn("Student", "en")).toBe("Student");
  });
});

describe("translateValue", () => {
  it("translates an exact known value", () => {
    expect(translateValue("Present", "mn")).toBe("Ирсэн");
  });

  it("translates a Grade pattern it doesn't have an exact match for", () => {
    expect(translateValue("Grade 10C", "mn")).toBe("10C анги");
  });

  it("leaves English untouched", () => {
    expect(translateValue("Present", "en")).toBe("Present");
  });
});

describe("translations", () => {
  it("has both locales with the same top-level keys", () => {
    expect(Object.keys(translations.mn).sort()).toEqual(Object.keys(translations.en).sort());
  });
});
