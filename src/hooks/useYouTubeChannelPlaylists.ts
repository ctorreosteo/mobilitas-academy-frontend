import { useState, useEffect, useRef } from 'react';
import { fetchChannelPlaylists, fetchPlaylistVideos } from '../services/youtubeService';
import { Course } from '../types';

interface UseYouTubeChannelPlaylistsResult {
  courses: Course[];
  loading: boolean;
  error: string | null;
}

/**
 * Hook per recuperare tutti i corsi da un canale YouTube
 * Ogni playlist diventa un corso
 */
export function useYouTubeChannelPlaylists(channelId: string | undefined): UseYouTubeChannelPlaylistsResult {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastChannelIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    // Evita ricaricamenti se l'ID canale non è cambiato
    if (channelId === lastChannelIdRef.current) {
      return;
    }

    if (!channelId) {
      setCourses([]);
      setLoading(false);
      setError(null);
      lastChannelIdRef.current = undefined;
      return;
    }

    // Aggiorna il riferimento
    lastChannelIdRef.current = channelId;

    let cancelled = false;

    const loadCourses = async () => {
      setLoading(true);
      setError(null);

      try {
        console.log('🔄 Caricamento playlist dal canale YouTube:', channelId);
        
        // Recupera tutte le playlist del canale
        const playlists = await fetchChannelPlaylists(channelId);
        
        if (cancelled) return;

        if (playlists.length === 0) {
          setCourses([]);
          setLoading(false);
          return;
        }

        // Per ogni playlist, crea un corso e calcola la durata totale
        const coursesWithDuration = await Promise.all(
          playlists.map(async (playlist) => {
            try {
              // Recupera i video della playlist per calcolare la durata totale
              const videos = await fetchPlaylistVideos(playlist.id);
              const totalDurationSeconds = videos.reduce((acc, v) => acc + v.duration, 0);
              const totalDurationMinutes = Math.round(totalDurationSeconds / 60);

              const course: Course = {
                id: `yt-course-${playlist.id}`,
                title: playlist.snippet.title,
                description: playlist.snippet.description || 'Nessuna descrizione disponibile',
                instructor: playlist.snippet.channelTitle || 'Studio Osteopatico',
                duration: totalDurationMinutes,
                isCompleted: false,
                completionPercentage: 0,
                category: 'YouTube',
                difficulty: 'Intermedio',
                coverImage: playlist.snippet.thumbnails?.high?.url || 
                           playlist.snippet.thumbnails?.medium?.url || 
                           playlist.snippet.thumbnails?.default?.url,
                youtubePlaylistId: playlist.id,
              };

              return course;
            } catch (err) {
              console.warn(`Errore nel caricamento video per playlist ${playlist.id}:`, err);
              // Restituisce comunque il corso anche se non riesce a caricare i video
              return {
                id: `yt-course-${playlist.id}`,
                title: playlist.snippet.title,
                description: playlist.snippet.description || 'Nessuna descrizione disponibile',
                instructor: playlist.snippet.channelTitle || 'Studio Osteopatico',
                duration: 0,
                isCompleted: false,
                completionPercentage: 0,
                category: 'YouTube',
                difficulty: 'Intermedio',
                coverImage: playlist.snippet.thumbnails?.high?.url || 
                           playlist.snippet.thumbnails?.medium?.url || 
                           playlist.snippet.thumbnails?.default?.url,
                youtubePlaylistId: playlist.id,
              } as Course;
            }
          })
        );

        if (!cancelled) {
          setCourses(coursesWithDuration);
          console.log(`✅ ${coursesWithDuration.length} corsi caricati dal canale`);
        }
      } catch (err) {
        if (!cancelled) {
          const errorMessage = err instanceof Error ? err.message : 'Errore nel caricamento playlist canale';
          setError(errorMessage);
          console.error('❌ Errore useYouTubeChannelPlaylists:', err);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadCourses();

    return () => {
      cancelled = true;
    };
  }, [channelId]);

  return { courses, loading, error };
}

