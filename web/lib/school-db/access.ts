import { Pool } from "pg";
import type { Role } from "@/lib/types";
import { PLACEMENT_SUBJECT, isPlacementSubject } from "@shared/placement";
import { type DbRow, type LocalResourceRow, type QueryRow, type ResourceTable, type SchoolRequestContext, type SchoolResource, ValidationError, csvList, normalizedToken, rawRowValues, resourceColumns, stringValue } from "./base";
import { fetchRawTable, subjectRows } from "./local-store";

export async function allowedSubjectNames(context: SchoolRequestContext) {
  const role = context.session.role;
  const email = context.session.email;

  if (role === "admin") {
    const rows = await subjectRows();
    return new Set(rows.map((row) => normalizedToken(row.name)).filter(Boolean));
  }

  if (role === "teacher") {
    const teachers = await fetchRawTable("teachers");
    const teacher = teachers.find((row) => normalizedToken((row as DbRow).email) === normalizedToken(email));
    return new Set(csvList((teacher as DbRow | undefined)?.subject).map(normalizedToken).filter(Boolean));
  }

  if (role === "student") {
    const students = await fetchRawTable("students");
    const student = students.find((row) => normalizedToken((row as DbRow).email) === normalizedToken(email));
    return new Set(csvList((student as DbRow | undefined)?.subjects).map(normalizedToken).filter(Boolean));
  }

  if (role === "parent") {
    const parents = await fetchRawTable("parents");
    const parent = parents.find((row) => normalizedToken((row as DbRow).email) === normalizedToken(email));
    const studentEmail = normalizedToken((parent as DbRow | undefined)?.student_email);
    if (!studentEmail) return new Set<string>();

    const students = await fetchRawTable("students");
    const student = students.find((row) => normalizedToken((row as DbRow).email) === studentEmail);
    return new Set(csvList((student as DbRow | undefined)?.subjects).map(normalizedToken).filter(Boolean));
  }

  return new Set<string>();
}

function filterByColumnValues(table: ResourceTable, columnName: string, allowedValues: Set<string>) {
  const index = table.columns.findIndex((column) => column.toLowerCase() === columnName.toLowerCase());
  if (index < 0) return { ...table, ids: [], rows: [] };

  const ids: string[] = [];
  const rows: string[][] = [];

  table.rows.forEach((row, rowIndex) => {
    const values = csvList(row[index]).map(normalizedToken);
    const matches = values.some((value) => allowedValues.has(value));
    if (matches) {
      rows.push(row);
      ids.push(table.ids[rowIndex] ?? "");
    }
  });

  return { ...table, ids, rows };
}

/**
 * Resolves the display name of the student a student/parent session is
 * scoped to — the student themself, or the parent's linked child.
 */
/** The student's own row, or a parent's child's row. */
export async function ownStudentRow(role: "student" | "parent", normalizedEmail: string): Promise<DbRow | null> {
  let studentEmail = normalizedEmail;
  if (role === "parent") {
    const parents = await fetchRawTable("parents");
    const parent = parents.find((row) => normalizedToken((row as DbRow).email) === normalizedEmail);
    studentEmail = normalizedToken((parent as DbRow | undefined)?.student_email);
    if (!studentEmail) return null;
  }

  const students = await fetchRawTable("students");
  return (students.find((row) => normalizedToken((row as DbRow).email) === studentEmail) as DbRow | undefined) ?? null;
}

async function ownStudentFullName(role: "student" | "parent", normalizedEmail: string): Promise<string | null> {
  const student = await ownStudentRow(role, normalizedEmail);
  return student ? normalizedToken(student.full_name) : null;
}

async function filterResourceTable(
  resource: SchoolResource,
  table: ResourceTable,
  context: SchoolRequestContext,
  accessibleSubjects: Set<string>,
  allSubjects: DbRow[]
) {
  const role = context.session.role;
  const email = normalizedToken(context.session.email);
  const subjectNameById = (subjectId: string) => {
    const normalized = normalizedToken(subjectId);
    const match = allSubjects.find((row) => normalizedToken((row as DbRow).id) === normalized || normalizedToken((row as DbRow).code) === normalized);
    return normalizedToken(match?.name);
  };

  if (resource === "students") {
    if (role === "admin") return table;
    if (role === "teacher") return filterByColumnValues(table, "Subjects", accessibleSubjects);
    if (role === "student") {
      const index = table.columns.findIndex((column) => column.toLowerCase() === "email");
      if (index < 0) return { ...table, ids: [], rows: [] };
      return {
        ...table,
        ids: table.ids.filter((_, rowIndex) => normalizedToken(table.rows[rowIndex]?.[index]) === email),
        rows: table.rows.filter((row) => normalizedToken(row[index]) === email)
      };
    }
    if (role === "parent") {
      const index = table.columns.findIndex((column) => column.toLowerCase() === "parent email");
      if (index < 0) return { ...table, ids: [], rows: [] };
      return {
        ...table,
        ids: table.ids.filter((_, rowIndex) => normalizedToken(table.rows[rowIndex]?.[index]) === email),
        rows: table.rows.filter((row) => normalizedToken(row[index]) === email)
      };
    }
  }

  if (resource === "teachers") {
    if (role === "admin") return table;
    if (role === "teacher") {
      const index = table.columns.findIndex((column) => column.toLowerCase() === "email");
      if (index < 0) return { ...table, ids: [], rows: [] };
      return {
        ...table,
        ids: table.ids.filter((_, rowIndex) => normalizedToken(table.rows[rowIndex]?.[index]) === email),
        rows: table.rows.filter((row) => normalizedToken(row[index]) === email)
      };
    }
    return { ...table, ids: [], rows: [] };
  }

  if (resource === "parents") {
    if (role === "admin") return table;
    if (role === "parent") {
      const index = table.columns.findIndex((column) => column.toLowerCase() === "email");
      if (index < 0) return { ...table, ids: [], rows: [] };
      return {
        ...table,
        ids: table.ids.filter((_, rowIndex) => normalizedToken(table.rows[rowIndex]?.[index]) === email),
        rows: table.rows.filter((row) => normalizedToken(row[index]) === email)
      };
    }
    return { ...table, ids: [], rows: [] };
  }

  if (resource === "subjects") {
    if (role === "admin") return table;
    const filtered = filterByColumnValues(table, "Name", accessibleSubjects);

    // filterByColumnValues keeps the subjects table's own row order, which
    // has no relation to this student's (or the parent's child's) subjects.
    // accessibleSubjects is a Set built from that student's own CSV field in
    // enrollment order, so re-sort the filtered rows to match it — the
    // subject a student is actually enrolled in first surfaces first,
    // instead of whatever order the subjects table happens to store rows in.
    const nameIndex = filtered.columns.findIndex((column) => column.toLowerCase() === "name");
    if (nameIndex < 0) return filtered;

    const order = Array.from(accessibleSubjects);
    const positions = filtered.rows.map((row) => order.indexOf(normalizedToken(row[nameIndex])));
    const sortedIndices = filtered.rows.map((_, i) => i).sort((a, b) => positions[a] - positions[b]);

    return {
      ...filtered,
      ids: sortedIndices.map((i) => filtered.ids[i]),
      rows: sortedIndices.map((i) => filtered.rows[i])
    };
  }

  if (resource === "placementQuestions") {
    if (role === "admin") return table;
    // A parent has no use for the questions, and seeing them ahead of time
    // would only help coach the child.
    if (role === "parent") return { ...table, ids: [], rows: [] };

    const bySubject = filterByColumnValues(table, "Subject", accessibleSubjects);
    if (role === "teacher") return bySubject;

    // A student sitting the test must never receive the answer key — not
    // even through the generic /api/school route. Grading happens server-side
    // in submitPlacementTest, which reads the raw rows.
    const answerIndex = bySubject.columns.findIndex((column) => column.toLowerCase() === "answer");
    return {
      ...bySubject,
      rows: bySubject.rows.map((row) => row.map((value, index) => (index === answerIndex ? "" : value)))
    };
  }

  if (resource === "assignments" || resource === "materials" || resource === "attendance" || resource === "grades" || resource === "timetable" || resource === "placementResults") {
    if (role === "admin") {
      const subjectId = normalizedToken(context.subjectId);
      if (subjectId) {
        const index = table.columns.findIndex((column) => column.toLowerCase() === "subject");
        if (index >= 0) {
          const targetName = subjectNameById(subjectId);
          const filtered = table.rows.map((row) => normalizedToken(row[index]) === targetName);
          return {
            ...table,
            ids: table.ids.filter((_, rowIndex) => filtered[rowIndex]),
            rows: table.rows.filter((row) => normalizedToken(row[index]) === targetName)
          };
        }
      }
      return table;
    }

    const index = table.columns.findIndex((column) => column.toLowerCase() === "subject");
    if (index < 0) return { ...table, ids: [], rows: [] };

    const subjectFilter = normalizedToken(context.subjectId);
    if (context.mode === "page" && (role === "student" || role === "parent") && !subjectFilter) {
      return { ...table, ids: [], rows: [] };
    }

    // ?subjectId= narrows within the caller's own subjects; it must never widen
    // them, or a teacher could read another subject's grades by changing the URL.
    const requestedSubject = subjectFilter ? subjectNameById(subjectFilter) || subjectFilter : null;
    const allowed = requestedSubject
      ? new Set(accessibleSubjects.has(requestedSubject) ? [requestedSubject] : [])
      : accessibleSubjects;
    const bySubject = filterByColumnValues(table, "Subject", allowed);

    // Subject scoping alone is not enough for per-student records: two
    // students in the same subject would otherwise see each other's grades
    // and attendance. Assignments/materials/timetable stay subject-scoped —
    // they describe the class, not an individual student.
    if ((resource === "attendance" || resource === "grades" || resource === "placementResults") && (role === "student" || role === "parent")) {
      const studentName = await ownStudentFullName(role, email);
      const studentIndex = bySubject.columns.findIndex((column) => column.toLowerCase() === "student");
      if (!studentName || studentIndex < 0) {
        return { ...bySubject, ids: [], rows: [] };
      }

      const ids: string[] = [];
      const rows: string[][] = [];
      bySubject.rows.forEach((row, rowIndex) => {
        if (normalizedToken(row[studentIndex]) === studentName) {
          rows.push(row);
          ids.push(bySubject.ids[rowIndex] ?? "");
        }
      });

      return { ...bySubject, ids, rows };
    }

    return bySubject;
  }

  if (resource === "payments") {
    if (role === "admin") return table;
    if (role === "teacher") return { ...table, ids: [], rows: [] };

    const studentSet = new Set<string>();
    const studentsIndex = table.columns.findIndex((column) => column.toLowerCase() === "student");
    if (studentsIndex < 0) return { ...table, ids: [], rows: [] };

    if (role === "student") {
      const students = await fetchRawTable("students");
      const student = students.find((row) => normalizedToken((row as DbRow).email) === email);
      if (!student) return { ...table, ids: [], rows: [] };
      studentSet.add(normalizedToken((student as DbRow).full_name));
    }

    if (role === "parent") {
      const parents = await fetchRawTable("parents");
      const parent = parents.find((row) => normalizedToken((row as DbRow).email) === email);
      const studentEmail = normalizedToken((parent as DbRow | undefined)?.student_email);
      if (!studentEmail) return { ...table, ids: [], rows: [] };
      const students = await fetchRawTable("students");
      const student = students.find((row) => normalizedToken((row as DbRow).email) === studentEmail);
      if (student) studentSet.add(normalizedToken((student as DbRow).full_name));
    }

    return {
      ...table,
      ids: table.ids.filter((_, rowIndex) => studentSet.has(normalizedToken(table.rows[rowIndex]?.[studentsIndex]))),
      rows: table.rows.filter((row) => studentSet.has(normalizedToken(row[studentsIndex])))
    };
  }

  if (resource === "announcements") {
    if (role === "admin") return table;

    const audienceIndex = table.columns.findIndex((column) => column.toLowerCase() === "audience");
    if (audienceIndex < 0) return table;

    const ids: string[] = [];
    const rows: string[][] = [];
    table.rows.forEach((row, rowIndex) => {
      const targetRole = audienceRole(row[audienceIndex] ?? "");
      if (targetRole === null || targetRole === role) {
        rows.push(row);
        ids.push(table.ids[rowIndex] ?? "");
      }
    });

    return { ...table, ids, rows };
  }

  return table;
}

export async function fetchFilteredTable(resource: SchoolResource, context: SchoolRequestContext) {
  const rawRows = await fetchRawTable(resource);
  const allSubjects = (await subjectRows()) as DbRow[];
  const table: ResourceTable = {
    columns: resourceColumns[resource],
    ids: rawRows.map((row) => stringValue((row as DbRow).id ?? (row as LocalResourceRow).id)),
    rows: rawRows.map((row) => rawRowValues(resource, row))
  };

  const accessibleSubjects = await allowedSubjectNames(context);
  return await filterResourceTable(resource, table, context, accessibleSubjects, allSubjects);
}

function manageRolesFor(resource: SchoolResource) {
  switch (resource) {
    case "students":
    case "teachers":
    case "parents":
    case "subjects":
    case "payments":
    case "wellbeing":
      return new Set<Role>(["admin"]);
    case "attendance":
    case "grades":
    case "assignments":
    case "materials":
    case "timetable":
    case "announcements":
    case "placementQuestions":
    case "placementResults":
      return new Set<Role>(["admin", "teacher"]);
    default:
      return new Set<Role>(["admin"]);
  }
}

/** Resources whose rows belong to one subject; a teacher may only write rows of a subject they teach. */
const teacherSubjectScoped = new Set<SchoolResource>(["assignments", "materials", "timetable", "grades", "attendance"]);

function isTeacherScopedWrite(resource: SchoolResource, context?: SchoolRequestContext): context is SchoolRequestContext {
  return teacherSubjectScoped.has(resource) && context?.session.role === "teacher";
}

/** The teacher's subject names as stored (not normalized), for filling in an omitted subject. */
async function teacherSubjectNames(context: SchoolRequestContext) {
  const teachers = await fetchRawTable("teachers");
  const teacher = teachers.find((row) => normalizedToken((row as DbRow).email) === normalizedToken(context.session.email));
  return csvList((teacher as DbRow | undefined)?.subject);
}

export async function requireOwnSubject(resource: SchoolResource, values: Record<string, string>, context?: SchoolRequestContext) {
  if (!isTeacherScopedWrite(resource, context)) return;

  if (!stringValue(values.Subject).trim() && (resource === "grades" || resource === "attendance")) {
    const own = await teacherSubjectNames(context);
    if (own.length === 1) values.Subject = own[0];
  }

  if (!(await allowedSubjectNames(context)).has(normalizedToken(values.Subject))) {
    throw new ValidationError("You can only add to a subject you teach.");
  }
}

function rowSubject(resource: SchoolResource, row: DbRow | LocalResourceRow) {
  const record = row as Record<string, unknown>;
  if (record.subject !== undefined) return stringValue(record.subject);
  const index = resourceColumns[resource].indexOf("Subject");
  const values = (row as LocalResourceRow).values;
  return index >= 0 && Array.isArray(values) ? stringValue(values[index]) : "";
}

/**
 * Editing or deleting an existing row: the row's current subject must be one the teacher teaches,
 * otherwise a teacher could change or remove another subject's grades by id. A missing row is left to
 * the write itself.
 */
export async function requireOwnExistingRow(resource: SchoolResource, id: string, context?: SchoolRequestContext) {
  if (!isTeacherScopedWrite(resource, context)) return;
  const row = (await fetchRawTable(resource)).find((item) => stringValue(item.id) === id);
  if (!row) return;
  if (!(await allowedSubjectNames(context)).has(normalizedToken(rowSubject(resource, row)))) {
    throw new ValidationError("You can only change records of a subject you teach.");
  }
}

export function requireManageAccess(resource: SchoolResource, role: Role) {
  if (!manageRolesFor(resource).has(role)) {
    throw new Error("You do not have permission to manage this resource.");
  }
}

export async function getAssignedSubjectNameForTeacher(pool: Pool, teacherEmail: string) {
  const result = await pool.query<QueryRow>(
    `
    SELECT s.name
    FROM teachers t
    JOIN subjects s ON s.teacher_id = t.id
    WHERE t.email = $1
    LIMIT 1
  `,
    [teacherEmail]
  );

  return stringValue(result.rows[0]?.name);
}

export function audienceRole(audience: string): Role | null {
  const normalized = audience.trim().toLowerCase();
  if (normalized.includes("teacher") || normalized.includes("багш")) return "teacher";
  if (normalized.includes("student") || normalized.includes("сурагч")) return "student";
  if (normalized.includes("parent") || normalized.includes("эцэг") || normalized.includes("эх")) return "parent";
  return null;
}

export async function requirePlacementTeacher(pool: Pool, context?: SchoolRequestContext) {
  if (context?.session.role !== "teacher") return;

  const assignedSubject = await getAssignedSubjectNameForTeacher(pool, context.session.email);
  if (!isPlacementSubject(assignedSubject)) {
    throw new ValidationError(`Only the ${PLACEMENT_SUBJECT} teacher has permission to manage the placement test.`);
  }
}

/** Results are only ever produced by grading a test, never typed in. */
export function rejectPlacementResultWrite(resource: SchoolResource) {
  if (resource === "placementResults") {
    throw new Error("Placement results are not allowed to be written directly; they come from the student taking the test.");
  }
}


export async function requireSubjectContentAccess(context: SchoolRequestContext, subjectId: string) {
  const role = context.session.role;
  if (role === "admin") return;
  if (role !== "teacher") {
    throw new Error("You do not have permission to do this.");
  }

  const token = normalizedToken(subjectId);
  const subject = ((await subjectRows()) as DbRow[]).find(
    (row) => normalizedToken(row.id) === token || normalizedToken(row.code) === token
  );
  const allowed = await allowedSubjectNames(context);

  if (!subject || !allowed.has(normalizedToken(subject.name))) {
    throw new Error("You do not have permission to manage this subject's content.");
  }
}
