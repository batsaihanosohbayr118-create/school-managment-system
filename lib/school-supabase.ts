import { supabase } from "@/lib/supabase";
import type { NavModule } from "@/lib/types";

export type SchoolResource = Exclude<NavModule, "dashboard" | "settings">;

export type ResourceTable = {
  columns: string[];
  ids: string[];
  rows: string[][];
};

type SupabaseRow = Record<string, string | number | null>;

const resourceColumns: Record<SchoolResource, string[]> = {
  students: ["Name", "Class", "Attendance", "GPA", "Payment"],
  teachers: ["Name", "Subject", "Email", "Experience", "Salary", "Contact", "Classes"],
  classes: ["Class", "Section", "Teacher", "Students", "Schedule"],
  attendance: ["Student", "Class", "Date", "Status"],
  grades: ["Student", "Subject", "Score", "Semester"],
  payments: ["Student", "Amount", "Status", "Due Date"],
  timetable: ["Day", "Time", "Subject", "Teacher", "Class"],
  announcements: ["Title", "Content", "Audience", "Date"]
};

const tableNames: Record<SchoolResource, string> = {
  students: "students",
  teachers: "teachers",
  classes: "class_rooms",
  attendance: "attendance_records",
  grades: "grade_records",
  payments: "payment_records",
  timetable: "timetable_slots",
  announcements: "announcements"
};

function requireSupabase() {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  return supabase;
}

function idFor(resource: SchoolResource) {
  return `${resource.slice(0, 2).toUpperCase()}-${Date.now().toString().slice(-6)}`;
}

function stringValue(value: unknown) {
  if (value === null || typeof value === "undefined") return "";
  return String(value);
}

function phoneValue(value: unknown) {
  return stringValue(value)
    .replace(/^\+?976[\s-]*/, "")
    .trim();
}

function numberValue(value: unknown) {
  const parsed = Number(String(value ?? "0").replace("%", ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function rowToArray(resource: SchoolResource, row: SupabaseRow) {
  switch (resource) {
    case "students":
      return [row.full_name, row.class_name, `${row.attendance}%`, row.gpa, row.payment_status].map(stringValue);
    case "teachers":
      return [row.name, row.subject, row.email, row.experience, row.salary, phoneValue(row.contact), row.classes].map(stringValue);
    case "classes":
      return [row.name, row.section, row.teacher, row.students, row.schedule].map(stringValue);
    case "attendance":
      return [row.student, row.class_name, row.date, row.status].map(stringValue);
    case "grades":
      return [row.student, row.subject, `${row.score}%`, row.semester].map(stringValue);
    case "payments":
      return [row.student, row.amount, row.status, row.due_date].map(stringValue);
    case "timetable":
      return [row.day, row.time, row.subject, row.teacher, row.class_name].map(stringValue);
    case "announcements":
      return [row.title, row.content, row.audience, row.date].map(stringValue);
  }
}

function createPayload(resource: SchoolResource, values: Record<string, string>) {
  const id = idFor(resource);

  switch (resource) {
    case "students":
      return {
        id,
        full_name: values["Full name"] ?? "",
        email: `${id.toLowerCase()}@educore.mn`,
        phone: values.Phone ?? "",
        gender: "Unknown",
        birth_date: "",
        address: "",
        parent_name: values["Parent name"] ?? "",
        class_name: values.Class ?? "",
        roll_number: id,
        attendance: 0,
        gpa: 0,
        payment_status: "Unpaid"
      };
    case "teachers":
      return {
        id,
        name: values["Teacher name"] ?? "",
        subject: values.Subject ?? "",
        email: values.Email ?? `${id.toLowerCase()}@educore.mn`,
        experience: values.Experience ?? "",
        salary: values.Salary ?? "",
        contact: phoneValue(values.Contact),
        classes: values.Classes ?? ""
      };
    case "classes":
      return {
        id,
        name: values["Class name"] ?? "",
        section: values.Section ?? "",
        teacher: values["Class teacher"] ?? "",
        students: 0,
        schedule: "Mon-Fri"
      };
    case "attendance":
      return {
        id,
        student: values["Student name"] ?? "",
        class_name: "",
        date: values.Date || new Date().toISOString().slice(0, 10),
        status: values.Status || "Present"
      };
    case "grades":
      return {
        id,
        student: values["Student name"] ?? "",
        subject: values.Subject ?? "",
        score: numberValue(values.Score),
        semester: values.Semester ?? ""
      };
    case "payments":
      return {
        id,
        student: values["Student name"] ?? "",
        amount: values.Amount ?? "$0",
        status: values.Status ?? "Unpaid",
        due_date: values["Due date"] ?? ""
      };
    case "timetable":
      return {
        id,
        day: values.Day ?? "",
        time: values.Time ?? "",
        subject: values.Subject ?? "",
        teacher: values.Teacher ?? "",
        class_name: ""
      };
    case "announcements":
      return {
        id,
        title: values.Title ?? "",
        content: values.Content ?? "",
        audience: values.Audience ?? "All",
        date: new Date().toISOString().slice(0, 10)
      };
  }
}

function updatePayload(resource: SchoolResource, values: Record<string, string>) {
  switch (resource) {
    case "students":
      return {
        full_name: values.Name ?? "",
        class_name: values.Class ?? "",
        attendance: numberValue(values.Attendance),
        gpa: numberValue(values.GPA),
        payment_status: values.Payment ?? "Unpaid"
      };
    case "teachers":
      return {
        name: values.Name ?? "",
        subject: values.Subject ?? "",
        email: values.Email ?? "",
        experience: values.Experience ?? "",
        salary: values.Salary ?? "",
        contact: phoneValue(values.Contact),
        classes: values.Classes ?? ""
      };
    case "classes":
      return {
        name: values.Class ?? "",
        section: values.Section ?? "",
        teacher: values.Teacher ?? "",
        students: numberValue(values.Students),
        schedule: values.Schedule ?? ""
      };
    case "attendance":
      return {
        student: values.Student ?? "",
        class_name: values.Class ?? "",
        date: values.Date ?? "",
        status: values.Status ?? "Present"
      };
    case "grades":
      return {
        student: values.Student ?? "",
        subject: values.Subject ?? "",
        score: numberValue(values.Score),
        semester: values.Semester ?? ""
      };
    case "payments":
      return {
        student: values.Student ?? "",
        amount: values.Amount ?? "",
        status: values.Status ?? "Unpaid",
        due_date: values["Due Date"] ?? ""
      };
    case "timetable":
      return {
        day: values.Day ?? "",
        time: values.Time ?? "",
        subject: values.Subject ?? "",
        teacher: values.Teacher ?? "",
        class_name: values.Class ?? ""
      };
    case "announcements":
      return {
        title: values.Title ?? "",
        content: values.Content ?? "",
        audience: values.Audience ?? "All",
        date: values.Date ?? new Date().toISOString().slice(0, 10)
      };
  }
}

export async function listSupabaseResource(resource: SchoolResource): Promise<ResourceTable> {
  const client = requireSupabase();
  const { data, error } = await client
    .from(tableNames[resource])
    .select("*")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });

  if (error) throw error;

  const rows = (data ?? []) as SupabaseRow[];

  return {
    columns: resourceColumns[resource],
    ids: rows.map((row) => stringValue(row.id)),
    rows: rows.map((row) => rowToArray(resource, row))
  };
}

export async function createSupabaseResource(resource: SchoolResource, values: Record<string, string>) {
  const client = requireSupabase();
  const { error } = await client.from(tableNames[resource]).insert(createPayload(resource, values) as Record<string, unknown>);

  if (error) throw error;

  return listSupabaseResource(resource);
}

export async function updateSupabaseResource(resource: SchoolResource, id: string, values: Record<string, string>) {
  const client = requireSupabase();
  const { error } = await client.from(tableNames[resource]).update(updatePayload(resource, values) as Record<string, unknown>).eq("id", id);

  if (error) throw error;

  return listSupabaseResource(resource);
}

export async function deleteSupabaseResource(resource: SchoolResource, id: string) {
  const client = requireSupabase();
  const { error } = await client.from(tableNames[resource]).delete().eq("id", id);

  if (error) throw error;

  return listSupabaseResource(resource);
}
