import React from 'react';
import { View, Text, StyleSheet, Platform, Image, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { theme, withOpacity } from '../theme';
import { Course } from '../types';

type CoursesStackParamList = {
  CoursesList: undefined;
  CourseVideos: { course: Course };
  VideoPlayer: { video: import('../types').Video; course?: Course };
};

type NavigationProp = StackNavigationProp<CoursesStackParamList, 'CourseVideos'>;

interface CourseCardProps {
  course: Course;
  title: string;
  instructor: string;
  duration: number; // in minuti
  completionPercentage: number;
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
  completionPercentage,
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
    <View style={[styles.card, isLocked && styles.cardLocked]}>
      {coverImage && (
        <View style={styles.coverImageContainer}>
          <Image
            source={{ uri: coverImage }}
            style={styles.coverImage}
            resizeMode="cover"
            onError={() => console.log('Errore caricamento immagine:', coverImage)}
          />
        </View>
      )}
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {isLocked ? (
          <View style={styles.lockBadge}>
            <Text style={styles.lockBadgeText}>Bloccato</Text>
          </View>
        ) : null}
      </View>
      
      <View style={styles.progressContainer}>
        <View style={styles.progressInfo}>
          <Text style={styles.progressText}>Progresso</Text>
          <Text style={styles.progressPercentage}>{completionPercentage}%</Text>
        </View>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill, 
              { width: `${completionPercentage}%` }
            ]} 
          />
        </View>
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
  );
};

const styles = StyleSheet.create({
  card: {
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
  coverImageContainer: {
    width: '100%',
    height: 190,
    backgroundColor: '#06213D',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  cardLocked: {
    opacity: 0.82,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
    padding: 20,
    paddingTop: 20,
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
    fontSize: 18,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
    color: '#D8FFE3',
  },
  progressContainer: {
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressText: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
    color: withOpacity(theme.colors.text.secondary, 0.82),
    fontWeight: '500',
  },
  progressPercentage: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
    color: '#CCFFD9',
    fontWeight: '600',
  },
  progressBar: {
    height: 6,
    backgroundColor: withOpacity(theme.colors.text.secondary, 0.12),
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.secondary,
    borderRadius: 3,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
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
