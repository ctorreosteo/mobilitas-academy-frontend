import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, Platform, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
// @ts-ignore - @expo/vector-icons is included in Expo SDK
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import { Course, Chapter, Video } from '../types';
import ChapterSection from '../components/ChapterSection';
import { fetchCloudflareCourseModules, fetchCloudflareCourseVideos } from '../services/cloudflareService';

type AdvancedCoursesStackParamList = {
  AdvancedCoursesList: undefined;
  AdvancedCourseVideos: { course: Course };
  VideoPlayer: { video: Video };
};

type AdvancedCourseVideosScreenRouteProp = RouteProp<AdvancedCoursesStackParamList, 'AdvancedCourseVideos'>;
type NavigationProp = StackNavigationProp<AdvancedCoursesStackParamList, 'VideoPlayer'>;

const AdvancedCourseVideosScreen: React.FC = () => {
  const route = useRoute<AdvancedCourseVideosScreenRouteProp>();
  const navigation = useNavigation<NavigationProp>();
  const { course } = route.params;

  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadCourseData() {
      try {
        setLoading(true);
        setError(null);

        // Carica moduli (capitoli) e video da Cloudflare
        const [fetchedChapters, fetchedVideos] = await Promise.all([
          fetchCloudflareCourseModules(course.id),
          fetchCloudflareCourseVideos(course.id),
        ]);

        if (isMounted) {
          setChapters(fetchedChapters.sort((a, b) => a.order - b.order));
          setVideos(fetchedVideos);
        }
      } catch (err: any) {
        console.error('❌ Errore nel caricamento dati corso:', err);
        if (isMounted) {
          setError(err.message || 'Errore nel caricamento dei moduli e video');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadCourseData();

    return () => {
      isMounted = false;
    };
  }, [course.id]);

  const handleVideoPress = (video: Video) => {
    navigation.navigate('VideoPlayer', { video });
  };

  const totalDuration = useMemo(() => 
    videos.reduce((acc, v) => acc + v.duration, 0),
    [videos]
  );
  const completedVideos = videos.filter(v => v.isCompleted).length;
  const progressPercentage = videos.length > 0 
    ? Math.round((completedVideos / videos.length) * 100) 
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
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{chapters.length}</Text>
            <Text style={styles.statLabel}>Moduli</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{videos.length}</Text>
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
            {completedVideos} di {videos.length} video completati
          </Text>
        </View>

        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.secondary} />
            <Text style={styles.loadingText}>Caricamento moduli e video da Cloudflare...</Text>
          </View>
        )}

        {error && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={24} color={theme.colors.error} style={styles.errorIcon} />
            <Text style={styles.errorText}>
              Errore nel caricamento dati da Cloudflare
            </Text>
            <Text style={styles.errorDetails}>{error}</Text>
            <Text style={styles.errorHint}>
              Verifica:
              {'\n'}• File .env con EXPO_PUBLIC_CLOUDFLARE_API_URL e EXPO_PUBLIC_CLOUDFLARE_API_TOKEN configurati
              {'\n'}• API token valido e permessi corretti
              {'\n'}• ID corso corretto: {course.id}
            </Text>
          </View>
        )}

        {!error && !loading && chapters.length === 0 && videos.length === 0 && (
          <View style={styles.warningContainer}>
            <Ionicons name="information-circle" size={24} color={theme.colors.accent} style={styles.errorIcon} />
            <Text style={styles.warningText}>
              Nessun modulo o video disponibile
            </Text>
            <Text style={styles.errorHint}>
              Il corso potrebbe non avere ancora moduli o video caricati su Cloudflare.
            </Text>
          </View>
        )}

        {!loading && !error && (
          <View style={styles.chaptersContainer}>
            {chapters.map((chapter) => {
              // Filtra i video per questo modulo/capitolo
              const chapterVideos = videos.filter(v => v.chapterId === chapter.id);
              
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
        )}
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

export default AdvancedCourseVideosScreen;


