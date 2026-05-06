import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { StackNavigationProp } from '@react-navigation/stack';
import { useNavigation } from '@react-navigation/native';
// @ts-ignore — Expo
import { Ionicons } from '@expo/vector-icons';
import { theme, withOpacity } from '../../theme';
import type { VisiteStackParamList } from './types';

type Nav = StackNavigationProp<VisiteStackParamList, 'VisiteMenu'>;

const VisiteMenuScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <Text style={styles.headerSubtitle}>
          Consulta le visite già registrate sul tuo profilo oppure prenota un nuovo appuntamento.
        </Text>
      </View>

      <View style={styles.cards}>
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
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: withOpacity(theme.colors.secondary, 0.15),
  },
  headerSubtitle: {
    marginTop: 0,
    fontSize: 14,
    color: theme.colors.text.secondary,
    lineHeight: 20,
    opacity: 0.9,
  },
  cards: {
    padding: 20,
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
    color: theme.colors.secondary,
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
