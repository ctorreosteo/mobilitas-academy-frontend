import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { StackNavigationProp } from '@react-navigation/stack';
import { useNavigation } from '@react-navigation/native';
// @ts-ignore — Expo
import { Ionicons } from '@expo/vector-icons';
import { theme, withOpacity } from '../../theme';
import type { VisiteStackParamList } from './types';
import { useTabBarBottomPadding } from '../../hooks/useTabBarBottomPadding';

type Nav = StackNavigationProp<VisiteStackParamList, 'VisiteMenu'>;

const VisiteMenuScreen: React.FC = () => {
  const tabBarPad = useTabBarBottomPadding();
  const navigation = useNavigation<Nav>();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <View style={styles.heroHeader}>
        <Text style={styles.heroTitle}>Visite</Text>
        <Text style={styles.heroSubtitle}>
          Consulta le visite registrate oppure prenota un nuovo appuntamento in pochi passaggi.
        </Text>
      </View>
      <View style={styles.headerBadge}>
        <Ionicons name="medkit-outline" size={14} color={theme.colors.text.primary} />
        <Text style={styles.headerBadgeText}>Area visite</Text>
      </View>
      <View style={styles.dividerWrap}>
        <View style={styles.dividerLine} />
        <View style={styles.dividerIconWrap}>
          <Ionicons name="calendar-outline" size={15} color={theme.colors.secondary} />
        </View>
        <View style={styles.dividerLine} />
      </View>

      <View style={[styles.cards, { paddingBottom: 20 + tabBarPad }]}>
        <Pressable
          style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
          onPress={() => navigation.navigate('GestioneVisite')}
        >
          <View style={styles.cardIconWrap}>
            <Ionicons name="list-outline" size={28} color={theme.colors.secondary} />
          </View>
          <Text style={styles.cardTitle}>Gestisci le tue visite</Text>
          <Text style={styles.cardHint}>
            Elenco delle tue visite (stato, pagamento, date) dal server.
          </Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
          onPress={() => navigation.navigate('BookVisit')}
        >
          <View style={styles.cardIconWrap}>
            <Ionicons name="calendar-outline" size={28} color={theme.colors.secondary} />
          </View>
          <Text style={styles.cardTitle}>Prenota una nuova visita</Text>
          <Text style={styles.cardHint}>
            Scegli studio, osteopata e fascia oraria tra le disponibilità.
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  heroHeader: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 12,
  },
  heroTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: theme.colors.secondary,
  },
  heroSubtitle: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    color: withOpacity(theme.colors.text.secondary, 0.92),
  },
  headerBadge: {
    alignSelf: 'flex-start',
    marginLeft: 20,
    marginBottom: 8,
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
  cards: {
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 16,
  },
  card: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: withOpacity(theme.colors.secondary, 0.25),
    backgroundColor: withOpacity(theme.colors.primary, 0.45),
  },
  cardPressed: {
    opacity: 0.88,
  },
  cardIconWrap: {
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.titlePrimary,
    marginBottom: 6,
  },
  cardHint: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    lineHeight: 20,
    opacity: 0.9,
  },
});

export default VisiteMenuScreen;
