import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { authService } from "./supabase";
import { resolveActiveSession, type ActiveSession } from "./session";

type AuthState = {
  /** null while loading, and after loading, when there is no signed-in user. */
  session: ActiveSession | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  updateAvatar: (avatarUrl: string) => Promise<{ error: string | null }>;
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
    });

    // Keeps the app's session in sync with token refreshes and sign-out
    // triggered elsewhere (e.g. a 401 handler clearing the stored token).
    const {
      data: { subscription }
    } = authService.onAuthStateChange(() => {
      resolveActiveSession().then((next) => {
        if (mounted) setSession(next);
      });
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function signIn(email: string, password: string) {
    const { error } = await authService.signIn(email, password);
    return { error: error?.message ?? null };
  }

  async function signOut() {
    await authService.signOut();
    setSession(null);
  }

  async function updateAvatar(avatarUrl: string) {
    const { error } = await authService.updateProfile({ avatarUrl });
    return { error: error?.message ?? null };
  }

  return (
    <AuthContext.Provider value={{ session, loading, signIn, signOut, updateAvatar }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider.");
  return context;
}
