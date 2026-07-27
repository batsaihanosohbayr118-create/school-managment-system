"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import { authService } from "@/lib/auth-client";
import { dashboardPathForRole, resolveActiveSession } from "@/lib/auth-flow";

const REMEMBER_KEY = "nm_remember_email";

/**
 * Login form. Credentials are checked against the app's own Neon-backed
 * endpoint, which returns a signed session token and the caller's role.
 */
export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [identifier, setIdentifier] = useState(searchParams.get("email") ?? "");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [remember, setRemember] = useState(false);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const resetComplete = searchParams.get("reset");

  // Restore the remembered email and auto-forward users who already have a
  // session.
  useEffect(() => {
    try {
      const remembered = window.localStorage.getItem(REMEMBER_KEY);
      if (remembered && !searchParams.get("email")) {
        setIdentifier(remembered);
        setRemember(true);
      }
    } catch {
      // ignore storage errors
    }

    let ignore = false;
    resolveActiveSession().then((session) => {
      if (!ignore && session) router.replace(dashboardPathForRole(session.role));
    });
    return () => {
      ignore = true;
    };
  }, [router, searchParams]);

  async function handleLogin() {
    const cleanIdentifier = identifier.trim();
    if (!cleanIdentifier || !password) {
      setMessage("Имэйл эсвэл нууц үг буруу байна.");
      return;
    }

    try {
      if (remember) window.localStorage.setItem(REMEMBER_KEY, cleanIdentifier);
      else window.localStorage.removeItem(REMEMBER_KEY);
    } catch {
      // ignore storage errors
    }

    const result = await authService.signIn(cleanIdentifier, password);

    if ("error" in result) {
      setMessage(
        result.error === "invalid-credentials"
          ? "Имэйл эсвэл нууц үг буруу байна."
          : "Нэвтрэхэд алдаа гарлаа. Дахин оролдоно уу."
      );
      return;
    }

    router.replace(dashboardPathForRole(result.user.role));
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");
    try {
      await handleLogin();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="mt-8 space-y-5" onSubmit={onSubmit}>
      {/* Email */}
      <label className="block">
        <span className="mb-2 block text-[13px] font-semibold text-slate-300">Имэйл хаяг</span>
        <div className="relative">
          <Mail size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            autoComplete="username"
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            placeholder="name@novamind.mn"
            className="auth-input w-full rounded-xl border border-white/10 bg-white/[0.06] py-3.5 pl-11 pr-4 text-[15px] text-white placeholder:text-slate-500 transition focus:border-sky-400/60 focus:outline-none focus:ring-2 focus:ring-sky-500/25"
          />
        </div>
      </label>

      {/* Password */}
      <label className="block">
        <span className="mb-2 block text-[13px] font-semibold text-slate-300">Нууц үг</span>
        <div className="relative">
          <LockKeyhole size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type={passwordVisible ? "text" : "password"}
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="••••••••"
            className="auth-input w-full rounded-xl border border-white/10 bg-white/[0.06] py-3.5 pl-11 pr-12 text-[15px] text-white placeholder:text-slate-500 transition focus:border-violet-400/60 focus:outline-none focus:ring-2 focus:ring-violet-500/25"
          />
          <button
            type="button"
            onClick={() => setPasswordVisible((v) => !v)}
            aria-label={passwordVisible ? "Нууц үг нуух" : "Нууц үг харах"}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-white"
          >
            {passwordVisible ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </label>

      {/* Options */}
      <div className="flex items-center justify-between">
        <label className="flex cursor-pointer items-center gap-2 text-[13px] text-slate-300 select-none">
          <input
            type="checkbox"
            checked={remember}
            onChange={(event) => setRemember(event.target.checked)}
            className="h-4 w-4 rounded border-white/20 bg-white/10 accent-sky-500"
          />
          Намайг сана
        </label>
        <Link href="/forgot-password" className="text-[13px] font-semibold text-sky-300 transition hover:text-sky-200">
          Нууц үгээ мартсан?
        </Link>
      </div>

      {/* Submit */}
      <motion.button
        type="submit"
        disabled={submitting}
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.99 }}
        className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-[linear-gradient(90deg,#2563eb,#7c3aed)] py-3.5 text-[15px] font-bold text-white shadow-[0_14px_34px_rgba(79,70,229,0.45)] transition hover:shadow-[0_18px_44px_rgba(124,58,237,0.55)] disabled:cursor-not-allowed disabled:opacity-70"
      >
        <span className="pointer-events-none absolute inset-0 -translate-x-full bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.25),transparent)] transition-transform duration-700 group-hover:translate-x-full" />
        {submitting ? "Нэвтэрч байна…" : "Нэвтрэх"}
        {!submitting ? <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" /> : null}
      </motion.button>

      {message || resetComplete ? (
        <p className="rounded-lg border border-rose-400/20 bg-rose-400/10 px-4 py-2.5 text-center text-[13px] text-rose-200">
          {message || "Нууц үг шинэчлэгдлээ. Шинэ нууц үгээрээ нэвтэрнэ үү."}
        </p>
      ) : null}

    </form>
  );
}
