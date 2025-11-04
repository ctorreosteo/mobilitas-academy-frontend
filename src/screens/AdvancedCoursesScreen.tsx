import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Platform, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../theme';
import AdvancedCourseCard from '../components/AdvancedCourseCard';
import { Course } from '../types';
import { useCloudflareCourses } from '../hooks/useCloudflareCourses';

const AdvancedCoursesScreen: React.FC = () => {
  // Carica i corsi avanzati da Cloudflare
  const { courses, loading, error } = useCloudflareCourses();

  const renderCourse = ({ item }: { item: Course }) => (
    <AdvancedCourseCard
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
        <Text style={styles.headerTitle}>Corsi Avanzati</Text>
        <View style={styles.sourceBadge}>
          <Text style={styles.sourceBadgeText}>
            📚 Corsi da Cloudflare
          </Text>
        </View>
      </View>
      
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.secondary} />
          <Text style={styles.loadingText}>Caricamento corsi avanzati...</Text>
        </View>
      )}

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
          <Text style={styles.errorHint}>
            Verifica la configurazione di EXPO_PUBLIC_CLOUDFLARE_API_URL e EXPO_PUBLIC_CLOUDFLARE_API_TOKEN nel file .env
          </Text>
        </View>
      )}

      {!loading && !error && (
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
                <Text style={styles.emptyText}>Nessun corso avanzato disponibile</Text>
                <Text style={styles.emptyHint}>
                  Possibili cause:{'\n'}
                  • Non ci sono video caricati su Cloudflare Stream{'\n'}
                  • I video non hanno il metadata "course" configurato{'\n'}
                  • Errore nella connessione all'API Cloudflare{'\n'}
                  {'\n'}
                  Controlla la console per i dettagli. Se hai video caricati, assicurati che abbiano il metadata "course" nel formato JSON.
                </Text>
              </View>
            }
          />
        </>
      )}
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
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(114, 250, 147, 0.15)',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
    color: theme.colors.secondary,
  },
  sourceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(114, 250, 147, 0.1)',
    alignSelf: 'flex-start',
  },
  sourceBadgeText: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
    color: theme.colors.secondary,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: theme.colors.text.primary,
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
    color: theme.colors.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
    color: theme.colors.primary,
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

export default AdvancedCoursesScreen;

