import axios, { type InternalAxiosRequestConfig } from 'axios';
import {
  getAuthToken,
  getStoredUserProfile,
  setAuthToken,
  setStoredUserProfile,
  clearAllAuth,
} from '../services/authTokenStorage';

/** Backend API in produzione (unica origine usata dal client). */
const PRODUCTION_BACKEND_ORIGIN = 'https://mobilitas-backend-990845221858.europe-west8.run.app';

export const API_BASE_URL = `${PRODUCTION_BACKEND_ORIGIN}/api`;

if (__DEV__) {
  console.log('[API] base URL', API_BASE_URL);
}

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
