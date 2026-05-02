import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getAuthToken, setRememberUsernamePreference } from '../services/authTokenStorage';
import {
  loginMobilitas,
  logoutMobilitas,
  persistLoginSession,
  restorePersistedSession,
} from '../services/authApi';

export type SignInOptions = {
  /** Se true, salva solo username/email in locale (mai la password). */
  rememberUsername?: boolean;
};

type AuthContextValue = {
  isReady: boolean;
  isSignedIn: boolean;
  signIn: (username: string, password: string, options?: SignInOptions) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [token, setToken] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  /** Ripristina JWT e profilo da storage; valida con /auth/me quando c’è rete. */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const ok = await restorePersistedSession();
        if (cancelled) return;
        if (ok) {
          const t = await getAuthToken();
          setToken(t);
        } else {
          setToken(null);
        }
      } finally {
        if (!cancelled) {
          setHydrated(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(
    async (username: string, password: string, options?: SignInOptions) => {
      const session = await loginMobilitas(username.trim(), password);
      await persistLoginSession(session);
      await setRememberUsernamePreference(!!options?.rememberUsername, username.trim());
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
