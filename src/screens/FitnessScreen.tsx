import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
// @ts-ignore - @expo/vector-icons è parte di Expo SDK
import { Ionicons } from '@expo/vector-icons';
import { theme, withOpacity } from '../theme';
import { useAuth } from '../context/AuthContext';
import { fetchPartecipazioniSessioniFitness } from '../services/fitnessService';
import type { FitnessStackParamList } from './fitness/types';
import type { StackNavigationProp } from '@react-navigation/stack';

type FitnessNav = StackNavigationProp<FitnessStackParamList, 'FitnessCalendar'>;

const FitnessScreen: React.FC = () => {
  const navigation = useNavigation<FitnessNav>();
  const { userProfile } = useAuth();
  const [mySessionIds, setMySessionIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const utenteId = userProfile?.utenteId ?? null;

  const loadMyBookings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const bookings = await fetchPartecipazioniSessioniFitness();
      if (utenteId) {
        const mine = bookings.filter((item) => item.utenteId === utenteId).map((item) => item.sessioneId);
        setMySessionIds(new Set(mine));
      } else {
        setMySessionIds(new Set());
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Impossibile caricare le prenotazioni fitness');
    } finally {
      setLoading(false);
    }
  }, [utenteId]);

  useFocusEffect(
    useCallback(() => {
      loadMyBookings();
    }, [loadMyBookings])
  );

  const bookingLabel = useMemo(() => `${mySessionIds.size}`, [mySessionIds.size]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.heroHeader}>
          <Text style={styles.heroTitle}>Calendario Fitness</Text>
          <Text style={styles.heroSubtitle}>
            Gestisci le tue prenotazioni e consulta le sessioni disponibili.
          </Text>
        </View>
        <View style={styles.headerBadge}>
          <Ionicons name="barbell-outline" size={14} color={theme.colors.text.primary} />
          <Text style={styles.headerBadgeText}>Area fitness</Text>
        </View>
        <View style={styles.dividerWrap}>
          <View style={styles.dividerLine} />
          <View style={styles.dividerIconWrap}>
            <Ionicons name="barbell-outline" size={15} color={theme.colors.secondary} />
          </View>
          <View style={styles.dividerLine} />
        </View>

        <Pressable
          style={({ pressed }) => [styles.manageCard, pressed && styles.manageCardPressed]}
          onPress={() => navigation.navigate('FitnessBookings')}
          accessibilityRole="button"
          accessibilityLabel="Apri pagina prenotazioni attive fitness"
        >
          <View style={styles.manageCardLeft}>
            <View style={styles.manageIconWrap}>
              <Ionicons name="list-circle" size={22} color={theme.colors.secondary} />
            </View>
            <View style={styles.manageCardTexts}>
              <Text style={styles.manageCardTitle}>Le tue prenotazioni attive</Text>
              <Text style={styles.manageCardSubtitle}>
                Tocca qui per vedere e annullare le prenotazioni.
              </Text>
            </View>
          </View>
          <View style={styles.manageCardRight}>
            <Text style={styles.manageCount}>{bookingLabel}</Text>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.secondary} />
          </View>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.manageCard, pressed && styles.manageCardPressed]}
          onPress={() => navigation.navigate('FitnessSessionsCalendar')}
          accessibilityRole="button"
          accessibilityLabel="Apri calendario sessioni fitness prenotabili"
        >
          <View style={styles.manageCardLeft}>
            <View style={styles.manageIconWrap}>
              <Ionicons name="calendar-clear-outline" size={22} color={theme.colors.secondary} />
            </View>
            <View style={styles.manageCardTexts}>
              <Text style={styles.manageCardTitle}>Calendario Fitness</Text>
              <Text style={styles.manageCardSubtitle}>
                Tocca qui per vedere l'elenco completo e prenotare.
              </Text>
            </View>
          </View>
          <View style={styles.manageCardRight}>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.secondary} />
          </View>
        </Pressable>

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
    paddingTop: 22,
    paddingBottom: 30,
    gap: 12,
  },
  heroHeader: {
    paddingTop: 0,
    paddingHorizontal: 2,
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
  },
  headerBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text.primary,
    letterSpacing: 0.2,
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
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
  heroTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: theme.colors.secondary,
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
  },
  heroSubtitle: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    color: withOpacity(theme.colors.text.secondary, 0.92),
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
  },
  manageCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: withOpacity(theme.colors.secondary, 0.34),
    backgroundColor: withOpacity(theme.colors.primary, 0.72),
    paddingVertical: 13,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    shadowColor: theme.colors.black,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.14,
    shadowRadius: 8,
    elevation: 4,
  },
  manageCardPressed: {
    transform: [{ scale: 0.995 }],
    opacity: 0.95,
  },
  manageCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  manageIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: withOpacity(theme.colors.secondary, 0.18),
    borderWidth: 1,
    borderColor: withOpacity(theme.colors.secondary, 0.4),
  },
  manageCardTexts: {
    flex: 1,
  },
  manageCardTitle: {
    color: theme.colors.secondary,
    fontSize: 15,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
  },
  manageCardSubtitle: {
    marginTop: 3,
    color: withOpacity(theme.colors.text.secondary, 0.9),
    fontSize: 12,
    lineHeight: 17,
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
  },
  manageCardRight: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 38,
    gap: 2,
  },
  manageCount: {
    color: theme.colors.secondary,
    fontSize: 18,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
    lineHeight: 20,
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
  errorText: {
    flex: 1,
    color: theme.colors.error,
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
  },
});

export default FitnessScreen;
