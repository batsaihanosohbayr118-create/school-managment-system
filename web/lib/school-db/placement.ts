import { PLACEMENT_SUBJECT, isPlacementSubject, scorePlacement } from "@shared/placement";
import { type DbRow, type SchoolRequestContext, getPool, normalizedToken, rawRowValues, stringValue } from "./base";
import { ensureSchoolDatabase } from "./schema";
import { createLocalResource, fetchRawTable, logDatabaseFallback } from "./local-store";
import { allowedSubjectNames } from "./access";
import { listResource, resolveSubjectByToken } from "./resources";

export async function submitPlacementTest(answers: Record<string, string>, context: SchoolRequestContext) {
  if (context.session.role !== "student") {
    throw new Error("Only students have permission to take the placement test.");
  }

  const enrolled = await allowedSubjectNames(context);
  if (!enrolled.has(normalizedToken(PLACEMENT_SUBJECT))) {
    throw new Error(`You are not allowed to take this test: you are not enrolled in ${PLACEMENT_SUBJECT}.`);
  }

  const email = normalizedToken(context.session.email);
  const students = await fetchRawTable("students");
  const student = students.find((row) => normalizedToken((row as DbRow).email) === email) as DbRow | undefined;
  if (!student) {
    throw new Error("A student record is required to take the placement test.");
  }
  const studentName = stringValue(student.full_name);

  const results = await fetchRawTable("placementResults");
  const alreadyTaken = results.some((row) => {
    const [name, subject] = rawRowValues("placementResults", row);
    return normalizedToken(name) === normalizedToken(studentName) && isPlacementSubject(subject ?? "");
  });
  if (alreadyTaken) {
    throw new Error("Retaking the placement test is not allowed until your teacher resets your result.");
  }

  const questions = (await fetchRawTable("placementQuestions"))
    .map((row) => {
      const [subject, level, , , , , , answer] = rawRowValues("placementQuestions", row);
      return { id: stringValue((row as DbRow).id), subject: subject ?? "", level: level ?? "", answer: answer ?? "" };
    })
    .filter((question) => isPlacementSubject(question.subject));

  if (questions.length === 0) {
    throw new Error("Placement questions are required before the test can be taken.");
  }

  const score = scorePlacement(questions, answers);
  const values = {
    Student: studentName,
    Subject: PLACEMENT_SUBJECT,
    Level: score.level,
    Correct: String(score.correct),
    Total: String(score.total),
    Date: new Date().toISOString().slice(0, 10)
  };

  try {
    await ensureSchoolDatabase();
    const pool = getPool();
    const subject = await resolveSubjectByToken(pool, PLACEMENT_SUBJECT);
    await pool.query(
      `INSERT INTO placement_results (id, student_id, subject_id, student, subject, level, correct, total, date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [`PR-${Date.now().toString().slice(-6)}`, stringValue(student.id), subject ? stringValue(subject.id) : "", studentName, PLACEMENT_SUBJECT, score.level, score.correct, score.total, values.Date]
    );
  } catch (error) {
    logDatabaseFallback(error);
    await createLocalResource("placementResults", values);
  }

  return listResource("placementResults", context);
}
