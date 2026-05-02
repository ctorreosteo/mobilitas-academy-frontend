import axios, { isAxiosError } from 'axios';
import { apiClient } from '../api';
import { ApiResponseDto } from './formazioneService';
import {
  setAuthToken,
  setStoredUserProfile,
  clearAllAuth,
  StoredUserProfile,
} from './authTokenStorage';
export interface LoginRequestBody {
  username: string;
  password: string;
}

export interface LoginResponseData {
  token: string;
  username: string;
  nome: string;
  cognome: string;
  email: string;
  ruoli: string[];
}

export interface UserInfoResponseDto {
  id: number;
  username: string;
  nome: string;
  cognome: string;
  email: string;
  ruoli: string[];
  attivo: boolean;
  osteopataId?: number | null;
}

function toStoredProfile(d: LoginResponseData | UserInfoResponseDto): StoredUserProfile {
  return {
    username: d.username,
    nome: d.nome ?? '',
    cognome: d.cognome ?? '',
    email: d.email ?? '',
    ruoli: Array.isArray(d.ruoli) ? d.ruoli : [],
  };
}

/**
 * POST /api/auth/login — pubblico. `username` accetta username o email (backend).
 */
export async function loginMobilitas(
  usernameOrEmail: string,
  password: string
): Promise<LoginResponseData> {
  try {
    const { data } = await apiClient.post<ApiResponseDto<LoginResponseData>>('/auth/login', {
      username: usernameOrEmail,
      password,
    } satisfies LoginRequestBody);

    if (!data.success || !data.data?.token) {
      throw new Error(data.message || data.error || 'Login fallito');
    }
    return data.data;
  } catch (e) {
    if (isAxiosError(e) && e.response?.data && typeof e.response.data === 'object') {
      const body = e.response.data as ApiResponseDto<unknown>;
      if (body.message) throw new Error(body.message);
      if (body.error && typeof body.error === 'string') throw new Error(body.error);
    }
    throw e;
  }
}

/** POST /api/auth/refresh — richiede Bearer; sostituisce il JWT in storage. */
export async function refreshAuthToken(): Promise<string> {
  const { data } = await apiClient.post<ApiResponseDto<LoginResponseData>>('/auth/refresh', {});
  if (!data.success || !data.data?.token) {
    throw new Error(data.message || data.error || 'Refresh fallito');
  }
  await persistLoginSession(data.data);
  return data.data.token;
}

/** POST /api/auth/logout — best-effort; sempre pulisce storage locale. */
export async function logoutMobilitas(): Promise<void> {
  try {
    await apiClient.post<ApiResponseDto<unknown>>('/auth/logout', {});
  } catch {
    // token scaduto / rete: comunque disconnetti lato client
  } finally {
    await clearAllAuth();
  }
}

/** Salva JWT e profilo dopo login o refresh con payload completo. */
export async function persistLoginSession(session: LoginResponseData): Promise<void> {
  await setAuthToken(session.token);
  await setStoredUserProfile(toStoredProfile(session));
}

/** GET /api/auth/me — profilo corrente; aggiorna lo snapshot locale. */
export async function fetchCurrentUser(): Promise<StoredUserProfile> {
  const { data } = await apiClient.get<ApiResponseDto<UserInfoResponseDto>>('/auth/me');
  if (!data.success || !data.data) {
    throw new Error(data.message || data.error || 'Impossibile caricare il profilo');
  }
  const profile = toStoredProfile(data.data);
  await setStoredUserProfile(profile);
  return profile;
}

