"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, BookOpen, CheckCircle2, Eye, EyeOff, GraduationCap, LockKeyhole, Mail, Phone, User, Users } from "lucide-react";
import { authService } from "@/lib/auth-client";
import { dashboardPathForRole } from "@/lib/auth-flow";
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
  "auth-input w-full rounded-xl border border-white/10 bg-white/[0.06] py-3.5 pl-11 pr-4 text-[15px] text-white placeholder:text-slate-500 transition focus:border-sky-400/60 focus:outline-none focus:ring-2 focus:ring-sky-500/25";

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

  return (
    <form className="mt-7 space-y-4" onSubmit={onSubmit}>
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
              className={`flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-[13px] font-semibold transition ${
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

      {role === "student" ? (
        <div>
          <span className="mb-2 block text-[13px] font-semibold text-slate-300">{copy.fields.subjects}</span>
          <div className="flex flex-wrap gap-2">
            {(options?.subjects ?? []).map((entry) => {
              const picked = subjects.includes(entry.name);
              return (
                <button
                  key={entry.name}
                  type="button"
                  aria-pressed={picked}
                  onClick={() => toggleSubject(entry.name)}
                  className={`rounded-full border px-3 py-1.5 text-[13px] font-semibold transition ${
                    picked ? "border-sky-400/60 bg-sky-500/20 text-white" : "border-white/10 bg-white/[0.04] text-slate-300 hover:border-white/20"
                  }`}
                >
                  {entry.name}
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
          <Field label={copy.fields.subject} icon={BookOpen}>
            <select
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              className={`${inputClass} appearance-none`}
            >
              <option value="" className="bg-slate-900">—</option>
              {openSubjects.map((entry) => (
                <option key={entry.name} value={entry.name} className="bg-slate-900">
                  {entry.name}
                </option>
              ))}
            </select>
          </Field>
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

      <p className="text-center text-[13px] text-slate-400">
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
