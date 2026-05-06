import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  getAuthToken,
  getStoredUserProfile,
  setRememberUsernamePreference,
  type StoredUserProfile,
} from '../services/authTokenStorage';
import {
  fetchCurrentUser,
  loginMobilitas,
  logoutMobilitas,
  persistLoginSession,
  restorePersistedSession,
} from '../services/authApi';
import { isAxiosError } from 'axios';

export type SignInOptions = {
  /** Se true, salva solo username/email in locale (mai la password). */
  rememberUsername?: boolean;
};

type AuthContextValue = {
  isReady: boolean;
  isSignedIn: boolean;
  /** Snapshot dopo login / restore / GET /auth/me (+ osteopata se applicabile). */
  userProfile: StoredUserProfile | null;
  signIn: (username: string, password: string, options?: SignInOptions) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [token, setToken] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<StoredUserProfile | null>(null);
  const [hydrated, setHydrated] = useState(false);

  /** Ripristina JWT e profilo da storage; valida con /auth/me quando c’è rete. */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [storedToken, storedProfile] = await Promise.all([getAuthToken(), getStoredUserProfile()]);
        if (cancelled) return;
        if (storedToken) {
          // Hydration immediata da storage: evita di mostrare il login a ogni riavvio.
          setToken(storedToken);
          setUserProfile(storedProfile);
        }

        if (!storedToken) {
          setToken(null);
          setUserProfile(null);
          return;
        }

        const ok = await restorePersistedSession();
        if (cancelled) return;
        if (ok) {
          const [validatedToken, validatedProfile] = await Promise.all([
            getAuthToken(),
            getStoredUserProfile(),
          ]);
          setToken(validatedToken);
          setUserProfile(validatedProfile);
        } else {
          setToken(null);
          setUserProfile(null);
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
      setToken(session.token);
      try {
        const profile = await fetchCurrentUser();
        setUserProfile(profile);
      } catch (e) {
        if (isAxiosError(e) && e.response?.status === 401) {
          await logoutMobilitas();
          setToken(null);
          setUserProfile(null);
          const msg =
            typeof e.response?.data === 'object' &&
            e.response.data &&
            'message' in e.response.data &&
            typeof (e.response.data as { message?: unknown }).message === 'string'
              ? (e.response.data as { message: string }).message
              : 'Sessione non valida';
          throw new Error(msg);
        }
        const fallback = await getStoredUserProfile();
        setUserProfile(fallback);
      }
      await setRememberUsernamePreference(!!options?.rememberUsername, username.trim());
      queryClient.invalidateQueries();
    },
    [queryClient]
  );

  const signOut = useCallback(async () => {
    await logoutMobilitas();
    setToken(null);
    setUserProfile(null);
    queryClient.clear();
  }, [queryClient]);

  const value = useMemo<AuthContextValue>(
    () => ({
      isReady: hydrated,
      isSignedIn: !!token,
      userProfile,
      signIn,
      signOut,
    }),
    [hydrated, token, userProfile, signIn, signOut]
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
