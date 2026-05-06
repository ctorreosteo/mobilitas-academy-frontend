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
        <Image 
          source={{ uri: coverImage }} 
          style={styles.coverImage}
          resizeMode="cover"
          onError={() => console.log('Errore caricamento immagine:', coverImage)}
        />
      )}
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {isLocked ? (
          <View style={styles.lockBadge}>
            <Text style={styles.lockBadgeText}>Bloccato</Text>
          </View>
        ) : null}
      </View>
      
      <Text style={styles.instructor}>di {instructor}</Text>
      
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
    backgroundColor: theme.colors.background.secondary,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: theme.colors.black,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
  },
  coverImage: {
    width: '100%',
    height: 120,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  cardLocked: {
    opacity: 0.92,
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
    backgroundColor: withOpacity(theme.colors.black, 0.06),
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  lockBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
    color: theme.colors.primary,
    opacity: 0.75,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
    color: theme.colors.primary,
  },
  instructor: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
    color: theme.colors.primary,
    opacity: 0.7,
    marginBottom: 16,
    paddingHorizontal: 20,
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
    color: theme.colors.primary,
    fontWeight: '500',
  },
  progressPercentage: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  progressBar: {
    height: 6,
    backgroundColor: theme.colors.background.secondary,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.primary, // Blu
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
    color: theme.colors.primary,
    opacity: 0.6,
  },
  continueButton: {
    backgroundColor: theme.colors.primary, // Blu
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  continueButtonDisabled: {
    backgroundColor: theme.colors.background.secondary,
  },
  continueText: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
    color: theme.colors.text.primary, // Verde
    fontWeight: '600',
  },
  continueTextDisabled: {
    color: theme.colors.text.secondary,
  },
});

export default CourseCard;
