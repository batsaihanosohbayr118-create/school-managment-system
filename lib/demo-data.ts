import {
  BookMarked,
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  GraduationCap,
  LayoutDashboard,
  Megaphone,
  Settings,
  UsersRound,
  WalletCards
} from "lucide-react";
import type {
  Announcement,
  AttendanceRecord,
  ClassRoom,
  GradeRecord,
  NavItem,
  PaymentRecord,
  Subject,
  Student,
  Teacher,
  TimetableSlot
} from "@/lib/types";
import { subjectCatalog } from "@/lib/subjects";

// IMPORTANT: These exports are NOT unused leftovers.
// - navItems drives the sidebar (icons can't be stored as JSON/DB data).
// - students/teachers/classes/subjects/attendance/grades/payments/timetable/
//   announcements/chartData are used as a FALLBACK data source in
//   app/page.tsx (demoResourceData / fetchFallbackResource) whenever
//   Supabase AND the local /api/school API are both unreachable, and by
//   the top-bar global search (searchableRows), which reads these arrays
//   directly. Do not remove these exports without also updating
//   app/page.tsx, or the app will crash or lose its offline fallback.

export const navItems: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, description: "Role-based analytics and activity center" },
  { id: "students", label: "Students", icon: GraduationCap, description: "Student CRUD, profiles, class filters" },
  { id: "teachers", label: "Teachers", icon: UsersRound, description: "Teacher records, subject and class assignment" },
  { id: "subjects", label: "Subjects", icon: BookMarked, description: "Subject catalog, categories and grade levels" },
  { id: "classes", label: "Classes", icon: BookOpen, description: "Class sections, teachers, students, schedules" },
  { id: "attendance", label: "Attendance", icon: ClipboardCheck, description: "Daily attendance and reports" },
  { id: "grades", label: "Grades", icon: CalendarDays, description: "Scores, GPA, semester reports" },
  { id: "payments", label: "Payments", icon: WalletCards, description: "Tuition tracking and invoices" },
  { id: "timetable", label: "Timetable", icon: CalendarDays, description: "Weekly timetable and teacher schedules" },
  { id: "announcements", label: "Announcements", icon: Megaphone, description: "Notices and dashboard notifications" },
  { id: "settings", label: "Settings", icon: Settings, description: "Profile, roles, permissions, preferences" }
];

export const subjects: Subject[] = subjectCatalog;

export const students: Student[] = [];

export const teachers: Teacher[] = [];

export const classes: ClassRoom[] = [];

export const attendance: AttendanceRecord[] = [];

export const grades: GradeRecord[] = [];

export const payments: PaymentRecord[] = [];

export const timetable: TimetableSlot[] = [];

export const announcements: Announcement[] = [];

export const chartData = [
  { month: "Jan", revenue: 14500, attendance: 91 },
  { month: "Feb", revenue: 17200, attendance: 93 },
  { month: "Mar", revenue: 18100, attendance: 89 },
  { month: "Apr", revenue: 19350, attendance: 94 },
  { month: "May", revenue: 21000, attendance: 92 },
  { month: "Jun", revenue: 22400, attendance: 95 }
];