import { useState, useEffect, useRef } from 'react';
import { fetchPlaylistVideos, fetchPlaylistInfo } from '../services/youtubeService';
import { Video } from '../types';

interface UseYouTubePlaylistResult {
  videos: Video[];
  loading: boolean;
  error: string | null;
  playlistInfo: {
    title: string;
    description: string;
    thumbnail: string;
    videoCount: number;
  } | null;
}

/**
 * Hook per recuperare i video da una playlist YouTube
 */
export function useYouTubePlaylist(playlistId: string | undefined): UseYouTubePlaylistResult {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playlistInfo, setPlaylistInfo] = useState<UseYouTubePlaylistResult['playlistInfo']>(null);
  const lastPlaylistIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    // Evita ricaricamenti se l'ID playlist non è cambiato
    if (playlistId === lastPlaylistIdRef.current) {
      return;
    }

    if (!playlistId) {
      setVideos([]);
      setPlaylistInfo(null);
      setLoading(false);
      setError(null);
      lastPlaylistIdRef.current = undefined;
      return;
    }

    // Aggiorna il riferimento
    lastPlaylistIdRef.current = playlistId;

    let cancelled = false;

    const loadPlaylist = async () => {
      setLoading(true);
      setError(null);

      try {
        console.log('🔄 Caricamento playlist YouTube:', playlistId);
        
        // Recupera info playlist
        const info = await fetchPlaylistInfo(playlistId);
        if (info && !cancelled) {
          setPlaylistInfo(info);
          console.log('✅ Info playlist recuperate:', info.title);
        }

        // Recupera video
        const playlistVideos = await fetchPlaylistVideos(playlistId);
        if (!cancelled) {
          setVideos(playlistVideos);
          console.log(`✅ ${playlistVideos.length} video caricati`);
        }
      } catch (err) {
        if (!cancelled) {
          const errorMessage = err instanceof Error ? err.message : 'Errore nel caricamento playlist';
          setError(errorMessage);
          console.error('❌ Errore useYouTubePlaylist:', err);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadPlaylist();

    return () => {
      cancelled = true;
    };
  }, [playlistId]);

  return { videos, loading, error, playlistInfo };
}

