"use client";

import { type CSSProperties, type FormEvent, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Bell,
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  Wallet,
  Users,
  Megaphone,
  GraduationCap,
  ClipboardCheck,
  CalendarDays,
  BarChart3,
  Award,
  AlertTriangle,
  TrendingUp,
  Target,
  Download,
  ExternalLink,
  FileUp,
  House,
  Inbox,
  LogOut,
  Menu,
  Pencil,
  Plus,
  Printer,
  Search,
  SearchX,
  Trash2,
  UserCog,
  Video,
  X,
  type LucideIcon
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { UserManagement } from "@/components/dashboard/UserManagement";
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
import {
  FileTooLargeError,
  loadSubjectContent,
  openStoredFile,
  resolveStoredFileUrl,
  saveSubjectContent,
  uploadMaterialFile,
  uploadSubjectFiles
} from "@/lib/subjectContent";
import { getInitialDarkMode, setStoredDarkMode } from "@/lib/theme";
import {
  createSchoolResource,
  deleteSchoolResource,
  listSchoolResource,
  updateSchoolResource,
  type SchoolResourceRequestOptions
} from "@/lib/school-api";
import { authService } from "@/lib/auth-client";
import { dashboardPathForRole } from "@/lib/auth-flow";
import { defaultStudentSubjectsValue, subjectCatalog, subjectOptions } from "@/lib/subjects";
import type { NavModule, Role, SubjectAssignment, SubjectContent, SubjectLesson } from "@/lib/types";
/** The web dashboard's resources: one per navigation module. The data layer also has mobile-only ones. */
type SchoolResource = Exclude<NavModule, "dashboard" | "settings">;

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
type AttendanceSlice = { status: string; name: string; value: number; color: string };

/** Every attendance status, in the order the chart and its legend always show them. */
const attendanceStatuses = [
  { status: "present", color: "#2dd4bf", mn: "Ирсэн", en: "Present" },
  { status: "excused", color: "#8b5cf6", mn: "Чөлөөтэй", en: "Excused" },
  { status: "late", color: "#fbbf24", mn: "Хоцорсон", en: "Late" },
  { status: "absent", color: "#fb7185", mn: "Ирээгүй", en: "Absent" }
];

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

/** Payments are recorded in Mongolian tögrög: 150000 → "150,000₮". */
function formatTugrik(amount: number) {
  return `${Math.round(amount).toLocaleString("en-US")}₮`;
}

/**
 * Stores a typed payment amount as tögrög. A new payment with no status or due
 * date counts as paid today, so it lands in the revenue chart straight away.
 */
function normalizePaymentValues(values: Record<string, string>, mode: ModalMode) {
  const next = { ...values };
  if (next.Amount?.trim()) next.Amount = formatTugrik(parseAmount(next.Amount));
  if (mode === "create") {
    if (!next.Status?.trim()) next.Status = "Paid";
    if (!next["Due Date"]?.trim()) next["Due Date"] = new Date().toISOString().slice(0, 10);
    if (!next["Fee Type"]?.trim()) next["Fee Type"] = "Tuition";
  }
  return next;
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

/**
 * The revenue chart before any paid invoice exists: a faint grid and a dashed
 * placeholder curve behind the message, so it reads as "a chart goes here",
 * never as data.
 */
function RevenueEmpty({ language, onOpenPayments }: { language: Language; onOpenPayments?: () => void }) {
  const mn = language === "mn";

  return (
    <div className="revenue-empty">
      <svg aria-hidden="true" className="revenue-empty-ghost" preserveAspectRatio="none" viewBox="0 0 400 160">
        <defs>
          <linearGradient id="revenue-empty-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[32, 64, 96, 128].map((y) => (
          <line key={y} x1="0" x2="400" y1={y} y2={y} />
        ))}
        <path className="revenue-empty-area" d="M0 130 C 50 120, 80 90, 130 96 S 210 120, 260 80 S 340 40, 400 30 L 400 160 L 0 160 Z" />
        <path className="revenue-empty-curve" d="M0 130 C 50 120, 80 90, 130 96 S 210 120, 260 80 S 340 40, 400 30" />
      </svg>
      <div className="revenue-empty-body">
        <span className="revenue-empty-icon">
          <TrendingUp size={26} />
        </span>
        <strong>{mn ? "Төлбөрийн бүртгэл алга" : "No payment records yet"}</strong>
        <p>
          {mn
            ? "Төлөгдсөн нэхэмжлэх бүртгэгдсэний дараа сарын орлого энд график хэлбэрээр харагдана."
            : "Monthly revenue appears here as a chart once paid invoices are recorded."}
        </p>
        {onOpenPayments ? (
          <button className="revenue-empty-action" onClick={onOpenPayments} type="button">
            <Wallet size={16} />
            {mn ? "Төлбөр рүү очих" : "Go to payments"}
          </button>
        ) : null}
      </div>
    </div>
  );
}

/** A filled gold trophy: cup, handles, stem and base, with a highlight on the cup. */
function GoldTrophy() {
  return (
    <svg aria-hidden="true" height="24" viewBox="0 0 24 24" width="24">
      <defs>
        <linearGradient id="trophy-gold" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#fde047" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
      </defs>
      <path d="M7 5H5a2 2 0 0 0 0 4h1.6M17 5h2a2 2 0 0 1 0 4h-1.6" fill="none" stroke="#facc15" strokeLinecap="round" strokeWidth="1.8" />
      <path d="M7 3h10v5.5a5 5 0 0 1-10 0V3z" fill="url(#trophy-gold)" />
      <path d="M9.2 5v3.2a2.8 2.8 0 0 0 1.3 2.4" fill="none" stroke="#fffbeb" strokeLinecap="round" strokeOpacity="0.7" strokeWidth="1.2" />
      <path d="M10.8 13.3h2.4l.5 3.7h-3.4z" fill="#eab308" />
      <rect fill="url(#trophy-gold)" height="3.2" rx="1" width="9" x="7.5" y="17.6" />
    </svg>
  );
}

const MIX_RADIUS = 72;
const MIX_STROKE = 18;
const MIX_CIRCUMFERENCE = 2 * Math.PI * MIX_RADIUS;

/**
 * Attendance as a ring of status arcs with the present rate in its centre, a
 * legend row per status with its count and share — so no status is told apart
 * by colour alone — and a one-line verdict underneath. Hovering an arc or a
 * row highlights the pair.
 */
function AttendanceMixChart({
  slices,
  language,
  onOpen
}: {
  slices: AttendanceSlice[];
  language: Language;
  onOpen?: () => void;
}) {
  const [active, setActive] = useState<string | null>(null);
  const [drawn, setDrawn] = useState(false);
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  const percent = (value: number) => (total ? Math.round((value / total) * 100) : 0);
  const rate = percent(slices.find((slice) => slice.status === "present")?.value ?? 0);
  const shown = slices.filter((slice) => slice.value > 0);
  const mn = language === "mn";

  // Start the arcs empty and let the transition sweep them in.
  useEffect(() => {
    const frame = requestAnimationFrame(() => setDrawn(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  // Round caps reach half a stroke past each end, so a gap between arcs has to clear both.
  const gap = shown.length > 1 ? MIX_STROKE + 6 : 0;
  const spans = shown.map((slice) => (slice.value / total) * MIX_CIRCUMFERENCE);
  const arcs = shown.map((slice, index) => ({
    slice,
    offset: spans.slice(0, index).reduce((sum, span) => sum + span, 0),
    length: Math.max(spans[index] - gap, 0.01)
  }));

  const verdict =
    rate >= 90
      ? { tone: "good", icon: <GoldTrophy />, title: mn ? "Сайн байна!" : "Great job!" }
      : rate >= 75
        ? { tone: "fair", icon: <TrendingUp size={20} />, title: mn ? "Дунджаас дээгүүр" : "Above average" }
        : { tone: "low", icon: <AlertTriangle size={20} />, title: mn ? "Анхаарах шаардлагатай" : "Needs attention" };
  const verdictBody = (
    <>
      <span className="attendance-mix-verdict-icon">{verdict.icon}</span>
      <span className="attendance-mix-verdict-text">
        <strong>{verdict.title}</strong>
        <small>{mn ? `Нийт ирц ${rate}% байна.` : `Overall attendance is ${rate}%.`}</small>
      </span>
    </>
  );

  return (
    <div className="attendance-mix" onMouseLeave={() => setActive(null)}>
      <div className="attendance-mix-body">
        <div className="attendance-mix-ring">
          <svg viewBox="0 0 180 180" role="img" aria-label={slices.map((slice) => `${slice.name} ${slice.value}`).join(", ")}>
            <defs>
              {/* The ring is turned -90°, so these run top-left to bottom-right on screen. */}
              <linearGradient gradientUnits="userSpaceOnUse" id="attendance-present" x1="160" x2="20" y1="20" y2="160">
                <stop offset="0%" stopColor="#34d399" />
                <stop offset="55%" stopColor="#22d3ee" />
                <stop offset="100%" stopColor="#8b5cf6" />
              </linearGradient>
            </defs>
            <circle className="attendance-mix-track" cx="90" cy="90" r={MIX_RADIUS} strokeWidth={MIX_STROKE} />
            {arcs.map(({ slice, offset, length }) => (
              <circle
                className={active && active !== slice.status ? "dimmed" : undefined}
                cx="90"
                cy="90"
                key={slice.status}
                onMouseEnter={() => setActive(slice.status)}
                r={MIX_RADIUS}
                stroke={slice.status === "present" ? "url(#attendance-present)" : slice.color}
                strokeDasharray={`${drawn ? length : 0} ${MIX_CIRCUMFERENCE}`}
                strokeDashoffset={-(offset + gap / 2)}
                strokeLinecap={shown.length > 1 ? "round" : "butt"}
                strokeWidth={MIX_STROKE}
              >
                <title>{`${slice.name}: ${slice.value} (${percent(slice.value)}%)`}</title>
              </circle>
            ))}
          </svg>
          <div className="attendance-mix-center">
            <strong>{rate}%</strong>
            <span>{mn ? "Нийт ирц" : "Attendance"}</span>
          </div>
        </div>
        <ul className="attendance-mix-legend">
          {slices.map((slice) => (
            <li
              className={[active === slice.status ? "active" : "", slice.value === 0 ? "empty" : ""].filter(Boolean).join(" ") || undefined}
              key={slice.status}
              onMouseEnter={() => setActive(slice.status)}
            >
              <i style={{ background: slice.color }} />
              <span>{slice.name}</span>
              <strong>{slice.value}</strong>
              <em>{percent(slice.value)}%</em>
            </li>
          ))}
        </ul>
      </div>
      {onOpen ? (
        <button className={`attendance-mix-verdict ${verdict.tone}`} onClick={onOpen} type="button">
          {verdictBody}
          <ChevronRight size={18} />
        </button>
      ) : (
        <div className={`attendance-mix-verdict ${verdict.tone}`}>{verdictBody}</div>
      )}
    </div>
  );
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
  if (resource === "payments" && field === "Fee Type") return ["Tuition", "App fee", "Lunch fee"];
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

function uploadErrorMessage(error: unknown, language: Language, fallback: string) {
  if (!(error instanceof FileTooLargeError)) return fallback;
  const limit = Math.round(error.maxBytes / 1024 / 1024);
  return language === "mn"
    ? `"${error.fileName}" файл хэт том байна. Дээд хэмжээ ${limit}MB.`
    : `"${error.fileName}" is too large. The limit is ${limit}MB.`;
}

/**
 * A <video> for a lesson video. A stored attachment needs a signed URL — the
 * element cannot send the session header — so it renders once that arrives.
 */
function LessonVideo({ src }: { src: string }) {
  const [resolved, setResolved] = useState<{ src: string; url: string } | null>(null);

  useEffect(() => {
    let ignore = false;
    resolveStoredFileUrl(src)
      .then((url) => {
        if (!ignore) setResolved({ src, url });
      })
      .catch(() => undefined);
    return () => {
      ignore = true;
    };
  }, [src]);

  return resolved?.src === src ? <video controls preload="metadata" src={resolved.url} /> : <video controls preload="none" />;
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
/** Modules a teacher adds to, edits and deletes in, not only reads. */
const teacherManagedModules = new Set<NavModule>(["attendance", "announcements", "assignments", "materials", "timetable"]);
/** Of those, the ones whose rows belong to a subject — limited to the teacher's own. */
const teacherSubjectModules = new Set<NavModule>(["assignments", "materials", "timetable"]);

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

/**
 * Places an open dropdown list with position: fixed beside its trigger, so a
 * scrolling container (the record modal has overflow-y: auto) cannot clip it.
 * Opens upward when there is more room above. Re-measures on scroll/resize.
 */
function useFloatingMenu(open: boolean) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<CSSProperties>({});

  useLayoutEffect(() => {
    if (!open) return;

    function place() {
      const trigger = triggerRef.current;
      const menu = menuRef.current;
      if (!trigger || !menu) return;

      const rect = trigger.getBoundingClientRect();
      const gap = 8;
      const margin = 12;
      const spaceBelow = window.innerHeight - rect.bottom - gap - margin;
      const spaceAbove = rect.top - gap - margin;
      const wanted = Math.min(menu.scrollHeight, 240);
      const openUp = spaceBelow < wanted && spaceAbove > spaceBelow;
      const maxHeight = Math.max(120, Math.min(240, openUp ? spaceAbove : spaceBelow));
      const height = Math.min(wanted, maxHeight);
      const top = openUp ? rect.top - gap - height : rect.bottom + gap;

      menu.style.position = "fixed";
      menu.style.top = `${top}px`;
      menu.style.left = `${rect.left}px`;
      menu.style.width = `${rect.width}px`;
      menu.style.maxHeight = `${maxHeight}px`;

      // An ancestor with backdrop-filter or transform turns "fixed" into
      // "relative to that ancestor"; measure and cancel any such offset.
      const actual = menu.getBoundingClientRect();
      const nextStyle: CSSProperties = {
        position: "fixed",
        top: top - (actual.top - top),
        left: rect.left - (actual.left - rect.left),
        width: rect.width,
        maxHeight,
        zIndex: 1000
      };
      Object.assign(menu.style, { top: `${nextStyle.top}px`, left: `${nextStyle.left}px` });
      setStyle(nextStyle);
    }

    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  return { triggerRef, menuRef, menuStyle: style };
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
  const { triggerRef, menuRef, menuStyle } = useFloatingMenu(open);
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
        ref={triggerRef}
        type="button"
      >
        <span>{selectedLabel}</span>
        <ChevronDown aria-hidden="true" size={18} />
      </button>
      {open ? (
        <div className="ec-select-menu" ref={menuRef} role="listbox" style={menuStyle}>
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
                title={optionLabel(option)}
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

function AppShell({ initialView, lockedRole }: { initialView?: "users"; lockedRole: Role }) {
  const router = useRouter();
  const [activeModule, setActiveModule] = useState<NavModule>("dashboard");
  const [role, setRole] = useState<Role>(lockedRole);
  const [language, setLanguage] = useState<Language>("mn");
  const [query, setQuery] = useState("");
  const [darkMode, setDarkMode] = useState(false);
  const themeLoaded = useRef(false);
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
  const [materialFile, setMaterialFile] = useState<File | null>(null);
  const [notificationPageOpen, setNotificationPageOpen] = useState(false);
  // User management is an admin-only page shown in place of a module.
  const [usersPageOpen, setUsersPageOpen] = useState(initialView === "users" && lockedRole === "admin");
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
  const canManageActiveModule = teacherManagedModules.has(activeModule) ? canManageAttendance : role === "admin";
  // A teacher only adds assignments, materials and timetable slots to their own
  // subjects; the server enforces the same.
  const teacherSubjectNames = role === "teacher" ? subjectScopeOptions.map((option) => option.name) : null;

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
    setUsersPageOpen(false);
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
      setDarkMode(getInitialDarkMode());
      setActivityNotifications(getInitialNotifications());
      themeLoaded.current = true;
    });
  }, []);

  useEffect(() => {
    document.documentElement.lang = language === "mn" ? "mn" : "en";
    window.localStorage.setItem(languageStorageKey, language);
  }, [language]);

  useEffect(() => {
    // Guarded: without this, this effect's first run (before the
    // queueMicrotask above resolves) would fire with the useState default
    // and overwrite the real stored preference before it's ever read.
    if (!themeLoaded.current) return;
    setStoredDarkMode(darkMode);
  }, [darkMode]);

  useEffect(() => {
    window.localStorage.setItem(notificationStorageKey, JSON.stringify(activityNotifications.slice(0, 50)));
  }, [activityNotifications]);

  function openCreateModal() {
    if (!canManageActiveModule || activeModule === "settings") return;

    setModalMode("create");
    setEditingRecordId(null);
    // Pre-fill the school-wide subject set so a new student can see their
    // assignments and grades without the admin typing catalogue names by hand.
    setFormValues(
      activeModule === "students"
        ? { Subjects: defaultStudentSubjectsValue }
        : teacherSubjectModules.has(activeModule) && teacherSubjectNames?.length
          ? {
              Subject: teacherSubjectNames[0],
              ...(activeModule === "timetable" ? { Teacher: currentUserName } : {})
            }
          : {}
    );
    setMaterialFile(null);
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
    setMaterialFile(null);
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
  // above assignments and materials. For a teacher, the subjects they teach:
  // the only ones the assignment dialog offers.
  useEffect(() => {
    // Nothing to clear on the way out: the tabs only render for the roles that
    // need them, and the role is fixed for the lifetime of the dashboard.
    if (!authChecked || !(needsSubjectScope || role === "teacher")) return;

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
  }, [authChecked, needsSubjectScope, role]);

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
                className={!usersPageOpen && activeModule === item.id ? "active" : ""}
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
              className={usersPageOpen && !notificationPageOpen ? "active" : ""}
              data-nav-id="users"
              key="users"
              onClick={() => {
                setUsersPageOpen(true);
                setNotificationPageOpen(false);
                setSelectedSubjectContent(null);
                setMobileOpen(false);
              }}
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
              setUsersPageOpen(false);
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
        ) : usersPageOpen ? (
          <>
            <motion.section className="ec-hero" data-module="users" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
              <div>
                <p className="mobile-hidden">{language === "mn" ? "Бүртгэл ба эрх" : "Accounts and access"}</p>
                <h1>{language === "mn" ? "Хэрэглэгч удирдах" : "Manage Users"}</h1>
                <span className="mobile-hidden">
                  {language === "mn"
                    ? "Админ, багш, сурагч, эцэг эхийн бүртгэлийг үүсгэж, засварлана."
                    : "Create and manage Admin, Teacher, Student, and Parent accounts."}
                </span>
              </div>
            </motion.section>
            <UserManagement />
          </>
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

            {activeModule === "dashboard" ? <Dashboard
                copy={copy}
                currentUserEmail={currentUserEmail}
                language={language}
                onOpenAttendance={visibleModulesByRole[role].includes("attendance") ? () => openModule("attendance") : undefined}
                onOpenPayments={visibleModulesByRole[role].includes("payments") ? () => openModule("payments") : undefined}
                role={role}
              /> : null}
            {activeModule === "students" ? (
              <StudentsModule apiData={resourceData} canManage={role === "admin"} copy={copy} error={resourceError} language={language} loading={resourceLoading} onAdd={openCreateModal} onDelete={requestDeleteRecord} emptyLabel={copy.recordLabel[activeModule]} onEdit={openEditModal} />
            ) : null}
            {activeModule === "teachers" ? (
              <TeachersModule apiData={resourceData} canManage={role === "admin"} copy={copy} error={resourceError} language={language} loading={resourceLoading} onAdd={openCreateModal} onDelete={requestDeleteRecord} emptyLabel={copy.recordLabel[activeModule]} onEdit={openEditModal} />
            ) : null}
            {activeModule === "parents" ? (
              <ParentsModule apiData={resourceData} canManage={role === "admin"} copy={copy} error={resourceError} language={language} loading={resourceLoading} onAdd={openCreateModal} onDelete={requestDeleteRecord} emptyLabel={copy.recordLabel[activeModule]} onEdit={openEditModal} />
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
                  emptyLabel={copy.recordLabel[activeModule]} onEdit={openEditModal}
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
                  <AssignmentsModule apiData={resourceData} canManage={canManageActiveModule} copy={copy} error={resourceError} language={language} loading={resourceLoading} onAdd={openCreateModal} onDelete={requestDeleteRecord} emptyLabel={copy.recordLabel[activeModule]} onEdit={openEditModal} scopeLabel={scopeThisResource ? activeSubjectName : ""} />
                ) : (
                  <MaterialsModule apiData={resourceData} canManage={canManageActiveModule} copy={copy} error={resourceError} language={language} loading={resourceLoading} onAdd={openCreateModal} onDelete={requestDeleteRecord} emptyLabel={copy.recordLabel[activeModule]} onEdit={openEditModal} scopeLabel={scopeThisResource ? activeSubjectName : ""} />
                )}
              </>
            ) : null}
            {activeModule === "attendance" ? (
              <AttendanceModule apiData={resourceData} canManage={canManageAttendance} copy={copy} error={resourceError} language={language} loading={resourceLoading} onAdd={openCreateModal} onDelete={requestDeleteRecord} emptyLabel={copy.recordLabel[activeModule]} onEdit={openEditModal} />
            ) : null}
            {activeModule === "grades" ? (
              <GradesModule apiData={resourceData} canManage={role === "admin"} copy={copy} error={resourceError} language={language} loading={resourceLoading} onAdd={openCreateModal} onDelete={requestDeleteRecord} emptyLabel={copy.recordLabel[activeModule]} onEdit={openEditModal} />
            ) : null}
            {activeModule === "payments" ? (
              <PaymentsModule apiData={resourceData} canManage={role === "admin"} copy={copy} error={resourceError} language={language} loading={resourceLoading} onAdd={openCreateModal} onDelete={requestDeleteRecord} emptyLabel={copy.recordLabel[activeModule]} onEdit={openEditModal} />
            ) : null}
            {activeModule === "timetable" ? (
              <TimetableModule apiData={resourceData} canManage={canManageActiveModule} copy={copy} error={resourceError} language={language} loading={resourceLoading} onAdd={openCreateModal} onDelete={requestDeleteRecord} emptyLabel={copy.recordLabel[activeModule]} onEdit={openEditModal} />
            ) : null}
            {activeModule === "announcements" ? (
              <AnnouncementsModule apiData={resourceData} canManage={canManageAttendance} copy={copy} error={resourceError} language={language} loading={resourceLoading} onAdd={openCreateModal} onDelete={requestDeleteRecord} emptyLabel={copy.recordLabel[activeModule]} onEdit={openEditModal} />
            ) : null}
            {activeModule === "wellbeing" ? (
              <WellbeingModule apiData={resourceData} canManage={role === "admin"} copy={copy} error={resourceError} language={language} loading={resourceLoading} onAdd={openCreateModal} onDelete={requestDeleteRecord} emptyLabel={copy.recordLabel[activeModule]} onEdit={openEditModal} />
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
                let values = activeResource === "payments" ? normalizePaymentValues(formValues, modalMode) : formValues;

                // Materials and assignments carry a stored file: upload it first,
                // then save the row pointing at it. Editing without a new file
                // keeps the old one. Only a material must have a file.
                if (activeResource === "materials" || activeResource === "assignments") {
                  let fileUrl = formValues.File ?? "";
                  let fileType = formValues["File Type"] ?? "";
                  if (materialFile) {
                    const subject = subjectCatalog.find((item) => item.name === formValues.Subject);
                    if (!subject) throw new Error(language === "mn" ? "Эхлээд хичээлээ сонгоно уу" : "Choose a subject first");
                    const uploaded = await uploadMaterialFile(subject.id, materialFile);
                    fileUrl = uploaded.url;
                    fileType = uploaded.fileType;
                  }
                  if (activeResource === "materials") {
                    if (!fileUrl) throw new Error(language === "mn" ? "Файл сонгоно уу" : "Choose a file");
                    values = { Subject: formValues.Subject ?? "", Title: formValues.Title ?? "", "File URL": fileUrl, "File Type": fileType, File: fileUrl };
                  } else {
                    values = { ...formValues, "File URL": fileUrl, File: fileUrl };
                  }
                }

                const data = await saveResourceData(activeResource, modalMode, editingRecordId, values);
                const nextData = modalMode === "edit" ? mergeSubmittedValues(data, editingRecordId, values) : data;

                addActivityNotification(activeResource, modalMode === "edit" ? "updated" : "created", Object.values(values).find(Boolean) ?? "");
                setResourceData(nextData);
                setFormValues({});
                setMaterialFile(null);
                setEditingRecordId(null);
                setModalOpen(false);
                setToast(modalMode === "edit" ? copy.common.recordUpdated : copy.common.savedToDatabase(createCopy.action));
              } catch (error) {
                setToast(error instanceof FileTooLargeError
                  ? uploadErrorMessage(error, language, copy.common.databaseSaveFailed)
                  : error instanceof Error && error.message ? `${copy.common.databaseSaveFailed}: ${error.message}` : copy.common.databaseSaveFailed);
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
              const isTugrikField = activeResource === "payments" && field === "Amount";

              if ((activeResource === "materials" || activeResource === "assignments") && field === "File") {
                return (
                  <label className="record-field" key={field}>
                    <span>{translateColumn(field, language)}</span>
                    <Input
                      accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,image/*,video/*,audio/*"
                      onChange={(event) => setMaterialFile(event.target.files?.[0] ?? null)}
                      required={modalMode === "create" && activeResource === "materials"}
                      type="file"
                    />
                    {modalMode === "edit" && formValues.File && !materialFile ? (
                      <small className="record-hint">{language === "mn" ? "Шинэ файл сонгохгүй бол одоогийн файл хэвээр үлдэнэ." : "Leave empty to keep the current file."}</small>
                    ) : null}
                  </label>
                );
              }
              const options = picksStudent
                ? (studentOptions ?? []).map((student) => student.value)
                : teacherSubjectModules.has(activeModule) && field === "Subject" && teacherSubjectNames
                  ? teacherSubjectNames
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
                  <span>{isTugrikField ? `${translateColumn(field, language)} (₮)` : translateColumn(field, language)}</span>
                  <Input
                    autoComplete={field === "Password" ? "new-password" : undefined}
                    inputMode={isTugrikField ? "numeric" : undefined}
                    onChange={(event) => setFormValues((current) => ({ ...current, [field]: event.target.value }))}
                    placeholder={isTugrikField ? (language === "mn" ? "Жишээ нь: 150000" : "e.g. 150000") : translateColumn(field, language)}
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
            setUsersPageOpen(false);
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

const metricTones = ["blue", "violet", "green", "amber"];

/** One icon per stat tile, in the order each role's stats are listed. */
const metricIcons: Record<Role, LucideIcon[]> = {
  admin: [Users, GraduationCap, Wallet, Target],
  teacher: [Users, Target, ClipboardCheck, BarChart3],
  student: [Award, Target, CalendarDays, Wallet],
  parent: [Target, Award, Wallet, Megaphone]
};

/**
 * The wave in the corner of a stat tile. Decoration only — the same shape on
 * every tile, not a trend: there is no history behind these numbers yet.
 */
function MetricWave() {
  return (
    <svg aria-hidden="true" className="metric-card-wave" viewBox="0 0 100 44">
      <path className="metric-card-wave-fill" d="M2 34 C 14 30, 20 18, 32 18 S 48 28, 56 26 S 76 12, 98 4 L 98 44 L 2 44 Z" />
      <path className="metric-card-wave-line" d="M2 34 C 14 30, 20 18, 32 18 S 48 28, 56 26 S 76 12, 98 4" pathLength={1} />
      <circle cx="32" cy="18" r="2.6" />
      <circle cx="56" cy="26" r="2.6" />
    </svg>
  );
}

function Dashboard({
  copy,
  currentUserEmail,
  language,
  onOpenAttendance,
  onOpenPayments,
  role
}: {
  copy: AppCopy;
  currentUserEmail: string;
  language: Language;
  onOpenAttendance?: () => void;
  onOpenPayments?: () => void;
  role: Role;
}) {
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
            stat(2, formatTugrik(paidTotal), revenueHelper),
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
            stat(2, formatTugrik(openPayments), mn ? `${unpaidCount} төлөөгүй` : `${unpaidCount} unpaid`),
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
        {displayStats.map(([label, value, helper], index) => {
          const Icon = metricIcons[role][index] ?? BarChart3;
          return (
            <Card className={`metric-card ${metricTones[index % metricTones.length]}`} key={label}>
              <div className="metric-card-head">
                <span className="metric-card-icon">
                  <Icon size={20} />
                </span>
                <p>{label}</p>
              </div>
              <strong>{value}</strong>
              <span className="metric-card-helper">{helper}</span>
              <MetricWave />
            </Card>
          );
        })}
      </section>
      <section className="analytics-grid">
        <Card>
          <CardHeader>
            <CardTitle>{language === "mn" ? "Орлогын анализ" : "Revenue Analytics"}</CardTitle>
            <Badge tone="blue">{copy.common.live}</Badge>
          </CardHeader>
          <CardContent className="chart-box">
            {revenueSeries.length === 0 ? (
              <RevenueEmpty language={language} onOpenPayments={onOpenPayments} />
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
                  <YAxis tickFormatter={(value: number) => formatTugrik(value)} width={90} />
                  <Tooltip
                    contentStyle={{ background: "#0f172a", border: "1px solid rgba(148, 163, 184, 0.3)", borderRadius: 14, color: "#e5eefc" }}
                    formatter={(value) => formatTugrik(Number(value))}
                  />
                  <Area dataKey="revenue" fill="url(#revenue)" name={language === "mn" ? "Орлого" : "Revenue"} stroke="#4f46e5" strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div className="attendance-card-title">
              <span>
                <Target size={20} />
              </span>
              <CardTitle>{language === "mn" ? "Ирцийн бүтэц" : "Attendance Mix"}</CardTitle>
            </div>
            <Badge tone="emerald">
              {attendanceTotal} {language === "mn" ? "бүртгэл" : attendanceTotal === 1 ? "record" : "records"}
            </Badge>
          </CardHeader>
          <CardContent className="chart-box">
            {attendanceTotal === 0 ? (
              <div className="table-empty">
                <strong>{language === "mn" ? "Ирцийн бүртгэл алга" : "No attendance records yet"}</strong>
                <p>
                  {language === "mn"
                    ? "Ирц бүртгэж эхэлмэгц ирсэн, хоцорсон, тасалсны харьцаа энд харагдана."
                    : "The present, late and absent split shows up here once attendance is marked."}
                </p>
              </div>
            ) : (
              <AttendanceMixChart language={language} onOpen={onOpenAttendance} slices={attendanceMix} />
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
      columns={["Subject", "Title", "File", "Due Date", "Max Score", "Description"]}
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
      columns={["Subject", "Title", "File Type", "Uploaded By", "File"]}
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
  const [activeView, setActiveView] = useState<"overview" | "topics" | "lessons" | "videos">("overview");
  const [topicForm, setTopicForm] = useState({ title: "", description: "" });
  const [lessonForm, setLessonForm] = useState({ title: "", topicId: "", duration: "", objectives: "" });
  const [videoForm, setVideoForm] = useState({ title: "", topicId: "", duration: "", videoUrl: "" });
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [activeEditorTab, setActiveEditorTab] = useState<"file" | "topic" | "lesson" | "video" | null>(null);
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [editingVideoId, setEditingVideoId] = useState<string | null>(null);
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null);
  const [deleteLessonTarget, setDeleteLessonTarget] = useState<{ id: string; label: string } | null>(null);
  const [deleteTopicTarget, setDeleteTopicTarget] = useState<{ id: string; label: string } | null>(null);
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
    } catch (error) {
      setMessage(uploadErrorMessage(error, language, language === "mn" ? "Файл/видео upload хийж чадсангүй." : "The files or videos could not be uploaded."));
    } finally {
      setSaving(false);
    }
  }

  async function printLessonFile(lesson: SubjectLesson, topicTitle: string) {
    if (!lesson.fileUrl) return;

    // Opened before the await, so the popup blocker counts it as part of the click.
    const printWindow = window.open("", "_blank", "width=1080,height=760");

    if (!printWindow) {
      setMessage(language === "mn" ? "Хэвлэх цонх нээгдсэнгүй." : "The print window could not be opened.");
      return;
    }

    let fileUrl: string;
    try {
      fileUrl = new URL(await resolveStoredFileUrl(lesson.fileUrl), window.location.origin).href;
    } catch {
      printWindow.close();
      setMessage(language === "mn" ? "Файлыг нээж чадсангүй." : "Could not open the file.");
      return;
    }
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
      } catch (error) {
        setMessage(uploadErrorMessage(error, language, language === "mn" ? "Видео файл upload хийж чадсангүй." : "The video file could not be uploaded."));
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
              : language === "mn" ? "Видео хичээлүүд" : "Video lessons"}
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
          </div>

          {canManage && activeView === "overview" ? (
  <div className="subject-accordion" id="subject-editor-accordion">
    {(
      [
        { id: "file", icon: <FileUp size={18} />, labelEn: "Add from file", labelMn: "Файлаас нэмэх" },
        { id: "topic", icon: <BookOpen size={18} />, labelEn: "Add topic", labelMn: "Сэдэв нэмэх" },
        { id: "lesson", icon: <Plus size={18} />, labelEn: "Add lesson", labelMn: "Хичээл нэмэх" },
        { id: "video", icon: <Video size={18} />, labelEn: "Add video lesson", labelMn: "Видео хичээл нэмэх" },
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
                                    <a
                                      className="subject-file-link"
                                      href={lesson.fileUrl}
                                      onClick={(event) => {
                                        event.preventDefault();
                                        openStoredFile(lesson.fileUrl ?? "").catch(() => setMessage(language === "mn" ? "Файлыг нээж чадсангүй." : "Could not open the file."));
                                      }}
                                      rel="noreferrer"
                                      target="_blank"
                                    >
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
                                  <LessonVideo src={lessonVideoUrl ?? ""} />
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
                                    <LessonVideo src={lessonVideoUrl ?? ""} />
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
      columns={["Student", "Amount", "Status", "Due Date", "Fee Type"]}
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
  /** What this table holds ("Зарлал"), for the empty state. */
  emptyLabel?: string;
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
  emptyLabel,
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
          <label className="table-filter">
            <Search aria-hidden="true" size={17} />
            <Input aria-label={copy.common.filterRecords} value={filterQuery} onChange={(event) => setFilterQuery(event.target.value)} placeholder={copy.common.filterRecords} />
          </label>
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
                    {displayColumns[index] === "File" ? (
                      /^(\/|https?:\/\/)/.test(cell) ? (
                        <button
                          className="file-open-action"
                          onClick={() => {
                            openStoredFile(cell).catch(() => window.alert(language === "mn" ? "Файлыг нээж чадсангүй" : "Could not open the file"));
                          }}
                          type="button"
                        >
                          <ExternalLink size={14} />
                          {language === "mn" ? "Нээх" : "Open"}
                        </button>
                      ) : (
                        "—"
                      )
                    ) : ["Paid", "Unpaid", "Partial", "Present", "Absent", "Late"].includes(cell) ? (
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
              <span className="table-empty-icon" aria-hidden="true">
                {normalizedFilter ? <SearchX size={22} /> : <Inbox size={22} />}
              </span>
              <strong>
                {normalizedFilter
                  ? (language === "mn" ? "Илэрц олдсонгүй" : "No matches found")
                  : language === "mn"
                    ? `Одоогоор ${(emptyLabel || "бүртгэл").toLocaleLowerCase("mn")} алга`
                    : `No ${(emptyLabel || "").toLowerCase()} records yet`.replace("  ", " ")}
              </strong>
              <p>
                {normalizedFilter
                  ? (language === "mn" ? "Хайлтын үгээ өөрчлөөд дахин оролдоно уу." : "Try a different filter term.")
                  : (language === "mn" ? "Шинэ бүртгэл нэмэгдмэгц энд харагдана." : "New records will appear here once they are added.")}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function DashboardApp({ initialView, lockedRole }: { initialView?: "users"; lockedRole: Role }) {
  return <AppShell initialView={initialView} lockedRole={lockedRole} />;
}

export default DashboardApp;
