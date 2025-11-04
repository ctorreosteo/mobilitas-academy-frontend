import { useState, useEffect } from 'react';
import * as AuthSession from 'expo-auth-session';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_STORAGE_KEY = '@youtube_access_token';

interface UseYouTubeAuthResult {
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: () => Promise<void>;
  logout: () => void;
}

/**
 * Hook per autenticazione OAuth 2.0 con Google/YouTube
 * Permette di recuperare tutte le playlist, incluse quelle unlisted
 */
export function useYouTubeAuth(): UseYouTubeAuthResult {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Inizia true per caricare token salvato
  const [error, setError] = useState<string | null>(null);

  // Configurazione OAuth
  const discovery = {
    authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenEndpoint: 'https://oauth2.googleapis.com/token',
    revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
  };

  // Client ID e Redirect URI
  const clientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '';
  const redirectUri = AuthSession.makeRedirectUri({
    scheme: 'mobilitas-academy',
    path: 'oauth',
  });

  // Carica token salvato all'avvio
  useEffect(() => {
    loadStoredToken();
  }, []);

  const loadStoredToken = async () => {
    try {
      const stored = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
      if (stored) {
        setAccessToken(stored);
        console.log('✅ Token YouTube caricato da storage');
      }
    } catch (err) {
      console.warn('Errore nel caricamento token salvato:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const saveToken = async (token: string) => {
    try {
      await AsyncStorage.setItem(TOKEN_STORAGE_KEY, token);
      setAccessToken(token);
    } catch (err) {
      console.warn('Errore nel salvataggio token:', err);
    }
  };

  const login = async () => {
    if (!clientId) {
      setError('Google Client ID non configurato. Aggiungi EXPO_PUBLIC_GOOGLE_CLIENT_ID nel file .env');
      return;
    }

    console.log('🔐 Inizio autenticazione OAuth...');
    console.log('📍 Client ID:', clientId);
    console.log('📍 Redirect URI:', redirectUri);

    setIsLoading(true);
    setError(null);

    try {
      // Usa code flow con PKCE (più sicuro e supportato)
      const request = new AuthSession.AuthRequest({
        clientId,
        scopes: ['https://www.googleapis.com/auth/youtube.readonly'],
        responseType: AuthSession.ResponseType.Code,
        redirectUri,
        usePKCE: true,
      });

      console.log('🔄 Apertura browser per autenticazione...');
      const result = await request.promptAsync(discovery);

      console.log('📋 Risultato autenticazione:', result.type);
      
      if (result.type === 'success' && result.params.code) {
        const code = result.params.code;
        const codeVerifier = request.codeVerifier;
        
        console.log('✅ Authorization code ricevuto, scambio con token...');
        
        if (!codeVerifier) {
          throw new Error('Code verifier mancante');
        }

        // Scambia il code con un access token
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            client_id: clientId,
            code: code,
            redirect_uri: redirectUri,
            grant_type: 'authorization_code',
            code_verifier: codeVerifier,
          }).toString(),
        });

        const tokenData = await tokenResponse.json();
        
        console.log('📋 Risposta token:', {
          hasToken: !!tokenData.access_token,
          error: tokenData.error,
          errorDescription: tokenData.error_description,
        });

        if (tokenData.access_token) {
          const token = tokenData.access_token;
          console.log('✅ Token ricevuto:', token.substring(0, 20) + '...');
          await saveToken(token);
          console.log('✅ Autenticazione YouTube riuscita e token salvato');
        } else {
          const errorMsg = tokenData.error_description || tokenData.error || 'Errore nell\'ottenere il token';
          console.error('❌ Errore scambio token:', errorMsg);
          throw new Error(errorMsg);
        }
      } else if (result.type === 'error') {
        const errorMsg = result.error?.message || JSON.stringify(result.params);
        console.error('❌ Errore autenticazione:', errorMsg);
        throw new Error(errorMsg || 'Errore durante l\'autenticazione');
      } else if (result.type === 'cancel') {
        console.log('⚠️ Autenticazione annullata dall\'utente');
        setError('Autenticazione annullata');
      } else {
        console.warn('⚠️ Tipo risultato non gestito:', result.type);
        console.warn('⚠️ Parametri:', JSON.stringify(result.params, null, 2));
        setError(`Risultato autenticazione: ${result.type}. Verifica il redirect URI in Google Cloud Console.`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Errore durante l\'autenticazione';
      setError(errorMessage);
      console.error('❌ Errore autenticazione YouTube:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
      setAccessToken(null);
      console.log('Logout effettuato');
    } catch (err) {
      console.warn('Errore nel logout:', err);
    }
  };

  return {
    accessToken,
    isAuthenticated: !!accessToken,
    isLoading,
    error,
    login,
    logout,
  };
}

