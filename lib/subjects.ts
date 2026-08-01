import type { Subject } from "@/lib/types";

/**
 * The subjects this school teaches. Deliberately just these four — the wider
 * catalogue that shipped with the template was removed.
 *
 * Row-level access matches on the subject NAME, so renaming an entry here
 * without migrating `students.subjects` silently hides that subject's
 * assignments, materials, attendance, grades and timetable from students.
 */
export const subjectCatalog: Subject[] = [
  { id: "SB-PHY", code: "PHY", name: "Physics", description: "Physics concepts and lab work", category: "Science", gradeLevels: "Grade 8-12", teacherId: null },
  { id: "SB-MATH", code: "MATH", name: "Mathematics", description: "Core mathematics curriculum", category: "Core", gradeLevels: "Grade 7-12", teacherId: null },
  { id: "SB-EN", code: "ENG", name: "English", description: "English language and communication", category: "Language", gradeLevels: "Grade 7-12", teacherId: null },
  { id: "SB-SOC", code: "SOC", name: "Social Studies", description: "Society, culture, and civics", category: "Social Science", gradeLevels: "Grade 7-12", teacherId: null }
];

export const subjectOptions = subjectCatalog.map((subject) => subject.name);

/**
 * What a new student is enrolled in. Currently the whole catalogue, but kept
 * separate on purpose: adding a fifth subject should not retroactively enrol
 * every student in it.
 */
export const defaultStudentSubjects = subjectCatalog.map((subject) => subject.name);

export const defaultStudentSubjectsValue = defaultStudentSubjects.join(", ");
