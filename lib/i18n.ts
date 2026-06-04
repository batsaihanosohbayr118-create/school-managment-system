import type { NavModule, Role } from "@/lib/types";

export type Language = "en" | "mn";

export const languageStorageKey = "educore_language";

export function getInitialLanguage(): Language {
  return "en";
}

export function getStoredLanguage(): Language | null {
  if (typeof window === "undefined") return null;
  const storedLanguage = window.localStorage.getItem(languageStorageKey);
  return storedLanguage === "en" || storedLanguage === "mn" ? storedLanguage : null;
}

export const languages: { id: Language; label: string; name: string }[] = [
  { id: "en", label: "EN", name: "English" },
  { id: "mn", label: "MN", name: "Монгол" }
];

const valueTranslations: Record<string, string> = {
  Absent: "Тасалсан",
  All: "Бүгд",
  Announcement: "Зарлал",
  Class: "Анги",
  Dark: "Харанхуй",
  Done: "Дууссан",
  English: "Англи хэл",
  "Grade 7": "7-р анги",
  "Grade 7B": "7B анги",
  "Grade 8": "8-р анги",
  "Grade 8A": "8A анги",
  "Grade 9": "9-р анги",
  "Grade 9A": "9A анги",
  Late: "Хоцорсон",
  Light: "Гэрэлтэй",
  Mathematics: "Математик",
  "May invoice": "5-р сарын нэхэмжлэх",
  "Midterm timetable published": "Явцын шалгалтын хуваарь нийтлэгдлээ",
  "Mon-Fri": "Даваа-Баасан",
  Monday: "Даваа",
  Open: "Нээлттэй",
  Paid: "Төлсөн",
  Partial: "Хэсэгчлэн",
  Pending: "Хүлээгдэж байна",
  Physics: "Физик",
  Present: "Ирсэн",
  Published: "Нийтлэгдсэн",
  Ready: "Бэлэн",
  Review: "Хянах",
  "Payment reminder": "Төлбөрийн сануулга",
  "Professional development workshop starts Friday.": "Мэргэжил дээшлүүлэх сургалт Баасан гарагт эхэлнэ.",
  "Spring 2026": "2026 оны хавар",
  Student: "Сурагч",
  Students: "Сурагчид",
  "Students can now view upcoming midterm schedules.": "Сурагчид удахгүй болох явцын шалгалтын хуваарийг харах боломжтой.",
  "May tuition invoices are due this week.": "5-р сарын сургалтын төлбөрийн нэхэмжлэхийн хугацаа энэ долоо хоногт дуусна.",
  Teacher: "Багш",
  Teachers: "Багш нар",
  "Teacher workshop": "Багшийн сургалт",
  Thursday: "Пүрэв",
  Tuesday: "Мягмар",
  Wednesday: "Лхагва",
  Today: "Өнөөдөр",
  Unpaid: "Төлөөгүй"
};

export const translations = {
  en: {
    app: {
      brandSubtitle: "Premium School OS",
      loadingSession: "Checking session...",
      searchPlaceholder: "Search students, teachers, classes...",
      defaultModuleSubtitle: "Manage records, workflows, reports, and daily school operations.",
      notifications: "3 new dashboard notifications",
      mobileNavigation: "Mobile navigation"
    },
    auth: {
      brandSubtitle: "School OS",
      secure: "Secure",
      eyebrow: "School Management System",
      tabs: { login: "Login", register: "Register", forgot: "Reset" },
      fields: { name: "Full name", role: "Role", rolePlaceholder: "Choose role", email: "Email", password: "Password", code: "Verification code", newPassword: "New password" },
      messages: {
        registered: "Account created. Use the same email and password to login.",
        demoLoginMissing: "Register first, then login with that email/password.",
        requestComplete: "Request completed successfully.",
        codeSent: "Verification code sent. Check your email.",
        codeVerified: "Code verified. Enter your new password.",
        resetComplete: "Password updated. Login with your new password."
      },
      reset: {
        sendCode: "Send code",
        verifyCode: "Verify code",
        savePassword: "Save new password",
        changeEmail: "Change email"
      },
      modes: {
        login: { title: "Welcome back", subtitle: "Sign in to EduCore", button: "Login" },
        register: { title: "Create account", subtitle: "Register a new school user", button: "Register" },
        forgot: { title: "Reset password", subtitle: "Receive a reset link by email", button: "Send reset link" }
      }
    },
    nav: {
      dashboard: { label: "Dashboard", description: "Role-based analytics and activity center" },
      students: { label: "Students", description: "Student CRUD, profiles, class filters" },
      teachers: { label: "Teachers", description: "Teacher records, subject and class assignment" },
      classes: { label: "Classes", description: "Class sections, teachers, students, schedules" },
      attendance: { label: "Attendance", description: "Daily attendance and reports" },
      grades: { label: "Grades", description: "Scores, GPA, semester reports" },
      payments: { label: "Payments", description: "Tuition tracking and invoices" },
      timetable: { label: "Timetable", description: "Weekly timetable and teacher schedules" },
      announcements: { label: "Announcements", description: "Notices and dashboard notifications" },
      settings: { label: "Settings", description: "Profile, roles, permissions, preferences" }
    } satisfies Record<NavModule, { label: string; description: string }>,
    roles: { admin: "Admin", teacher: "Teacher", student: "Student" } satisfies Record<Role, string>,
    rolePermissions: {
      admin: [
        "Manage students",
        "Manage teachers",
        "Manage classes",
        "Assign subjects",
        "View analytics",
        "Manage payments",
        "Create announcements",
        "Manage attendance",
        "View reports"
      ],
      teacher: ["View assigned classes", "Mark attendance", "Add grades", "Upload assignments", "View student profiles"],
      student: ["View timetable", "View grades", "View attendance", "View announcements", "View payment status"]
    } satisfies Record<Role, string[]>,
    dashboards: {
      admin: {
        title: "Admin Command Center",
        subtitle: "Total school operations, revenue, attendance, and recent activities.",
        stats: [
          ["Total Students", "516", "+12 this month"],
          ["Total Teachers", "80", "10 present today"],
          ["Revenue", "$21,000", "+8.4% vs last month"],
          ["Attendance", "92%", "School average"]
        ]
      },
      teacher: {
        title: "Teacher Workspace",
        subtitle: "Today classes, attendance actions, and pending grading.",
        stats: [
          ["Today Classes", "7", "3 remaining"],
          ["Student Attendance", "94%", "Grade 8A"],
          ["Pending Grading", "24", "Assignments"],
          ["Class Average", "88%", "This semester"]
        ]
      },
      student: {
        title: "Student Portal",
        subtitle: "GPA, attendance, upcoming classes, announcements, and payments.",
        stats: [
          ["GPA", "3.8", "Spring 2026"],
          ["Attendance", "96%", "Excellent"],
          ["Upcoming Classes", "4", "Today"],
          ["Payment Status", "Paid", "May invoice"]
        ]
      }
    } satisfies Record<Role, { title: string; subtitle: string; stats: string[][] }>,
    create: {
      dashboard: { action: "Generate Report", title: "Generate Dashboard Report" },
      students: { action: "Add Student", title: "Add Student" },
      teachers: { action: "Add Teacher", title: "Add Teacher" },
      classes: { action: "Create Class", title: "Create Class" },
      attendance: { action: "Mark Attendance", title: "Mark Attendance" },
      grades: { action: "Add Grade", title: "Add Grade" },
      payments: { action: "Add Payment", title: "Add Payment" },
      timetable: { action: "Add Schedule", title: "Add Timetable Slot" },
      announcements: { action: "Create Notice", title: "Create Announcement" },
      settings: { action: "Save Settings", title: "Update Settings" }
    } satisfies Record<NavModule, { action: string; title: string }>,
    recordLabel: {
      dashboard: "Dashboard Report",
      students: "Student",
      teachers: "Teacher",
      classes: "Class",
      attendance: "Attendance",
      grades: "Grade",
      payments: "Payment",
      timetable: "Timetable Slot",
      announcements: "Announcement",
      settings: "Setting"
    } satisfies Record<NavModule, string>,
    moduleSubtitle: {
      settings: "Manage theme, account session, role access, and preferences."
    } satisfies Partial<Record<NavModule, string>>,
    tables: {
      students: "Student Management",
      teachers: "Teacher Management",
      classes: "Class Management",
      attendance: "Attendance System",
      grades: "Grade System",
      payments: "Payment System",
      timetable: "Timetable System",
      announcements: "Announcement System"
    },
    common: {
      account: "Account",
      actions: "Actions",
      add: "Add",
      appearance: "Appearance",
      cancel: "Cancel",
      clear: "Clear",
      closeModal: "Close modal",
      databaseOffline: "Supabase tables are not ready. Run database/supabase-schema.sql in Supabase SQL Editor.",
      databaseSaveFailed: "Save failed. Check Supabase tables and RLS policies.",
      delete: "Delete",
      deleteFailed: "Delete failed. Check database connection.",
      deleteRecord: "Delete record?",
      deleteWarning: (label: string) => `${label} record will be deleted. This action cannot be undone.`,
      edit: "Edit",
      editRecord: "Edit record",
      filterRecords: "Filter records",
      language: "Language",
      live: "Live",
      loadingRecords: "Loading database records...",
      logout: "Logout",
      logoutHint: "You will leave the system and return to the login page.",
      recordDeleted: "Record deleted",
      recordUpdated: "Record updated",
      recentActivities: "Recent Activities",
      rolePermissions: "Role Permissions",
      saveChanges: "Save Changes",
      savedToDatabase: (action: string) => `${action} saved to database`,
      searchResults: "Search Results",
      session: "Session",
      thisRecord: "this record",
      themeMode: "Theme mode",
      themeModeHint: "Switch dark/light mode here on mobile."
    },
    columns: {
      Amount: "Amount",
      Attendance: "Attendance",
      Audience: "Audience",
      Class: "Class",
      "Class name": "Class name",
      "Class teacher": "Class teacher",
      Classes: "Classes",
      Contact: "Contact",
      Content: "Content",
      Date: "Date",
      Day: "Day",
      "Date range": "Date range",
      "Due Date": "Due Date",
      "Due date": "Due date",
      Email: "Email",
      Experience: "Experience",
      "Full name": "Full name",
      GPA: "GPA",
      Name: "Name",
      Parent: "Parent",
      "Parent name": "Parent name",
      Payment: "Payment",
      Phone: "Phone",
      Salary: "Salary",
      Schedule: "Schedule",
      Score: "Score",
      Section: "Section",
      Semester: "Semester",
      Setting: "Setting",
      "Setting name": "Setting name",
      Status: "Status",
      Student: "Student",
      "Student name": "Student name",
      Students: "Students",
      Subject: "Subject",
      Teacher: "Teacher",
      "Teacher name": "Teacher name",
      Time: "Time",
      Title: "Title",
      Value: "Value",
      "Report title": "Report title"
    } satisfies Record<string, string>
  },
  mn: {
    app: {
      brandSubtitle: "Сургуулийн удирдлагын систем",
      loadingSession: "Нэвтрэлтийг шалгаж байна...",
      searchPlaceholder: "Сурагч, багш, анги хайх...",
      defaultModuleSubtitle: "Бүртгэл, ажлын урсгал, тайлан болон өдөр тутмын сургуулийн үйл ажиллагааг удирдана.",
      notifications: "Dashboard дээр 3 шинэ мэдэгдэл байна",
      mobileNavigation: "Гар утасны навигац"
    },
    auth: {
      brandSubtitle: "Сургуулийн систем",
      secure: "Аюулгүй",
      eyebrow: "Сургуулийн удирдлагын систем",
      tabs: { login: "Нэвтрэх", register: "Бүртгүүлэх", forgot: "Сэргээх" },
      fields: { name: "Бүтэн нэр", role: "Role", rolePlaceholder: "Role сонгох", email: "Имэйл", password: "Нууц үг", code: "Баталгаажуулах код", newPassword: "Шинэ нууц үг" },
      messages: {
        registered: "Бүртгэл үүслээ. Ижил имэйл, нууц үгээрээ нэвтэрнэ үү.",
        demoLoginMissing: "Эхлээд бүртгүүлээд, дараа нь тэр имэйл/нууц үгээрээ нэвтэрнэ.",
        requestComplete: "Хүсэлт амжилттай дууслаа.",
        codeSent: "Баталгаажуулах код илгээгдлээ. Имэйлээ шалгана уу.",
        codeVerified: "Код баталгаажлаа. Шинэ нууц үгээ оруулна уу.",
        resetComplete: "Нууц үг шинэчлэгдлээ. Шинэ нууц үгээрээ нэвтэрнэ үү."
      },
      reset: {
        sendCode: "Код авах",
        verifyCode: "Код шалгах",
        savePassword: "Шинэ нууц үг хадгалах",
        changeEmail: "Имэйл солих"
      },
      modes: {
        login: { title: "Тавтай морил", subtitle: "EduCore-д нэвтрэх", button: "Нэвтрэх" },
        register: { title: "Бүртгэл үүсгэх", subtitle: "Шинэ сургуулийн хэрэглэгч бүртгэх", button: "Бүртгүүлэх" },
        forgot: { title: "Нууц үг сэргээх", subtitle: "Имэйлээр сэргээх холбоос авах", button: "Сэргээх холбоос илгээх" }
      }
    },
    nav: {
      dashboard: { label: "Хянах самбар", description: "Эрхийн түвшинд тохирсон анализ ба үйл ажиллагаа" },
      students: { label: "Сурагчид", description: "Сурагчийн бүртгэл, профайл, ангийн шүүлтүүр" },
      teachers: { label: "Багш нар", description: "Багшийн бүртгэл, хичээл ба анги хуваарилалт" },
      classes: { label: "Ангиуд", description: "Ангийн бүлэг, багш, сурагч, хуваарь" },
      attendance: { label: "Ирц", description: "Өдөр тутмын ирц ба тайлан" },
      grades: { label: "Дүн", description: "Оноо, GPA, улирлын тайлан" },
      payments: { label: "Төлбөр", description: "Сургалтын төлбөр ба нэхэмжлэх" },
      timetable: { label: "Хуваарь", description: "Долоо хоногийн хичээл ба багшийн хуваарь" },
      announcements: { label: "Зарлал", description: "Мэдэгдэл болон dashboard-ийн зарлал" },
      settings: { label: "Тохиргоо", description: "Профайл, эрх, зөвшөөрөл, тохиргоо" }
    } satisfies Record<NavModule, { label: string; description: string }>,
    roles: { admin: "Админ", teacher: "Багш", student: "Сурагч" } satisfies Record<Role, string>,
    rolePermissions: {
      admin: [
        "Сурагч удирдах",
        "Багш удирдах",
        "Анги удирдах",
        "Хичээл оноох",
        "Анализ харах",
        "Төлбөр удирдах",
        "Зарлал үүсгэх",
        "Ирц удирдах",
        "Тайлан харах"
      ],
      teacher: ["Хуваарилагдсан анги харах", "Ирц бүртгэх", "Дүн нэмэх", "Даалгавар оруулах", "Сурагчийн профайл харах"],
      student: ["Хуваарь харах", "Дүн харах", "Ирц харах", "Зарлал харах", "Төлбөрийн төлөв харах"]
    } satisfies Record<Role, string[]>,
    dashboards: {
      admin: {
        title: "Админы удирдлагын төв",
        subtitle: "Сургуулийн үйл ажиллагаа, орлого, ирц болон сүүлийн идэвх.",
        stats: [
          ["Нийт сурагч", "516", "+12 энэ сард"],
          ["Нийт багш", "80", "Өнөөдөр 10 ирсэн"],
          ["Орлого", "$21,000", "Өмнөх сараас +8.4%"],
          ["Ирц", "92%", "Сургуулийн дундаж"]
        ]
      },
      teacher: {
        title: "Багшийн ажлын талбар",
        subtitle: "Өнөөдрийн анги, ирцийн үйлдэл, шалгах дүнгийн ажил.",
        stats: [
          ["Өнөөдрийн анги", "7", "3 үлдсэн"],
          ["Сурагчийн ирц", "94%", "8A анги"],
          ["Шалгах ажил", "24", "Даалгавар"],
          ["Ангийн дундаж", "88%", "Энэ улирал"]
        ]
      },
      student: {
        title: "Сурагчийн портал",
        subtitle: "GPA, ирц, дараагийн хичээл, зарлал болон төлбөр.",
        stats: [
          ["GPA", "3.8", "2026 оны хавар"],
          ["Ирц", "96%", "Маш сайн"],
          ["Дараагийн хичээл", "4", "Өнөөдөр"],
          ["Төлбөрийн төлөв", "Төлсөн", "5-р сарын нэхэмжлэх"]
        ]
      }
    } satisfies Record<Role, { title: string; subtitle: string; stats: string[][] }>,
    create: {
      dashboard: { action: "Тайлан үүсгэх", title: "Dashboard тайлан үүсгэх" },
      students: { action: "Сурагч нэмэх", title: "Сурагч нэмэх" },
      teachers: { action: "Багш нэмэх", title: "Багш нэмэх" },
      classes: { action: "Анги үүсгэх", title: "Анги үүсгэх" },
      attendance: { action: "Ирц бүртгэх", title: "Ирц бүртгэх" },
      grades: { action: "Дүн нэмэх", title: "Дүн нэмэх" },
      payments: { action: "Төлбөр нэмэх", title: "Төлбөр нэмэх" },
      timetable: { action: "Хуваарь нэмэх", title: "Хичээлийн цаг нэмэх" },
      announcements: { action: "Зарлал үүсгэх", title: "Зарлал үүсгэх" },
      settings: { action: "Тохиргоо хадгалах", title: "Тохиргоо шинэчлэх" }
    } satisfies Record<NavModule, { action: string; title: string }>,
    recordLabel: {
      dashboard: "Dashboard тайлан",
      students: "Сурагч",
      teachers: "Багш",
      classes: "Анги",
      attendance: "Ирц",
      grades: "Дүн",
      payments: "Төлбөр",
      timetable: "Хичээлийн цаг",
      announcements: "Зарлал",
      settings: "Тохиргоо"
    } satisfies Record<NavModule, string>,
    moduleSubtitle: {
      settings: "Theme, хэрэглэгчийн session, role access болон preference-ийг удирдана."
    } satisfies Partial<Record<NavModule, string>>,
    tables: {
      students: "Сурагчийн удирдлага",
      teachers: "Багшийн удирдлага",
      classes: "Ангийн удирдлага",
      attendance: "Ирцийн систем",
      grades: "Дүнгийн систем",
      payments: "Төлбөрийн систем",
      timetable: "Хуваарийн систем",
      announcements: "Зарлалын систем"
    },
    common: {
      account: "Бүртгэл",
      actions: "Үйлдэл",
      add: "Нэмэх",
      appearance: "Харагдац",
      cancel: "Болих",
      clear: "Цэвэрлэх",
      closeModal: "Цонх хаах",
      databaseOffline: "Supabase table бэлэн биш байна. database/supabase-schema.sql файлыг Supabase SQL Editor дээр ажиллуулна уу.",
      databaseSaveFailed: "Хадгалж чадсангүй. Supabase table болон RLS policy-оо шалгана уу.",
      delete: "Устгах",
      deleteFailed: "Устгаж чадсангүй. Database холболтоо шалгана уу.",
      deleteRecord: "Бүртгэл устгах уу?",
      deleteWarning: (label: string) => `${label} бүртгэлийг устгах уу? Энэ үйлдлийг буцаах боломжгүй.`,
      edit: "Засах",
      editRecord: "Бүртгэл засах",
      filterRecords: "Бүртгэл шүүх",
      language: "Хэл",
      live: "Шууд",
      loadingRecords: "Database бүртгэлүүдийг ачаалж байна...",
      logout: "Гарах",
      logoutHint: "Системээс гараад login page руу буцна.",
      recordDeleted: "Бүртгэл устлаа",
      recordUpdated: "Бүртгэл шинэчлэгдлээ",
      recentActivities: "Сүүлийн үйл ажиллагаа",
      rolePermissions: "Role зөвшөөрөл",
      saveChanges: "Өөрчлөлт хадгалах",
      savedToDatabase: (action: string) => `${action} database-д хадгалагдлаа`,
      searchResults: "Хайлтын үр дүн",
      session: "Session",
      thisRecord: "энэ бүртгэл",
      themeMode: "Theme горим",
      themeModeHint: "Mobile дээр эндээс dark/light mode солино."
    },
    columns: {
      Amount: "Дүн",
      Attendance: "Ирц",
      Audience: "Хүлээн авагч",
      Class: "Анги",
      "Class name": "Ангийн нэр",
      "Class teacher": "Ангийн багш",
      Classes: "Ангиуд",
      Contact: "Холбоо барих",
      Content: "Агуулга",
      Date: "Огноо",
      "Date range": "Огнооны хүрээ",
      Day: "Гараг",
      "Due Date": "Дуусах огноо",
      "Due date": "Дуусах огноо",
      Email: "Имэйл",
      Experience: "Туршлага",
      "Full name": "Бүтэн нэр",
      GPA: "GPA",
      Name: "Нэр",
      Parent: "Эцэг эх",
      "Parent name": "Эцэг эхийн нэр",
      Payment: "Төлбөр",
      Phone: "Утас",
      Salary: "Цалин",
      Schedule: "Хуваарь",
      Score: "Оноо",
      Section: "Бүлэг",
      Semester: "Улирал",
      Setting: "Тохиргоо",
      "Setting name": "Тохиргооны нэр",
      Status: "Төлөв",
      Student: "Сурагч",
      "Student name": "Сурагчийн нэр",
      Students: "Сурагчид",
      Subject: "Хичээл",
      Teacher: "Багш",
      "Teacher name": "Багшийн нэр",
      Time: "Цаг",
      Title: "Гарчиг",
      Value: "Утга",
      "Report title": "Тайлангийн гарчиг"
    } satisfies Record<string, string>
  }
};

export type AppCopy = (typeof translations)["en"];

export function translateColumn(column: string, language: Language) {
  const columns = translations[language].columns as Record<string, string>;
  return columns[column] ?? column;
}

export function translateValue(value: string, language: Language) {
  if (language === "en") return value;

  const exact = valueTranslations[value];
  if (exact) return exact;

  return value
    .replace(/\bGrade (\d+)([A-Z]?)\b/g, (_match, grade: string, section: string) => `${grade}${section} анги`)
    .replace(/\b(\d+) years\b/g, (_match, years: string) => `${years} жил`)
    .replace(/\b(\d+) students\b/g, (_match, count: string) => `${count} сурагч`);
}
