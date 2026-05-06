import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
  annullaPrenotazioneSessioneFitness,
  fetchPartecipazioniSessioniFitness,
  type PartecipanteSessioneFitnessDto,
} from '../../services/fitnessService';

const FitnessBookingsScreen: React.FC = () => {
  const { userProfile } = useAuth();
  const [bookings, setBookings] = useState<PartecipanteSessioneFitnessDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cancelingId, setCancelingId] = useState<number | null>(null);

  const utenteId = userProfile?.utenteId ?? null;

  const loadBookings = useCallback(async () => {
    if (!utenteId) {
      setBookings([]);
      setError('ID utente non disponibile nella sessione corrente');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const all = await fetchPartecipazioniSessioniFitness();
      const mine = all.filter((row) => row.utenteId === utenteId);
      setBookings(mine);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore nel caricamento prenotazioni');
    } finally {
      setLoading(false);
    }
  }, [utenteId]);

  useFocusEffect(
    useCallback(() => {
      loadBookings();
    }, [loadBookings])
  );

  const titleSubtitle = useMemo(
    () =>
      'In questa sezione puoi gestire le tue prenotazioni fitness attive, controllarle rapidamente e annullarle quando necessario.',
    []
  );

  const onCancelBooking = useCallback(
    (item: PartecipanteSessioneFitnessDto) => {
      Alert.alert(
        'Annulla prenotazione',
        `Vuoi annullare la prenotazione per "${item.sessioneNome}"?`,
        [
          { text: 'No', style: 'cancel' },
          {
            text: 'Sì, annulla',
            style: 'destructive',
            onPress: async () => {
              setCancelingId(item.id);
              try {
                await annullaPrenotazioneSessioneFitness(item.id);
                await loadBookings();
              } catch (e) {
                Alert.alert(
                  'Errore',
                  e instanceof Error ? e.message : 'Impossibile annullare la prenotazione'
                );
              } finally {
                setCancelingId(null);
              }
            },
          },
        ]
      );
    },
    [loadBookings]
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>Le tue prenotazioni</Text>
          <Text style={styles.heroSubtitle}>{titleSubtitle}</Text>
          <View style={styles.headerBadge}>
            <Ionicons name="checkmark-done-outline" size={14} color={theme.colors.text.primary} />
            <Text style={styles.headerBadgeText}>Prenotazioni fitness</Text>
          </View>
        </View>
        <View style={styles.dividerWrap}>
          <View style={styles.dividerLine} />
          <View style={styles.dividerIconWrap}>
            <Ionicons name="barbell-outline" size={15} color={theme.colors.secondary} />
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
            <Ionicons name="alert-circle-outline" size={20} color={theme.colors.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {!loading && !error && bookings.length === 0 ? (
          <View style={styles.stateCard}>
            <Ionicons name="calendar-outline" size={20} color={theme.colors.secondary} />
            <Text style={styles.stateText}>Nessuna prenotazione attiva al momento.</Text>
          </View>
        ) : null}

        {!loading && !error
          ? bookings.map((item) => (
              <View key={item.id} style={styles.bookingCard}>
                <View style={styles.cardTopRow}>
                  <Text style={styles.bookingTitle}>{item.sessioneNome}</Text>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>Attiva</Text>
                  </View>
                </View>
                <Text style={styles.bookingMeta}>Utente: {item.utenteNomeCompleto}</Text>
                <Pressable
                  style={({ pressed }) => [
                    styles.cancelButton,
                    pressed && styles.cancelButtonPressed,
                    cancelingId === item.id && styles.cancelButtonDisabled,
                  ]}
                  onPress={() => onCancelBooking(item)}
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
            ))
          : null}
      </ScrollView>
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
});

export default FitnessBookingsScreen;
