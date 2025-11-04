import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Platform, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
// @ts-ignore - @expo/vector-icons is included in Expo SDK
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import { Course, Chapter, Video } from '../types';
import { mockChapters } from '../data/mockChapters';
import { mockVideos } from '../data/mockVideos';
import ChapterSection from '../components/ChapterSection';
import { useYouTubePlaylist } from '../hooks/useYouTubePlaylist';

type CoursesStackParamList = {
  CoursesList: undefined;
  CourseVideos: { course: Course };
  VideoPlayer: { video: Video };
};

type CourseVideosScreenRouteProp = RouteProp<CoursesStackParamList, 'CourseVideos'>;
type NavigationProp = StackNavigationProp<CoursesStackParamList, 'VideoPlayer'>;

const CourseVideosScreen: React.FC = () => {
  const route = useRoute<CourseVideosScreenRouteProp>();
  const navigation = useNavigation<NavigationProp>();
  const { course } = route.params;

  // Se il corso ha una playlist YouTube, usa quella direttamente
  const isYouTubeCourse = !!course.youtubePlaylistId;
  
  // Hook per recuperare video dalla playlist del corso (se è un corso YouTube)
  const { videos: youtubeVideos, loading: loadingYoutube, error: youtubeError } = useYouTubePlaylist(
    course.youtubePlaylistId
  );

  // Per corsi YouTube: crea un capitolo virtuale con tutti i video
  // Per corsi legacy: usa la logica esistente con mockChapters
  const courseChapters = useMemo(() => {
    if (isYouTubeCourse) {
      // Crea un singolo capitolo virtuale per i video YouTube
      return [{
        id: `chapter-${course.id}`,
        title: 'Video del corso',
        order: 1,
        courseId: course.id,
      }];
    }
    // Logica legacy per corsi mock
    return mockChapters
      .filter(ch => ch.courseId === course.id)
      .sort((a, b) => a.order - b.order);
  }, [course.id, isYouTubeCourse]);

  // Combina video mock e YouTube
  const courseVideos = useMemo(() => {
    if (isYouTubeCourse) {
      // Per corsi YouTube, usa solo i video YouTube
      const virtualChapterId = `chapter-${course.id}`;
      return youtubeVideos.map(v => ({
        ...v,
        courseId: course.id,
        chapterId: virtualChapterId,
      }));
    }
    
    // Logica legacy per corsi mock
    const mockVideosForCourse = mockVideos.filter(v => v.courseId === course.id);
    const chaptersWithPlaylist = courseChapters.filter(ch => ch.youtubePlaylistId);
    const firstPlaylistId = chaptersWithPlaylist[0]?.youtubePlaylistId;
    const firstChapterId = chaptersWithPlaylist[0]?.id;
    
    // Se ci sono video YouTube da capitoli, aggiungili
    if (youtubeVideos.length > 0 && firstChapterId && firstPlaylistId) {
      const videosWithChapter = youtubeVideos.map(v => ({
        ...v,
        courseId: course.id,
        chapterId: firstChapterId,
      }));
      return [...mockVideosForCourse, ...videosWithChapter];
    }
    
    return mockVideosForCourse;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [course.id, youtubeVideos.length, isYouTubeCourse]);

  const handleVideoPress = (video: Video) => {
    navigation.navigate('VideoPlayer', { video });
  };

  const totalDuration = useMemo(() => 
    courseVideos.reduce((acc, v) => acc + v.duration, 0),
    [courseVideos]
  );
  const completedVideos = courseVideos.filter(v => v.isCompleted).length;
  const progressPercentage = courseVideos.length > 0 
    ? Math.round((completedVideos / courseVideos.length) * 100) 
    : 0;

  const formatTotalDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours > 0 && mins > 0) {
      return `${hours}h ${mins}m`;
    } else if (hours > 0) {
      return `${hours}h`;
    }
    return `${mins}m`;
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.courseTitle}>{course.title}</Text>
          <Text style={styles.instructor}>di {course.instructor}</Text>
        </View>

        <View style={styles.descriptionContainer}>
          <Text style={styles.descriptionText}>{course.description}</Text>
        </View>

        <View style={styles.statsContainer}>
          {!isYouTubeCourse && (
            <>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{courseChapters.length}</Text>
                <Text style={styles.statLabel}>Capitoli</Text>
              </View>
              <View style={styles.statDivider} />
            </>
          )}
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{courseVideos.length}</Text>
            <Text style={styles.statLabel}>Video</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue} numberOfLines={1}>
              {formatTotalDuration(totalDuration)}
            </Text>
            <Text style={styles.statLabel}>Durata</Text>
          </View>
        </View>

        <View style={styles.progressContainer}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Progresso Corso</Text>
            <Text style={styles.progressPercentage}>{progressPercentage}%</Text>
          </View>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${progressPercentage}%` }
              ]} 
            />
          </View>
          <Text style={styles.progressText}>
            {completedVideos} di {courseVideos.length} video completati
          </Text>
        </View>

        {loadingYoutube && youtubeVideos.length === 0 && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.secondary} />
            <Text style={styles.loadingText}>Caricamento video da YouTube...</Text>
          </View>
        )}

        {youtubeError && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={24} color={theme.colors.error} style={styles.errorIcon} />
            <Text style={styles.errorText}>
              Errore nel caricamento video da YouTube
            </Text>
            <Text style={styles.errorDetails}>{youtubeError}</Text>
            <Text style={styles.errorHint}>
              Verifica:
              {'\n'}• File .env con EXPO_PUBLIC_YOUTUBE_API_KEY configurata
              {'\n'}• API key valida e YouTube Data API v3 abilitata
              {'\n'}• ID playlist corretto: {course.youtubePlaylistId || 'N/A'}
            </Text>
          </View>
        )}

        {!youtubeError && !loadingYoutube && isYouTubeCourse && youtubeVideos.length === 0 && (
          <View style={styles.warningContainer}>
            <Ionicons name="information-circle" size={24} color={theme.colors.accent} style={styles.errorIcon} />
            <Text style={styles.warningText}>
              Nessun video caricato
            </Text>
            <Text style={styles.errorHint}>
              Possibili cause:
              {'\n'}• API key YouTube non configurata nel file .env
              {'\n'}• Playlist vuota o video non accessibili
              {'\n'}• Controlla la console per dettagli
            </Text>
          </View>
        )}

        {isYouTubeCourse && !course.youtubePlaylistId && (
          <View style={styles.warningContainer}>
            <Ionicons name="information-circle" size={24} color={theme.colors.accent} style={styles.errorIcon} />
            <Text style={styles.warningText}>
              Playlist ID non configurato
            </Text>
            <Text style={styles.errorHint}>
              Verifica che il corso abbia un youtubePlaylistId valido
            </Text>
          </View>
        )}

        <View style={styles.chaptersContainer}>
          {courseChapters.map((chapter) => {
            // Filtra i video per questo capitolo
            const chapterVideos = courseVideos.filter(v => v.chapterId === chapter.id);
            
            return (
              <ChapterSection
                key={chapter.id}
                chapter={chapter}
                videos={chapterVideos}
                onVideoPress={handleVideoPress}
              />
            );
          })}
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
    paddingBottom: 32,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
  },
  courseTitle: {
    fontSize: 28,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
    color: theme.colors.text.secondary,
    marginBottom: 8,
    lineHeight: 36,
  },
  instructor: {
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
    color: theme.colors.text.secondary,
    opacity: 0.7,
  },
  descriptionContainer: {
    marginHorizontal: 20,
    marginBottom: 24,
    padding: 16,
    backgroundColor: 'rgba(114, 250, 147, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(114, 250, 147, 0.1)',
  },
  descriptionText: {
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
    color: theme.colors.text.secondary,
    opacity: 0.85,
    lineHeight: 22,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    marginHorizontal: 20,
    marginBottom: 24,
    backgroundColor: 'rgba(114, 250, 147, 0.08)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(114, 250, 147, 0.15)',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
    color: theme.colors.secondary,
    marginBottom: 4,
    textAlign: 'center',
    minHeight: 32,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
    color: theme.colors.text.secondary,
    opacity: 0.7,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(114, 250, 147, 0.2)',
    marginHorizontal: 16,
  },
  progressContainer: {
    marginHorizontal: 20,
    marginBottom: 32,
    padding: 20,
    backgroundColor: 'rgba(114, 250, 147, 0.05)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(114, 250, 147, 0.1)',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
    color: theme.colors.text.secondary,
  },
  progressPercentage: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
    color: theme.colors.secondary,
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(114, 250, 147, 0.15)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.secondary,
    borderRadius: 4,
  },
  progressText: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
    color: theme.colors.text.secondary,
    opacity: 0.6,
  },
  chaptersContainer: {
    paddingHorizontal: 20,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
    color: theme.colors.text.secondary,
    opacity: 0.7,
  },
  errorContainer: {
    marginHorizontal: 20,
    marginBottom: 24,
    padding: 20,
    backgroundColor: 'rgba(255, 104, 105, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 104, 105, 0.3)',
  },
  warningContainer: {
    marginHorizontal: 20,
    marginBottom: 24,
    padding: 20,
    backgroundColor: 'rgba(14, 165, 233, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(14, 165, 233, 0.3)',
  },
  errorIcon: {
    marginBottom: 12,
    alignSelf: 'center',
  },
  errorText: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
    color: theme.colors.error,
    marginBottom: 8,
    textAlign: 'center',
  },
  warningText: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
    color: theme.colors.accent,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorDetails: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
    color: theme.colors.error,
    marginBottom: 12,
    textAlign: 'center',
    opacity: 0.9,
  },
  errorHint: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
    color: theme.colors.text.secondary,
    opacity: 0.7,
    lineHeight: 18,
  },
});

export default CourseVideosScreen;

