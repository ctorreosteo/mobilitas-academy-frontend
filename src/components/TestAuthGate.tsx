import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { theme } from '../theme';
import { performTestLogin } from '../services/authApi';

interface TestAuthGateProps {
  children: React.ReactNode;
}

/**
 * All’avvio esegue login di test e salva il JWT prima di mostrare la navigazione,
 * così le prime richieste a `/api/formazione/**` sono già autenticate.
 */
const TestAuthGate: React.FC<TestAuthGateProps> = ({ children }) => {
  const queryClient = useQueryClient();
  const [ready, setReady] = useState(false);
  const [bootError, setBootError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setBootError(null);
        await performTestLogin();
        queryClient.invalidateQueries();
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Login di test non riuscito';
        console.warn('[TestAuthGate]', msg, e);
        if (!cancelled) setBootError(msg);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [queryClient]);

  if (!ready) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.secondary} />
        <Text style={styles.hint}>Accesso in corso…</Text>
      </View>
    );
  }

  if (bootError) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorTitle}>Impossibile effettuare il login di test</Text>
        <Text style={styles.errorDetail}>{bootError}</Text>
        <Text style={styles.hint}>
          Verifica EXPO_PUBLIC_BACKEND_URL e che POST /api/auth/login accetti email e password nel body JSON.
        </Text>
      </View>
    );
  }

  return <>{children}</>;
};

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background.primary,
    paddingHorizontal: 24,
  },
  hint: {
    marginTop: 16,
    fontSize: 14,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.secondary,
    textAlign: 'center',
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
  },
  errorDetail: {
    fontSize: 14,
    color: theme.colors.text.primary,
    textAlign: 'center',
    marginBottom: 12,
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
  },
});

export default TestAuthGate;
