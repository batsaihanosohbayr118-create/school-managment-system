import { subjects } from "@/lib/demo-data";
import { type Language, translateValue } from "@/lib/i18n";
import { FileTooLargeError } from "@/lib/subjectContent";
import { createSchoolResource, deleteSchoolResource, listSchoolResource, updateSchoolResource, type SchoolResourceRequestOptions } from "@/lib/school-api";
import { subjectOptions } from "@/lib/subjects";
import type { NavModule, Role, SubjectContent, SubjectLesson } from "@/lib/types";

/** The web dashboard's resources: one per navigation module. The data layer also has mobile-only ones. */
export type SchoolResource = Exclude<NavModule, "dashboard" | "settings">;

export type ResourceTableData = {
  columns: string[];
  ids?: string[];
  rows: string[][];
};

export type ModalMode = "create" | "edit";

export type DeleteTarget = {
  id: string;
  label: string;
} | null;

export type ActivityNotification = {
  id: string;
  type: "student" | "teacher" | "payment" | "attendance" | "announcement" | "record";
  titleEn: string;
  titleMn: string;
  detailEn: string;
  detailMn: string;
  time: string;
  read: boolean;
};

export type SubjectContentTarget = {
  id: string;
  name: string;
} | null;

export type RevenuePoint = { month: string; revenue: number };
export type AttendanceSlice = { status: string; name: string; value: number; color: string };

/** Every attendance status, in the order the chart and its legend always show them. */
const attendanceStatuses = [
  { status: "present", color: "#2dd4bf", mn: "Ирсэн", en: "Present" },
  { status: "excused", color: "#8b5cf6", mn: "Чөлөөтэй", en: "Excused" },
  { status: "late", color: "#fbbf24", mn: "Хоцорсон", en: "Late" },
  { status: "absent", color: "#fb7185", mn: "Ирээгүй", en: "Absent" }
];

const shortMonthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const weekdayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** Resources each role's dashboard derives its metrics and charts from. */
export const dashboardResources: Record<Role, SchoolResource[]> = {
  admin: ["students", "teachers", "payments", "attendance"],
  teacher: ["attendance", "grades", "timetable", "assignments"],
  student: ["grades", "attendance", "payments", "timetable"],
  parent: ["attendance", "grades", "payments", "announcements"]
};

export const emptyTable: ResourceTableData = { columns: [], ids: [], rows: [] };

export function cellValues(table: ResourceTableData, name: string) {
  const index = table.columns.findIndex((column) => column.toLowerCase() === name.toLowerCase());
  if (index < 0) return [];
  return table.rows.map((row) => (row[index] ?? "").trim());
}

export function countMatching(table: ResourceTableData, name: string, expected: string) {
  return cellValues(table, name).filter((value) => value.toLowerCase() === expected.toLowerCase()).length;
}

export function parseAmount(value: string | undefined) {
  const parsed = parseFloat((value ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Payments are recorded in Mongolian tögrög: 150000 → "150,000₮". */
export function formatTugrik(amount: number) {
  return `${Math.round(amount).toLocaleString("en-US")}₮`;
}

/**
 * Stores a typed payment amount as tögrög. A new payment with no status or due
 * date counts as paid today, so it lands in the revenue chart straight away.
 */
export function normalizePaymentValues(values: Record<string, string>, mode: ModalMode) {
  const next = { ...values };
  if (next.Amount?.trim()) next.Amount = formatTugrik(parseAmount(next.Amount));
  if (mode === "create") {
    if (!next.Status?.trim()) next.Status = "Paid";
    if (!next["Due Date"]?.trim()) next["Due Date"] = new Date().toISOString().slice(0, 10);
    if (!next["Fee Type"]?.trim()) next["Fee Type"] = "Tuition";
  }
  return next;
}

export function averageScore(table: ResourceTableData) {
  const scores = cellValues(table, "Score")
    .map((value) => parseFloat(value.replace(/[^\d.-]/g, "")))
    .filter((value) => Number.isFinite(value));

  if (scores.length === 0) return null;
  return scores.reduce((sum, value) => sum + value, 0) / scores.length;
}

export function attendancePercent(table: ResourceTableData) {
  const total = table.rows.length;
  if (total === 0) return { percent: 0, present: 0, total: 0 };
  const present = countMatching(table, "Status", "Present");
  return { percent: Math.round((present / total) * 100), present, total };
}

/** Dates arrive as free-form TEXT, so accept ISO first and fall back to Date parsing. */
export function toDate(value: string | undefined) {
  const raw = (value ?? "").trim();
  if (!raw) return null;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function monthKey(value: string | undefined) {
  const iso = /^(\d{4})-(\d{2})/.exec((value ?? "").trim());
  if (iso) return `${iso[1]}-${iso[2]}`;
  const parsed = toDate(value);
  if (!parsed) return null;
  return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}`;
}

/** Safe across a 6-month window: no month name can repeat inside it. */
function monthLabel(key: string, language: Language) {
  const monthNumber = Number(key.slice(5, 7));
  if (!monthNumber) return key;
  return language === "mn" ? `${monthNumber}-р сар` : shortMonthNames[monthNumber - 1];
}

/** Paid invoices grouped by due-date month, most recent six months. */
export function buildRevenueSeries(payments: ResourceTableData, language: Language): RevenuePoint[] {
  const dueDates = cellValues(payments, "Due Date");
  const amounts = cellValues(payments, "Amount");
  const statuses = cellValues(payments, "Status");
  if (dueDates.length === 0 || amounts.length === 0) return [];

  const totals = new Map<string, number>();

  dueDates.forEach((dueDate, index) => {
    if (statuses[index] && statuses[index].toLowerCase() !== "paid") return;
    const key = monthKey(dueDate);
    if (!key) return;
    totals.set(key, (totals.get(key) ?? 0) + parseAmount(amounts[index]));
  });

  return [...totals.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([key, revenue]) => ({ month: monthLabel(key, language), revenue }));
}

export function buildAttendanceMix(attendance: ResourceTableData, language: Language): AttendanceSlice[] {
  const counts = new Map<string, number>();

  for (const status of cellValues(attendance, "Status")) {
    if (!status) continue;
    counts.set(status.toLowerCase(), (counts.get(status.toLowerCase()) ?? 0) + 1);
  }

  // All four statuses, zeros included, in a fixed order — a status keeps its
  // place and colour as the numbers move. Anything unrecognised goes last.
  const known = attendanceStatuses.map(({ status, color, mn, en }) => ({
    status,
    name: language === "mn" ? mn : en,
    value: counts.get(status) ?? 0,
    color
  }));
  const other = [...counts.entries()]
    .filter(([status]) => !attendanceStatuses.some((item) => item.status === status))
    .map(([status, value]) => ({ status, name: translateValue(status, language), value, color: "#94a3b8" }));

  return [...known, ...other];
}

export const createConfig: Record<NavModule, { fields: string[] }> = {
  dashboard: { fields: ["Report title", "Date range"] },
  // "Password" provisions the student's login account; the class is set later
  // from the Students table, where it can be changed without a password reset.
  students: { fields: ["Name", "Email", "Password", "Subjects", "Parent name", "Phone", "Payment", "Parent Email"] },
  // "Password" provisions the teacher's login, as it does for students and parents.
  teachers: { fields: ["Name", "Subject", "Email", "Password", "Salary", "Contact"] },
  // "Password" provisions the parent's login, the same way it does for students.
  parents: { fields: ["Name", "Student", "Phone", "Password", "Email"] },
  subjects: { fields: ["Name", "Code", "Description", "Teacher", "Category", "Grade Levels"] },
  assignments: { fields: ["Subject", "Title", "File", "Due Date", "Max Score", "Description"] },
  materials: { fields: ["Subject", "Title", "File"] },
  attendance: { fields: ["Student", "Subject", "Date", "Status"] },
  grades: { fields: ["Student", "Subject", "Score", "Semester"] },
  payments: { fields: ["Student", "Fee Type", "Amount", "Status", "Due Date"] },
  timetable: { fields: ["Day", "Time", "Subject", "Teacher", "Class"] },
  announcements: { fields: ["Title", "Audience", "Content"] },
  wellbeing: { fields: ["Question", "Category", "Note", "Date"] },
  settings: { fields: ["Setting name", "Value"] }
};

export const visibleModulesByRole: Record<Role, NavModule[]> = {
  admin: ["dashboard", "students", "teachers", "parents", "subjects", "assignments", "materials", "payments", "timetable", "announcements", "wellbeing"],
  teacher: ["dashboard", "students", "subjects", "assignments", "materials", "attendance", "timetable", "announcements"],
  student: ["dashboard", "subjects", "assignments", "materials", "attendance", "payments", "timetable", "announcements"],
  parent: ["dashboard", "subjects", "assignments", "materials", "attendance", "payments", "timetable", "announcements"]
};

export const notificationStorageKey = "educore_activity_notifications";
export const parentScopedResources = new Set<SchoolResource>(["attendance", "grades", "payments", "assignments", "materials", "timetable"]);

export function getInitialNotifications(): ActivityNotification[] {
  if (typeof window === "undefined") return [];

  try {
    const storedNotifications = JSON.parse(window.localStorage.getItem(notificationStorageKey) ?? "[]") as Partial<ActivityNotification>[];

    if (!Array.isArray(storedNotifications)) return [];

    return storedNotifications
      .filter((item) => typeof item.id === "string" && typeof item.titleEn === "string" && typeof item.titleMn === "string")
      .map((item) => ({
        id: item.id ?? `notif-${Date.now()}`,
        type: item.type ?? "record",
        titleEn: item.titleEn ?? "",
        titleMn: item.titleMn ?? "",
        detailEn: item.detailEn ?? "",
        detailMn: item.detailMn ?? "",
        time: item.time ?? "",
        read: Boolean(item.read)
      }));
  } catch {
    return [];
  }
}

export function statusTone(status: string) {
  if (["Paid", "Present", "Published", "Ready"].includes(status)) return "emerald";
  if (["Partial", "Late", "Pending"].includes(status)) return "amber";
  if (["Unpaid", "Absent"].includes(status)) return "rose";
  return "blue";
}

export function statusOptionsFor(resource: NavModule, field: string) {
  if ((resource === "teachers" || resource === "grades" || resource === "timetable" || resource === "attendance" || resource === "assignments" || resource === "materials") && field === "Subject") return subjectOptions;
  if (resource === "students" && field === "Payment") return ["Unpaid", "Partial", "Paid"];
  if (resource === "payments" && field === "Status") return ["Unpaid", "Partial", "Paid"];
  if (resource === "payments" && field === "Fee Type") return ["Tuition", "App fee", "Lunch fee"];
  if (resource === "attendance" && field === "Status") return ["Present", "Late", "Absent"];
  if (resource === "wellbeing" && field === "Category") return ["General", "Mood", "Stress", "Sleep", "Friendship", "Family", "Focus"];
  return null;
}

export function emptySubjectContent(subjectId: string): SubjectContent {
  return {
    subjectId,
    topics: [],
    lessons: [],
    assignments: []
  };
}

export function formatFileSize(size: number | undefined) {
  if (!size) return "";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 102.4) / 10} KB`;
  return `${Math.round(size / 1024 / 102.4) / 10} MB`;
}

export function isVideoFile(lesson: SubjectLesson) {
  const fileName = (lesson.fileName ?? lesson.fileUrl ?? "").toLowerCase();
  const fileType = (lesson.fileType ?? "").toLowerCase();

  return fileType.startsWith("video/") || /\.(mp4|webm|ogg|mov|m4v)(\?|#|$)/i.test(fileName);
}

export function videoEmbedUrl(value: string | undefined) {
  if (!value) return "";

  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\./, "");

    if (host === "youtu.be") {
      const videoId = url.pathname.split("/").filter(Boolean)[0];
      return videoId ? `https://www.youtube.com/embed/${videoId}` : "";
    }

    if (host === "youtube.com" || host === "m.youtube.com") {
      const videoId = url.searchParams.get("v");
      if (videoId) return `https://www.youtube.com/embed/${videoId}`;

      const parts = url.pathname.split("/").filter(Boolean);
      if ((parts[0] === "shorts" || parts[0] === "embed") && parts[1]) {
        return `https://www.youtube.com/embed/${parts[1]}`;
      }
    }

    if (host === "vimeo.com") {
      const videoId = url.pathname.split("/").filter(Boolean)[0];
      return videoId ? `https://player.vimeo.com/video/${videoId}` : "";
    }
  } catch {
    return "";
  }

  return "";
}

export function isDirectVideoUrl(value: string | undefined) {
  return Boolean(value && /\.(mp4|webm|ogg|mov|m4v)(\?|#|$)/i.test(value));
}

export function uploadErrorMessage(error: unknown, language: Language, fallback: string) {
  if (!(error instanceof FileTooLargeError)) return fallback;
  const limit = Math.round(error.maxBytes / 1024 / 1024);
  return language === "mn"
    ? `"${error.fileName}" файл хэт том байна. Дээд хэмжээ ${limit}MB.`
    : `"${error.fileName}" is too large. The limit is ${limit}MB.`;
}

export function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#039;"
    };

    return entities[character] ?? character;
  });
}

/**
 * Edit dialogs mirror the resource's table columns. Students are the exception:
 * the class slot carries the password field instead, so an admin can set or
 * reset a student's sign-in from the same place they edit the record.
 */
export function editFieldsFor(module: NavModule, columns: string[]) {
  // A parent's occupation and a teacher's experience are not editable here;
  // those slots set the person's password instead.
  if (module === "parents") return columns.map((column) => (column === "Occupation" ? "Password" : column));
  if (module === "teachers") return columns.map((column) => (column === "Experience" ? "Password" : column));
  // File type and uploader come from the upload itself, not the form.
  if (module === "materials") return ["Subject", "Title", "File"];
  if (module !== "students") return columns;

  // Password is not a table column, so it has no slot of its own — put it
  // beside the email it belongs to.
  const fields = [...columns];
  const emailIndex = fields.indexOf("Email");
  fields.splice(emailIndex < 0 ? fields.length : emailIndex + 1, 0, "Password");
  return fields;
}

export function mergeSubmittedValues(
  data: ResourceTableData,
  recordId: string | null,
  values: Record<string, string>
): ResourceTableData {
  if (!recordId) return data;

  const rowIndex = data.ids?.findIndex((id) => id === recordId) ?? -1;
  if (rowIndex < 0) return data;

  const nextRows = data.rows.map((row, index) => {
    if (index !== rowIndex) return row;

    return data.columns.map((column, columnIndex) => values[column] ?? row[columnIndex] ?? "");
  });

  return { ...data, rows: nextRows };
}

function columnIndex(columns: string[], column: string) {
  return columns.findIndex((item) => item.toLowerCase() === column.toLowerCase());
}

function normalizedLookupValue(value: string | undefined) {
  return (value ?? "").trim().toLowerCase();
}

export function filterRowsByParent(
  data: ResourceTableData,
  resource: SchoolResource,
  parentEmail: string,
  studentData: ResourceTableData | null
) {
  if (!parentScopedResources.has(resource) || !parentEmail || !studentData) return data;

  const normalizedParentEmail = normalizedLookupValue(parentEmail);
  const studentNameIndex = columnIndex(studentData.columns, "Name");
  const studentEmailIndex = columnIndex(studentData.columns, "Email");
  const parentEmailIndex = columnIndex(studentData.columns, "Parent Email");

  if (studentNameIndex < 0 || parentEmailIndex < 0) return { ...data, ids: [], rows: [] };

  const childRows = studentData.rows.filter((row) => normalizedLookupValue(row[parentEmailIndex]) === normalizedParentEmail);
  const childNames = new Set(childRows.map((row) => normalizedLookupValue(row[studentNameIndex])).filter(Boolean));
  const childEmails = new Set(studentEmailIndex >= 0 ? childRows.map((row) => normalizedLookupValue(row[studentEmailIndex])).filter(Boolean) : []);

  const rowStudentIndex = columnIndex(data.columns, "Student");
  const rowStudentEmailIndex = columnIndex(data.columns, "Student Email");

  const nextRows: string[][] = [];
  const nextIds: string[] = [];

  data.rows.forEach((row, index) => {
    const studentName = rowStudentIndex >= 0 ? normalizedLookupValue(row[rowStudentIndex]) : "";
    const studentEmail = rowStudentEmailIndex >= 0 ? normalizedLookupValue(row[rowStudentEmailIndex]) : "";
    const matchesChild = (studentName && childNames.has(studentName)) || (studentEmail && childEmails.has(studentEmail));

    if (matchesChild) {
      nextRows.push(row);
      if (data.ids?.[index]) nextIds.push(data.ids[index]);
    }
  });

  return { ...data, ids: nextIds, rows: nextRows };
}

async function fetchLocalResource(resource: SchoolResource) {
  return listSchoolResource(resource, { mode: "summary" }) as Promise<ResourceTableData>;
}

async function requestLocalResource(
  resource: SchoolResource,
  options: RequestInit & { search?: string } = {}
) {
  const { search = "", ...requestOptions } = options;

  if (requestOptions.method === "DELETE") {
    const id = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search).get("id");
    if (!id) throw new Error("id is required.");
    return deleteSchoolResource(resource, id) as Promise<ResourceTableData>;
  }

  const body = typeof requestOptions.body === "string" ? JSON.parse(requestOptions.body) as { id?: string; values?: Record<string, string> } : null;

  if (requestOptions.method === "PATCH") {
    if (!body?.id) throw new Error("id is required.");
    return updateSchoolResource(resource, body.id, body.values ?? {}) as Promise<ResourceTableData>;
  }

  if (requestOptions.method === "POST") {
    return createSchoolResource(resource, body?.values ?? {}) as Promise<ResourceTableData>;
  }

  return listSchoolResource(resource, { mode: "summary" }) as Promise<ResourceTableData>;
}

export function demoResourceData(resource: SchoolResource): ResourceTableData {
  switch (resource) {
    case "students":
      return {
        columns: ["Name", "Attendance", "GPA", "Payment", "Parent Email"],
        ids: [],
        rows: []
      };
    case "teachers":
      return {
        columns: ["Name", "Subject", "Email", "Experience", "Salary", "Contact"],
        ids: [],
        rows: []
      };
    case "parents":
      return {
        columns: ["Name", "Email", "Student", "Phone", "Occupation"],
        ids: [],
        rows: []
      };
    case "subjects":
      return {
        columns: ["Name", "Code", "Description", "Teacher", "Category", "Grade Levels"],
        ids: subjects.map((item) => item.id),
        rows: subjects.map((item) => [item.name, item.code, item.description, item.teacherId ?? "", item.category, item.gradeLevels])
      };
    case "assignments":
      return {
        columns: ["Subject", "Title", "File", "Due Date", "Max Score", "Description"],
        ids: [],
        rows: []
      };
    case "materials":
      return {
        columns: ["Subject", "Title", "File Type", "Uploaded By", "File"],
        ids: [],
        rows: []
      };
    case "attendance":
      return {
        columns: ["Student", "Subject", "Date", "Status"],
        ids: [],
        rows: []
      };
    case "grades":
      return {
        columns: ["Student", "Subject", "Score", "Semester"],
        ids: [],
        rows: []
      };
    case "payments":
      return {
        columns: ["Student", "Amount", "Status", "Due Date", "Fee Type"],
        ids: [],
        rows: []
      };
    case "timetable":
      return {
        columns: ["Subject", "Day", "Time", "Teacher", "Class"],
        ids: [],
        rows: []
      };
    case "announcements":
      return {
        columns: ["Title", "Content", "Audience", "Date"],
        ids: [],
        rows: []
      };
    case "wellbeing":
      return {
        columns: ["Question", "Category", "Note", "Date"],
        ids: [],
        rows: []
      };
  }
}

export async function fetchFallbackResource(resource: SchoolResource) {
  try {
    return await fetchLocalResource(resource);
  } catch (error) {
    console.warn("Local school API unavailable; using bundled demo data fallback.", error);
    return demoResourceData(resource);
  }
}

export type StudentOption = { value: string; label: string };

/**
 * Students an admin can still attach a parent to. The server rejects any
 * student that already has one, so listing them would only produce an error
 * after the admin picked a name.
 *
 * `keepStudent` is the parent's current student when editing — without it the
 * dropdown could not display the value it already holds.
 */
export async function loadUnlinkedStudents(keepStudent: string): Promise<StudentOption[]> {
  const [studentResult, parentResult] = await Promise.all([
    loadResourceData("students"),
    loadResourceData("parents")
  ]);

  const nameAt = studentResult.data.columns.indexOf("Name");
  const emailAt = studentResult.data.columns.indexOf("Email");
  const linkedAt = parentResult.data.columns.indexOf("Student");
  if (nameAt < 0) return [];

  const keep = keepStudent.trim().toLowerCase();
  const linked = new Set(
    (linkedAt < 0 ? [] : parentResult.data.rows.map((row) => (row[linkedAt] ?? "").trim().toLowerCase()))
      .filter((name) => name && name !== keep)
  );

  return studentResult.data.rows
    .map((row) => ({ name: (row[nameAt] ?? "").trim(), email: emailAt < 0 ? "" : (row[emailAt] ?? "").trim() }))
    .filter((student) => student.name && !linked.has(student.name.toLowerCase()))
    .map((student) => ({
      value: student.name,
      label: student.email ? `${student.name} — ${student.email}` : student.name
    }));
}

export type SubjectScopeOption = { id: string; name: string };

/** Resources a student or parent may only read one subject at a time. */
export const subjectScopedResources = new Set<SchoolResource>(["assignments", "materials"]);
/** Modules a teacher adds to, edits and deletes in, not only reads. */
export const teacherManagedModules = new Set<NavModule>(["attendance", "announcements", "assignments", "materials", "timetable"]);
/** Of those, the ones whose rows belong to a subject — limited to the teacher's own. */
export const teacherSubjectModules = new Set<NavModule>(["assignments", "materials", "timetable"]);

export async function loadResourceData(resource: SchoolResource, options?: SchoolResourceRequestOptions) {
  try {
    return {
      data: await listSchoolResource(resource, options ?? { mode: "summary" }),
      needsLocalParentFilter: false
    };
  } catch (error) {
    console.warn("School resource unavailable; using local school data fallback.", error);
  }

  return { data: await fetchFallbackResource(resource), needsLocalParentFilter: true };
}

export async function saveResourceData(
  resource: SchoolResource,
  mode: ModalMode,
  recordId: string | null,
  values: Record<string, string>
) {
  try {
    return mode === "edit" && recordId
      ? await updateSchoolResource(resource, recordId, values)
      : await createSchoolResource(resource, values);
  } catch (error) {
    console.warn("School save unavailable; using local school data fallback.", error);
  }

  return requestLocalResource(resource, {
    method: mode === "edit" ? "PATCH" : "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ id: recordId, values })
  });
}

export async function deleteResourceData(resource: SchoolResource, recordId: string) {
  try {
    return await deleteSchoolResource(resource, recordId);
  } catch (error) {
    console.warn("School delete unavailable; using local school data fallback.", error);
  }

  return requestLocalResource(resource, {
    method: "DELETE",
    search: `?id=${encodeURIComponent(recordId)}`
  });
}
