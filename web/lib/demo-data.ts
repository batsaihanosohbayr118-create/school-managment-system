import {
  BookMarked,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  GraduationCap,
  HeartHandshake,
  LayoutDashboard,
  Megaphone,
  FileText,
  Settings,
  UserRound,
  UsersRound,
  WalletCards
} from "lucide-react";
import type {
  Announcement,
  AttendanceRecord,
  GradeRecord,
  NavItem,
  PaymentRecord,
  Subject,
  Student,
  Teacher,
  TimetableSlot
} from "@/lib/types";
import { subjectCatalog } from "@/lib/subjects";


export const navItems: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, description: "Role-based analytics and activity center" },
  { id: "students", label: "Students", icon: GraduationCap, description: "Student CRUD, profiles, class filters" },
  { id: "teachers", label: "Teachers", icon: UsersRound, description: "Teacher records, subject and class assignment" },
  { id: "parents", label: "Parents", icon: UserRound, description: "Parent profiles and linked student accounts" },
  { id: "subjects", label: "Subjects", icon: BookMarked, description: "Subject catalog, categories and grade levels" },
  { id: "assignments", label: "Assignments", icon: ClipboardList, description: "Subject assignments and submission status" },
  { id: "materials", label: "Materials", icon: FileText, description: "Learning materials and subject files" },
  { id: "attendance", label: "Attendance", icon: ClipboardCheck, description: "Daily attendance and reports" },
  { id: "grades", label: "Grades", icon: CalendarDays, description: "Scores, GPA, semester reports" },
  { id: "payments", label: "Payments", icon: WalletCards, description: "Tuition tracking and invoices" },
  { id: "timetable", label: "Timetable", icon: CalendarDays, description: "Weekly timetable and teacher schedules" },
  { id: "announcements", label: "Announcements", icon: Megaphone, description: "Notices and dashboard notifications" },
  { id: "wellbeing", label: "Wellbeing Corner", icon: HeartHandshake, description: "Reflection prompts the psychologist publishes to students" },
  { id: "settings", label: "Settings", icon: Settings, description: "Profile, roles, permissions, preferences" }
];

export const subjects: Subject[] = subjectCatalog;

export const students: Student[] = [];

export const teachers: Teacher[] = [];

export const attendance: AttendanceRecord[] = [];

export const grades: GradeRecord[] = [];

export const payments: PaymentRecord[] = [];

export const timetable: TimetableSlot[] = [];

export const announcements: Announcement[] = [];
