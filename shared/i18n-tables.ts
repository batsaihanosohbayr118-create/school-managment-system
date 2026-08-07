/**
 * The translation tables themselves, shared between the web app and the
 * Expo mobile client. Window/localStorage-dependent helpers
 * (getInitialLanguage, getStoredLanguage, languageStorageKey) stay in
 * lib/i18n.ts, which re-exports everything here so no web import path
 * changes.
 *
 * Role and NavModule below are structural duplicates of the same types in
 * lib/types.ts. They can't be imported from there — that file pulls in
 * lucide-react, a web-only dependency shared/ must not carry — so keep the
 * two lists in sync by hand if a role or module is ever added or renamed.
 */
export type Language = "en" | "mn";

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

export const languages: { id: Language; label: string; name: string }[] = [
  { id: "mn", label: "MN", name: "Монгол" },
  { id: "en", label: "EN", name: "English" }
];

const valueTranslations: Record<string, string> = {
  Absent: "Тасалсан",
  All: "Бүгд",
  Announcement: "Зарлал",
  Art: "Дүрслэх урлаг",
  Biology: "Биологи",
  Core: "Үндсэн",
  Chemistry: "Хими",
  Class: "Анги",
  "Civic Education": "Иргэний боловсрол",
  "Computer Science": "Мэдээлэл зүй",
  Dark: "Харанхуй",
  Done: "Дууссан",
  Family: "Гэр бүл",
  Focus: "Анхаарал",
  Friendship: "Найз нөхөд",
  General: "Ерөнхий",
  Mood: "Сэтгэл санаа",
  Sleep: "Нойр",
  Stress: "Стресс",
  English: "Англи хэл",
  Friday: "Баасан",
  Geography: "Газар зүй",
  "Grade 7": "7-р анги",
  "Grade 7-12": "7-12-р анги",
  "Grade 7B": "7B анги",
  "Grade 8": "8-р анги",
  "Grade 8-12": "8-12-р анги",
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
  "Mongolian Language": "Монгол хэл",
  "Mongolian Literature": "Монголын уран зохиол",
  Music: "Хөгжим",
  "Social Science": "Нийгмийн ухаан",
  Science: "Шинжлэх ухаан",
  Open: "Нээлттэй",
  Paid: "Төлсөн",
  Partial: "Хэсэгчлэн",
  Pending: "Хүлээгдэж байна",
  "Physical Education": "Биеийн тамир",
  Physics: "Физик",
  Present: "Ирсэн",
  Published: "Нийтлэгдсэн",
  Ready: "Бэлэн",
  Review: "Хянах",
  "Payment reminder": "Төлбөрийн сануулга",
  "Professional development workshop starts Friday.": "Мэргэжил дээшлүүлэх сургалт Баасан гарагт эхэлнэ.",
  Russian: "Орос хэл",
  Saturday: "Бямба",
  "Social Studies": "Нийгмийн ухаан",
  "Spring 2026": "2026 оны хавар",
  Student: "Сурагч",
  Sunday: "Ням",
  Students: "Сурагчид",
  "Language": "Хэл",
  Wellbeing: "Эрүүл мэнд",
  "Students can now view upcoming midterm schedules.": "Сурагчид удахгүй болох явцын шалгалтын хуваарийг харах боломжтой.",
  "May tuition invoices are due this week.": "5-р сарын сургалтын төлбөрийн нэхэмжлэхийн хугацаа энэ долоо хоногт дуусна.",
  Teacher: "Багш",
  Teachers: "Багш нар",
  "Teacher workshop": "Багшийн сургалт",
  Technology: "Технологи",
  Health: "Эрүүл мэнд",
  Thursday: "Пүрэв",
  Tuesday: "Мягмар",
  "Uploaded lesson files": "Оруулсан хичээлийн файлууд",
  Wednesday: "Лхагва",
  Today: "Өнөөдөр",
  Unpaid: "Төлөөгүй",
  "Word, PowerPoint, PDF, and other prepared lesson materials": "Word, PowerPoint, PDF болон бусад бэлдсэн хичээлийн материалууд"
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
        login: { title: "Welcome back", subtitle: "Sign in to Nova Mind Academy", button: "Login" },
        register: { title: "Create account", subtitle: "Register a new school user", button: "Register" },
        forgot: { title: "Reset password", subtitle: "Receive a reset link by email", button: "Send reset link" }
      }
    },
    nav: {
      dashboard: { label: "Dashboard", description: "Role-based analytics and activity center" },
      students: { label: "Students", description: "Student CRUD, profiles, class filters" },
      teachers: { label: "Teachers", description: "Teacher records, subject and class assignment" },
      parents: { label: "Parents", description: "Parent profiles and linked student accounts" },
      subjects: { label: "Subjects", description: "Subject catalog, categories and grade levels" },
      assignments: { label: "Assignments", description: "Subject assignments and submission status" },
      materials: { label: "Materials", description: "Learning materials and subject files" },
      attendance: { label: "Attendance", description: "Daily attendance and reports" },
      grades: { label: "Grades", description: "Scores, GPA, semester reports" },
      payments: { label: "Payments", description: "Tuition tracking and invoices" },
      timetable: { label: "Timetable", description: "Weekly timetable and teacher schedules" },
      announcements: { label: "Announcements", description: "Notices and dashboard notifications" },
      wellbeing: { label: "Wellbeing Corner", description: "Reflection prompts the psychologist publishes to students" },
      settings: { label: "Settings", description: "Profile, roles, permissions, preferences" }
    } satisfies Record<NavModule, { label: string; description: string }>,
    roles: { admin: "Admin", teacher: "Teacher", student: "Student", parent: "Parent" } satisfies Record<Role, string>,
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
      student: ["View timetable", "View grades", "View attendance", "View announcements", "View payment status"],
      parent: ["View child's grades", "View child's attendance", "View announcements", "View payment status"]
    } satisfies Record<Role, string[]>,
    dashboards: {
      admin: {
        title: "Admin Command Center",
        subtitle: "Total school operations, revenue, attendance, and recent activities.",
        stats: [
          ["Total Students", "—", "Loading"],
          ["Total Teachers", "—", "Loading"],
          ["Revenue", "—", "Loading"],
          ["Attendance", "—", "Loading"]
        ]
      },
      teacher: {
        title: "Teacher Workspace",
        subtitle: "Today classes, attendance actions, and pending grading.",
        stats: [
          ["Today Classes", "—", "Loading"],
          ["Student Attendance", "—", "Loading"],
          ["Assignments", "—", "Loading"],
          ["Class Average", "—", "Loading"]
        ]
      },
      student: {
        title: "Student Portal",
        subtitle: "GPA, attendance, upcoming classes, announcements, and payments.",
        stats: [
          ["GPA", "—", "Loading"],
          ["Attendance", "—", "Loading"],
          ["Today Classes", "—", "Loading"],
          ["Payment Status", "—", "Loading"]
        ]
      },
      parent: {
        title: "Parent Portal",
        subtitle: "Child attendance, grades, announcements, and payment status in one place.",
        stats: [
          ["Child Attendance", "—", "Loading"],
          ["Latest GPA", "—", "Loading"],
          ["Open Payments", "—", "Loading"],
          ["Announcements", "—", "Loading"]
        ]
      }
    } satisfies Record<Role, { title: string; subtitle: string; stats: string[][] }>,
    create: {
      dashboard: { action: "Generate Report", title: "Generate Dashboard Report" },
      students: { action: "Add Student", title: "Add Student" },
      teachers: { action: "Add Teacher", title: "Add Teacher" },
      parents: { action: "Add Parent", title: "Add Parent" },
      subjects: { action: "Add Subject", title: "Add Subject" },
      assignments: { action: "Add Assignment", title: "Add Assignment" },
      materials: { action: "Add Material", title: "Add Material" },
      attendance: { action: "Mark Attendance", title: "Mark Attendance" },
      grades: { action: "Add Grade", title: "Add Grade" },
      payments: { action: "Add Payment", title: "Add Payment" },
      timetable: { action: "Add Schedule", title: "Add Timetable Slot" },
      announcements: { action: "Create Notice", title: "Create Announcement" },
      wellbeing: { action: "Add Question", title: "Add Wellbeing Question" },
      settings: { action: "Save Settings", title: "Update Settings" }
    } satisfies Record<NavModule, { action: string; title: string }>,
    recordLabel: {
      dashboard: "Dashboard Report",
      students: "Student",
      teachers: "Teacher",
      parents: "Parent",
      subjects: "Subject",
      assignments: "Assignment",
      materials: "Material",
      attendance: "Attendance",
      grades: "Grade",
      payments: "Payment",
      timetable: "Timetable Slot",
      announcements: "Announcement",
      wellbeing: "Wellbeing Question",
      settings: "Setting"
    } satisfies Record<NavModule, string>,
    moduleSubtitle: {
      settings: "Manage theme, account session, role access, and preferences.",
      wellbeing: "Questions published here appear in the student's Wellbeing Corner."
    } satisfies Partial<Record<NavModule, string>>,
    tables: {
      students: "Student Management",
      teachers: "Teacher Management",
      parents: "Parent Management",
      subjects: "Subject Catalog",
      assignments: "Assignment System",
      materials: "Learning Materials",
      attendance: "Attendance System",
      grades: "Grade System",
      payments: "Payment System",
      timetable: "Timetable System",
      announcements: "Announcement System",
      wellbeing: "Wellbeing Corner"
    },
    wellbeing: {
      openLabel: "Wellbeing Corner",
      title: "Wellbeing Corner",
      subtitle: "A few questions from the school psychologist. Take your time — nothing here is recorded.",
      emptyTitle: "No questions yet",
      emptyBody: "When the psychologist publishes a question it will appear here.",
      loading: "Loading questions…",
      loadFailed: "The questions could not be loaded. Try again in a moment.",
      counter: (index: number, total: number) => `Question ${index} of ${total}`,
      previous: "Previous",
      next: "Next"
    },
    common: {
      account: "Account",
      actions: "Actions",
      add: "Add",
      appearance: "Appearance",
      cancel: "Cancel",
      clear: "Clear",
      closeModal: "Close modal",
      databaseOffline: "Could not reach the database. Check DATABASE_URL and that Neon is available.",
      databaseSaveFailed: "Save failed. Check the database connection and try again.",
      delete: "Delete",
      deleteFailed: "Delete failed. Check database connection.",
      deleteRecord: "Delete record?",
      deleteWarning: (label: string) => `${label} record will be deleted. This action cannot be undone.`,
      edit: "Edit",
      editRecord: "Edit record",
      filterRecords: "Filter records",
      general: "General",
      language: "Language",
      live: "Live",
      loading: "Loading…",
      loadingRecords: "Loading database records...",
      loadingStudents: "Loading students…",
      logout: "Logout",
      logoutHint: "You will leave the system and return to the login page.",
      noAnnouncementsYet: "No announcements yet.",
      noUnlinkedStudents: "Every student already has a parent linked.",
      noPaymentsYet: "No payments yet.",
      noAttendanceRecordsYet: "No attendance records yet.",
      noTimetableSlotsYet: "No timetable slots yet.",
      nothingScheduledFor: (day: string) => `Nothing scheduled for ${day}.`,
      offlineShowingSavedData: "Offline — showing saved data",
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
      themeModeHint: "Switch dark/light mode here on mobile.",
      useSystemTheme: "Use System Setting",
      darkMode: "Dark Mode",
      mongolianLanguage: "Mongolian",
      todaysClasses: "Today's classes",
      todaysSchedule: "Today's schedule",
      latestGrades: "Latest grades",
      noGradesYet: "No grades yet.",
      viewPayments: "View payments"
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
      Category: "Category",
      Date: "Date",
      Day: "Day",
      "Date range": "Date range",
      "Due Date": "Due Date",
      "Due date": "Due date",
      Email: "Email",
      Experience: "Experience",
      "Full name": "Full name",
      "Grade Levels": "Grade Levels",
      GPA: "GPA",
      Name: "Name",
      Note: "Note",
      Parent: "Parent",
      "Parent Email": "Parent Email",
      "Parent name": "Parent name",
      Password: "Password",
      Payment: "Payment",
      Phone: "Phone",
      Question: "Question",
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
      Subjects: "Subjects",
      Teacher: "Teacher",
      "Teacher name": "Teacher name",
      Time: "Time",
      Title: "Title",
      Value: "Value",
      "Report title": "Report title"
    } satisfies Record<string, string>,
    mobileForms: {
      save: "Save",
      dateFormatHint: "(YYYY-MM-DD)",
      saveFailed: "Could not save. Please try again.",
      dayPlaceholder: "e.g. Monday",
      timePlaceholder: "e.g. 09:00-09:45",
      classPlaceholder: "e.g. Grade 8A",
      photoPermissionDenied: "Photo library access is required to change your photo.",
      avatarUpdateFailed: "Could not update photo. Please try again.",
      invalidCredentials: "Incorrect email or password."
    },
    adminWebOnly: {
      title: "Admin tools live on the web",
      body: "This app covers the day-to-day screens for teachers, students, and parents. Manage students, teachers, classes, and payments from the admin dashboard on the web.",
      openDashboard: "Open the web dashboard"
    },
    notFound: {
      title: "Oops!",
      body: "This screen doesn't exist.",
      goHome: "Go to home screen!"
    }
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
        login: { title: "Тавтай морил", subtitle: "Nova Mind Academy-д нэвтрэх", button: "Нэвтрэх" },
        register: { title: "Бүртгэл үүсгэх", subtitle: "Шинэ сургуулийн хэрэглэгч бүртгэх", button: "Бүртгүүлэх" },
        forgot: { title: "Нууц үг сэргээх", subtitle: "Имэйлээр сэргээх холбоос авах", button: "Сэргээх холбоос илгээх" }
      }
    },
    nav: {
      dashboard: { label: "Хянах самбар", description: "Эрхийн түвшинд тохирсон анализ ба үйл ажиллагаа" },
      students: { label: "Сурагчид", description: "Сурагчийн бүртгэл, профайл, ангийн шүүлтүүр" },
      teachers: { label: "Багш нар", description: "Багшийн бүртгэл, хичээл ба анги хуваарилалт" },
      parents: { label: "Эцэг эх", description: "Эцэг эхийн профайл ба холбогдсон сурагчийн бүртгэл" },
      subjects: { label: "Хичээлүүд", description: "Хичээлийн жагсаалт, төрөл болон ангийн түвшин" },
      assignments: { label: "Даалгавар", description: "Хичээлийн даалгавар ба илгээлтийн төлөв" },
      materials: { label: "Материал", description: "Хичээлийн материал ба файлууд" },
      attendance: { label: "Ирц", description: "Өдөр тутмын ирц ба тайлан" },
      grades: { label: "Дүн", description: "Оноо, GPA, улирлын тайлан" },
      payments: { label: "Төлбөр", description: "Сургалтын төлбөр ба нэхэмжлэх" },
      timetable: { label: "Хуваарь", description: "Долоо хоногийн хичээл ба багшийн хуваарь" },
      announcements: { label: "Зарлал", description: "Мэдэгдэл болон dashboard-ийн зарлал" },
      wellbeing: { label: "Сэтгэл зүйчийн булан", description: "Сурагчдад зориулж сэтгэл зүйчийн нийтэлдэг асуултууд" },
      settings: { label: "Тохиргоо", description: "Профайл, эрх, зөвшөөрөл, тохиргоо" }
    } satisfies Record<NavModule, { label: string; description: string }>,
    roles: { admin: "Админ", teacher: "Багш", student: "Сурагч", parent: "Эцэг эх" } satisfies Record<Role, string>,
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
      student: ["Хуваарь харах", "Дүн харах", "Ирц харах", "Зарлал харах", "Төлбөрийн төлөв харах"],
      parent: ["Хүүхдийн дүн харах", "Хүүхдийн ирц харах", "Зарлал харах", "Төлбөрийн төлөв харах"]
    } satisfies Record<Role, string[]>,
    dashboards: {
      admin: {
        title: "Админы удирдлагын төв",
        subtitle: "Сургуулийн үйл ажиллагаа, орлого, ирц болон сүүлийн идэвх.",
        stats: [
          ["Нийт сурагч", "—", "Ачаалж байна"],
          ["Нийт багш", "—", "Ачаалж байна"],
          ["Орлого", "—", "Ачаалж байна"],
          ["Ирц", "—", "Ачаалж байна"]
        ]
      },
      teacher: {
        title: "Багшийн ажлын талбар",
        subtitle: "Өнөөдрийн анги, ирцийн үйлдэл, шалгах дүнгийн ажил.",
        stats: [
          ["Өнөөдрийн анги", "—", "Ачаалж байна"],
          ["Сурагчийн ирц", "—", "Ачаалж байна"],
          ["Даалгавар", "—", "Ачаалж байна"],
          ["Ангийн дундаж", "—", "Ачаалж байна"]
        ]
      },
      student: {
        title: "Сурагчийн портал",
        subtitle: "GPA, ирц, дараагийн хичээл, зарлал болон төлбөр.",
        stats: [
          ["GPA", "—", "Ачаалж байна"],
          ["Ирц", "—", "Ачаалж байна"],
          ["Өнөөдрийн хичээл", "—", "Ачаалж байна"],
          ["Төлбөрийн төлөв", "—", "Ачаалж байна"]
        ]
      },
      parent: {
        title: "Эцэг эхийн портал",
        subtitle: "Хүүхдийн ирц, дүн, зарлал болон төлбөрийн төлөвийг нэг дор харна.",
        stats: [
          ["Хүүхдийн ирц", "—", "Ачаалж байна"],
          ["Сүүлийн GPA", "—", "Ачаалж байна"],
          ["Төлөх төлбөр", "—", "Ачаалж байна"],
          ["Зарлал", "—", "Ачаалж байна"]
        ]
      }
    } satisfies Record<Role, { title: string; subtitle: string; stats: string[][] }>,
    create: {
      dashboard: { action: "Тайлан үүсгэх", title: "Dashboard тайлан үүсгэх" },
      students: { action: "Сурагч нэмэх", title: "Сурагч нэмэх" },
      teachers: { action: "Багш нэмэх", title: "Багш нэмэх" },
      parents: { action: "Эцэг эх нэмэх", title: "Эцэг эх нэмэх" },
      subjects: { action: "Хичээл нэмэх", title: "Хичээл нэмэх" },
      assignments: { action: "Даалгавар нэмэх", title: "Даалгавар нэмэх" },
      materials: { action: "Материал нэмэх", title: "Материал нэмэх" },
      attendance: { action: "Ирц бүртгэх", title: "Ирц бүртгэх" },
      grades: { action: "Дүн нэмэх", title: "Дүн нэмэх" },
      payments: { action: "Төлбөр нэмэх", title: "Төлбөр нэмэх" },
      timetable: { action: "Хуваарь нэмэх", title: "Хичээлийн цаг нэмэх" },
      announcements: { action: "Зарлал үүсгэх", title: "Зарлал үүсгэх" },
      wellbeing: { action: "Асуулт нэмэх", title: "Сэтгэл зүйн асуулт нэмэх" },
      settings: { action: "Тохиргоо хадгалах", title: "Тохиргоо шинэчлэх" }
    } satisfies Record<NavModule, { action: string; title: string }>,
    recordLabel: {
      dashboard: "Dashboard тайлан",
      students: "Сурагч",
      teachers: "Багш",
      parents: "Эцэг эх",
      subjects: "Хичээл",
      assignments: "Даалгавар",
      materials: "Материал",
      attendance: "Ирц",
      grades: "Дүн",
      payments: "Төлбөр",
      timetable: "Хичээлийн цаг",
      announcements: "Зарлал",
      wellbeing: "Сэтгэл зүйн асуулт",
      settings: "Тохиргоо"
    } satisfies Record<NavModule, string>,
    moduleSubtitle: {
      settings: "Theme, хэрэглэгчийн session, role access болон preference-ийг удирдана.",
      wellbeing: "Энд нийтэлсэн асуултууд сурагчийн Сэтгэл зүйчийн буланд харагдана."
    } satisfies Partial<Record<NavModule, string>>,
    tables: {
      students: "Сурагчийн удирдлага",
      teachers: "Багшийн удирдлага",
      parents: "Эцэг эхийн удирдлага",
      subjects: "Хичээлийн жагсаалт",
      assignments: "Даалгаврын систем",
      materials: "Хичээлийн материал",
      attendance: "Ирцийн систем",
      grades: "Дүнгийн систем",
      payments: "Төлбөрийн систем",
      timetable: "Хуваарийн систем",
      announcements: "Зарлалын систем",
      wellbeing: "Сэтгэл зүйчийн булан"
    },
    wellbeing: {
      openLabel: "Сэтгэл зүйчийн булан",
      title: "Сэтгэл зүйчийн булан",
      subtitle: "Сургуулийн сэтгэл зүйчээс хэдэн асуулт. Яараад хэрэггүй — энд юу ч бүртгэгдэхгүй.",
      emptyTitle: "Асуулт хараахан алга",
      emptyBody: "Сэтгэл зүйч асуулт нийтэлмэгц энд харагдана.",
      loading: "Асуултуудыг ачаалж байна…",
      loadFailed: "Асуултуудыг ачаалж чадсангүй. Хэсэг хүлээгээд дахин оролдоно уу.",
      counter: (index: number, total: number) => `${total}-аас ${index} дэх асуулт`,
      previous: "Өмнөх",
      next: "Дараах"
    },
    common: {
      account: "Бүртгэл",
      actions: "Үйлдэл",
      add: "Нэмэх",
      appearance: "Харагдац",
      cancel: "Болих",
      clear: "Цэвэрлэх",
      closeModal: "Цонх хаах",
      databaseOffline: "Мэдээллийн сантай холбогдож чадсангүй. DATABASE_URL болон Neon-оо шалгана уу.",
      databaseSaveFailed: "Хадгалж чадсангүй. Мэдээллийн сангийн холболтоо шалгаад дахин оролдоно уу.",
      delete: "Устгах",
      deleteFailed: "Устгаж чадсангүй. Database холболтоо шалгана уу.",
      deleteRecord: "Бүртгэл устгах уу?",
      deleteWarning: (label: string) => `${label} бүртгэлийг устгах уу? Энэ үйлдлийг буцаах боломжгүй.`,
      edit: "Засах",
      editRecord: "Бүртгэл засах",
      filterRecords: "Бүртгэл шүүх",
      general: "Ерөнхий",
      language: "Хэл",
      live: "Шууд",
      loading: "Ачааллаж байна…",
      loadingRecords: "Database бүртгэлүүдийг ачаалж байна...",
      loadingStudents: "Сурагчдыг ачаалж байна…",
      logout: "Гарах",
      logoutHint: "Системээс гараад login page руу буцна.",
      noAnnouncementsYet: "Одоогоор зарлал алга байна.",
      noUnlinkedStudents: "Бүх сурагчид эцэг эх бүртгэгдсэн байна.",
      noPaymentsYet: "Одоогоор төлбөр алга байна.",
      noAttendanceRecordsYet: "Одоогоор ирцийн бүртгэл алга байна.",
      noTimetableSlotsYet: "Одоогоор хичээлийн цаг алга байна.",
      nothingScheduledFor: (day: string) => `${day} гарагт хичээл товлогдоогүй байна.`,
      offlineShowingSavedData: "Офлайн — хадгалагдсан мэдээллийг харуулж байна",
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
      themeModeHint: "Mobile дээр эндээс dark/light mode солино.",
      useSystemTheme: "Системийн тохиргоог ашиглах",
      darkMode: "Харанхуй горим",
      mongolianLanguage: "Монгол хэл",
      todaysClasses: "Өнөөдрийн хичээлүүд",
      todaysSchedule: "Өнөөдрийн хуваарь",
      latestGrades: "Сүүлийн дүнгүүд",
      noGradesYet: "Одоогоор дүн алга байна.",
      viewPayments: "Төлбөр харах"
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
      Category: "Төрөл",
      Date: "Огноо",
      "Date range": "Огнооны хүрээ",
      Day: "Гараг",
      "Due Date": "Дуусах огноо",
      "Due date": "Дуусах огноо",
      Email: "Имэйл",
      Experience: "Туршлага",
      "Full name": "Бүтэн нэр",
      "Grade Levels": "Ангийн түвшин",
      GPA: "GPA",
      Name: "Нэр",
      Note: "Тайлбар",
      Parent: "Эцэг эх",
      "Parent Email": "Эцэг эхийн имэйл",
      "Parent name": "Эцэг эхийн нэр",
      Password: "Нууц үг",
      Payment: "Төлбөр",
      Phone: "Утас",
      Question: "Асуулт",
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
      Subjects: "Хичээлүүд",
      Teacher: "Багш",
      "Teacher name": "Багшийн нэр",
      Time: "Цаг",
      Title: "Гарчиг",
      Value: "Утга",
      "Report title": "Тайлангийн гарчиг"
    } satisfies Record<string, string>,
    mobileForms: {
      save: "Хадгалах",
      dateFormatHint: "(YYYY-MM-DD)",
      saveFailed: "Хадгалж чадсангүй. Дахин оролдоно уу.",
      dayPlaceholder: "Даваа",
      timePlaceholder: "09:00-09:45",
      classPlaceholder: "8A анги",
      photoPermissionDenied: "Профайлын зураг солихын тулд зургийн санд хандах зөвшөөрөл шаардлагатай.",
      avatarUpdateFailed: "Зураг шинэчилж чадсангүй. Дахин оролдоно уу.",
      invalidCredentials: "Имэйл эсвэл нууц үг буруу байна."
    },
    adminWebOnly: {
      title: "Админы хэрэгслүүд вэб дээр байршдаг",
      body: "Энэ апп нь багш, сурагч, эцэг эхийн өдөр тутмын дэлгэцүүдийг хамарна. Сурагч, багш, анги, төлбөрийг вэб дээрх админы хяналтын самбараас удирдана уу.",
      openDashboard: "Вэб хяналтын самбар нээх"
    },
    notFound: {
      title: "Уучлаарай!",
      body: "Энэ дэлгэц олдсонгүй.",
      goHome: "Нүүр хуудас руу очих!"
    }
  }
};

export type AppCopy = (typeof translations)["en"];

export function translateColumn(column: string, language: Language) {
  const columns = translations[language].columns as Record<string, string>;
  return columns[column] ?? column;
}

const WEEKDAYS_EN = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;

/**
 * The "Day" field on timetable entries is free text, entered in whichever
 * language the entry screen is showing (the mn placeholder hints "Даваа").
 * Anything that filters by day — Home's "today's schedule" — compares
 * against the English weekday name, so free-text Mongolian input has to be
 * canonicalized to that before storage/comparison or it silently never
 * matches. Case/whitespace insensitive; unrecognized input passes through
 * unchanged rather than being rejected.
 */
export function normalizeDayName(value: string): string {
  const trimmed = value.trim();
  const lower = trimmed.toLowerCase();
  for (const day of WEEKDAYS_EN) {
    if (day.toLowerCase() === lower || valueTranslations[day]?.toLowerCase() === lower) return day;
  }
  return trimmed;
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
