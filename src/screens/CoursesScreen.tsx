import React, { useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
// @ts-ignore - @expo/vector-icons è parte di Expo SDK
import { Ionicons } from '@expo/vector-icons';
import { theme, withOpacity } from '../theme';
import CourseCard from '../components/CourseCard';
import { Course } from '../types';
import { useFormazioneCourses } from '../hooks/useFormazioneCourses';
import { isAxiosError } from 'axios';

function coursesErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    const status = error.response?.status;
    if (status === 401 || status === 403) {
      return 'Accesso negato: effettua il login e assicurati che il token JWT sia salvato nell’app.';
    }
    if (!error.response) {
      return 'Impossibile raggiungere il server. Controlla la rete o verifica che il backend sia avviato.';
    }
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return 'Si è verificato un errore nel caricamento dei corsi.';
}

const CoursesScreen: React.FC = () => {
  const { data: courses = [], isPending, isError, error, refetch, isRefetching } =
    useFormazioneCourses();

  const renderCourse = useCallback(
    ({ item }: { item: Course }) => (
      <CourseCard
        course={item}
        title={item.title}
        instructor={item.instructor}
        duration={item.duration}
        completionPercentage={item.completionPercentage}
        isCompleted={item.isCompleted}
        coverImage={item.coverImage}
        isLocked={item.formazioneAttivo === false}
      />
    ),
    []
  );

  const stats = useMemo(() => {
    const totalCourses = courses.length;
    const completedCourses = courses.filter((course) => course.isCompleted).length;
    const avgProgress =
      courses.length > 0
        ? Math.round(
            courses.reduce((acc, course) => acc + course.completionPercentage, 0) /
              courses.length
          )
        : 0;

    return { totalCourses, completedCourses, avgProgress };
  }, [courses]);

  const listHeader = useMemo(
    () =>
      isError && courses.length > 0 ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{coursesErrorMessage(error)}</Text>
        </View>
      ) : null,
    [isError, error, courses.length]
  );

  if (isPending && courses.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Corsi</Text>
          <Text style={styles.headerSubtitle}>Sto caricando il catalogo formazione...</Text>
        </View>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.colors.secondary} />
          <Text style={styles.loadingHint}>Caricamento corsi…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Corsi</Text>
        <Text style={styles.headerSubtitle}>
          Catalogo aggiornato con stato accesso, progresso e ripresa rapida.
        </Text>
      </View>
      <View style={styles.headerBadge}>
        <Ionicons name="book-outline" size={14} color={theme.colors.text.primary} />
        <Text style={styles.headerBadgeText}>Area formazione</Text>
      </View>
      <View style={styles.dividerWrap}>
        <View style={styles.dividerLine} />
        <View style={styles.dividerIconWrap}>
          <Ionicons name="library-outline" size={15} color={theme.colors.secondary} />
        </View>
        <View style={styles.dividerLine} />
      </View>

      <View style={styles.statsCard}>
        <View style={styles.statItem}>
          <View style={styles.statIconWrap}>
            <Ionicons name="library-outline" size={16} color={withOpacity(theme.colors.secondary, 0.95)} />
          </View>
          <Text style={styles.statNumber}>{stats.totalCourses}</Text>
          <Text style={styles.statLabel}>Totali</Text>
        </View>
        <View style={styles.statItem}>
          <View style={styles.statIconWrap}>
            <Ionicons
              name="checkmark-circle-outline"
              size={16}
              color={withOpacity(theme.colors.secondary, 0.95)}
            />
          </View>
          <Text style={styles.statNumber}>{stats.completedCourses}</Text>
          <Text style={styles.statLabel}>Completati</Text>
        </View>
        <View style={styles.statItem}>
          <View style={styles.statIconWrap}>
            <Ionicons name="trending-up-outline" size={16} color={withOpacity(theme.colors.secondary, 0.95)} />
          </View>
          <Text style={styles.statNumber}>{stats.avgProgress}%</Text>
          <Text style={styles.statLabel}>Media</Text>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionHeaderTitle}>Elenco corsi</Text>
        <Text style={styles.sectionHeaderHint}>Scorri per vedere e aprire i contenuti</Text>
      </View>

      <FlatList
        data={courses}
        renderItem={renderCourse}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.coursesList}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={listHeader}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => refetch()}
            tintColor={theme.colors.secondary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {isError ? coursesErrorMessage(error) : 'Nessun corso disponibile'}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#001831',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: theme.colors.secondary,
    letterSpacing: 0.3,
    textShadowColor: withOpacity(theme.colors.black, 0.25),
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  headerSubtitle: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    color: withOpacity(theme.colors.text.secondary, 0.78),
  },
  headerBadge: {
    alignSelf: 'flex-start',
    marginLeft: 20,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: withOpacity(theme.colors.secondary, 0.3),
    backgroundColor: withOpacity(theme.colors.secondary, 0.09),
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  headerBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: withOpacity(theme.colors.text.primary, 0.94),
    letterSpacing: 0.35,
  },
  dividerWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 22,
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: withOpacity(theme.colors.secondary, 0.16),
  },
  dividerIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: withOpacity(theme.colors.secondary, 0.26),
    backgroundColor: withOpacity(theme.colors.secondary, 0.06),
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  loadingHint: {
    marginTop: 12,
    fontSize: 15,
    color: theme.colors.text.secondary,
  },
  errorBanner: {
    backgroundColor: withOpacity(theme.colors.error, 0.12),
    borderWidth: 1,
    borderColor: withOpacity(theme.colors.error, 0.35),
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    color: theme.colors.text.primary,
  },
  statsCard: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'stretch',
    paddingHorizontal: 10,
    paddingVertical: 12,
    backgroundColor: '#07284A',
    borderWidth: 1,
    borderColor: withOpacity(theme.colors.secondary, 0.22),
    marginHorizontal: 20,
    marginTop: 8,
    borderRadius: 18,
    marginBottom: 14,
    shadowColor: theme.colors.black,
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 7,
  },
  statItem: {
    alignItems: 'center',
    minWidth: 80,
    paddingVertical: 6,
  },
  statIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: withOpacity(theme.colors.secondary, 0.26),
    backgroundColor: withOpacity(theme.colors.secondary, 0.08),
    marginBottom: 4,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: '#D7FFE2',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: withOpacity(theme.colors.secondary, 0.72),
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  sectionHeader: {
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 8,
  },
  sectionHeaderTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.titlePrimary,
    letterSpacing: 0.25,
  },
  sectionHeaderHint: {
    marginTop: 2,
    fontSize: 13,
    color: withOpacity(theme.colors.text.secondary, 0.72),
  },
  coursesList: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    textAlign: 'center',
  },
});

export default CoursesScreen;
