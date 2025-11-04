import axios from 'axios';
import { Video, Chapter } from '../types';

// Carica API key da variabile d'ambiente
// IMPORTANTE: Crea un file .env nella root con: EXPO_PUBLIC_YOUTUBE_API_KEY=your_key_here
const YOUTUBE_API_KEY = process.env.EXPO_PUBLIC_YOUTUBE_API_KEY || '';

if (!YOUTUBE_API_KEY && __DEV__) {
  console.warn(
    '⚠️ ⚠️ ⚠️ YouTube API Key non configurata!\n' +
    'Crea un file .env nella root del progetto con:\n' +
    'EXPO_PUBLIC_YOUTUBE_API_KEY=your_api_key_here\n' +
    'Vedi YOUTUBE_SETUP.md per istruzioni dettagliate.'
  );
}
const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

export interface YouTubePlaylistItem {
  id: string;
  snippet: {
    title: string;
    description: string;
    thumbnails: {
      default: { url: string };
      medium: { url: string };
      high: { url: string };
    };
    position: number;
  };
  contentDetails: {
    videoId: string;
    videoPublishedAt: string;
  };
}

export interface YouTubeVideoDetails {
  id: string;
  contentDetails: {
    duration: string; // ISO 8601 format (PT4M13S)
  };
  snippet: {
    title: string;
    description: string;
    thumbnails: {
      default: { url: string };
      medium: { url: string };
      high: { url: string };
    };
  };
}

/**
 * Converte durata ISO 8601 in secondi
 * Es: "PT4M13S" -> 253 secondi, "PT1H2M30S" -> 3750 secondi
 */
function parseDuration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;

  const hours = match[1] ? parseInt(match[1], 10) : 0;
  const minutes = match[2] ? parseInt(match[2], 10) : 0;
  const seconds = match[3] ? parseInt(match[3], 10) : 0;

  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Recupera tutti i video di una playlist YouTube
 */
export async function fetchPlaylistVideos(playlistId: string): Promise<Video[]> {
  if (!YOUTUBE_API_KEY) {
    console.warn('⚠️ YouTube API key non configurata. Crea un file .env con EXPO_PUBLIC_YOUTUBE_API_KEY=your_key');
    throw new Error('YouTube API key non configurata');
  }

  try {
    const videos: Video[] = [];
    let nextPageToken: string | undefined;

    do {
      // Recupera gli item della playlist
      const playlistResponse = await axios.get(`${YOUTUBE_API_BASE}/playlistItems`, {
        params: {
          part: 'snippet,contentDetails',
          playlistId: playlistId,
          maxResults: 50,
          pageToken: nextPageToken,
          key: YOUTUBE_API_KEY,
        },
      });

      const items: YouTubePlaylistItem[] = playlistResponse.data.items || [];

      if (items.length === 0) {
        console.warn('Nessun video trovato nella playlist:', playlistId);
        break;
      }

      // Recupera i dettagli di ogni video (per la durata)
      const videoIds = items.map(item => item.contentDetails?.videoId).filter(Boolean).join(',');
      
      if (!videoIds) {
        console.warn('Nessun video ID valido trovato');
        break;
      }

      const videosResponse = await axios.get(`${YOUTUBE_API_BASE}/videos`, {
        params: {
          part: 'contentDetails,snippet',
          id: videoIds,
          key: YOUTUBE_API_KEY,
        },
      });

      const videoDetails: YouTubeVideoDetails[] = videosResponse.data.items || [];
      const detailsMap = new Map(videoDetails.map(v => [v.id, v]));

      // Combina i dati
      items.forEach((item, index) => {
        const videoId = item.contentDetails?.videoId;
        if (!videoId) return;

        const details = detailsMap.get(videoId);
        if (details) {
          videos.push({
            id: `yt-${videoId}`,
            title: item.snippet?.title || 'Video senza titolo',
            url: `https://www.youtube.com/watch?v=${videoId}`,
            duration: parseDuration(details.contentDetails?.duration || 'PT0S'),
            youtubeVideoId: videoId,
            courseId: '', // Da impostare dopo
            chapterId: '', // Da impostare dopo
            order: item.snippet?.position !== undefined ? item.snippet.position : index,
            isCompleted: false,
            thumbnail: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || '',
            description: item.snippet?.description || details.snippet?.description || '',
          });
        } else {
          console.warn(`Dettagli video non trovati per: ${videoId}`);
        }
      });

      nextPageToken = playlistResponse.data.nextPageToken;
    } while (nextPageToken);

    console.log(`✅ Recuperati ${videos.length} video dalla playlist ${playlistId}`);
    return videos;
  } catch (error) {
    console.error('❌ Errore nel recupero playlist YouTube:', error);
    if (axios.isAxiosError(error)) {
      console.error('Status:', error.response?.status);
      console.error('Data:', JSON.stringify(error.response?.data, null, 2));
      if (error.response?.status === 403) {
        throw new Error('API key YouTube non valida o quota superata. Verifica la chiave nel file .env');
      }
      if (error.response?.status === 404) {
        throw new Error('Playlist non trovata. Verifica l\'ID playlist.');
      }
    }
    throw error;
  }
}

/**
 * Recupera informazioni su una playlist
 */
export async function fetchPlaylistInfo(playlistId: string) {
  if (!YOUTUBE_API_KEY) {
    return null;
  }

  try {
    const response = await axios.get(`${YOUTUBE_API_BASE}/playlists`, {
      params: {
        part: 'snippet,contentDetails',
        id: playlistId,
        key: YOUTUBE_API_KEY,
      },
    });

    const playlist = response.data.items?.[0];
    if (!playlist) return null;

    return {
      title: playlist.snippet.title,
      description: playlist.snippet.description,
      thumbnail: playlist.snippet.thumbnails?.high?.url,
      videoCount: playlist.contentDetails.itemCount,
    };
  } catch (error) {
    console.error('Errore nel recupero info playlist:', error);
    return null;
  }
}

/**
 * Estrae l'ID playlist da una URL YouTube
 */
export function extractPlaylistId(url: string): string | null {
  const match = url.match(/[?&]list=([^&]+)/);
  return match ? match[1] : null;
}

/**
 * Estrae l'ID video da una URL YouTube
 */
export function extractVideoId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/);
  return match ? match[1] : null;
}

export interface YouTubePlaylist {
  id: string;
  snippet: {
    title: string;
    description: string;
    thumbnails: {
      default: { url: string };
      medium: { url: string };
      high: { url: string };
    };
    channelTitle: string;
    publishedAt: string;
  };
  contentDetails: {
    itemCount: number;
  };
}

/**
 * Estrae l'ID canale da una URL YouTube
 */
export function extractChannelId(url: string): string | null {
  // Formato: youtube.com/channel/UC...
  const channelMatch = url.match(/youtube\.com\/channel\/([^\/\?]+)/);
  if (channelMatch) return channelMatch[1];
  
  // Formato: youtube.com/c/ChannelName o youtube.com/user/Username
  const cMatch = url.match(/youtube\.com\/(?:c|user)\/([^\/\?]+)/);
  if (cMatch) {
    // Per questi formati serve fare una chiamata API per ottenere l'ID
    // Per ora restituiamo null e l'utente dovrà usare il formato channel/UC...
    return null;
  }
  
  // Formato: youtube.com/@ChannelHandle
  const handleMatch = url.match(/youtube\.com\/@([^\/\?]+)/);
  if (handleMatch) {
    // Anche questo richiede una chiamata API
    return null;
  }
  
  return null;
}

/**
 * Recupera tutte le playlist di un canale YouTube
 */
export async function fetchChannelPlaylists(channelId: string): Promise<YouTubePlaylist[]> {
  if (!YOUTUBE_API_KEY) {
    console.warn('⚠️ YouTube API key non configurata. Crea un file .env con EXPO_PUBLIC_YOUTUBE_API_KEY=your_key');
    throw new Error('YouTube API key non configurata');
  }

  try {
    const playlists: YouTubePlaylist[] = [];
    let nextPageToken: string | undefined;

    do {
      const response = await axios.get(`${YOUTUBE_API_BASE}/playlists`, {
        params: {
          part: 'snippet,contentDetails',
          channelId: channelId,
          maxResults: 50,
          pageToken: nextPageToken,
          key: YOUTUBE_API_KEY,
        },
      });

      const items: YouTubePlaylist[] = response.data.items || [];
      playlists.push(...items);

      nextPageToken = response.data.nextPageToken;
    } while (nextPageToken);

    console.log(`✅ Recuperate ${playlists.length} playlist dal canale ${channelId}`);
    return playlists;
  } catch (error) {
    console.error('❌ Errore nel recupero playlist canale YouTube:', error);
    if (axios.isAxiosError(error)) {
      console.error('Status:', error.response?.status);
      console.error('Data:', JSON.stringify(error.response?.data, null, 2));
      if (error.response?.status === 403) {
        throw new Error('API key YouTube non valida o quota superata. Verifica la chiave nel file .env');
      }
      if (error.response?.status === 404) {
        throw new Error('Canale non trovato. Verifica l\'ID canale.');
      }
    }
    throw error;
  }
}

