import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Pressable,
  Modal,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
// @ts-ignore - @expo/vector-icons è parte di Expo SDK
import { Ionicons } from '@expo/vector-icons';
import { theme, withOpacity } from '../../theme';
import {
  fetchVisiteByPaziente,
  fetchVisiteOsteopataGiorno,
  type VisitaAgendaDto,
} from '../../services/visiteService';
import { fetchCurrentUser } from '../../services/authApi';
import {
  addDays,
  formatDayTitle,
  formatOraDisplay,
  formatPrezzoEUR,
  formatWeekdayLongIt,
  toLocalYmd,
} from './visiteFormatting';

function isOsteopathRole(ruoli: string[] | undefined): boolean {
  if (!ruoli?.length) return false;
  return ruoli.some((r) => String(r).toUpperCase().includes('OSTEOPATA'));
}

function patientName(v: VisitaAgendaDto): string {
  const flat = [v.pazienteNome, v.pazienteCognome].filter(Boolean).join(' ').trim();
  if (flat) return flat;
  const p = v.paziente;
  const nested = p ? [p.nome, p.cognome].filter(Boolean).join(' ').trim() : '';
  return nested || 'Paziente';
}

const GestioneVisiteScreen: React.FC = () => {
  const [giornoYmd, setGiornoYmd] = useState(() => toLocalYmd(new Date()));
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [iosPickerDate, setIosPickerDate] = useState(
    () => new Date(`${toLocalYmd(new Date())}T12:00:00`)
  );

  const calendarMin = useMemo(() => {
    const t = new Date();
    t.setFullYear(t.getFullYear() - 3);
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);

  const calendarMax = useMemo(() => {
    const t = new Date();
    t.setFullYear(t.getFullYear() + 2);
    t.setHours(23, 59, 59, 999);
    return t;
  }, []);

  const clampDay = useCallback(
    (d: Date): Date => {
      const x = new Date(d);
      x.setHours(0, 0, 0, 0);
      const minT = calendarMin.getTime();
      const maxT = calendarMax.getTime();
      let t = x.getTime();
      if (t < minT) t = minT;
      if (t > maxT) t = maxT;
      return new Date(t);
    },
    [calendarMin, calendarMax]
  );

  const applyGiorno = useCallback(
    (d: Date) => {
      const c = clampDay(d);
      setGiornoYmd(toLocalYmd(c));
    },
    [clampDay]
  );

  const openDatePicker = useCallback(() => {
    const clamped = clampDay(new Date(`${giornoYmd}T12:00:00`));
    setIosPickerDate(
      new Date(clamped.getFullYear(), clamped.getMonth(), clamped.getDate(), 12, 0, 0, 0)
    );
    setDatePickerOpen(true);
  }, [giornoYmd, clampDay]);

  const shiftGiorno = useCallback(
    (delta: number) => {
      const d = new Date(`${giornoYmd}T12:00:00`);
      applyGiorno(addDays(d, delta));
    },
    [giornoYmd, applyGiorno]
  );

  const profileQuery = useQuery({
    queryKey: ['auth-me-profile'],
    queryFn: fetchCurrentUser,
    staleTime: 60_000,
  });

  const profile = profileQuery.data;
  const pazienteId = profile?.pazienteId ?? null;
  const osteopataId = profile?.osteopataId ?? null;
  const hasOsteopataId = typeof osteopataId === 'number' && osteopataId > 0;
  const osteopathAgenda = hasOsteopataId;
  const osteopathMissingId =
    !profileQuery.isLoading &&
    !profileQuery.error &&
    isOsteopathRole(profile?.ruoli) &&
    !hasOsteopataId;

  const visitePazienteQuery = useQuery({
    queryKey: ['visite-by-paziente', pazienteId, 'DESC'],
    queryFn: () => fetchVisiteByPaziente(pazienteId!, { sortOrder: 'DESC' }),
    enabled: !osteopathAgenda && typeof pazienteId === 'number' && pazienteId > 0,
  });

  const visiteOsteopataQuery = useQuery({
    queryKey: ['visite-osteopata-giorno', osteopataId, giornoYmd],
    queryFn: () =>
      fetchVisiteOsteopataGiorno({
        osteopataId: osteopataId!,
        dataInizio: giornoYmd,
        dataFine: giornoYmd,
      }),
    enabled: osteopathAgenda,
  });

  const refreshing =
    profileQuery.isFetching ||
    (osteopathAgenda ? visiteOsteopataQuery.isFetching : visitePazienteQuery.isFetching);

  const onRefresh = useCallback(() => {
    profileQuery.refetch();
    if (osteopathAgenda) {
      visiteOsteopataQuery.refetch();
    } else {
      visitePazienteQuery.refetch();
    }
  }, [profileQuery, osteopathAgenda, visiteOsteopataQuery, visitePazienteQuery]);

  const profileError = profileQuery.error?.message;
  const visiteError = osteopathAgenda
    ? visiteOsteopataQuery.error?.message
    : visitePazienteQuery.error?.message;
  const visiteOsteoList = visiteOsteopataQuery.data ?? [];
  const visitePazienteList = visitePazienteQuery.data ?? [];

  const showPatientEmptyState =
    !osteopathAgenda &&
    !profileQuery.isLoading &&
    !profileError &&
    (pazienteId == null || pazienteId <= 0) &&
    !osteopathMissingId;

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <View style={styles.lead}>
        <Text style={styles.leadText}>
          {osteopathAgenda
            ? 'Agenda del giorno: visite in ordine di orario. Scegli la data per caricare l’elenco.'
            : 'Prenotate, effettuate, disdette e altri stati — ordine dalla più recente.'}
        </Text>
      </View>
      <View style={styles.headerBadge}>
        <Ionicons name="list-outline" size={14} color={theme.colors.text.primary} />
        <Text style={styles.headerBadgeText}>Gestione visite</Text>
      </View>
      <View style={styles.dividerWrap}>
        <View style={styles.dividerLine} />
        <View style={styles.dividerIconWrap}>
          <Ionicons name="calendar-outline" size={15} color={theme.colors.secondary} />
        </View>
        <View style={styles.dividerLine} />
      </View>

      {osteopathAgenda && (
        <View style={styles.dateToolbar}>
          <Pressable
            onPress={() => shiftGiorno(-1)}
            style={styles.dateNavBtn}
            accessibilityRole="button"
            accessibilityLabel="Giorno precedente"
          >
            <Text style={styles.dateNavBtnText}>−</Text>
          </Pressable>
          <Pressable
            onPress={openDatePicker}
            style={styles.datePickBtn}
            accessibilityRole="button"
            accessibilityLabel="Scegli data"
          >
            <Text style={styles.datePickLabel}>{formatDayTitle(giornoYmd)}</Text>
            <Text style={styles.datePickHint}>Tocca per cambiare giorno</Text>
          </Pressable>
          <Pressable
            onPress={() => shiftGiorno(1)}
            style={styles.dateNavBtn}
            accessibilityRole="button"
            accessibilityLabel="Giorno successivo"
          >
            <Text style={styles.dateNavBtnText}>+</Text>
          </Pressable>
        </View>
      )}

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

        {osteopathMissingId && (
          <Text style={styles.muted}>
            Il tuo profilo ha ruolo osteopata ma manca <Text style={styles.mono}>osteopataId</Text> da GET
            /auth/me. Contatta l’amministratore.
          </Text>
        )}

        {showPatientEmptyState && (
          <Text style={styles.muted}>
            Per elencare le visite serve il campo <Text style={styles.mono}>pazienteId</Text> nel profilo
            (login o GET /auth/me).
          </Text>
        )}

        {osteopathAgenda && visiteOsteopataQuery.isLoading && (
          <View style={styles.centered}>
            <ActivityIndicator color={theme.colors.secondary} />
            <Text style={styles.muted}>Caricamento visite del giorno…</Text>
          </View>
        )}

        {!osteopathAgenda &&
          typeof pazienteId === 'number' &&
          pazienteId > 0 &&
          visitePazienteQuery.isLoading && (
            <View style={styles.centered}>
              <ActivityIndicator color={theme.colors.secondary} />
              <Text style={styles.muted}>Caricamento visite…</Text>
            </View>
          )}

        {visiteError && <Text style={styles.inlineError}>{visiteError}</Text>}

        {osteopathAgenda &&
          !visiteOsteopataQuery.isLoading &&
          !visiteError &&
          visiteOsteoList.length === 0 && (
            <Text style={styles.muted}>Nessuna visita in questo giorno.</Text>
          )}

        {!osteopathAgenda &&
          typeof pazienteId === 'number' &&
          pazienteId > 0 &&
          !visitePazienteQuery.isLoading &&
          !visiteError &&
          visitePazienteList.length === 0 && (
            <Text style={styles.muted}>Nessuna visita in archivio per questo paziente.</Text>
          )}

        {osteopathAgenda
          ? visiteOsteoList.map((v) => {
              const prezzo = formatPrezzoEUR(v.prezzoVisita);
              const oraIn = formatOraDisplay(v.oraInizio);
              const oraOut = formatOraDisplay(v.oraFine);
              const orario =
                oraIn && oraOut && oraOut !== oraIn ? `${oraIn} – ${oraOut}` : oraIn || oraOut || '';
              const studioNome = v.studio?.nome?.trim();
              return (
                <View key={v.id} style={styles.bookingCard}>
                  <View style={styles.bookingTopRow}>
                    <Text style={styles.bookingPatientName} numberOfLines={3}>
                      {patientName(v)}
                    </Text>
                    <Text style={styles.bookingTimeRight} numberOfLines={2}>
                      {orario || '—'}
                    </Text>
                  </View>
                  {studioNome ? (
                    <Text style={styles.bookingMeta}>Studio: {studioNome}</Text>
                  ) : null}
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
            })
          : visitePazienteList.map((v) => {
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

      <Modal visible={datePickerOpen} animationType="fade" transparent>
        <View style={styles.dateModalRoot}>
          <Pressable
            style={styles.dateModalBackdrop}
            onPress={() => setDatePickerOpen(false)}
            accessibilityRole="button"
            accessibilityLabel="Chiudi selezione data"
          >
            <View style={styles.dateModalBackdropDim} pointerEvents="none" />
          </Pressable>
          <View style={styles.dateModalSheetWrap} pointerEvents="box-none">
            <Pressable style={styles.dateModalSheet} onPress={(e) => e.stopPropagation()}>
              <View style={styles.dateModalToolbar}>
                <Pressable onPress={() => setDatePickerOpen(false)} hitSlop={12}>
                  <Text style={styles.dateModalToolbarBtn}>Annulla</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    applyGiorno(iosPickerDate);
                    setDatePickerOpen(false);
                  }}
                  hitSlop={12}
                >
                  <Text style={[styles.dateModalToolbarBtn, styles.dateModalToolbarBtnPrimary]}>OK</Text>
                </Pressable>
              </View>
              <Text style={styles.dateModalWeekday} accessibilityLiveRegion="polite">
                {formatWeekdayLongIt(iosPickerDate)}
              </Text>
              <View style={styles.datePickerSurface}>
                <DateTimePicker
                  value={iosPickerDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  minimumDate={calendarMin}
                  maximumDate={calendarMax}
                  {...(Platform.OS === 'ios'
                    ? {
                        themeVariant: 'dark' as const,
                        textColor: theme.colors.secondary,
                      }
                    : {})}
                  onChange={(_, date) => {
                    if (!date) return;
                    const c = clampDay(date);
                    setIosPickerDate(
                      new Date(c.getFullYear(), c.getMonth(), c.getDate(), 12, 0, 0, 0)
                    );
                  }}
                />
              </View>
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
  lead: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: withOpacity(theme.colors.secondary, 0.15),
  },
  leadText: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    lineHeight: 20,
    opacity: 0.9,
  },
  headerBadge: {
    alignSelf: 'flex-start',
    marginLeft: 20,
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
    paddingHorizontal: 22,
    paddingVertical: 10,
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
  dateToolbar: {
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: withOpacity(theme.colors.secondary, 0.12),
  },
  dateNavBtn: {
    width: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: withOpacity(theme.colors.secondary, 0.35),
    backgroundColor: withOpacity(theme.colors.primary, 0.45),
  },
  dateNavBtnText: {
    fontSize: 22,
    fontWeight: '600',
    color: theme.colors.secondary,
  },
  datePickBtn: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: withOpacity(theme.colors.secondary, 0.25),
    backgroundColor: withOpacity(theme.colors.primary, 0.4),
    justifyContent: 'center',
  },
  datePickLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text.secondary,
    textAlign: 'center',
  },
  datePickHint: {
    marginTop: 4,
    fontSize: 12,
    color: theme.colors.text.secondary,
    opacity: 0.75,
    textAlign: 'center',
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
    fontFamily: theme.fonts.primary,
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
    borderColor: withOpacity(theme.colors.secondary, 0.2),
    backgroundColor: withOpacity(theme.colors.primary, 0.45),
  },
  bookingWhen: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.secondary,
    lineHeight: 22,
  },
  bookingTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  bookingPatientName: {
    flex: 1,
    minWidth: 0,
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.secondary,
    lineHeight: 20,
  },
  bookingTimeRight: {
    flexShrink: 0,
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.secondary,
    lineHeight: 20,
    textAlign: 'right',
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
  dateModalRoot: {
    flex: 1,
  },
  dateModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  dateModalBackdropDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: withOpacity(theme.colors.black, 0.68),
  },
  dateModalSheetWrap: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
  },
  dateModalSheet: {
    backgroundColor: theme.colors.background.primary,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderColor: withOpacity(theme.colors.secondary, 0.22),
  },
  dateModalToolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: withOpacity(theme.colors.secondary, 0.2),
    backgroundColor: theme.colors.background.primary,
  },
  dateModalToolbarBtn: {
    fontSize: 17,
    color: withOpacity(theme.colors.text.secondary, 0.92),
    fontWeight: '500',
  },
  dateModalToolbarBtnPrimary: {
    color: theme.colors.secondary,
    fontWeight: '700',
  },
  dateModalWeekday: {
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.secondary,
    paddingTop: 4,
    paddingBottom: 8,
    letterSpacing: 0.5,
  },
  datePickerSurface: {
    backgroundColor: theme.colors.background.primary,
    paddingBottom: 8,
  },
});

export default GestioneVisiteScreen;
