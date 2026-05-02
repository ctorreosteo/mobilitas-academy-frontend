import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  FlatList,
} from 'react-native';
import { useMutation, useQuery } from '@tanstack/react-query';
// @ts-ignore - @expo/vector-icons è parte di Expo SDK
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import {
  createAcquisto,
  type AcquistoDto,
  type MetodoPagamentoAcquisto,
} from '../../services/acquistiService';
import {
  fetchServiziAttivi,
  servizioLabel,
  servizioRestLabel,
  type ServizioDto,
} from '../../services/serviziService';

const METODI: { value: MetodoPagamentoAcquisto; label: string }[] = [
  { value: 'VOLTA_PER_VOLTA', label: 'Volta per volta' },
  { value: 'TUTTO_ANTICIPATO', label: 'Tutto anticipato' },
  { value: 'RATE', label: 'Rate' },
];

type TipoSconto = 'NONE' | 'PERCENTUALE' | 'FISSO';

const TIPI_SCONTO: { value: TipoSconto; label: string }[] = [
  { value: 'NONE', label: 'Nessuno' },
  { value: 'PERCENTUALE', label: 'Percentuale %' },
  { value: 'FISSO', label: 'Importo fisso' },
];

type Props = {
  visible: boolean;
  pazienteId: number;
  /** Nome e cognome (es. da paziente selezionato o profilo). */
  pazienteNomeCompleto?: string | null;
  onClose: () => void;
  onCreated: (acquisto: AcquistoDto) => void;
};

function parseScontoInput(value: string): number | null {
  const normalized = value.replace(',', '.').trim();
  if (!normalized) return null;
  const n = Number(normalized);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

export function CreaAcquistoModal({
  visible,
  pazienteId,
  pazienteNomeCompleto,
  onClose,
  onCreated,
}: Props) {
  const [pickerServizioOpen, setPickerServizioOpen] = useState(false);
  const [servizioSelezionato, setServizioSelezionato] = useState<ServizioDto | null>(null);
  const [metodo, setMetodo] = useState<MetodoPagamentoAcquisto>('VOLTA_PER_VOLTA');
  const [tipoSconto, setTipoSconto] = useState<TipoSconto>('NONE');
  const [scontoInput, setScontoInput] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!visible) return;
    setServizioSelezionato(null);
    setMetodo('VOLTA_PER_VOLTA');
    setTipoSconto('NONE');
    setScontoInput('');
    setNote('');
    setPickerServizioOpen(false);
  }, [visible]);

  const serviziQuery = useQuery({
    queryKey: ['servizi-attivi'],
    queryFn: fetchServiziAttivi,
    enabled: visible && pazienteId > 0,
    staleTime: 60_000,
  });

  const createMutation = useMutation({
    mutationFn: createAcquisto,
    onSuccess: (acquisto) => {
      onCreated(acquisto);
      onClose();
    },
    onError: (e: Error) => {
      Alert.alert('Creazione non riuscita', e.message || 'Riprova più tardi.');
    },
  });

  const servizi = serviziQuery.data ?? [];
  const nomePaziente = (pazienteNomeCompleto ?? '').trim();

  const submit = () => {
    if (!servizioSelezionato) {
      Alert.alert('Servizio mancante', 'Seleziona un servizio dall’elenco attivo.');
      return;
    }
    const sconto = parseScontoInput(scontoInput);
    if (tipoSconto !== 'NONE' && sconto == null) {
      Alert.alert('Sconto non valido', 'Inserisci un valore sconto maggiore di zero.');
      return;
    }
    const noteTrim = note.trim();
    createMutation.mutate({
      pazienteId,
      servizioId: servizioSelezionato.id,
      metodoPagamento: metodo,
      ...(tipoSconto !== 'NONE' ? { tipoSconto, sconto } : {}),
      ...(noteTrim.length > 0 ? { note: noteTrim } : {}),
    });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          {pickerServizioOpen ? (
            <>
              <View style={styles.pickerHeaderRow}>
                <Pressable
                  style={styles.pickerBackBtn}
                  onPress={() => setPickerServizioOpen(false)}
                  hitSlop={12}
                  accessibilityRole="button"
                  accessibilityLabel="Indietro"
                >
                  <Ionicons name="chevron-back" size={28} color={theme.colors.secondary} />
                </Pressable>
                <Text style={styles.pickerTitleInline} accessibilityRole="header">
                  Servizio attivo
                </Text>
              </View>
              <Text style={styles.pickerHint}>
                Servizi con validita alla data del server. Se l'elenco e vuoto, non ci sono pacchetti
                attivi oggi.
              </Text>
              {serviziQuery.isPending ? (
                <View style={styles.pickerLoading}>
                  <ActivityIndicator color={theme.colors.secondary} />
                  <Text style={styles.muted}>Caricamento...</Text>
                </View>
              ) : (
                <FlatList
                  data={servizi}
                  keyExtractor={(item, index) => `srv-${item.id}-${index}`}
                  style={styles.pickerList}
                  contentContainerStyle={styles.pickerListContent}
                  keyboardShouldPersistTaps="handled"
                  removeClippedSubviews={false}
                  ListEmptyComponent={
                    <Text style={styles.pickerEmpty}>
                      {serviziQuery.isError
                        ? (serviziQuery.error as Error)?.message ?? 'Errore di caricamento.'
                        : 'Nessun servizio attivo in questa data (lato server).'}
                    </Text>
                  }
                  renderItem={({ item }) => {
                    const sel = servizioSelezionato?.id === item.id;
                    const rest = servizioRestLabel(item);
                    return (
                      <Pressable
                        style={[styles.pickerRow, sel && styles.pickerRowSelected]}
                        onPress={() => {
                          setServizioSelezionato(item);
                          setPickerServizioOpen(false);
                        }}
                      >
                        <View style={styles.pickerRowContent}>
                          <View style={styles.servizioNomePill}>
                            <Text style={styles.servizioNomePillText}>
                              {item.nome?.trim() || '—'}
                            </Text>
                          </View>
                          {rest.length > 0 ? (
                            <Text
                              style={[styles.pickerRowRest, sel && styles.pickerRowRestSelected]}
                              numberOfLines={4}
                            >
                              {rest}
                            </Text>
                          ) : null}
                        </View>
                      </Pressable>
                    );
                  }}
                />
              )}
            </>
          ) : (
            <>
              <Text style={styles.title}>Nuovo acquisto</Text>
              <Text style={styles.subtitle}>
                {nomePaziente.length > 0
                  ? `${nomePaziente} (ID ${pazienteId}). Verrà creato un acquisto collegato a questo profilo.`
                  : `Paziente #${pazienteId}. Verrà creato un acquisto collegato a questo profilo.`}
              </Text>

              <ScrollView
                style={styles.scroll}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <Text style={styles.fieldLabel}>Servizio</Text>
                {serviziQuery.isPending ? (
                  <View style={styles.inlineLoading}>
                    <ActivityIndicator color={theme.colors.secondary} />
                    <Text style={styles.muted}>Caricamento servizi attivi...</Text>
                  </View>
                ) : null}
                {serviziQuery.isError ? (
                  <Text style={styles.errorText}>{serviziQuery.error?.message}</Text>
                ) : null}
                <Pressable
                  style={[styles.select, serviziQuery.isPending && styles.selectDisabled]}
                  disabled={serviziQuery.isPending}
                  onPress={() => setPickerServizioOpen(true)}
                  accessibilityRole="button"
                  accessibilityLabel="Seleziona servizio"
                >
                  <Text
                    style={servizioSelezionato ? styles.selectValue : styles.selectPlaceholder}
                  >
                    {servizioSelezionato
                      ? servizioLabel(servizioSelezionato)
                      : 'Seleziona servizio...'}
                  </Text>
                </Pressable>

                <Text style={styles.fieldLabel}>Metodo di pagamento</Text>
                <View style={styles.metodoRow}>
                  {METODI.map((m) => {
                    const sel = metodo === m.value;
                    return (
                      <Pressable
                        key={m.value}
                        style={[styles.metodoChip, sel && styles.metodoChipSelected]}
                        onPress={() => setMetodo(m.value)}
                        accessibilityRole="button"
                        accessibilityState={{ selected: sel }}
                      >
                        <Text style={[styles.metodoChipText, sel && styles.metodoChipTextSelected]}>
                          {m.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Text style={styles.fieldLabel}>Sconto</Text>
                <View style={styles.metodoRow}>
                  {TIPI_SCONTO.map((t) => {
                    const sel = tipoSconto === t.value;
                    return (
                      <Pressable
                        key={t.value}
                        style={[styles.metodoChip, sel && styles.metodoChipSelected]}
                        onPress={() => {
                          setTipoSconto(t.value);
                          if (t.value === 'NONE') setScontoInput('');
                        }}
                        accessibilityRole="button"
                        accessibilityState={{ selected: sel }}
                      >
                        <Text style={[styles.metodoChipText, sel && styles.metodoChipTextSelected]}>
                          {t.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                {tipoSconto !== 'NONE' ? (
                  <TextInput
                    style={styles.scontoInput}
                    value={scontoInput}
                    onChangeText={setScontoInput}
                    placeholder={tipoSconto === 'PERCENTUALE' ? 'Es. 10' : 'Es. 20'}
                    placeholderTextColor="rgba(255,255,255,0.38)"
                    keyboardType="decimal-pad"
                  />
                ) : null}

                <Text style={styles.fieldLabel}>Note (opzionale)</Text>
                <TextInput
                  style={styles.noteInput}
                  value={note}
                  onChangeText={setNote}
                  placeholder="Es. promo, accordi con il paziente..."
                  placeholderTextColor="rgba(255,255,255,0.38)"
                  multiline
                  maxLength={500}
                />
              </ScrollView>

              <View style={styles.actions}>
                <Pressable
                  style={styles.secondaryBtn}
                  onPress={onClose}
                  accessibilityRole="button"
                  accessibilityLabel="Annulla creazione acquisto"
                >
                  <Text style={styles.secondaryBtnText}>Annulla</Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.primaryBtn,
                    (!servizioSelezionato || createMutation.isPending) && styles.primaryBtnDisabled,
                  ]}
                  disabled={!servizioSelezionato || createMutation.isPending}
                  onPress={submit}
                  accessibilityRole="button"
                  accessibilityLabel="Crea acquisto"
                >
                  {createMutation.isPending ? (
                    <ActivityIndicator color={theme.colors.primary} />
                  ) : (
                    <Text style={styles.primaryBtnText}>Crea acquisto</Text>
                  )}
                </Pressable>
              </View>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: theme.colors.background.primary,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 16,
    paddingBottom: 24,
    maxHeight: '88%',
    borderWidth: 1,
    borderColor: 'rgba(114, 250, 147, 0.2)',
  },
  pickerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingRight: 20,
    marginBottom: 4,
    gap: 4,
  },
  pickerBackBtn: {
    paddingVertical: 4,
    paddingHorizontal: 4,
    marginRight: 2,
  },
  pickerTitleInline: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.secondary,
  },
  pickerHint: {
    marginTop: 6,
    paddingHorizontal: 20,
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 16,
  },
  pickerLoading: {
    paddingVertical: 32,
    alignItems: 'center',
    gap: 12,
  },
  pickerList: {
    marginTop: 12,
    maxHeight: 440,
  },
  pickerListContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 20,
  },
  pickerEmpty: {
    padding: 24,
    textAlign: 'center',
    color: theme.colors.text.secondary,
    fontSize: 15,
    lineHeight: 22,
  },
  pickerRow: {
    marginBottom: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(114, 250, 147, 0.28)',
    backgroundColor: 'rgba(0, 37, 82, 0.42)',
  },
  pickerRowSelected: {
    borderColor: theme.colors.secondary,
    backgroundColor: 'rgba(114, 250, 147, 0.14)',
  },
  pickerRowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
  },
  servizioNomePill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: theme.colors.secondary,
    borderWidth: 1,
    borderColor: 'rgba(0, 37, 82, 0.35)',
  },
  servizioNomePillText: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.primary,
    letterSpacing: 0.3,
  },
  pickerRowRest: {
    flex: 1,
    minWidth: 140,
    fontSize: 15,
    lineHeight: 21,
    color: theme.colors.text.secondary,
  },
  pickerRowRestSelected: {
    color: 'rgba(255,255,255,0.96)',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.secondary,
    paddingHorizontal: 20,
  },
  subtitle: {
    marginTop: 8,
    paddingHorizontal: 20,
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 18,
  },
  scroll: {
    marginTop: 12,
    paddingHorizontal: 20,
    maxHeight: 420,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.secondary,
    marginBottom: 8,
    marginTop: 14,
  },
  muted: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
  },
  inlineLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: 14,
    marginBottom: 8,
  },
  select: {
    borderWidth: 1,
    borderColor: 'rgba(114, 250, 147, 0.35)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: 'rgba(0, 37, 82, 0.55)',
  },
  selectDisabled: {
    opacity: 0.72,
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
  metodoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metodoChip: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(114, 250, 147, 0.35)',
    backgroundColor: 'rgba(0, 37, 82, 0.45)',
  },
  metodoChipSelected: {
    borderColor: theme.colors.secondary,
    backgroundColor: 'rgba(114, 250, 147, 0.15)',
  },
  metodoChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text.secondary,
  },
  metodoChipTextSelected: {
    color: theme.colors.secondary,
  },
  scontoInput: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: 'rgba(114, 250, 147, 0.35)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: 'rgba(255,255,255,0.98)',
    backgroundColor: 'rgba(0, 37, 82, 0.55)',
  },
  noteInput: {
    minHeight: 80,
    borderWidth: 1,
    borderColor: 'rgba(114, 250, 147, 0.35)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: 'rgba(255,255,255,0.98)',
    backgroundColor: 'rgba(0, 37, 82, 0.55)',
    textAlignVertical: 'top',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    marginTop: 16,
  },
  secondaryBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(114, 250, 147, 0.4)',
    alignItems: 'center',
  },
  secondaryBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.secondary,
  },
  primaryBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: theme.colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnDisabled: {
    opacity: 0.45,
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.primary,
  },
});
