import { describe, expect, it } from "vitest";
import { placementBank } from "@/lib/placement-bank";
import { CEFR_LEVELS, normalizeAnswerLetter, normalizeCefrLevel } from "@shared/placement";

describe("placementBank", () => {
  it("has unique ids", () => {
    expect(new Set(placementBank.map((question) => question.id)).size).toBe(placementBank.length);
  });

  it("covers every CEFR level", () => {
    for (const level of CEFR_LEVELS) {
      expect(placementBank.filter((question) => question.level === level).length).toBeGreaterThanOrEqual(5);
    }
  });

  it("has a valid level, answer key and four distinct options on every question", () => {
    for (const question of placementBank) {
      expect(normalizeCefrLevel(question.level)).toBe(question.level);
      expect(normalizeAnswerLetter(question.answer)).toBe(question.answer);
      expect(new Set(question.options).size).toBe(4);
    }
  });
});
