import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
// @ts-ignore - @expo/vector-icons è parte di Expo SDK
import { Ionicons } from '@expo/vector-icons';
import { theme, withOpacity } from '../../theme';
import { fetchCurrentUser, hasPazienteRole } from '../../services/authApi';
import { useAuth } from '../../context/AuthContext';
import {
  downloadFatturaPdf,
  fetchPagamentiByPaziente,
  shareFatturaPdf,
  type PagamentoDto,
} from '../../services/pagamentiService';
import { formatLocalDateTimeDisplay, formatPrezzoEUR } from './visiteFormatting';
import StudioWhatsAppSupportButton from '../../components/StudioWhatsAppSupportButton';
import { useTabBarBottomPadding } from '../../hooks/useTabBarBottomPadding';
import { getUserFacingApiErrorMessage } from '../../utils/apiErrorMessage';

const PAGAMENTI_WHATSAPP =
  "Buongiorno Team di Mobilitas! Sono un utente dell'applicazione e vorrei poter visualizzare i miei pagamenti. Attendo un vostro riscontro, grazie!";

const FATTURA_NON_DISPONIBILE =
  'La fattura non è disponibile nell’app. Contatta la segreteria su WhatsApp per richiederla.';

const FATTURA_WHATSAPP =
  'Buongiorno, sono un paziente dello studio e non riesco a scaricare la fattura di un pagamento dall’app. Vorrei richiederla. Grazie.';

function isRimborso(p: PagamentoDto): boolean {
  const stato = (p.stato ?? '').toUpperCase();
  if (stato.includes('RIMBORSO')) return true;
  return typeof p.importo === 'number' && p.importo <= 0;
}

function statoLabel(p: PagamentoDto): string {
  return p.statoDescrizione?.trim() || p.stato?.trim() || 'Stato non disponibile';
}

function PagamentoCard({
  pagamento,
  opening,
  onOpenFattura,
}: {
  pagamento: PagamentoDto;
  opening: boolean;
  onOpenFattura: (pagamento: PagamentoDto) => void;
}) {
  const rimborso = isRimborso(pagamento);
  const importo = formatPrezzoEUR(pagamento.importo);
  const when = formatLocalDateTimeDisplay(pagamento.dataPagamento);

  return (
    <View style={[styles.card, rimborso && styles.cardRimborso]}>
      <View style={styles.cardRow}>
        <View style={styles.cardMain}>
          <Text style={[styles.importo, rimborso && styles.importoRimborso]}>{importo ?? '—'}</Text>
          {when ? <Text style={styles.meta}>{when}</Text> : null}
        </View>
        <View style={styles.cardRight}>
          <View style={[styles.statoBadge, rimborso ? styles.statoBadgeRimborso : styles.statoBadgeOk]}>
            <Text style={[styles.statoBadgeText, rimborso && styles.statoBadgeTextRimborso]}>
              {statoLabel(pagamento)}
            </Text>
          </View>
          <Pressable
            style={({ pressed }) => [
              styles.fatturaBtn,
              pressed && styles.fatturaBtnPressed,
              opening && styles.fatturaBtnDisabled,
            ]}
            onPress={() => onOpenFattura(pagamento)}
            disabled={opening}
            accessibilityRole="button"
            accessibilityLabel="Apri o richiedi la fattura"
          >
            {opening ? (
              <ActivityIndicator size="small" color={theme.colors.background.primary} />
            ) : (
              <Ionicons name="document-text-outline" size={16} color={theme.colors.background.primary} />
            )}
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const PagamentiPazienteScreen: React.FC = () => {
  const tabBarPad = useTabBarBottomPadding();
  const { userProfile } = useAuth();
  const [openingPagamentoId, setOpeningPagamentoId] = useState<number | null>(null);
  const [fatturaError, setFatturaError] = useState<string | null>(null);
  const openingLock = useRef(false);

  const profileQuery = useQuery({
    queryKey: ['auth-me-profile'],
    queryFn: fetchCurrentUser,
    staleTime: 60_000,
  });

  const profile = profileQuery.data ?? userProfile;
  const isPaziente = hasPazienteRole(profile?.ruoli);
  const pazienteId = profile?.pazienteId ?? null;
  const hasPazienteId = typeof pazienteId === 'number' && pazienteId > 0;

  const pagamentiQuery = useQuery({
    queryKey: ['pagamenti-paziente', pazienteId, 'DESC'],
    queryFn: () => fetchPagamentiByPaziente(pazienteId!, { sortDir: 'DESC' }),
    enabled: isPaziente && hasPazienteId,
  });

  const refreshing = profileQuery.isFetching || pagamentiQuery.isFetching;
  const onRefresh = useCallback(() => {
    profileQuery.refetch();
    if (isPaziente && hasPazienteId) {
      pagamentiQuery.refetch();
    }
  }, [profileQuery, pagamentiQuery, isPaziente, hasPazienteId]);

  const onOpenFattura = useCallback(async (pagamento: PagamentoDto) => {
    if (openingLock.current) return;
    if (pagamento.fatturaPresente !== true) {
      setFatturaError(FATTURA_NON_DISPONIBILE);
      return;
    }
    openingLock.current = true;
    setOpeningPagamentoId(pagamento.id);
    try {
      const file = await downloadFatturaPdf(pagamento.id);
      await shareFatturaPdf(file.uri, file.filename);
    } catch (e) {
      const message =
        e instanceof Error && e.message.trim()
          ? e.message
          : getUserFacingApiErrorMessage(e, {
              fallback: FATTURA_NON_DISPONIBILE,
            });
      setFatturaError(message);
    } finally {
      openingLock.current = false;
      setOpeningPagamentoId(null);
    }
  }, []);

  const profileError = profileQuery.error
    ? getUserFacingApiErrorMessage(profileQuery.error, {
        context: 'Impossibile caricare il profilo',
      })
    : null;
  const pagamentiError = pagamentiQuery.error
    ? getUserFacingApiErrorMessage(pagamentiQuery.error, {
        context: 'Impossibile caricare i pagamenti',
      })
    : null;

  const list = pagamentiQuery.data ?? [];
  const showMissingPazienteId =
    isPaziente &&
    !profileQuery.isLoading &&
    !profileError &&
    !hasPazienteId;

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 32 + tabBarPad }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.secondary} />
        }
      >
        <Text style={styles.leadText}>
          Storico dei pagamenti associati al tuo profilo, dal più recente.
        </Text>
        <View style={styles.headerBadge}>
          <Ionicons name="wallet-outline" size={14} color={theme.colors.text.primary} />
          <Text style={styles.headerBadgeText}>I tuoi pagamenti</Text>
        </View>
        <View style={styles.dividerWrap}>
          <View style={styles.dividerLine} />
          <View style={styles.dividerIconWrap}>
            <Ionicons name="card-outline" size={15} color={theme.colors.secondary} />
          </View>
          <View style={styles.dividerLine} />
        </View>

        {profileQuery.isLoading && !profile ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={theme.colors.secondary} />
            <Text style={styles.muted}>Caricamento profilo…</Text>
          </View>
        ) : null}

        {profileError && !profile ? (
          <Text style={styles.inlineError}>{profileError}</Text>
        ) : null}

        {!profileQuery.isLoading && !profileError && !isPaziente ? (
          <Text style={styles.muted}>Questa sezione è disponibile solo per gli utenti pazienti.</Text>
        ) : null}

        {showMissingPazienteId ? (
          <View style={styles.supportCard}>
            <Text style={styles.muted}>
              Per visualizzare i pagamenti in app dobbiamo collegare il tuo profilo paziente. Contatta la
              nostra segreteria e ti aiutiamo subito.
            </Text>
            <StudioWhatsAppSupportButton prefilledMessage={PAGAMENTI_WHATSAPP} />
          </View>
        ) : null}

        {isPaziente && hasPazienteId && pagamentiQuery.isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={theme.colors.secondary} />
            <Text style={styles.muted}>Caricamento pagamenti…</Text>
          </View>
        ) : null}

        {pagamentiError ? <Text style={styles.inlineError}>{pagamentiError}</Text> : null}

        {isPaziente &&
        hasPazienteId &&
        !pagamentiQuery.isLoading &&
        !pagamentiError &&
        list.length === 0 ? (
          <Text style={styles.muted}>Nessun pagamento in archivio per il tuo profilo.</Text>
        ) : null}

        {list.map((pagamento) => (
          <PagamentoCard
            key={pagamento.id}
            pagamento={pagamento}
            opening={openingPagamentoId === pagamento.id}
            onOpenFattura={onOpenFattura}
          />
        ))}
      </ScrollView>

      <Modal
        visible={Boolean(fatturaError)}
        transparent
        animationType="fade"
        onRequestClose={() => setFatturaError(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconWrap}>
              <Ionicons name="alert-circle-outline" size={20} color={theme.colors.error} />
            </View>
            <Text style={styles.modalTitle}>Fattura non disponibile sull’app</Text>
            <Text style={styles.modalText}>{fatturaError}</Text>
            {fatturaError !== FATTURA_NON_DISPONIBILE ? (
              <Text style={styles.modalHint}>
                Puoi riprovare più tardi oppure contattare la segreteria per richiedere la fattura.
              </Text>
            ) : null}
            <View style={styles.modalFooter}>
              <StudioWhatsAppSupportButton prefilledMessage={FATTURA_WHATSAPP} />
              <Pressable
                style={({ pressed }) => [styles.modalSecondaryBtn, pressed && styles.modalBtnPressed]}
                onPress={() => setFatturaError(null)}
              >
                <Text style={styles.modalSecondaryBtnText}>Chiudi</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  leadText: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    lineHeight: 20,
    opacity: 0.9,
    marginBottom: 12,
  },
  headerBadge: {
    alignSelf: 'flex-start',
    marginBottom: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: withOpacity(theme.colors.secondary, 0.35),
    backgroundColor: withOpacity(theme.colors.secondary, 0.12),
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  headerBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text.primary,
    letterSpacing: 0.2,
  },
  dividerWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    marginBottom: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: withOpacity(theme.colors.secondary, 0.24),
  },
  dividerIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: withOpacity(theme.colors.secondary, 0.32),
    backgroundColor: withOpacity(theme.colors.secondary, 0.08),
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
  supportCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: withOpacity(theme.colors.secondary, 0.2),
    backgroundColor: withOpacity(theme.colors.primary, 0.4),
    padding: 14,
    gap: 12,
  },
  inlineError: {
    marginBottom: 12,
    color: theme.colors.error,
    fontSize: 14,
    lineHeight: 20,
  },
  card: {
    marginTop: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: withOpacity(theme.colors.secondary, 0.2),
    backgroundColor: withOpacity(theme.colors.primary, 0.45),
  },
  cardRimborso: {
    borderColor: withOpacity(theme.colors.error, 0.28),
    backgroundColor: withOpacity(theme.colors.error, 0.08),
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 12,
    minHeight: 56,
  },
  cardMain: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'space-between',
  },
  cardRight: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 8,
  },
  fatturaBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.secondary,
  },
  fatturaBtnPressed: {
    opacity: 0.88,
  },
  fatturaBtnDisabled: {
    opacity: 0.65,
  },
  importo: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.titlePrimary,
  },
  importoRimborso: {
    color: theme.colors.error,
  },
  statoBadge: {
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderWidth: 1,
  },
  statoBadgeOk: {
    borderColor: withOpacity(theme.colors.secondary, 0.4),
    backgroundColor: withOpacity(theme.colors.secondary, 0.12),
  },
  statoBadgeRimborso: {
    borderColor: withOpacity(theme.colors.error, 0.4),
    backgroundColor: withOpacity(theme.colors.error, 0.12),
  },
  statoBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
    color: theme.colors.secondary,
  },
  statoBadgeTextRimborso: {
    color: theme.colors.error,
  },
  meta: {
    fontSize: 13,
    color: theme.colors.text.secondary,
    lineHeight: 18,
    marginTop: 10,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: withOpacity(theme.colors.black, 0.45),
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    width: '100%',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: withOpacity(theme.colors.secondary, 0.28),
    backgroundColor: theme.colors.background.primary,
    padding: 18,
    gap: 12,
  },
  modalIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: withOpacity(theme.colors.error, 0.35),
    backgroundColor: withOpacity(theme.colors.error, 0.12),
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.secondary,
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
  },
  modalText: {
    fontSize: 14,
    lineHeight: 21,
    color: withOpacity(theme.colors.text.secondary, 0.92),
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
  },
  modalHint: {
    fontSize: 13,
    lineHeight: 19,
    color: withOpacity(theme.colors.text.secondary, 0.78),
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
  },
  modalFooter: {
    marginTop: 4,
    gap: 10,
  },
  modalSecondaryBtn: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: withOpacity(theme.colors.secondary, 0.32),
    backgroundColor: withOpacity(theme.colors.secondary, 0.1),
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 42,
    paddingHorizontal: 12,
  },
  modalSecondaryBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.secondary,
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
    textAlign: 'center',
  },
  modalBtnPressed: {
    opacity: 0.9,
  },
});

export default PagamentiPazienteScreen;
