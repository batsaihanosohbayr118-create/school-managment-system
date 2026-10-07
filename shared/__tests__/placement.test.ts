import { describe, expect, it } from "vitest";
import { CEFR_LEVELS, normalizeAnswerLetter, normalizeCefrLevel, placementLevel, scorePlacement, type CefrLevel, type LevelTally } from "@shared/placement";

function tallies(entries: Partial<Record<CefrLevel, [number, number]>>): Record<CefrLevel, LevelTally> {
  return Object.fromEntries(
    CEFR_LEVELS.map((level) => {
      const [correct, total] = entries[level] ?? [0, 0];
      return [level, { correct, total }];
    })
  ) as Record<CefrLevel, LevelTally>;
}

describe("placementLevel", () => {
  it("places a student at the highest level reached without a failure", () => {
    expect(placementLevel(tallies({ A1: [5, 5], A2: [4, 5], B1: [3, 5], B2: [2, 5], C1: [5, 5] }))).toBe("B1");
  });

  it("does not let a lucky hard level skip a failed easier one", () => {
    expect(placementLevel(tallies({ A1: [5, 5], A2: [1, 5], B1: [5, 5], B2: [5, 5], C1: [5, 5] }))).toBe("A1");
  });

  it("places a student who fails A1 at A1", () => {
    expect(placementLevel(tallies({ A1: [0, 5], A2: [0, 5] }))).toBe("A1");
  });

  it("reaches C1 when every level is passed", () => {
    expect(placementLevel(tallies({ A1: [5, 5], A2: [5, 5], B1: [5, 5], B2: [5, 5], C1: [3, 5] }))).toBe("C1");
  });

  it("skips a level that has no questions instead of failing it", () => {
    expect(placementLevel(tallies({ A1: [5, 5], A2: [5, 5], B2: [4, 5] }))).toBe("B2");
  });

  it("treats exactly the pass ratio as a pass", () => {
    expect(placementLevel(tallies({ A1: [3, 5], A2: [2, 5] }))).toBe("A1");
    expect(placementLevel(tallies({ A1: [3, 5], A2: [3, 5] }))).toBe("A2");
  });
});

describe("scorePlacement", () => {
  const questions = [
    { id: "q1", level: "A1", answer: "A" },
    { id: "q2", level: "A1", answer: "B" },
    { id: "q3", level: "A2", answer: "C" },
    { id: "q4", level: "a2", answer: "d" }
  ];

  it("counts correct answers case-insensitively", () => {
    const score = scorePlacement(questions, { q1: "a", q2: "B", q3: "C", q4: "D" });
    expect(score.correct).toBe(4);
    expect(score.total).toBe(4);
    expect(score.level).toBe("A2");
  });

  it("counts a missing answer as wrong", () => {
    const score = scorePlacement(questions, { q1: "A", q2: "B" });
    expect(score.correct).toBe(2);
    expect(score.byLevel.A2).toEqual({ correct: 0, total: 2 });
    expect(score.level).toBe("A1");
  });

  it("ignores answers for questions that do not exist", () => {
    const score = scorePlacement(questions, { q1: "A", bogus: "A" });
    expect(score.correct).toBe(1);
  });

  it("skips a question with an invalid level or answer key", () => {
    const score = scorePlacement([...questions, { id: "q5", level: "Z9", answer: "A" }, { id: "q6", level: "B1", answer: "" }], {});
    expect(score.total).toBe(4);
  });
});

describe("normalizers", () => {
  it("accepts lowercase and padded values", () => {
    expect(normalizeCefrLevel(" b2 ")).toBe("B2");
    expect(normalizeAnswerLetter("c")).toBe("C");
  });

  it("rejects anything else", () => {
    expect(normalizeCefrLevel("C2")).toBeNull();
    expect(normalizeAnswerLetter("E")).toBeNull();
  });
});
