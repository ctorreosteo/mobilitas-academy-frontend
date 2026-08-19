import React from 'react';
import { View, Text, StyleSheet, Platform, ImageBackground, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { theme, withOpacity } from '../theme';
import { Course } from '../types';
import type { CorsiStackParamList } from '../screens/corsi/types';

type NavigationProp = StackNavigationProp<CorsiStackParamList, 'CourseVideos'>;

interface CourseCardProps {
  course: Course;
  title: string;
  instructor: string;
  duration: number; // in minuti
  isCompleted: boolean;
  coverImage?: string;
  /** Corso in catalogo ma senza accesso (backend `attivo: false`) */
  isLocked?: boolean;
}

const CourseCard: React.FC<CourseCardProps> = ({
  course,
  title,
  instructor,
  duration,
  isCompleted,
  coverImage,
  isLocked,
}) => {
  const navigation = useNavigation<NavigationProp>();

  const handleContinue = () => {
    if (isLocked) return;
    navigation.navigate('CourseVideos', { course });
  };

  const durationLabel = duration > 0 ? `${duration} min` : '—';

  return (
    <ImageBackground
      source={coverImage ? { uri: coverImage } : undefined}
      style={[styles.card, isLocked && styles.cardLocked]}
      imageStyle={styles.cardImage}
      resizeMode="cover"
      onError={() => console.log('Errore caricamento immagine:', coverImage)}
    >
      {/* Vela scura: senza, titolo e pulsante spariscono sulle copertine chiare. */}
      <LinearGradient
        colors={[withOpacity(theme.colors.background.primary, 0.45), withOpacity(theme.colors.background.primary, 0.92)]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          {isLocked ? (
            <View style={styles.lockBadge}>
              <Text style={styles.lockBadgeText}>Bloccato</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.footer}>
          <Text style={styles.duration}>{durationLabel}</Text>
          <TouchableOpacity
            style={[styles.continueButton, isLocked && styles.continueButtonDisabled]}
            onPress={handleContinue}
            activeOpacity={isLocked ? 1 : 0.8}
            disabled={isLocked}
          >
            <Text style={[styles.continueText, isLocked && styles.continueTextDisabled]}>
              {isLocked ? 'Non disponibile' : isCompleted ? 'Rivedi' : 'Continua'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  card: {
    // Altezza fissa: la copertina è di sfondo e non detta più le dimensioni.
    minHeight: 270,
    backgroundColor: '#0A2B4D',
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: withOpacity(theme.colors.secondary, 0.2),
    shadowColor: theme.colors.black,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.24,
    shadowRadius: 14,
    elevation: 8,
    overflow: 'hidden',
  },
  cardImage: {
    borderRadius: 16,
  },
  cardLocked: {
    opacity: 0.82,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  lockBadge: {
    backgroundColor: withOpacity(theme.colors.black, 0.24),
    borderWidth: 1,
    borderColor: withOpacity(theme.colors.text.secondary, 0.2),
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  lockBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
    color: withOpacity(theme.colors.text.secondary, 0.76),
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
    color: '#D8FFE3',
    textShadowColor: withOpacity(theme.colors.black, 0.55),
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  duration: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
    color: withOpacity(theme.colors.text.secondary, 0.66),
  },
  continueButton: {
    backgroundColor: withOpacity(theme.colors.secondary, 0.14),
    borderWidth: 1,
    borderColor: withOpacity(theme.colors.secondary, 0.38),
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  continueButtonDisabled: {
    backgroundColor: withOpacity(theme.colors.text.secondary, 0.1),
    borderColor: withOpacity(theme.colors.text.secondary, 0.2),
  },
  continueText: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
    color: '#D3FFE0',
    fontWeight: '600',
  },
  continueTextDisabled: {
    color: withOpacity(theme.colors.text.secondary, 0.64),
  },
});

export default CourseCard;
