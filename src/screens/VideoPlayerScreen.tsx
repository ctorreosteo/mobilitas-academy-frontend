import React, { useState } from 'react';
import { View, Text, StyleSheet, Platform, ScrollView, TouchableOpacity, Image, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import { Video, Course } from '../types';
import { mockCourses } from '../data/mockCourses';

const { width: screenWidth } = Dimensions.get('window');

type VideoPlayerScreenRouteProp = RouteProp<{ params: { video: Video } }, 'params'>;

const VideoPlayerScreen: React.FC = () => {
  const route = useRoute<VideoPlayerScreenRouteProp>();
  const { video } = route.params;
  const [isPlaying, setIsPlaying] = useState(false);

  const course = mockCourses.find(c => c.id === video.courseId);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
    // TODO: Implement actual video playback
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Video Player Container */}
        <View style={styles.videoContainer}>
          {video.thumbnail ? (
            <Image 
              source={{ uri: video.thumbnail }} 
              style={styles.thumbnail}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.thumbnailPlaceholder}>
              <Ionicons name="videocam" size={64} color={theme.colors.text.secondary} />
            </View>
          )}
          
          {/* Play Button Overlay */}
          <TouchableOpacity 
            style={styles.playButtonContainer}
            onPress={handlePlayPause}
            activeOpacity={0.8}
          >
            <View style={styles.playButton}>
              <Ionicons 
                name={isPlaying ? 'pause' : 'play'} 
                size={40} 
                color={theme.colors.primary} 
              />
            </View>
          </TouchableOpacity>

          {/* Duration Badge */}
          <View style={styles.durationBadge}>
            <Text style={styles.durationText}>{formatDuration(video.duration)}</Text>
          </View>
        </View>

        {/* Video Info */}
        <View style={styles.infoContainer}>
          <Text style={styles.videoTitle}>{video.title}</Text>
          
          {course && (
            <View style={styles.courseInfo}>
              <Ionicons name="library" size={16} color={theme.colors.text.secondary} style={styles.infoIcon} />
              <Text style={styles.courseName}>{course.title}</Text>
            </View>
          )}

          <View style={styles.metaContainer}>
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={16} color={theme.colors.text.secondary} style={styles.metaIcon} />
              <Text style={styles.metaText}>{formatDuration(video.duration)}</Text>
            </View>
            {video.isCompleted && (
              <View style={styles.metaItem}>
                <Ionicons name="checkmark-circle" size={16} color={theme.colors.secondary} style={styles.metaIcon} />
                <Text style={[styles.metaText, styles.completedText]}>Completato</Text>
              </View>
            )}
          </View>
        </View>

        {/* Description */}
        {video.description && (
          <View style={styles.descriptionContainer}>
            <Text style={styles.descriptionTitle}>Descrizione</Text>
            <Text style={styles.descriptionText}>{video.description}</Text>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.primaryButton]}
            activeOpacity={0.8}
          >
            <Ionicons name="checkmark-circle-outline" size={20} color={theme.colors.primary} />
            <Text style={styles.primaryButtonText}>
              {video.isCompleted ? 'Segna come non completato' : 'Segna come completato'}
            </Text>
          </TouchableOpacity>
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
  videoContainer: {
    width: screenWidth,
    height: screenWidth * 0.5625, // 16:9 aspect ratio
    backgroundColor: '#000',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    opacity: 0.8,
  },
  thumbnailPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButtonContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  durationBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  durationText: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
    color: theme.colors.text.secondary,
    fontWeight: '600',
  },
  infoContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  videoTitle: {
    fontSize: 24,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
    color: theme.colors.text.secondary,
    marginBottom: 12,
    lineHeight: 32,
  },
  courseInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(114, 250, 147, 0.1)',
  },
  infoIcon: {
    marginRight: 8,
    opacity: 0.7,
  },
  courseName: {
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
    color: theme.colors.text.secondary,
    opacity: 0.8,
  },
  metaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaIcon: {
    marginRight: 6,
    opacity: 0.6,
  },
  metaText: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
    color: theme.colors.text.secondary,
    opacity: 0.7,
  },
  completedText: {
    color: theme.colors.secondary,
    opacity: 1,
  },
  descriptionContainer: {
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 24,
    padding: 20,
    backgroundColor: 'rgba(114, 250, 147, 0.05)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(114, 250, 147, 0.1)',
  },
  descriptionTitle: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
    color: theme.colors.text.secondary,
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
    color: theme.colors.text.secondary,
    opacity: 0.85,
    lineHeight: 24,
  },
  actionsContainer: {
    paddingHorizontal: 20,
    marginTop: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 10,
  },
  primaryButton: {
    backgroundColor: theme.colors.secondary,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
    color: theme.colors.primary,
  },
});

export default VideoPlayerScreen;

