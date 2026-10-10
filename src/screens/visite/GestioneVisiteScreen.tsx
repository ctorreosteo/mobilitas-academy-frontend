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
  Alert,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
// @ts-ignore - @expo/vector-icons è parte di Expo SDK
import { Ionicons } from '@expo/vector-icons';
import { theme, withOpacity } from '../../theme';
import {
  disdiciVisita,
  fetchCalendarioCompletoGiorno,
  fetchVisiteByPaziente,
  type VisitaMinimaleDto,
  type CalendarioEventoItem,
  type CalendarioItemDto,
  type CalendarioNonReperibilitaItem,
  type CalendarioVisitaItem,
} from '../../services/visiteService';
import { fetchCurrentUser } from '../../services/authApi';
import {
  addDays,
  formatDayTitle,
  formatOraDisplay,
  formatPrezzoEUR,
  formatTimelineFascia,
  formatWeekdayLongIt,
  tipoEventoLabel,
  toLocalYmd,
  visitaStatusLabel,
} from './visiteFormatting';
import { openStudioWhatsApp } from '../../utils/openStudioWhatsApp';
import { useTabBarBottomPadding } from '../../hooks/useTabBarBottomPadding';
import { getUserFacingApiErrorMessage } from '../../utils/apiErrorMessage';
import type { VisiteStackParamList } from './types';
import { AppDialog } from '../../components/AppDialog';
import { AddToCalendarModal } from './AddToCalendarModal';
import { buildCalendarEventFromVisita } from '../../services/calendarEventService';

const DISDETTA_PREAVVISO_MS = 24 * 60 * 60 * 1000;

/**
 * Millisecondi tra `from` e `to` escludendo le domeniche (studio chiuso).
 * Es.: da sabato 18:00 a lunedì 18:00 sono 24 ore utili, non 48.
 */
function msEscludendoDomeniche(from: Date, to: Date): number {
  let total = 0;
  let cursor = new Date(from);
  while (cursor < to) {
    const nextMidnight = new Date(cursor);
    nextMidnight.setHours(24, 0, 0, 0);
    const segmentEnd = nextMidnight < to ? nextMidnight : to;
    if (cursor.getDay() !== 0) total += segmentEnd.getTime() - cursor.getTime();
    cursor = segmentEnd;
  }
  return total;
}

/** Inizio visita nel fuso del dispositivo (dataVisita YYYY-MM-DD + oraInizio HH:mm[:ss]). */
function visitaStart(v: VisitaMinimaleDto): Date {
  return new Date(`${v.dataVisita}T${v.oraInizio?.trim() || '00:00:00'}`);
}

/** Es. "Via Lamarmora 35, Torino"; senza indirizzo ripiega sul nome dello studio. */
function visitaStudioIndirizzo(v: VisitaMinimaleDto): string {
  const indirizzo = [v.studioIndirizzo, v.studioCitta].filter((x) => x?.trim()).join(', ');
  return indirizzo || v.studioNome?.trim() || '';
}

/** Visita prenotata e non ancora iniziata: si può disdire o aggiungere al calendario. */
function isVisitaPrenotataFutura(v: VisitaMinimaleDto): boolean {
  return v.statusVisita?.toUpperCase() === 'PRENOTATA' && visitaStart(v).getTime() > Date.now();
}

function isOsteopathRole(ruoli: string[] | undefined): boolean {
  if (!ruoli?.length) return false;
  return ruoli.some((r) => String(r).toUpperCase().includes('OSTEOPATA'));
}

function joinNomeCognome(
  nome?: string | null,
  cognome?: string | null,
  nested?: { nome?: string | null; cognome?: string | null } | null
): string {
  const flat = [nome, cognome].filter(Boolean).join(' ').trim();
  if (flat) return flat;
  return nested ? [nested.nome, nested.cognome].filter(Boolean).join(' ').trim() : '';
}

function itemStudioNome(item: CalendarioItemDto): string {
  return item.studioNome?.trim() || item.studio?.nome?.trim() || '';
}

function itemStanzaNome(item: CalendarioItemDto): string {
  return item.stanzaNome?.trim() || item.stanza?.nome?.trim() || '';
}

function AgendaLuogoRows({ item }: { item: CalendarioItemDto }) {
  const studio = itemStudioNome(item);
  const stanza = itemStanzaNome(item);
  return (
    <>
      {studio ? <Text style={styles.bookingMeta}>Studio: {studio}</Text> : null}
      {stanza ? <Text style={styles.bookingMeta}>Stanza: {stanza}</Text> : null}
    </>
  );
}

function patientName(v: CalendarioVisitaItem): string {
  return joinNomeCognome(v.pazienteNome, v.pazienteCognome, v.paziente) || 'Paziente';
}

function calendarioItemKey(item: CalendarioItemDto): string {
  return `${item.tipo}-${item.id}`;
}

function eventoTitolo(item: CalendarioEventoItem): string {
  const titolo = item.titolo?.trim();
  if (titolo) return titolo;
  return tipoEventoLabel(item.tipoEvento);
}

/** Stati che contano come visita: prenotata, effettuata o no-show addebitato. */
const STATI_VISITA_CONTEGGIATI = new Set(['PRENOTATA', 'EFFETTUATA', 'NO_SHOW_CONTA']);

/**
 * Numero progressivo per ogni visita (lista in ordine cronologico crescente).
 * Le visite che non contano (es. disdette) ripetono il numero della precedente.
 */
function numeriProgressiviVisite(visite: VisitaMinimaleDto[]): number[] {
  let n = 0;
  return visite.map((v) => {
    if (STATI_VISITA_CONTEGGIATI.has(v.statusVisita?.toUpperCase() ?? '')) n += 1;
    return n;
  });
}

/** Disdetta: `DISDETTA` o `NO_SHOW_NON_CONTA` (mostrata come "DISDETTA", vedi visitaStatusLabel). */
function isVisitaDisdetta(v: VisitaMinimaleDto): boolean {
  const s = v.statusVisita?.toUpperCase();
  return s === 'DISDETTA' || s === 'NO_SHOW_NON_CONTA';
}

function DisdettaBadge() {
  return (
    <View
      style={[styles.visitNumberBadge, styles.disdettaBadge]}
      accessibilityRole="text"
      accessibilityLabel="Visita disdetta"
    >
      <Ionicons name="close" size={18} color={theme.colors.error} />
    </View>
  );
}

function VisitNumberBadge({ number }: { number: number }) {
  return (
    <View
      style={styles.visitNumberBadge}
      accessibilityRole="text"
      accessibilityLabel={`Visita numero ${number}`}
    >
      <Text style={styles.visitNumberBadgeText}>{number}</Text>
    </View>
  );
}

function VisitaAgendaCard({ item }: { item: CalendarioVisitaItem }) {
  const orario = formatTimelineFascia(item);
  return (
    <View style={styles.bookingCard}>
      <View style={styles.bookingTopRow}>
        <Text style={styles.bookingPatientName} numberOfLines={3}>
          {patientName(item)}
        </Text>
        <Text style={styles.bookingTimeRight} numberOfLines={2}>
          {orario || '—'}
        </Text>
      </View>
      <AgendaLuogoRows item={item} />
    </View>
  );
}

function EventoAgendaCard({ item }: { item: CalendarioEventoItem }) {
  const orario = formatTimelineFascia(item);
  const tipoLabel = tipoEventoLabel(item.tipoEvento);
  const titolo = eventoTitolo(item);
  const showTipo = Boolean(item.tipoEvento) && titolo !== tipoLabel;
  const descrizione = item.descrizione?.trim();
  return (
    <View style={[styles.bookingCard, styles.bookingCardEvento]}>
      <View style={styles.bookingKindRow}>
        <Ionicons name="calendar-outline" size={14} color={theme.colors.accent} />
        <Text style={styles.bookingKindEvento}>{showTipo ? tipoLabel : 'Evento'}</Text>
      </View>
      <View style={styles.bookingTopRow}>
        <Text style={styles.bookingEventoTitle} numberOfLines={3}>
          {titolo}
        </Text>
        <Text style={styles.bookingTimeRight} numberOfLines={2}>
          {orario || '—'}
        </Text>
      </View>
      {descrizione ? (
        <Text style={styles.bookingDescrizione} numberOfLines={3}>
          {descrizione}
        </Text>
      ) : null}
      <AgendaLuogoRows item={item} />
    </View>
  );
}

function AssenzaAgendaCard({ item }: { item: CalendarioNonReperibilitaItem }) {
  const orario = formatTimelineFascia(item);
  const motivo = item.motivo?.trim();
  return (
    <View style={[styles.bookingCard, styles.bookingCardAssenza]}>
      <View style={styles.bookingKindRow}>
        <Ionicons name="remove-circle-outline" size={14} color={theme.colors.error} />
        <Text style={styles.bookingKindAssenza}>Non disponibile</Text>
      </View>
      <View style={styles.bookingTopRow}>
        <Text style={styles.bookingAssenzaTitle} numberOfLines={3}>
          {motivo || 'Assenza'}
        </Text>
        <Text style={styles.bookingTimeRight} numberOfLines={2}>
          {orario || '—'}
        </Text>
      </View>
    </View>
  );
}

const GestioneVisiteScreen: React.FC = () => {
  const tabBarPad = useTabBarBottomPadding();
  const [giornoYmd, setGiornoYmd] = useState(() => toLocalYmd(new Date()));
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [openingWhatsApp, setOpeningWhatsApp] = useState(false);
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

  const navigation = useNavigation<StackNavigationProp<VisiteStackParamList, 'GestioneVisite'>>();
  const queryClient = useQueryClient();

  /**
   * Un solo pop-up che cambia contenuto (conferma → esito): iOS non apre un Modal
   * mentre un altro si sta chiudendo.
   */
  const [disdettaDialog, setDisdettaDialog] = useState<
    | { kind: 'confirm'; visita: VisitaMinimaleDto; quando: string }
    | { kind: 'tooLate'; quando: string }
    | { kind: 'done'; quando: string; osteopataId?: number; studioId?: number }
    | null
  >(null);

  /** Visita da aggiungere al calendario dell’utente (pop-up già usato dopo la prenotazione). */
  const [calendarVisita, setCalendarVisita] = useState<VisitaMinimaleDto | null>(null);

  const disdettaMutation = useMutation({
    mutationFn: (v: VisitaMinimaleDto) => disdiciVisita(v.id, 'Disdetta dal paziente tramite app'),
    onSuccess: (disdetta) => {
      queryClient.invalidateQueries({ queryKey: ['visite-by-paziente'] });
      queryClient.invalidateQueries({ queryKey: ['visite-disponibilita'] });
      setDisdettaDialog((d) => ({
        kind: 'done',
        quando: d?.quando ?? '',
        osteopataId: disdetta.osteopata?.id ?? undefined,
        studioId: disdetta.studio?.id ?? undefined,
      }));
    },
    onError: (e: unknown) => {
      setDisdettaDialog(null);
      Alert.alert(
        'Errore',
        getUserFacingApiErrorMessage(e, {
          context: 'Impossibile disdire la visita',
          fallback: 'Impossibile disdire la visita. Riprova più tardi.',
        })
      );
    },
  });

  const onDisdiciVisita = useCallback((v: VisitaMinimaleDto) => {
    const ora = formatOraDisplay(v.oraInizio);
    const quando = `${formatDayTitle(v.dataVisita)}${ora ? ` alle ${ora}` : ''}`;
    if (msEscludendoDomeniche(new Date(), visitaStart(v)) < DISDETTA_PREAVVISO_MS) {
      setDisdettaDialog({ kind: 'tooLate', quando });
      return;
    }
    setDisdettaDialog({ kind: 'confirm', visita: v, quando });
  }, []);

  const closeDisdettaDialog = useCallback(() => {
    if (!disdettaMutation.isPending) setDisdettaDialog(null);
  }, [disdettaMutation.isPending]);

  /** Contenuto del pop-up di disdetta per lo step corrente (stesso Modal per tutti gli step). */
  const disdettaDialogContent = (() => {
    const d = disdettaDialog;
    if (d?.kind === 'confirm') {
      return {
        icon: 'calendar-clear-outline',
        iconColor: theme.colors.error,
        title: 'Vuoi disdire la visita?',
        message: `La visita di ${d.quando} verrà disdetta.`,
        primaryLabel: 'Sì, disdici',
        primaryTone: 'danger' as const,
        loading: disdettaMutation.isPending,
        onPrimary: () => disdettaMutation.mutate(d.visita),
        secondaryLabel: 'No, mantieni la visita',
      };
    }
    if (d?.kind === 'tooLate') {
      return {
        icon: 'time-outline',
        iconColor: theme.colors.error,
        title: 'Mancano meno di 24 ore',
        message:
          'Le visite si possono disdire o spostare dall’app fino a 24 ore prima (la domenica non viene conteggiata). Oltre questo limite la visita viene contabilizzata e considerata come effettuata. Per qualsiasi necessità scrivi allo studio.',
        primaryLabel: 'Scrivi allo studio',
        tone: 'danger' as const,
        primaryTone: 'danger' as const,
        onPrimary: () => {
          setDisdettaDialog(null);
          openStudioWhatsApp({ message: `Buongiorno, avrei bisogno di disdire la visita di ${d.quando}.` });
        },
        secondaryLabel: 'Chiudi',
      };
    }
    return {
      icon: 'checkmark-circle-outline',
      title: 'Visita disdetta',
      message: `La visita di ${d?.quando ?? ''} è stata disdetta.\nVuoi prenotarne una nuova?`,
      primaryLabel: 'Riprenota visita',
      onPrimary: () => {
        setDisdettaDialog(null);
        navigation.navigate('BookVisit', {
          osteopataId: d?.kind === 'done' ? d.osteopataId : undefined,
          studioId: d?.kind === 'done' ? d.studioId : undefined,
        });
      },
      secondaryLabel: 'Chiudi',
    };
  })();

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
    queryKey: ['visite-by-paziente', pazienteId, 'ASC'],
    queryFn: () => fetchVisiteByPaziente(pazienteId!, { sortOrder: 'ASC' }),
    enabled: !osteopathAgenda && typeof pazienteId === 'number' && pazienteId > 0,
  });

  const calendarioOsteopataQuery = useQuery({
    queryKey: ['calendario-completo', osteopataId, giornoYmd],
    queryFn: () =>
      fetchCalendarioCompletoGiorno({
        osteopataId: osteopataId!,
        dataInizio: giornoYmd,
        dataFine: giornoYmd,
      }),
    enabled: osteopathAgenda,
  });

  const refreshing =
    profileQuery.isFetching ||
    (osteopathAgenda ? calendarioOsteopataQuery.isFetching : visitePazienteQuery.isFetching);

  const onRefresh = useCallback(() => {
    profileQuery.refetch();
    if (osteopathAgenda) {
      calendarioOsteopataQuery.refetch();
    } else {
      visitePazienteQuery.refetch();
    }
  }, [profileQuery, osteopathAgenda, calendarioOsteopataQuery, visitePazienteQuery]);

  const profileError = profileQuery.error
    ? getUserFacingApiErrorMessage(profileQuery.error, {
        context: 'Impossibile caricare il profilo',
      })
    : null;
  const visiteError = osteopathAgenda
    ? calendarioOsteopataQuery.error
      ? getUserFacingApiErrorMessage(calendarioOsteopataQuery.error, {
          context: 'Impossibile caricare l’agenda del giorno',
        })
      : null
    : visitePazienteQuery.error
      ? getUserFacingApiErrorMessage(visitePazienteQuery.error, {
          context: 'Impossibile caricare le visite',
        })
      : null;
  const calendarioOsteoList = calendarioOsteopataQuery.data ?? [];
  const visitePazienteList = visitePazienteQuery.data ?? [];
  const numeriVisite = useMemo(() => numeriProgressiviVisite(visitePazienteList), [visitePazienteList]);

  const showPatientEmptyState =
    !osteopathAgenda &&
    !profileQuery.isLoading &&
    !profileError &&
    (pazienteId == null || pazienteId <= 0) &&
    !osteopathMissingId;

  const handleOpenWhatsAppSupport = useCallback(async () => {
    const text =
      "Buongiorno Team di Mobilitas! Sono un utente dell'applicazione e vorrei poter visualizzare le visite. Attendo un vostro riscontro, grazie!";
    setOpeningWhatsApp(true);
    try {
      const ok = await openStudioWhatsApp({ message: text });
      if (!ok) {
        console.warn('[VISITE] apertura WhatsApp non riuscita');
      }
    } finally {
      setOpeningWhatsApp(false);
    }
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <View style={styles.lead}>
        <Text style={styles.leadText}>
          {osteopathAgenda
            ? 'Agenda del giorno: visite, eventi e assenze in ordine di orario. Scegli la data per caricare l’elenco.'
            : 'Prenotate, effettuate, disdette e altri stati — ordine dalla più vecchia.'}
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
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 32 + tabBarPad }]}
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
          <View style={styles.supportCard}>
            <Text style={styles.muted}>
              Per visualizzare le visite in app dobbiamo collegare il tuo profilo paziente.
              Contatta la nostra segreteria e ti aiutiamo subito.
            </Text>
            <Pressable
              style={({ pressed }) => [
                styles.whatsappBtn,
                pressed && styles.whatsappBtnPressed,
                openingWhatsApp && styles.whatsappBtnDisabled,
              ]}
              onPress={handleOpenWhatsAppSupport}
              disabled={openingWhatsApp}
            >
              <Ionicons name="logo-whatsapp" size={16} color={theme.colors.background.primary} />
              <Text style={styles.whatsappBtnText}>
                {openingWhatsApp ? 'Apertura WhatsApp...' : 'Contatta la segreteria su WhatsApp'}
              </Text>
            </Pressable>
          </View>
        )}

        {osteopathAgenda && calendarioOsteopataQuery.isLoading && (
          <View style={styles.centered}>
            <ActivityIndicator color={theme.colors.secondary} />
            <Text style={styles.muted}>Caricamento agenda del giorno…</Text>
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
          !calendarioOsteopataQuery.isLoading &&
          !visiteError &&
          calendarioOsteoList.length === 0 && (
            <Text style={styles.muted}>Nessun impegno in questo giorno.</Text>
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
          ? calendarioOsteoList.map((item) => {
              if (item.tipo === 'EVENTO') {
                return <EventoAgendaCard key={calendarioItemKey(item)} item={item} />;
              }
              if (item.tipo === 'NON_REPERIBILITA') {
                return <AssenzaAgendaCard key={calendarioItemKey(item)} item={item} />;
              }
              if (item.tipo === 'VISITA') {
                return <VisitaAgendaCard key={calendarioItemKey(item)} item={item} />;
              }
              return null;
            })
          : visitePazienteList.map((v, index) => {
              const numero = numeriVisite[index];
              const prezzo = formatPrezzoEUR(v.prezzoVisita);
              const ora = formatOraDisplay(v.oraInizio);
              const studioIndirizzo = visitaStudioIndirizzo(v);
              return (
                <View key={v.id} style={styles.bookingCard}>
                  <View style={styles.bookingTopRow}>
                    <Text style={[styles.bookingWhen, styles.bookingTopMain]}>
                      {formatDayTitle(v.dataVisita)}
                      {ora ? `\n${ora}` : ''}
                    </Text>
                    {/* 0: visite non conteggiate prima della prima visita valida. */}
                    {isVisitaDisdetta(v) ? (
                      <DisdettaBadge />
                    ) : numero > 0 ? (
                      <VisitNumberBadge number={numero} />
                    ) : null}
                  </View>
                  <Text style={styles.bookingMeta}>
                    {[v.osteopataNome, v.osteopataCognome].filter(Boolean).join(' ') ||
                      'Osteopata non assegnato'}
                  </Text>
                  {v.statusVisita ? (
                    <Text style={styles.bookingStato}>Stato visita: {visitaStatusLabel(v.statusVisita)}</Text>
                  ) : null}
                  {v.statusPagamento ? (
                    <Text style={styles.bookingStato}>Pagamento: {v.statusPagamento}</Text>
                  ) : null}
                  {prezzo ? <Text style={styles.bookingStato}>Importo: {prezzo}</Text> : null}
                  {studioIndirizzo ? (
                    <View style={styles.bookingAddressRow}>
                      <Ionicons
                        name="location-outline"
                        size={13}
                        color={withOpacity(theme.colors.text.secondary, 0.55)}
                      />
                      <Text style={styles.bookingAddress}>{studioIndirizzo}</Text>
                    </View>
                  ) : null}
                  {isVisitaPrenotataFutura(v) ? (
                    <Pressable
                      style={({ pressed }) => [styles.calendarBtn, pressed && styles.disdiciBtnPressed]}
                      onPress={() => setCalendarVisita(v)}
                      accessibilityRole="button"
                    >
                      <Ionicons name="calendar-outline" size={18} color={theme.colors.secondary} />
                      <Text style={styles.calendarBtnText}>Aggiungi al calendario</Text>
                    </Pressable>
                  ) : null}
                  {isVisitaPrenotataFutura(v) ? (
                    <Pressable
                      style={({ pressed }) => [styles.disdiciBtn, pressed && styles.disdiciBtnPressed]}
                      onPress={() => onDisdiciVisita(v)}
                      disabled={disdettaMutation.isPending}
                      accessibilityRole="button"
                    >
                      {disdettaMutation.isPending && disdettaMutation.variables?.id === v.id ? (
                        <ActivityIndicator size="small" color={theme.colors.error} />
                      ) : (
                        <>
                          <Ionicons name="close-circle-outline" size={18} color={theme.colors.error} />
                          <Text style={styles.disdiciBtnText}>Disdici visita</Text>
                        </>
                      )}
                    </Pressable>
                  ) : null}
                </View>
              );
            })}
      </ScrollView>

      <AddToCalendarModal
        visible={calendarVisita != null}
        variant="existing"
        event={calendarVisita ? buildCalendarEventFromVisita(calendarVisita) : null}
        summary={
          calendarVisita
            ? [formatDayTitle(calendarVisita.dataVisita), formatOraDisplay(calendarVisita.oraInizio)]
                .filter(Boolean)
                .join(', ')
            : undefined
        }
        studioIndirizzo={calendarVisita ? visitaStudioIndirizzo(calendarVisita) : undefined}
        onClose={() => setCalendarVisita(null)}
      />

      <AppDialog
        visible={disdettaDialog != null}
        onClose={closeDisdettaDialog}
        {...disdettaDialogContent}
      />

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
  supportCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: withOpacity(theme.colors.secondary, 0.2),
    backgroundColor: withOpacity(theme.colors.primary, 0.4),
    padding: 14,
    gap: 12,
  },
  whatsappBtn: {
    minHeight: 42,
    borderRadius: 10,
    backgroundColor: '#25D366',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 12,
  },
  whatsappBtnPressed: {
    opacity: 0.9,
  },
  whatsappBtnDisabled: {
    opacity: 0.65,
  },
  whatsappBtnText: {
    color: theme.colors.background.primary,
    fontSize: 14,
    fontWeight: '700',
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
  bookingCardEvento: {
    borderColor: withOpacity(theme.colors.accent, 0.35),
    backgroundColor: withOpacity(theme.colors.accent, 0.08),
  },
  bookingCardAssenza: {
    borderColor: withOpacity(theme.colors.error, 0.28),
    backgroundColor: withOpacity(theme.colors.error, 0.08),
  },
  bookingKindRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  bookingKindEvento: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
    color: theme.colors.accent,
    textTransform: 'uppercase',
  },
  bookingKindAssenza: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
    color: theme.colors.error,
    textTransform: 'uppercase',
  },
  bookingEventoTitle: {
    flex: 1,
    minWidth: 0,
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.secondary,
    lineHeight: 20,
  },
  bookingAssenzaTitle: {
    flex: 1,
    minWidth: 0,
    fontSize: 14,
    fontWeight: '600',
    color: withOpacity(theme.colors.text.secondary, 0.92),
    lineHeight: 20,
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
  bookingTopMain: {
    flex: 1,
    minWidth: 0,
  },
  visitNumberBadge: {
    minWidth: 32,
    height: 32,
    paddingHorizontal: 8,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: theme.colors.secondary,
    backgroundColor: withOpacity(theme.colors.secondary, 0.14),
  },
  disdettaBadge: {
    // Cerchio perfetto: senza padding orizzontale l’icona non allarga il badge.
    width: 32,
    paddingHorizontal: 0,
    borderColor: theme.colors.error,
    backgroundColor: withOpacity(theme.colors.error, 0.14),
  },
  visitNumberBadgeText: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.colors.secondary,
    letterSpacing: 0.2,
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
  bookingDescrizione: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 19,
    color: theme.colors.text.secondary,
    opacity: 0.88,
  },
  bookingStato: {
    marginTop: 6,
    fontSize: 13,
    color: theme.colors.text.secondary,
    opacity: 0.85,
  },
  bookingAddressRow: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  bookingAddress: {
    flex: 1,
    fontSize: 12,
    color: withOpacity(theme.colors.text.secondary, 0.55),
  },
  calendarBtn: {
    marginTop: 20,
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: withOpacity(theme.colors.secondary, 0.5),
    backgroundColor: withOpacity(theme.colors.secondary, 0.1),
  },
  calendarBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.secondary,
  },
  disdiciBtn: {
    marginTop: 8,
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: withOpacity(theme.colors.error, 0.6),
    backgroundColor: withOpacity(theme.colors.error, 0.1),
  },
  disdiciBtnPressed: {
    opacity: 0.85,
  },
  disdiciBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.error,
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
