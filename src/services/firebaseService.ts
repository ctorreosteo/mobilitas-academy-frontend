import axios from 'axios';
import { Video } from '../types';
import { Platform } from 'react-native';

/**
 * Converte localhost nell'IP locale per dispositivi mobili/simulatori
 * Su iOS simulator, localhost funziona, ma su dispositivi reali serve l'IP della macchina
 */
function getLocalUrl(): string {
  const localUrl = process.env.EXPO_PUBLIC_FIREBASE_FUNCTIONS_URL_LOCAL || '';
  
  // Se non contiene localhost, restituisci così com'è
  if (!localUrl.includes('localhost')) {
    return localUrl;
  }
  
  // Su web, localhost funziona sempre
  // Expo usa Platform.OS per web, ma per sicurezza controlliamo anche typeof window
  const isWeb = typeof window !== 'undefined' || Platform.OS === 'web';
  if (isWeb) {
    return localUrl;
  }
  
  // Su iOS simulator, localhost funziona
  // Ma per dispositivi reali, serve l'IP della macchina
  // Expo mostra l'IP nel terminale quando avvii il server (es: exp://192.168.1.54:8081)
  const localIP = process.env.EXPO_PUBLIC_FIREBASE_LOCAL_IP;
  if (localIP) {
    const urlWithIP = localUrl.replace('localhost', localIP);
    console.log(`🌐 Convertito localhost in ${localIP} per dispositivo reale`);
    return urlWithIP;
  }
  
  // Se non c'è IP configurato, mostra un warning e usa localhost (potrebbe non funzionare)
  console.warn(
    '⚠️ EXPO_PUBLIC_FIREBASE_LOCAL_IP non configurato.\n' +
    'Su dispositivi reali, localhost potrebbe non funzionare.\n' +
    'Aggiungi EXPO_PUBLIC_FIREBASE_LOCAL_IP=192.168.x.x nel .env\n' +
    '(trova l\'IP nel terminale Expo: exp://IP:8081)'
  );
  
  return localUrl;
}

// URL base delle funzioni Firebase
// In sviluppo: 
//   - Se EXPO_PUBLIC_FIREBASE_USE_PRODUCTION=true, usa sempre l'URL produzione
//   - Altrimenti usa EXPO_PUBLIC_FIREBASE_FUNCTIONS_URL_LOCAL (se disponibile) o produzione come fallback
// In produzione: usa sempre EXPO_PUBLIC_FIREBASE_FUNCTIONS_URL
const USE_PRODUCTION_IN_DEV = process.env.EXPO_PUBLIC_FIREBASE_USE_PRODUCTION === 'true';
const FIREBASE_FUNCTIONS_URL = __DEV__ 
  ? (USE_PRODUCTION_IN_DEV 
      ? (process.env.EXPO_PUBLIC_FIREBASE_FUNCTIONS_URL || '')
      : (getLocalUrl() || process.env.EXPO_PUBLIC_FIREBASE_FUNCTIONS_URL || ''))
  : (process.env.EXPO_PUBLIC_FIREBASE_FUNCTIONS_URL || '');

// Log per debug (solo in sviluppo)
if (__DEV__ && FIREBASE_FUNCTIONS_URL) {
  let urlType = 'LOCALE';
  if (USE_PRODUCTION_IN_DEV) {
    urlType = 'PRODUZIONE (forzato)';
  } else if (process.env.EXPO_PUBLIC_FIREBASE_FUNCTIONS_URL_LOCAL) {
    urlType = 'LOCALE';
  } else {
    urlType = 'PRODUZIONE (fallback)';
  }
  console.log(`🔥 Firebase Functions URL: ${FIREBASE_FUNCTIONS_URL} (${urlType})`);
}

/**
 * Verifica se Firebase Functions è configurato
 */
export function isFirebaseConfigured(): boolean {
  return !!FIREBASE_FUNCTIONS_URL;
}

/**
 * Interfaccia per una playlist YouTube (compatibile con youtubeService)
 */
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
 * Ottiene un access token YouTube dal backend Firebase
 */
export async function getYouTubeAccessToken(): Promise<string | null> {
  if (!FIREBASE_FUNCTIONS_URL) {
    return null;
  }

  try {
    const response = await axios.get(`${FIREBASE_FUNCTIONS_URL}/getYouTubeToken`);
    return response.data.access_token || null;
  } catch (error) {
    console.error('Errore nel recupero access token da Firebase:', error);
    return null;
  }
}

/**
 * Recupera i video di una playlist YouTube dal backend Firebase
 */
export async function fetchPlaylistVideos(playlistId: string): Promise<Video[]> {
  if (!FIREBASE_FUNCTIONS_URL) {
    throw new Error('Firebase Functions URL non configurata');
  }

  try {
    const response = await axios.get(`${FIREBASE_FUNCTIONS_URL}/getPlaylistVideos`, {
      params: { playlistId },
    });

    return response.data.videos || [];
  } catch (error) {
    console.error('Errore nel recupero video playlist da Firebase:', error);
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 400) {
        throw new Error('playlistId richiesto');
      }
      if (error.response?.status === 404) {
        throw new Error('Playlist non trovata');
      }
    }
    throw error;
  }
}

/**
 * Recupera informazioni su una playlist YouTube dal backend Firebase
 */
export async function fetchPlaylistInfo(playlistId: string): Promise<{
  title: string;
  description: string;
  thumbnail: string;
  videoCount: number;
} | null> {
  if (!FIREBASE_FUNCTIONS_URL) {
    return null;
  }

  try {
    const response = await axios.get(`${FIREBASE_FUNCTIONS_URL}/getPlaylistInfo`, {
      params: { playlistId },
    });

    return response.data || null;
  } catch (error) {
    console.error('Errore nel recupero info playlist da Firebase:', error);
    return null;
  }
}

/**
 * Recupera tutte le playlist di un canale YouTube dal backend Firebase
 */
export async function fetchChannelPlaylists(
  channelId?: string
): Promise<YouTubePlaylist[]> {
  if (!FIREBASE_FUNCTIONS_URL) {
    throw new Error('Firebase Functions URL non configurata');
  }

  try {
    const params: any = {};
    if (channelId) {
      params.channelId = channelId;
    }

    const response = await axios.get(`${FIREBASE_FUNCTIONS_URL}/getChannelPlaylists`, {
      params,
    });

    return response.data.playlists || [];
  } catch (error) {
    console.error('Errore nel recupero playlist canale da Firebase:', error);
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 404) {
        throw new Error('Canale non trovato');
      }
    }
    throw error;
  }
}

/**
 * Recupera una playlist specifica per ID (anche se unlisted) dal backend Firebase
 * Nota: Firebase non ha un endpoint specifico per questo, quindi usiamo getChannelPlaylists
 * senza channelId per ottenere tutte le playlist (incluse unlisted)
 */
export async function fetchPlaylistById(playlistId: string): Promise<YouTubePlaylist | null> {
  if (!FIREBASE_FUNCTIONS_URL) {
    return null;
  }

  try {
    // Prova prima con getChannelPlaylists senza channelId (ottiene tutte le playlist dell'utente)
    const response = await axios.get(`${FIREBASE_FUNCTIONS_URL}/getChannelPlaylists`);
    const playlists: YouTubePlaylist[] = response.data.playlists || [];
    
    // Cerca la playlist specifica
    const playlist = playlists.find(p => p.id === playlistId);
    if (playlist) {
      return playlist;
    }

    // Se non trovata, potrebbe essere una playlist pubblica di un altro canale
    // In questo caso, non possiamo recuperarla senza channelId
    return null;
  } catch (error) {
    console.warn(`⚠️ Impossibile recuperare playlist ${playlistId} da Firebase:`, error);
    return null;
  }
}

