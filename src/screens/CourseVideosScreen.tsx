import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
// @ts-ignore - @expo/vector-icons è parte di Expo SDK
import { Ionicons } from '@expo/vector-icons';
import { theme, withOpacity } from '../theme';
import { Course, Video, Chapter } from '../types';
import ChapterSection from '../components/ChapterSection';
import { getCachedDurationFromHls } from '../utils/hlsDuration';
import { loadCourseContent } from '../services/courseContent';
import { useTabBarBottomPadding } from '../hooks/useTabBarBottomPadding';
import type { CorsiStackParamList } from './corsi/types';

/** Righe di descrizione visibili quando il riquadro è compresso. */
const COLLAPSED_DESCRIPTION_LINES = 2;

type CourseVideosScreenRouteProp = RouteProp<CorsiStackParamList, 'CourseVideos'>;
type NavigationProp = StackNavigationProp<CorsiStackParamList, 'VideoPlayer'>;

const CourseVideosScreen: React.FC = () => {
  const tabBarPad = useTabBarBottomPadding();
  const route = useRoute<CourseVideosScreenRouteProp>();
  const navigation = useNavigation<NavigationProp>();
  const { course } = route.params;

  /** Corso mostrato in pagina: il param di navigazione, poi il dettaglio remoto. */
  const [displayCourse, setDisplayCourse] = useState<Course>(course);
  const [courseChapters, setCourseChapters] = useState<Chapter[]>([]);
  /** Solo da API: l’effetto durate dipende da questo per evitare loop. */
  const [sourceVideos, setSourceVideos] = useState<Video[]>([]);
  const [videosWithDuration, setVideosWithDuration] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setLoadError(null);
        setDisplayCourse(course);
        setDisplayCourse(course);
        const { chapters, videos, course: refreshedCourse } = await loadCourseContent(course);
        if (cancelled) return;
        if (refreshedCourse) {
          setDisplayCourse(refreshedCourse);
        }
        setCourseChapters(chapters);
        setSourceVideos(videos);
        setVideosWithDuration(videos);
      } catch (e) {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : 'Errore nel caricamento del corso');
          setCourseChapters([]);
          setSourceVideos([]);
          setVideosWithDuration([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [course]);

  useEffect(() => {
    const needDuration = sourceVideos.filter(
      (v) => (v.duration <= 0 || !v.duration) && v.url?.includes('.m3u8')
    );
    if (needDuration.length === 0) {
      setVideosWithDuration(sourceVideos);
      return;
    }
    let cancelled = false;
    Promise.all(
      needDuration.map(async (video) => {
        const duration = await getCachedDurationFromHls(video.url || '');
        return { id: video.id, duration };
      })
    )
      .then((results) => {
        if (cancelled) return;
        const byId = new Map(results.map((r) => [r.id, r.duration]));
        setVideosWithDuration(
          sourceVideos.map((v) => {
            const d = byId.get(v.id);
            return d !== undefined ? { ...v, duration: d } : v;
          })
        );
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [sourceVideos]);

  const handleVideoPress = (video: Video) => {
    navigation.navigate('VideoPlayer', { video, course: displayCourse });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.colors.secondary} />
          <Text style={styles.loadingText}>Caricamento moduli e lezioni…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <Text style={styles.courseTitle}>{displayCourse.title}</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 32 + tabBarPad }]}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          style={styles.descriptionContainer}
          onPress={() => setDescriptionExpanded((expanded) => !expanded)}
          activeOpacity={0.7}
        >
          <View style={styles.descriptionHeader}>
            <Text style={styles.descriptionTitle}>Descrizione</Text>
            <Ionicons
              name={descriptionExpanded ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={theme.colors.text.secondary}
              style={styles.descriptionChevron}
            />
          </View>
          <Text
            style={styles.descriptionText}
            numberOfLines={descriptionExpanded ? undefined : COLLAPSED_DESCRIPTION_LINES}
          >
            {displayCourse.description}
          </Text>
        </TouchableOpacity>
        <View style={styles.headerBadge}>
          <Ionicons name="bookmarks-outline" size={14} color={theme.colors.text.primary} />
          <Text style={styles.headerBadgeText}>Dettaglio corso</Text>
        </View>
        <View style={styles.dividerWrap}>
          <View style={styles.dividerLine} />
          <View style={styles.dividerIconWrap}>
            <Ionicons name="play-circle-outline" size={15} color={theme.colors.secondary} />
          </View>
          <View style={styles.dividerLine} />
        </View>

        {loadError ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{loadError}</Text>
          </View>
        ) : null}

        <View style={styles.chaptersContainer}>
          {courseChapters.length === 0 && !loadError ? (
            <Text style={styles.emptyHint}>Nessun modulo disponibile per questo corso.</Text>
          ) : null}
          {courseChapters.map((chapter) => {
            const chapterVideos = videosWithDuration
              .filter((v) => v.chapterId === chapter.id)
              .sort((a, b) => a.order - b.order);
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
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: theme.colors.text.secondary,
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
  },
  errorBanner: {
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 14,
    borderRadius: 12,
    backgroundColor: withOpacity(theme.colors.error, 0.12),
  },
  errorText: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
  },
  emptyHint: {
    fontSize: 15,
    color: theme.colors.text.secondary,
    opacity: 0.75,
    textAlign: 'center',
    paddingVertical: 16,
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
  },
  scrollContent: {
    paddingTop: 4,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 16,
    backgroundColor: theme.colors.background.primary,
  },
  courseTitle: {
    fontSize: 28,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
    color: theme.colors.secondary,
    lineHeight: 36,
  },
  descriptionContainer: {
    marginHorizontal: 20,
    marginBottom: 24,
    padding: 16,
    backgroundColor: withOpacity(theme.colors.secondary, 0.05),
    borderRadius: 12,
    borderWidth: 1,
    borderColor: withOpacity(theme.colors.secondary, 0.1),
  },
  descriptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  descriptionTitle: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
    color: theme.colors.text.secondary,
  },
  descriptionChevron: {
    opacity: 0.5,
  },
  descriptionText: {
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
    color: theme.colors.text.secondary,
    opacity: 0.85,
    lineHeight: 22,
  },
  headerBadge: {
    alignSelf: 'flex-start',
    marginLeft: 20,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: withOpacity(theme.colors.secondary, 0.35),
    backgroundColor: withOpacity(theme.colors.secondary, 0.12),
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  headerBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text.primary,
    letterSpacing: 0.2,
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
    backgroundColor: withOpacity(theme.colors.secondary, 0.24),
  },
  dividerIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: withOpacity(theme.colors.secondary, 0.32),
    backgroundColor: withOpacity(theme.colors.secondary, 0.08),
  },
  chaptersContainer: {
    paddingHorizontal: 20,
  },
});

export default CourseVideosScreen;
