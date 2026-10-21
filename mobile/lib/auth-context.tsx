import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { AppState } from "react-native";
import { authService } from "./auth";
import { registerPushToken } from "./notifications";
import { resolveActiveSession, type ActiveSession } from "./session";
import type { RegistrationInput } from "@shared/registration";

type AuthState = {
  /** null while loading, and after loading, when there is no signed-in user. */
  session: ActiveSession | null;
  loading: boolean;
  signIn: (identifier: string, password: string) => Promise<{ error: string | null }>;
  /** `pending` is a teacher waiting for approval — created, but not signed in. */
  register: (input: RegistrationInput) => Promise<{ error: string | null; pending?: boolean }>;
  signOut: () => Promise<void>;
  updateAvatar: (avatarUrl: string) => Promise<{ error: string | null }>;
  updatePhone: (phone: string) => Promise<{ error: string | null }>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<ActiveSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    resolveActiveSession().then((initial) => {
      if (!mounted) return;
      setSession(initial);
      setLoading(false);
      if (initial) {
        void authService.refreshProfile().then(() => {
          if (mounted) void resolveActiveSession().then(setSession);
        });
      }
    });

    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active" && mounted) {
        void authService.refreshProfile().then(({ error }) => {
          if (!error && mounted) void resolveActiveSession().then(setSession);
        });
      }
    });

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  // Covers both a fresh sign-in and relaunching the app while already
  // signed in — either way, a signed-in session should have a current
  // push token on file.
  useEffect(() => {
    if (session) void registerPushToken();
  }, [session]);

  async function signIn(identifier: string, password: string) {
    const { error } = await authService.signIn(identifier, password);
    if (!error) setSession(await resolveActiveSession());
    return { error };
  }

  async function register(input: RegistrationInput) {
    const result = await authService.register(input);
    if (!result.error && !result.pending) setSession(await resolveActiveSession());
    return result;
  }

  async function signOut() {
    await authService.signOut();
    setSession(null);
  }

  async function updateAvatar(avatarUrl: string) {
    const { error } = await authService.updateProfile({ avatarUrl });
    if (!error) setSession(await resolveActiveSession());
    return { error };
  }

  async function updatePhone(phone: string) {
    const { error } = await authService.updateProfile({ phone });
    if (!error) setSession(await resolveActiveSession());
    return { error };
  }

  return (
    <AuthContext.Provider value={{ session, loading, signIn, register, signOut, updateAvatar, updatePhone }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider.");
  return context;
}
