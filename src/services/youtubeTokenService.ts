import axios from 'axios';
import { isFirebaseConfigured, getYouTubeAccessToken as getFirebaseToken } from './firebaseService';

// Configurazione: priorità a Firebase Functions, poi backend URL, poi variabili d'ambiente
// In sviluppo: 
//   - Se EXPO_PUBLIC_FIREBASE_USE_PRODUCTION=true, usa sempre l'URL produzione
//   - Altrimenti usa EXPO_PUBLIC_FIREBASE_FUNCTIONS_URL_LOCAL (se disponibile) o produzione come fallback
// In produzione: usa sempre EXPO_PUBLIC_FIREBASE_FUNCTIONS_URL
const USE_PRODUCTION_IN_DEV = process.env.EXPO_PUBLIC_FIREBASE_USE_PRODUCTION === 'true';
const FIREBASE_FUNCTIONS_URL = __DEV__
  ? (USE_PRODUCTION_IN_DEV
      ? (process.env.EXPO_PUBLIC_FIREBASE_FUNCTIONS_URL)
      : (process.env.EXPO_PUBLIC_FIREBASE_FUNCTIONS_URL_LOCAL || process.env.EXPO_PUBLIC_FIREBASE_FUNCTIONS_URL))
  : (process.env.EXPO_PUBLIC_FIREBASE_FUNCTIONS_URL);
const USE_FIREBASE = !!FIREBASE_FUNCTIONS_URL;
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const USE_BACKEND = !!BACKEND_URL && !USE_FIREBASE;

// Variabili per modalità sviluppo (solo se non c'è backend)
const CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '';
const CLIENT_SECRET = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_SECRET || '';
const REFRESH_TOKEN = process.env.EXPO_PUBLIC_YOUTUBE_REFRESH_TOKEN || '';

let cachedAccessToken: string | null = null;
let tokenExpiryTime: number = 0;

interface TokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

/**
 * Ottiene un access token
 * - Se FIREBASE_FUNCTIONS_URL è configurato: usa Firebase Functions (produzione sicura)
 * - Se BACKEND_URL è configurato: usa il backend server (produzione)
 * - Altrimenti: usa le variabili d'ambiente direttamente (sviluppo)
 * Il token viene cachato e rinnovato automaticamente quando necessario
 */
export async function getYouTubeAccessToken(): Promise<string | null> {
  // Se abbiamo un token valido in cache, usalo
  if (cachedAccessToken && Date.now() < tokenExpiryTime) {
    return cachedAccessToken;
  }

  // Priorità 1: Firebase Functions (più sicuro)
  if (USE_FIREBASE) {
    try {
      console.log('🔄 Ottenimento access token da Firebase Functions...');
      const token = await getFirebaseToken();
      
      if (token) {
        // Cache il token (scade 5 minuti prima della scadenza reale)
        cachedAccessToken = token;
        tokenExpiryTime = Date.now() + (3600 - 300) * 1000; // 1 ora - 5 min
        console.log('✅ Access token ottenuto da Firebase e cachato');
        return cachedAccessToken;
      }
      
      return null;
    } catch (error) {
      console.error('❌ Errore nel recupero access token da Firebase:', error);
      if (axios.isAxiosError(error)) {
        console.error('Status:', error.response?.status);
        console.error('Data:', JSON.stringify(error.response?.data, null, 2));
      }
      return null;
    }
  }

  // Priorità 2: Backend server
  if (USE_BACKEND) {
    try {
      console.log('🔄 Ottenimento access token dal backend server...');
      const response = await axios.get(`${BACKEND_URL}/api/youtube/token`);
      
      if (response.data.access_token) {
        // Cache il token (scade 5 minuti prima della scadenza reale)
        cachedAccessToken = response.data.access_token;
        tokenExpiryTime = Date.now() + (3600 - 300) * 1000; // 1 ora - 5 min
        console.log('✅ Access token ottenuto dal backend e cachato');
        return cachedAccessToken;
      }
      
      return null;
    } catch (error) {
      console.error('❌ Errore nel recupero access token dal backend:', error);
      if (axios.isAxiosError(error)) {
        console.error('Status:', error.response?.status);
        console.error('Data:', JSON.stringify(error.response?.data, null, 2));
      }
      return null;
    }
  }

  // Modalità sviluppo: usa variabili d'ambiente direttamente
  if (!REFRESH_TOKEN) {
    console.log('ℹ️ Refresh token non configurato. Usa API key per playlist pubbliche.');
    return null;
  }

  try {
    console.log('🔄 Ottenimento nuovo access token da refresh token (modalità sviluppo)...');
    console.log('📍 Client ID:', CLIENT_ID ? CLIENT_ID.substring(0, 20) + '...' : 'NON CONFIGURATO');
    console.log('📍 Client Secret:', CLIENT_SECRET ? 'CONFIGURATO' : 'NON CONFIGURATO');
    console.log('📍 Refresh Token:', REFRESH_TOKEN ? REFRESH_TOKEN.substring(0, 20) + '...' : 'NON CONFIGURATO');
    
    if (!CLIENT_ID || !CLIENT_SECRET) {
      console.error('❌ Client ID o Client Secret mancanti nel .env');
      return null;
    }
    
    const response = await axios.post('https://oauth2.googleapis.com/token', 
      new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        refresh_token: REFRESH_TOKEN,
        grant_type: 'refresh_token',
      }).toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    const tokenData: TokenResponse = response.data;

    if (tokenData.access_token) {
      // Cache il token (scade 5 minuti prima della scadenza reale per sicurezza)
      cachedAccessToken = tokenData.access_token;
      tokenExpiryTime = Date.now() + (tokenData.expires_in - 300) * 1000;
      
      console.log('✅ Access token ottenuto e cachato');
      return cachedAccessToken;
    } else {
      console.error('❌ Errore nell\'ottenere access token:', response.data);
      return null;
    }
  } catch (error) {
    console.error('❌ Errore nel refresh token:', error);
    if (axios.isAxiosError(error)) {
      console.error('Status:', error.response?.status);
      console.error('Data:', JSON.stringify(error.response?.data, null, 2));
      
      // Se l'errore è "unauthorized_client", il refresh token non è valido
      // In questo caso, restituisci null e usa l'API key
      if (error.response?.data?.error === 'unauthorized_client') {
        console.warn('⚠️ Refresh token non valido. Verifica Client ID, Client Secret e Refresh Token nel file .env');
        console.warn('⚠️ Continuo con API key per playlist pubbliche...');
      }
    }
    // Non crashare l'app: restituisci null e usa API key
    return null;
  }
}

/**
 * Verifica se il refresh token è configurato (sviluppo) o se c'è un backend (produzione)
 */
export function hasRefreshToken(): boolean {
  return USE_FIREBASE || USE_BACKEND || !!REFRESH_TOKEN;
}

