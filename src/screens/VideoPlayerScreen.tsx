import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Platform, ScrollView, TouchableOpacity, Image, Dimensions, Modal, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useRoute } from '@react-navigation/native';
// @ts-ignore - @expo/vector-icons è parte di Expo SDK
import { Ionicons } from '@expo/vector-icons';
import { Video as ExpoVideo, ResizeMode, Audio } from 'expo-av';
import * as ScreenOrientation from 'expo-screen-orientation';
import { theme, withOpacity } from '../theme';
import { Video, Course } from '../types';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

type VideoPlayerRouteParams = { video: Video; course?: Course };

type VideoPlayerScreenRouteProp = RouteProp<
  { VideoPlayer: VideoPlayerRouteParams },
  'VideoPlayer'
>;

const VideoPlayerScreen: React.FC = () => {
  const route = useRoute<VideoPlayerScreenRouteProp>();
  const { video, course } = route.params;
  const [isPlaying, setIsPlaying] = useState(false);
  const [showPlayButton, setShowPlayButton] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [savedPlaybackStatus, setSavedPlaybackStatus] = useState({ positionMillis: 0, shouldPlay: false });
  const videoRef = useRef<ExpoVideo>(null);
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  const isHLSVideo = video.url && video.url.includes('.m3u8');

  const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] as const;

  // Configura la modalità audio per la riproduzione video (necessario per sentire l'audio HLS su iOS/Android)
  useEffect(() => {
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      interruptionModeIOS: 1, // DoNotMix
      shouldDuckAndroid: true,
      interruptionModeAndroid: 2, // DuckOthers
      playThroughEarpieceAndroid: false,
    }).catch((err) => console.warn('setAudioModeAsync:', err));
  }, []);

  const formatDuration = (seconds: number): string => {
    if (seconds <= 0) return '—';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePlayPause = async () => {
    if (isHLSVideo && videoRef.current) {
      try {
        if (isPlaying) {
          await videoRef.current.pauseAsync();
          setIsPlaying(false);
          setShowPlayButton(true);
        } else {
          await videoRef.current.playAsync();
          setIsPlaying(true);
          setShowPlayButton(false);
        }
      } catch (error) {
        console.error('Errore nel controllo video:', error);
      }
    }
  };

  const handleToggleMute = async () => {
    if (!isHLSVideo || !videoRef.current) return;
    try {
      const status = await videoRef.current.getStatusAsync();
      if (!status.isLoaded) return;
      const nextMuted = !isMuted;
      await videoRef.current.setStatusAsync({
        isMuted: nextMuted,
        shouldPlay: status.shouldPlay,
      });
      setIsMuted(nextMuted);
    } catch (error) {
      console.error('Errore toggle mute:', error);
    }
  };

  const handleCyclePlaybackRate = async () => {
    if (!isHLSVideo || !videoRef.current) return;
    const currentIndex = PLAYBACK_RATES.indexOf(playbackRate as (typeof PLAYBACK_RATES)[number]);
    const nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % PLAYBACK_RATES.length;
    const nextRate = PLAYBACK_RATES[nextIndex];
    try {
      await videoRef.current.setRateAsync(nextRate, true);
      setPlaybackRate(nextRate);
    } catch (error) {
      console.error('Errore cambio velocità:', error);
    }
  };

  const enterFullscreen = async () => {
    if (!isHLSVideo || !videoRef.current) return;
    try {
      const status = await videoRef.current.getStatusAsync();
      if (status.isLoaded) {
        setSavedPlaybackStatus({
          positionMillis: status.positionMillis ?? 0,
          shouldPlay: status.shouldPlay ?? false,
        });
        setIsFullscreen(true);
        await ScreenOrientation.unlockAsync();
      }
    } catch (e) {
      console.warn('enterFullscreen:', e);
    }
  };

  const exitFullscreen = async () => {
    if (!videoRef.current) return;
    try {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT);
      const status = await videoRef.current.getStatusAsync();
      if (status.isLoaded) {
        setSavedPlaybackStatus({
          positionMillis: status.positionMillis ?? 0,
          shouldPlay: status.shouldPlay ?? false,
        });
      }
    } catch (e) {
      console.warn('exitFullscreen:', e);
    }
    setIsFullscreen(false);
  };

  return (
    <>
      {/* Fullscreen modal: video + controlli (velocità, mute) sempre visibili */}
      <Modal
        visible={isFullscreen}
        animationType="fade"
        statusBarTranslucent
        onRequestClose={exitFullscreen}
      >
        <View style={[styles.fullscreenContainer, { width: windowWidth, height: windowHeight }]}>
          {isHLSVideo && (
            <>
              <ExpoVideo
                ref={videoRef}
                style={[styles.fullscreenVideo, { width: windowWidth, height: windowHeight }]}
                source={{ uri: video.url }}
                useNativeControls={true}
                resizeMode={ResizeMode.CONTAIN}
                volume={isMuted ? 0 : 1}
                isMuted={isMuted}
                rate={playbackRate}
                shouldCorrectPitch={true}
                status={{
                  positionMillis: savedPlaybackStatus.positionMillis,
                  shouldPlay: savedPlaybackStatus.shouldPlay,
                }}
                onPlaybackStatusUpdate={(status) => {
                  if (status.isLoaded) {
                    if (status.isPlaying) {
                      setIsPlaying(true);
                      setShowPlayButton(false);
                    } else {
                      setIsPlaying(false);
                      setShowPlayButton(true);
                    }
                    if (status.isMuted !== undefined) setIsMuted(status.isMuted);
                  }
                }}
                onError={() => setShowPlayButton(true)}
              />
              <TouchableOpacity style={styles.fullscreenCloseButton} onPress={exitFullscreen} activeOpacity={0.8}>
                <Ionicons name="contract" size={28} color={theme.colors.text.secondary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.fullscreenMuteButton} onPress={handleToggleMute} activeOpacity={0.8}>
                <Ionicons name={isMuted ? 'volume-mute' : 'volume-high'} size={24} color={theme.colors.text.secondary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.fullscreenSpeedButton} onPress={handleCyclePlaybackRate} activeOpacity={0.8}>
                <Text style={styles.speedButtonText}>{playbackRate === 1 ? '1×' : `${playbackRate}×`}</Text>
              </TouchableOpacity>
              <View style={styles.fullscreenDurationBadge}>
                <Text style={styles.durationText}>{formatDuration(video.duration)}</Text>
              </View>
            </>
          )}
        </View>
      </Modal>

    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.videoContainer}>
          {isHLSVideo ? (
            <>
              {!isFullscreen && (
                <>
                  <ExpoVideo
                    ref={videoRef}
                    style={styles.hlsVideo}
                    source={{ uri: video.url }}
                    useNativeControls={true}
                    resizeMode={ResizeMode.CONTAIN}
                    volume={isMuted ? 0 : 1}
                    isMuted={isMuted}
                    rate={playbackRate}
                    shouldCorrectPitch={true}
                    status={{
                      positionMillis: savedPlaybackStatus.positionMillis,
                      shouldPlay: savedPlaybackStatus.shouldPlay,
                    }}
                    onPlaybackStatusUpdate={(status) => {
                  if (status.isLoaded) {
                    if (status.isPlaying) {
                      setIsPlaying(true);
                      setShowPlayButton(false);
                    } else {
                      setIsPlaying(false);
                      setShowPlayButton(true);
                    }
                    if (status.isMuted !== undefined) setIsMuted(status.isMuted);
                  }
                }}
                onError={(error) => {
                  console.error('Video Player Error:', error);
                  setShowPlayButton(true);
                }}
              />
              {isHLSVideo && (
                <TouchableOpacity
                  style={styles.muteButton}
                  onPress={handleToggleMute}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={isMuted ? 'volume-mute' : 'volume-high'}
                    size={24}
                    color={theme.colors.text.secondary}
                  />
                </TouchableOpacity>
              )}
              {showPlayButton && (
                <TouchableOpacity
                  style={styles.playButtonContainer}
                  onPress={handlePlayPause}
                  activeOpacity={0.8}
                >
                  <View style={styles.playButton}>
                    <Ionicons
                      name="play"
                      size={40}
                      color={theme.colors.primary}
                    />
                  </View>
                </TouchableOpacity>
              )}
              <View style={styles.durationBadge}>
                <Text style={styles.durationText}>{formatDuration(video.duration)}</Text>
              </View>
              {isHLSVideo && (
                <TouchableOpacity
                  style={styles.speedButton}
                  onPress={handleCyclePlaybackRate}
                  activeOpacity={0.8}
                >
                  <Text style={styles.speedButtonText}>
                    {playbackRate === 1 ? '1×' : `${playbackRate}×`}
                  </Text>
                </TouchableOpacity>
              )}
                </>
              )}
            </>
          ) : (
            <>
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
              <View style={styles.durationBadge}>
                <Text style={styles.durationText}>{formatDuration(video.duration)}</Text>
              </View>
            </>
          )}
        </View>

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

        {video.description && (
          <View style={styles.descriptionContainer}>
            <Text style={styles.descriptionTitle}>Descrizione</Text>
            <Text style={styles.descriptionText}>{video.description}</Text>
          </View>
        )}

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
    </>
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
    height: screenWidth * 0.5625,
    backgroundColor: theme.colors.black,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenContainer: {
    flex: 1,
    backgroundColor: theme.colors.black,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenVideo: {
    backgroundColor: theme.colors.black,
  },
  fullscreenCloseButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 40,
    left: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: withOpacity(theme.colors.black, 0.6),
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  fullscreenMuteButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 40,
    right: 80,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: withOpacity(theme.colors.black, 0.6),
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  fullscreenSpeedButton: {
    position: 'absolute',
    bottom: 100,
    right: 16,
    minWidth: 48,
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: withOpacity(theme.colors.black, 0.7),
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  fullscreenDurationBadge: {
    position: 'absolute',
    bottom: 100,
    left: 16,
    backgroundColor: withOpacity(theme.colors.black, 0.7),
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    zIndex: 10,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    opacity: 0.8,
  },
  thumbnailPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: withOpacity(theme.colors.black, 0.5),
    justifyContent: 'center',
    alignItems: 'center',
  },
  hlsVideo: {
    width: '100%',
    height: '100%',
    backgroundColor: theme.colors.black,
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
    shadowColor: theme.colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  durationBadge: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    backgroundColor: withOpacity(theme.colors.black, 0.7),
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  speedButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    minWidth: 44,
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: withOpacity(theme.colors.black, 0.7),
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
  },
  speedButtonText: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
    color: theme.colors.secondary,
  },
  muteButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: withOpacity(theme.colors.black, 0.6),
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
  },
  durationText: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
    color: theme.colors.secondary,
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
    borderBottomColor: withOpacity(theme.colors.secondary, 0.1),
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
    backgroundColor: withOpacity(theme.colors.secondary, 0.05),
    borderRadius: 16,
    borderWidth: 1,
    borderColor: withOpacity(theme.colors.secondary, 0.1),
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
