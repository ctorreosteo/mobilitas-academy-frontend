import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { clearAllAuth } from '../services/authTokenStorage';
import { loginMobilitas, logoutMobilitas, persistLoginSession } from '../services/authApi';

type AuthContextValue = {
  isReady: boolean;
  isSignedIn: boolean;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [token, setToken] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  /** Nessun ripristino sessione all’avvio: prima schermata sempre il login (niente utente predefinito). */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      await clearAllAuth();
      if (!cancelled) {
        setToken(null);
        setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(
    async (username: string, password: string) => {
      const session = await loginMobilitas(username.trim(), password);
      await persistLoginSession(session);
      setToken(session.token);
      queryClient.invalidateQueries();
    },
    [queryClient]
  );

  const signOut = useCallback(async () => {
    await logoutMobilitas();
    setToken(null);
    queryClient.clear();
  }, [queryClient]);

  const value = useMemo<AuthContextValue>(
    () => ({
      isReady: hydrated,
      isSignedIn: !!token,
      signIn,
      signOut,
    }),
    [hydrated, token, signIn, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth deve essere usato dentro AuthProvider');
  }
  return ctx;
}
