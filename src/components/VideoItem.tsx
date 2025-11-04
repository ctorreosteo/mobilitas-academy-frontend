import React from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity } from 'react-native';
// @ts-ignore - @expo/vector-icons è parte di Expo SDK
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import { Video } from '../types';

interface VideoItemProps {
  video: Video;
  onPress: () => void;
}

const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const VideoItem: React.FC<VideoItemProps> = ({ video, onPress }) => {
  return (
    <TouchableOpacity 
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.videoInfo}>
        <View style={styles.iconContainer}>
          <Ionicons 
            name={video.isCompleted ? 'checkmark-circle' : 'play-circle-outline'} 
            size={24} 
            color={video.isCompleted ? theme.colors.secondary : theme.colors.text.secondary} 
          />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.title} numberOfLines={2}>
            {video.title}
          </Text>
          <Text style={styles.duration}>
            {formatDuration(video.duration)}
          </Text>
        </View>
        <Ionicons 
          name="chevron-forward" 
          size={20} 
          color={theme.colors.text.secondary} 
          style={styles.chevron}
        />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
    marginBottom: 8,
  },
  videoInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  iconContainer: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
    marginLeft: 12,
  },
  title: {
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
    color: theme.colors.text.secondary,
    fontWeight: '500',
    marginBottom: 4,
    lineHeight: 20,
  },
  duration: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
    color: theme.colors.text.secondary,
    opacity: 0.6,
  },
  chevron: {
    opacity: 0.4,
    marginLeft: 8,
  },
});

export default VideoItem;

