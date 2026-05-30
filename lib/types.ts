import type { LucideIcon } from "lucide-react";

export type Role = "admin" | "teacher" | "student";

export type NavModule =
  | "dashboard"
  | "students"
  | "teachers"
  | "classes"
  | "attendance"
  | "grades"
  | "payments"
  | "timetable"
  | "announcements"
  | "settings";

export type NavItem = {
  id: NavModule;
  label: string;
  icon: LucideIcon;
  description: string;
};

export type Student = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  gender: string;
  birthDate: string;
  address: string;
  parentName: string;
  className: string;
  rollNumber: string;
  attendance: number;
  gpa: number;
  paymentStatus: "Paid" | "Unpaid" | "Partial";
};

export type Teacher = {
  id: string;
  name: string;
  subject: string;
  email: string;
  experience: string;
  salary: string;
  contact: string;
  classes: string[];
};

export type ClassRoom = {
  id: string;
  name: string;
  section: string;
  teacher: string;
  students: number;
  schedule: string;
};

export type AttendanceRecord = {
  id: string;
  student: string;
  className: string;
  date: string;
  status: "Present" | "Absent" | "Late";
};

export type GradeRecord = {
  id: string;
  student: string;
  subject: string;
  score: number;
  semester: string;
};

export type PaymentRecord = {
  id: string;
  student: string;
  amount: string;
  status: "Paid" | "Unpaid" | "Partial";
  dueDate: string;
};

export type TimetableSlot = {
  day: string;
  time: string;
  subject: string;
  teacher: string;
  className: string;
};

export type Announcement = {
  id: string;
  title: string;
  content: string;
  audience: "All" | "Teachers" | "Students";
  date: string;
};
