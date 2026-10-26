"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, BookOpen, Check, CheckCircle2, ChevronDown, Eye, EyeOff, GraduationCap, LockKeyhole, Mail, Phone, User, Users } from "lucide-react";
import { authService } from "@/lib/auth-client";
import { dashboardPathForRole } from "@/lib/auth-flow";
import { translateValue } from "@/lib/i18n";
import { translations } from "@shared/i18n-tables";
import {
  MIN_PASSWORD_LENGTH,
  REGISTRATION_ROLES,
  validateRegistration,
  type RegistrationErrorCode,
  type RegistrationOptions,
  type RegistrationRole
} from "@shared/registration";

// The login page is Mongolian-only; this form matches it.
const copy = translations.mn.register;

const ROLE_ICONS: Record<RegistrationRole, typeof User> = {
  student: GraduationCap,
  parent: Users,
  teacher: BookOpen
};

const inputClass =
  "auth-input w-full rounded-xl border border-white/10 bg-white/[0.06] py-3 pl-11 pr-4 text-[15px] text-white placeholder:text-slate-500 transition focus:border-sky-400/60 focus:outline-none focus:ring-2 focus:ring-sky-500/25";

function messageFor(code: string) {
  return copy.errors[code as RegistrationErrorCode] ?? copy.failed;
}

/** Self-registration: pick a role, fill in the fields that role needs. */
export function RegisterForm() {
  const router = useRouter();
  const [role, setRole] = useState<RegistrationRole>("student");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [subject, setSubject] = useState("");
  const [childEmail, setChildEmail] = useState("");
  const [childPassword, setChildPassword] = useState("");
  const [options, setOptions] = useState<RegistrationOptions | null>(null);
  const [optionsFailed, setOptionsFailed] = useState(false);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let ignore = false;
    authService.registrationOptions().then((result) => {
      if (ignore) return;
      if (result) setOptions(result);
      else setOptionsFailed(true);
    });
    return () => {
      ignore = true;
    };
  }, []);

  function toggleSubject(name: string) {
    setSubjects((current) => (current.includes(name) ? current.filter((item) => item !== name) : [...current, name]));
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setMessage("");

    const input = { role, name, email, password, phone, subjects, subject, childEmail, childPassword };
    const problem = validateRegistration(input);
    if (problem) {
      setMessage(messageFor(problem));
      return;
    }

    setSubmitting(true);
    try {
      const result = await authService.register(input);
      if ("error" in result) setMessage(messageFor(result.error));
      else if ("pending" in result) setPending(true);
      else router.replace(dashboardPathForRole(result.user.role));
    } catch {
      setMessage(copy.failed);
    } finally {
      setSubmitting(false);
    }
  }

  if (pending) {
    return (
      <div className="mt-8 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-6 text-center">
        <CheckCircle2 size={40} className="mx-auto text-emerald-300" />
        <h3 className="mt-3 text-lg font-bold text-white">{copy.pendingTitle}</h3>
        <p className="mt-2 text-[14px] text-slate-300">{copy.pendingBody}</p>
        <Link href="/login" className="mt-5 inline-flex items-center gap-2 text-[14px] font-semibold text-sky-300 hover:text-sky-200">
          {copy.backToLogin}
          <ArrowRight size={16} />
        </Link>
      </div>
    );
  }

  const openSubjects = (options?.subjects ?? []).filter((entry) => !entry.hasTeacher);
  const allSubjects = (options?.subjects ?? []).map((entry) => entry.name);

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      {/* Role */}
      <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Role">
        {REGISTRATION_ROLES.map((option) => {
          const Icon = ROLE_ICONS[option];
          const active = option === role;
          return (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setRole(option)}
              className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-2.5 text-[13px] font-semibold transition ${
                active
                  ? "border-sky-400/60 bg-sky-500/15 text-white shadow-[0_8px_24px_rgba(56,189,248,0.18)]"
                  : "border-white/10 bg-white/[0.04] text-slate-300 hover:border-white/20"
              }`}
            >
              <Icon size={20} className={active ? "text-sky-300" : "text-slate-400"} />
              {copy.roles[option]}
            </button>
          );
        })}
      </div>
      <p className="text-[13px] text-slate-400">{copy.roleHints[role]}</p>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={copy.fields.name} icon={User}>
          <input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" className={inputClass} />
        </Field>
        <Field label={copy.fields.email} icon={Mail}>
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder="name@example.com" className={inputClass} />
        </Field>
        <Field label={copy.fields.phone} icon={Phone}>
          <input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} autoComplete="tel" className={inputClass} />
        </Field>
        <Field label={copy.fields.password} icon={LockKeyhole} hint={copy.passwordHint(MIN_PASSWORD_LENGTH)}>
          <input
            type={passwordVisible ? "text" : "password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            className={`${inputClass} pr-12`}
          />
          <button
            type="button"
            onClick={() => setPasswordVisible((visible) => !visible)}
            aria-label={passwordVisible ? "Нууц үг нуух" : "Нууц үг харах"}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-white"
          >
            {passwordVisible ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </Field>
      </div>

      {role === "student" ? (
        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="text-[13px] font-semibold text-slate-300">
              {copy.fields.subjects}
              {subjects.length ? <span className="ml-2 font-normal text-sky-300">{subjects.length} сонгосон</span> : null}
            </span>
            {allSubjects.length ? (
              <button
                type="button"
                onClick={() => setSubjects(subjects.length === allSubjects.length ? [] : allSubjects)}
                className="text-[12px] font-semibold text-sky-300 transition hover:text-sky-200"
              >
                {subjects.length === allSubjects.length ? "Цэвэрлэх" : "Бүгдийг сонгох"}
              </button>
            ) : null}
          </div>
          {/* One row that scrolls sideways: a long subject list must not stretch the form. */}
          <div className="subject-scroller -mx-1 flex snap-x gap-2 overflow-x-auto px-1 py-0.5">
            {(options?.subjects ?? []).map((entry) => {
              const picked = subjects.includes(entry.name);
              const label = translateValue(entry.name, "mn");
              return (
                <button
                  key={entry.name}
                  type="button"
                  aria-pressed={picked}
                  onClick={() => toggleSubject(entry.name)}
                  className={`flex shrink-0 snap-start items-center gap-2 whitespace-nowrap rounded-full border px-3 py-2 text-[13px] font-medium transition ${
                    picked ? "border-sky-400/60 bg-sky-500/20 text-white" : "border-white/10 bg-white/[0.04] text-slate-300 hover:border-white/25"
                  }`}
                >
                  <span
                    className={`grid h-4 w-4 shrink-0 place-items-center rounded-full border transition ${
                      picked ? "border-sky-400 bg-sky-500 text-white" : "border-white/25"
                    }`}
                  >
                    {picked ? <Check size={11} strokeWidth={3} /> : null}
                  </span>
                  {label}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-[12px] text-slate-500">{optionsFailed ? copy.loadFailed : copy.subjectsHint}</p>
        </div>
      ) : null}

      {role === "parent" ? (
        <>
          <Field label={copy.fields.childEmail} icon={Mail}>
            <input type="email" value={childEmail} onChange={(event) => setChildEmail(event.target.value)} autoComplete="off" className={inputClass} />
          </Field>
          <Field label={copy.fields.childPassword} icon={LockKeyhole}>
            <input type="password" value={childPassword} onChange={(event) => setChildPassword(event.target.value)} autoComplete="off" className={inputClass} />
          </Field>
          <p className="text-[12px] text-slate-500">{copy.parentNote}</p>
        </>
      ) : null}

      {role === "teacher" ? (
        <>
          <SubjectSelect label={copy.fields.subject} onChange={setSubject} options={openSubjects.map((entry) => entry.name)} value={subject} />
          <p className="text-[12px] text-slate-500">{optionsFailed ? copy.loadFailed : copy.teacherNote}</p>
        </>
      ) : null}

      <motion.button
        type="submit"
        disabled={submitting}
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.99 }}
        className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-[linear-gradient(90deg,#2563eb,#7c3aed)] py-3.5 text-[15px] font-bold text-white shadow-[0_14px_34px_rgba(79,70,229,0.45)] transition hover:shadow-[0_18px_44px_rgba(124,58,237,0.55)] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {submitting ? "…" : copy.submit}
        {!submitting ? <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" /> : null}
      </motion.button>

      {message ? (
        <p className="rounded-lg border border-rose-400/20 bg-rose-400/10 px-4 py-2.5 text-center text-[13px] text-rose-200">{message}</p>
      ) : null}

      {/* The page's back link covers this on wide screens. */}
      <p className="text-center text-[13px] text-slate-400 lg:hidden">
        {copy.haveAccount}{" "}
        <Link href="/login" className="font-semibold text-sky-300 transition hover:text-sky-200">
          {copy.signIn}
        </Link>
      </p>
    </form>
  );
}

function Field({ label, icon: Icon, hint, children }: { label: string; icon: typeof User; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-[13px] font-semibold text-slate-300">{label}</span>
      <div className="relative">
        <Icon size={18} className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-slate-400" />
        {children}
      </div>
      {hint ? <span className="mt-1.5 block text-[12px] text-slate-500">{hint}</span> : null}
    </label>
  );
}

/**
 * The teacher's subject picker: a styled list in place of a native <select>.
 * The page is sized to one screen, so the list opens upwards when there is no
 * room for it below the field.
 */
function SubjectSelect({
  label,
  onChange,
  options,
  value
}: {
  label: string;
  onChange: (value: string) => void;
  options: string[];
  value: string;
}) {
  const [open, setOpen] = useState(false);
  const [upwards, setUpwards] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  function toggle() {
    const rect = rootRef.current?.getBoundingClientRect();
    if (rect) setUpwards(window.innerHeight - rect.bottom < 280 && rect.top > 280);
    setOpen((current) => !current);
  }

  return (
    <div className="relative" ref={rootRef}>
      <span className="mb-2 block text-[13px] font-semibold text-slate-300">{label}</span>
      <button
        aria-expanded={open}
        aria-haspopup="listbox"
        className={`flex w-full items-center gap-3 rounded-xl border bg-white/[0.06] px-4 py-3 text-left text-[15px] transition ${
          open ? "border-sky-400/60 ring-2 ring-sky-500/25" : "border-white/10 hover:border-white/20"
        }`}
        onClick={toggle}
        type="button"
      >
        <BookOpen size={18} className="shrink-0 text-slate-400" />
        <span className={`flex-1 truncate ${value ? "text-white" : "text-slate-500"}`}>
          {value ? translateValue(value, "mn") : "Хичээлээ сонгоно уу"}
        </span>
        <ChevronDown size={18} className={`shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open ? (
        <ul
          className={`no-scrollbar absolute inset-x-0 z-30 max-h-60 overflow-y-auto rounded-xl border border-white/10 bg-[#0f1a33] p-1.5 shadow-[0_24px_60px_rgba(2,6,23,0.8)] ${
            upwards ? "bottom-full mb-2" : "top-full mt-2"
          }`}
          role="listbox"
        >
          {options.length === 0 ? (
            <li className="px-3 py-2.5 text-[13px] text-slate-500">Сул хичээл алга</li>
          ) : (
            options.map((option) => {
              const selected = option === value;
              return (
                <li key={option}>
                  <button
                    aria-selected={selected}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[14px] transition ${
                      selected ? "bg-sky-500/15 text-white" : "text-slate-300 hover:bg-white/[0.06] hover:text-white"
                    }`}
                    onClick={() => {
                      onChange(option);
                      setOpen(false);
                    }}
                    role="option"
                    type="button"
                  >
                    <span className={`h-2 w-2 shrink-0 rounded-full ${selected ? "bg-sky-400" : "bg-white/20"}`} />
                    <span className="flex-1 truncate">{translateValue(option, "mn")}</span>
                    {selected ? <Check size={16} className="shrink-0 text-sky-300" /> : null}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      ) : null}
    </div>
  );
}
