import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  ScrollView,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
// @ts-ignore - @expo/vector-icons è parte di Expo SDK
import { Ionicons } from '@expo/vector-icons';
import { theme, withOpacity } from '../../theme';
import {
  addVisitToDeviceCalendar,
  getWritableDeviceCalendars,
  isDeviceCalendarAvailable,
  openGoogleCalendarTemplate,
  shareVisitIcs,
  type DeviceCalendarOption,
  type VisitCalendarEvent,
} from '../../services/calendarEventService';

type Props = {
  visible: boolean;
  event: VisitCalendarEvent | null;
  /** Riepilogo leggibile della visita (giorno e orario). */
  summary?: string;
  /** Indirizzo dello studio, mostrato con l’icona come nei riquadri delle visite. */
  studioIndirizzo?: string;
  /** `booked`: subito dopo la prenotazione; `existing`: da una visita già in elenco. */
  variant?: 'booked' | 'existing';
  onClose: () => void;
};

type Step = 'choose' | 'calendars';

/** Giallo tenue per "Altro calendario", per distinguerlo dalle altre opzioni. */
const OTHER_CALENDAR_TINT = '#F5C451';

export function AddToCalendarModal({
  visible,
  event,
  summary,
  studioIndirizzo,
  variant = 'booked',
  onClose,
}: Props) {
  const booked = variant === 'booked';
  const [step, setStep] = useState<Step>('choose');
  const [calendars, setCalendars] = useState<DeviceCalendarOption[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (visible) {
      setStep('choose');
      setBusy(false);
    }
  }, [visible]);

  const byAccount = useMemo(() => {
    const groups = new Map<string, DeviceCalendarOption[]>();
    for (const c of calendars) {
      groups.set(c.account, [...(groups.get(c.account) ?? []), c]);
    }
    return [...groups.entries()];
  }, [calendars]);

  const run = async (action: () => Promise<void>, errorContext: string) => {
    setBusy(true);
    try {
      await action();
      onClose();
    } catch (e) {
      const detail = e instanceof Error && e.message ? `\n${e.message}` : '';
      Alert.alert('Calendario', `${errorContext}${detail}`);
    } finally {
      setBusy(false);
    }
  };

  const openDeviceCalendars = async () => {
    setBusy(true);
    try {
      const list = await getWritableDeviceCalendars();
      if (list === null) {
        Alert.alert(
          'Accesso al calendario negato',
          'Per aggiungere la visita consenti a Mobilitas Academy l’accesso al calendario nelle impostazioni.',
          [
            { text: 'Annulla', style: 'cancel' },
            { text: 'Apri impostazioni', onPress: () => Linking.openSettings() },
          ]
        );
        return;
      }
      setCalendars(list);
      setStep('calendars');
    } catch {
      Alert.alert('Calendario', 'Impossibile leggere i calendari del telefono.');
    } finally {
      setBusy(false);
    }
  };

  if (!event) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={busy ? undefined : onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          {step === 'choose' ? (
            <>
              <View style={styles.headerRow}>
                <Ionicons
                  name={booked ? 'checkmark-circle' : 'calendar'}
                  size={22}
                  color={theme.colors.secondary}
                />
                <Text style={styles.title}>
                  {booked ? 'Prenotazione registrata' : 'Aggiungi al calendario'}
                </Text>
              </View>
              {summary ? <Text style={styles.summary}>{summary}</Text> : null}
              {studioIndirizzo ? (
                <View style={styles.addressRow}>
                  <Ionicons
                    name="location-outline"
                    size={13}
                    color={withOpacity(theme.colors.text.secondary, 0.55)}
                  />
                  <Text style={styles.address}>{studioIndirizzo}</Text>
                </View>
              ) : null}
              <Text style={styles.question}>
                {booked ? 'Vuoi aggiungere la visita al tuo calendario?' : 'Scegli dove salvarla:'}
              </Text>

              {isDeviceCalendarAvailable() ? (
                <OptionRow
                  icon="phone-portrait-outline"
                  title="Calendario del telefono"
                  hint="Apple, Google, Outlook… scegli l’account e-mail su cui salvarla."
                  disabled={busy}
                  onPress={openDeviceCalendars}
                />
              ) : null}
              <OptionRow
                icon="logo-google"
                title="Google Calendar"
                hint="Apre Google Calendar con la visita già compilata."
                disabled={busy}
                onPress={() =>
                  run(() => openGoogleCalendarTemplate(event), 'Impossibile aprire Google Calendar.')
                }
              />
              <OptionRow
                icon="share-outline"
                title="Altro calendario"
                hint="Condividi la visita come file .ics (Outlook e altre app)."
                tint={OTHER_CALENDAR_TINT}
                disabled={busy}
                onPress={() => run(() => shareVisitIcs(event), 'Impossibile condividere la visita.')}
              />
            </>
          ) : (
            <>
              <View style={styles.headerRow}>
                <Pressable onPress={() => setStep('choose')} hitSlop={10} disabled={busy}>
                  <Ionicons name="chevron-back" size={22} color={theme.colors.secondary} />
                </Pressable>
                <Text style={styles.title}>Scegli il calendario</Text>
              </View>
              <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
                {byAccount.length === 0 ? (
                  <Text style={styles.empty}>
                    Nessun calendario modificabile trovato sul telefono. Usa Google Calendar o
                    “Altro calendario”.
                  </Text>
                ) : (
                  byAccount.map(([account, items]) => (
                    <View key={account} style={styles.accountBlock}>
                      <Text style={styles.accountLabel}>{account}</Text>
                      {items.map((c) => (
                        <Pressable
                          key={c.id}
                          disabled={busy}
                          style={({ pressed }) => [styles.calendarRow, pressed && styles.pressed]}
                          onPress={() =>
                            run(
                              () => addVisitToDeviceCalendar(c.id, event),
                              'Impossibile aggiungere la visita al calendario.'
                            )
                          }
                        >
                          <View style={[styles.dot, { backgroundColor: c.color }]} />
                          <Text style={styles.calendarTitle}>{c.title}</Text>
                        </Pressable>
                      ))}
                    </View>
                  ))
                )}
              </ScrollView>
            </>
          )}

          {busy ? <ActivityIndicator style={styles.spinner} color={theme.colors.secondary} /> : null}

          <Pressable style={styles.closeBtn} onPress={onClose} disabled={busy}>
            <Text style={styles.closeBtnText}>{booked ? 'No, grazie' : 'Chiudi'}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function OptionRow({
  icon,
  title,
  hint,
  tint,
  disabled,
  onPress,
}: {
  icon: string;
  title: string;
  hint: string;
  /** Colore alternativo per icona, titolo e bordo (default: verde dell’app). */
  tint?: string;
  disabled: boolean;
  onPress: () => void;
}) {
  const color = tint ?? theme.colors.secondary;
  return (
    <Pressable
      disabled={disabled}
      style={({ pressed }) => [
        styles.option,
        tint && { borderColor: withOpacity(tint, 0.55), backgroundColor: withOpacity(tint, 0.12) },
        pressed && styles.pressed,
      ]}
      onPress={onPress}
    >
      <Ionicons name={icon} size={22} color={color} />
      <View style={styles.optionText}>
        <Text style={[styles.optionTitle, { color }]}>{title}</Text>
        <Text style={styles.optionHint}>{hint}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={withOpacity(color, 0.7)} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: withOpacity(theme.colors.black, 0.55),
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: theme.colors.background.primary,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 18,
    paddingHorizontal: 20,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: withOpacity(theme.colors.secondary, 0.2),
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.secondary,
  },
  addressRow: {
    marginTop: -6,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  address: {
    flex: 1,
    fontSize: 12,
    color: withOpacity(theme.colors.text.secondary, 0.55),
  },
  summary: {
    fontSize: 14,
    lineHeight: 20,
    color: withOpacity(theme.colors.text.secondary, 0.9),
    marginBottom: 12,
  },
  question: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text.secondary,
    marginBottom: 12,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: withOpacity(theme.colors.secondary, 0.28),
    backgroundColor: withOpacity(theme.colors.primary, 0.42),
  },
  pressed: {
    opacity: 0.85,
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.secondary,
  },
  optionHint: {
    marginTop: 2,
    fontSize: 13,
    lineHeight: 18,
    color: withOpacity(theme.colors.text.secondary, 0.85),
  },
  list: {
    flexGrow: 0,
    maxHeight: 380,
  },
  listContent: {
    paddingBottom: 8,
  },
  empty: {
    paddingVertical: 20,
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 22,
    color: theme.colors.text.secondary,
  },
  accountBlock: {
    marginBottom: 12,
  },
  accountLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: withOpacity(theme.colors.text.secondary, 0.75),
    marginBottom: 6,
  },
  calendarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: withOpacity(theme.colors.secondary, 0.28),
    backgroundColor: withOpacity(theme.colors.primary, 0.42),
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  calendarTitle: {
    flex: 1,
    fontSize: 15,
    color: theme.colors.text.secondary,
  },
  spinner: {
    marginTop: 8,
  },
  closeBtn: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  closeBtnText: {
    color: theme.colors.error,
    fontSize: 16,
    fontWeight: '600',
  },
});
