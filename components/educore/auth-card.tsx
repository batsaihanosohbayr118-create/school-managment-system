"use client";

import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import { useEffect, useState } from "react";
import { Check, ChevronDown, Eye, EyeOff, KeyRound, LockKeyhole, Mail, ShieldCheck, Sparkles, UserRound } from "lucide-react";
import { authService, getAuthRedirectUrl, isSupabaseConfigured } from "@/lib/supabase";
import { passwordStrengthLabel, validatePasswordStrength } from "@/lib/password-validation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { type Language, getInitialLanguage, languageStorageKey, translations } from "@/lib/i18n";
import type { Role } from "@/lib/types";

type AuthMode = "login" | "register" | "forgot";
type ResetStep = "email" | "code" | "password";

type DemoUser = {
  email: string;
  password: string;
  name: string;
  role: Role;
};

const demoUsersKey = "educore_demo_users";
const demoSessionKey = "educore_session";
const registrationRoles: Role[] = ["admin", "teacher", "student", "parent"];

function GoogleIcon() {
  return (
    <svg aria-hidden="true" className="google-mark" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06L5.84 9.9C6.71 7.3 9.14 5.38 12 5.38z" fill="#EA4335" />
    </svg>
  );
}

export function AuthCard({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [language, setLanguage] = useState<Language>("en");
  const registeredEmail = searchParams.get("email") ?? "";
  const [email, setEmail] = useState(registeredEmail || (isSupabaseConfigured ? "" : "admin@educore.mn"));
  const [password, setPassword] = useState(isSupabaseConfigured ? "" : "educore-demo");
  const [verificationCode, setVerificationCode] = useState("");
  const [resetStep, setResetStep] = useState<ResetStep>("email");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [name, setName] = useState(isSupabaseConfigured ? "" : "Admin User");
  const [selectedRole, setSelectedRole] = useState<Role | "">("");
  const [roleOpen, setRoleOpen] = useState(false);
  const [adminCode, setAdminCode] = useState("");
  const passwordCheck = validatePasswordStrength(password);
  const strength = passwordStrengthLabel(passwordCheck.score);
  const copy = translations[language];
  const [message, setMessage] = useState("");
  const registeredMessage = searchParams.get("registered") ? copy.auth.messages.registered : "";
  const resetCompleteMessage = searchParams.get("reset") ? copy.auth.messages.resetComplete : "";
  const modeCopy = copy.auth.modes[mode];
  const resetButtonLabel =
    mode === "forgot"
      ? resetStep === "email"
        ? copy.auth.reset.sendCode
        : resetStep === "code"
          ? copy.auth.reset.verifyCode
          : copy.auth.reset.savePassword
      : modeCopy.button;

  useEffect(() => {
    queueMicrotask(() => {
      setLanguage(getInitialLanguage());
    });
  }, []);

  useEffect(() => {
    document.documentElement.lang = language === "mn" ? "mn" : "en";
    window.localStorage.setItem(languageStorageKey, language);
  }, [language]);

  function readDemoUsers() {
    try {
      return JSON.parse(window.localStorage.getItem(demoUsersKey) ?? "[]") as DemoUser[];
    } catch {
      return [];
    }
  }

  function saveDemoUser(cleanEmail: string, cleanName: string, role: Role) {
    const users = readDemoUsers().filter((user) => user.email.toLowerCase() !== cleanEmail.toLowerCase());
    users.push({ email: cleanEmail, password, name: cleanName, role });
    window.localStorage.setItem(demoUsersKey, JSON.stringify(users));
  }

  function findDemoUser(cleanEmail: string) {
    return readDemoUsers().find((user) => user.email.toLowerCase() === cleanEmail.toLowerCase() && user.password === password);
  }

  async function signInWithGoogle() {
    if (!isSupabaseConfigured) {
      setMessage(language === "mn" ? "Google login ашиглахын тулд Supabase URL болон anon key тохируулна уу." : "Configure Supabase URL and anon key to use Google login.");
      return;
    }

    const result = await authService.signInWithGoogle(getAuthRedirectUrl("/"));

    if ("error" in result && result.error) {
      setMessage(result.error.message);
      return;
    }

    if ("data" in result && result.data?.url) {
      window.location.assign(result.data.url);
    }
  }

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
        <div className="auth-tabs">
          <a className={mode === "login" ? "active" : ""} href="/login">{copy.auth.tabs.login}</a>
          <a className={mode === "register" ? "active" : ""} href="/register">{copy.auth.tabs.register}</a>
          <a className={mode === "forgot" ? "active" : ""} href="/forgot-password">{copy.auth.tabs.forgot}</a>
        </div>
        {mode !== "forgot" ? (
          <>
            <Button className="google-auth-button" variant="secondary" onClick={signInWithGoogle} type="button">
              <GoogleIcon />
              {language === "mn" ? "Google-ээр нэвтрэх" : "Continue with Google"}
            </Button>
            <div className="auth-divider">
              <span>{language === "mn" ? "эсвэл" : "or"}</span>
            </div>
          </>
        ) : null}
        <form
          className="auth-form"
          onSubmit={async (event) => {
            event.preventDefault();
            const cleanEmail = email.trim();
            const cleanName = name.trim();
            const registrationRole: Role | null = selectedRole || null;

            if (mode === "forgot") {
              if (!isSupabaseConfigured) {
                setMessage(language === "mn" ? "Нууц үг сэргээх code авахын тулд Supabase тохируулна уу." : "Configure Supabase to receive a password reset code.");
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
              return;
            }

            if (mode === "register" && !registrationRole) {
              setMessage(language === "mn" ? "Role сонгоод бүртгүүлнэ үү." : "Choose a role before registering.");
              return;
            }

            // Password strength is mandatory for every new account, no exceptions.
            if (mode === "register" && !passwordCheck.isValid) {
              setMessage(passwordCheck.errors[0]);
              return;
            }

            // Extra gate: registering as "admin" requires a valid invite code,
            // verified server-side so the real code never ships to the client.
            if (mode === "register" && registrationRole === "admin") {
              if (!adminCode.trim()) {
                setMessage(language === "mn" ? "Admin эрхээр бүртгүүлэхэд урилгын код шаардлагатай." : "An invite code is required to register as admin.");
                return;
              }

              try {
                const verifyResponse = await fetch("/api/admin/verify-invite", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ code: adminCode.trim() })
                });
                const verifyResult = await verifyResponse.json();

                if (!verifyResult.valid) {
                  setMessage(verifyResult.message ?? (language === "mn" ? "Admin код буруу байна." : "Invalid admin code."));
                  return;
                }
              } catch {
                setMessage(language === "mn" ? "Admin кодыг шалгах үед алдаа гарлаа." : "Could not verify the admin code.");
                return;
              }
            }

            if (!isSupabaseConfigured && mode === "register") {
              if (!registrationRole) return;
              saveDemoUser(cleanEmail, cleanName, registrationRole);
              router.push(`/login?registered=1&email=${encodeURIComponent(cleanEmail)}`);
              return;
            }

            if (!isSupabaseConfigured && mode === "login") {
              const user = findDemoUser(cleanEmail);

              if (!user) {
                setMessage("Эхлээд Register хийсэн email/password-аараа login хийнэ.");
                return;
              }

              window.localStorage.removeItem(demoSessionKey);
              window.sessionStorage.setItem(demoSessionKey, JSON.stringify({ email: user.email, name: user.name, role: user.role }));
              router.push("/");
              return;
            }

            const result =
              mode === "login"
                ? await authService.signIn(cleanEmail, password)
                : mode === "register" && registrationRole
                  ? await authService.signUp(cleanEmail, password, cleanName, registrationRole)
                  : await authService.resetPassword(cleanEmail);

            if ("error" in result && result.error) {
              setMessage(
                result.error.message === "Invalid login credentials"
                  ? language === "mn"
                    ? "Имэйл эсвэл нууц үг буруу байна. Бүртгүүлсэн имэйл/нууц үгээ оруулна уу."
                    : "Email or password is incorrect. Use the email/password you registered with."
                  : result.error.message
              );
              return;
            }

            if (mode === "register") {
              router.push(`/login?registered=1&email=${encodeURIComponent(cleanEmail)}`);
              return;
            }

            if (mode === "login") {
              router.push("/");
              return;
            }

            setMessage("Request completed successfully.");
          }}
        >
          {mode === "register" ? (
            <label>
              {copy.auth.fields.name}
              <span className="auth-field">
                <UserRound size={18} />
                <Input value={name} onChange={(event) => setName(event.target.value)} />
              </span>
            </label>
          ) : null}
          {mode === "register" ? (
            <label>
              {copy.auth.fields.role}
              <div
                className={`auth-field auth-role-field${roleOpen ? " open" : ""}`}
                onBlur={(event) => {
                  const nextTarget = event.relatedTarget;
                  if (!(nextTarget instanceof Node) || !event.currentTarget.contains(nextTarget)) {
                    setRoleOpen(false);
                  }
                }}
              >
                <ShieldCheck size={18} />
                <button
                  aria-expanded={roleOpen}
                  className={`ec-input auth-role-trigger${selectedRole ? "" : " placeholder"}`}
                  onClick={() => setRoleOpen((value) => !value)}
                  type="button"
                >
                  <span>{selectedRole ? copy.roles[selectedRole] : copy.auth.fields.rolePlaceholder}</span>
                  <ChevronDown size={17} />
                </button>
                {roleOpen ? (
                  <div className="auth-role-menu" role="listbox">
                    {registrationRoles.map((role) => {
                      const selected = selectedRole === role;

                      return (
                        <button
                          aria-selected={selected}
                          className={selected ? "active" : ""}
                          key={role}
                          onClick={() => {
                            setSelectedRole(role);
                            setRoleOpen(false);
                          }}
                          role="option"
                          type="button"
                        >
                          <span>{copy.roles[role]}</span>
                          {selected ? <Check size={16} /> : null}
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            </label>
          ) : null}
          {mode === "register" && selectedRole === "admin" ? (
            <label>
              {language === "mn" ? "Admin урилгын код" : "Admin invite code"}
              <span className="auth-field">
                <ShieldCheck size={18} />
                <Input value={adminCode} onChange={(event) => setAdminCode(event.target.value)} />
              </span>
            </label>
          ) : null}
          <label>
            {copy.auth.fields.email}
            <span className="auth-field">
              <Mail size={18} />
              <Input disabled={mode === "forgot" && resetStep !== "email"} type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
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
          {mode !== "forgot" || resetStep === "password" ? (
            <label>
              {mode === "forgot" ? copy.auth.fields.newPassword : copy.auth.fields.password}
              <span className="auth-field auth-password-field">
                <LockKeyhole size={18} />
                <Input type={passwordVisible ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} />
                <button
                  aria-label={passwordVisible ? "Hide password" : "Show password"}
                  className="auth-password-toggle"
                  onClick={() => setPasswordVisible((value) => !value)}
                  type="button"
                >
                  {passwordVisible ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </span>
              {mode === "register" || (mode === "forgot" && resetStep === "password") ? (
                <div className="auth-password-strength" style={{ marginTop: 6 }}>
                  <div
                    style={{
                      height: 4,
                      borderRadius: 4,
                      background: "#e5e7eb",
                      overflow: "hidden"
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${(passwordCheck.score / 4) * 100}%`,
                        background: strength.color,
                        transition: "width 150ms ease"
                      }}
                    />
                  </div>
                  <p style={{ fontSize: 12, color: strength.color, margin: "4px 0 0" }}>
                    {password ? strength.label : ""}
                  </p>
                  {password && !passwordCheck.isValid ? (
                    <ul style={{ fontSize: 12, color: "#6b7280", margin: "4px 0 0", paddingLeft: 16 }}>
                      {passwordCheck.errors.map((err) => (
                        <li key={err}>{err}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : null}
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
          <Button
            type="submit"
            disabled={
              (mode === "register" && !passwordCheck.isValid) ||
              (mode === "forgot" && resetStep === "password" && !passwordCheck.isValid)
            }
          >
            {mode === "forgot" ? <Mail size={17} /> : <ShieldCheck size={17} />}
            {resetButtonLabel}
          </Button>
        </form>
        {message || registeredMessage || resetCompleteMessage ? <p className="auth-message">{message || registeredMessage || resetCompleteMessage}</p> : null}
      </Card>
    </main>
  );
}