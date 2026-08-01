import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { authService } from "./auth";
import { resolveActiveSession, type ActiveSession } from "./session";

type AuthState = {
  /** null while loading, and after loading, when there is no signed-in user. */
  session: ActiveSession | null;
  loading: boolean;
  signIn: (identifier: string, password: string) => Promise<{ error: string | null }>;
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

    return () => {
      mounted = false;
    };
  }, []);

  async function signIn(identifier: string, password: string) {
    const { error } = await authService.signIn(identifier, password);
    if (!error) setSession(await resolveActiveSession());
    return { error };
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
