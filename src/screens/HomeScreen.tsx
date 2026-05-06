import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
// @ts-ignore - @expo/vector-icons è parte di Expo SDK
import { Ionicons } from '@expo/vector-icons';
import { theme, withOpacity } from '../theme';
import { useAuth } from '../context/AuthContext';

const HomeScreen: React.FC = () => {
  const navigation = useNavigation();
  const { userProfile } = useAuth();

  const firstName = userProfile?.nome?.trim() || 'Professionista';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.heroIntro}>
          <Text style={styles.heroOverline}>Mobilitas Academy</Text>
          <Text style={styles.heroTitle}>Ciao {firstName}</Text>
          <Text style={styles.heroSubtitle}>
            Questa pagina ti guida tra tutte le azioni disponibili: formazione, visite, fitness, profilo
            e gestione acquisti.
          </Text>
        </View>
        <View style={styles.sectionBadge}>
          <Ionicons name="grid-outline" size={14} color={theme.colors.text.primary} />
          <Text style={styles.sectionBadgeText}>Panoramica</Text>
        </View>
        <View style={styles.dividerWrap}>
          <View style={styles.dividerLine} />
          <View style={styles.dividerIconWrap}>
            <Ionicons name="sparkles-outline" size={15} color={theme.colors.secondary} />
          </View>
          <View style={styles.dividerLine} />
        </View>

        <Text style={styles.sectionTitle}>Azioni rapide</Text>
        <View style={styles.quickGrid}>
          <Pressable
            style={({ pressed }) => [styles.quickCard, pressed && styles.quickCardPressed]}
            onPress={() => navigation.navigate('StudioVisits' as never)}
          >
            <View style={styles.quickIconWrap}>
              <Ionicons name="calendar-outline" size={24} color={theme.colors.secondary} />
            </View>
            <Text style={styles.quickCardTitle}>Visite</Text>
            <Text style={styles.quickCardHint}>Agenda, slot giornalieri e acquisti collegati.</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.quickCard, pressed && styles.quickCardPressed]}
            onPress={() => navigation.navigate('Courses' as never)}
          >
            <View style={styles.quickIconWrap}>
              <Ionicons name="library-outline" size={24} color={theme.colors.secondary} />
            </View>
            <Text style={styles.quickCardTitle}>Corsi</Text>
            <Text style={styles.quickCardHint}>Riprendi la formazione e guarda i video.</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.quickCard, pressed && styles.quickCardPressed]}
            onPress={() => navigation.navigate('Fitness' as never)}
          >
            <View style={styles.quickIconWrap}>
              <Ionicons name="barbell-outline" size={24} color={theme.colors.secondary} />
            </View>
            <Text style={styles.quickCardTitle}>Fitness</Text>
            <Text style={styles.quickCardHint}>Calendario sessioni e prenotazioni attive.</Text>
          </Pressable>

        </View>

        <Text style={[styles.sectionTitle, styles.operationalNewsTitle]}>Novità operative</Text>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="checkmark-circle" size={18} color={theme.colors.secondary} />
            <Text style={styles.infoText}>Prenotazione su giorno singolo con disponibilità chiare.</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="checkmark-circle" size={18} color={theme.colors.secondary} />
            <Text style={styles.infoText}>
              Acquisti paziente: selezione prenotabili e creazione rapida dal form visita.
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="checkmark-circle" size={18} color={theme.colors.secondary} />
            <Text style={styles.infoText}>
              Nuovo acquisto con servizio attivo, metodo pagamento, sconto e note.
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="checkmark-circle" size={18} color={theme.colors.secondary} />
            <Text style={styles.infoText}>
              Menu a tendina ottimizzati con riquadri per migliorare leggibilità.
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="checkmark-circle" size={18} color={theme.colors.secondary} />
            <Text style={styles.infoText}>
              Sezione Fitness aggiornata: calendario sessioni, prenotazione rapida e gestione iscrizioni.
            </Text>
          </View>
        </View>

        <View style={styles.footerHint}>
          <Ionicons name="information-circle-outline" size={18} color={theme.colors.secondary} />
          <Text style={styles.footerHintText}>
            Vai su Visite e Fitness per usare subito prenotazioni studio, sessioni e gestione acquisti.
          </Text>
        </View>
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
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 28,
    gap: 14,
  },
  heroIntro: {
    marginTop: 0,
  },
  heroOverline: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    color: theme.colors.secondary,
    opacity: 0.9,
    marginBottom: 6,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: theme.colors.secondary,
  },
  heroSubtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: withOpacity(theme.colors.text.secondary, 0.94),
  },
  sectionTitle: {
    marginTop: 4,
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.titlePrimary,
  },
  operationalNewsTitle: {
    marginTop: 48,
  },
  sectionBadge: {
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
  sectionBadgeText: {
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
  quickGrid: {
    gap: 10,
  },
  quickCard: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: withOpacity(theme.colors.secondary, 0.25),
    backgroundColor: withOpacity(theme.colors.primary, 0.45),
  },
  quickCardPressed: {
    opacity: 0.88,
  },
  quickIconWrap: {
    marginBottom: 8,
  },
  quickCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.secondary,
  },
  quickCardHint: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: withOpacity(theme.colors.text.secondary, 0.92),
  },
  infoCard: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: withOpacity(theme.colors.secondary, 0.25),
    backgroundColor: withOpacity(theme.colors.primary, 0.45),
    gap: 10,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: withOpacity(theme.colors.text.secondary, 0.94),
  },
  footerHint: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 2,
  },
  footerHintText: {
    flex: 1,
    fontSize: 13,
    color: withOpacity(theme.colors.text.secondary, 0.86),
  },
});

export default HomeScreen;