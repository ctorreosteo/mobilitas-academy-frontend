import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { useAuth } from '../../context/AuthContext';
import {
  creaPrenotazioneSessioneFitness,
  fetchCalendarioSessioniFitness,
  fetchPartecipazioniSessioniFitness,
  type CalendarioSessioneFitnessDto,
} from '../../services/fitnessService';

function toHour(time: string): string {
  return time.slice(0, 5);
}

function toIsoDate(value: Date): string {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, '0');
  const day = `${value.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseIsoDate(isoDate: string): Date {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

function startOfMonth(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), 1);
}

const FitnessSessionsCalendarScreen: React.FC = () => {
  const { userProfile } = useAuth();
  const todayIso = useMemo(() => toIsoDate(new Date()), []);
  const [selectedDate, setSelectedDate] = useState(todayIso);
  const [visibleMonth, setVisibleMonth] = useState(startOfMonth(new Date()));
  const [calendarRows, setCalendarRows] = useState<CalendarioSessioneFitnessDto[]>([]);
  const [mySessionIds, setMySessionIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [bookingSessionId, setBookingSessionId] = useState<number | null>(null);
  const [confirmSession, setConfirmSession] = useState<CalendarioSessioneFitnessDto | null>(null);
  const [bookedSessionName, setBookedSessionName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const utenteId = userProfile?.utenteId ?? null;

  const loadCalendar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [calendar, bookings] = await Promise.all([
        fetchCalendarioSessioniFitness({ data: selectedDate }),
        fetchPartecipazioniSessioniFitness(),
      ]);
      setCalendarRows(calendar);
      if (utenteId) {
        const mine = bookings.filter((item) => item.utenteId === utenteId).map((item) => item.sessioneId);
        setMySessionIds(new Set(mine));
      } else {
        setMySessionIds(new Set());
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Impossibile caricare il calendario fitness');
    } finally {
      setLoading(false);
    }
  }, [selectedDate, utenteId]);

  useFocusEffect(
    useCallback(() => {
      loadCalendar();
    }, [loadCalendar])
  );

  const selectedDateLabel = useMemo(() => {
    const d = parseIsoDate(selectedDate);
    return new Intl.DateTimeFormat('it-IT', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }).format(d);
  }, [selectedDate]);

  const monthLabel = useMemo(
    () =>
      new Intl.DateTimeFormat('it-IT', {
        month: 'long',
        year: 'numeric',
      }).format(visibleMonth),
    [visibleMonth]
  );

  const monthCells = useMemo(() => {
    const year = visibleMonth.getFullYear();
    const month = visibleMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7;
    const cells: Array<{ iso: string | null; dayLabel: string }> = [];
    for (let i = 0; i < firstWeekday; i += 1) {
      cells.push({ iso: null, dayLabel: '' });
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
      const iso = toIsoDate(new Date(year, month, day));
      cells.push({ iso, dayLabel: `${day}` });
    }
    while (cells.length % 7 !== 0) {
      cells.push({ iso: null, dayLabel: '' });
    }
    return cells;
  }, [visibleMonth]);

  const goMonth = useCallback((delta: number) => {
    setVisibleMonth((prev) => startOfMonth(new Date(prev.getFullYear(), prev.getMonth() + delta, 1)));
  }, []);

  const onConfirmBook = useCallback(
    async (row: CalendarioSessioneFitnessDto) => {
      if (!utenteId) {
        Alert.alert('Utente non disponibile', 'Impossibile prenotare: utente non identificato.');
        return;
      }
      setBookingSessionId(row.sessioneId);
      try {
        await creaPrenotazioneSessioneFitness({
          utenteId,
          sessioneId: row.sessioneId,
        });
        await loadCalendar();
        setBookedSessionName(row.sessioneNome);
      } catch (e) {
        Alert.alert('Prenotazione non riuscita', e instanceof Error ? e.message : 'Riprova più tardi');
      } finally {
        setBookingSessionId(null);
        setConfirmSession(null);
      }
    },
    [loadCalendar, utenteId]
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.calendarCard}>
          <View style={styles.monthHeader}>
            <Pressable style={styles.monthArrow} onPress={() => goMonth(-1)}>
              <Ionicons name="chevron-back" size={18} color={theme.colors.secondary} />
            </Pressable>
            <Text style={styles.monthTitle}>{monthLabel}</Text>
            <Pressable style={styles.monthArrow} onPress={() => goMonth(1)}>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.secondary} />
            </Pressable>
          </View>
          <View style={styles.weekdaysRow}>
            {['L', 'M', 'M', 'G', 'V', 'S', 'D'].map((day, index) => (
              <Text key={`${day}-${index}`} style={styles.weekdayText}>
                {day}
              </Text>
            ))}
          </View>
          <View style={styles.daysGrid}>
            {monthCells.map((cell, index) => {
              const isSelected = cell.iso === selectedDate;
              const isToday = cell.iso === todayIso;
              return (
                <Pressable
                  key={`${cell.iso ?? 'empty'}-${index}`}
                  style={[
                    styles.dayCell,
                    !cell.iso && styles.dayCellEmpty,
                    isSelected && styles.dayCellSelected,
                    isToday && !isSelected && styles.dayCellToday,
                  ]}
                  disabled={!cell.iso}
                  onPress={() => {
                    if (!cell.iso) return;
                    setSelectedDate(cell.iso);
                  }}
                >
                  <Text
                    style={[
                      styles.dayCellText,
                      isSelected && styles.dayCellTextSelected,
                      !cell.iso && styles.dayCellTextEmpty,
                    ]}
                  >
                    {cell.dayLabel}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Text style={styles.selectedDayTitle}>{selectedDateLabel}</Text>

        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={theme.colors.secondary} />
          </View>
        ) : null}

        {!loading && error ? (
          <View style={styles.stateCard}>
            <Ionicons name="alert-circle-outline" size={20} color={theme.colors.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {!loading && !error && calendarRows.length === 0 ? (
          <View style={styles.stateCard}>
            <Ionicons name="calendar-outline" size={20} color={theme.colors.secondary} />
            <Text style={styles.stateText}>Nessuna sessione disponibile per la data selezionata.</Text>
          </View>
        ) : null}

        {!loading && !error
          ? calendarRows.map((row) => {
              const alreadyBooked = mySessionIds.has(row.sessioneId);
              const bookingThis = bookingSessionId === row.sessioneId;
              return (
                <View key={row.id} style={styles.sessionCard}>
                  <View style={styles.sessionTop}>
                    <Text style={styles.sessionTitle}>{row.sessioneNome}</Text>
                    <Text style={styles.sessionHour}>
                      {toHour(row.oraInizio)} - {toHour(row.oraFine)}
                    </Text>
                  </View>
                  <Text style={styles.sessionMeta}>
                    {row.sessioneDescrizione?.trim() || 'Descrizione sessione non disponibile.'}
                  </Text>
                  <Pressable
                    style={({ pressed }) => [
                      styles.bookButton,
                      alreadyBooked && styles.bookButtonDisabled,
                      pressed && !alreadyBooked && styles.bookButtonPressed,
                    ]}
                    onPress={() => setConfirmSession(row)}
                    disabled={alreadyBooked || bookingThis}
                  >
                    {bookingThis ? (
                      <ActivityIndicator size="small" color={theme.colors.background.primary} />
                    ) : (
                      <>
                        <Ionicons
                          name={alreadyBooked ? 'checkmark-circle' : 'add-circle-outline'}
                          size={18}
                          color={alreadyBooked ? theme.colors.secondary : theme.colors.background.primary}
                        />
                        <Text
                          style={[styles.bookButtonText, alreadyBooked && styles.bookButtonTextDisabled]}
                        >
                          {alreadyBooked ? 'Prenotato' : 'Prenota sessione'}
                        </Text>
                      </>
                    )}
                  </Pressable>
                </View>
              );
            })
          : null}
      </ScrollView>

      <Modal
        visible={Boolean(confirmSession)}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmSession(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconWrap}>
              <Ionicons name="help-circle-outline" size={20} color={theme.colors.secondary} />
            </View>
            <Text style={styles.modalTitle}>Conferma prenotazione</Text>
            <Text style={styles.modalText}>
              Vuoi prenotare la sessione "{confirmSession?.sessioneNome}" delle{' '}
              {confirmSession ? toHour(confirmSession.oraInizio) : '--:--'}?
            </Text>
            <View style={styles.modalActions}>
              <Pressable
                style={({ pressed }) => [styles.modalSecondaryBtn, pressed && styles.modalBtnPressed]}
                onPress={() => setConfirmSession(null)}
                disabled={bookingSessionId !== null}
              >
                <Text style={styles.modalSecondaryBtnText}>Annulla</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.modalPrimaryBtn, pressed && styles.modalBtnPressed]}
                onPress={() => {
                  if (confirmSession) onConfirmBook(confirmSession);
                }}
                disabled={bookingSessionId !== null || !confirmSession}
              >
                {bookingSessionId !== null ? (
                  <ActivityIndicator size="small" color={theme.colors.background.primary} />
                ) : (
                  <Text style={styles.modalPrimaryBtnText}>Conferma</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={Boolean(bookedSessionName)}
        transparent
        animationType="fade"
        onRequestClose={() => setBookedSessionName(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.successIconWrap}>
              <Ionicons name="checkmark-circle-outline" size={20} color={theme.colors.secondary} />
            </View>
            <Text style={styles.modalTitle}>Prenotazione confermata</Text>
            <Text style={styles.modalText}>Ti sei prenotato a "{bookedSessionName}".</Text>
            <Pressable
              style={({ pressed }) => [styles.modalPrimaryBtn, pressed && styles.modalBtnPressed]}
              onPress={() => setBookedSessionName(null)}
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
    paddingBottom: 30,
    gap: 10,
  },
  calendarCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: withOpacity(theme.colors.secondary, 0.18),
    backgroundColor: withOpacity(theme.colors.primary, 0.28),
    paddingHorizontal: 10,
    paddingVertical: 9,
    gap: 8,
    marginBottom: 24,
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  monthArrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: withOpacity(theme.colors.secondary, 0.22),
    backgroundColor: withOpacity(theme.colors.secondary, 0.05),
  },
  monthTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.secondary,
    textTransform: 'capitalize',
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
  },
  weekdaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  weekdayText: {
    width: `${100 / 7}%`,
    textAlign: 'center',
    fontSize: 11,
    color: withOpacity(theme.colors.text.secondary, 0.68),
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: `${100 / 7}%`,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  dayCellEmpty: {
    opacity: 0,
  },
  dayCellSelected: {
    backgroundColor: theme.colors.secondary,
  },
  dayCellToday: {
    borderWidth: 1,
    borderColor: withOpacity(theme.colors.secondary, 0.35),
  },
  dayCellText: {
    color: theme.colors.text.secondary,
    fontSize: 13,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
  },
  dayCellTextSelected: {
    color: theme.colors.background.primary,
  },
  dayCellTextEmpty: {
    opacity: 0,
  },
  selectedDayTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.secondary,
    textTransform: 'capitalize',
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
    marginTop: 2,
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
    flexDirection: 'row',
    alignItems: 'center',
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
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
  },
  sessionCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: withOpacity(theme.colors.secondary, 0.25),
    backgroundColor: withOpacity(theme.colors.primary, 0.45),
    padding: 14,
    gap: 8,
  },
  sessionTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  sessionTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.secondary,
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
  },
  sessionHour: {
    fontSize: 13,
    color: withOpacity(theme.colors.text.secondary, 0.9),
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
  },
  sessionMeta: {
    fontSize: 13,
    color: withOpacity(theme.colors.text.secondary, 0.88),
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
  },
  bookButton: {
    marginTop: 4,
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: withOpacity(theme.colors.secondary, 0.4),
    backgroundColor: theme.colors.secondary,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bookButtonPressed: {
    opacity: 0.9,
  },
  bookButtonDisabled: {
    backgroundColor: withOpacity(theme.colors.secondary, 0.15),
  },
  bookButtonText: {
    color: theme.colors.background.primary,
    fontSize: 13,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
  },
  bookButtonTextDisabled: {
    color: theme.colors.secondary,
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
    borderColor: withOpacity(theme.colors.secondary, 0.35),
    backgroundColor: withOpacity(theme.colors.secondary, 0.12),
  },
  successIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: withOpacity(theme.colors.secondary, 0.35),
    backgroundColor: withOpacity(theme.colors.secondary, 0.12),
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
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.secondary,
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
  },
  modalPrimaryBtn: {
    flex: 1,
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

export default FitnessSessionsCalendarScreen;
