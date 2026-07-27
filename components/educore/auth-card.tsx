"use client";

import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Eye, EyeOff, KeyRound, LockKeyhole, Mail, ShieldCheck, Sparkles, UserRound } from "lucide-react";
import { authService, isSupabaseConfigured } from "@/lib/supabase";
import { validatePasswordStrength } from "@/lib/password-validation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { type Language, getInitialLanguage, languageStorageKey, translations } from "@/lib/i18n";
import { dashboardPathForRole, isRole, resolveActiveSession } from "@/lib/auth-flow";
import { authenticateDemoUser, seedDemoUsers, startDemoSession } from "@/lib/demo-auth";
import type { Role } from "@/lib/types";

type AuthMode = "login" | "forgot";
type ResetStep = "email" | "code" | "password";

/**
 * Authentication card. The app is login-only — there is no public registration;
 * accounts are provisioned by an administrator. Supports:
 *  - Login (username or email + password) with role-based dashboard redirect.
 *  - Forgot password (Supabase recovery code flow) when Supabase is configured.
 */
export function AuthCard({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [language, setLanguage] = useState<Language>("en");
  const prefilledEmail = searchParams.get("email") ?? "";
  const [identifier, setIdentifier] = useState(prefilledEmail);
  const [password, setPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [resetStep, setResetStep] = useState<ResetStep>("email");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const copy = translations[language];
  const resetCompleteMessage = searchParams.get("reset") ? copy.auth.messages.resetComplete : "";
  const passwordCheck = validatePasswordStrength(password);

  const t = {
    identifierLabel: language === "mn" ? "Хэрэглэгчийн нэр эсвэл имэйл" : "Username or Email",
    invalidCredentials:
      language === "mn"
        ? "Хэрэглэгчийн нэр/имэйл эсвэл нууц үг буруу байна."
        : "Username/email or password is incorrect.",
    forgotLink: language === "mn" ? "Нууц үгээ мартсан уу?" : "Forgot password?",
    backToLogin: language === "mn" ? "Нэвтрэх рүү буцах" : "Back to login",
    demoHint: language === "mn" ? "Жишээ: admin / Admin@123" : "Try: admin / Admin@123"
  };

  const resetButtonLabel =
    mode === "forgot"
      ? resetStep === "email"
        ? copy.auth.reset.sendCode
        : resetStep === "code"
          ? copy.auth.reset.verifyCode
          : copy.auth.reset.savePassword
      : copy.auth.modes.login.button;

  useEffect(() => {
    queueMicrotask(() => setLanguage(getInitialLanguage()));
  }, []);

  useEffect(() => {
    document.documentElement.lang = language === "mn" ? "mn" : "en";
    window.localStorage.setItem(languageStorageKey, language);
  }, [language]);

  // Seed demo accounts (demo mode only) and auto-forward already-authenticated
  // users straight to their role dashboard.
  useEffect(() => {
    if (mode !== "login") return;
    if (!isSupabaseConfigured) seedDemoUsers();

    let ignore = false;
    resolveActiveSession().then((session) => {
      if (!ignore && session) router.replace(dashboardPathForRole(session.role));
    });
    return () => {
      ignore = true;
    };
  }, [mode, router]);

  async function redirectToRoleDashboard(fallbackRole: Role | null) {
    const session = await resolveActiveSession();
    const role = session?.role ?? fallbackRole ?? "student";
    router.replace(dashboardPathForRole(role));
  }

  async function handleLogin() {
    const cleanIdentifier = identifier.trim();

    if (!cleanIdentifier || !password) {
      setMessage(t.invalidCredentials);
      return;
    }

    if (!isSupabaseConfigured) {
      const result = authenticateDemoUser(cleanIdentifier, password);
      if ("error" in result) {
        setMessage(t.invalidCredentials);
        return;
      }
      startDemoSession(result.user);
      router.replace(dashboardPathForRole(result.user.role));
      return;
    }

    const result = await authService.signIn(cleanIdentifier, password);
    if ("error" in result && result.error) {
      setMessage(
        result.error.message === "Invalid login credentials" ? t.invalidCredentials : result.error.message
      );
      return;
    }

    const metadataRole =
      "data" in result && result.data?.user?.user_metadata?.role
        ? result.data.user.user_metadata.role
        : null;
    await redirectToRoleDashboard(isRole(metadataRole) ? metadataRole : null);
  }

  async function handleForgot() {
    const cleanEmail = identifier.trim();

    if (!isSupabaseConfigured) {
      setMessage(
        language === "mn"
          ? "Нууц үг сэргээхэд Supabase тохиргоо шаардлагатай. Админд хандана уу."
          : "Password reset requires Supabase. Please contact your administrator."
      );
      return;
    }

    if (resetStep === "email") {
      const result = await authService.resetPassword(cleanEmail);
      if ("error" in result && result.error) {
        setMessage(result.error.message);
        return;
      }
      setMessage(copy.auth.messages.codeSent);
      setResetStep("code");
      return;
    }

    if (resetStep === "code") {
      const result = await authService.verifyRecoveryCode(cleanEmail, verificationCode.trim());
      if ("error" in result && result.error) {
        setMessage(result.error.message);
        return;
      }
      setMessage(copy.auth.messages.codeVerified);
      setPassword("");
      setResetStep("password");
      return;
    }

    if (!passwordCheck.isValid) {
      setMessage(passwordCheck.errors[0]);
      return;
    }

    const result = await authService.updatePassword(password);
    if ("error" in result && result.error) {
      setMessage(result.error.message);
      return;
    }
    await authService.signOut();
    router.push(`/login?reset=1&email=${encodeURIComponent(cleanEmail)}`);
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");
    try {
      if (mode === "login") {
        await handleLogin();
      } else {
        await handleForgot();
      }
    } finally {
      setSubmitting(false);
    }
  }

  const showPasswordField = mode === "login" || resetStep === "password";

  return (
    <main className="auth-page">
      <Card className="auth-card">
        <div className="auth-brand-row">
          <div className="auth-brand">
            <span className="auth-brand-logo">
              <Image src="/data/subjects/download.png" alt="Nova Mind Academy" width={559} height={534} priority />
            </span>
            <div>
              <strong>Nova Mind</strong>
              <p>Academy</p>
            </div>
          </div>
          <span className="auth-chip">
            <Sparkles size={14} />
            {copy.auth.secure}
          </span>
        </div>

        <div className="auth-heading">
          <h1>{mode === "forgot" ? copy.auth.modes.forgot.title : copy.auth.modes.login.title}</h1>
          <p>{mode === "forgot" ? copy.auth.modes.forgot.subtitle : copy.auth.modes.login.subtitle}</p>
        </div>

        <form className="auth-form" onSubmit={onSubmit}>
          <label>
            {mode === "forgot" ? copy.auth.fields.email : t.identifierLabel}
            <span className="auth-field">
              {mode === "forgot" ? <Mail size={18} /> : <UserRound size={18} />}
              <Input
                autoComplete={mode === "forgot" ? "email" : "username"}
                disabled={mode === "forgot" && resetStep !== "email"}
                type={mode === "forgot" ? "email" : "text"}
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
              />
            </span>
          </label>

          {mode === "forgot" && resetStep === "code" ? (
            <label>
              {copy.auth.fields.code}
              <span className="auth-field">
                <KeyRound size={18} />
                <Input inputMode="numeric" value={verificationCode} onChange={(event) => setVerificationCode(event.target.value)} />
              </span>
            </label>
          ) : null}

          {showPasswordField ? (
            <label>
              {mode === "forgot" ? copy.auth.fields.newPassword : copy.auth.fields.password}
              <span className="auth-field auth-password-field">
                <LockKeyhole size={18} />
                <Input
                  autoComplete={mode === "forgot" ? "new-password" : "current-password"}
                  type={passwordVisible ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
                <button
                  aria-label={passwordVisible ? "Hide password" : "Show password"}
                  className="auth-password-toggle"
                  onClick={() => setPasswordVisible((value) => !value)}
                  type="button"
                >
                  {passwordVisible ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </span>
            </label>
          ) : null}

          {mode === "forgot" && resetStep !== "email" ? (
            <button
              className="auth-link-button"
              onClick={() => {
                setMessage("");
                setVerificationCode("");
                setResetStep("email");
              }}
              type="button"
            >
              {copy.auth.reset.changeEmail}
            </button>
          ) : null}

          <Button type="submit" disabled={submitting || (mode === "forgot" && resetStep === "password" && !passwordCheck.isValid)}>
            {mode === "forgot" ? <Mail size={17} /> : <ShieldCheck size={17} />}
            {resetButtonLabel}
          </Button>
        </form>

        <div className="auth-links">
          {mode === "login" ? (
            <>
              <Link className="auth-link-button" href="/forgot-password">{t.forgotLink}</Link>
              {!isSupabaseConfigured ? <span className="auth-demo-hint">{t.demoHint}</span> : null}
            </>
          ) : (
            <Link className="auth-link-button" href="/login">{t.backToLogin}</Link>
          )}
        </div>

        {message || resetCompleteMessage ? <p className="auth-message">{message || resetCompleteMessage}</p> : null}
      </Card>
    </main>
  );
}
