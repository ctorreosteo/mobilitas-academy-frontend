import React, { useState } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import { Chapter, Video } from '../types';
import VideoItem from './VideoItem';

interface ChapterSectionProps {
  chapter: Chapter;
  videos: Video[];
  onVideoPress: (video: Video) => void;
}

const ChapterSection: React.FC<ChapterSectionProps> = ({ chapter, videos, onVideoPress }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const chapterVideos = videos.filter(v => v.chapterId === chapter.id).sort((a, b) => a.order - b.order);
  const completedCount = chapterVideos.filter(v => v.isCompleted).length;

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.header}
        onPress={() => setIsExpanded(!isExpanded)}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          <View style={styles.chapterNumber}>
            <Text style={styles.chapterNumberText}>{chapter.order}</Text>
          </View>
          <View style={styles.headerText}>
            <Text style={styles.chapterTitle}>{chapter.title}</Text>
            <Text style={styles.chapterInfo}>
              {chapterVideos.length} video • {completedCount}/{chapterVideos.length} completati
            </Text>
          </View>
        </View>
        <Ionicons 
          name={isExpanded ? 'chevron-up' : 'chevron-down'} 
          size={20} 
          color={theme.colors.text.secondary} 
          style={styles.chevron}
        />
      </TouchableOpacity>
      
      {isExpanded && (
        <View style={styles.videosContainer}>
          {chapterVideos.map((video) => (
            <VideoItem 
              key={video.id} 
              video={video} 
              onPress={() => onVideoPress(video)}
            />
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(114, 250, 147, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(114, 250, 147, 0.1)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  chapterNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  chapterNumberText: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
    color: theme.colors.primary,
  },
  headerText: {
    flex: 1,
  },
  chapterTitle: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
    color: theme.colors.text.secondary,
    marginBottom: 4,
  },
  chapterInfo: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
    color: theme.colors.text.secondary,
    opacity: 0.6,
  },
  chevron: {
    opacity: 0.5,
  },
  videosContainer: {
    marginTop: 12,
    paddingHorizontal: 20,
  },
});

export default ChapterSection;

