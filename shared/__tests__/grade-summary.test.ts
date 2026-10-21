import { describe, expect, it } from "vitest";
import {
  averageScore,
  gradePointAverage,
  letterGrade,
  semestersInOrder,
  semesterTrend,
  summarizeSubjects,
  type GradeInput
} from "@shared/grade-summary";

describe("letterGrade", () => {
  it("maps band edges", () => {
    expect(letterGrade(100)).toEqual({ letter: "A", points: 4 });
    expect(letterGrade(96)).toEqual({ letter: "A", points: 4 });
    expect(letterGrade(95)).toEqual({ letter: "A-", points: 3.7 });
    expect(letterGrade(84)).toEqual({ letter: "B", points: 3 });
    expect(letterGrade(60)).toEqual({ letter: "D-", points: 0.7 });
    expect(letterGrade(59)).toEqual({ letter: "F", points: 0 });
  });
});

// Newest first, as the API returns them.
const grades: GradeInput[] = [
  { subject: "Math", score: 90, semester: "II" },
  { subject: "English", score: 70, semester: "II" },
  { subject: "Math", score: 80, semester: "I" },
  { subject: "math ", score: 100, semester: "I" },
  { subject: "English", score: null, semester: "I" },
  { subject: "Art", score: 50, semester: "" }
];

describe("semestersInOrder", () => {
  it("lists distinct non-empty semesters oldest first", () => {
    expect(semestersInOrder(grades)).toEqual(["I", "II"]);
  });
});

describe("summarizeSubjects", () => {
  it("averages repeat subjects case-insensitively and skips missing scores", () => {
    expect(summarizeSubjects(grades, "I")).toEqual([{ subject: "Math", score: 90, letter: "B+", points: 3.3 }]);
  });

  it("covers every semester when none is given", () => {
    expect(summarizeSubjects(grades, null).map((s) => [s.subject, s.score])).toEqual([
      ["Art", 50],
      ["English", 70],
      ["Math", 90]
    ]);
  });
});

describe("averages", () => {
  it("returns null for nothing", () => {
    expect(gradePointAverage([])).toBeNull();
    expect(averageScore([])).toBeNull();
  });

  it("averages points and scores", () => {
    const subjects = summarizeSubjects(grades, "II"); // English 70 → D+ 1.3, Math 90 → B+ 3.3
    expect(gradePointAverage(subjects)).toBe(2.3);
    expect(averageScore(subjects)).toBe(80);
  });
});

describe("semesterTrend", () => {
  it("gives one GPA per semester, oldest first", () => {
    expect(semesterTrend(grades)).toEqual([
      { semester: "I", gpa: 3.3 },
      { semester: "II", gpa: 2.3 }
    ]);
  });
});
