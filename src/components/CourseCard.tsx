import React from 'react';
import { View, Text, StyleSheet, Platform, Image } from 'react-native';
import { theme } from '../theme';

interface CourseCardProps {
  title: string;
  instructor: string;
  duration: number; // in minuti
  completionPercentage: number;
  isCompleted: boolean;
  coverImage?: string;
}

const CourseCard: React.FC<CourseCardProps> = ({
  title,
  instructor,
  duration,
  completionPercentage,
  isCompleted,
  coverImage,
}) => {
  return (
    <View style={styles.card}>
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
        <Text style={styles.duration}>{duration} min</Text>
        <View style={styles.continueButton}>
          <Text style={styles.continueText}>
            {isCompleted ? 'Rivedi' : 'Continua'}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.background.white,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
    padding: 20,
    paddingTop: 20,
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
  continueText: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
    color: theme.colors.text.primary, // Verde
    fontWeight: '600',
  },
});

export default CourseCard;
