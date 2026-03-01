import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { theme } from '../theme';
import { Course, Video } from '../types';
import { mockChapters } from '../data/mockChapters';
import { courseVideos } from '../data/videos';
import ChapterSection from '../components/ChapterSection';
import { getCachedDurationFromHls } from '../utils/hlsDuration';

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

  const courseChapters = useMemo(() =>
    mockChapters
      .filter(ch => ch.courseId === course.id)
      .sort((a, b) => a.order - b.order),
    [course.id]
  );

  const courseVideosList = useMemo(() =>
    courseVideos
      .filter(v => v.courseId === course.id)
      .sort((a, b) => a.order - b.order),
    [course.id]
  );

  const [videosWithDuration, setVideosWithDuration] = useState<Video[]>(courseVideosList);
  const [loadingDurations, setLoadingDurations] = useState(true);

  useEffect(() => {
    setVideosWithDuration(courseVideosList);
    const needDuration = courseVideosList.filter(
      v => (v.duration <= 0 || !v.duration) && v.url?.includes('.m3u8')
    );
    if (needDuration.length === 0) {
      setLoadingDurations(false);
      return;
    }
    let cancelled = false;
    setLoadingDurations(true);
    Promise.all(
      needDuration.map(async (video) => {
        const duration = await getCachedDurationFromHls(video.url || '');
        return { id: video.id, duration };
      })
    ).then((results) => {
      if (cancelled) return;
      const byId = new Map(results.map((r) => [r.id, r.duration]));
      setVideosWithDuration((prev) =>
        prev.map((v) => {
          const d = byId.get(v.id);
          return d !== undefined ? { ...v, duration: d } : v;
        })
      );
      setLoadingDurations(false);
    }).catch(() => setLoadingDurations(false));
    return () => { cancelled = true; };
  }, [courseVideosList]);

  const handleVideoPress = (video: Video) => {
    navigation.navigate('VideoPlayer', { video });
  };

  const totalDuration = useMemo(() =>
    videosWithDuration.reduce((acc, v) => acc + v.duration, 0),
    [videosWithDuration]
  );
  const completedVideos = videosWithDuration.filter(v => v.isCompleted).length;
  const progressPercentage = videosWithDuration.length > 0
    ? Math.round((completedVideos / videosWithDuration.length) * 100)
    : 0;

  const formatTotalDuration = (seconds: number): string => {
    if (seconds <= 0) return '—';
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
    if (hours > 0) return `${hours}h`;
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
            <Text style={styles.statValue}>{courseChapters.length}</Text>
            <Text style={styles.statLabel}>Moduli</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{videosWithDuration.length}</Text>
            <Text style={styles.statLabel}>Video</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue} numberOfLines={1}>
              {loadingDurations && totalDuration === 0 ? '...' : formatTotalDuration(totalDuration)}
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
                { width: `${progressPercentage}%` },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {completedVideos} di {videosWithDuration.length} video completati
          </Text>
        </View>

        <View style={styles.chaptersContainer}>
          {courseChapters.map((chapter) => {
            const chapterVideos = videosWithDuration.filter(v => v.chapterId === chapter.id);
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
});

export default CourseVideosScreen;
