import type { LucideIcon } from "lucide-react";

export type Role = "admin" | "teacher" | "student" | "parent";

export type NavModule =
  | "dashboard"
  | "students"
  | "teachers"
  | "parents"
  | "subjects"
  | "assignments"
  | "materials"
  | "attendance"
  | "grades"
  | "payments"
  | "timetable"
  | "announcements"
  | "wellbeing"
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
  parentEmail: string;
  rollNumber: string;
  attendance: number;
  gpa: number;
  paymentStatus: "Paid" | "Unpaid" | "Partial";
  subjects?: string[];
};

export type Teacher = {
  id: string;
  name: string;
  subject: string;
  subjectId?: string;
  email: string;
  experience: string;
  salary: string;
  contact: string;
  classes: string[];
};

export type Parent = {
  id: string;
  name: string;
  email: string;
  student: string;
  phone: string;
  occupation: string;
};

export type SubjectTopic = {
  id: string;
  title: string;
  description?: string;
};

export type SubjectLesson = {
  id: string;
  title: string;
  topicId: string;
  duration?: string; // "45 min"
  objectives?: string[];
  videoUrl?: string;
  fileName?: string;
  fileUrl?: string;
  fileType?: string;
  fileSize?: number;
  uploadedAt?: string;
};

export type SubjectAssignment = {
  id: string;
  title: string;
  lessonId?: string;
  dueDate?: string;
  maxScore?: number;
  type?: string;
  description?: string;
};

export type SubjectContent = {
  subjectId: string;
  topics: SubjectTopic[];
  lessons: SubjectLesson[];
  assignments: SubjectAssignment[];
};

export type Subject = {
  id: string;
  code: string;
  name: string;
  description: string;
  teacherId?: string | null;
  category: string;
  gradeLevels: string;
  content?: SubjectContent;
};

export type AttendanceRecord = {
  id: string;
  student: string;
  subject: string;
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

export type AssignmentRecord = {
  id: string;
  subject: string;
  title: string;
  type: string;
  dueDate: string;
  maxScore: number;
  description: string;
  status?: string;
};

export type LearningMaterialRecord = {
  id: string;
  subject: string;
  title: string;
  fileType: string;
  uploadedBy: string;
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
  subjectId?: string;
};

export type Announcement = {
  id: string;
  title: string;
  content: string;
  audience: "All" | "Teachers" | "Students";
  date: string;
};

/** A reflection prompt the school psychologist publishes to the student corner. */
export type WellbeingPrompt = {
  id: string;
  question: string;
  category: string;
  note: string;
  date: string;
};
