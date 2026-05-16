import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  SectionList,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Platform,
  Modal,
  TextInput,
  ScrollView,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { theme, withOpacity } from '../../theme';
import { useTabBarBottomPadding } from '../../hooks/useTabBarBottomPadding';
import type { VisiteStackParamList } from './types';
import {
  fetchDisponibilitaVisite,
  fetchOsteopatiPerStudio,
  fetchStudiAttivi,
  type OsteopataDto,
  type SlotDisponibilitaDto,
  type StudioDto,
} from '../../services/studioVisitsService';
import { createVisita } from '../../services/visiteService';
import { fetchCurrentUser } from '../../services/authApi';
import type { StoredUserProfile } from '../../services/authTokenStorage';
import {
  fetchOsteopataRiferimentoPaziente,
  PAZIENTI_SEARCH_MIN_QUERY_LEN,
  pazienteLabel,
  searchPazientiAdvanced,
  type PazienteDto,
} from '../../services/pazientiService';
import {
  acquistoLabel,
  fetchAcquistiByPaziente,
  isAcquistoPrenotabile,
  leastRecentPrenotabileAcquistoId,
  type AcquistoDto,
} from '../../services/acquistiService';
import { SelectModal } from './SelectModal';
import { CreaAcquistoModal } from './CreaAcquistoModal';
import {
  addDays,
  addMonths,
  expandSlotsToHourly,
  formatDayTitle,
  formatSlotLabel,
  formatWeekdayLongIt,
  groupSlotsByDay,
  osteopataLabel,
  slotIsoToVisitaFields,
  studioLabel,
  toLocalYmd,
} from './visiteFormatting';
import { getUserFacingApiErrorMessage } from '../../utils/apiErrorMessage';

function initialVisitYmdTomorrow(): string {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return toLocalYmd(addDays(t, 1));
}

type FormSectionRow = { readonly kind: 'form' };
const FORM_SECTION_ROW: FormSectionRow = { kind: 'form' };
type VisitSectionItem = FormSectionRow | SlotDisponibilitaDto;

function isFormSectionRow(item: VisitSectionItem): item is FormSectionRow {
  return typeof item === 'object' && item != null && 'kind' in item && item.kind === 'form';
}

type VisitSection =
  | { title: '__form'; data: FormSectionRow[] }
  | { title: string; data: SlotDisponibilitaDto[] };

/**
 * Se GET /osteopati/studio/{id} non restituisce il profilo collegato a /auth/me,
 * il picker e l’etichetta devono comunque mostrare l’utente loggato.
 */
function selfOsteopataDtoFromProfile(
  profile: StoredUserProfile | undefined,
  osteopataId: number
): OsteopataDto | null {
  if (!profile || osteopataId <= 0) return null;
  const s = profile.osteopata;
  if (s && s.id === osteopataId) {
    return {
      id: s.id,
      nome: s.nome,
      cognome: s.cognome,
      email: s.email ?? undefined,
      telefono: s.telefono ?? undefined,
      immagineProfiloUrl: s.immagineProfiloUrl ?? undefined,
      colore: s.colore ?? undefined,
      isTirocinante: s.isTirocinante,
      genere: s.genere ?? undefined,
      specializzazioni: s.specializzazioni ?? undefined,
    };
  }
  return {
    id: osteopataId,
    nome: profile.nome,
    cognome: profile.cognome,
    email: profile.email || undefined,
  };
}

const BookVisitScreen: React.FC = () => {
  const tabBarPad = useTabBarBottomPadding();
  const queryClient = useQueryClient();
  const navigation = useNavigation<StackNavigationProp<VisiteStackParamList, 'BookVisit'>>();
  const [dataVisitaYmd, setDataVisitaYmd] = useState(initialVisitYmdTomorrow);
  const range = useMemo(
    () => ({ dataInizio: dataVisitaYmd, dataFine: dataVisitaYmd }),
    [dataVisitaYmd]
  );

  const [studioId, setStudioId] = useState<number | null>(null);
  const [osteopataId, setOsteopataId] = useState<number | null>(null);
  const [slotSelezionato, setSlotSelezionato] = useState<SlotDisponibilitaDto | null>(null);
  const [modalOsteopata, setModalOsteopata] = useState(false);
  const [modalStudio, setModalStudio] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [iosPickerDate, setIosPickerDate] = useState(
    () => new Date(`${initialVisitYmdTomorrow()}T12:00:00`)
  );
  const [pazienteSearchInput, setPazienteSearchInput] = useState('');
  const [pazienteSearchDebounced, setPazienteSearchDebounced] = useState('');
  const [selectedPaziente, setSelectedPaziente] = useState<PazienteDto | null>(null);
  const [modalAcquisto, setModalAcquisto] = useState(false);
  const [modalCreaAcquisto, setModalCreaAcquisto] = useState(false);
  const [selectedAcquistoId, setSelectedAcquistoId] = useState<number | null>(null);

  const startOfToday = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);

  const maxSelectableDate = useMemo(() => addMonths(startOfToday, 3), [startOfToday]);

  const clampToSelectableRange = useCallback(
    (d: Date): Date => {
      const x = new Date(d);
      x.setHours(0, 0, 0, 0);
      const minT = startOfToday.getTime();
      const maxT = maxSelectableDate.getTime();
      let t = x.getTime();
      if (t < minT) t = minT;
      if (t > maxT) t = maxT;
      return new Date(t);
    },
    [startOfToday, maxSelectableDate]
  );

  const applyDataVisita = useCallback(
    (d: Date) => {
      const clamped = clampToSelectableRange(d);
      setDataVisitaYmd(toLocalYmd(clamped));
      setSlotSelezionato(null);
    },
    [clampToSelectableRange]
  );

  const openDatePicker = useCallback(() => {
    const clamped = clampToSelectableRange(new Date(`${dataVisitaYmd}T12:00:00`));
    setIosPickerDate(new Date(clamped.getFullYear(), clamped.getMonth(), clamped.getDate(), 12, 0, 0, 0));
    setDatePickerOpen(true);
  }, [dataVisitaYmd, clampToSelectableRange]);

  const profileQuery = useQuery({
    queryKey: ['auth-me-profile'],
    queryFn: fetchCurrentUser,
    staleTime: 60_000,
  });

  const profileOsteopataId = profileQuery.data?.osteopataId ?? null;
  const isOsteopathBooking =
    typeof profileOsteopataId === 'number' && profileOsteopataId > 0;

  useEffect(() => {
    const t = setTimeout(() => setPazienteSearchDebounced(pazienteSearchInput.trim()), 400);
    return () => clearTimeout(t);
  }, [pazienteSearchInput]);

  const studiQuery = useQuery({
    queryKey: ['visite-studi'],
    queryFn: fetchStudiAttivi,
  });

  const osteopatiQuery = useQuery({
    queryKey: ['visite-osteopati', studioId],
    queryFn: () => fetchOsteopatiPerStudio(studioId!),
    enabled: studioId != null,
  });

  useEffect(() => {
    if (!isOsteopathBooking || studioId == null) return;
    if (typeof profileOsteopataId !== 'number' || profileOsteopataId <= 0) return;
    if (osteopataId != null) return;
    setOsteopataId(profileOsteopataId);
    setSlotSelezionato(null);
  }, [isOsteopathBooking, studioId, osteopataId, profileOsteopataId]);

  const pazientiSearchQuery = useQuery({
    queryKey: ['pazienti-advanced-search', pazienteSearchDebounced],
    queryFn: () => searchPazientiAdvanced({ query: pazienteSearchDebounced, size: 50 }),
    enabled:
      isOsteopathBooking &&
      !selectedPaziente &&
      pazienteSearchDebounced.length >= PAZIENTI_SEARCH_MIN_QUERY_LEN,
    staleTime: 15_000,
  });

  const effectivePazienteId = isOsteopathBooking
    ? selectedPaziente?.id
    : profileQuery.data?.pazienteId;

  useEffect(() => {
    setSelectedAcquistoId(null);
  }, [effectivePazienteId]);

  const acquistiQuery = useQuery({
    queryKey: ['acquisti-paziente', effectivePazienteId],
    queryFn: () => fetchAcquistiByPaziente(effectivePazienteId!, { sortDir: 'DESC' }),
    enabled: isOsteopathBooking && typeof effectivePazienteId === 'number' && effectivePazienteId > 0,
  });

  const osteopataRiferimentoQuery = useQuery({
    queryKey: ['paziente-osteopata-riferimento', effectivePazienteId],
    queryFn: () => fetchOsteopataRiferimentoPaziente(effectivePazienteId!),
    enabled: !isOsteopathBooking && typeof effectivePazienteId === 'number' && effectivePazienteId > 0,
    staleTime: 60_000,
  });

  const disponibilitaQuery = useQuery({
    queryKey: [
      'visite-disponibilita',
      osteopataId,
      studioId,
      range.dataInizio,
      range.dataFine,
    ],
    queryFn: () =>
      fetchDisponibilitaVisite({
        osteopataId: osteopataId!,
        studioId: studioId!,
        dataInizio: range.dataInizio,
        dataFine: range.dataFine,
      }),
    enabled: osteopataId != null && studioId != null,
  });

  const prenotaMutation = useMutation({
    mutationFn: (vars: {
      slot: SlotDisponibilitaDto;
      osteopataId: number;
      studioId: number;
      pazienteId: number | null | undefined;
      acquistoId?: number;
    }) => {
      const { dataVisita, oraInizio, oraFine } = slotIsoToVisitaFields(vars.slot.inizio, vars.slot.fine);
      return createVisita({
        dataVisita,
        oraInizio,
        oraFine,
        osteopata: { id: vars.osteopataId },
        studio: { id: vars.studioId },
        ...(vars.slot.stanza?.id != null ? { stanza: { id: vars.slot.stanza.id } } : {}),
        ...(typeof vars.pazienteId === 'number' && vars.pazienteId > 0
          ? { paziente: { id: vars.pazienteId } }
          : {}),
        ...(typeof vars.acquistoId === 'number' && vars.acquistoId > 0
          ? { acquistoId: vars.acquistoId }
          : {}),
      });
    },
    onSuccess: () => {
      setSlotSelezionato(null);
      queryClient.invalidateQueries({ queryKey: ['visite-by-paziente'] });
      queryClient.invalidateQueries({ queryKey: ['visite-osteopata-giorno'] });
      queryClient.invalidateQueries({ queryKey: ['visite-disponibilita'] });
      queryClient.invalidateQueries({ queryKey: ['acquisti-paziente'] });
      navigation.popToTop();
      Alert.alert('Prenotazione registrata', 'Riceverai conferma secondo le procedure dello studio.');
    },
    onError: (e: unknown) => {
      Alert.alert(
        'Errore',
        getUserFacingApiErrorMessage(e, {
          context: 'Impossibile completare la prenotazione',
          fallback: 'Impossibile completare la prenotazione. Riprova più tardi.',
        })
      );
    },
  });

  const osteopatiForSelect = useMemo(() => {
    const raw = osteopatiQuery.data;
    const list: OsteopataDto[] = Array.isArray(raw) ? raw : [];
    if (
      !isOsteopathBooking ||
      typeof profileOsteopataId !== 'number' ||
      profileOsteopataId <= 0
    ) {
      return list;
    }
    if (list.some((o) => o.id === profileOsteopataId)) {
      return list;
    }
    const selfDto = selfOsteopataDtoFromProfile(profileQuery.data, profileOsteopataId);
    return selfDto ? [...list, selfDto] : list;
  }, [isOsteopathBooking, profileOsteopataId, osteopatiQuery.data, profileQuery.data]);

  useEffect(() => {
    if (isOsteopathBooking) return;
    if (studioId != null) return;
    const refOsteopataId = osteopataRiferimentoQuery.data?.id;
    if (typeof refOsteopataId !== 'number' || refOsteopataId <= 0) return;
    if (studi.length === 0) return;

    let cancelled = false;
    (async () => {
      for (const studio of studi) {
        try {
          const osteopatiStudio = await fetchOsteopatiPerStudio(studio.id);
          if (cancelled) return;
          if (osteopatiStudio.some((o) => o.id === refOsteopataId)) {
            setStudioId(studio.id);
            return;
          }
        } catch {
          // studio non interrogabile: continua sui successivi
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOsteopathBooking, studioId, osteopataRiferimentoQuery.data, studi]);

  useEffect(() => {
    if (isOsteopathBooking) return;
    if (studioId == null) return;
    const refOsteopataId = osteopataRiferimentoQuery.data?.id;
    if (typeof refOsteopataId !== 'number' || refOsteopataId <= 0) return;
    if (!osteopatiForSelect.some((o) => o.id === refOsteopataId)) return;
    if (osteopataId === refOsteopataId) return;
    setOsteopataId(refOsteopataId);
    setSlotSelezionato(null);
  }, [
    isOsteopathBooking,
    studioId,
    osteopataRiferimentoQuery.data,
    osteopatiForSelect,
    osteopataId,
  ]);

  const studi = studiQuery.data ?? [];
  const osteopataSelezionato = osteopatiForSelect.find((o) => o.id === osteopataId) ?? null;
  const studioSelezionato = studi.find((s) => s.id === studioId) ?? null;

  const pazienteNomeCompleto = useMemo(() => {
    if (isOsteopathBooking && selectedPaziente) {
      return pazienteLabel(selectedPaziente);
    }
    const p = profileQuery.data;
    if (!p) return '';
    const parts = [p.nome?.trim(), p.cognome?.trim()].filter(Boolean);
    return parts.join(' ');
  }, [isOsteopathBooking, selectedPaziente, profileQuery.data]);

  const acquistiAll = useMemo(() => acquistiQuery.data ?? [], [acquistiQuery.data]);

  const acquistiPrenotabili = useMemo(
    () => acquistiAll.filter((a) => isAcquistoPrenotabile(a)),
    [acquistiAll]
  );

  const needsAcquistoChoice = acquistiPrenotabili.length > 0;
  const acquistoOk =
    !needsAcquistoChoice ||
    (selectedAcquistoId != null &&
      acquistiPrenotabili.some((a) => a.id === selectedAcquistoId));

  const acquistoSelezionato =
    selectedAcquistoId != null
      ? acquistiAll.find((a) => a.id === selectedAcquistoId) ?? null
      : null;

  const showAcquistoField =
    isOsteopathBooking && typeof effectivePazienteId === 'number' && effectivePazienteId > 0;

  const defaultPrenotabileAcquistoId = useMemo(
    () => leastRecentPrenotabileAcquistoId(acquistiAll),
    [acquistiAll]
  );

  useEffect(() => {
    if (selectedAcquistoId == null) return;
    if (!acquistiPrenotabili.some((a) => a.id === selectedAcquistoId)) {
      setSelectedAcquistoId(null);
    }
  }, [acquistiPrenotabili, selectedAcquistoId]);

  useEffect(() => {
    if (defaultPrenotabileAcquistoId == null) return;
    if (selectedAcquistoId != null) return;
    setSelectedAcquistoId(defaultPrenotabileAcquistoId);
  }, [defaultPrenotabileAcquistoId, selectedAcquistoId]);

  const slotsEspansi = useMemo(
    () => expandSlotsToHourly(disponibilitaQuery.data ?? []),
    [disponibilitaQuery.data]
  );

  const daySections = useMemo(() => groupSlotsByDay(slotsEspansi), [slotsEspansi]);

  const refreshing =
    profileQuery.isFetching ||
    studiQuery.isFetching ||
    osteopatiQuery.isFetching ||
    disponibilitaQuery.isFetching ||
    acquistiQuery.isFetching ||
    osteopataRiferimentoQuery.isFetching;

  const onRefresh = useCallback(() => {
    profileQuery.refetch();
    studiQuery.refetch();
    disponibilitaQuery.refetch();
    if (studioId != null) {
      osteopatiQuery.refetch();
    }
    if (isOsteopathBooking && pazienteSearchDebounced.length >= PAZIENTI_SEARCH_MIN_QUERY_LEN) {
      pazientiSearchQuery.refetch();
    }
    if (typeof effectivePazienteId === 'number' && effectivePazienteId > 0) {
      acquistiQuery.refetch();
    }
    if (!isOsteopathBooking && typeof effectivePazienteId === 'number' && effectivePazienteId > 0) {
      osteopataRiferimentoQuery.refetch();
    }
  }, [
    profileQuery,
    studiQuery,
    disponibilitaQuery,
    studioId,
    osteopatiQuery,
    isOsteopathBooking,
    pazienteSearchDebounced,
    pazientiSearchQuery,
    effectivePazienteId,
    acquistiQuery,
    osteopataRiferimentoQuery,
  ]);

  const confermaPrenotazione = () => {
    if (!slotSelezionato || osteopataId == null || studioId == null) return;
    if (isOsteopathBooking && (effectivePazienteId == null || effectivePazienteId <= 0)) {
      Alert.alert('Paziente mancante', 'Seleziona un paziente dall’elenco prima di confermare.');
      return;
    }
    if (showAcquistoField && !acquistoOk) {
      Alert.alert(
        'Acquisto mancante',
        'Seleziona un acquisto di riferimento tra quelli prenotabili per questo paziente.'
      );
      return;
    }
    Alert.alert(
      'Confermi la prenotazione?',
      `${formatDayTitle(new Date(slotSelezionato.inizio).toISOString().slice(0, 10))}\n${formatSlotLabel(slotSelezionato.inizio, slotSelezionato.fine)}`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Conferma',
          onPress: () =>
            prenotaMutation.mutate({
              slot: slotSelezionato,
              osteopataId,
              studioId,
              pazienteId: effectivePazienteId,
              acquistoId:
                showAcquistoField && selectedAcquistoId != null && selectedAcquistoId > 0
                  ? selectedAcquistoId
                  : undefined,
            }),
        },
      ]
    );
  };

  const studiError = studiQuery.error
    ? getUserFacingApiErrorMessage(studiQuery.error, { context: 'Impossibile caricare gli studi' })
    : null;
  const osteopatiError = osteopatiQuery.error
    ? getUserFacingApiErrorMessage(osteopatiQuery.error, {
        context: 'Impossibile caricare gli osteopati',
      })
    : null;
  const disponibilitaError = disponibilitaQuery.error
    ? getUserFacingApiErrorMessage(disponibilitaQuery.error, {
        context: 'Impossibile caricare le disponibilità',
      })
    : null;

  const canShowConfirmFooter =
    osteopataId != null &&
    studioId != null &&
    !disponibilitaQuery.isLoading &&
    !disponibilitaError &&
    daySections.length > 0;

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      {studiQuery.isLoading && (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.colors.secondary} />
          <Text style={styles.muted}>Caricamento studi…</Text>
        </View>
      )}

      {studiError && !studiQuery.isLoading && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{studiError}</Text>
          <Text style={styles.errorHint}>
            Gli studi sono esposti su GET /api/studi (richiede JWT). Verifica sessione e URL del backend.
          </Text>
        </View>
      )}

      {!studiQuery.isLoading && !studiError && (
        <SectionList<VisitSectionItem, VisitSection>
          sections={[{ title: '__form', data: [FORM_SECTION_ROW] }, ...daySections]}
          keyboardShouldPersistTaps="handled"
          keyExtractor={(item, index) =>
            isFormSectionRow(item) ? '__form' : `${item.inizio}-${index}`
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.secondary} />
          }
          contentContainerStyle={{ paddingBottom: 28 + tabBarPad }}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => {
            if (section.title === '__form') return null;
            return (
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionHeaderText}>{section.title}</Text>
              </View>
            );
          }}
          renderItem={({ item, section }) => {
            if (section.title === '__form' && isFormSectionRow(item)) {
              return (
                <View style={styles.formBlock}>
                  {isOsteopathBooking ? (
                    <View style={styles.pazienteBlock}>
                      <Text style={styles.fieldLabel}>Paziente</Text>
                      {selectedPaziente ? (
                        <View style={styles.pazienteSelectedCard}>
                          <View style={styles.pazienteSelectedMain}>
                            <Text style={styles.pazienteSelectedName}>
                              {pazienteLabel(selectedPaziente)}
                            </Text>
                            {selectedPaziente.email ? (
                              <Text style={styles.pazienteSelectedMeta}>{selectedPaziente.email}</Text>
                            ) : null}
                            {selectedPaziente.cellulare ? (
                              <Text style={styles.pazienteSelectedMeta}>
                                {[selectedPaziente.prefissoCellulare, selectedPaziente.cellulare]
                                  .filter(Boolean)
                                  .join(' ')}
                              </Text>
                            ) : null}
                          </View>
                          <Pressable
                            onPress={() => {
                              setSelectedPaziente(null);
                              setPazienteSearchInput('');
                            }}
                            hitSlop={8}
                            accessibilityRole="button"
                            accessibilityLabel="Cambia paziente"
                          >
                            <Text style={styles.pazienteChangeBtn}>Cambia</Text>
                          </Pressable>
                        </View>
                      ) : null}
                      {!selectedPaziente ? (
                        <>
                          <TextInput
                            style={styles.pazienteSearchInput}
                            value={pazienteSearchInput}
                            onChangeText={setPazienteSearchInput}
                            placeholder="Nome, cognome o entrambi…"
                            placeholderTextColor={withOpacity(theme.colors.text.secondary, 0.38)}
                            autoCapitalize="words"
                            autoCorrect={false}
                            accessibilityLabel="Cerca paziente per nome o cognome"
                          />
                          <Text style={styles.fieldHint}>
                            Almeno {PAZIENTI_SEARCH_MIN_QUERY_LEN} caratteri; ricerca in pausa mentre scrivi
                            (circa 400 ms).
                          </Text>
                          {pazientiSearchQuery.isFetching && (
                            <View style={styles.inlineLoading}>
                              <ActivityIndicator color={theme.colors.secondary} />
                              <Text style={styles.muted}>Ricerca in corso…</Text>
                            </View>
                          )}
                          {pazientiSearchQuery.error && (
                            <Text style={styles.inlineError}>
                              {getUserFacingApiErrorMessage(pazientiSearchQuery.error, {
                                context: 'Impossibile cercare i pazienti',
                              })}
                            </Text>
                          )}
                          {!pazientiSearchQuery.isFetching &&
                            pazienteSearchDebounced.length >= PAZIENTI_SEARCH_MIN_QUERY_LEN &&
                            (pazientiSearchQuery.data?.content?.length ?? 0) === 0 &&
                            !pazientiSearchQuery.error && (
                              <Text style={styles.emptySlots}>Nessun paziente trovato.</Text>
                            )}
                          {(pazientiSearchQuery.data?.content?.length ?? 0) > 0 ? (
                            <ScrollView
                              style={styles.pazienteResultsScroll}
                              nestedScrollEnabled
                              keyboardShouldPersistTaps="handled"
                            >
                              {(pazientiSearchQuery.data?.content ?? []).map((pz) => (
                                <Pressable
                                  key={pz.id}
                                  style={styles.pazienteResultRow}
                                  onPress={() => {
                                    setSelectedPaziente(pz);
                                    setPazienteSearchInput('');
                                  }}
                                >
                                  <Text style={styles.pazienteResultName}>{pazienteLabel(pz)}</Text>
                                  {pz.email ? (
                                    <Text style={styles.pazienteResultMeta}>{pz.email}</Text>
                                  ) : null}
                                  {pz.eta ? (
                                    <Text style={styles.pazienteResultMeta}>{pz.eta}</Text>
                                  ) : null}
                                </Pressable>
                              ))}
                            </ScrollView>
                          ) : null}
                        </>
                      ) : null}
                    </View>
                  ) : null}

                  {showAcquistoField ? (
                    <View style={styles.acquistoBlock}>
                      <View style={styles.acquistoFieldHeader}>
                        <Text style={styles.acquistoFieldLabel}>Acquisto di riferimento</Text>
                        {typeof effectivePazienteId === 'number' && effectivePazienteId > 0 ? (
                          <Pressable
                            style={styles.acquistoAddBtn}
                            onPress={() => setModalCreaAcquisto(true)}
                            accessibilityRole="button"
                            accessibilityLabel="Nuovo acquisto"
                            hitSlop={10}
                          >
                            <Text style={styles.acquistoAddBtnText}>+</Text>
                          </Pressable>
                        ) : null}
                      </View>
                      {acquistiQuery.isPending ? (
                        <View style={styles.inlineLoading}>
                          <ActivityIndicator color={theme.colors.secondary} />
                          <Text style={styles.muted}>Caricamento acquisti del paziente…</Text>
                        </View>
                      ) : null}
                      {acquistiQuery.isError ? (
                        <Text style={styles.inlineError}>
                          {getUserFacingApiErrorMessage(acquistiQuery.error, {
                            context: 'Impossibile caricare gli acquisti',
                            fallback: 'Impossibile caricare gli acquisti. Riprova più tardi.',
                          })}
                        </Text>
                      ) : null}
                      <Pressable
                        style={[styles.select, acquistiQuery.isPending && styles.selectDisabled]}
                        disabled={acquistiQuery.isPending}
                        onPress={() => setModalAcquisto(true)}
                        accessibilityRole="button"
                        accessibilityLabel="Apri elenco acquisti di riferimento"
                      >
                        <Text
                          style={
                            acquistoSelezionato ? styles.selectValue : styles.selectPlaceholder
                          }
                        >
                          {acquistoSelezionato
                            ? acquistoLabel(acquistoSelezionato)
                            : acquistiQuery.isPending
                              ? 'Caricamento…'
                              : 'Seleziona acquisto…'}
                        </Text>
                      </Pressable>
                    </View>
                  ) : null}

                  <Text style={styles.fieldLabel}>Studio</Text>
                  <Pressable style={styles.select} onPress={() => setModalStudio(true)}>
                    <Text style={studioSelezionato ? styles.selectValue : styles.selectPlaceholder}>
                      {studioSelezionato ? studioLabel(studioSelezionato) : 'Seleziona studio…'}
                    </Text>
                  </Pressable>

                  <Text style={styles.fieldLabel}>Osteopata</Text>
                  <Pressable
                    style={[styles.select, !studioId && styles.selectDisabled]}
                    disabled={!studioId}
                    onPress={() => studioId != null && setModalOsteopata(true)}
                  >
                    <Text
                      style={
                        osteopataSelezionato
                          ? styles.selectValue
                          : !studioId
                            ? styles.selectPlaceholderDisabled
                            : styles.selectPlaceholder
                      }
                    >
                      {!studioId
                        ? 'Prima scegli uno studio…'
                        : osteopataSelezionato
                          ? osteopataLabel(osteopataSelezionato)
                          : 'Seleziona osteopata…'}
                    </Text>
                  </Pressable>

                  {studioId != null && osteopatiQuery.isLoading && (
                    <View style={styles.inlineLoading}>
                      <ActivityIndicator color={theme.colors.secondary} />
                      <Text style={styles.muted}>Caricamento osteopati per questo studio…</Text>
                    </View>
                  )}

                  {studioId != null && osteopatiError && (
                    <Text style={styles.inlineError}>{osteopatiError}</Text>
                  )}

                  {studioId != null &&
                    !osteopatiQuery.isLoading &&
                    !osteopatiError &&
                    osteopatiForSelect.length === 0 && (
                      <Text style={styles.emptySlots}>
                        Nessun osteopata associato a questo studio (disponibilità o visite future). Prova un
                        altro polo.
                      </Text>
                    )}

                  <Text style={styles.fieldLabel}>Giorno della visita</Text>
                  <Pressable
                    style={styles.select}
                    onPress={openDatePicker}
                    accessibilityRole="button"
                    accessibilityLabel="Scegli la data della visita"
                  >
                    <Text style={styles.selectValue}>{formatDayTitle(dataVisitaYmd)}</Text>
                  </Pressable>
                  <Text style={styles.fieldHint}>Puoi scegliere una data fino a tre mesi da oggi.</Text>

                  {studioId != null && osteopataId != null && (
                    <View style={styles.availabilitySeparator}>
                      <View style={styles.availabilitySeparatorLine} />
                      <Text style={styles.availabilitySeparatorLabel}>Disponibilità</Text>
                      <View style={styles.availabilitySeparatorLine} />
                    </View>
                  )}
                  {studioId != null && osteopataId != null && (
                    <Text style={styles.availabilitySubtitle}>
                      Ecco le disponibilità per il giorno selezionato 👇🏼
                    </Text>
                  )}

                  {osteopataId != null && studioId != null && disponibilitaQuery.isLoading && (
                    <View style={styles.inlineLoading}>
                      <ActivityIndicator color={theme.colors.secondary} />
                      <Text style={styles.muted}>Caricamento disponibilità…</Text>
                    </View>
                  )}

                  {osteopataId != null && studioId != null && disponibilitaError && (
                    <Text style={styles.inlineError}>{disponibilitaError}</Text>
                  )}

                  {osteopataId != null &&
                    studioId != null &&
                    !disponibilitaQuery.isLoading &&
                    daySections.length === 0 && (
                      <Text style={styles.emptySlots}>
                        Nessuno slot disponibile in questa data per questa combinazione studio / osteopata.
                      </Text>
                    )}
                </View>
              );
            }

            const slot = item as SlotDisponibilitaDto;
            const sel =
              slotSelezionato?.inizio === slot.inizio && slotSelezionato?.fine === slot.fine;
            const slotMetaLabel =
              osteopataSelezionato && studioSelezionato
                ? `${osteopataLabel(osteopataSelezionato)} - ${studioSelezionato.nome}`
                : null;
            return (
              <Pressable
                style={[styles.slotRow, sel && styles.slotRowSelected]}
                onPress={() => setSlotSelezionato(slot)}
              >
                <View style={styles.slotRowContent}>
                  <View style={styles.slotMainInfo}>
                    <Text style={[styles.slotText, sel && styles.slotTextSelected]}>
                      {formatSlotLabel(slot.inizio, slot.fine)}
                    </Text>
                    {slotMetaLabel ? <Text style={styles.slotStanza}>{slotMetaLabel}</Text> : null}
                  </View>
                  <View style={[styles.slotPrenotaBtn, sel && styles.slotPrenotaBtnSelected]}>
                    <Text style={[styles.slotPrenotaBtnText, sel && styles.slotPrenotaBtnTextSelected]}>
                      Prenota
                    </Text>
                  </View>
                </View>
              </Pressable>
            );
          }}
          ListFooterComponent={
            canShowConfirmFooter ? (
              <View style={styles.confirmFooter}>
                {slotSelezionato ? (
                  <View style={styles.selectedBanner}>
                    <Text style={styles.selectedBannerLabel}>Slot selezionato</Text>
                    <Text style={styles.selectedBannerValue}>
                      {formatDayTitle(new Date(slotSelezionato.inizio).toISOString().slice(0, 10))}
                      {'\n'}
                      {formatSlotLabel(slotSelezionato.inizio, slotSelezionato.fine)}
                      {pazienteNomeCompleto ? `\n${pazienteNomeCompleto}` : ''}
                      {acquistoSelezionato ? `\n${acquistoLabel(acquistoSelezionato)}` : ''}
                    </Text>
                  </View>
                ) : null}
                {isOsteopathBooking && !selectedPaziente ? (
                  <Text style={styles.footerHint}>Seleziona un paziente in alto per abilitare la conferma.</Text>
                ) : null}
                {showAcquistoField && acquistiQuery.isPending ? (
                  <Text style={styles.footerHint}>In attesa del caricamento degli acquisti…</Text>
                ) : null}
                {showAcquistoField && needsAcquistoChoice && !acquistoOk && !acquistiQuery.isPending ? (
                  <Text style={styles.footerHint}>Seleziona un acquisto di riferimento per il paziente.</Text>
                ) : null}
                <Pressable
                  style={[
                    styles.primaryBtn,
                    (!slotSelezionato ||
                      prenotaMutation.isPending ||
                      (isOsteopathBooking && !selectedPaziente) ||
                      (showAcquistoField && acquistiQuery.isPending) ||
                      (showAcquistoField && needsAcquistoChoice && !acquistoOk)) &&
                      styles.primaryBtnDisabled,
                  ]}
                  disabled={
                    !slotSelezionato ||
                    prenotaMutation.isPending ||
                    (isOsteopathBooking && !selectedPaziente) ||
                    (showAcquistoField && acquistiQuery.isPending) ||
                    (showAcquistoField && needsAcquistoChoice && !acquistoOk)
                  }
                  onPress={confermaPrenotazione}
                >
                  {prenotaMutation.isPending ? (
                    <ActivityIndicator color={theme.colors.primary} />
                  ) : (
                    <Text style={styles.primaryBtnText}>Conferma prenotazione</Text>
                  )}
                </Pressable>
              </View>
            ) : (
              <View style={styles.listFooterSpacer} />
            )
          }
        />
      )}

      <SelectModal<OsteopataDto>
        visible={modalOsteopata}
        title="Osteopata di riferimento"
        options={osteopatiForSelect}
        selectedId={osteopataId}
        onClose={() => setModalOsteopata(false)}
        getLabel={osteopataLabel}
        listEmptyText="Nessun osteopata per questo studio."
        onSelect={(o) => {
          setOsteopataId(o.id);
          setSlotSelezionato(null);
        }}
      />
      <SelectModal<StudioDto>
        visible={modalStudio}
        title="Studio"
        options={studi}
        selectedId={studioId}
        onClose={() => setModalStudio(false)}
        getLabel={studioLabel}
        onSelect={(s) => {
          setStudioId(s.id);
          setOsteopataId(null);
          setSlotSelezionato(null);
        }}
      />
      <SelectModal<AcquistoDto>
        visible={modalAcquisto}
        title="Acquisto di riferimento"
        options={acquistiAll}
        selectedId={selectedAcquistoId}
        onClose={() => setModalAcquisto(false)}
        getLabel={acquistoLabel}
        listEmptyText="Nessun acquisto trovato per questo paziente."
        isItemDisabled={(a) => !isAcquistoPrenotabile(a)}
        disabledItemHint="Non prenotabile"
        onSelect={(a) => {
          setSelectedAcquistoId(a.id);
          setSlotSelezionato(null);
        }}
      />
      {typeof effectivePazienteId === 'number' && effectivePazienteId > 0 ? (
        <CreaAcquistoModal
          visible={modalCreaAcquisto}
          pazienteId={effectivePazienteId}
          pazienteNomeCompleto={pazienteNomeCompleto}
          onClose={() => setModalCreaAcquisto(false)}
          onCreated={(a) => {
            queryClient.invalidateQueries({ queryKey: ['acquisti-paziente', effectivePazienteId] });
            setSelectedAcquistoId(a.id);
          }}
        />
      ) : null}

      <Modal visible={datePickerOpen} animationType="fade" transparent>
        <View style={styles.dateModalRoot}>
          <Pressable
            style={styles.dateModalBackdrop}
            onPress={() => setDatePickerOpen(false)}
            accessibilityRole="button"
            accessibilityLabel="Chiudi selezione data"
          >
            {/* Nessun BlurView: evita crash in Expo Go / build senza native expo-blur */}
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
                    applyDataVisita(iosPickerDate);
                    setDatePickerOpen(false);
                  }}
                  hitSlop={12}
                >
                  <Text style={[styles.dateModalToolbarBtn, styles.dateModalToolbarBtnPrimary]}>
                    OK
                  </Text>
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
                  minimumDate={startOfToday}
                  maximumDate={maxSelectableDate}
                  {...(Platform.OS === 'ios'
                    ? {
                        themeVariant: 'dark' as const,
                        textColor: theme.colors.secondary,
                      }
                    : {})}
                  onChange={(_, date) => {
                    if (!date) return;
                    const c = clampToSelectableRange(date);
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
  centered: {
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  muted: {
    color: withOpacity(theme.colors.text.secondary, 0.9),
    fontSize: 14,
  },
  errorBox: {
    margin: 16,
    padding: 14,
    borderRadius: 12,
    backgroundColor: withOpacity(theme.colors.error, 0.12),
    borderWidth: 1,
    borderColor: withOpacity(theme.colors.error, 0.35),
  },
  errorText: {
    color: theme.colors.error,
    fontSize: 15,
    fontWeight: '600',
  },
  errorHint: {
    marginTop: 8,
    color: theme.colors.text.secondary,
    fontSize: 13,
    lineHeight: 18,
  },
  formBlock: {
    paddingHorizontal: 20,
    paddingTop: 0,
    paddingBottom: 8,
  },
  acquistoBlock: {
    marginBottom: 4,
  },
  acquistoFieldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 12,
    marginBottom: 8,
  },
  acquistoFieldLabel: {
    flex: 1,
    minWidth: 0,
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.secondary,
  },
  acquistoAddBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: withOpacity(theme.colors.secondary, 0.45),
    backgroundColor: withOpacity(theme.colors.secondary, 0.12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  acquistoAddBtnText: {
    fontSize: 22,
    fontWeight: '600',
    color: theme.colors.secondary,
    lineHeight: 24,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.secondary,
    marginBottom: 8,
    marginTop: 12,
  },
  fieldHint: {
    marginTop: 6,
    fontSize: 12,
    color: withOpacity(theme.colors.text.secondary, 0.85),
    lineHeight: 16,
  },
  select: {
    borderWidth: 1,
    borderColor: withOpacity(theme.colors.secondary, 0.35),
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: withOpacity(theme.colors.primary, 0.55),
  },
  selectValue: {
    color: withOpacity(theme.colors.text.secondary, 0.98),
    fontSize: 16,
    fontWeight: '500',
  },
  selectPlaceholder: {
    color: withOpacity(theme.colors.text.secondary, 0.45),
    fontSize: 16,
  },
  selectPlaceholderDisabled: {
    color: withOpacity(theme.colors.text.secondary, 0.28),
    fontSize: 16,
  },
  selectDisabled: {
    opacity: 0.72,
  },
  inlineLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 16,
  },
  inlineError: {
    marginTop: 12,
    color: theme.colors.error,
    fontSize: 14,
    lineHeight: 20,
  },
  emptySlots: {
    marginTop: 16,
    color: withOpacity(theme.colors.text.secondary, 0.9),
    fontSize: 14,
    lineHeight: 20,
  },
  availabilitySeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 24,
    marginHorizontal: -20,
    paddingHorizontal: 20,
    gap: 14,
  },
  availabilitySeparatorLine: {
    flex: 1,
    height: 2,
    borderRadius: 1,
    backgroundColor: withOpacity(theme.colors.secondary, 0.4),
  },
  availabilitySeparatorLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: theme.colors.secondary,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  availabilitySubtitle: {
    marginTop: -14,
    marginBottom: 20,
    fontSize: 14,
    color: withOpacity(theme.colors.text.secondary, 0.92),
    lineHeight: 20,
  },
  sectionHeader: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: theme.colors.background.primary,
  },
  sectionHeaderText: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.secondary,
  },
  slotRow: {
    marginHorizontal: 20,
    marginBottom: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: withOpacity(theme.colors.secondary, 0.2),
    backgroundColor: withOpacity(theme.colors.primary, 0.35),
  },
  slotRowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  slotMainInfo: {
    flex: 1,
    minWidth: 0,
  },
  slotRowSelected: {
    borderColor: theme.colors.secondary,
    backgroundColor: withOpacity(theme.colors.secondary, 0.15),
  },
  slotText: {
    color: theme.colors.text.secondary,
    fontSize: 16,
    fontWeight: '500',
  },
  slotTextSelected: {
    color: theme.colors.secondary,
  },
  slotStanza: {
    fontSize: 12,
    fontWeight: '400',
    color: theme.colors.text.secondary,
    opacity: 0.85,
    fontStyle: 'italic',
  },
  slotPrenotaBtn: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: withOpacity(theme.colors.secondary, 0.35),
    backgroundColor: withOpacity(theme.colors.secondary, 0.1),
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  slotPrenotaBtnSelected: {
    borderColor: theme.colors.secondary,
    backgroundColor: withOpacity(theme.colors.secondary, 0.2),
  },
  slotPrenotaBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  slotPrenotaBtnTextSelected: {
    color: theme.colors.secondary,
  },
  confirmFooter: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 28,
  },
  listFooterSpacer: {
    height: 24,
  },
  selectedBanner: {
    marginTop: 0,
    marginBottom: 0,
    padding: 14,
    borderRadius: 12,
    backgroundColor: withOpacity(theme.colors.secondary, 0.12),
    borderWidth: 1,
    borderColor: withOpacity(theme.colors.secondary, 0.35),
  },
  selectedBannerLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  selectedBannerValue: {
    marginTop: 6,
    fontSize: 16,
    color: theme.colors.text.secondary,
    lineHeight: 22,
  },
  footerHint: {
    marginTop: 12,
    fontSize: 13,
    color: theme.colors.text.secondary,
    opacity: 0.9,
    lineHeight: 18,
  },
  pazienteBlock: {
    marginBottom: 8,
  },
  pazienteSelectedCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: withOpacity(theme.colors.secondary, 0.35),
    backgroundColor: withOpacity(theme.colors.secondary, 0.08),
    marginBottom: 12,
  },
  pazienteSelectedMain: {
    flex: 1,
    minWidth: 0,
  },
  pazienteSelectedName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.secondary,
  },
  pazienteSelectedMeta: {
    marginTop: 4,
    fontSize: 13,
    color: theme.colors.text.secondary,
    opacity: 0.9,
  },
  pazienteChangeBtn: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.secondary,
  },
  pazienteSearchInput: {
    borderWidth: 1,
    borderColor: withOpacity(theme.colors.secondary, 0.35),
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    color: withOpacity(theme.colors.text.secondary, 0.98),
    backgroundColor: withOpacity(theme.colors.primary, 0.55),
  },
  pazienteResultsScroll: {
    maxHeight: 220,
    marginTop: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: withOpacity(theme.colors.secondary, 0.22),
    backgroundColor: withOpacity(theme.colors.primary, 0.35),
  },
  pazienteResultRow: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: withOpacity(theme.colors.secondary, 0.15),
  },
  pazienteResultName: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text.secondary,
  },
  pazienteResultMeta: {
    marginTop: 4,
    fontSize: 13,
    color: theme.colors.text.secondary,
    opacity: 0.8,
  },
  primaryBtn: {
    marginTop: 16,
    backgroundColor: theme.colors.secondary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryBtnDisabled: {
    opacity: 0.45,
  },
  primaryBtnText: {
    color: theme.colors.primary,
    fontSize: 16,
    fontWeight: '700',
  },
  dateModalRoot: {
    flex: 1,
  },
  dateModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  /** Simula “sfuocato” con velo scuro (blur nativo richiede dev client con expo-blur linkato). */
  dateModalBackdropDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: withOpacity(theme.colors.primary, 0.68),
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

export default BookVisitScreen;
