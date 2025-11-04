import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Platform, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../theme';
import CourseCard from '../components/CourseCard';
import { Course } from '../types';
import { useYouTubeChannelPlaylists } from '../hooks/useYouTubeChannelPlaylists';

// Channel ID da variabile d'ambiente o fallback a undefined
const YOUTUBE_CHANNEL_ID = process.env.EXPO_PUBLIC_YOUTUBE_CHANNEL_ID || undefined;

const CoursesScreen: React.FC = () => {
  // Carica i corsi dal canale YouTube
  const { courses, loading, error } = useYouTubeChannelPlaylists(YOUTUBE_CHANNEL_ID);

  const renderCourse = ({ item }: { item: Course }) => (
    <CourseCard
      course={item}
      title={item.title}
      instructor={item.instructor}
      duration={item.duration}
      completionPercentage={item.completionPercentage}
      isCompleted={item.isCompleted}
      coverImage={item.coverImage}
    />
  );

  // Calcola statistiche dai corsi caricati
  const stats = useMemo(() => {
    const totalCourses = courses.length;
    const completedCourses = courses.filter(course => course.isCompleted).length;
    const avgProgress = courses.length > 0
      ? Math.round(courses.reduce((acc, course) => acc + course.completionPercentage, 0) / courses.length)
      : 0;
    
    return { totalCourses, completedCourses, avgProgress };
  }, [courses]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Corsi</Text>
      </View>
      
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.secondary} />
          <Text style={styles.loadingText}>Caricamento corsi...</Text>
        </View>
      )}

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
          {!YOUTUBE_CHANNEL_ID && (
            <Text style={styles.errorHint}>
              Configura EXPO_PUBLIC_YOUTUBE_CHANNEL_ID nel file .env
            </Text>
          )}
        </View>
      )}

      {!loading && !error && (
        <>
          {!YOUTUBE_CHANNEL_ID ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>⚠️ Channel ID non configurato</Text>
              <Text style={styles.errorHint}>
                Per caricare i corsi dal tuo canale YouTube, aggiungi nel file .env:{'\n\n'}
                EXPO_PUBLIC_YOUTUBE_CHANNEL_ID=YOUR_CHANNEL_ID{'\n\n'}
                Come trovare il Channel ID:{'\n'}
                • Vai al tuo canale YouTube{'\n'}
                • L'URL è: youtube.com/channel/UC...{'\n'}
                • L'ID è la parte dopo /channel/ (es. UCxxxxxxxxxxxxxxxxxxxxxxxxxx)
              </Text>
            </View>
          ) : (
            <>
              <View style={styles.statsContainer}>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{stats.totalCourses}</Text>
                  <Text style={styles.statLabel}>Corsi</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{stats.completedCourses}</Text>
                  <Text style={styles.statLabel}>Completati</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{stats.avgProgress}%</Text>
                  <Text style={styles.statLabel}>Progresso</Text>
                </View>
              </View>

              <FlatList
                data={courses}
                renderItem={renderCourse}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.coursesList}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>Nessun corso disponibile</Text>
                    <Text style={styles.emptyHint}>
                      Il canale potrebbe non avere playlist pubbliche o potrebbe esserci un problema con l'API key.
                    </Text>
                  </View>
                }
              />
            </>
          )}
        </>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary, // Blu scuro dal tema
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(114, 250, 147, 0.15)',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
    color: theme.colors.secondary, // Verde
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: theme.colors.text.primary, // Verde
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
    color: theme.colors.primary, // Blu
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
    color: theme.colors.primary, // Blu
    opacity: 0.7,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  coursesList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: theme.colors.text.secondary,
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
  },
  errorContainer: {
    margin: 20,
    padding: 16,
    backgroundColor: theme.colors.error,
    borderRadius: 12,
  },
  errorText: {
    color: theme.colors.background.white,
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
    marginBottom: 8,
  },
  errorHint: {
    color: theme.colors.background.white,
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
    opacity: 0.8,
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
    marginBottom: 8,
  },
  emptyHint: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
    opacity: 0.7,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});

export default CoursesScreen;
