import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
// @ts-ignore - @expo/vector-icons è parte di Expo SDK
import { Ionicons } from '@expo/vector-icons';
import { theme, withOpacity } from '../../theme';
import SpineIcon from '../../components/SpineIcon';
import {
  eliminaPrenotazioneSessionePosturale,
  fetchCalendarioSessioniPosturali,
  fetchPartecipazioniSessioniPosturali,
  type CalendarioSessionePosturaleDto,
  type PartecipanteSessionePosturaleDto,
} from '../../services/sessioniPosturaliService';
import { getUserFacingApiErrorMessage } from '../../utils/apiErrorMessage';
import StudioWhatsAppSupportButton from '../../components/StudioWhatsAppSupportButton';
import { useTabBarBottomPadding } from '../../hooks/useTabBarBottomPadding';

const SESSIONI_PRENOTAZIONI_WHATSAPP =
  "Buongiorno, utilizzo l'app Mobilitas Academy e ho problemi con le prenotazioni alle sessioni posturali. Potete aiutarmi? Grazie.";

function toHour(time: string): string {
  return time.slice(0, 5);
}

const SessioniPrenotazioniScreen: React.FC = () => {
  const tabBarPad = useTabBarBottomPadding();
  const [bookings, setBookings] = useState<PartecipanteSessionePosturaleDto[]>([]);
  const [sessionDetailsBySessionId, setSessionDetailsBySessionId] = useState<
    Record<number, CalendarioSessionePosturaleDto>
  >({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cancelingId, setCancelingId] = useState<number | null>(null);
  const [cancelledSessionName, setCancelledSessionName] = useState<string | null>(null);
  const [confirmCancelBooking, setConfirmCancelBooking] = useState<PartecipanteSessionePosturaleDto | null>(
    null
  );

  const loadBookings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [all, calendarRows] = await Promise.all([
        fetchPartecipazioniSessioniPosturali(),
        fetchCalendarioSessioniPosturali(),
      ]);
      setBookings(all);
      const detailsMap: Record<number, CalendarioSessionePosturaleDto> = {};
      for (const row of calendarRows) {
        if (detailsMap[row.sessioneId] == null) {
          detailsMap[row.sessioneId] = row;
        }
      }
      setSessionDetailsBySessionId(detailsMap);
    } catch (e) {
      setError(
        getUserFacingApiErrorMessage(e, {
          context: 'Impossibile caricare le prenotazioni',
          fallback: 'Non siamo riusciti a caricare l’elenco. Controlla la connessione e riprova.',
        })
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadBookings();
    }, [loadBookings])
  );

  const titleSubtitle = useMemo(
    () =>
      'Qui trovi le sessioni posturali che hai prenotato. La prenotazione vale per il tipo di sessione, non per un singolo orario.',
    []
  );

  const onConfirmCancelBooking = useCallback(
    async (item: PartecipanteSessionePosturaleDto) => {
      setCancelingId(item.id);
      try {
        await eliminaPrenotazioneSessionePosturale(item.id);
        await loadBookings();
        setConfirmCancelBooking(null);
        setCancelledSessionName(item.sessioneNome);
      } catch (e) {
        setError(
          getUserFacingApiErrorMessage(e, {
            context: 'Impossibile annullare la prenotazione',
            fallback: 'Riprova tra poco o contatta la segreteria.',
          })
        );
      } finally {
        setCancelingId(null);
      }
    },
    [loadBookings]
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: 30 + tabBarPad }]}>
        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>Le tue prenotazioni</Text>
          <Text style={styles.heroSubtitle}>{titleSubtitle}</Text>
          <View style={styles.headerBadge}>
            <Ionicons name="checkmark-done-outline" size={14} color={theme.colors.text.primary} />
            <Text style={styles.headerBadgeText}>Prenotazioni sessioni</Text>
          </View>
        </View>
        <View style={styles.dividerWrap}>
          <View style={styles.dividerLine} />
          <View style={styles.dividerIconWrap}>
            <SpineIcon size={16} color={theme.colors.secondary} />
          </View>
          <View style={styles.dividerLine} />
        </View>

        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={theme.colors.secondary} />
          </View>
        ) : null}

        {!loading && error ? (
          <View style={styles.stateCard}>
            <View style={styles.stateCardTop}>
              <Ionicons name="alert-circle-outline" size={20} color={theme.colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
            <StudioWhatsAppSupportButton
              prefilledMessage={SESSIONI_PRENOTAZIONI_WHATSAPP}
              style={styles.stateWhatsappBtn}
            />
          </View>
        ) : null}

        {!loading && !error && bookings.length === 0 ? (
          <View style={styles.stateCard}>
            <View style={styles.stateCardTop}>
              <Ionicons name="calendar-outline" size={20} color={theme.colors.secondary} />
              <Text style={styles.stateText}>Nessuna prenotazione attiva al momento.</Text>
            </View>
          </View>
        ) : null}

        {!loading && !error
          ? bookings.map((item) => {
              const details = sessionDetailsBySessionId[item.sessioneId];
              return (
                <View key={item.id} style={styles.bookingCard}>
                  <View style={styles.cardTopRow}>
                    <Text style={styles.bookingTitle}>{item.sessioneNome}</Text>
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>Attiva</Text>
                    </View>
                  </View>
                  {details ? (
                    <>
                      <Text style={styles.bookingMeta}>
                        Prossimo orario: {toHour(details.oraInizio)} - {toHour(details.oraFine)}
                      </Text>
                      {details.istruttoreNomeCompleto ? (
                        <Text style={styles.bookingMeta}>
                          Istruttore: {details.istruttoreNomeCompleto}
                        </Text>
                      ) : null}
                    </>
                  ) : (
                    <Text style={styles.bookingMeta}>Nessuna occorrenza in calendario al momento.</Text>
                  )}
                  <Text style={[styles.bookingMeta, styles.bookingDescription]}>
                    {details?.sessioneDescrizione?.trim() || 'Descrizione sessione non disponibile.'}
                  </Text>
                  <Pressable
                    style={({ pressed }) => [
                      styles.cancelButton,
                      pressed && styles.cancelButtonPressed,
                      cancelingId === item.id && styles.cancelButtonDisabled,
                    ]}
                    onPress={() => setConfirmCancelBooking(item)}
                    disabled={cancelingId === item.id}
                  >
                    {cancelingId === item.id ? (
                      <ActivityIndicator size="small" color={theme.colors.error} />
                    ) : (
                      <>
                        <Ionicons name="close-circle-outline" size={18} color={theme.colors.error} />
                        <Text style={styles.cancelButtonText}>Annulla</Text>
                      </>
                    )}
                  </Pressable>
                </View>
              );
            })
          : null}
      </ScrollView>

      <Modal
        visible={Boolean(confirmCancelBooking)}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmCancelBooking(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconWrap}>
              <Ionicons name="close-circle-outline" size={20} color={theme.colors.error} />
            </View>
            <Text style={styles.modalTitle}>Conferma annullamento</Text>
            <Text style={styles.modalText}>
              Vuoi annullare la prenotazione per "{confirmCancelBooking?.sessioneNome}"?
            </Text>
            <View style={styles.modalActions}>
              <Pressable
                style={({ pressed }) => [styles.modalSecondaryBtn, pressed && styles.modalBtnPressed]}
                onPress={() => setConfirmCancelBooking(null)}
                disabled={cancelingId !== null}
              >
                <Text style={styles.modalSecondaryBtnText}>Mantieni prenotazione</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.modalDangerBtn, pressed && styles.modalBtnPressed]}
                onPress={() => {
                  if (confirmCancelBooking) onConfirmCancelBooking(confirmCancelBooking);
                }}
                disabled={cancelingId !== null || !confirmCancelBooking}
              >
                {cancelingId !== null ? (
                  <ActivityIndicator size="small" color={theme.colors.background.primary} />
                ) : (
                  <Text style={styles.modalDangerBtnText}>Annulla prenotazione</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={Boolean(cancelledSessionName)}
        transparent
        animationType="fade"
        onRequestClose={() => setCancelledSessionName(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconWrap}>
              <Ionicons name="checkmark-circle-outline" size={20} color={theme.colors.secondary} />
            </View>
            <Text style={styles.modalTitle}>Annullamento confermato</Text>
            <Text style={styles.modalText}>
              Hai annullato con successo la prenotazione per "{cancelledSessionName}".
            </Text>
            <Pressable
              style={({ pressed }) => [styles.modalPrimaryBtn, pressed && styles.modalBtnPressed]}
              onPress={() => setCancelledSessionName(null)}
            >
              <Text style={styles.modalPrimaryBtnText}>Perfetto</Text>
            </Pressable>
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
    paddingTop: 8,
    gap: 12,
  },
  heroCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: withOpacity(theme.colors.secondary, 0.3),
    backgroundColor: withOpacity(theme.colors.primary, 0.5),
    gap: 4,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: theme.colors.secondary,
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
  },
  heroSubtitle: {
    marginTop: 6,
    fontSize: 14,
    color: withOpacity(theme.colors.text.secondary, 0.92),
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
  },
  headerBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: withOpacity(theme.colors.secondary, 0.35),
    backgroundColor: withOpacity(theme.colors.secondary, 0.12),
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginTop: 8,
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
    paddingHorizontal: 2,
    marginBottom: 24,
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
  centerBox: {
    paddingVertical: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stateCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: withOpacity(theme.colors.secondary, 0.22),
    backgroundColor: withOpacity(theme.colors.primary, 0.45),
    padding: 14,
    gap: 12,
  },
  stateCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  stateText: {
    flex: 1,
    color: theme.colors.text.secondary,
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
  },
  errorText: {
    flex: 1,
    color: theme.colors.error,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
  },
  stateWhatsappBtn: {
    alignSelf: 'stretch',
  },
  bookingCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: withOpacity(theme.colors.secondary, 0.25),
    backgroundColor: withOpacity(theme.colors.primary, 0.45),
    padding: 14,
    gap: 8,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  bookingTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.secondary,
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
  },
  bookingMeta: {
    fontSize: 13,
    color: withOpacity(theme.colors.text.secondary, 0.88),
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
  },
  bookingDescription: {
    marginTop: 6,
  },
  badge: {
    borderRadius: 999,
    backgroundColor: withOpacity(theme.colors.secondary, 0.16),
    borderWidth: 1,
    borderColor: withOpacity(theme.colors.secondary, 0.36),
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    color: theme.colors.secondary,
    fontSize: 11,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
  },
  cancelButton: {
    marginTop: 4,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: withOpacity(theme.colors.error, 0.45),
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: withOpacity(theme.colors.error, 0.08),
  },
  cancelButtonPressed: {
    opacity: 0.88,
  },
  cancelButtonDisabled: {
    opacity: 0.7,
  },
  cancelButtonText: {
    color: theme.colors.error,
    fontSize: 13,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
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
  modalActions: {
    marginTop: 4,
    flexDirection: 'row',
    gap: 10,
  },
  modalSecondaryBtn: {
    flex: 1,
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
  modalDangerBtn: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: withOpacity(theme.colors.error, 0.45),
    backgroundColor: theme.colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 42,
    paddingHorizontal: 12,
  },
  modalDangerBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.background.primary,
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
    textAlign: 'center',
  },
  modalPrimaryBtn: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: withOpacity(theme.colors.secondary, 0.45),
    backgroundColor: theme.colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 42,
    paddingHorizontal: 12,
  },
  modalPrimaryBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.background.primary,
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
  },
  modalBtnPressed: {
    opacity: 0.9,
  },
});

export default SessioniPrenotazioniScreen;
