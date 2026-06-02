"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Eye, EyeOff, GraduationCap, LockKeyhole, Mail, ShieldCheck, Sparkles, UserRound } from "lucide-react";
import { authService, isSupabaseConfigured } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { type Language, getInitialLanguage, getStoredLanguage, languageStorageKey, translations } from "@/lib/i18n";

type AuthMode = "login" | "register" | "forgot";

type DemoUser = {
  email: string;
  password: string;
  name: string;
};

const demoUsersKey = "educore_demo_users";
const demoSessionKey = "educore_session";

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
  const [language, setLanguage] = useState<Language>(getInitialLanguage);
  const registeredEmail = searchParams.get("email") ?? "";
  const [email, setEmail] = useState(registeredEmail || (isSupabaseConfigured ? "" : "admin@educore.mn"));
  const [password, setPassword] = useState(isSupabaseConfigured ? "" : "educore-demo");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [name, setName] = useState(isSupabaseConfigured ? "" : "Admin User");
  const copy = translations[language];
  const [message, setMessage] = useState("");
  const registeredMessage = searchParams.get("registered") ? copy.auth.messages.registered : "";

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

  const modeCopy = copy.auth.modes[mode];

  function readDemoUsers() {
    try {
      return JSON.parse(window.localStorage.getItem(demoUsersKey) ?? "[]") as DemoUser[];
    } catch {
      return [];
    }
  }

  function saveDemoUser() {
    const users = readDemoUsers().filter((user) => user.email.toLowerCase() !== email.toLowerCase());
    users.push({ email, password, name });
    window.localStorage.setItem(demoUsersKey, JSON.stringify(users));
  }

  function findDemoUser() {
    return readDemoUsers().find((user) => user.email.toLowerCase() === email.toLowerCase() && user.password === password);
  }

  async function signInWithGoogle() {
    if (!isSupabaseConfigured) {
      setMessage(language === "mn" ? "Google login ашиглахын тулд Supabase URL болон anon key тохируулна уу." : "Configure Supabase URL and anon key to use Google login.");
      return;
    }

    const result = await authService.signInWithGoogle(`${window.location.origin}/`);

    if ("error" in result && result.error) {
      setMessage(result.error.message);
    }
  }

  return (
    <main className="auth-page">
      <Card className="auth-card">
        <div className="auth-brand-row">
          <div className="auth-brand">
            <span>
              <GraduationCap size={24} />
            </span>
            <div>
              <strong>EduCore</strong>
              <p>School OS</p>
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

            if (!isSupabaseConfigured && mode === "register") {
              saveDemoUser();
              router.push(`/login?registered=1&email=${encodeURIComponent(email)}`);
              return;
            }

            if (!isSupabaseConfigured && mode === "login") {
              const user = findDemoUser();

              if (!user) {
                setMessage("Эхлээд Register хийсэн email/password-аараа login хийнэ.");
                return;
              }

              window.localStorage.setItem(demoSessionKey, JSON.stringify({ email: user.email, name: user.name }));
              router.push("/");
              return;
            }

            const cleanEmail = email.trim();
            const result =
              mode === "login"
                ? await authService.signIn(cleanEmail, password)
                : mode === "register"
                  ? await authService.signUp(cleanEmail, password, name)
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
          <label>
            {copy.auth.fields.email}
            <span className="auth-field">
              <Mail size={18} />
              <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
            </span>
          </label>
          {mode !== "forgot" ? (
            <label>
              {copy.auth.fields.password}
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
            </label>
          ) : null}
          <Button type="submit">
            {mode === "forgot" ? <Mail size={17} /> : <ShieldCheck size={17} />}
            {modeCopy.button}
          </Button>
        </form>
        {message || registeredMessage ? <p className="auth-message">{message || registeredMessage}</p> : null}
      </Card>
    </main>
  );
}
