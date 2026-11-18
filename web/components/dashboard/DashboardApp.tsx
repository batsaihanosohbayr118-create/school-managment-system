"use client";

import { type CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import { Bell, Check, House, LogOut, Menu, Plus, Search, Trash2, UserCog, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { UserManagement } from "@/components/dashboard/UserManagement";
import { WellbeingCorner } from "@/components/dashboard/WellbeingCorner";
import { navItems } from "@/lib/demo-data";
import { type Language, getInitialLanguage, languageStorageKey, languages, translateColumn, translateValue, translations } from "@/lib/i18n";
import { FileTooLargeError, uploadMaterialFile } from "@/lib/subjectContent";
import { getInitialDarkMode, setStoredDarkMode } from "@/lib/theme";
import { listSchoolResource } from "@/lib/school-api";
import { authService } from "@/lib/auth-client";
import { dashboardPathForRole } from "@/lib/auth-flow";
import { defaultStudentSubjectsValue, subjectCatalog } from "@/lib/subjects";
import type { NavModule, Role } from "@/lib/types";
import { type ActivityNotification, type DeleteTarget, type ModalMode, type ResourceTableData, type SchoolResource, type StudentOption, type SubjectContentTarget, type SubjectScopeOption, createConfig, deleteResourceData, demoResourceData, editFieldsFor, fetchFallbackResource, filterRowsByParent, getInitialNotifications, loadResourceData, loadUnlinkedStudents, mergeSubmittedValues, normalizePaymentValues, notificationStorageKey, parentScopedResources, saveResourceData, statusOptionsFor, statusTone, subjectScopedResources, teacherManagedModules, teacherSubjectModules, uploadErrorMessage, visibleModulesByRole } from "./dashboard-shared";
import { StatusDropdown } from "./DashboardControls";
import { SubjectContentPanel } from "./SubjectContentPanel";
import { AnnouncementsModule, AssignmentsModule, AttendanceModule, GradesModule, MaterialsModule, ParentsModule, PaymentsModule, StudentsModule, SubjectScopeTabs, SubjectsModule, TeachersModule, TimetableModule, WellbeingModule } from "./ResourceModules";
import { Dashboard } from "./HomeDashboard";
import { NotificationsPage } from "./NotificationsPage";
import { SettingsModule } from "./SettingsModule";

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

export function DashboardApp({ initialView, lockedRole }: { initialView?: "users"; lockedRole: Role }) {
  return <AppShell initialView={initialView} lockedRole={lockedRole} />;
}

export default DashboardApp;
