import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { theme } from '../../theme';
import { fetchVisiteByPaziente } from '../../services/visiteService';
import { fetchCurrentUser } from '../../services/authApi';
import { formatDayTitle, formatOraDisplay, formatPrezzoEUR } from './visiteFormatting';

const GestioneVisiteScreen: React.FC = () => {
  const profileQuery = useQuery({
    queryKey: ['auth-me-profile'],
    queryFn: fetchCurrentUser,
    staleTime: 60_000,
  });
  const pazienteId = profileQuery.data?.pazienteId ?? null;

  const visiteQuery = useQuery({
    queryKey: ['visite-by-paziente', pazienteId, 'DESC'],
    queryFn: () => fetchVisiteByPaziente(pazienteId!, { sortOrder: 'DESC' }),
    enabled: typeof pazienteId === 'number' && pazienteId > 0,
  });

  const refreshing = profileQuery.isFetching || visiteQuery.isFetching;
  const onRefresh = useCallback(() => {
    profileQuery.refetch();
    visiteQuery.refetch();
  }, [profileQuery, visiteQuery]);

  const profileError = profileQuery.error?.message;
  const visiteError = visiteQuery.error?.message;
  const visite = visiteQuery.data ?? [];

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.lead}>
        <Text style={styles.leadText}>
          Prenotate, effettuate, disdette e altri stati — ordine dalla più recente.
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.secondary} />
        }
      >
        {profileQuery.isLoading && (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={theme.colors.secondary} />
            <Text style={styles.muted}>Caricamento profilo…</Text>
          </View>
        )}

        {profileError && !profileQuery.isLoading && (
          <Text style={styles.inlineError}>{profileError}</Text>
        )}

        {!profileQuery.isLoading &&
          !profileError &&
          (pazienteId == null || pazienteId <= 0) && (
            <Text style={styles.muted}>
              Per elencare le visite serve il campo{' '}
              <Text style={styles.mono}>pazienteId</Text> nel profilo (login o GET /auth/me).
            </Text>
          )}

        {typeof pazienteId === 'number' && pazienteId > 0 && visiteQuery.isLoading && (
          <View style={styles.centered}>
            <ActivityIndicator color={theme.colors.secondary} />
            <Text style={styles.muted}>Caricamento visite…</Text>
          </View>
        )}

        {visiteError && <Text style={styles.inlineError}>{visiteError}</Text>}

        {typeof pazienteId === 'number' &&
          pazienteId > 0 &&
          !visiteQuery.isLoading &&
          !visiteError &&
          visite.length === 0 && (
            <Text style={styles.muted}>Nessuna visita in archivio per questo paziente.</Text>
          )}

        {visite.map((v) => {
          const prezzo = formatPrezzoEUR(v.prezzoVisita);
          const ora = formatOraDisplay(v.oraInizio);
          return (
            <View key={v.id} style={styles.bookingCard}>
              <Text style={styles.bookingWhen}>
                {formatDayTitle(v.dataVisita)}
                {ora ? `\n${ora}` : ''}
              </Text>
              <Text style={styles.bookingMeta}>
                {[v.osteopataNome, v.osteopataCognome].filter(Boolean).join(' ') ||
                  'Osteopata non assegnato'}
              </Text>
              {v.siglaVisita ? (
                <Text style={styles.bookingStato}>Sigla: {v.siglaVisita}</Text>
              ) : null}
              {v.statusVisita ? (
                <Text style={styles.bookingStato}>Stato visita: {v.statusVisita}</Text>
              ) : null}
              {v.statusPagamento ? (
                <Text style={styles.bookingStato}>Pagamento: {v.statusPagamento}</Text>
              ) : null}
              {prezzo ? <Text style={styles.bookingStato}>Importo: {prezzo}</Text> : null}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  lead: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(114, 250, 147, 0.15)',
  },
  leadText: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    lineHeight: 20,
    opacity: 0.9,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 32,
  },
  centered: {
    paddingVertical: 24,
    alignItems: 'center',
    gap: 12,
  },
  muted: {
    color: theme.colors.text.secondary,
    fontSize: 14,
    lineHeight: 20,
  },
  mono: {
    fontFamily: 'monospace',
    fontSize: 13,
    color: theme.colors.secondary,
  },
  inlineError: {
    marginBottom: 12,
    color: theme.colors.error,
    fontSize: 14,
    lineHeight: 20,
  },
  bookingCard: {
    marginTop: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(114, 250, 147, 0.2)',
    backgroundColor: 'rgba(0, 37, 82, 0.45)',
  },
  bookingWhen: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.secondary,
    lineHeight: 22,
  },
  bookingMeta: {
    marginTop: 8,
    fontSize: 14,
    color: theme.colors.secondary,
  },
  bookingStato: {
    marginTop: 6,
    fontSize: 13,
    color: theme.colors.text.secondary,
    opacity: 0.85,
  },
});

export default GestioneVisiteScreen;
