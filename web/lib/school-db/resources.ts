import { Pool } from "pg";
import type { Role } from "@/lib/types";
import { defaultStudentSubjects } from "@/lib/subjects";
import { AccountConflictError, allPushTokens, createAccount, pushTokensForRole, setAccountPassword, syncAccountName } from "@/lib/auth-db";
import { sendPushNotifications } from "@/lib/mobile/push";
import { PLACEMENT_SUBJECT, isPlacementSubject, normalizeAnswerLetter, normalizeCefrLevel } from "@shared/placement";
import { type DbRow, type QueryRow, type ResourceTable, type SchoolRequestContext, type SchoolResource, ValidationError, csvList, getPool, normalizedToken, numberValue, phoneValue, rowToArray, stringValue, tableName } from "./base";
import { ensureSchoolDatabase } from "./schema";
import { createLocalResource, deleteLocalResource, logDatabaseFallback, readLocalStore, updateLocalResource, writeLocalStore } from "./local-store";
import { audienceRole, fetchFilteredTable, getAssignedSubjectNameForTeacher, rejectPlacementResultWrite, requireManageAccess, requireOwnExistingRow, requireOwnSubject, requirePlacementTeacher } from "./access";

const APP_FEE_AMOUNT = "30,000₮";
const APP_FEE_TYPE = "App fee";

/** The current month in Mongolia (UTC+8) and its last day, which is the fee's due date. */
function currentAppFeePeriod(now = new Date()) {
  const local = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  const year = local.getUTCFullYear();
  const month = local.getUTCMonth();
  const key = `${year}-${String(month + 1).padStart(2, "0")}`;
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return { key, dueDate: `${key}-${String(lastDay).padStart(2, "0")}` };
}

/**
 * Bills every student the monthly app fee, once per month. The id is
 * `AF-<month>-<student id>`, so running this on every payments read is
 * idempotent and a student registered mid-month is billed on their next read.
 * A deleted fee is re-issued; to waive one, mark it Paid instead.
 */
async function issueMonthlyAppFees() {
  const { key, dueDate } = currentAppFeePeriod();

  try {
    await ensureSchoolDatabase();
    await getPool().query(
      `INSERT INTO payment_records (id, student, amount, status, due_date, fee_type)
       SELECT 'AF-' || $1 || '-' || id, full_name, $2, 'Unpaid', $3, $4
       FROM students
       WHERE full_name <> ''
       ON CONFLICT (id) DO NOTHING`,
      [key, APP_FEE_AMOUNT, dueDate, APP_FEE_TYPE]
    );
  } catch (error) {
    logDatabaseFallback(error);
    const store = await readLocalStore();
    const existing = new Set(store.payments.map((row) => row.id));
    const issued = store.students
      .map((row) => ({ id: `AF-${key}-${row.id}`, name: stringValue((row.values ?? rowToArray("students", row))[0]) }))
      .filter((fee) => fee.name && !existing.has(fee.id))
      .map((fee) => ({ id: fee.id, values: [fee.name, APP_FEE_AMOUNT, "Unpaid", dueDate, APP_FEE_TYPE], createdAt: new Date().toISOString() }));

    if (issued.length > 0) {
      store.payments = [...issued, ...store.payments];
      await writeLocalStore(store);
    }
  }
}

export async function listResource(resource: SchoolResource, context: SchoolRequestContext): Promise<ResourceTable> {
  if (context.mode === "page" && (resource === "attendance" || resource === "grades" || resource === "assignments" || resource === "materials" || resource === "timetable")) {
    if ((context.session.role === "student" || context.session.role === "parent") && !context.subjectId) {
      throw new Error("subjectId is required.");
    }
  }

  if (resource === "payments") {
    // Billing must never stop anyone from seeing their payments.
    await issueMonthlyAppFees().catch((error) => console.warn("Monthly app fee issuing failed:", error));
  }

  try {
    await ensureSchoolDatabase();
    return await fetchFilteredTable(resource, context);
  } catch (error) {
    logDatabaseFallback(error);
    return fetchFilteredTable(resource, context);
  }
}

export async function resolveSubjectByToken(pool: Pool | null, token: string) {
  const normalized = token.trim();
  if (!normalized) return null;

  if (pool) {
    const result = await pool.query<QueryRow>(
      `
      SELECT id, name, code, teacher_id
      FROM subjects
      WHERE id = $1 OR code = $1 OR name = $1
      LIMIT 1
    `,
      [normalized]
    );

    return result.rows[0] ?? null;
  }

  const store = await readLocalStore();
  return store.subjects.find((row) => normalizedToken(row.id) === normalizedToken(token) || normalizedToken((row as DbRow).code) === normalizedToken(token) || normalizedToken((row as DbRow).name) === normalizedToken(token)) ?? null;
}

async function resolveTeacherByToken(pool: Pool | null, token: string) {
  const normalized = token.trim();
  if (!normalized) return null;

  if (pool) {
    const result = await pool.query<QueryRow>(
      `
      SELECT id, name, email, subject, subject_id
      FROM teachers
      WHERE id = $1 OR email = $1 OR name = $1
      LIMIT 1
    `,
      [normalized]
    );

    return result.rows[0] ?? null;
  }

  const store = await readLocalStore();
  return store.teachers.find((row) => normalizedToken(row.id) === normalizedToken(token) || normalizedToken((row as DbRow).email) === normalizedToken(token) || normalizedToken((row as DbRow).name) === normalizedToken(token)) ?? null;
}

async function resolveStudentByToken(pool: Pool | null, token: string) {
  const normalized = token.trim();
  if (!normalized) return null;

  if (pool) {
    const result = await pool.query<QueryRow>(
      `
      SELECT id, full_name, email, subjects, parent_email, parent_id
      FROM students
      WHERE id = $1 OR email = $1 OR full_name = $1
      LIMIT 1
    `,
      [normalized]
    );

    return result.rows[0] ?? null;
  }

  const store = await readLocalStore();
  return store.students.find((row) => normalizedToken(row.id) === normalizedToken(token) || normalizedToken((row as DbRow).email) === normalizedToken(token) || normalizedToken((row as DbRow).full_name) === normalizedToken(token)) ?? null;
}

function subjectNamesFromTokens(tokens: string[]) {
  return tokens.map((token) => token.trim()).filter(Boolean);
}

/**
 * Falls back to the school-wide default set. A student with no subjects can see
 * nothing at all, so an empty field is never what the administrator meant.
 */
function getRequestedSubjects(values: Record<string, string>) {
  const requested = subjectNamesFromTokens(csvList(values.Subjects));
  return requested.length > 0 ? requested : [...defaultStudentSubjects];
}

async function replaceStudentSubjects(pool: Pool, studentId: string, subjectPairs: { id: string; name: string }[]) {
  await pool.query(`DELETE FROM student_subjects WHERE student_id = $1`, [studentId]);
  for (const subject of subjectPairs) {
    await pool.query(`INSERT INTO student_subjects (student_id, subject_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [studentId, subject.id]);
  }
}

/**
 * A school record does not by itself let that person sign in — the login lives
 * in `app_users`. When the administrator supplies a password we provision both.
 *
 * The two must share an email. Row-level access looks the session email up in
 * `students.email` (a student) or `parents.email` (a parent), so a mismatch
 * signs them into an app with nothing in it.
 *
 * `create` refuses an email that is already taken; `set` also accepts an
 * existing account and just changes its password, which is how someone added
 * before this field existed finally gets a login. `set` additionally keeps
 * the login's display name following the record's Name field even when no
 * password is being changed — otherwise editing a typo'd name here leaves
 * every already-signed-in session (the greeting on mobile, `me.name` on web)
 * showing the old one until the account is edited separately in Admin → Users.
 */
async function applyLogin(
  mode: "create" | "set",
  role: Extract<Role, "student" | "parent" | "teacher">,
  values: Record<string, string>,
  /** What the account is tied to: a parent's child, or a teacher's subject. */
  link?: { studentEmail?: string; subject?: string }
) {
  const email = values.Email?.trim();
  const name = values.Name?.trim();

  if (mode === "set" && email && name) {
    await syncAccountName(email, role, name);
  }

  const password = values.Password?.trim();
  if (!password) return;

  if (!email) {
    throw new ValidationError("Email is required when you set a password.");
  }

  const account = { email, password, name: name || email, role, ...link };

  try {
    if (mode === "create") {
      await createAccount(account);
    } else {
      await setAccountPassword(account);
    }
  } catch (error) {
    if (error instanceof AccountConflictError) {
      throw new ValidationError(`An account with this ${error.field} already exists.`);
    }
    throw error;
  }
}

async function notifyAnnouncement(audience: string, title: string) {
  const role = audienceRole(audience);
  const tokens = await (role ? pushTokensForRole(role) : allPushTokens());

  await sendPushNotifications(tokens, {
    title: "Шинэ зарлал",
    body: title,
    data: { type: "announcement" }
  });
}

/**
 * Validates and normalizes a placement question before it is written. Runs
 * outside the Postgres try block so an invalid question cannot slip into the
 * local fallback store either.
 */
function placementQuestionValues(values: Record<string, string>): Record<string, string> {
  if (values.Subject?.trim() && !isPlacementSubject(values.Subject)) {
    throw new ValidationError(`Invalid subject: the placement test is for ${PLACEMENT_SUBJECT} only.`);
  }

  const level = normalizeCefrLevel(values.Level ?? "");
  if (!level) throw new ValidationError("Invalid level: use A1, A2, B1, B2 or C1.");

  const answer = normalizeAnswerLetter(values.Answer ?? "");
  if (!answer) throw new ValidationError("Invalid answer: use A, B, C or D.");

  const question = values.Question?.trim() ?? "";
  if (!question) throw new ValidationError("Question is required.");

  const options = ["Option A", "Option B", "Option C", "Option D"].map((key) => values[key]?.trim() ?? "");
  if (options.some((option) => !option)) throw new ValidationError("All four options are required.");

  return {
    Subject: PLACEMENT_SUBJECT,
    Level: level,
    Question: question,
    "Option A": options[0],
    "Option B": options[1],
    "Option C": options[2],
    "Option D": options[3],
    Answer: answer
  };
}

export async function createResource(resource: SchoolResource, values: Record<string, string>, context?: SchoolRequestContext) {
  // Deliberately outside the try block below: that block's catch treats every
  // failure as "Postgres is unreachable, fall back to the local store" and
  // still returns success. A permission denial must never be caught by that
  // path, or any role could write by tripping the fallback.
  requireManageAccess(resource, context?.session.role ?? "admin");
  rejectPlacementResultWrite(resource);
  await requireOwnSubject(resource, values, context);

  if (resource === "placementQuestions") {
    values = placementQuestionValues(values);
  }

  if (resource === "students") {
    await applyLogin("create", "student", values);
  }

  try {
    await ensureSchoolDatabase();

    const pool = getPool();
    const id = `${resource.slice(0, 2).toUpperCase()}-${Date.now().toString().slice(-6)}`;

    switch (resource) {
      case "students": {
        const subjects = getRequestedSubjects(values);
        await pool.query(
          `
          INSERT INTO students (id, email, full_name, phone, gender, birth_date, address, parent_name, parent_email, roll_number, attendance, gpa, payment_status, subjects)
          VALUES ($1, $2, $3, $4, 'Unknown', '', '', $5, $6, $7, 0, 0, $8, $9)
        `,
          [id, values.Email || `${id.toLowerCase()}@educore.mn`, values.Name, values.Phone ?? "", values["Parent name"] ?? "", values["Parent Email"] ?? "", id, values.Payment ?? "Unpaid", subjects.join(", ")]
        );
        const subjectPairs = await Promise.all(subjects.map(async (subjectToken) => {
          const subject = await resolveSubjectByToken(pool, subjectToken);
          return subject ? { id: stringValue(subject.id), name: stringValue(subject.name) } : null;
        }));
        await replaceStudentSubjects(pool, id, subjectPairs.filter((item): item is { id: string; name: string } => Boolean(item)));
        break;
      }
      case "teachers": {
        const subject = await resolveSubjectByToken(pool, values.Subject);
        if (!subject) throw new ValidationError("Subject is required.");
        const existingTeacher = await pool.query<QueryRow>(`SELECT id, subject_id FROM teachers WHERE subject_id = $1 AND id <> $2 LIMIT 1`, [subject.id, id]);
        if (existingTeacher.rows.length > 0) throw new ValidationError("That subject already has a teacher.");
        await applyLogin("create", "teacher", values, { subject: stringValue(subject.name) });
        await pool.query(
          `
          INSERT INTO teachers (id, email, name, subject, subject_id, experience, salary, contact)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `,
          [id, values.Email || `${id.toLowerCase()}@educore.mn`, values.Name, stringValue(subject.name), stringValue(subject.id), values.Experience ?? "", values.Salary ?? "", phoneValue(values.Contact)]
        );
        await pool.query(`UPDATE subjects SET teacher_id = $1, teacher = $2 WHERE id = $3`, [id, values.Name, subject.id]);
        break;
      }
      case "parents": {
        const student = await resolveStudentByToken(pool, values.Student);
        if (!student) throw new ValidationError("Student is required.");
        if (stringValue((student as DbRow).parent_id)) throw new ValidationError("This student already has a parent account.");
        // Before the INSERT: a taken email must fail without leaving a parent
        // row that nobody can sign in as.
        await applyLogin("create", "parent", values, { studentEmail: stringValue((student as DbRow).email) });
        await pool.query(
          `
          INSERT INTO parents (id, email, name, student, student_email, student_id, phone, occupation)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `,
          [id, values.Email || `${id.toLowerCase()}@educore.mn`, values.Name, stringValue((student as DbRow).full_name), stringValue((student as DbRow).email), stringValue((student as DbRow).id), values.Phone ?? "", values.Occupation ?? ""]
        );
        await pool.query(`UPDATE students SET parent_id = $1, parent_email = $2, parent_name = $3 WHERE id = $4`, [id, values.Email || `${id.toLowerCase()}@educore.mn`, values.Name, stringValue((student as DbRow).id)]);
        break;
      }
      case "subjects": {
        const teacher = values.Teacher ? await resolveTeacherByToken(pool, values.Teacher) : null;
        if (teacher && stringValue((teacher as DbRow).subject_id)) throw new ValidationError("That teacher is already assigned to another subject.");
        await pool.query(
          `
          INSERT INTO subjects (id, code, name, description, teacher, category, grade_levels, teacher_id)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `,
          [id, values.Code ?? id, values.Name, values.Description ?? "", teacher ? stringValue((teacher as DbRow).name) : "", values.Category ?? "", values["Grade Levels"] ?? "", teacher ? stringValue((teacher as DbRow).id) : null]
        );
        if (teacher) {
          await pool.query(`UPDATE teachers SET subject_id = $1, subject = $2 WHERE id = $3`, [id, values.Name, stringValue((teacher as DbRow).id)]);
        }
        break;
      }
      case "assignments": {
        const subject = values.Subject ? await resolveSubjectByToken(pool, values.Subject) : null;
        const subjectName = subject ? stringValue(subject.name) : values.Subject;
        const teacherName = context?.session.role === "teacher" ? (await getAssignedSubjectNameForTeacher(pool, context.session.email)) : values.Teacher ?? "";
        await pool.query(
          `
          INSERT INTO assignments (id, subject_id, subject, teacher_id, teacher, title, description, type, max_score, due_date, file_url)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        `,
          [id, subject ? stringValue(subject.id) : "", subjectName, "", teacherName, values.Title, values.Description ?? "", values.Type ?? "Homework", numberValue(values["Max Score"] ?? 100), values["Due Date"] ?? "", values["File URL"] ?? ""]
        );
        break;
      }
      case "materials": {
        const subject = values.Subject ? await resolveSubjectByToken(pool, values.Subject) : null;
        const subjectName = subject ? stringValue(subject.name) : values.Subject;
        await pool.query(
          `
          INSERT INTO learning_materials (id, subject_id, subject, uploaded_by, uploaded_by_name, title, file_url, file_type)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `,
          [id, subject ? stringValue(subject.id) : "", subjectName, context?.session.email ?? "", context?.session.name ?? "", values.Title, values["File URL"] ?? "", values["File Type"] ?? ""]
        );
        break;
      }
      case "attendance": {
        const subject = values.Subject ? await resolveSubjectByToken(pool, values.Subject) : null;
        const subjectName = subject ? stringValue(subject.name) : values.Subject;
        const student = await resolveStudentByToken(pool, values.Student);
        await pool.query(
          `
          INSERT INTO attendance_records (id, student_id, subject_id, student, subject, date, status, recorded_by)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `,
          [id, stringValue((student as DbRow | null)?.id), subject ? stringValue(subject.id) : "", values.Student, subjectName, values.Date ?? new Date().toISOString().slice(0, 10), values.Status ?? "Present", context?.session.email ?? ""]
        );
        break;
      }
      case "grades": {
        const subject = values.Subject ? await resolveSubjectByToken(pool, values.Subject) : null;
        const student = await resolveStudentByToken(pool, values.Student);
        await pool.query(
          `
          INSERT INTO grade_records (id, student_id, subject_id, student, subject, score, semester, entered_by)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `,
          [id, stringValue((student as DbRow | null)?.id), subject ? stringValue(subject.id) : "", values.Student, subject ? stringValue(subject.name) : values.Subject, numberValue(values.Score), values.Semester ?? "", context?.session.email ?? ""]
        );
        break;
      }
      case "payments":
        await pool.query(
          `INSERT INTO payment_records (id, student, amount, status, due_date, fee_type)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [id, values.Student, values.Amount ?? "$0", values.Status ?? "Unpaid", values["Due Date"] ?? "", values["Fee Type"] || "Tuition"]
        );
        break;
      case "timetable": {
        const subject = values.Subject ? await resolveSubjectByToken(pool, values.Subject) : null;
        await pool.query(
          `
          INSERT INTO timetable_slots (id, subject_id, subject, teacher_id, teacher, class_name, day, time)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `,
          [id, subject ? stringValue(subject.id) : "", subject ? stringValue(subject.name) : values.Subject, "", values.Teacher ?? "", values.Class ?? "", values.Day ?? "", values.Time ?? ""]
        );
        break;
      }
      case "announcements":
        await pool.query(
          `INSERT INTO announcements (id, title, content, audience, date)
           VALUES ($1, $2, $3, $4, $5)`,
          [id, values.Title, values.Content ?? "", values.Audience ?? "All", values.Date ?? new Date().toISOString().slice(0, 10)]
        );
        break;
      case "wellbeing":
        await pool.query(
          `INSERT INTO wellbeing_prompts (id, question, category, note, date)
           VALUES ($1, $2, $3, $4, $5)`,
          [id, values.Question, values.Category || "General", values.Note ?? "", values.Date || new Date().toISOString().slice(0, 10)]
        );
        break;
      case "placementQuestions": {
        await requirePlacementTeacher(pool, context);
        const subject = await resolveSubjectByToken(pool, PLACEMENT_SUBJECT);
        await pool.query(
          `INSERT INTO placement_questions (id, subject_id, subject, level, question, option_a, option_b, option_c, option_d, answer, created_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [id, subject ? stringValue(subject.id) : "", PLACEMENT_SUBJECT, values.Level, values.Question, values["Option A"], values["Option B"], values["Option C"], values["Option D"], values.Answer, context?.session.email ?? ""]
        );
        break;
      }
    }

    if (resource === "announcements") {
      try {
        await notifyAnnouncement(values.Audience || "All", values.Title);
      } catch (error) {
        console.warn("Failed to send announcement push notifications.", error);
      }
    }

    return listResource(resource, context ?? { session: { role: "admin", email: "", name: "", avatarUrl: "", source: "neon" }, mode: "summary" });
  } catch (error) {
    if (error instanceof ValidationError) throw error;
    logDatabaseFallback(error);
    return createLocalResource(resource, values);
  }
}

export async function deleteResource(resource: SchoolResource, id: string, context?: SchoolRequestContext) {
  requireManageAccess(resource, context?.session.role ?? "admin");
  await requireOwnExistingRow(resource, id, context);

  try {
    await ensureSchoolDatabase();

    // Deleting a result is how the English teacher lets a student retake the test.
    if (resource === "placementQuestions" || resource === "placementResults") {
      await requirePlacementTeacher(getPool(), context);
    }

    // Deleting a parent has to release the student too. students.parent_id is
    // what blocks a second parent, so leaving it set would strand that student:
    // they could never be attached to anyone again.
    if (resource === "parents") {
      await getPool().query(
        `UPDATE students SET parent_id = NULL, parent_email = '', parent_name = '' WHERE parent_id = $1`,
        [id]
      );
    }

    // Likewise a subject must not keep showing a teacher who no longer exists.
    if (resource === "teachers") {
      await getPool().query(`UPDATE subjects SET teacher_id = NULL, teacher = '' WHERE teacher_id = $1`, [id]);
    }

    await getPool().query(`DELETE FROM ${tableName(resource)} WHERE id = $1`, [id]);
    return listResource(resource, context ?? { session: { role: "admin", email: "", name: "", avatarUrl: "", source: "neon" }, mode: "summary" });
  } catch (error) {
    if (error instanceof ValidationError) throw error;
    logDatabaseFallback(error);
    return deleteLocalResource(resource, id);
  }
}

export async function updateResource(resource: SchoolResource, id: string, values: Record<string, string>, context?: SchoolRequestContext) {
  requireManageAccess(resource, context?.session.role ?? "admin");
  rejectPlacementResultWrite(resource);
  await requireOwnExistingRow(resource, id, context);
  if (values.Subject !== undefined) await requireOwnSubject(resource, values, context);

  if (resource === "placementQuestions") {
    values = placementQuestionValues(values);
  }

  if (resource === "students") {
    await applyLogin("set", "student", values);
  }

  try {
    await ensureSchoolDatabase();
    const pool = getPool();

    switch (resource) {
      case "students": {
        const subjects = getRequestedSubjects(values);
        // COALESCE on the fields the edit dialog does not show: passing "" for a
        // key the form never sent would erase a value the admin cannot even see.
        await pool.query(
          `
          UPDATE students
          SET full_name = $1, email = $2, subjects = $3, attendance = $4, gpa = $5, payment_status = $6, parent_email = $7, parent_name = COALESCE($8, parent_name)
          WHERE id = $9
        `,
          [values.Name, values.Email ?? "", subjects.join(", "), numberValue(values.Attendance), numberValue(values.GPA), values.Payment ?? "Unpaid", values["Parent Email"] ?? "", values["Parent name"] ?? null, id]
        );
        const subjectPairs = await Promise.all(subjects.map(async (subjectToken) => {
          const subject = await resolveSubjectByToken(pool, subjectToken);
          return subject ? { id: stringValue(subject.id), name: stringValue(subject.name) } : null;
        }));
        await replaceStudentSubjects(pool, id, subjectPairs.filter((item): item is { id: string; name: string } => Boolean(item)));
        break;
      }
      case "teachers": {
        const subject = await resolveSubjectByToken(pool, values.Subject);
        if (!subject) throw new ValidationError("Subject is required.");
        const conflictingTeacher = await pool.query<QueryRow>(`SELECT id FROM teachers WHERE subject_id = $1 AND id <> $2 LIMIT 1`, [subject.id, id]);
        if (conflictingTeacher.rows.length > 0) throw new ValidationError("That subject already has a teacher.");
        await applyLogin("set", "teacher", values, { subject: stringValue(subject.name) });
        await pool.query(
          `
          UPDATE teachers
          SET name = $1, email = $2, subject = $3, subject_id = $4, experience = COALESCE($5, experience), salary = $6, contact = $7
          WHERE id = $8
        `,
          [values.Name, values.Email ?? "", stringValue(subject.name), stringValue(subject.id), values.Experience ?? null, values.Salary ?? "", phoneValue(values.Contact), id]
        );
        await pool.query(`UPDATE subjects SET teacher_id = $1, teacher = $2 WHERE id = $3`, [id, values.Name, subject.id]);
        break;
      }
      case "parents": {
        const student = await resolveStudentByToken(pool, values.Student);
        if (!student) throw new ValidationError("Student is required.");
        const conflictingParent = await pool.query<QueryRow>(`SELECT id FROM parents WHERE student_id = $1 AND id <> $2 LIMIT 1`, [stringValue((student as DbRow).id), id]);
        if (conflictingParent.rows.length > 0) throw new ValidationError("This student already has a parent account.");
        await applyLogin("set", "parent", values, { studentEmail: stringValue((student as DbRow).email) });
        await pool.query(
          `
          UPDATE parents
          SET name = $1, email = $2, student = $3, student_email = $4, student_id = $5, phone = $6, occupation = COALESCE($7, occupation)
          WHERE id = $8
        `,
          [values.Name, values.Email ?? "", stringValue((student as DbRow).full_name), stringValue((student as DbRow).email), stringValue((student as DbRow).id), values.Phone ?? "", values.Occupation ?? null, id]
        );
        await pool.query(`UPDATE students SET parent_id = $1, parent_email = $2, parent_name = $3 WHERE id = $4`, [id, values.Email ?? "", values.Name, stringValue((student as DbRow).id)]);
        break;
      }
      case "subjects": {
        const teacher = values.Teacher ? await resolveTeacherByToken(pool, values.Teacher) : null;
        if (teacher && stringValue((teacher as DbRow).subject_id) && stringValue((teacher as DbRow).subject_id) !== id) {
          throw new ValidationError("That teacher is already assigned to another subject.");
        }
        await pool.query(
          `
          UPDATE subjects
          SET code = $1, name = $2, description = $3, teacher = $4, category = $5, grade_levels = $6, teacher_id = $7
          WHERE id = $8
        `,
          [values.Code ?? id, values.Name, values.Description ?? "", teacher ? stringValue((teacher as DbRow).name) : "", values.Category ?? "", values["Grade Levels"] ?? "", teacher ? stringValue((teacher as DbRow).id) : null, id]
        );
        if (teacher) {
          await pool.query(`UPDATE teachers SET subject_id = $1, subject = $2 WHERE id = $3`, [id, values.Name, stringValue((teacher as DbRow).id)]);
        }
        break;
      }
      case "assignments": {
        const subject = values.Subject ? await resolveSubjectByToken(pool, values.Subject) : null;
        await pool.query(
          `
          UPDATE assignments
          SET subject_id = $1, subject = $2, title = $3, description = $4, max_score = $5, due_date = $6, file_url = $7
          WHERE id = $8
        `,
          [subject ? stringValue(subject.id) : "", subject ? stringValue(subject.name) : values.Subject, values.Title, values.Description ?? "", numberValue(values["Max Score"] ?? 100), values["Due Date"] ?? "", values["File URL"] ?? "", id]
        );
        break;
      }
      case "materials": {
        const subject = values.Subject ? await resolveSubjectByToken(pool, values.Subject) : null;
        await pool.query(
          `
          UPDATE learning_materials
          SET subject_id = $1, subject = $2, uploaded_by = $3, uploaded_by_name = $4, title = $5, file_url = $6, file_type = $7
          WHERE id = $8
        `,
          [subject ? stringValue(subject.id) : "", subject ? stringValue(subject.name) : values.Subject, context?.session.email ?? "", context?.session.name ?? "", values.Title, values["File URL"] ?? "", values["File Type"] ?? "", id]
        );
        break;
      }
      case "attendance": {
        const subject = values.Subject ? await resolveSubjectByToken(pool, values.Subject) : null;
        const student = await resolveStudentByToken(pool, values.Student);
        await pool.query(
          `
          UPDATE attendance_records
          SET student_id = $1, subject_id = $2, student = $3, subject = $4, date = $5, status = $6, recorded_by = $7
          WHERE id = $8
        `,
          [stringValue((student as DbRow | null)?.id), subject ? stringValue(subject.id) : "", values.Student, subject ? stringValue(subject.name) : values.Subject, values.Date ?? "", values.Status ?? "Present", context?.session.email ?? "", id]
        );
        break;
      }
      case "grades": {
        const subject = values.Subject ? await resolveSubjectByToken(pool, values.Subject) : null;
        const student = await resolveStudentByToken(pool, values.Student);
        await pool.query(
          `
          UPDATE grade_records
          SET student_id = $1, subject_id = $2, student = $3, subject = $4, score = $5, semester = $6, entered_by = $7
          WHERE id = $8
        `,
          [stringValue((student as DbRow | null)?.id), subject ? stringValue(subject.id) : "", values.Student, subject ? stringValue(subject.name) : values.Subject, numberValue(values.Score), values.Semester ?? "", context?.session.email ?? "", id]
        );
        break;
      }
      case "payments":
        await pool.query(
          `UPDATE payment_records
           SET student = $1, amount = $2, status = $3, due_date = $4, fee_type = COALESCE(NULLIF($5, ''), fee_type)
           WHERE id = $6`,
          [values.Student, values.Amount, values.Status, values["Due Date"], values["Fee Type"] ?? "", id]
        );
        break;
      case "timetable": {
        const subject = values.Subject ? await resolveSubjectByToken(pool, values.Subject) : null;
        await pool.query(
          `
          UPDATE timetable_slots
          SET subject_id = $1, subject = $2, teacher_id = $3, teacher = $4, class_name = $5, day = $6, time = $7
          WHERE id = $8
        `,
          [subject ? stringValue(subject.id) : "", subject ? stringValue(subject.name) : values.Subject, "", values.Teacher ?? "", values.Class ?? "", values.Day ?? "", values.Time ?? "", id]
        );
        break;
      }
      case "announcements":
        await pool.query(
          `UPDATE announcements
           SET title = $1, content = $2, audience = $3, date = $4
           WHERE id = $5`,
          [values.Title, values.Content, values.Audience, values.Date, id]
        );
        break;
      case "wellbeing":
        await pool.query(
          `UPDATE wellbeing_prompts
           SET question = $1, category = $2, note = $3, date = $4
           WHERE id = $5`,
          [values.Question, values.Category, values.Note, values.Date, id]
        );
        break;
      case "placementQuestions":
        await requirePlacementTeacher(pool, context);
        await pool.query(
          `UPDATE placement_questions
           SET level = $1, question = $2, option_a = $3, option_b = $4, option_c = $5, option_d = $6, answer = $7
           WHERE id = $8`,
          [values.Level, values.Question, values["Option A"], values["Option B"], values["Option C"], values["Option D"], values.Answer, id]
        );
        break;
    }

    return listResource(resource, context ?? { session: { role: "admin", email: "", name: "", avatarUrl: "", source: "neon" }, mode: "summary" });
  } catch (error) {
    if (error instanceof ValidationError) throw error;
    logDatabaseFallback(error);
    return updateLocalResource(resource, id, values);
  }
}
