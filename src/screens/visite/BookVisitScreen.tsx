import React, { useCallback, useMemo, useState } from 'react';
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
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { theme } from '../../theme';
import {
  creaPrenotazioneVisita,
  fetchDisponibilitaVisite,
  fetchOsteopatiPerStudio,
  fetchStudiAttivi,
  type OsteopataDto,
  type SlotDisponibilitaDto,
  type StudioDto,
} from '../../services/studioVisitsService';
import { fetchCurrentUser } from '../../services/authApi';
import { SelectModal } from './SelectModal';
import {
  addDays,
  addMonths,
  expandSlotsToHourly,
  formatDayTitle,
  formatSlotLabel,
  formatWeekdayLongIt,
  groupSlotsByDay,
  osteopataLabel,
  studioLabel,
  toYmd,
} from './visiteFormatting';

function initialVisitYmdTomorrow(): string {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return toYmd(addDays(t, 1));
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

const BookVisitScreen: React.FC = () => {
  const queryClient = useQueryClient();
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
      setDataVisitaYmd(toYmd(clamped));
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

  const studiQuery = useQuery({
    queryKey: ['visite-studi'],
    queryFn: fetchStudiAttivi,
  });

  const osteopatiQuery = useQuery({
    queryKey: ['visite-osteopati', studioId],
    queryFn: () => fetchOsteopatiPerStudio(studioId!),
    enabled: studioId != null,
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
    mutationFn: creaPrenotazioneVisita,
    onSuccess: () => {
      setSlotSelezionato(null);
      queryClient.invalidateQueries({ queryKey: ['visite-by-paziente'] });
      queryClient.invalidateQueries({ queryKey: ['visite-disponibilita'] });
      Alert.alert('Prenotazione registrata', 'Riceverai conferma secondo le procedure dello studio.');
    },
    onError: (e: Error) => {
      Alert.alert('Errore', e.message || 'Impossibile completare la prenotazione');
    },
  });

  const osteopati = osteopatiQuery.data ?? [];
  const studi = studiQuery.data ?? [];
  const osteopataSelezionato = osteopati.find((o) => o.id === osteopataId) ?? null;
  const studioSelezionato = studi.find((s) => s.id === studioId) ?? null;

  const pazienteNomeCompleto = useMemo(() => {
    const p = profileQuery.data;
    if (!p) return '';
    const parts = [p.nome?.trim(), p.cognome?.trim()].filter(Boolean);
    return parts.join(' ');
  }, [profileQuery.data]);

  const slotsEspansi = useMemo(
    () => expandSlotsToHourly(disponibilitaQuery.data ?? []),
    [disponibilitaQuery.data]
  );

  const daySections = useMemo(() => groupSlotsByDay(slotsEspansi), [slotsEspansi]);

  const refreshing =
    profileQuery.isFetching ||
    studiQuery.isFetching ||
    osteopatiQuery.isFetching ||
    disponibilitaQuery.isFetching;

  const onRefresh = useCallback(() => {
    profileQuery.refetch();
    studiQuery.refetch();
    disponibilitaQuery.refetch();
    if (studioId != null) {
      osteopatiQuery.refetch();
    }
  }, [profileQuery, studiQuery, disponibilitaQuery, studioId, osteopatiQuery]);

  const confermaPrenotazione = () => {
    if (!slotSelezionato || osteopataId == null || studioId == null) return;
    Alert.alert(
      'Confermi la prenotazione?',
      `${formatDayTitle(new Date(slotSelezionato.inizio).toISOString().slice(0, 10))}\n${formatSlotLabel(slotSelezionato.inizio, slotSelezionato.fine)}`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Conferma',
          onPress: () =>
            prenotaMutation.mutate({
              osteopataId,
              studioId,
              inizio: slotSelezionato.inizio,
            }),
        },
      ]
    );
  };

  const studiError = studiQuery.error?.message;
  const osteopatiError = osteopatiQuery.error?.message;
  const disponibilitaError = disponibilitaQuery.error?.message;

  const canShowConfirmFooter =
    osteopataId != null &&
    studioId != null &&
    !disponibilitaQuery.isLoading &&
    !disponibilitaError &&
    daySections.length > 0;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.lead}>
        <Text style={styles.leadText}>
          Scegli studio, osteopata e giorno: le disponibilità sono calcolate per quel solo giorno (stessa data
          come inizio e fine intervallo verso il server).
        </Text>
      </View>

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
                    osteopati.length === 0 && (
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
                  <Text style={styles.fieldHint}>
                    Di default è selezionato domani; puoi scegliere una data fino a tre mesi da oggi. La stessa
                    data viene inviata come inizio e fine intervallo all’API delle disponibilità.
                  </Text>

                  {studioId != null && osteopataId != null && (
                    <View style={styles.availabilitySeparator}>
                      <View style={styles.availabilitySeparatorLine} />
                      <Text style={styles.availabilitySeparatorLabel}>Disponibilità</Text>
                      <View style={styles.availabilitySeparatorLine} />
                    </View>
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
            return (
              <Pressable
                style={[styles.slotRow, sel && styles.slotRowSelected]}
                onPress={() => setSlotSelezionato(slot)}
              >
                <View>
                  <Text style={[styles.slotText, sel && styles.slotTextSelected]}>
                    {formatSlotLabel(slot.inizio, slot.fine)}
                  </Text>
                  {slot.stanza?.nome ? (
                    <Text style={styles.slotStanza}>{slot.stanza.nome}</Text>
                  ) : null}
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
                    </Text>
                  </View>
                ) : null}
                <Pressable
                  style={[
                    styles.primaryBtn,
                    (!slotSelezionato || prenotaMutation.isPending) && styles.primaryBtnDisabled,
                  ]}
                  disabled={!slotSelezionato || prenotaMutation.isPending}
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
        options={osteopati}
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
  lead: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(114, 250, 147, 0.15)',
  },
  leadText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.94)',
    lineHeight: 20,
  },
  centered: {
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  muted: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
  },
  errorBox: {
    margin: 16,
    padding: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 104, 105, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 104, 105, 0.35)',
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
    paddingTop: 16,
    paddingBottom: 8,
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
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 16,
  },
  select: {
    borderWidth: 1,
    borderColor: 'rgba(114, 250, 147, 0.35)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: 'rgba(0, 37, 82, 0.55)',
  },
  selectValue: {
    color: 'rgba(255,255,255,0.98)',
    fontSize: 16,
    fontWeight: '500',
  },
  selectPlaceholder: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 16,
  },
  selectPlaceholderDisabled: {
    color: 'rgba(255,255,255,0.28)',
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
    color: 'rgba(255,255,255,0.9)',
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
    backgroundColor: 'rgba(114, 250, 147, 0.4)',
  },
  availabilitySeparatorLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: theme.colors.secondary,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
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
    borderColor: 'rgba(114, 250, 147, 0.2)',
    backgroundColor: 'rgba(0, 37, 82, 0.35)',
  },
  slotRowSelected: {
    borderColor: theme.colors.secondary,
    backgroundColor: 'rgba(114, 250, 147, 0.15)',
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
    fontSize: 14,
    fontWeight: '400',
    color: theme.colors.text.secondary,
    opacity: 0.85,
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
    backgroundColor: 'rgba(114, 250, 147, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(114, 250, 147, 0.35)',
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
    backgroundColor: 'rgba(0, 8, 24, 0.68)',
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
    borderColor: 'rgba(114, 250, 147, 0.22)',
  },
  dateModalToolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(114, 250, 147, 0.2)',
    backgroundColor: theme.colors.background.primary,
  },
  dateModalToolbarBtn: {
    fontSize: 17,
    color: 'rgba(255,255,255,0.92)',
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
