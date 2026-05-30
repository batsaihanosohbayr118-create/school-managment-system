import {
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
  Student,
  Teacher,
  TimetableSlot
} from "@/lib/types";

export const navItems: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, description: "Role-based analytics and activity center" },
  { id: "students", label: "Students", icon: GraduationCap, description: "Student CRUD, profiles, class filters" },
  { id: "teachers", label: "Teachers", icon: UsersRound, description: "Teacher records, subject and class assignment" },
  { id: "classes", label: "Classes", icon: BookOpen, description: "Class sections, teachers, students, schedules" },
  { id: "attendance", label: "Attendance", icon: ClipboardCheck, description: "Daily attendance and reports" },
  { id: "grades", label: "Grades", icon: CalendarDays, description: "Scores, GPA, semester reports" },
  { id: "payments", label: "Payments", icon: WalletCards, description: "Tuition tracking and invoices" },
  { id: "timetable", label: "Timetable", icon: CalendarDays, description: "Weekly timetable and teacher schedules" },
  { id: "announcements", label: "Announcements", icon: Megaphone, description: "Notices and dashboard notifications" },
  { id: "settings", label: "Settings", icon: Settings, description: "Profile, roles, permissions, preferences" }
];

export const students: Student[] = [
  {
    id: "ST-1001",
    fullName: "Anand Bayarsaikhan",
    email: "anand@educore.mn",
    phone: "+976 9911 2030",
    gender: "Male",
    birthDate: "2010-03-12",
    address: "Ulaanbaatar, Khan-Uul",
    parentName: "Bayarsaikhan",
    className: "Grade 8A",
    rollNumber: "08A-01",
    attendance: 96,
    gpa: 3.8,
    paymentStatus: "Paid"
  },
  {
    id: "ST-1002",
    fullName: "Saruul Enkhjin",
    email: "saruul@educore.mn",
    phone: "+976 8800 4412",
    gender: "Female",
    birthDate: "2011-07-08",
    address: "Ulaanbaatar, Bayanzurkh",
    parentName: "Enkhjin",
    className: "Grade 7B",
    rollNumber: "07B-09",
    attendance: 89,
    gpa: 3.5,
    paymentStatus: "Partial"
  },
  {
    id: "ST-1003",
    fullName: "Temuulen Ganbat",
    email: "temuulen@educore.mn",
    phone: "+976 9505 1177",
    gender: "Male",
    birthDate: "2009-11-21",
    address: "Ulaanbaatar, Sukhbaatar",
    parentName: "Ganbat",
    className: "Grade 9A",
    rollNumber: "09A-12",
    attendance: 78,
    gpa: 3.1,
    paymentStatus: "Unpaid"
  }
];

export const teachers: Teacher[] = [
  { id: "TC-201", name: "Ms. Saraa", subject: "Mathematics", email: "saraa@educore.mn", experience: "8 years", salary: "$1,450", contact: "+976 9919 8000", classes: ["Grade 8A", "Grade 9A"] },
  { id: "TC-202", name: "Mr. Bold", subject: "Physics", email: "bold@educore.mn", experience: "6 years", salary: "$1,320", contact: "+976 8808 5500", classes: ["Grade 9A"] },
  { id: "TC-203", name: "Ms. Nomin", subject: "English", email: "nomin@educore.mn", experience: "5 years", salary: "$1,280", contact: "+976 9900 8080", classes: ["Grade 7B", "Grade 8A"] }
];

export const classes: ClassRoom[] = [
  { id: "CL-8A", name: "Grade 8", section: "A", teacher: "Ms. Saraa", students: 32, schedule: "Mon-Fri" },
  { id: "CL-7B", name: "Grade 7", section: "B", teacher: "Ms. Nomin", students: 29, schedule: "Mon-Fri" },
  { id: "CL-9A", name: "Grade 9", section: "A", teacher: "Mr. Bold", students: 34, schedule: "Mon-Fri" }
];

export const attendance: AttendanceRecord[] = [
  { id: "AT-1", student: "Anand Bayarsaikhan", className: "Grade 8A", date: "2026-05-18", status: "Present" },
  { id: "AT-2", student: "Saruul Enkhjin", className: "Grade 7B", date: "2026-05-18", status: "Late" },
  { id: "AT-3", student: "Temuulen Ganbat", className: "Grade 9A", date: "2026-05-18", status: "Absent" }
];

export const grades: GradeRecord[] = [
  { id: "GR-1", student: "Anand Bayarsaikhan", subject: "Mathematics", score: 94, semester: "Spring 2026" },
  { id: "GR-2", student: "Saruul Enkhjin", subject: "English", score: 88, semester: "Spring 2026" },
  { id: "GR-3", student: "Temuulen Ganbat", subject: "Physics", score: 81, semester: "Spring 2026" }
];

export const payments: PaymentRecord[] = [
  { id: "PY-1", student: "Anand Bayarsaikhan", amount: "$450", status: "Paid", dueDate: "2026-05-01" },
  { id: "PY-2", student: "Saruul Enkhjin", amount: "$450", status: "Partial", dueDate: "2026-05-10" },
  { id: "PY-3", student: "Temuulen Ganbat", amount: "$450", status: "Unpaid", dueDate: "2026-05-15" }
];

export const timetable: TimetableSlot[] = [
  { day: "Monday", time: "09:00", subject: "Mathematics", teacher: "Ms. Saraa", className: "Grade 8A" },
  { day: "Tuesday", time: "10:30", subject: "Physics", teacher: "Mr. Bold", className: "Grade 9A" },
  { day: "Wednesday", time: "11:30", subject: "English", teacher: "Ms. Nomin", className: "Grade 7B" },
  { day: "Thursday", time: "13:00", subject: "Mathematics", teacher: "Ms. Saraa", className: "Grade 9A" }
];

export const announcements: Announcement[] = [
  { id: "AN-1", title: "Midterm timetable published", content: "Students can now view upcoming midterm schedules.", audience: "All", date: "2026-05-18" },
  { id: "AN-2", title: "Teacher workshop", content: "Professional development workshop starts Friday.", audience: "Teachers", date: "2026-05-17" },
  { id: "AN-3", title: "Payment reminder", content: "May tuition invoices are due this week.", audience: "Students", date: "2026-05-16" }
];

export const chartData = [
  { month: "Jan", revenue: 14500, attendance: 91 },
  { month: "Feb", revenue: 17200, attendance: 93 },
  { month: "Mar", revenue: 18100, attendance: 89 },
  { month: "Apr", revenue: 19350, attendance: 94 },
  { month: "May", revenue: 21000, attendance: 92 },
  { month: "Jun", revenue: 22400, attendance: 95 }
];
