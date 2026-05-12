import axios, { type InternalAxiosRequestConfig } from 'axios';
import { NativeModules } from 'react-native';
import Constants from 'expo-constants';
import {
  getAuthToken,
  getStoredUserProfile,
  setAuthToken,
  setStoredUserProfile,
  clearAllAuth,
} from '../services/authTokenStorage';

/**
 * Hostname del Metro dev server.
 *
 * Strategia (in ordine):
 *  1) `NativeModules.SourceCode.scriptURL` — funziona in Expo Go / RN classico.
 *  2) `expo-constants` — l'unico modo affidabile su development build con
 *     new architecture (Fabric + Hermes), dove `scriptURL` è `undefined`.
 *     `hostUri` è del tipo `"192.168.1.28:8081"`.
 */
function getDevServerHost(): string | null {
  const scriptURL: string | undefined = NativeModules?.SourceCode?.scriptURL;
  if (scriptURL) {
    try {
      const host = new URL(scriptURL).hostname;
      if (host) return host;
    } catch {
      // ignoriamo, proviamo il fallback successivo
    }
  }

  const hostUri =
    Constants.expoConfig?.hostUri ??
    (Constants as unknown as { expoGoConfig?: { debuggerHost?: string } }).expoGoConfig
      ?.debuggerHost ??
    null;
  if (hostUri) {
    const host = hostUri.split(':')[0]?.trim();
    if (host) return host;
  }

  return null;
}

function isLocalHost(host: string): boolean {
  const lowerHost = host.toLowerCase();
  return (
    lowerHost === 'localhost' ||
    lowerHost === '127.0.0.1' ||
    lowerHost === '10.0.2.2' ||
    lowerHost === '::1' ||
    lowerHost.endsWith('.local') ||
    /^192\.168\.\d{1,3}\.\d{1,3}$/.test(lowerHost) ||
    /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(lowerHost) ||
    /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(lowerHost)
  );
}

const envBackendOrigin = process.env.EXPO_PUBLIC_BACKEND_URL?.trim().replace(/\/$/, '');
const rawScriptURL: string | undefined = NativeModules?.SourceCode?.scriptURL;
const devServerHost = getDevServerHost();
const inferredDevBackendOrigin =
  devServerHost && isLocalHost(devServerHost) ? `http://${devServerHost}:8080` : null;
const cloudBackendOrigin = 'https://mobilitas-backend-990845221858.europe-west8.run.app';
const backendOrigin = envBackendOrigin || inferredDevBackendOrigin || cloudBackendOrigin;
export const API_BASE_URL = `${backendOrigin}/api`;

console.log('[API] base URL resolution', {
  rawScriptURL,
  expoHostUri: Constants.expoConfig?.hostUri ?? null,
  expoGoDebuggerHost:
    (Constants as unknown as { expoGoConfig?: { debuggerHost?: string } }).expoGoConfig
      ?.debuggerHost ?? null,
  devServerHost,
  isDevServerLocal: devServerHost ? isLocalHost(devServerHost) : false,
  envBackendOrigin,
  inferredDevBackendOrigin,
  cloudBackendOrigin,
  chosenBackendOrigin: backendOrigin,
  API_BASE_URL,
});

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

type AuthRetryConfig = InternalAxiosRequestConfig & { __isRetry?: boolean };

interface ApiEnvelope<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string | null;
}

interface RefreshPayload {
  token: string;
  username?: string;
  nome?: string;
  cognome?: string;
  email?: string;
  ruoli?: string[];
  pazienteId?: number | null;
}

apiClient.interceptors.request.use(
  async (config) => {
    const token = await getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config as AuthRetryConfig | undefined;
    const status = error.response?.status;

    if (status !== 401 || !original || original.__isRetry) {
      return Promise.reject(error);
    }

    const path = original.url ?? '';
    if (
      path.includes('/auth/login') ||
      path.includes('/auth/register') ||
      path.includes('/auth/refresh')
    ) {
      return Promise.reject(error);
    }

    try {
      const token = await getAuthToken();
      if (!token) {
        await clearAllAuth();
        return Promise.reject(error);
      }

      const { data: envelope } = await axios.post<ApiEnvelope<RefreshPayload>>(
        `${API_BASE_URL}/auth/refresh`,
        {},
        {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          timeout: 15000,
        }
      );

      if (!envelope.success || !envelope.data?.token) {
        throw new Error('refresh failed');
      }

      const d = envelope.data;
      await setAuthToken(d.token);
      if (d.username != null && d.email != null) {
        const prev = await getStoredUserProfile();
        await setStoredUserProfile({
          username: d.username,
          nome: d.nome ?? '',
          cognome: d.cognome ?? '',
          email: d.email,
          ruoli: d.ruoli ?? [],
          pazienteId: d.pazienteId !== undefined ? d.pazienteId : prev?.pazienteId,
          utenteId: prev?.utenteId,
          attivo: prev?.attivo,
          osteopataId: prev?.osteopataId,
          osteopata: prev?.osteopata,
        });
      }

      original.__isRetry = true;
      original.headers = original.headers ?? {};
      original.headers.Authorization = `Bearer ${d.token}`;
      return apiClient.request(original);
    } catch {
      await clearAllAuth();
      return Promise.reject(error);
    }
  }
);
