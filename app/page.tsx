"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Bell,
  Check,
  ChevronDown,
  House,
  LogOut,
  Menu,
  Moon,
  Pencil,
  Plus,
  Search,
  Settings as SettingsIcon,
  Sparkles,
  Sun,
  Trash2,
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
  students,
  teachers,
  timetable
} from "@/lib/demo-data";
import {
  type AppCopy,
  type Language,
  getInitialLanguage,
  getStoredLanguage,
  languageStorageKey,
  languages,
  translateColumn,
  translateValue,
  translations
} from "@/lib/i18n";
import {
  createSupabaseResource,
  deleteSupabaseResource,
  listSupabaseResource,
  type SchoolResource,
  updateSupabaseResource
} from "@/lib/school-supabase";
import { authService, isSupabaseConfigured } from "@/lib/supabase";
import type { NavModule, Role } from "@/lib/types";

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

const pieData = [
  { name: "Present", value: 76, color: "#10b981" },
  { name: "Late", value: 12, color: "#f59e0b" },
  { name: "Absent", value: 12, color: "#ef4444" }
];

const createConfig: Record<NavModule, { fields: string[] }> = {
  dashboard: { fields: ["Report title", "Date range"] },
  students: { fields: ["Full name", "Class", "Parent name", "Phone", "Payment"] },
  teachers: { fields: ["Teacher name", "Subject", "Email", "Experience", "Salary", "Contact", "Classes"] },
  classes: { fields: ["Class name", "Section", "Class teacher"] },
  attendance: { fields: ["Student name", "Class", "Date", "Status"] },
  grades: { fields: ["Student name", "Subject", "Score", "Semester"] },
  payments: { fields: ["Student name", "Amount", "Status", "Due date"] },
  timetable: { fields: ["Day", "Time", "Subject", "Teacher"] },
  announcements: { fields: ["Title", "Audience", "Content"] },
  settings: { fields: ["Setting name", "Value"] }
};

const visibleModulesByRole: Record<Role, NavModule[]> = {
  admin: ["dashboard", "students", "teachers", "classes", "attendance", "grades", "payments", "timetable", "announcements", "settings"],
  teacher: ["dashboard", "students", "classes", "attendance", "grades", "timetable", "announcements", "settings"],
  student: ["dashboard", "attendance", "grades", "payments", "timetable", "announcements", "settings"]
};

const demoSessionKey = "educore_session";
const notificationStorageKey = "educore_activity_notifications";

function isRole(value: unknown): value is Role {
  return value === "admin" || value === "teacher" || value === "student";
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
  if (resource === "students" && field === "Payment") return ["Unpaid", "Partial", "Paid"];
  if (resource === "payments" && field === "Status") return ["Unpaid", "Partial", "Paid"];
  if (resource === "attendance" && field === "Status") return ["Present", "Late", "Absent"];
  return null;
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

function AppShell() {
  const router = useRouter();
  const [activeModule, setActiveModule] = useState<NavModule>("dashboard");
  const [role, setRole] = useState<Role>("admin");
  const [language, setLanguage] = useState<Language>(getInitialLanguage);
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
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [notificationPageOpen, setNotificationPageOpen] = useState(false);
  const [activityNotifications, setActivityNotifications] = useState<ActivityNotification[]>(getInitialNotifications);

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
    setNotificationPageOpen(false);
    setMobileOpen(false);
  }

  function addActivityNotification(resource: NavModule, action: "created" | "updated" | "deleted", label: string) {
    const resourceLabels: Record<string, { en: string; mn: string }> = {
      students: { en: "Student", mn: "Сурагч" },
      teachers: { en: "Teacher", mn: "Багш" },
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
      const storedLanguage = getStoredLanguage();
      if (storedLanguage) setLanguage(storedLanguage);
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
      const data = isSupabaseConfigured
        ? await deleteSupabaseResource(activeResource, recordId)
        : await fetch(`/api/school/${activeResource}?id=${encodeURIComponent(recordId)}`, {
            method: "DELETE"
          }).then(async (response) => {
            if (!response.ok) throw new Error("Delete failed");
            return (await response.json()) as ResourceTableData;
          });
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
          const parsedSession = JSON.parse(demoSession) as { role?: unknown };
          const nextRole = isRole(parsedSession.role) ? parsedSession.role : "student";
          setRole(nextRole);
          setActiveModule((currentModule) => (visibleModulesByRole[nextRole].includes(currentModule) ? currentModule : "dashboard"));
        } catch {
          setRole("student");
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
        const data = isSupabaseConfigured
          ? await listSupabaseResource(activeResource)
          : await fetch(`/api/school/${activeResource}`).then(async (response) => {
              if (!response.ok) throw new Error("Database unavailable");
              return (await response.json()) as ResourceTableData;
            });

        if (!ignore) {
          setResourceData(data);
        }
      } catch {
        if (!ignore) {
          setResourceData(null);
          setResourceError(copy.common.databaseOffline);
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
  }, [activeResource, authChecked, copy.common.databaseOffline]);

  if (!authChecked) {
    return (
      <main className={`educore-shell auth-check${darkMode ? " dark" : ""}`}>
        <div className="auth-loading">
          <Sparkles size={24} />
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
          <span>
            <Sparkles size={22} />
          </span>
          <div>
            <strong>EduCore</strong>
            <p>{copy.app.brandSubtitle}</p>
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
        <header className={`ec-topbar${activeModule === "settings" ? " settings-topbar" : ""}${notificationPageOpen ? " notifications-topbar" : ""}`}>
          <button className="ec-icon-button mobile-only" onClick={() => setMobileOpen(true)} type="button">
            <Menu size={20} />
          </button>
          <label className="ec-search">
            <Search size={18} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={copy.app.searchPlaceholder} />
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
            <motion.section className="ec-hero" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
              <div>
                <p>{copy.nav[activeNav.id].description}</p>
                <h1>{activeModule === "dashboard" ? dashboard.title : copy.nav[activeNav.id].label}</h1>
                <span>{activeModule === "dashboard" ? dashboard.subtitle : (copy.moduleSubtitle as Partial<Record<NavModule, string>>)[activeModule] ?? copy.app.defaultModuleSubtitle}</span>
              </div>
              {activeModule !== "settings" && canManageActiveModule ? (
                <Button onClick={openCreateModal} type="button">
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
                const data = isSupabaseConfigured
                  ? modalMode === "edit" && editingRecordId
                    ? await updateSupabaseResource(activeResource, editingRecordId, formValues)
                    : await createSupabaseResource(activeResource, formValues)
                  : await fetch(`/api/school/${activeResource}`, {
                      method: modalMode === "edit" ? "PATCH" : "POST",
                      headers: {
                        "Content-Type": "application/json"
                      },
                      body: JSON.stringify({ id: editingRecordId, values: formValues })
                    }).then(async (response) => {
                      if (!response.ok) {
                        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
                        throw new Error(payload?.message ?? "Save failed");
                      }
                      return (await response.json()) as ResourceTableData;
                    });
                addActivityNotification(activeResource, modalMode === "edit" ? "updated" : "created", Object.values(formValues).find(Boolean) ?? "");
                setResourceData(data);
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
  onAdd,
  onDelete,
  onEdit
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
  const showActions = canManage && displayIds.length > 0;
  const gridColumns = `repeat(${displayColumns.length}, minmax(0, 1fr))${showActions ? " 88px" : ""}`;

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
                    <button aria-label={copy.common.editRecord} onClick={() => id && onEdit(id, row, displayColumns)} type="button">
                      <Pencil size={15} />
                    </button>
                    <button aria-label={copy.common.deleteRecord} onClick={() => id && onDelete(id, row)} type="button">
                      <Trash2 size={15} />
                    </button>
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
