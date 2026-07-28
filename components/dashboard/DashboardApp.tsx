"use client";

import { type CSSProperties, type FormEvent, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Bell,
  BookOpen,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  FileUp,
  House,
  LogOut,
  Menu,
  Pencil,
  Plus,
  Printer,
  Search,
  Trash2,
  UserCog,
  Video,
  X
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { WellbeingCorner } from "@/components/dashboard/WellbeingCorner";
import {
  navItems,
  subjects
} from "@/lib/demo-data";
import {
  type AppCopy,
  type Language,
  getInitialLanguage,
  languageStorageKey,
  languages,
  translateColumn,
  translateValue,
  translations
} from "@/lib/i18n";
import { loadSubjectContent, saveSubjectContent, uploadSubjectFiles } from "@/lib/subjectContent";
import {
  createSchoolResource,
  deleteSchoolResource,
  listSchoolResource,
  updateSchoolResource,
  type SchoolResourceRequestOptions
} from "@/lib/school-api";
import { authService } from "@/lib/auth-client";
import { dashboardPathForRole } from "@/lib/auth-flow";
import { defaultStudentSubjectsValue, subjectOptions } from "@/lib/subjects";
import type { NavModule, Role, SubjectAssignment, SubjectContent, SubjectLesson } from "@/lib/types";
import type { SchoolResource } from "@/lib/school-db";

type ResourceTableData = {
  columns: string[];
  ids?: string[];
  rows: string[][];
};

type ModalMode = "create" | "edit";

type DeleteTarget = {
  id: string;
  label: string;
} | null;

type ActivityNotification = {
  id: string;
  type: "student" | "teacher" | "payment" | "attendance" | "announcement" | "record";
  titleEn: string;
  titleMn: string;
  detailEn: string;
  detailMn: string;
  time: string;
  read: boolean;
};

type SubjectContentTarget = {
  id: string;
  name: string;
} | null;

type RevenuePoint = { month: string; revenue: number };
type AttendanceSlice = { name: string; value: number; color: string };

const attendanceStatusColors: Record<string, string> = {
  present: "#10b981",
  late: "#f59e0b",
  absent: "#ef4444",
  excused: "#38bdf8"
};

const shortMonthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const weekdayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** Resources each role's dashboard derives its metrics and charts from. */
const dashboardResources: Record<Role, SchoolResource[]> = {
  admin: ["students", "teachers", "payments", "attendance"],
  teacher: ["attendance", "grades", "timetable", "assignments"],
  student: ["grades", "attendance", "payments", "timetable"],
  parent: ["attendance", "grades", "payments", "announcements"]
};

const emptyTable: ResourceTableData = { columns: [], ids: [], rows: [] };

function cellValues(table: ResourceTableData, name: string) {
  const index = table.columns.findIndex((column) => column.toLowerCase() === name.toLowerCase());
  if (index < 0) return [];
  return table.rows.map((row) => (row[index] ?? "").trim());
}

function countMatching(table: ResourceTableData, name: string, expected: string) {
  return cellValues(table, name).filter((value) => value.toLowerCase() === expected.toLowerCase()).length;
}

function parseAmount(value: string | undefined) {
  const parsed = parseFloat((value ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function averageScore(table: ResourceTableData) {
  const scores = cellValues(table, "Score")
    .map((value) => parseFloat(value.replace(/[^\d.-]/g, "")))
    .filter((value) => Number.isFinite(value));

  if (scores.length === 0) return null;
  return scores.reduce((sum, value) => sum + value, 0) / scores.length;
}

function attendancePercent(table: ResourceTableData) {
  const total = table.rows.length;
  if (total === 0) return { percent: 0, present: 0, total: 0 };
  const present = countMatching(table, "Status", "Present");
  return { percent: Math.round((present / total) * 100), present, total };
}

/** Dates arrive as free-form TEXT, so accept ISO first and fall back to Date parsing. */
function toDate(value: string | undefined) {
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
function buildRevenueSeries(payments: ResourceTableData, language: Language): RevenuePoint[] {
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

function buildAttendanceMix(attendance: ResourceTableData, language: Language): AttendanceSlice[] {
  const counts = new Map<string, number>();

  for (const status of cellValues(attendance, "Status")) {
    if (!status) continue;
    counts.set(status, (counts.get(status) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort(([, a], [, b]) => b - a)
    .map(([status, value]) => ({
      name: translateValue(status, language),
      value,
      color: attendanceStatusColors[status.toLowerCase()] ?? "#6366f1"
    }));
}

const createConfig: Record<NavModule, { fields: string[] }> = {
  dashboard: { fields: ["Report title", "Date range"] },
  // "Password" provisions the student's login account; the class is set later
  // from the Students table, where it can be changed without a password reset.
  students: { fields: ["Name", "Email", "Password", "Subjects", "Parent name", "Phone", "Payment", "Parent Email"] },
  // "Password" provisions the teacher's login, as it does for students and parents.
  teachers: { fields: ["Name", "Subject", "Email", "Password", "Salary", "Contact"] },
  // "Password" provisions the parent's login, the same way it does for students.
  parents: { fields: ["Name", "Student", "Phone", "Password", "Email"] },
  subjects: { fields: ["Name", "Code", "Description", "Teacher", "Category", "Grade Levels"] },
  assignments: { fields: ["Subject", "Title", "Type", "Due Date", "Max Score", "Description"] },
  materials: { fields: ["Subject", "Title", "File Type", "File URL"] },
  attendance: { fields: ["Student", "Subject", "Date", "Status"] },
  grades: { fields: ["Student", "Subject", "Score", "Semester"] },
  payments: { fields: ["Student", "Amount", "Status", "Due Date"] },
  timetable: { fields: ["Day", "Time", "Subject", "Teacher", "Class"] },
  announcements: { fields: ["Title", "Audience", "Content"] },
  wellbeing: { fields: ["Question", "Category", "Note", "Date"] },
  settings: { fields: ["Setting name", "Value"] }
};

const visibleModulesByRole: Record<Role, NavModule[]> = {
  admin: ["dashboard", "students", "teachers", "parents", "subjects", "assignments", "materials", "payments", "timetable", "announcements", "wellbeing"],
  teacher: ["dashboard", "students", "subjects", "assignments", "materials", "attendance", "timetable", "announcements"],
  student: ["dashboard", "subjects", "assignments", "materials", "attendance", "payments", "timetable", "announcements"],
  parent: ["dashboard", "subjects", "assignments", "materials", "attendance", "payments", "timetable", "announcements"]
};

const notificationStorageKey = "educore_activity_notifications";
const parentScopedResources = new Set<SchoolResource>(["attendance", "grades", "payments", "assignments", "materials", "timetable"]);

function getInitialNotifications(): ActivityNotification[] {
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

function statusTone(status: string) {
  if (["Paid", "Present", "Published", "Ready"].includes(status)) return "emerald";
  if (["Partial", "Late", "Pending"].includes(status)) return "amber";
  if (["Unpaid", "Absent"].includes(status)) return "rose";
  return "blue";
}

function statusOptionsFor(resource: NavModule, field: string) {
  if ((resource === "teachers" || resource === "grades" || resource === "timetable" || resource === "attendance" || resource === "assignments" || resource === "materials") && field === "Subject") return subjectOptions;
  if (resource === "students" && field === "Payment") return ["Unpaid", "Partial", "Paid"];
  if (resource === "payments" && field === "Status") return ["Unpaid", "Partial", "Paid"];
  if (resource === "attendance" && field === "Status") return ["Present", "Late", "Absent"];
  if (resource === "wellbeing" && field === "Category") return ["General", "Mood", "Stress", "Sleep", "Friendship", "Family", "Focus"];
  return null;
}

function emptySubjectContent(subjectId: string): SubjectContent {
  return {
    subjectId,
    topics: [],
    lessons: [],
    assignments: []
  };
}

function formatFileSize(size: number | undefined) {
  if (!size) return "";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 102.4) / 10} KB`;
  return `${Math.round(size / 1024 / 102.4) / 10} MB`;
}

function isVideoFile(lesson: SubjectLesson) {
  const fileName = (lesson.fileName ?? lesson.fileUrl ?? "").toLowerCase();
  const fileType = (lesson.fileType ?? "").toLowerCase();

  return fileType.startsWith("video/") || /\.(mp4|webm|ogg|mov|m4v)(\?|#|$)/i.test(fileName);
}

function videoEmbedUrl(value: string | undefined) {
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

function isDirectVideoUrl(value: string | undefined) {
  return Boolean(value && /\.(mp4|webm|ogg|mov|m4v)(\?|#|$)/i.test(value));
}

function escapeHtml(value: string) {
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
function editFieldsFor(module: NavModule, columns: string[]) {
  // A parent's occupation and a teacher's experience are not editable here;
  // those slots set the person's password instead.
  if (module === "parents") return columns.map((column) => (column === "Occupation" ? "Password" : column));
  if (module === "teachers") return columns.map((column) => (column === "Experience" ? "Password" : column));
  if (module !== "students") return columns;

  // Password is not a table column, so it has no slot of its own — put it
  // beside the email it belongs to.
  const fields = [...columns];
  const emailIndex = fields.indexOf("Email");
  fields.splice(emailIndex < 0 ? fields.length : emailIndex + 1, 0, "Password");
  return fields;
}

function mergeSubmittedValues(
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

function filterRowsByParent(
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

function demoResourceData(resource: SchoolResource): ResourceTableData {
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
        columns: ["Subject", "Title", "Type", "Due Date", "Max Score", "Description"],
        ids: [],
        rows: []
      };
    case "materials":
      return {
        columns: ["Subject", "Title", "File Type", "Uploaded By"],
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
        columns: ["Student", "Amount", "Status", "Due Date"],
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

async function fetchFallbackResource(resource: SchoolResource) {
  try {
    return await fetchLocalResource(resource);
  } catch (error) {
    console.warn("Local school API unavailable; using bundled demo data fallback.", error);
    return demoResourceData(resource);
  }
}

type StudentOption = { value: string; label: string };

/**
 * Students an admin can still attach a parent to. The server rejects any
 * student that already has one, so listing them would only produce an error
 * after the admin picked a name.
 *
 * `keepStudent` is the parent's current student when editing — without it the
 * dropdown could not display the value it already holds.
 */
async function loadUnlinkedStudents(keepStudent: string): Promise<StudentOption[]> {
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

type SubjectScopeOption = { id: string; name: string };

/** Resources a student or parent may only read one subject at a time. */
const subjectScopedResources = new Set<SchoolResource>(["assignments", "materials"]);

async function loadResourceData(resource: SchoolResource, options?: SchoolResourceRequestOptions) {
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

async function saveResourceData(
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

async function deleteResourceData(resource: SchoolResource, recordId: string) {
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

function StatusDropdown({
  labels,
  language,
  onChange,
  options,
  placeholder,
  value
}: {
  /** Display text per option, for lists whose value is not self-explanatory. */
  labels?: Record<string, string>;
  language: Language;
  onChange: (value: string) => void;
  options: string[];
  placeholder: string;
  value: string;
}) {
  const [open, setOpen] = useState(false);
  const optionLabel = (option: string) => labels?.[option] ?? translateValue(option, language);
  const selectedLabel = value ? optionLabel(value) : placeholder;

  return (
    <div
      className={`ec-select-field${open ? " open" : ""}`}
      onBlur={(event) => {
        const nextTarget = event.relatedTarget;
        if (!(nextTarget instanceof Node) || !event.currentTarget.contains(nextTarget)) {
          setOpen(false);
        }
      }}
    >
      <button
        aria-expanded={open}
        className={`ec-input ec-select-trigger${value ? " selected" : ""}`}
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span>{selectedLabel}</span>
        <ChevronDown aria-hidden="true" size={18} />
      </button>
      {open ? (
        <div className="ec-select-menu" role="listbox">
          {options.map((option) => {
            const selected = option === value;

            return (
              <button
                aria-selected={selected}
                className={selected ? "selected" : ""}
                key={option}
                onClick={() => {
                  onChange(option);
                  setOpen(false);
                }}
                role="option"
                type="button"
              >
                <span>{optionLabel(option)}</span>
                {selected ? <Check aria-hidden="true" size={16} /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function TopicDropdown({
  onChange,
  options,
  placeholder,
  value
}: {
  onChange: (value: string) => void;
  options: { id: string; label: string }[];
  placeholder: string;
  value: string;
}) {
  const [open, setOpen] = useState(false);
  const selectedOption = options.find((option) => option.id === value);

  return (
    <div
      className={`ec-select-field${open ? " open" : ""}`}
      onBlur={(event) => {
        const nextTarget = event.relatedTarget;
        if (!(nextTarget instanceof Node) || !event.currentTarget.contains(nextTarget)) {
          setOpen(false);
        }
      }}
    >
      <button
        aria-expanded={open}
        className={`ec-input ec-select-trigger${selectedOption ? " selected" : ""}`}
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span>{selectedOption ? selectedOption.label : placeholder}</span>
        <ChevronDown aria-hidden="true" size={18} />
      </button>
      {open ? (
        <div className="ec-select-menu" role="listbox">
          {options.map((option) => {
            const selected = option.id === value;

            return (
              <button
                aria-selected={selected}
                className={selected ? "selected" : ""}
                key={option.id}
                onClick={() => {
                  onChange(option.id);
                  setOpen(false);
                }}
                role="option"
                type="button"
              >
                <span>{option.label}</span>
                {selected ? <Check aria-hidden="true" size={16} /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function AssignmentTypeDropdown({
  language,
  onChange,
  value
}: {
  language: Language;
  onChange: (value: string) => void;
  value: string;
}) {
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement>(null);
  const options = [
    { value: "Homework", labelEn: "Homework", labelMn: "Гэрийн даалгавар" },
    { value: "Quiz", labelEn: "Quiz", labelMn: "Тест" },
    { value: "Project", labelEn: "Project", labelMn: "Төсөл" },
    { value: "Exam", labelEn: "Exam", labelMn: "Шалгалт" }
  ];
  const selected = options.find((option) => option.value === value);
  const selectedLabel = selected ? (language === "mn" ? selected.labelMn : selected.labelEn) : "";

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setMenuStyle({
      position: "fixed",
      top: rect.bottom + 8,
      left: rect.left,
      width: rect.width,
      zIndex: 9999
    });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleClick(event: MouseEvent) {
      if (triggerRef.current && !triggerRef.current.closest(".assignment-type-field")?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const menu = open ? createPortal(
    <div className="ec-select-menu" role="listbox" style={menuStyle}>
      {options.map((option) => {
        const isSelected = option.value === value;
        return (
          <button
            aria-selected={isSelected}
            className={isSelected ? "selected" : ""}
            key={option.value}
            onMouseDown={(event) => {
              event.preventDefault();
              onChange(option.value);
              setOpen(false);
            }}
            role="option"
            type="button"
          >
            <span>{language === "mn" ? option.labelMn : option.labelEn}</span>
            {isSelected ? <Check aria-hidden="true" size={16} /> : null}
          </button>
        );
      })}
    </div>,
    document.body
  ) : null;

  return (
    <div className={`ec-select-field assignment-type-field${open ? " open" : ""}`}>
      <button
        aria-expanded={open}
        className={`ec-input ec-select-trigger${value ? " selected" : ""}`}
        onMouseDown={() => setOpen((current) => !current)}
        ref={triggerRef}
        type="button"
      >
        <span>{selectedLabel}</span>
        <ChevronDown aria-hidden="true" size={18} />
      </button>
      {menu}
    </div>
  );
}

function DatePicker({
  value,
  onChange,
  placeholder
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(() => value ? parseInt(value.split("-")[0]) : new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => value ? parseInt(value.split("-")[1]) - 1 : new Date().getMonth());
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});

  const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const DAYS = ["Su","Mo","Tu","We","Th","Fr","Sa"];

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const popupHeight = 320;
    setMenuStyle({
      position: "fixed",
      left: rect.left,
      width: Math.max(rect.width, 280),
      zIndex: 9999,
      ...(spaceBelow >= popupHeight
        ? { top: rect.bottom + 6 }
        : { bottom: window.innerHeight - rect.top + 6 })
    });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      const clickedInsideTrigger = triggerRef.current?.closest(".ec-datepicker")?.contains(target);
      const clickedInsidePopup = (target as HTMLElement).closest?.(".ec-datepicker-popup");
      if (!clickedInsideTrigger && !clickedInsidePopup) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  function getDaysInMonth(year: number, month: number) {
    return new Date(year, month + 1, 0).getDate();
  }

  function getFirstDayOfMonth(year: number, month: number) {
    return new Date(year, month, 1).getDay();
  }

  function selectDate(day: number) {
    const mm = String(viewMonth + 1).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    onChange(`${viewYear}-${mm}-${dd}`);
    setOpen(false);
  }

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  }

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);
  const selectedDay = value ? parseInt(value.split("-")[2]) : null;
  const selectedMonth = value ? parseInt(value.split("-")[1]) - 1 : null;
  const selectedYear = value ? parseInt(value.split("-")[0]) : null;
  const today = new Date();

  const displayValue = value
    ? new Date(value + "T00:00:00").toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
    : "";

  const popup = open ? createPortal(
    <div className="ec-datepicker-popup dark" style={menuStyle}>
      <div className="ec-datepicker-header">
        <button type="button" onClick={prevMonth}><ChevronLeft size={16} /></button>
        <span>{MONTHS[viewMonth]} {viewYear}</span>
        <button type="button" onClick={nextMonth}><ChevronRight size={16} /></button>
      </div>
      <div className="ec-datepicker-grid">
        {DAYS.map(d => <span key={d} className="ec-datepicker-dayname">{d}</span>)}
        {Array.from({ length: firstDay }).map((_, i) => <span key={`e-${i}`} />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const isSelected = day === selectedDay && viewMonth === selectedMonth && viewYear === selectedYear;
          const isToday = day === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();
          return (
            <button
              key={day}
              type="button"
              className={`ec-datepicker-day${isSelected ? " selected" : ""}${isToday && !isSelected ? " today" : ""}`}
              onClick={() => selectDate(day)}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <div className="ec-datepicker">
      <button
        ref={triggerRef}
        type="button"
        className={`ec-input ec-datepicker-trigger${value ? " has-value" : ""}`}
        onClick={() => {
          if (value) {
            setViewYear(parseInt(value.split("-")[0]));
            setViewMonth(parseInt(value.split("-")[1]) - 1);
          }
          setOpen(o => !o);
        }}
      >
        <span>{displayValue || placeholder || "Select date"}</span>
        {value && (
          <span className="ec-datepicker-clear" onMouseDown={e => { e.stopPropagation(); onChange(""); setOpen(false); }}>
            <X size={14} />
          </span>
        )}
      </button>
      {popup}
    </div>
  );
}

function AppShell({ lockedRole }: { lockedRole: Role }) {
  const router = useRouter();
  const [activeModule, setActiveModule] = useState<NavModule>("dashboard");
  const [role, setRole] = useState<Role>(lockedRole);
  const [language, setLanguage] = useState<Language>("mn");
  const [query, setQuery] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("create");
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);
  const [toast, setToast] = useState("");
  const [authChecked, setAuthChecked] = useState(false);
  const [resourceData, setResourceData] = useState<ResourceTableData | null>(null);
  const [resourceLoading, setResourceLoading] = useState(false);
  const [resourceError, setResourceError] = useState("");
  const [currentUserEmail, setCurrentUserEmail] = useState("");
  const [currentUserName, setCurrentUserName] = useState("");
  const [currentUserAvatar, setCurrentUserAvatar] = useState("");
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [notificationPageOpen, setNotificationPageOpen] = useState(false);
  const [activityNotifications, setActivityNotifications] = useState<ActivityNotification[]>([]);
  const [selectedSubjectContent, setSelectedSubjectContent] = useState<SubjectContentTarget>(null);
  // null while the parent dialog is still loading the student list.
  const [studentOptions, setStudentOptions] = useState<StudentOption[] | null>(null);
  // Students and parents browse assignments/materials one subject at a time.
  const [subjectScopeOptions, setSubjectScopeOptions] = useState<SubjectScopeOption[]>([]);
  const [subjectScope, setSubjectScope] = useState("");

  const activeNav = navItems.find((item) => item.id === activeModule) ?? navItems[0];
  const visibleNavItems = navItems.filter((item) => visibleModulesByRole[role].includes(item.id));
  const copy = translations[language];
  const dashboard = copy.dashboards[role];
  const createCopy = copy.create[activeModule];
  const activeResource: SchoolResource | null = activeModule === "dashboard" || activeModule === "settings" ? null : activeModule;
  const needsSubjectScope = role === "student" || role === "parent";
  const scopeThisResource = needsSubjectScope && activeResource !== null && subjectScopedResources.has(activeResource);
  const activeSubjectName = subjectScopeOptions.find((option) => option.id === subjectScope)?.name ?? "";
  const modalFields = modalMode === "edit" && resourceData ? editFieldsFor(activeModule, resourceData.columns) : createConfig[activeModule].fields;
  const modalTitle = modalMode === "edit" ? `${copy.common.edit} ${copy.recordLabel[activeModule]}` : createCopy.title;
  const modalAction = modalMode === "edit" ? copy.common.saveChanges : createCopy.action;
  const unreadNotifications = activityNotifications.filter((item) => !item.read).length;
  const canManageAttendance = role === "admin" || role === "teacher";
  const canManageActiveModule = activeModule === "attendance" ? canManageAttendance : role === "admin";

  async function logout() {
    authService.signOut();
    router.push("/login");
  }

  async function saveProfile({ name, email, avatarUrl }: { name: string; email: string; avatarUrl: string }) {
    const result = await authService.updateProfile({ name, email, avatarUrl });

    if ("error" in result) {
      setToast(
        result.error === "email-exists"
          ? language === "mn"
            ? "Энэ и-мэйл өөр хэрэглэгчид бүртгэлтэй байна"
            : "That email is already taken"
          : language === "mn"
            ? "Профайл хадгалахад алдаа гарлаа"
            : "Could not save profile"
      );
      return false;
    }

    setCurrentUserEmail(email);
    setCurrentUserName(name);
    setCurrentUserAvatar(avatarUrl);
    setToast(language === "mn" ? "Профайл шинэчлэгдсэн" : "Profile updated");
    return true;
  }

  function openModule(module: NavModule) {
    setActiveModule(module);
    setSelectedSubjectContent(null);
    setNotificationPageOpen(false);
    setMobileOpen(false);
  }

  function openSubjectContent(recordId: string, row: string[]) {
    setSelectedSubjectContent({
      id: recordId,
      name: row[0] ?? recordId
    });
  }

  function addActivityNotification(resource: NavModule, action: "created" | "updated" | "deleted", label: string) {
    const resourceLabels: Record<string, { en: string; mn: string }> = {
      students: { en: "Student", mn: "Сурагч" },
      teachers: { en: "Teacher", mn: "Багш" },
      subjects: { en: "Subject", mn: "Хичээл" },
      attendance: { en: "Attendance", mn: "Ирц" },
      grades: { en: "Grade", mn: "Дүн" },
      payments: { en: "Payment", mn: "Төлбөр" },
      timetable: { en: "Timetable", mn: "Хуваарь" },
      announcements: { en: "Announcement", mn: "Зарлал" },
      wellbeing: { en: "Wellbeing question", mn: "Сэтгэл зүйн асуулт" }
    };
    const actionCopy = {
      created: {
        titleEn: "added",
        titleMn: "нэмэгдлээ",
        detailEn: "was added to the records.",
        detailMn: "бүртгэлд нэмэгдлээ."
      },
      updated: {
        titleEn: "updated",
        titleMn: "шинэчлэгдлээ",
        detailEn: "information was updated.",
        detailMn: "мэдээлэл шинэчлэгдлээ."
      },
      deleted: {
        titleEn: "deleted",
        titleMn: "устгагдлаа",
        detailEn: "was removed from the records.",
        detailMn: "бүртгэлээс устгагдлаа."
      }
    };
    const notificationTypes: Partial<Record<NavModule, ActivityNotification["type"]>> = {
      students: "student",
      teachers: "teacher",
      subjects: "record",
      payments: "payment",
      attendance: "attendance",
      announcements: "announcement"
    };
    const resourceLabel = resourceLabels[resource] ?? { en: "Record", mn: "Бүртгэл" };
    const actionLabel = actionCopy[action];
    const cleanLabel = label.trim();

    setActivityNotifications((current) => [
      {
        id: `notif-${Date.now()}`,
        type: notificationTypes[resource] ?? "record",
        titleEn: `${resourceLabel.en} ${actionLabel.titleEn}`,
        titleMn: `${resourceLabel.mn} ${actionLabel.titleMn}`,
        detailEn: cleanLabel ? `${cleanLabel} ${actionLabel.detailEn}` : `${resourceLabel.en} ${actionLabel.detailEn}`,
        detailMn: cleanLabel ? `${cleanLabel} ${actionLabel.detailMn}` : `${resourceLabel.mn} ${actionLabel.detailMn}`,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        read: false
      },
      ...current
    ]);
  }

  function markAllNotificationsRead() {
    setActivityNotifications((current) => current.map((item) => ({ ...item, read: true })));
  }

  function toggleNotificationRead(id: string) {
    setActivityNotifications((current) => current.map((item) => (item.id === id ? { ...item, read: !item.read } : item)));
  }

  function deleteNotification(id: string) {
    setActivityNotifications((current) => current.filter((item) => item.id !== id));
  }

  useEffect(() => {
    queueMicrotask(() => {
      setLanguage(getInitialLanguage());
      setActivityNotifications(getInitialNotifications());
    });
  }, []);

  useEffect(() => {
    document.documentElement.lang = language === "mn" ? "mn" : "en";
    window.localStorage.setItem(languageStorageKey, language);
  }, [language]);

  useEffect(() => {
    window.localStorage.setItem(notificationStorageKey, JSON.stringify(activityNotifications.slice(0, 50)));
  }, [activityNotifications]);

  function openCreateModal() {
    if (!canManageActiveModule || activeModule === "settings") return;

    setModalMode("create");
    setEditingRecordId(null);
    // Pre-fill the school-wide subject set so a new student can see their
    // assignments and grades without the admin typing catalogue names by hand.
    setFormValues(activeModule === "students" ? { Subjects: defaultStudentSubjectsValue } : {});
    setModalOpen(true);

    if (activeModule === "parents") {
      void refreshStudentOptions("");
    }
  }

  /** Opening the parent dialog is an event, so the fetch belongs here. */
  async function refreshStudentOptions(keepStudent: string) {
    setStudentOptions(null);

    try {
      setStudentOptions(await loadUnlinkedStudents(keepStudent));
    } catch {
      setStudentOptions([]);
    }
  }

  function openEditModal(recordId: string, row: string[], columns: string[]) {
    setModalMode("edit");
    setEditingRecordId(recordId);

    const values = columns.reduce<Record<string, string>>((current, column, index) => {
      current[column] = row[index] ?? "";
      return current;
    }, {});

    // An existing student saved before the default existed has this blank.
    if (activeModule === "students" && !values.Subjects?.trim()) {
      values.Subjects = defaultStudentSubjectsValue;
    }

    setFormValues(values);
    setModalOpen(true);

    if (activeModule === "parents") {
      void refreshStudentOptions(values.Student ?? "");
    }
  }

  function requestDeleteRecord(recordId: string, row: string[]) {
    setDeleteTarget({
      id: recordId,
      label: row[0] ?? "this record"
    });
  }

  async function deleteRecord(recordId: string) {
    if (!activeResource) return;

    try {
      const data = await deleteResourceData(activeResource, recordId);
      setResourceData(data);
      setDeleteTarget(null);
      addActivityNotification(activeResource, "deleted", deleteTarget?.label ?? "");
      setToast(copy.common.recordDeleted);
    } catch {
      setToast(copy.common.deleteFailed);
    }
  }

  const searchableRows = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const rows: { type: string; title: string; meta: string; status: string }[] = [

    ];

    if (!normalized) return rows.slice(0, 5);

    return rows.filter((row) =>
      [row.type, row.title, row.meta, row.status].some((value) => value.toLowerCase().includes(normalized))
    );
  }, [query]);

  useEffect(() => {
    let ignore = false;

    async function checkAuth() {
      await Promise.resolve();
      if (ignore) return;

      const user = authService.getSession();
      if (!user) {
        router.replace("/login");
        return;
      }

      // Route protection: a signed-in user may only view the dashboard that
      // matches their role. Anyone else is bounced to their own dashboard.
      if (user.role !== lockedRole) {
        router.replace(dashboardPathForRole(user.role));
        return;
      }

      setCurrentUserEmail(user.email);
      setCurrentUserName(user.name);
      setCurrentUserAvatar(user.avatarUrl);
      setRole(user.role);
      setActiveModule((currentModule) => (visibleModulesByRole[user.role].includes(currentModule) ? currentModule : "dashboard"));
      setAuthChecked(true);
    }

    checkAuth();

    return () => {
      ignore = true;
    };
  }, [router, lockedRole]);

  // Pull the subjects this student/parent is enrolled in — they become the tabs
  // above assignments and materials.
  useEffect(() => {
    // Nothing to clear on the way out: the tabs only render for the roles that
    // need them, and the role is fixed for the lifetime of the dashboard.
    if (!authChecked || !needsSubjectScope) return;

    let ignore = false;

    listSchoolResource("subjects", { mode: "summary" })
      .then((table) => {
        if (ignore) return;

        const nameIndex = table.columns.findIndex((column) => column.toLowerCase() === "name");
        const options = table.rows
          .map((row, rowIndex) => ({ id: table.ids[rowIndex] ?? "", name: row[nameIndex >= 0 ? nameIndex : 0] ?? "" }))
          .filter((option) => option.id && option.name);

        setSubjectScopeOptions(options);
        setSubjectScope((current) => (options.some((o) => o.id === current) ? current : (options[0]?.id ?? "")));
      })
      .catch(() => {
        if (!ignore) setSubjectScopeOptions([]);
      });

    return () => {
      ignore = true;
    };
  }, [authChecked, needsSubjectScope]);

  useEffect(() => {
    let ignore = false;

    async function loadResource() {
      if (!authChecked) return;

      if (!activeResource) {
        setResourceData(null);
        setResourceError("");
        return;
      }

      // Wait for the subject tabs before asking for a scoped resource — the
      // server rejects a page request that carries no subject.
      if (scopeThisResource && !subjectScope) {
        setResourceData({ columns: [], ids: [], rows: [] });
        setResourceLoading(false);
        return;
      }

      setResourceLoading(true);
      setResourceError("");

      try {
        const result = await loadResourceData(
          activeResource,
          scopeThisResource ? { mode: "page", subjectId: subjectScope } : { mode: "summary" }
        );
        let data = result.data;

        if (result.needsLocalParentFilter && role === "parent" && currentUserEmail && parentScopedResources.has(activeResource)) {
          const studentData = await fetchFallbackResource("students");

          data = filterRowsByParent(data, activeResource, currentUserEmail, studentData);
        }

        if (!ignore) {
          setResourceData(data);
          setResourceError("");
        }
      } catch {
        if (!ignore) {
          setResourceData(demoResourceData(activeResource));
          setResourceError("");
        }
      } finally {
        if (!ignore) {
          setResourceLoading(false);
        }
      }
    }

    loadResource();

    return () => {
      ignore = true;
    };
  }, [activeResource, authChecked, copy.common.databaseOffline, currentUserEmail, role, scopeThisResource, subjectScope]);

  if (!authChecked) {
    return (
      <main className="educore-shell auth-check dark">
        <div className="auth-loading">
          <Image className="ec-loading-logo" src="/logo-mark.png" alt="Nova Mind Academy" width={544} height={420} priority />
          <strong>{copy.app.loadingSession}</strong>
          <span className="ec-spinner" style={{ "--ec-spinner-size": "18px", "--ec-spinner-width": "2px" } as CSSProperties} />
        </div>
      </main>
    );
  }

  return (
    <main className="educore-shell dark">
      <button className={`ec-backdrop${mobileOpen ? " show" : ""}`} onClick={() => setMobileOpen(false)} type="button" />
      <aside className={`ec-sidebar${mobileOpen ? " open" : ""}`}>
        <div className="ec-brand">
          <span className="ec-brand-logo">
            <Image src="/logo-mark.png" alt="Nova Mind Academy" width={544} height={420} priority />
          </span>
          <div>
            <strong>Nova Mind</strong>
            <p>Academy</p>
          </div>
        </div>
        <nav>
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                className={activeModule === item.id ? "active" : ""}
                data-nav-id={item.id}
                key={item.id}
                onClick={() => {
                  openModule(item.id);
                }}
                type="button"
              >
                <Icon size={20} />
                <span>{copy.nav[item.id].label}</span>
              </button>
            );
          })}
          {role === "admin" ? (
            <button
              className="ec-nav-external"
              data-nav-id="users"
              key="users"
              onClick={() => router.push("/admin/users")}
              type="button"
            >
              <UserCog size={20} />
              <span>{language === "mn" ? "Хэрэглэгч удирдах" : "Manage Users"}</span>
            </button>
          ) : null}
        </nav>
      </aside>

      <section className="ec-main">
        <header className={`ec-topbar${activeModule === "settings" ? " settings-topbar" : ""}${notificationPageOpen ? " notifications-topbar" : ""}`} style={activeModule === "subjects" && selectedSubjectContent ? { display: "none" } : undefined}>
          <button className="ec-icon-button mobile-only" onClick={() => setMobileOpen(true)} type="button">
            <Menu size={20} />
          </button>
          <label className="ec-search">
            <Search size={18} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={language === "mn" ? "Хайх" : "Search"} />
          </label>
          <div className={`language-segment${activeModule === "settings" ? " hide-on-settings-mobile" : ""}`} aria-label={copy.common.language}>
            {languages.map((item) => (
              <button className={language === item.id ? "active" : ""} key={item.id} onClick={() => setLanguage(item.id)} type="button">
                {item.label}
              </button>
            ))}
          </div>
          <div className="ec-role-dropdown">
            <div className="ec-role-trigger ec-role-static" aria-label={copy.common.account}>
              <span>{copy.roles[role]}</span>
              <Check size={16} />
            </div>
          </div>
          <button
            className={`ec-icon-button notification-toggle${notificationPageOpen ? " active" : ""}`}
            onClick={() => {
              setNotificationPageOpen(true);
              setMobileOpen(false);
              setQuery("");
              setToast("");
            }}
            type="button"
          >
            <Bell size={19} />
            {unreadNotifications > 0 ? <span className="notification-count">{unreadNotifications}</span> : null}
          </button>
          <button className="ec-icon-button logout-toggle" onClick={logout} type="button" aria-label={copy.common.logout}>
            <LogOut size={19} />
          </button>
        </header>

        {notificationPageOpen ? (
          <NotificationsPage
            canDelete={role === "admin"}
            language={language}
            notifications={activityNotifications}
            onDelete={deleteNotification}
            onToggleRead={toggleNotificationRead}
            onMarkAllRead={markAllNotificationsRead}
            unreadCount={unreadNotifications}
          />
        ) : (
          <>
            <motion.section className="ec-hero" data-module={activeModule} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} style={activeModule === "subjects" && selectedSubjectContent ? { display: "none" } : undefined}>
              <div>
                <p className="mobile-hidden">{copy.nav[activeNav.id].description}</p>
                <h1>{activeModule === "dashboard" ? dashboard.title : copy.nav[activeNav.id].label}</h1>
                <span className="mobile-hidden">{activeModule === "dashboard" ? dashboard.subtitle : (copy.moduleSubtitle as Partial<Record<NavModule, string>>)[activeModule] ?? copy.app.defaultModuleSubtitle}</span>
              </div>
              {activeModule !== "settings" && canManageActiveModule ? (
                <Button className="mobile-hidden" onClick={openCreateModal} type="button">
                  <Plus size={17} />
                  {createCopy.action}
                </Button>
              ) : null}
            </motion.section>

            {activeModule === "dashboard" ? <Dashboard copy={copy} currentUserEmail={currentUserEmail} language={language} role={role} /> : null}
            {activeModule === "students" ? (
              <StudentsModule apiData={resourceData} canManage={role === "admin"} copy={copy} error={resourceError} language={language} loading={resourceLoading} onAdd={openCreateModal} onDelete={requestDeleteRecord} onEdit={openEditModal} />
            ) : null}
            {activeModule === "teachers" ? (
              <TeachersModule apiData={resourceData} canManage={role === "admin"} copy={copy} error={resourceError} language={language} loading={resourceLoading} onAdd={openCreateModal} onDelete={requestDeleteRecord} onEdit={openEditModal} />
            ) : null}
            {activeModule === "parents" ? (
              <ParentsModule apiData={resourceData} canManage={role === "admin"} copy={copy} error={resourceError} language={language} loading={resourceLoading} onAdd={openCreateModal} onDelete={requestDeleteRecord} onEdit={openEditModal} />
            ) : null}
            {activeModule === "subjects" ? (
              selectedSubjectContent ? (
                <SubjectContentPanel
                  canManage={role === "admin" || role === "teacher"}
                  language={language}
                  subject={selectedSubjectContent}
                  onBack={() => setSelectedSubjectContent(null)}
                  onSaved={(label) => {
                    addActivityNotification("subjects", "updated", label);
                    setToast(language === "mn" ? "Хичээлийн агуулга хадгалагдлаа" : "Subject content saved");
                  }}
                />
              ) : (
                <SubjectsModule
                  apiData={resourceData}
                  canManage={role === "admin"}
                  copy={copy}
                  error={resourceError}
                  language={language}
                  loading={resourceLoading}
                  onAdd={openCreateModal}
                  onDelete={requestDeleteRecord}
                  onEdit={openEditModal}
                  onOpenContent={openSubjectContent}
                />
              )
            ) : null}
            {activeModule === "assignments" || activeModule === "materials" ? (
              <>
                {scopeThisResource ? (
                  <SubjectScopeTabs language={language} onChange={setSubjectScope} options={subjectScopeOptions} value={subjectScope} />
                ) : null}
                {subjectScopeOptions.length === 0 && scopeThisResource ? null : activeModule === "assignments" ? (
                  <AssignmentsModule apiData={resourceData} canManage={role === "admin"} copy={copy} error={resourceError} language={language} loading={resourceLoading} onAdd={openCreateModal} onDelete={requestDeleteRecord} onEdit={openEditModal} scopeLabel={scopeThisResource ? activeSubjectName : ""} />
                ) : (
                  <MaterialsModule apiData={resourceData} canManage={role === "admin"} copy={copy} error={resourceError} language={language} loading={resourceLoading} onAdd={openCreateModal} onDelete={requestDeleteRecord} onEdit={openEditModal} scopeLabel={scopeThisResource ? activeSubjectName : ""} />
                )}
              </>
            ) : null}
            {activeModule === "attendance" ? (
              <AttendanceModule apiData={resourceData} canManage={canManageAttendance} copy={copy} error={resourceError} language={language} loading={resourceLoading} onAdd={openCreateModal} onDelete={requestDeleteRecord} onEdit={openEditModal} />
            ) : null}
            {activeModule === "grades" ? (
              <GradesModule apiData={resourceData} canManage={role === "admin"} copy={copy} error={resourceError} language={language} loading={resourceLoading} onAdd={openCreateModal} onDelete={requestDeleteRecord} onEdit={openEditModal} />
            ) : null}
            {activeModule === "payments" ? (
              <PaymentsModule apiData={resourceData} canManage={role === "admin"} copy={copy} error={resourceError} language={language} loading={resourceLoading} onAdd={openCreateModal} onDelete={requestDeleteRecord} onEdit={openEditModal} />
            ) : null}
            {activeModule === "timetable" ? (
              <TimetableModule apiData={resourceData} canManage={role === "admin"} copy={copy} error={resourceError} language={language} loading={resourceLoading} onAdd={openCreateModal} onDelete={requestDeleteRecord} onEdit={openEditModal} />
            ) : null}
            {activeModule === "announcements" ? (
              <AnnouncementsModule apiData={resourceData} canManage={role === "admin"} copy={copy} error={resourceError} language={language} loading={resourceLoading} onAdd={openCreateModal} onDelete={requestDeleteRecord} onEdit={openEditModal} />
            ) : null}
            {activeModule === "wellbeing" ? (
              <WellbeingModule apiData={resourceData} canManage={role === "admin"} copy={copy} error={resourceError} language={language} loading={resourceLoading} onAdd={openCreateModal} onDelete={requestDeleteRecord} onEdit={openEditModal} />
            ) : null}
            {activeModule === "settings" ? (
              <SettingsModule
                copy={copy}
                currentUserAvatar={currentUserAvatar}
                currentUserEmail={currentUserEmail}
                currentUserName={currentUserName}
                language={language}
                logout={logout}
                onSaveProfile={saveProfile}
                role={role}
                setLanguage={setLanguage}
              />
            ) : null}

            {activeModule !== "settings" && query.trim() ? (
              <Card className="search-panel">
                <CardHeader>
                  <CardTitle>{copy.common.searchResults}</CardTitle>
                  <Button variant="ghost" onClick={() => setQuery("")} type="button">
                    {copy.common.clear}
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="activity-list">
                    {searchableRows.map((row) => (
                      <div className="activity-row" key={`${row.type}-${row.title}`}>
                        <span>{translateValue(row.type, language)}</span>
                        <strong>{row.title}</strong>
                        <p>{translateValue(row.meta, language)}</p>
                        <Badge tone={statusTone(row.status)}>{translateValue(row.status, language)}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : null}
          </>
        )}
      </section>

      {role === "student" ? <WellbeingCorner copy={copy} /> : null}

      {modalOpen ? (
        <div className="modal-layer">
          <form
            className="record-modal"
            onSubmit={async (event) => {
              event.preventDefault();

              if (!activeResource) {
                setModalOpen(false);
                setToast(createCopy.action);
                return;
              }

              try {
                const data = await saveResourceData(activeResource, modalMode, editingRecordId, formValues);
                const nextData = modalMode === "edit" ? mergeSubmittedValues(data, editingRecordId, formValues) : data;

                addActivityNotification(activeResource, modalMode === "edit" ? "updated" : "created", Object.values(formValues).find(Boolean) ?? "");
                setResourceData(nextData);
                setFormValues({});
                setEditingRecordId(null);
                setModalOpen(false);
                setToast(modalMode === "edit" ? copy.common.recordUpdated : copy.common.savedToDatabase(createCopy.action));
              } catch (error) {
                setToast(error instanceof Error && error.message ? `${copy.common.databaseSaveFailed}: ${error.message}` : copy.common.databaseSaveFailed);
              }
            }}
          >
            <div className="modal-header">
              <strong>{modalTitle}</strong>
              <button aria-label={copy.common.closeModal} onClick={() => setModalOpen(false)} type="button">
                <X size={18} />
              </button>
            </div>
            {modalFields.map((field, index) => {
              // A parent is attached to a student who does not have one yet, so
              // that field is a live list rather than a typed name.
              const picksStudent = activeModule === "parents" && field === "Student";
              const options = picksStudent
                ? (studentOptions ?? []).map((student) => student.value)
                : statusOptionsFor(activeModule, field);

              return options ? (
                <div className="record-field" key={field}>
                  <span>{translateColumn(field, language)}</span>
                  <StatusDropdown
                    labels={picksStudent ? Object.fromEntries((studentOptions ?? []).map((s) => [s.value, s.label])) : undefined}
                    language={language}
                    onChange={(value) => setFormValues((current) => ({ ...current, [field]: value }))}
                    options={options}
                    placeholder={picksStudent && studentOptions === null ? copy.common.loadingStudents : translateColumn(field, language)}
                    value={formValues[field] ?? ""}
                  />
                  {picksStudent && studentOptions?.length === 0 ? (
                    <small className="record-hint">{copy.common.noUnlinkedStudents}</small>
                  ) : null}
                </div>
              ) : (
                <label className="record-field" key={field}>
                  <span>{translateColumn(field, language)}</span>
                  <Input
                    autoComplete={field === "Password" ? "new-password" : undefined}
                    onChange={(event) => setFormValues((current) => ({ ...current, [field]: event.target.value }))}
                    placeholder={translateColumn(field, language)}
                    required={index === 0}
                    type={field === "Password" ? "password" : "text"}
                    value={formValues[field] ?? ""}
                  />
                </label>
              );
            })}
            <Button type="submit">
              <Check size={17} />
              {modalAction}
            </Button>
          </form>
        </div>
      ) : null}

      {deleteTarget ? (
        <div className="modal-layer">
          <div className="delete-modal" role="dialog" aria-modal="true" aria-labelledby="delete-title">
            <div className="delete-icon">
              <Trash2 size={20} />
            </div>
            <div>
              <strong id="delete-title">{copy.common.deleteRecord}</strong>
              <p>{copy.common.deleteWarning(deleteTarget.label)}</p>
            </div>
            <div className="delete-actions">
              <Button variant="ghost" onClick={() => setDeleteTarget(null)} type="button">
                {copy.common.cancel}
              </Button>
              <Button variant="danger" onClick={() => deleteRecord(deleteTarget.id)} type="button">
                <Trash2 size={16} />
                {copy.common.delete}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {toast ? (
        <button className="toast" onClick={() => setToast("")} type="button">
          <Check size={17} />
          {toast}
        </button>
      ) : null}

      <nav className="mobile-bottom-nav" aria-label={copy.app.mobileNavigation}>
        <button
          className={!notificationPageOpen && activeModule === "dashboard" ? "active" : ""}
          onClick={() => {
            openModule("dashboard");
          }}
          type="button"
        >
          <House size={20} />
          <span>{language === "mn" ? "Нүүр" : "Home"}</span>
        </button>
        <button
          className={notificationPageOpen ? "active" : ""}
          onClick={() => {
            setNotificationPageOpen(true);
            setMobileOpen(false);
            setQuery("");
          }}
          type="button"
        >
          <Bell size={20} />
          {unreadNotifications > 0 ? <span className="notification-count">{unreadNotifications}</span> : null}
          <span>{language === "mn" ? "Мэдэгдэл" : "Notification"}</span>
        </button>
      </nav>
    </main>
  );
}

function NotificationsPage({
  canDelete,
  language,
  notifications,
  onDelete,
  onMarkAllRead,
  onToggleRead,
  unreadCount
}: {
  canDelete: boolean;
  language: Language;
  notifications: ActivityNotification[];
  onDelete: (id: string) => void;
  onMarkAllRead: () => void;
  onToggleRead: (id: string) => void;
  unreadCount: number;
}) {
  return (
    <section className="notification-page">
      <div className="notification-page-header">
        <div>
          <h2>{language === "mn" ? "Мэдэгдэл" : "Notifications"}</h2>
          <p>{language === "mn" ? `${unreadCount} уншаагүй мэдэгдэл` : `${unreadCount} unread notifications`}</p>
        </div>
        <button disabled={unreadCount === 0} onClick={onMarkAllRead} type="button">
          {language === "mn" ? "Бүгдийг уншсан" : "Mark all read"}
        </button>
      </div>
      {notifications.length > 0 ? (
        <div className="notification-list">
          {notifications.map((item) => (
            <article className="notification-card" data-read={item.read ? "true" : "false"} data-type={item.type} key={item.id}>
              <button className="notification-content" onClick={() => onToggleRead(item.id)} type="button">
                <div>
                  {!item.read ? <span>{language === "mn" ? "Шинэ" : "New"}</span> : null}
                  <strong>{language === "mn" ? item.titleMn : item.titleEn}</strong>
                  <p>{language === "mn" ? item.detailMn : item.detailEn}</p>
                </div>
              </button>
              <time>{item.time}</time>
              {canDelete ? (
                <button
                  aria-label={language === "mn" ? "Мэдэгдэл устгах" : "Delete notification"}
                  className="notification-delete"
                  onClick={() => onDelete(item.id)}
                  type="button"
                >
                  <Trash2 size={15} />
                </button>
              ) : null}
            </article>
          ))}
        </div>
      ) : (
        <div className="notification-empty">
          <span aria-hidden="true" />
          <strong>{language === "mn" ? "Одоогоор шинэ мэдэгдэл алга" : "No notifications yet"}</strong>
          <p>{language === "mn" ? "Сурагч, багш, төлбөр зэрэг бүртгэл дээр үйлдэл хийхэд энд автоматаар нэмэгдэнэ." : "Student, teacher, payment, and other record actions will appear here automatically."}</p>
        </div>
      )}
    </section>
  );
}

function Dashboard({ copy, currentUserEmail, language, role }: { copy: AppCopy; currentUserEmail: string; language: Language; role: Role }) {
  const dashboard = copy.dashboards[role];
  const [liveStats, setLiveStats] = useState<string[][] | null>(null);
  const [revenueSeries, setRevenueSeries] = useState<RevenuePoint[]>([]);
  const [attendanceMix, setAttendanceMix] = useState<AttendanceSlice[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function fetchCounts() {
      const s = dashboard.stats;
      const mn = language === "mn";
      const stat = (index: number, value: string, helper: string) => [s[index]?.[0] ?? "", value, helper];

      try {
        const resources = dashboardResources[role];
        const loaded = await Promise.all(resources.map((resource) => loadResourceData(resource)));
        if (cancelled) return;

        const tables = new Map<SchoolResource, ResourceTableData>(
          resources.map((resource, index) => [resource, loaded[index].data])
        );
        const table = (resource: SchoolResource) => tables.get(resource) ?? emptyTable;

        const payments = table("payments");
        const attendance = table("attendance");
        const grades = table("grades");

        const series = buildRevenueSeries(payments, language);
        setRevenueSeries(series);
        setAttendanceMix(buildAttendanceMix(attendance, language));

        const { percent: attPct, present, total: attTotal } = attendancePercent(attendance);
        const attendanceHelper = attTotal > 0
          ? (mn ? `${attTotal} бүртгэлээс ${present}` : `${present} of ${attTotal} records`)
          : (mn ? "Бүртгэл алга" : "No records yet");

        const statuses = cellValues(payments, "Status");
        const amounts = cellValues(payments, "Amount");
        const sumWhereStatus = (expected: string) =>
          amounts.reduce((sum, amount, index) => (statuses[index]?.toLowerCase() === expected ? sum + parseAmount(amount) : sum), 0);
        const paidTotal = sumWhereStatus("paid");
        const unpaidCount = countMatching(payments, "Status", "Unpaid");

        const semesters = cellValues(grades, "Semester").filter(Boolean);
        const latestSemester = semesters.length > 0 ? semesters[semesters.length - 1] : "";
        const gradeHelper = latestSemester || (mn ? `${grades.rows.length} дүн` : `${grades.rows.length} grades`);
        const avg = averageScore(grades);
        const gpa = avg === null ? "0.0" : (avg / 25).toFixed(1);

        if (role === "admin") {
          const students = table("students");
          const teachers = table("teachers");
          const withLogin = countMatching(students, "Payment", "Paid");
          const subjectCount = new Set(
            cellValues(teachers, "Subject").flatMap((value) => value.split(",").map((item) => item.trim())).filter(Boolean)
          ).size;

          // Month-over-month revenue change, only claimed when two months exist.
          const previous = series.length >= 2 ? series[series.length - 2].revenue : 0;
          const current = series.length >= 1 ? series[series.length - 1].revenue : 0;
          const revenueHelper = series.length >= 2 && previous > 0
            ? `${current >= previous ? "+" : ""}${(((current - previous) / previous) * 100).toFixed(1)}%${mn ? " өмнөх сараас" : " vs last month"}`
            : (mn ? `${countMatching(payments, "Status", "Paid")} төлөгдсөн` : `${countMatching(payments, "Status", "Paid")} paid`);

          setLiveStats([
            stat(0, students.rows.length.toString(), mn ? `${withLogin} төлсөн` : `${withLogin} paid`),
            stat(1, teachers.rows.length.toString(), mn ? `${subjectCount} хичээл` : `${subjectCount} subjects`),
            stat(2, `$${paidTotal.toLocaleString()}`, revenueHelper),
            stat(3, `${attPct}%`, attendanceHelper)
          ]);
        }

        if (role === "teacher") {
          const timetable = table("timetable");
          const assignments = table("assignments");
          const today = weekdayNames[new Date().getDay()];
          const todayClasses = countMatching(timetable, "Day", today);
          const dueDates = cellValues(assignments, "Due Date");
          const startOfToday = new Date();
          startOfToday.setHours(0, 0, 0, 0);
          const pastDue = dueDates.filter((value) => {
            const due = toDate(value);
            return due !== null && due < startOfToday;
          }).length;

          setLiveStats([
            stat(0, todayClasses.toString(), mn ? `${timetable.rows.length} долоо хоногт` : `${timetable.rows.length} weekly`),
            stat(1, `${attPct}%`, attendanceHelper),
            stat(2, assignments.rows.length.toString(), mn ? `${pastDue} хугацаа хэтэрсэн` : `${pastDue} past due`),
            stat(3, avg === null ? "0%" : `${Math.round(avg)}%`, gradeHelper)
          ]);
        }

        if (role === "student") {
          const timetable = table("timetable");
          const today = weekdayNames[new Date().getDay()];
          const todayClasses = countMatching(timetable, "Day", today);
          const payStatus = payments.rows.length === 0
            ? (mn ? "Нэхэмжлэх алга" : "No invoices")
            : unpaidCount === 0
              ? (mn ? "Төлсөн" : "Paid")
              : (mn ? `${unpaidCount} төлөөгүй` : `${unpaidCount} unpaid`);

          setLiveStats([
            stat(0, gpa, gradeHelper),
            stat(1, `${attPct}%`, attendanceHelper),
            stat(2, todayClasses.toString(), mn ? `${today} өдөр` : today),
            stat(3, payStatus, mn ? `${payments.rows.length} нэхэмжлэх` : `${payments.rows.length} invoices`)
          ]);
        }

        if (role === "parent") {
          const announcements = table("announcements");
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          const recent = cellValues(announcements, "Date").filter((value) => {
            const posted = toDate(value);
            return posted !== null && posted >= weekAgo;
          }).length;
          const openPayments = sumWhereStatus("unpaid");

          setLiveStats([
            stat(0, `${attPct}%`, attendanceHelper),
            stat(1, gpa, gradeHelper),
            stat(2, `$${openPayments.toLocaleString()}`, mn ? `${unpaidCount} төлөөгүй` : `${unpaidCount} unpaid`),
            stat(3, announcements.rows.length.toString(), mn ? `${recent} шинэ` : `${recent} this week`)
          ]);
        }
      } catch {
        // Leave the neutral placeholders from i18n in place rather than inventing numbers.
      }
    }

    fetchCounts();

    return () => {
      cancelled = true;
    };
  }, [role, language, dashboard.stats]);

  const displayStats = liveStats ?? dashboard.stats;
  const attendanceTotal = attendanceMix.reduce((sum, slice) => sum + slice.value, 0);

  return (
    <>
      <section className="metric-grid">
        {displayStats.map(([label, value, helper]) => (
          <Card className="metric-card" key={label}>
            <p>{label}</p>
            <strong>{value}</strong>
            <span>{helper}</span>
          </Card>
        ))}
      </section>
      <section className="analytics-grid">
        <Card>
          <CardHeader>
            <CardTitle>{language === "mn" ? "Орлогын анализ" : "Revenue Analytics"}</CardTitle>
            <Badge tone="blue">{copy.common.live}</Badge>
          </CardHeader>
          <CardContent className="chart-box">
            {revenueSeries.length === 0 ? (
              <div className="table-empty">
                <strong>{language === "mn" ? "Төлбөрийн бүртгэл алга" : "No payment records yet"}</strong>
                <p>
                  {language === "mn"
                    ? "Төлөгдсөн нэхэмжлэх бүртгэгдсэний дараа сарын орлого энд харагдана."
                    : "Monthly revenue appears here once paid invoices are recorded."}
                </p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={revenueSeries}>
                  <defs>
                    <linearGradient id="revenue" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.32)" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid rgba(148, 163, 184, 0.3)", borderRadius: 14, color: "#e5eefc" }} />
                  <Area dataKey="revenue" fill="url(#revenue)" stroke="#4f46e5" strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{language === "mn" ? "Ирцийн бүтэц" : "Attendance Mix"}</CardTitle>
            <Badge tone="emerald">
              {attendanceTotal} {language === "mn" ? "бүртгэл" : attendanceTotal === 1 ? "record" : "records"}
            </Badge>
          </CardHeader>
          <CardContent className="chart-box">
            {attendanceMix.length === 0 ? (
              <div className="table-empty">
                <strong>{language === "mn" ? "Ирцийн бүртгэл алга" : "No attendance records yet"}</strong>
                <p>
                  {language === "mn"
                    ? "Ирц бүртгэж эхэлмэгц ирсэн, хоцорсон, тасалсны харьцаа энд харагдана."
                    : "The present, late and absent split shows up here once attendance is marked."}
                </p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={attendanceMix} dataKey="value" innerRadius={62} outerRadius={90} paddingAngle={5}>
                    {attendanceMix.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid rgba(148, 163, 184, 0.3)", borderRadius: 14, color: "#e5eefc" }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </section>
    </>
  );
}

function StudentsModule({ apiData, copy, error, language, loading, ...controls }: ModuleApiProps) {
  return (
    <ModuleTable
      apiData={apiData}
      copy={copy}
      error={error}
      language={language}
      loading={loading}
      title={copy.tables.students}
      columns={["Name", "Email", "Subjects", "Attendance", "GPA", "Payment", "Parent Email"]}
      rows={[]}
      {...controls}
    />
  );
}

function TeachersModule({ apiData, copy, error, language, loading, ...controls }: ModuleApiProps) {
  return (
    <ModuleTable
      apiData={apiData}
      copy={copy}
      error={error}
      language={language}
      loading={loading}
      title={copy.tables.teachers}
      columns={["Name", "Email", "Subject", "Experience", "Salary", "Contact"]}
      rows={[]}
      {...controls}
    />
  );
}

function ParentsModule({ apiData, copy, error, language, loading, ...controls }: ModuleApiProps) {
  return (
    <ModuleTable
      apiData={apiData}
      copy={copy}
      error={error}
      language={language}
      loading={loading}
      title={copy.tables.parents}
      columns={["Name", "Email", "Student", "Phone", "Occupation"]}
      rows={[]}
      {...controls}
    />
  );
}

function SubjectsModule({
  apiData,
  copy,
  error,
  language,
  loading,
  onOpenContent,
  ...controls
}: ModuleApiProps & { onOpenContent: (recordId: string, row: string[]) => void }) {
  return (
    <ModuleTable
      apiData={apiData}
      copy={copy}
      error={error}
      language={language}
      loading={loading}
      title={copy.tables.subjects}
      columns={["Name", "Code", "Description", "Teacher", "Category", "Grade Levels"]}
      rows={subjects.map((item) => [item.name, item.code, item.description, item.teacherId ?? "", item.category, item.gradeLevels])}
      contentActionLabel={language === "mn" ? "Агуулга нээх" : "Open content"}
      onOpenContent={onOpenContent}
      {...controls}
    />
  );
}

/** Subject picker shown to students and parents above scoped resources. */
function SubjectScopeTabs({
  options,
  value,
  onChange,
  language
}: {
  options: SubjectScopeOption[];
  value: string;
  onChange: (id: string) => void;
  language: Language;
}) {
  if (options.length === 0) {
    return (
      <Card>
        <CardContent>
          <div className="table-empty">
            <strong>{language === "mn" ? "Хичээл олдсонгүй" : "No subjects yet"}</strong>
            <p>
              {language === "mn"
                ? "Та ямар нэг хичээлд бүртгэгдсэний дараа энд харагдана."
                : "Once you are enrolled in a subject it will show up here."}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="subject-scope-tabs" role="tablist">
      {options.map((option) => (
        <button
          aria-selected={option.id === value}
          className={option.id === value ? "active" : ""}
          key={option.id}
          onClick={() => onChange(option.id)}
          role="tab"
          type="button"
        >
          {translateValue(option.name, language)}
        </button>
      ))}
    </div>
  );
}

function AssignmentsModule({ apiData, copy, error, language, loading, scopeLabel, ...controls }: ModuleApiProps & { scopeLabel?: string }) {
  return (
    <ModuleTable
      apiData={apiData}
      copy={copy}
      error={error}
      language={language}
      loading={loading}
      title={scopeLabel ? `${copy.tables.assignments} — ${translateValue(scopeLabel, language)}` : copy.tables.assignments}
      columns={["Subject", "Title", "Type", "Due Date", "Max Score", "Description"]}
      rows={[]}
      {...controls}
    />
  );
}

function MaterialsModule({ apiData, copy, error, language, loading, scopeLabel, ...controls }: ModuleApiProps & { scopeLabel?: string }) {
  return (
    <ModuleTable
      apiData={apiData}
      copy={copy}
      error={error}
      language={language}
      loading={loading}
      title={scopeLabel ? `${copy.tables.materials} — ${translateValue(scopeLabel, language)}` : copy.tables.materials}
      columns={["Subject", "Title", "File Type", "Uploaded By"]}
      rows={[]}
      {...controls}
    />
  );
}

function SubjectContentPanel({
  canManage,
  language,
  subject,
  onBack,
  onSaved
}: {
  canManage: boolean;
  language: Language;
  subject: Exclude<SubjectContentTarget, null>;
  onBack: () => void;
  onSaved: (label: string) => void;
}) {
  const [content, setContent] = useState<SubjectContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [activeView, setActiveView] = useState<"overview" | "topics" | "lessons" | "videos" | "assignments">("overview");
  const [topicForm, setTopicForm] = useState({ title: "", description: "" });
  const [lessonForm, setLessonForm] = useState({ title: "", topicId: "", duration: "", objectives: "" });
  const [videoForm, setVideoForm] = useState({ title: "", topicId: "", duration: "", videoUrl: "" });
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [assignmentForm, setAssignmentForm] = useState({ title: "", dueDate: "", maxScore: "", type: "Homework", description: "" });
  const [activeEditorTab, setActiveEditorTab] = useState<"file" | "topic" | "lesson" | "video" | "assignment" | null>(null);
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [editingVideoId, setEditingVideoId] = useState<string | null>(null);
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null);
  const [editingAssignmentId, setEditingAssignmentId] = useState<string | null>(null);
  const [deleteLessonTarget, setDeleteLessonTarget] = useState<{ id: string; label: string } | null>(null);
  const [deleteTopicTarget, setDeleteTopicTarget] = useState<{ id: string; label: string } | null>(null);
  const [deleteAssignmentTarget, setDeleteAssignmentTarget] = useState<{ id: string; label: string } | null>(null);
  const videoFileInputRef = useRef<HTMLInputElement | null>(null);

  const currentContent = content ?? emptySubjectContent(subject.id);
  const selectedTopicId = lessonForm.topicId || currentContent.topics[0]?.id || "";
  const selectedVideoTopicId = videoForm.topicId || currentContent.topics[0]?.id || "";
  const videoLessonCount = currentContent.lessons.filter((lesson) => lesson.videoUrl || isVideoFile(lesson)).length;

  useEffect(() => {
    let ignore = false;

    async function loadContent() {
      setLoading(true);
      setMessage("");

      const loadedContent = await loadSubjectContent(subject.id);

      if (!ignore) {
        const nextContent = loadedContent ?? emptySubjectContent(subject.id);
        setContent(nextContent);
        setLessonForm((current) => ({ ...current, topicId: nextContent.topics[0]?.id ?? "" }));
        setVideoForm((current) => ({ ...current, topicId: nextContent.topics[0]?.id ?? "" }));
        setLoading(false);
      }
    }

    loadContent();

    return () => {
      ignore = true;
    };
  }, [subject.id]);

  async function persistContent(nextContent: SubjectContent, label: string) {
    setSaving(true);
    setMessage("");

    try {
      await saveSubjectContent(subject.id, nextContent);
      setContent(nextContent);
      onSaved(label);
      setMessage(language === "mn" ? "Амжилттай хадгаллаа." : "Saved successfully.");
    } catch {
      setMessage(language === "mn" ? "Файл хадгалж чадсангүй." : "Could not save the content file.");
    } finally {
      setSaving(false);
    }
  }

  async function uploadLessonFiles(fileList: FileList | null) {
    const files = Array.from(fileList ?? []);
    if (files.length === 0) return;

    try {
      setSaving(true);
      setMessage("");
      const nextContent = await uploadSubjectFiles(subject.id, files);
      setContent(nextContent);
      onSaved(files.map((file) => file.name).join(", "));
      setMessage(language === "mn" ? "Файл/видео амжилттай нэмэгдлээ." : "Files and videos uploaded successfully.");
    } catch {
      setMessage(language === "mn" ? "Файл/видео upload хийж чадсангүй." : "The files or videos could not be uploaded.");
    } finally {
      setSaving(false);
    }
  }

  function printLessonFile(lesson: SubjectLesson, topicTitle: string) {
    if (!lesson.fileUrl) return;

    const printWindow = window.open("", "_blank", "width=1080,height=760");

    if (!printWindow) {
      setMessage(language === "mn" ? "Хэвлэх цонх нээгдсэнгүй." : "The print window could not be opened.");
      return;
    }

    const fileUrl = new URL(lesson.fileUrl, window.location.origin).href;
    const fileName = lesson.fileName ?? lesson.title;
    const lowerFileName = fileName.toLowerCase();
    const fileType = (lesson.fileType ?? "").toLowerCase();
    const isPdf = fileType.includes("pdf") || lowerFileName.endsWith(".pdf");
    const isImage = /\.(png|jpe?g|webp|gif|bmp)$/i.test(lowerFileName) || fileType.startsWith("image/");
    const isText = lowerFileName.endsWith(".txt") || fileType.startsWith("text/");
    const safeTitle = escapeHtml(lesson.title);
    const safeTopic = escapeHtml(topicTitle);
    const safeFileName = escapeHtml(fileName);
    const safeFileUrl = escapeHtml(fileUrl);
    const safeSize = escapeHtml(formatFileSize(lesson.fileSize));
    const previewMarkup = isPdf || isText
      ? `<iframe class="print-preview" src="${safeFileUrl}"></iframe>`
      : isImage
        ? `<img class="print-image" src="${safeFileUrl}" alt="${safeFileName}" />`
        : `<div class="print-fallback">
            <p>${language === "mn" ? "Энэ файлыг браузер шууд preview хийх боломжгүй байж магадгүй." : "This file may not be directly previewable in the browser."}</p>
            <a href="${safeFileUrl}" target="_blank" rel="noreferrer">${language === "mn" ? "Файл нээх" : "Open file"}</a>
          </div>`;

    printWindow.document.write(`<!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>${safeTitle} - PDF</title>
          <style>
            @page { margin: 12mm; }
            * { box-sizing: border-box; }
            body {
              margin: 0;
              color: #0f172a;
              background: #fff;
              font-family: Arial, Helvetica, sans-serif;
            }
            .print-header {
              display: grid;
              gap: 6px;
              padding: 20px 0 14px;
              border-bottom: 1px solid #e2e8f0;
            }
            .print-header p,
            .print-header h1 {
              margin: 0;
            }
            .print-header p {
              color: #64748b;
              font-size: 13px;
              font-weight: 700;
            }
            .print-header h1 {
              font-size: 28px;
              line-height: 1.15;
            }
            .print-meta {
              display: flex;
              flex-wrap: wrap;
              gap: 10px;
              margin-top: 4px;
              color: #475569;
              font-size: 13px;
            }
            .print-body {
              padding-top: 18px;
            }
            .print-preview {
              width: 100%;
              height: 78vh;
              border: 0;
            }
            .print-image {
              display: block;
              max-width: 100%;
              max-height: 80vh;
              margin: 0 auto;
              object-fit: contain;
            }
            .print-fallback {
              display: grid;
              gap: 12px;
              padding: 22px;
              background: #f8fafc;
              border-radius: 14px;
              color: #475569;
            }
            .print-fallback p {
              margin: 0;
            }
            .print-fallback a {
              color: #2563eb;
              font-weight: 700;
            }
            @media print {
              .print-header {
                break-after: avoid;
              }
              .print-preview {
                height: 82vh;
              }
            }
          </style>
        </head>
        <body>
          <main>
            <header class="print-header">
              <p>${language === "mn" ? "Хичээлийн файл" : "Lesson file"}</p>
              <h1>${safeTitle}</h1>
              <div class="print-meta">
                <span>${safeTopic}</span>
                <span>${safeFileName}</span>
                ${safeSize ? `<span>${safeSize}</span>` : ""}
              </div>
            </header>
            <section class="print-body">
              ${previewMarkup}
            </section>
          </main>
          <script>
            const runPrint = () => setTimeout(() => {
              window.focus();
              window.print();
            }, 500);
            const preview = document.querySelector(".print-preview, .print-image");
            if (preview) {
              preview.addEventListener("load", runPrint, { once: true });
              setTimeout(runPrint, 1800);
            } else {
              runPrint();
            }
          </script>
        </body>
      </html>`);
    printWindow.document.close();
  }

  async function addTopic(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const title = topicForm.title.trim();
    if (!title) return;

    const description = topicForm.description.trim() || undefined;

    if (editingTopicId) {
      const nextContent = {
        ...currentContent,
        topics: currentContent.topics.map((topic) =>
          topic.id === editingTopicId ? { ...topic, title, description } : topic
        )
      };

      await persistContent(nextContent, title);
      setTopicForm({ title: "", description: "" });
      setEditingTopicId(null);
      return;
    }

    const topic = {
      id: `T-${Date.now()}`,
      title,
      description
    };
    const nextContent = {
      ...currentContent,
      topics: [...currentContent.topics, topic]
    };

    await persistContent(nextContent, title);
    setTopicForm({ title: "", description: "" });
    setLessonForm((current) => ({ ...current, topicId: current.topicId || topic.id }));
    setVideoForm((current) => ({ ...current, topicId: current.topicId || topic.id }));
  }

  function startEditTopic(topic: { id: string; title: string; description?: string }) {
    setEditingTopicId(topic.id);
    setTopicForm({
      title: topic.title,
      description: topic.description ?? ""
    });
    setActiveView("overview");
    setActiveEditorTab("topic");
    requestAnimationFrame(() => {
      document.getElementById("subject-editor-accordion")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function requestDeleteTopic(topic: { id: string; title: string }) {
    setDeleteTopicTarget({ id: topic.id, label: topic.title });
  }

  async function deleteTopic() {
    if (!deleteTopicTarget) return;

    const topicId = deleteTopicTarget.id;
    const label = deleteTopicTarget.label;
    const nextContent = {
      ...currentContent,
      topics: currentContent.topics.filter((topic) => topic.id !== topicId),
      lessons: currentContent.lessons.filter((lesson) => lesson.topicId !== topicId)
    };

    setDeleteTopicTarget(null);
    if (editingTopicId === topicId) {
      setEditingTopicId(null);
      setTopicForm({ title: "", description: "" });
    }

    await persistContent(nextContent, label);
    setMessage(language === "mn" ? "Сэдэв болон холбогдох хичээлүүд устгагдлаа." : "Topic and its lessons were deleted.");
  }

  async function addLesson(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const title = lessonForm.title.trim();
    if (!title) return;

    const topicId = selectedTopicId || `T-${Date.now()}`;
    const topics = currentContent.topics.length > 0
      ? currentContent.topics
      : [{ id: topicId, title: language === "mn" ? "Ерөнхий сэдэв" : "General topic" }];
    const objectives = lessonForm.objectives
      .split(/\r?\n|,/)
      .map((item) => item.trim())
      .filter(Boolean);

    const nextContent = editingLessonId
      ? {
          ...currentContent,
          topics,
          lessons: currentContent.lessons.map((lesson) =>
            lesson.id === editingLessonId
              ? { ...lesson, title, topicId, duration: lessonForm.duration.trim() || undefined, objectives }
              : lesson
          )
        }
      : {
          ...currentContent,
          topics,
          lessons: [
            ...currentContent.lessons,
            {
              id: `L-${Date.now()}`,
              title,
              topicId,
              duration: lessonForm.duration.trim() || undefined,
              objectives
            }
          ]
        };

    await persistContent(nextContent, title);
    setLessonForm({ title: "", topicId, duration: "", objectives: "" });
    setEditingLessonId(null);
  }

  function startEditLesson(lesson: SubjectLesson) {
    setEditingLessonId(lesson.id);
    setLessonForm({
      title: lesson.title,
      topicId: lesson.topicId,
      duration: lesson.duration ?? "",
      objectives: lesson.objectives?.join("\n") ?? ""
    });
    setActiveView("overview");
    setActiveEditorTab("lesson");
    requestAnimationFrame(() => {
      document.getElementById("subject-editor-accordion")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function startEditVideoLesson(lesson: SubjectLesson) {
    setEditingVideoId(lesson.id);
    setVideoForm({
      title: lesson.title,
      topicId: lesson.topicId,
      duration: lesson.duration ?? "",
      videoUrl: lesson.videoUrl ?? ""
    });
    setActiveView("overview");
    setActiveEditorTab("video");
    requestAnimationFrame(() => {
      document.getElementById("subject-editor-accordion")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function requestDeleteLesson(lesson: SubjectLesson) {
    setDeleteLessonTarget({ id: lesson.id, label: lesson.title });
  }

  async function deleteLesson() {
    if (!deleteLessonTarget) return;

    const lessonId = deleteLessonTarget.id;
    const label = deleteLessonTarget.label;
    const nextContent = {
      ...currentContent,
      lessons: currentContent.lessons.filter((lesson) => lesson.id !== lessonId)
    };

    setDeleteLessonTarget(null);
    if (editingLessonId === lessonId) {
      setEditingLessonId(null);
      setLessonForm({ title: "", topicId: selectedTopicId, duration: "", objectives: "" });
    }
    if (editingVideoId === lessonId) {
      setEditingVideoId(null);
      setVideoForm({ title: "", topicId: selectedVideoTopicId, duration: "", videoUrl: "" });
    }

    await persistContent(nextContent, label);
    setMessage(language === "mn" ? "Хичээл устгагдлаа." : "Lesson deleted.");
  }

  async function addVideoLesson(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const title = videoForm.title.trim();
    const videoUrl = videoForm.videoUrl.trim();
    if (!title || (!videoUrl && !videoFile)) return;

    const topicId = selectedVideoTopicId || `T-${Date.now()}`;

    if (videoFile) {
      try {
        setSaving(true);
        setMessage("");
        const nextContent = await uploadSubjectFiles(subject.id, [videoFile], {
          title,
          topicId,
          duration: videoForm.duration.trim() || undefined
        });
        setContent(nextContent);
        onSaved(title);
        setMessage(language === "mn" ? "Видео файл амжилттай нэмэгдлээ." : "Video file uploaded successfully.");
        setVideoForm({ title: "", topicId, duration: "", videoUrl: "" });
        setVideoFile(null);
        setEditingVideoId(null);
        if (videoFileInputRef.current) videoFileInputRef.current.value = "";
      } catch {
        setMessage(language === "mn" ? "Видео файл upload хийж чадсангүй." : "The video file could not be uploaded.");
      } finally {
        setSaving(false);
      }
      return;
    }

    const topics = currentContent.topics.length > 0
      ? currentContent.topics
      : [{ id: topicId, title: language === "mn" ? "Ерөнхий сэдэв" : "General topic" }];

    const nextContent = editingVideoId
      ? {
          ...currentContent,
          topics,
          lessons: currentContent.lessons.map((lesson) =>
            lesson.id === editingVideoId
              ? { ...lesson, title, topicId, duration: videoForm.duration.trim() || undefined, videoUrl }
              : lesson
          )
        }
      : {
          ...currentContent,
          topics,
          lessons: [
            ...currentContent.lessons,
            {
              id: `L-VIDEO-${Date.now()}`,
              title,
              topicId,
              duration: videoForm.duration.trim() || undefined,
              videoUrl
            }
          ]
        };

    await persistContent(nextContent, title);
    setVideoForm({ title: "", topicId, duration: "", videoUrl: "" });
    setEditingVideoId(null);
  }

  async function addAssignment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const title = assignmentForm.title.trim();
    if (!title) return;

    const dueDate = assignmentForm.dueDate.trim() || undefined;
    const maxScore = assignmentForm.maxScore.trim() ? Number(assignmentForm.maxScore.trim()) : undefined;
    const type = assignmentForm.type.trim() || undefined;
    const description = assignmentForm.description.trim() || undefined;

    if (editingAssignmentId) {
      const nextContent = {
        ...currentContent,
        assignments: currentContent.assignments.map((assignment: any) =>
          assignment.id === editingAssignmentId
            ? { ...assignment, title, dueDate, maxScore, type, description }
            : assignment
        )
      };

      await persistContent(nextContent, title);
      setAssignmentForm({ title: "", dueDate: "", maxScore: "", type: "Homework", description: "" });
      setEditingAssignmentId(null);
      return;
    }

    const assignment = {
      id: `A-${Date.now()}`,
      title,
      dueDate,
      maxScore,
      type,
      description
    };
    const nextContent = {
      ...currentContent,
      assignments: [...currentContent.assignments, assignment]
    };

    await persistContent(nextContent, title);
    setAssignmentForm({ title: "", dueDate: "", maxScore: "", type: "Homework", description: "" });
  }

  function startEditAssignment(assignment: any) {
    setEditingAssignmentId(assignment.id);
    setAssignmentForm({
      title: assignment.title ?? "",
      dueDate: assignment.dueDate ?? "",
      maxScore: assignment.maxScore != null ? String(assignment.maxScore) : "",
      type: assignment.type ?? "Homework",
      description: assignment.description ?? ""
    });
    setActiveView("overview");
    setActiveEditorTab("assignment");
    requestAnimationFrame(() => {
      document.getElementById("subject-editor-accordion")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function requestDeleteAssignment(assignment: any, index: number) {
    setDeleteAssignmentTarget({
      id: assignment.id ?? String(index),
      label: assignment.title ?? (language === "mn" ? "Гарчиггүй даалгавар" : "Untitled assignment")
    });
  }

  async function deleteAssignment() {
    if (!deleteAssignmentTarget) return;

    const assignmentId = deleteAssignmentTarget.id;
    const label = deleteAssignmentTarget.label;
    const nextContent = {
      ...currentContent,
      assignments: currentContent.assignments.filter((assignment: any, index: number) => (assignment.id ?? String(index)) !== assignmentId)
    };

    setDeleteAssignmentTarget(null);
    if (editingAssignmentId === assignmentId) {
      setEditingAssignmentId(null);
      setAssignmentForm({ title: "", dueDate: "", maxScore: "", type: "Homework", description: "" });
    }

    await persistContent(nextContent, label);
    setMessage(language === "mn" ? "Даалгавар устгагдлаа." : "Assignment deleted.");
  }

  return (
    <section className="subject-content-panel">
      <div className="subject-content-header">
        <button
          className="subject-back-button"
          onClick={() => (activeView === "overview" ? onBack() : setActiveView("overview"))}
          type="button"
        >
          <ArrowLeft size={17} />
          {language === "mn" ? "Буцах" : "Back"}
        </button>
        <div>
          <p>
            {activeView === "overview"
              ? language === "mn" ? "Хичээлийн агуулга" : "Subject content"
              : activeView === "topics"
              ? language === "mn" ? "Сэдвүүд" : "Topics"
              : activeView === "lessons"
              ? language === "mn" ? "Хичээлүүд" : "Lessons"
              : activeView === "videos"
              ? language === "mn" ? "Видео хичээлүүд" : "Video lessons"
              : language === "mn" ? "Даалгаврууд" : "Assignments"}
          </p>
          <h2>{translateValue(subject.name, language)}</h2>
        </div>
      </div>

      {loading ? (
        <Card>
          <CardContent>
            <div className="ec-loading-panel">
              <span className="ec-spinner" style={{ "--ec-spinner-size": "30px", "--ec-spinner-width": "3px" } as CSSProperties} />
              <strong>{language === "mn" ? "Агуулга ачаалж байна..." : "Loading content..."}</strong>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="subject-content-stats">
            <button className="subject-stat-button" onClick={() => setActiveView("topics")} type="button">
              <strong>{currentContent.topics.length}</strong>
              {language === "mn" ? "Сэдэв" : "Topics"}
            </button>
            <button className="subject-stat-button" onClick={() => setActiveView("lessons")} type="button">
              <strong>{currentContent.lessons.length}</strong>
              {language === "mn" ? "Хичээл" : "Lessons"}
            </button>
            <button className="subject-stat-button" onClick={() => setActiveView("videos")} type="button">
              <strong>{videoLessonCount}</strong>
              {language === "mn" ? "Видео" : "Videos"}
            </button>
            <button className="subject-stat-button" onClick={() => setActiveView("assignments")} type="button">
              <strong>{currentContent.assignments.length}</strong>
              {language === "mn" ? "Даалгавар" : "Assignments"}
            </button>
          </div>

          {canManage && activeView === "overview" ? (
  <div className="subject-accordion" id="subject-editor-accordion">
    {(
      [
        { id: "file", icon: <FileUp size={18} />, labelEn: "Add from file", labelMn: "Файлаас нэмэх" },
        { id: "topic", icon: <BookOpen size={18} />, labelEn: "Add topic", labelMn: "Сэдэв нэмэх" },
        { id: "lesson", icon: <Plus size={18} />, labelEn: "Add lesson", labelMn: "Хичээл нэмэх" },
        { id: "video", icon: <Video size={18} />, labelEn: "Add video lesson", labelMn: "Видео хичээл нэмэх" },
        { id: "assignment", icon: <Plus size={18} />, labelEn: "Add assignment", labelMn: "Даалгавар нэмэх" },
      ] as const
    ).map((item) => {
      const isOpen = activeEditorTab === item.id;
      return (
        <div className={`subject-accordion-item${isOpen ? " open" : ""}`} key={item.id}>
          <button
            className="subject-accordion-trigger"
            onClick={() => setActiveEditorTab(isOpen ? null : item.id)}
            type="button"
            aria-expanded={isOpen}
          >
            <span className="subject-accordion-icon">{item.icon}</span>
            <span>{language === "mn" ? item.labelMn : item.labelEn}</span>
            <ChevronDown size={18} className={`subject-accordion-chevron${isOpen ? " rotated" : ""}`} />
          </button>

          {isOpen && (
            <motion.div
              className="subject-accordion-panel"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              transition={{ duration: 0.22, ease: "easeOut" }}
            >
              <div className="subject-accordion-content">

                {item.id === "file" && (
                  <>
                    <label className="subject-file-import">
                      <FileUp size={20} />
                      <span>{language === "mn" ? "Файл сонгох" : "Choose files"}</span>
                      <input
                        accept=".doc,.docx,.ppt,.pptx,.pdf,.xls,.xlsx,.txt,.rtf,.mp4,.webm,.ogg,.mov,.m4v,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/pdf,video/mp4,video/webm,video/ogg,video/quicktime"
                        multiple
                        onChange={(event) => {
                          uploadLessonFiles(event.target.files);
                          event.currentTarget.value = "";
                        }}
                        type="file"
                      />
                    </label>
                    <p className="subject-help-text">
                      {language === "mn"
                        ? "Компьютер дээр бэлдсэн хичээлийн файл эсвэл video сонгоно."
                        : "Upload prepared lesson files or videos from your computer."}
                    </p>
                  </>
                )}

                {item.id === "topic" && (
                  <form className="subject-inline-form" onSubmit={addTopic}>
                    <Input onChange={(event) => setTopicForm((current) => ({ ...current, title: event.target.value }))} placeholder={language === "mn" ? "Сэдвийн нэр" : "Topic title"} required value={topicForm.title} />
                    <Input onChange={(event) => setTopicForm((current) => ({ ...current, description: event.target.value }))} placeholder={language === "mn" ? "Тайлбар" : "Description"} value={topicForm.description} />
                    <div className="subject-form-actions">
                      <Button disabled={saving} type="submit">
                        {editingTopicId ? <Check size={16} /> : <Plus size={16} />}
                        {editingTopicId
                          ? (language === "mn" ? "Хадгалах" : "Save changes")
                          : (language === "mn" ? "Сэдэв нэмэх" : "Add topic")}
                      </Button>
                      {editingTopicId ? (
                        <Button
                          onClick={() => {
                            setEditingTopicId(null);
                            setTopicForm({ title: "", description: "" });
                          }}
                          type="button"
                          variant="ghost"
                        >
                          {language === "mn" ? "Цуцлах" : "Cancel"}
                        </Button>
                      ) : null}
                    </div>
                  </form>
                )}

                {item.id === "lesson" && (
                  <form className="subject-inline-form subject-lesson-form" onSubmit={addLesson}>
                    <Input onChange={(event) => setLessonForm((current) => ({ ...current, title: event.target.value }))} placeholder={language === "mn" ? "Хичээлийн нэр" : "Lesson title"} required value={lessonForm.title} />
                    <TopicDropdown
                      onChange={(topicId) => setLessonForm((current) => ({ ...current, topicId }))}
                      options={currentContent.topics.map((topic) => ({ id: topic.id, label: translateValue(topic.title, language) }))}
                      placeholder={language === "mn" ? "Ерөнхий сэдэв" : "General topic"}
                      value={selectedTopicId}
                    />
                    <Input onChange={(event) => setLessonForm((current) => ({ ...current, duration: event.target.value }))} placeholder={language === "mn" ? "Үргэлжлэх хугацаа" : "Duration"} value={lessonForm.duration} />
                    <Input onChange={(event) => setLessonForm((current) => ({ ...current, objectives: event.target.value }))} placeholder={language === "mn" ? "Зорилго, таслалаар" : "Objectives, comma-separated"} value={lessonForm.objectives} />
                    <div className="subject-form-actions">
                      <Button disabled={saving} type="submit">
                        {editingLessonId ? <Check size={16} /> : <Plus size={16} />}
                        {editingLessonId
                          ? (language === "mn" ? "Хадгалах" : "Save changes")
                          : (language === "mn" ? "Хичээл нэмэх" : "Add lesson")}
                      </Button>
                      {editingLessonId ? (
                        <Button
                          onClick={() => {
                            setEditingLessonId(null);
                            setLessonForm({ title: "", topicId: selectedTopicId, duration: "", objectives: "" });
                          }}
                          type="button"
                          variant="ghost"
                        >
                          {language === "mn" ? "Цуцлах" : "Cancel"}
                        </Button>
                      ) : null}
                    </div>
                  </form>
                )}

                {item.id === "video" && (
                  <form className="subject-inline-form subject-lesson-form" onSubmit={addVideoLesson}>
                    <Input onChange={(event) => setVideoForm((current) => ({ ...current, title: event.target.value }))} placeholder={language === "mn" ? "Видео хичээлийн нэр" : "Video lesson title"} required value={videoForm.title} />
                    <TopicDropdown
                      onChange={(topicId) => setVideoForm((current) => ({ ...current, topicId }))}
                      options={currentContent.topics.map((topic) => ({ id: topic.id, label: translateValue(topic.title, language) }))}
                      placeholder={language === "mn" ? "Ерөнхий сэдэв" : "General topic"}
                      value={selectedVideoTopicId}
                    />
                    <Input onChange={(event) => setVideoForm((current) => ({ ...current, duration: event.target.value }))} placeholder={language === "mn" ? "Үргэлжлэх хугацаа" : "Duration"} value={videoForm.duration} />
                    <Input onChange={(event) => setVideoForm((current) => ({ ...current, videoUrl: event.target.value }))} placeholder={language === "mn" ? "Видео холбоос оруулах" : "Enter video URL"} type="text" value={videoForm.videoUrl} />
                    {!editingVideoId ? (
                      <label className="subject-video-file-import">
                        <FileUp size={18} />
                        <span>{videoFile?.name ?? (language === "mn" ? "Видео файл сонгох" : "Choose video file")}</span>
                        <input
                          accept=".mp4,.webm,.ogg,.mov,.m4v,video/mp4,video/webm,video/ogg,video/quicktime"
                          onChange={(event) => setVideoFile(event.target.files?.[0] ?? null)}
                          ref={videoFileInputRef}
                          type="file"
                        />
                      </label>
                    ) : null}
                    <div className="subject-form-actions">
                      <Button disabled={saving} type="submit">
                        {editingVideoId ? <Check size={16} /> : <Video size={16} />}
                        {editingVideoId
                          ? (language === "mn" ? "Хадгалах" : "Save changes")
                          : (language === "mn" ? "Видео нэмэх" : "Add video")}
                      </Button>
                      {editingVideoId ? (
                        <Button
                          onClick={() => {
                            setEditingVideoId(null);
                            setVideoForm({ title: "", topicId: selectedVideoTopicId, duration: "", videoUrl: "" });
                          }}
                          type="button"
                          variant="ghost"
                        >
                          {language === "mn" ? "Цуцлах" : "Cancel"}
                        </Button>
                      ) : null}
                    </div>
                  </form>
                )}

                {item.id === "assignment" && (
                  <form className="subject-inline-form subject-lesson-form" onSubmit={addAssignment}>
                    <Input onChange={(event) => setAssignmentForm((current) => ({ ...current, title: event.target.value }))} placeholder={language === "mn" ? "Даалгаврын нэр" : "Assignment title"} required value={assignmentForm.title} />
                    <DatePicker
                      onChange={(val) => setAssignmentForm((current) => ({ ...current, dueDate: val }))}
                      placeholder={language === "mn" ? "Дуусах огноо" : "Due date"}
                      value={assignmentForm.dueDate}
                    />
                    <Input onChange={(event) => setAssignmentForm((current) => ({ ...current, maxScore: event.target.value }))} placeholder={language === "mn" ? "Дээд оноо" : "Max score"} type="number" value={assignmentForm.maxScore} />
                    <AssignmentTypeDropdown
                      language={language}
                      onChange={(type) => setAssignmentForm((current) => ({ ...current, type }))}
                      value={assignmentForm.type}
                    />
                    <Input onChange={(event) => setAssignmentForm((current) => ({ ...current, description: event.target.value }))} placeholder={language === "mn" ? "Зааварчилгаа" : "Instructions"} value={assignmentForm.description} />
                    <div className="subject-form-actions">
                      <Button disabled={saving} type="submit">
                        {editingAssignmentId ? <Check size={16} /> : <Plus size={16} />}
                        {editingAssignmentId
                          ? (language === "mn" ? "Хадгалах" : "Save changes")
                          : (language === "mn" ? "Даалгавар нэмэх" : "Add assignment")}
                      </Button>
                      {editingAssignmentId ? (
                        <Button
                          onClick={() => {
                            setEditingAssignmentId(null);
                            setAssignmentForm({ title: "", dueDate: "", maxScore: "", type: "Homework", description: "" });
                          }}
                          type="button"
                          variant="ghost"
                        >
                          {language === "mn" ? "Цуцлах" : "Cancel"}
                        </Button>
                      ) : null}
                    </div>
                  </form>
                )}

              </div>
            </motion.div>
          )}
        </div>
      );
    })}
  </div>
) : null}
          {message ? <p className="subject-content-message">{message}</p> : null}

          {activeView === "topics" ? (
            <div className="subject-content-grid">
              <Card>
                <CardHeader>
                  <CardTitle>{language === "mn" ? "Сэдвүүд" : "Topics"}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="subject-list">
                    {currentContent.topics.length > 0 ? (
                      currentContent.topics.map((topic) => (
                        <article key={topic.id}>
                          <strong>{translateValue(topic.title, language)}</strong>
                          {topic.description ? <p>{translateValue(topic.description, language)}</p> : null}
                          {canManage ? (
                            <div className="subject-file-actions">
                              <button className="subject-item-edit" aria-label={language === "mn" ? "Засах" : "Edit"} onClick={() => startEditTopic(topic)} title={language === "mn" ? "Засах" : "Edit"} type="button">
                                <Pencil size={15} />
                              </button>
                              <button className="subject-item-delete" aria-label={language === "mn" ? "Устгах" : "Delete"} onClick={() => requestDeleteTopic(topic)} title={language === "mn" ? "Устгах" : "Delete"} type="button">
                                <Trash2 size={15} />
                              </button>
                            </div>
                          ) : null}
                        </article>
                      ))
                    ) : (
                      <p className="subject-help-text">{language === "mn" ? "Сэдэв нэмэгдээгүй байна." : "No topics yet."}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : null}

          {activeView === "lessons" ? (
            <div className="subject-content-grid">
              <Card>
                <CardHeader>
                  <CardTitle>{language === "mn" ? "Хичээлүүд" : "Lessons"}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="subject-list subject-lesson-carousel">
                    {currentContent.lessons.length > 0 ? (
                      currentContent.lessons.map((lesson) => {
                        const topic = currentContent.topics.find((item) => item.id === lesson.topicId);

                        return (
                          <article key={lesson.id}>
                            <strong>{lesson.title}</strong>
                            <p>
                              {topic?.title ? translateValue(topic.title, language) : lesson.topicId}
                              {lesson.duration ? ` - ${lesson.duration}` : ""}
                            </p>
                            {(lesson.fileUrl || canManage) ? (
                              <div className="subject-file-actions">
                                {lesson.fileUrl ? (
                                  <>
                                    <a className="subject-file-link" href={lesson.fileUrl} target="_blank" rel="noreferrer">
                                      <Download size={15} />
                                      <span>{lesson.fileName ?? (language === "mn" ? "Файл нээх" : "Open file")}</span>
                                      {lesson.fileSize ? <small>{formatFileSize(lesson.fileSize)}</small> : null}
                                    </a>
                                    <button className="subject-file-print" onClick={() => printLessonFile(lesson, topic?.title ? translateValue(topic.title, language) : lesson.topicId)} type="button">
                                      <Printer size={15} />
                                      <span>{language === "mn" ? "PDF-р хэвлэх" : "Print PDF"}</span>
                                    </button>
                                  </>
                                ) : null}
                                {canManage ? (
                                  <>
                                    <button className="subject-item-edit" aria-label={language === "mn" ? "Засах" : "Edit"} onClick={() => startEditLesson(lesson)} title={language === "mn" ? "Засах" : "Edit"} type="button">
                                      <Pencil size={15} />
                                    </button>
                                    <button className="subject-item-delete" aria-label={language === "mn" ? "Устгах" : "Delete"} onClick={() => requestDeleteLesson(lesson)} title={language === "mn" ? "Устгах" : "Delete"} type="button">
                                      <Trash2 size={15} />
                                    </button>
                                  </>
                                ) : null}
                              </div>
                            ) : null}
                            {lesson.objectives?.length ? (
                              <ul>
                                {lesson.objectives.map((objective) => (
                                  <li key={objective}>{objective}</li>
                                ))}
                              </ul>
                            ) : null}
                          </article>
                        );
                      })
                    ) : (
                      <p className="subject-help-text">{language === "mn" ? "Хичээл нэмэгдээгүй байна." : "No lessons yet."}</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {videoLessonCount > 0 ? (
                <Card>
                  <CardHeader>
                    <CardTitle>{language === "mn" ? "Видео хичээлүүд" : "Video lessons"}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="subject-list subject-video-list subject-video-carousel">
                      {currentContent.lessons
                        .filter((lesson) => lesson.videoUrl || isVideoFile(lesson))
                        .map((lesson) => {
                          const topic = currentContent.topics.find((item) => item.id === lesson.topicId);
                          const lessonVideoUrl = lesson.videoUrl || (isVideoFile(lesson) ? lesson.fileUrl : "");
                          const lessonVideoEmbedUrl = videoEmbedUrl(lessonVideoUrl);
                          const showDirectVideo = Boolean(lessonVideoUrl && !lessonVideoEmbedUrl && (isVideoFile(lesson) || isDirectVideoUrl(lessonVideoUrl)));

                          return (
                            <article key={lesson.id}>
                              <strong>{lesson.title}</strong>
                              <p>
                                {topic?.title ? translateValue(topic.title, language) : lesson.topicId}
                                {lesson.duration ? ` - ${lesson.duration}` : ""}
                              </p>
                              <div className="subject-video-preview">
                                {lessonVideoEmbedUrl ? (
                                  <iframe
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                    allowFullScreen
                                    src={lessonVideoEmbedUrl}
                                    title={lesson.title}
                                  />
                                ) : showDirectVideo ? (
                                  <video controls preload="metadata" src={lessonVideoUrl} />
                                ) : (
                                  <a className="subject-video-link" href={lessonVideoUrl} target="_blank" rel="noreferrer">
                                    <Video size={15} />
                                    <span>{language === "mn" ? "Видео нээх" : "Open video"}</span>
                                  </a>
                                )}
                              </div>
                              {canManage ? (
                                <div className="subject-file-actions">
                                  <button className="subject-item-edit" aria-label={language === "mn" ? "Засах" : "Edit"} onClick={() => startEditVideoLesson(lesson)} title={language === "mn" ? "Засах" : "Edit"} type="button">
                                    <Pencil size={15} />
                                  </button>
                                  <button className="subject-item-delete" aria-label={language === "mn" ? "Устгах" : "Delete"} onClick={() => requestDeleteLesson(lesson)} title={language === "mn" ? "Устгах" : "Delete"} type="button">
                                    <Trash2 size={15} />
                                  </button>
                                </div>
                              ) : null}
                            </article>
                          );
                        })}
                    </div>
                  </CardContent>
                </Card>
              ) : null}
            </div>
          ) : null}

          {activeView === "videos" ? (
            <div className="subject-content-grid subject-videos-grid">
              <Card>
                <CardHeader>
                  <CardTitle>{language === "mn" ? "Видео хичээлүүд" : "Video lessons"}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="subject-list subject-video-list subject-video-carousel">
                    {videoLessonCount > 0 ? (
                      currentContent.lessons
                        .filter((lesson) => lesson.videoUrl || isVideoFile(lesson))
                        .map((lesson) => {
                          const topic = currentContent.topics.find((item) => item.id === lesson.topicId);
                          const lessonVideoUrl = lesson.videoUrl || (isVideoFile(lesson) ? lesson.fileUrl : "");
                          const lessonVideoEmbedUrl = videoEmbedUrl(lessonVideoUrl);
                          const showDirectVideo = Boolean(lessonVideoUrl && !lessonVideoEmbedUrl && (isVideoFile(lesson) || isDirectVideoUrl(lessonVideoUrl)));

                          return (
                            <article key={lesson.id}>
                              <strong>{lesson.title}</strong>
                              <p>
                                {topic?.title ? translateValue(topic.title, language) : lesson.topicId}
                                {lesson.duration ? ` - ${lesson.duration}` : ""}
                              </p>
                              {lessonVideoUrl ? (
                                <div className="subject-video-preview">
                                  {lessonVideoEmbedUrl ? (
                                    <iframe
                                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                      allowFullScreen
                                      src={lessonVideoEmbedUrl}
                                      title={lesson.title}
                                    />
                                  ) : showDirectVideo ? (
                                    <video controls preload="metadata" src={lessonVideoUrl} />
                                  ) : (
                                    <a className="subject-video-link" href={lessonVideoUrl} target="_blank" rel="noreferrer">
                                      <Video size={15} />
                                      <span>{language === "mn" ? "Видео нээх" : "Open video"}</span>
                                    </a>
                                  )}
                                </div>
                              ) : null}
                              {canManage ? (
                                <div className="subject-file-actions">
                                  <button className="subject-item-edit" aria-label={language === "mn" ? "Засах" : "Edit"} onClick={() => startEditVideoLesson(lesson)} title={language === "mn" ? "Засах" : "Edit"} type="button">
                                    <Pencil size={15} />
                                  </button>
                                  <button className="subject-item-delete" aria-label={language === "mn" ? "Устгах" : "Delete"} onClick={() => requestDeleteLesson(lesson)} title={language === "mn" ? "Устгах" : "Delete"} type="button">
                                    <Trash2 size={15} />
                                  </button>
                                </div>
                              ) : null}
                            </article>
                          );
                        })
                    ) : (
                      <p className="subject-help-text">{language === "mn" ? "Видео хичээл нэмэгдээгүй байна." : "No video lessons yet."}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : null}

          {activeView === "assignments" ? (
            <div className="subject-content-grid">
              <Card>
                <CardHeader>
                  <CardTitle>{language === "mn" ? "Даалгаврууд" : "Assignments"}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="subject-list">
                    {currentContent.assignments.length > 0 ? (
                      currentContent.assignments.map((assignment: any, index: number) => (
                        <article key={assignment.id ?? index}>
                          <strong>{assignment.title ?? (language === "mn" ? "Гарчиггүй даалгавар" : "Untitled assignment")}</strong>
                          {(assignment.type || assignment.dueDate || assignment.maxScore) ? (
                            <p>
                              {[
                                assignment.type,
                                assignment.dueDate ? (language === "mn" ? `Огноо: ${assignment.dueDate}` : `Due: ${assignment.dueDate}`) : null,
                                assignment.maxScore ? (language === "mn" ? `Дээд оноо: ${assignment.maxScore}` : `Max score: ${assignment.maxScore}`) : null
                              ].filter(Boolean).join(" · ")}
                            </p>
                          ) : null}
                          {assignment.description ? <p>{assignment.description}</p> : null}
                          {canManage ? (
                            <div className="subject-file-actions">
                              <button className="subject-item-edit" aria-label={language === "mn" ? "Засах" : "Edit"} onClick={() => startEditAssignment(assignment)} title={language === "mn" ? "Засах" : "Edit"} type="button">
                                <Pencil size={15} />
                              </button>
                              <button className="subject-item-delete" aria-label={language === "mn" ? "Устгах" : "Delete"} onClick={() => requestDeleteAssignment(assignment, index)} title={language === "mn" ? "Устгах" : "Delete"} type="button">
                                <Trash2 size={15} />
                              </button>
                            </div>
                          ) : null}
                        </article>
                      ))
                    ) : (
                      <p className="subject-help-text">{language === "mn" ? "Даалгавар нэмэгдээгүй байна." : "No assignments yet."}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : null}
        </>
      )}

      {deleteLessonTarget ? (
        <div className="modal-layer">
          <div className="delete-modal" role="dialog" aria-modal="true" aria-labelledby="lesson-delete-title">
            <div className="delete-icon">
              <Trash2 size={20} />
            </div>
            <div>
              <strong id="lesson-delete-title">{language === "mn" ? "Хичээл устгах" : "Delete lesson"}</strong>
              <p>
                {language === "mn"
                  ? `"${deleteLessonTarget.label}"-ыг устгахдаа итгэлтэй байна уу?`
                  : `Are you sure you want to delete "${deleteLessonTarget.label}"?`}
              </p>
            </div>
            <div className="delete-actions">
              <Button onClick={() => setDeleteLessonTarget(null)} type="button" variant="ghost">
                {language === "mn" ? "Цуцлах" : "Cancel"}
              </Button>
              <Button onClick={() => deleteLesson()} type="button" variant="danger">
                <Trash2 size={16} />
                {language === "mn" ? "Устгах" : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteTopicTarget ? (
        <div className="modal-layer">
          <div className="delete-modal" role="dialog" aria-modal="true" aria-labelledby="topic-delete-title">
            <div className="delete-icon">
              <Trash2 size={20} />
            </div>
            <div>
              <strong id="topic-delete-title">{language === "mn" ? "Сэдэв устгах" : "Delete topic"}</strong>
              <p>
                {(() => {
                  const lessonCount = currentContent.lessons.filter((lesson) => lesson.topicId === deleteTopicTarget.id).length;
                  if (language === "mn") {
                    return lessonCount > 0
                      ? `"${deleteTopicTarget.label}" сэдвийг устгахад дотор нь байгаа ${lessonCount} хичээл/видео хамт устгагдана. Үргэлжлүүлэх үү?`
                      : `"${deleteTopicTarget.label}"-ыг устгахдаа итгэлтэй байна уу?`;
                  }
                  return lessonCount > 0
                    ? `Deleting "${deleteTopicTarget.label}" will also delete ${lessonCount} lesson(s)/video(s) inside it. Continue?`
                    : `Are you sure you want to delete "${deleteTopicTarget.label}"?`;
                })()}
              </p>
            </div>
            <div className="delete-actions">
              <Button onClick={() => setDeleteTopicTarget(null)} type="button" variant="ghost">
                {language === "mn" ? "Цуцлах" : "Cancel"}
              </Button>
              <Button onClick={() => deleteTopic()} type="button" variant="danger">
                <Trash2 size={16} />
                {language === "mn" ? "Устгах" : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteAssignmentTarget ? (
        <div className="modal-layer">
          <div className="delete-modal" role="dialog" aria-modal="true" aria-labelledby="assignment-delete-title">
            <div className="delete-icon">
              <Trash2 size={20} />
            </div>
            <div>
              <strong id="assignment-delete-title">{language === "mn" ? "Даалгавар устгах" : "Delete assignment"}</strong>
              <p>
                {language === "mn"
                  ? `"${deleteAssignmentTarget.label}"-ыг устгахдаа итгэлтэй байна уу?`
                  : `Are you sure you want to delete "${deleteAssignmentTarget.label}"?`}
              </p>
            </div>
            <div className="delete-actions">
              <Button onClick={() => setDeleteAssignmentTarget(null)} type="button" variant="ghost">
                {language === "mn" ? "Цуцлах" : "Cancel"}
              </Button>
              <Button onClick={() => deleteAssignment()} type="button" variant="danger">
                <Trash2 size={16} />
                {language === "mn" ? "Устгах" : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function AttendanceModule({ apiData, copy, error, language, loading, ...controls }: ModuleApiProps) {
  return (
    <ModuleTable
      apiData={apiData}
      copy={copy}
      error={error}
      language={language}
      loading={loading}
      title={copy.tables.attendance}
      columns={["Student", "Subject", "Date", "Status"]}
      rows={[]}
      {...controls}
    />
  );
}

function GradesModule({ apiData, copy, error, language, loading, ...controls }: ModuleApiProps) {
  return (
    <ModuleTable
      apiData={apiData}
      copy={copy}
      error={error}
      language={language}
      loading={loading}
      title={copy.tables.grades}
      columns={["Student", "Subject", "Score", "Semester"]}
      rows={[]}
      {...controls}
    />
  );
}

function PaymentsModule({ apiData, copy, error, language, loading, ...controls }: ModuleApiProps) {
  return (
    <ModuleTable
      apiData={apiData}
      copy={copy}
      error={error}
      language={language}
      loading={loading}
      title={copy.tables.payments}
      columns={["Student", "Amount", "Status", "Due Date"]}
      rows={[]}
      {...controls}
    />
  );
}

function TimetableModule({ apiData, copy, error, language, loading, ...controls }: ModuleApiProps) {
  return (
    <ModuleTable
      apiData={apiData}
      copy={copy}
      error={error}
      language={language}
      loading={loading}
      title={copy.tables.timetable}
      columns={["Subject", "Day", "Time", "Teacher", "Class"]}
      rows={[]}
      {...controls}
    />
  );
}

function AnnouncementsModule({ apiData, copy, error, language, loading, ...controls }: ModuleApiProps) {
  return (
    <ModuleTable
      apiData={apiData}
      copy={copy}
      error={error}
      language={language}
      loading={loading}
      title={copy.tables.announcements}
      columns={["Title", "Content", "Audience", "Date"]}
      rows={[]}
      {...controls}
    />
  );
}

function WellbeingModule({ apiData, copy, error, language, loading, ...controls }: ModuleApiProps) {
  return (
    <ModuleTable
      apiData={apiData}
      copy={copy}
      error={error}
      language={language}
      loading={loading}
      title={copy.tables.wellbeing}
      columns={["Question", "Category", "Note", "Date"]}
      rows={[]}
      {...controls}
    />
  );
}

function SettingsModule({
  copy,
  currentUserAvatar,
  currentUserEmail,
  currentUserName,
  language,
  logout,
  onSaveProfile,
  role,
  setLanguage
}: {
  copy: AppCopy;
  currentUserAvatar: string;
  currentUserEmail: string;
  currentUserName: string;
  language: Language;
  logout: () => void;
  onSaveProfile: (values: { name: string; email: string; avatarUrl: string }) => Promise<boolean>;
  role: Role;
  setLanguage: (value: Language) => void;
}) {
  const [permissionsOpen, setPermissionsOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileName, setProfileName] = useState(currentUserName);
  const [profileEmail, setProfileEmail] = useState(currentUserEmail);
  const [profileAvatar, setProfileAvatar] = useState(currentUserAvatar);
  const [savingProfile, setSavingProfile] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const initials = (currentUserName || currentUserEmail || "?").trim().charAt(0).toUpperCase();

  function openProfile() {
    setProfileName(currentUserName);
    setProfileEmail(currentUserEmail);
    setProfileAvatar(currentUserAvatar);
    setProfileOpen(true);
  }

  function onAvatarSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setProfileAvatar(reader.result);
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  }

  async function handleSaveProfile() {
    setSavingProfile(true);
    const success = await onSaveProfile({ name: profileName.trim(), email: profileEmail.trim(), avatarUrl: profileAvatar });
    setSavingProfile(false);
    if (success) setProfileOpen(false);
  }

  return (
    <section className="settings-grid">
      {profileOpen ? (
        <div className="mobile-account-page">
          <button className="mobile-account-back" onClick={() => setProfileOpen(false)} type="button">
            {language === "mn" ? "Буцах" : "Back"}
          </button>
          <div className="mobile-account-card">
            <div className="mobile-account-header">
              <span>{language === "mn" ? "Профайл" : "Profile"}</span>
            </div>

            <div className="mobile-profile-avatar-row">
              <div className="mobile-profile-avatar">
                {profileAvatar ? <img alt="" src={profileAvatar} /> : <span>{initials}</span>}
                <button
                  aria-label={language === "mn" ? "Зураг солих" : "Change photo"}
                  className="mobile-profile-avatar-edit"
                  onClick={() => avatarInputRef.current?.click()}
                  type="button"
                >
                  <Pencil size={14} />
                </button>
              </div>
              <input accept="image/*" hidden onChange={onAvatarSelected} ref={avatarInputRef} type="file" />
            </div>

            <label className="mobile-profile-field">
              <span>{language === "mn" ? "Нэр" : "Name"}</span>
              <input
                className="ec-input"
                onChange={(event) => setProfileName(event.target.value)}
                placeholder={language === "mn" ? "Нэрээ оруулна уу" : "Enter your name"}
                value={profileName}
              />
            </label>

            <label className="mobile-profile-field">
              <span>{language === "mn" ? "Имэйл" : "Email"}</span>
              <input
                className="ec-input"
                onChange={(event) => setProfileEmail(event.target.value)}
                placeholder="you@example.com"
                type="email"
                value={profileEmail}
              />
            </label>

            <button className="mobile-profile-save" disabled={savingProfile} onClick={handleSaveProfile} type="button">
              {savingProfile ? (language === "mn" ? "Хадгалж байна..." : "Saving...") : language === "mn" ? "Хадгалах" : "Save"}
            </button>
          </div>
        </div>
      ) : accountOpen ? (
        <div className="mobile-account-page">
          <button className="mobile-account-back" onClick={() => setAccountOpen(false)} type="button">
            {language === "mn" ? "Буцах" : "Back"}
          </button>
          <div className="mobile-account-card">
            <div className="mobile-account-header">
              <span>{copy.common.account}</span>
              <Badge tone="blue">{copy.roles[role]}</Badge>
            </div>
            <div className="mobile-role-list">
              <span className="mobile-role-current">
                <span>{copy.roles[role]}</span>
                <Check size={16} />
              </span>
            </div>
            <button className="mobile-account-logout" onClick={logout} type="button">
              {copy.common.logout}
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="mobile-settings-list">
            <button className="mobile-setting-row mobile-setting-row-profile" onClick={openProfile} type="button">
              <span className="mobile-profile-row-info">
                <span className="mobile-profile-row-avatar">
                  {currentUserAvatar ? <img alt="" src={currentUserAvatar} /> : <span>{initials}</span>}
                </span>
                <span className="mobile-profile-row-text">
                  <strong>{currentUserName || (language === "mn" ? "Профайл" : "Profile")}</strong>
                  {currentUserEmail ? <small>{currentUserEmail}</small> : null}
                </span>
              </span>
              <ChevronRight size={18} />
            </button>

            <button className="mobile-setting-row" onClick={() => setLanguage(language === "mn" ? "en" : "mn")} type="button">
              <span>{language === "mn" ? "Монгол хэл" : "English"}</span>
              <span className={`mobile-switch${language === "mn" ? " active" : ""}`} aria-hidden="true">
                <span />
              </span>
            </button>

            <button className="mobile-setting-row" onClick={() => setAccountOpen(true)} type="button">
              <span>{copy.common.account}</span>
              <Badge tone="blue">{copy.roles[role]}</Badge>
            </button>

            <button className="mobile-setting-row" onClick={() => setPermissionsOpen((value) => !value)} type="button">
              <span>{copy.common.rolePermissions}</span>
              <Badge tone="blue">{copy.roles[role]}</Badge>
              <ChevronDown className={permissionsOpen ? "open" : ""} size={18} />
            </button>
          </div>

          <div className="mobile-permission-panel">
            {permissionsOpen ? (
              <div className="mobile-permission-list">
                {copy.rolePermissions[role].map((permission) => (
                  <span key={permission}>
                    <Check size={16} />
                    {permission}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </>
      )}

      <Card className="desktop-permission-card">
        <CardHeader>
          <CardTitle>{copy.common.rolePermissions}</CardTitle>
          <Badge tone="blue">{copy.roles[role]}</Badge>
        </CardHeader>
        <CardContent>
          <div className="permission-grid">
            {copy.rolePermissions[role].map((permission) => (
              <span key={permission}>
                <Check size={16} />
                {permission}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

const SKELETON_ROW_COUNT = 5;
const SKELETON_BAR_WIDTHS = ["78%", "60%", "88%", "52%", "72%", "66%"];

/** Placeholder rows shown while a resource loads for the first time. */
function TableSkeletonRows({ columns, gridColumns, language }: { columns: string[]; gridColumns: string; language: Language }) {
  return (
    <>
      {Array.from({ length: SKELETON_ROW_COUNT }, (_, rowIndex) => (
        <div aria-hidden className="ec-table-row is-skeleton" key={`skeleton-row-${rowIndex}`} style={{ gridTemplateColumns: gridColumns }}>
          {columns.map((column, columnIndex) => (
            <span data-label={translateColumn(column, language)} key={column}>
              <span
                className="ec-skeleton ec-skeleton-bar"
                style={
                  {
                    "--ec-bar-width": SKELETON_BAR_WIDTHS[(rowIndex + columnIndex) % SKELETON_BAR_WIDTHS.length],
                    "--ec-skeleton-delay": `${rowIndex * 0.12}s`
                  } as CSSProperties
                }
              />
            </span>
          ))}
        </div>
      ))}
    </>
  );
}

type ModuleApiProps = {
  apiData: ResourceTableData | null;
  copy: AppCopy;
  error: string;
  language: Language;
  loading: boolean;
} & ModuleControls;

type ModuleControls = {
  canManage: boolean;
  onAdd: () => void;
  onDelete: (recordId: string, row: string[]) => void;
  onEdit: (recordId: string, row: string[], columns: string[]) => void;
  contentActionLabel?: string;
  onOpenContent?: (recordId: string, row: string[]) => void;
};

function ModuleTable({
  title,
  columns,
  rows,
  apiData,
  copy,
  error,
  language,
  loading,
  canManage,
  contentActionLabel,
  onAdd,
  onDelete,
  onEdit,
  onOpenContent
}: {
  title: string;
  columns: string[];
  rows: string[][];
  apiData: ResourceTableData | null;
  copy: AppCopy;
  error: string;
  language: Language;
  loading: boolean;
} & ModuleControls) {
  const displayColumns = apiData?.columns ?? columns;
  const displayRows = apiData?.rows ?? rows;
  const displayIds = apiData?.ids ?? [];
  const [filterQuery, setFilterQuery] = useState("");
  const normalizedFilter = filterQuery.trim().toLowerCase();
  const filteredRows = displayRows
    .map((row, rowIndex) => ({ id: displayIds[rowIndex], row }))
    .filter(({ row }) =>
      normalizedFilter
        ? row.some((cell) => translateValue(cell, language).toLowerCase().includes(normalizedFilter) || cell.toLowerCase().includes(normalizedFilter))
        : true
    );
  const showActions = (canManage || Boolean(onOpenContent)) && displayIds.length > 0;
  const actionColumnWidth = canManage && onOpenContent ? "132px" : "88px";
  const gridColumns = `repeat(${displayColumns.length}, minmax(0, 1fr))${showActions ? ` ${actionColumnWidth}` : ""}`;

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>{title}</CardTitle>
          {loading || error ? (
            <p className="table-subtitle">
              {loading ? (
                <>
                  <span className="ec-spinner" style={{ "--ec-spinner-size": "13px", "--ec-spinner-width": "2px" } as CSSProperties} />
                  {copy.common.loadingRecords}
                </>
              ) : (
                error
              )}
            </p>
          ) : null}
        </div>
        <div className="table-actions">
          <Input value={filterQuery} onChange={(event) => setFilterQuery(event.target.value)} placeholder={copy.common.filterRecords} />
          {canManage ? (
            <Button onClick={onAdd} type="button">
              <Plus size={17} />
              {copy.common.add}
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        <div className="ec-table">
          <div className="ec-table-head" style={{ gridTemplateColumns: gridColumns }}>
            {displayColumns.map((column) => (
              <span key={column}>{translateColumn(column, language)}</span>
            ))}
            {showActions ? <span className="table-action-title">{copy.common.actions}</span> : null}
          </div>
          {loading && displayRows.length === 0 ? (
            <TableSkeletonRows columns={displayColumns} gridColumns={gridColumns} language={language} />
          ) : filteredRows.length > 0 ? (
            filteredRows.map(({ id, row }) => (
              <div className="ec-table-row" key={id ?? row.join("-")} style={{ gridTemplateColumns: gridColumns }}>
                {row.map((cell, index) => (
                  <span data-label={translateColumn(displayColumns[index], language)} key={`${cell}-${index}`}>
                    {["Paid", "Unpaid", "Partial", "Present", "Absent", "Late"].includes(cell) ? (
                      <Badge tone={statusTone(cell)}>{translateValue(cell, language)}</Badge>
                    ) : (
                      translateValue(cell, language)
                    )}
                  </span>
                ))}
                {showActions ? (
                  <span className="row-actions">
                    {onOpenContent ? (
                      <button aria-label={contentActionLabel} className="content-action" onClick={() => id && onOpenContent(id, row)} type="button">
                        <BookOpen size={15} />
                      </button>
                    ) : null}
                    {canManage ? (
                      <>
                        <button aria-label={copy.common.editRecord} onClick={() => id && onEdit(id, row, displayColumns)} type="button">
                          <Pencil size={15} />
                        </button>
                        <button aria-label={copy.common.deleteRecord} className="delete-action" onClick={() => id && onDelete(id, row)} type="button">
                          <Trash2 size={15} />
                        </button>
                      </>
                    ) : null}
                  </span>
                ) : null}
              </div>
            ))
          ) : (
            <div className="table-empty">
              <strong>{language === "mn" ? "Бүртгэл олдсонгүй" : "No records found"}</strong>
              <p>{language === "mn" ? "Хайлтын үгээ өөрчлөөд дахин оролдоно уу." : "Try a different filter term."}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function DashboardApp({ lockedRole }: { lockedRole: Role }) {
  return <AppShell lockedRole={lockedRole} />;
}

export default DashboardApp;
