"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  KeyRound,
  Pencil,
  Plus,
  Search,
  ShieldAlert,
  Trash2,
  UserCog,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { ROLES, dashboardPathForRole, resolveActiveSession } from "@/lib/auth-flow";
import { getInitialDarkMode } from "@/lib/theme";
import {
  createDemoUser,
  deleteDemoUser,
  listDemoUsers,
  resetDemoUserPassword,
  updateDemoUser
} from "@/lib/demo-auth";
import type { Role } from "@/lib/types";

type ManagedUser = {
  id: string;
  name: string;
  username: string;
  email: string;
  role: Role;
  createdAt: string;
};

type ModalState =
  | { kind: "create" }
  | { kind: "edit"; user: ManagedUser }
  | { kind: "reset"; user: ManagedUser }
  | { kind: "delete"; user: ManagedUser }
  | null;

const roleLabels: Record<Role, string> = {
  admin: "Admin",
  teacher: "Teacher",
  student: "Student",
  parent: "Parent"
};

const roleTone: Record<Role, "blue" | "emerald" | "amber" | "rose"> = {
  admin: "rose",
  teacher: "blue",
  student: "emerald",
  parent: "amber"
};

const MIN_PASSWORD = 8;

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

async function getAccessToken() {
  if (!supabase) return "";
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? "";
}

export default function AdminUsersPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<Role | "all">("all");
  const [modal, setModal] = useState<ModalState>(null);
  const [darkMode, setDarkMode] = useState(false);

  // Match the Night Mode preference set in the dashboard's Settings screen
  // instead of following the OS's color scheme independently.
  useEffect(() => {
    queueMicrotask(() => setDarkMode(getInitialDarkMode()));
  }, []);

  // Access guard — admins only.
  useEffect(() => {
    let ignore = false;
    resolveActiveSession().then((session) => {
      if (ignore) return;
      if (!session) {
        router.replace("/login");
        return;
      }
      if (session.role !== "admin") {
        router.replace(dashboardPathForRole(session.role));
        return;
      }
      setAuthorized(true);
    });
    return () => {
      ignore = true;
    };
  }, [router]);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    setNotice("");

    if (!isSupabaseConfigured) {
      setUsers(listDemoUsers());
      setLoading(false);
      return;
    }

    try {
      const token = await getAccessToken();
      const response = await fetch("/api/admin/users", { headers: { Authorization: `Bearer ${token}` } });
      const payload = (await response.json().catch(() => null)) as { users?: ManagedUser[]; message?: string } | null;

      if (response.status === 501) {
        setNotice(payload?.message ?? "User provisioning is not configured.");
        setUsers([]);
        return;
      }
      if (!response.ok) {
        throw new Error(payload?.message ?? "Failed to load users.");
      }
      setUsers(payload?.users ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load users.");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authorized) return;

    const timer = window.setTimeout(() => {
      void loadUsers();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [authorized, loadUsers]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter((user) => {
      const matchesRole = roleFilter === "all" || user.role === roleFilter;
      const matchesQuery =
        !q ||
        [user.name, user.email, user.username].some((value) => value.toLowerCase().includes(q));
      return matchesRole && matchesQuery;
    });
  }, [users, query, roleFilter]);

  const provisioningDisabled = isSupabaseConfigured && Boolean(notice);

  // --- Mutations (route through the API in Supabase mode, the demo store otherwise) ---

  async function apiWrite(method: "POST" | "PATCH" | "DELETE", body?: Record<string, unknown>, search = "") {
    const token = await getAccessToken();
    const response = await fetch(`/api/admin/users${search}`, {
      method,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: body ? JSON.stringify(body) : undefined
    });
    const payload = (await response.json().catch(() => null)) as { message?: string } | null;
    if (!response.ok) throw new Error(payload?.message ?? "Request failed.");
  }

  async function handleCreate(input: UserFormValues) {
    if (!isSupabaseConfigured) {
      const result = createDemoUser(input);
      if ("error" in result) throw new Error(mapDemoError(result.error));
      return;
    }
    await apiWrite("POST", input);
  }

  async function handleUpdate(id: string, input: UserFormValues) {
    if (!isSupabaseConfigured) {
      const result = updateDemoUser(id, input);
      if ("error" in result) throw new Error(mapDemoError(result.error));
      return;
    }
    await apiWrite("PATCH", { id, ...input });
  }

  async function handleReset(id: string, password: string) {
    if (!isSupabaseConfigured) {
      const result = resetDemoUserPassword(id, password);
      if ("error" in result) throw new Error(mapDemoError(result.error));
      return;
    }
    await apiWrite("PATCH", { id, password });
  }

  async function handleDelete(id: string) {
    if (!isSupabaseConfigured) {
      deleteDemoUser(id);
      return;
    }
    await apiWrite("DELETE", undefined, `?id=${encodeURIComponent(id)}`);
  }

  if (!authorized) {
    return (
      <main className={`um-loading${darkMode ? " dark" : ""}`}>
        <UserCog size={28} />
        <p>Checking access…</p>
      </main>
    );
  }

  return (
    <main className={`um-page${darkMode ? " dark" : ""}`}>
      <header className="um-header">
        <div className="um-header-left">
          <Link href="/admin/dashboard" className="um-back" aria-label="Back to dashboard">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1><UserCog size={22} /> User Management</h1>
            <p>Create and manage Admin, Teacher, Student, and Parent accounts.</p>
          </div>
        </div>
        <Button onClick={() => setModal({ kind: "create" })} disabled={provisioningDisabled} type="button">
          <Plus size={17} />
          Add User
        </Button>
      </header>

      {notice ? (
        <div className="um-banner">
          <ShieldAlert size={18} />
          <p>{notice}</p>
        </div>
      ) : null}

      <section className="um-toolbar">
        <label className="um-search">
          <Search size={17} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name, email, or username"
          />
        </label>
        <div className="um-filter" role="group" aria-label="Filter by role">
          <button className={roleFilter === "all" ? "active" : ""} onClick={() => setRoleFilter("all")} type="button">
            All
          </button>
          {ROLES.map((role) => (
            <button
              key={role}
              className={roleFilter === role ? "active" : ""}
              onClick={() => setRoleFilter(role)}
              type="button"
            >
              {roleLabels[role]}
            </button>
          ))}
        </div>
      </section>

      <section className="um-table-wrap">
        {error ? <p className="um-error">{error}</p> : null}
        {loading ? (
          <div className="um-empty">
            <p>Loading users…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="um-empty">
            <UserCog size={30} />
            <strong>{users.length === 0 ? "No users yet" : "No matching users"}</strong>
            <p>
              {users.length === 0
                ? provisioningDisabled
                  ? "Enable provisioning to add accounts."
                  : "Create the first account with “Add User”."
                : "Try a different search or filter."}
            </p>
          </div>
        ) : (
          <>
            <table className="um-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th className="um-actions-col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((user) => (
                  <tr key={user.id}>
                    <td data-label="Name">{user.name || "—"}</td>
                    <td data-label="Username">{user.username || "—"}</td>
                    <td data-label="Email">{user.email}</td>
                    <td data-label="Role"><Badge tone={roleTone[user.role]}>{roleLabels[user.role]}</Badge></td>
                    <td data-label="Actions">
                      <div className="um-row-actions">
                        <button title="Edit" onClick={() => setModal({ kind: "edit", user })} type="button">
                          <Pencil size={16} />
                        </button>
                        <button title="Reset password" onClick={() => setModal({ kind: "reset", user })} type="button">
                          <KeyRound size={16} />
                        </button>
                        <button title="Delete" className="um-danger" onClick={() => setModal({ kind: "delete", user })} type="button">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="um-cards" role="list">
              {filtered.map((user) => (
                <article className="um-card" key={user.id} role="listitem">
                  <div className="um-card-row">
                    <span>Name</span>
                    <span>{user.name || "—"}</span>
                  </div>
                  <div className="um-card-row">
                    <span>Username</span>
                    <span>{user.username || "—"}</span>
                  </div>
                  <div className="um-card-row">
                    <span>Email</span>
                    <span>{user.email}</span>
                  </div>
                  <div className="um-card-row">
                    <span>Role</span>
                    <Badge tone={roleTone[user.role]}>{roleLabels[user.role]}</Badge>
                  </div>
                  <div className="um-row-actions">
                    <button title="Edit" onClick={() => setModal({ kind: "edit", user })} type="button">
                      <Pencil size={16} />
                    </button>
                    <button title="Reset password" onClick={() => setModal({ kind: "reset", user })} type="button">
                      <KeyRound size={16} />
                    </button>
                    <button title="Delete" className="um-danger" onClick={() => setModal({ kind: "delete", user })} type="button">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </section>

      {modal?.kind === "create" || modal?.kind === "edit" ? (
        <UserFormModal
          mode={modal.kind}
          user={modal.kind === "edit" ? modal.user : undefined}
          onClose={() => setModal(null)}
          onSubmit={async (values) => {
            if (modal.kind === "edit") {
              await handleUpdate(modal.user.id, values);
              setToast("User updated");
            } else {
              await handleCreate(values);
              setToast("User created");
            }
            setModal(null);
            await loadUsers();
          }}
        />
      ) : null}

      {modal?.kind === "reset" ? (
        <ResetPasswordModal
          user={modal.user}
          onClose={() => setModal(null)}
          onSubmit={async (password) => {
            await handleReset(modal.user.id, password);
            setToast("Password reset");
            setModal(null);
          }}
        />
      ) : null}

      {modal?.kind === "delete" ? (
        <ConfirmDeleteModal
          user={modal.user}
          onClose={() => setModal(null)}
          onConfirm={async () => {
            await handleDelete(modal.user.id);
            setToast("User deleted");
            setModal(null);
            await loadUsers();
          }}
        />
      ) : null}

      {toast ? <div className="um-toast">{toast}</div> : null}
    </main>
  );
}

type UserFormValues = {
  name: string;
  username: string;
  email: string;
  role: Role;
  password: string;
};

function UserFormModal({
  mode,
  user,
  onClose,
  onSubmit
}: {
  mode: "create" | "edit";
  user?: ManagedUser;
  onClose: () => void;
  onSubmit: (values: UserFormValues) => Promise<void>;
}) {
  const [name, setName] = useState(user?.name ?? "");
  const [username, setUsername] = useState(user?.username ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [role, setRole] = useState<Role>(user?.role ?? "student");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setFormError("");

    if (!isValidEmail(email)) {
      setFormError("Enter a valid email address.");
      return;
    }
    if (mode === "create" && password.length < MIN_PASSWORD) {
      setFormError(`Password must be at least ${MIN_PASSWORD} characters.`);
      return;
    }
    if (mode === "edit" && password.length > 0 && password.length < MIN_PASSWORD) {
      setFormError(`Password must be at least ${MIN_PASSWORD} characters.`);
      return;
    }

    setBusy(true);
    try {
      await onSubmit({ name, username, email, role, password });
    } catch (submitError) {
      setFormError(submitError instanceof Error ? submitError.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="um-modal-layer" role="dialog" aria-modal="true">
      <form className="um-modal" onSubmit={submit}>
        <div className="um-modal-head">
          <strong>{mode === "edit" ? "Edit User" : "Create User"}</strong>
          <button type="button" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>

        <label className="um-field">
          <span>Full name</span>
          <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Jane Doe" />
        </label>
        <label className="um-field">
          <span>Username</span>
          <Input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="jane" />
        </label>
        <label className="um-field">
          <span>Email</span>
          <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="jane@novamind.mn" required />
        </label>
        <label className="um-field">
          <span>Role</span>
          <select className="um-select" value={role} onChange={(event) => setRole(event.target.value as Role)}>
            {ROLES.map((option) => (
              <option key={option} value={option}>{roleLabels[option]}</option>
            ))}
          </select>
        </label>
        <label className="um-field">
          <span>{mode === "edit" ? "New password (leave blank to keep)" : "Password"}</span>
          <Input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder={mode === "edit" ? "••••••••" : `At least ${MIN_PASSWORD} characters`}
            autoComplete="new-password"
          />
        </label>

        {formError ? <p className="um-form-error">{formError}</p> : null}

        <div className="um-modal-actions">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={busy}>{mode === "edit" ? "Save Changes" : "Create User"}</Button>
        </div>
      </form>
    </div>
  );
}

function ResetPasswordModal({
  user,
  onClose,
  onSubmit
}: {
  user: ManagedUser;
  onClose: () => void;
  onSubmit: (password: string) => Promise<void>;
}) {
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setFormError("");
    if (password.length < MIN_PASSWORD) {
      setFormError(`Password must be at least ${MIN_PASSWORD} characters.`);
      return;
    }
    setBusy(true);
    try {
      await onSubmit(password);
    } catch (submitError) {
      setFormError(submitError instanceof Error ? submitError.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="um-modal-layer" role="dialog" aria-modal="true">
      <form className="um-modal" onSubmit={submit}>
        <div className="um-modal-head">
          <strong>Reset Password</strong>
          <button type="button" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>
        <p className="um-modal-note">Set a new password for <strong>{user.email}</strong>.</p>
        <label className="um-field">
          <span>New password</span>
          <Input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder={`At least ${MIN_PASSWORD} characters`}
            autoComplete="new-password"
          />
        </label>
        {formError ? <p className="um-form-error">{formError}</p> : null}
        <div className="um-modal-actions">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={busy}>Reset Password</Button>
        </div>
      </form>
    </div>
  );
}

function ConfirmDeleteModal({
  user,
  onClose,
  onConfirm
}: {
  user: ManagedUser;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");

  async function confirm() {
    setBusy(true);
    setFormError("");
    try {
      await onConfirm();
    } catch (deleteError) {
      setFormError(deleteError instanceof Error ? deleteError.message : "Something went wrong.");
      setBusy(false);
    }
  }

  return (
    <div className="um-modal-layer" role="dialog" aria-modal="true">
      <div className="um-modal">
        <div className="um-modal-head">
          <strong>Delete User</strong>
          <button type="button" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>
        <p className="um-modal-note">
          Delete <strong>{user.name || user.email}</strong>? This account will lose access immediately. This action cannot be undone.
        </p>
        {formError ? <p className="um-form-error">{formError}</p> : null}
        <div className="um-modal-actions">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="button" variant="danger" onClick={confirm} disabled={busy}>Delete</Button>
        </div>
      </div>
    </div>
  );
}

function mapDemoError(code: string) {
  switch (code) {
    case "email-exists":
      return "A user with that email already exists.";
    case "username-exists":
      return "A user with that username already exists.";
    case "not-found":
      return "User not found.";
    default:
      return "Something went wrong.";
  }
}
