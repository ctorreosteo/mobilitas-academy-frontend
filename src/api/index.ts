import axios, { type InternalAxiosRequestConfig } from 'axios';
import {
  getAuthToken,
  getStoredUserProfile,
  setAuthToken,
  setStoredUserProfile,
  clearAllAuth,
} from '../services/authTokenStorage';
import { notifyPasswordExpired } from '../services/passwordExpired';
import { isPasswordExpiredResponse } from '../utils/apiEnvelope';
import { resolveDevBackendOrigin } from '../utils/resolveDevBackendUrl';

/** Backend API in produzione. */
const PRODUCTION_BACKEND_ORIGIN = 'https://mobilitas-backend-990845221858.europe-west8.run.app';

const USE_PRODUCTION_IN_DEV = process.env.EXPO_PUBLIC_API_USE_PRODUCTION === 'true';
const LOCAL_BACKEND_ORIGIN = (
  process.env.EXPO_PUBLIC_API_URL_LOCAL || 'http://localhost:8080'
).replace(/\/$/, '');

function getBackendOrigin(): string {
  if (!__DEV__ || USE_PRODUCTION_IN_DEV) {
    return PRODUCTION_BACKEND_ORIGIN;
  }
  return resolveDevBackendOrigin(LOCAL_BACKEND_ORIGIN);
}

export const API_ORIGIN = getBackendOrigin();
export const API_BASE_URL = `${API_ORIGIN}/api`;

if (__DEV__) {
  console.log('[API] base URL', API_BASE_URL, USE_PRODUCTION_IN_DEV ? '(produzione forzata)' : '(locale)');
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

type AuthRetryConfig = InternalAxiosRequestConfig & { __isRetry?: boolean };

function requestPath(config: { url?: string } | undefined): string {
  return config?.url ?? '';
}

/** Endpoint pubblici di auth: un JWT stantio non deve far scattare la catena di sicurezza. */
function isPublicAuthPath(url: string): boolean {
  return (
    url.includes('/auth/login') ||
    url.includes('/auth/reset-password') ||
    url.includes('/auth/applicazione/')
  );
}

function shouldSkipAuthRefresh(url: string): boolean {
  return (
    isPublicAuthPath(url) ||
    url.includes('/auth/register') ||
    url.includes('/auth/refresh')
  );
}

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
    if (isPublicAuthPath(requestPath(config))) {
      if (config.headers) {
        delete config.headers.Authorization;
      }
      return config;
    }
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

    if (status === 403 && isPasswordExpiredResponse(error.response?.data)) {
      notifyPasswordExpired();
      return Promise.reject(error);
    }

    if (status !== 401 || !original || original.__isRetry) {
      return Promise.reject(error);
    }

    const path = requestPath(original);
    if (shouldSkipAuthRefresh(path)) {
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
