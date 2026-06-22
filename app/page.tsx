"use client";

import { type FormEvent, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
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
  Moon,
  Pencil,
  Plus,
  Printer,
  Search,
  Settings as SettingsIcon,
  Sun,
  Trash2,
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
import {
  announcements,
  attendance,
  chartData,
  classes,
  grades,
  navItems,
  payments,
  subjects,
  students,
  teachers,
  timetable
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
  createSupabaseResource,
  deleteSupabaseResource,
  listSupabaseResource,
  type SchoolResource,
  updateSupabaseResource
} from "@/lib/school-supabase";
import { authService, isSupabaseConfigured } from "@/lib/supabase";
import { subjectOptions } from "@/lib/subjects";
import type { NavModule, Role, SubjectContent, SubjectLesson } from "@/lib/types";

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

const pieData = [
  { name: "Present", value: 76, color: "#10b981" },
  { name: "Late", value: 12, color: "#f59e0b" },
  { name: "Absent", value: 12, color: "#ef4444" }
];

const createConfig: Record<NavModule, { fields: string[] }> = {
  dashboard: { fields: ["Report title", "Date range"] },
  students: { fields: ["Name", "Class", "Parent name", "Phone", "Payment", "Parent Email"] },
  teachers: { fields: ["Name", "Subject", "Email", "Experience", "Salary", "Contact", "Classes"] },
  subjects: { fields: ["Name", "Category", "Grade Levels"] },
  classes: { fields: ["Class", "Section", "Teacher"] },
  attendance: { fields: ["Student", "Class", "Date", "Status"] },
  grades: { fields: ["Student", "Subject", "Score", "Semester", "Student Email"] },
  payments: { fields: ["Student", "Amount", "Status", "Due Date"] },
  timetable: { fields: ["Day", "Time", "Subject", "Teacher"] },
  announcements: { fields: ["Title", "Audience", "Content"] },
  settings: { fields: ["Setting name", "Value"] }
};

const visibleModulesByRole: Record<Role, NavModule[]> = {
  admin: ["dashboard", "students", "teachers", "subjects", "classes", "attendance", "grades", "payments", "timetable", "announcements", "settings"],
  teacher: ["dashboard", "students", "subjects", "classes", "attendance", "grades", "timetable", "announcements", "settings"],
  student: ["dashboard", "subjects", "attendance", "grades", "payments", "timetable", "announcements", "settings"],
  parent: ["dashboard", "subjects", "attendance", "grades", "payments", "announcements", "settings"]
};

const demoSessionKey = "educore_session";
const notificationStorageKey = "educore_activity_notifications";
const parentScopedResources = new Set<SchoolResource>(["attendance", "grades", "payments"]);

function isRole(value: unknown): value is Role {
  return value === "admin" || value === "teacher" || value === "student" || value === "parent";
}

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
  if ((resource === "teachers" || resource === "grades" || resource === "timetable") && field === "Subject") return subjectOptions;
  if (resource === "students" && field === "Payment") return ["Unpaid", "Partial", "Paid"];
  if (resource === "payments" && field === "Status") return ["Unpaid", "Partial", "Paid"];
  if (resource === "attendance" && field === "Status") return ["Present", "Late", "Absent"];
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
  return fetch(`/api/school/${resource}`).then(async (response) => {
    if (!response.ok) throw new Error("Database unavailable");
    return (await response.json()) as ResourceTableData;
  });
}

async function requestLocalResource(
  resource: SchoolResource,
  options: RequestInit & { search?: string } = {}
) {
  const { search = "", ...requestOptions } = options;

  return fetch(`/api/school/${resource}${search}`, requestOptions).then(async (response) => {
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      throw new Error(payload?.message ?? "Database request failed");
    }

    return (await response.json()) as ResourceTableData;
  });
}

function demoResourceData(resource: SchoolResource): ResourceTableData {
  switch (resource) {
    case "students":
      return {
        columns: ["Name", "Class", "Attendance", "GPA", "Payment", "Parent Email"],
        ids: students.map((item) => item.id),
        rows: students.map((item) => [item.fullName, item.className, `${item.attendance}%`, item.gpa.toString(), item.paymentStatus, item.parentEmail])
      };
    case "teachers":
      return {
        columns: ["Name", "Subject", "Email", "Experience", "Salary", "Contact", "Classes"],
        ids: teachers.map((item) => item.id),
        rows: teachers.map((item) => [item.name, item.subject, item.email, item.experience, item.salary, item.contact, item.classes.join(", ")])
      };
    case "subjects":
      return {
        columns: ["Name", "Category", "Grade Levels"],
        ids: subjects.map((item) => item.id),
        rows: subjects.map((item) => [item.name, item.category, item.gradeLevels])
      };
    case "classes":
      return {
        columns: ["Class", "Section", "Teacher", "Students", "Schedule"],
        ids: classes.map((item) => item.id),
        rows: classes.map((item) => [item.name, item.section, item.teacher, item.students.toString(), item.schedule])
      };
    case "attendance":
      return {
        columns: ["Student", "Class", "Date", "Status"],
        ids: attendance.map((item) => item.id),
        rows: attendance.map((item) => [item.student, item.className, item.date, item.status])
      };
    case "grades":
      return {
        columns: ["Student", "Subject", "Score", "Semester", "Student Email"],
        ids: grades.map((item) => item.id),
        rows: grades.map((item) => [item.student, item.subject, `${item.score}%`, item.semester, ""])
      };
    case "payments":
      return {
        columns: ["Student", "Amount", "Status", "Due Date"],
        ids: payments.map((item) => item.id),
        rows: payments.map((item) => [item.student, item.amount, item.status, item.dueDate])
      };
    case "timetable":
      return {
        columns: ["Day", "Time", "Subject", "Teacher", "Class"],
        ids: timetable.map((item, index) => `TT-${index + 1}`),
        rows: timetable.map((item) => [item.day, item.time, item.subject, item.teacher, item.className])
      };
    case "announcements":
      return {
        columns: ["Title", "Content", "Audience", "Date"],
        ids: announcements.map((item) => item.id),
        rows: announcements.map((item) => [item.title, item.content, item.audience, item.date])
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

async function loadResourceData(resource: SchoolResource) {
  if (isSupabaseConfigured) {
    try {
      return { data: await listSupabaseResource(resource), needsLocalParentFilter: false };
    } catch (error) {
      console.warn("Supabase resource unavailable; using local school data fallback.", error);
    }
  }

  return { data: await fetchFallbackResource(resource), needsLocalParentFilter: true };
}

async function saveResourceData(
  resource: SchoolResource,
  mode: ModalMode,
  recordId: string | null,
  values: Record<string, string>
) {
  if (isSupabaseConfigured) {
    try {
      return mode === "edit" && recordId
        ? await updateSupabaseResource(resource, recordId, values)
        : await createSupabaseResource(resource, values);
    } catch (error) {
      console.warn("Supabase save unavailable; using local school data fallback.", error);
    }
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
  if (isSupabaseConfigured) {
    try {
      return await deleteSupabaseResource(resource, recordId);
    } catch (error) {
      console.warn("Supabase delete unavailable; using local school data fallback.", error);
    }
  }

  return requestLocalResource(resource, {
    method: "DELETE",
    search: `?id=${encodeURIComponent(recordId)}`
  });
}

function StatusDropdown({
  language,
  onChange,
  options,
  placeholder,
  value
}: {
  language: Language;
  onChange: (value: string) => void;
  options: string[];
  placeholder: string;
  value: string;
}) {
  const [open, setOpen] = useState(false);
  const selectedLabel = value ? translateValue(value, language) : placeholder;

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
                <span>{translateValue(option, language)}</span>
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
  placeholder,
  darkMode
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  darkMode?: boolean;
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
    <div className={`ec-datepicker-popup${darkMode ? " dark" : ""}`} style={menuStyle}>
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

function AppShell() {
  const router = useRouter();
  const [activeModule, setActiveModule] = useState<NavModule>("dashboard");
  const [role, setRole] = useState<Role>("admin");
  const [language, setLanguage] = useState<Language>("en");
  const [query, setQuery] = useState("");
  const [darkMode, setDarkMode] = useState(false);
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
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [notificationPageOpen, setNotificationPageOpen] = useState(false);
  const [activityNotifications, setActivityNotifications] = useState<ActivityNotification[]>([]);
  const [selectedSubjectContent, setSelectedSubjectContent] = useState<SubjectContentTarget>(null);

  const activeNav = navItems.find((item) => item.id === activeModule) ?? navItems[0];
  const visibleNavItems = navItems.filter((item) => visibleModulesByRole[role].includes(item.id));
  const copy = translations[language];
  const dashboard = copy.dashboards[role];
  const createCopy = copy.create[activeModule];
  const activeResource: SchoolResource | null = activeModule === "dashboard" || activeModule === "settings" ? null : activeModule;
  const modalFields = modalMode === "edit" && resourceData ? resourceData.columns : createConfig[activeModule].fields;
  const modalTitle = modalMode === "edit" ? `${copy.common.edit} ${copy.recordLabel[activeModule]}` : createCopy.title;
  const modalAction = modalMode === "edit" ? copy.common.saveChanges : createCopy.action;
  const unreadNotifications = activityNotifications.filter((item) => !item.read).length;
  const canManageAttendance = role === "admin" || role === "teacher";
  const canManageActiveModule = activeModule === "attendance" ? canManageAttendance : role === "admin";

  async function logout() {
    window.localStorage.removeItem(demoSessionKey);
    window.sessionStorage.removeItem(demoSessionKey);
    await authService.signOut();
    router.push("/login");
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
      classes: { en: "Class", mn: "Анги" },
      attendance: { en: "Attendance", mn: "Ирц" },
      grades: { en: "Grade", mn: "Дүн" },
      payments: { en: "Payment", mn: "Төлбөр" },
      timetable: { en: "Timetable", mn: "Хуваарь" },
      announcements: { en: "Announcement", mn: "Зарлал" }
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
    setFormValues({});
    setModalOpen(true);
  }

  function openEditModal(recordId: string, row: string[], columns: string[]) {
    setModalMode("edit");
    setEditingRecordId(recordId);
    setFormValues(
      columns.reduce<Record<string, string>>((current, column, index) => {
        current[column] = row[index] ?? "";
        return current;
      }, {})
    );
    setModalOpen(true);
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
    const rows = [
      ...students.map((item) => ({ type: "Student", title: item.fullName, meta: item.className, status: item.paymentStatus })),
      ...teachers.map((item) => ({ type: "Teacher", title: item.name, meta: item.subject, status: item.experience })),
      ...classes.map((item) => ({ type: "Class", title: `${item.name}${item.section}`, meta: item.teacher, status: `${item.students} students` })),
      ...announcements.map((item) => ({ type: "Announcement", title: item.title, meta: item.audience, status: item.date }))
    ];

    if (!normalized) return rows.slice(0, 5);

    return rows.filter((row) =>
      [row.type, row.title, row.meta, row.status].some((value) => value.toLowerCase().includes(normalized))
    );
  }, [query]);

  useEffect(() => {
    let ignore = false;

    async function checkAuth() {
      if (isSupabaseConfigured) {
        const { data } = await authService.getSession();

        if (!ignore) {
          if (!data.session) {
            router.replace("/login");
            return;
          }

          const sessionRole = data.session.user.user_metadata?.role;
          const nextRole = isRole(sessionRole) ? sessionRole : "student";
          setCurrentUserEmail(data.session.user.email ?? "");
          setRole(nextRole);
          setActiveModule((currentModule) => (visibleModulesByRole[nextRole].includes(currentModule) ? currentModule : "dashboard"));

          setAuthChecked(true);
        }

        return;
      }

      await Promise.resolve();

      if (!ignore) {
        window.localStorage.removeItem(demoSessionKey);
        const demoSession = window.sessionStorage.getItem(demoSessionKey);

        if (!demoSession) {
          router.replace("/login");
          return;
        }

        try {
          const parsedSession = JSON.parse(demoSession) as { email?: unknown; role?: unknown };
          const nextRole = isRole(parsedSession.role) ? parsedSession.role : "student";
          setCurrentUserEmail(typeof parsedSession.email === "string" ? parsedSession.email : "");
          setRole(nextRole);
          setActiveModule((currentModule) => (visibleModulesByRole[nextRole].includes(currentModule) ? currentModule : "dashboard"));
        } catch {
          setRole("student");
          setCurrentUserEmail("");
          setActiveModule((currentModule) => (visibleModulesByRole.student.includes(currentModule) ? currentModule : "dashboard"));
        }

        setAuthChecked(true);
      }
    }

    checkAuth();

    return () => {
      ignore = true;
    };
  }, [router]);

  useEffect(() => {
    let ignore = false;

    async function loadResource() {
      if (!authChecked) return;

      if (!activeResource) {
        setResourceData(null);
        setResourceError("");
        return;
      }

      setResourceLoading(true);
      setResourceError("");

      try {
        const result = await loadResourceData(activeResource);
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
  }, [activeResource, authChecked, copy.common.databaseOffline, currentUserEmail, role]);

  if (!authChecked) {
    return (
      <main className={`educore-shell auth-check${darkMode ? " dark" : ""}`}>
        <div className="auth-loading">
          <Image src="/download.png" alt="Nova Mind Academy" width={559} height={534} priority />
          <strong>{copy.app.loadingSession}</strong>
        </div>
      </main>
    );
  }

  return (
    <main className={`educore-shell${darkMode ? " dark" : ""}`}>
      <button className={`ec-backdrop${mobileOpen ? " show" : ""}`} onClick={() => setMobileOpen(false)} type="button" />
      <aside className={`ec-sidebar${mobileOpen ? " open" : ""}`}>
        <div className="ec-brand">
          <span className="ec-brand-logo">
            <Image src="/download.png" alt="Nova Mind Academy" width={559} height={534} priority style={{ mixBlendMode: "multiply" }} />
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
          <button className="ec-icon-button theme-toggle" onClick={() => setDarkMode((value) => !value)} type="button">
            {darkMode ? <Sun size={19} /> : <Moon size={19} />}
          </button>
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

            {activeModule === "dashboard" ? <Dashboard copy={copy} language={language} role={role} /> : null}
            {activeModule === "students" ? (
              <StudentsModule apiData={resourceData} canManage={role === "admin"} copy={copy} error={resourceError} language={language} loading={resourceLoading} onAdd={openCreateModal} onDelete={requestDeleteRecord} onEdit={openEditModal} />
            ) : null}
            {activeModule === "teachers" ? (
              <TeachersModule apiData={resourceData} canManage={role === "admin"} copy={copy} error={resourceError} language={language} loading={resourceLoading} onAdd={openCreateModal} onDelete={requestDeleteRecord} onEdit={openEditModal} />
            ) : null}
            {activeModule === "subjects" ? (
              selectedSubjectContent ? (
                <SubjectContentPanel
                  canManage={role === "admin" || role === "teacher"}
                  darkMode={darkMode}
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
            {activeModule === "classes" ? (
              <ClassesModule apiData={resourceData} canManage={role === "admin"} copy={copy} error={resourceError} language={language} loading={resourceLoading} onAdd={openCreateModal} onDelete={requestDeleteRecord} onEdit={openEditModal} />
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
            {activeModule === "settings" ? <SettingsModule copy={copy} darkMode={darkMode} language={language} logout={logout} role={role} setDarkMode={setDarkMode} setLanguage={setLanguage} /> : null}

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
              const options = statusOptionsFor(activeModule, field);

              return options ? (
                <div className="record-field" key={field}>
                  <span>{translateColumn(field, language)}</span>
                  <StatusDropdown
                    language={language}
                    onChange={(value) => setFormValues((current) => ({ ...current, [field]: value }))}
                    options={options}
                    placeholder={translateColumn(field, language)}
                    value={formValues[field] ?? ""}
                  />
                </div>
              ) : (
                <label className="record-field" key={field}>
                  <span>{translateColumn(field, language)}</span>
                  <Input
                    onChange={(event) => setFormValues((current) => ({ ...current, [field]: event.target.value }))}
                    placeholder={translateColumn(field, language)}
                    required={index === 0}
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
        <button
          className={!notificationPageOpen && activeModule === "settings" ? "active" : ""}
          onClick={() => {
            openModule("settings");
          }}
          type="button"
        >
          <SettingsIcon size={20} />
          <span>{copy.nav.settings.label}</span>
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

function Dashboard({ copy, language, role }: { copy: AppCopy; language: Language; role: Role }) {
  const dashboard = copy.dashboards[role];
  const localizedPieData = pieData.map((entry) => ({ ...entry, name: translateValue(entry.name, language) }));

  return (
    <>
      <section className="metric-grid">
        {dashboard.stats.map(([label, value, helper]) => (
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
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={chartData}>
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
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{language === "mn" ? "Ирцийн бүтэц" : "Attendance Mix"}</CardTitle>
            <Badge tone="emerald">{translateValue("Today", language)}</Badge>
          </CardHeader>
          <CardContent className="chart-box">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={localizedPieData} dataKey="value" innerRadius={62} outerRadius={90} paddingAngle={5}>
                  {localizedPieData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid rgba(148, 163, 184, 0.3)", borderRadius: 14, color: "#e5eefc" }} />
              </PieChart>
            </ResponsiveContainer>
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
      columns={["Name", "Class", "Attendance", "GPA", "Payment"]}
      rows={students.map((item) => [item.fullName, item.className, `${item.attendance}%`, item.gpa.toString(), item.paymentStatus])}
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
      columns={["Name", "Subject", "Email", "Experience", "Salary", "Contact", "Classes"]}
      rows={teachers.map((item) => [item.name, item.subject, item.email, item.experience, item.salary, item.contact, item.classes.join(", ")])}
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
      columns={["Name", "Category", "Grade Levels"]}
      rows={subjects.map((item) => [item.name, item.category, item.gradeLevels])}
      contentActionLabel={language === "mn" ? "Агуулга нээх" : "Open content"}
      onOpenContent={onOpenContent}
      {...controls}
    />
  );
}

function SubjectContentPanel({
  canManage,
  darkMode,
  language,
  subject,
  onBack,
  onSaved
}: {
  canManage: boolean;
  darkMode: boolean;
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
  const [assignmentForm, setAssignmentForm] = useState({ title: "", dueDate: "", maxScore: "", type: "Homework", instructions: "" });
  const [activeEditorTab, setActiveEditorTab] = useState<"file" | "topic" | "lesson" | "video" | "assignment" | null>(null);
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

    const topic = {
      id: `T-${Date.now()}`,
      title,
      description: topicForm.description.trim() || undefined
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

  async function addLesson(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const title = lessonForm.title.trim();
    if (!title) return;

    const topicId = selectedTopicId || `T-${Date.now()}`;
    const topics = currentContent.topics.length > 0
      ? currentContent.topics
      : [{ id: topicId, title: language === "mn" ? "Ерөнхий сэдэв" : "General topic" }];
    const nextContent = {
      ...currentContent,
      topics,
      lessons: [
        ...currentContent.lessons,
        {
          id: `L-${Date.now()}`,
          title,
          topicId,
          duration: lessonForm.duration.trim() || undefined,
          objectives: lessonForm.objectives
            .split(/\r?\n|,/)
            .map((item) => item.trim())
            .filter(Boolean)
        }
      ]
    };

    await persistContent(nextContent, title);
    setLessonForm({ title: "", topicId, duration: "", objectives: "" });
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
    const nextContent = {
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
  }

  async function addAssignment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const title = assignmentForm.title.trim();
    if (!title) return;

    const assignment = {
      id: `A-${Date.now()}`,
      title,
      dueDate: assignmentForm.dueDate.trim() || undefined,
      maxScore: assignmentForm.maxScore.trim() ? Number(assignmentForm.maxScore.trim()) : undefined,
      type: assignmentForm.type.trim() || undefined,
      instructions: assignmentForm.instructions.trim() || undefined
    };
    const nextContent = {
      ...currentContent,
      assignments: [...currentContent.assignments, assignment]
    };

    await persistContent(nextContent, title);
    setAssignmentForm({ title: "", dueDate: "", maxScore: "", type: "Homework", instructions: "" });
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
            <div className="table-empty">
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
  <div className="subject-accordion">
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
                    <Button disabled={saving} type="submit">
                      <Plus size={16} />
                      {language === "mn" ? "Сэдэв нэмэх" : "Add topic"}
                    </Button>
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
                    <Button disabled={saving} type="submit">
                      <Plus size={16} />
                      {language === "mn" ? "Хичээл нэмэх" : "Add lesson"}
                    </Button>
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
                    <Button disabled={saving} type="submit">
                      <Video size={16} />
                      {language === "mn" ? "Видео нэмэх" : "Add video"}
                    </Button>
                  </form>
                )}

                {item.id === "assignment" && (
                  <form className="subject-inline-form subject-lesson-form" onSubmit={addAssignment}>
                    <Input onChange={(event) => setAssignmentForm((current) => ({ ...current, title: event.target.value }))} placeholder={language === "mn" ? "Даалгаврын нэр" : "Assignment title"} required value={assignmentForm.title} />
                    <DatePicker
                      darkMode={darkMode}
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
                    <Input onChange={(event) => setAssignmentForm((current) => ({ ...current, instructions: event.target.value }))} placeholder={language === "mn" ? "Зааварчилгаа" : "Instructions"} value={assignmentForm.instructions} />
                    <Button disabled={saving} type="submit">
                      <Plus size={16} />
                      {language === "mn" ? "Даалгавар нэмэх" : "Add assignment"}
                    </Button>
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
                            {lesson.fileUrl ? (
                              <div className="subject-file-actions">
                                <a className="subject-file-link" href={lesson.fileUrl} target="_blank" rel="noreferrer">
                                  <Download size={15} />
                                  <span>{lesson.fileName ?? (language === "mn" ? "Файл нээх" : "Open file")}</span>
                                  {lesson.fileSize ? <small>{formatFileSize(lesson.fileSize)}</small> : null}
                                </a>
                                <button className="subject-file-print" onClick={() => printLessonFile(lesson, topic?.title ? translateValue(topic.title, language) : lesson.topicId)} type="button">
                                  <Printer size={15} />
                                  <span>{language === "mn" ? "PDF-р хэвлэх" : "Print PDF"}</span>
                                </button>
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
                          {assignment.instructions ? <p>{assignment.instructions}</p> : null}
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
    </section>
  );
}

function ClassesModule({ apiData, copy, error, language, loading, ...controls }: ModuleApiProps) {
  return (
    <ModuleTable
      apiData={apiData}
      copy={copy}
      error={error}
      language={language}
      loading={loading}
      title={copy.tables.classes}
      columns={["Class", "Section", "Teacher", "Students", "Schedule"]}
      rows={classes.map((item) => [item.name, item.section, item.teacher, item.students.toString(), item.schedule])}
      {...controls}
    />
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
      columns={["Student", "Class", "Date", "Status"]}
      rows={attendance.map((item) => [item.student, item.className, item.date, item.status])}
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
      rows={grades.map((item) => [item.student, item.subject, `${item.score}%`, item.semester])}
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
      rows={payments.map((item) => [item.student, item.amount, item.status, item.dueDate])}
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
      columns={["Day", "Time", "Subject", "Teacher", "Class"]}
      rows={timetable.map((item) => [item.day, item.time, item.subject, item.teacher, item.className])}
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
      rows={announcements.map((item) => [item.title, item.content, item.audience, item.date])}
      {...controls}
    />
  );
}

function SettingsModule({
  copy,
  darkMode,
  language,
  logout,
  role,
  setDarkMode,
  setLanguage
}: {
  copy: AppCopy;
  darkMode: boolean;
  language: Language;
  logout: () => void;
  role: Role;
  setDarkMode: (value: boolean) => void;
  setLanguage: (value: Language) => void;
}) {
  const [permissionsOpen, setPermissionsOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  return (
    <section className="settings-grid">
      {accountOpen ? (
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
            <button className="mobile-setting-row" onClick={() => setDarkMode(!darkMode)} type="button">
              <span>
                {darkMode
                  ? language === "mn"
                    ? "Гэрэлтэй горим"
                    : "Light Mode"
                  : language === "mn"
                    ? "Шөнийн горим"
                    : "Night Mode"}
              </span>
              <span className={`mobile-switch${darkMode ? " active" : ""}`} aria-hidden="true">
                <span />
              </span>
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
          {loading || error ? <p className="table-subtitle">{loading ? copy.common.loadingRecords : error}</p> : null}
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
          {filteredRows.length > 0 ? (
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

export default function HomePage() {
  return <AppShell />;
}