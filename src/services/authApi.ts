import axios, { isAxiosError } from 'axios';
import { apiClient } from '../api';
import { ApiResponseDto } from './formazioneService';
import {
  getAuthToken,
  setAuthToken,
  setStoredUserProfile,
  clearAllAuth,
  StoredOsteopataProfile,
  StoredPazienteProfile,
  StoredUserProfile,
} from './authTokenStorage';
import { fetchOsteopataById, type OsteopataDto } from './studioVisitsService';
import { fetchPazienteByUtenteId, type PazienteDto } from './pazientiService';
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
  pazienteId?: number | null;
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
  pazienteId?: number | null;
}

function osteopataDtoToStored(d: OsteopataDto): StoredOsteopataProfile {
  return {
    id: d.id,
    nome: d.nome,
    cognome: d.cognome,
    email: d.email ?? null,
    telefono: d.telefono ?? null,
    immagineProfiloUrl: d.immagineProfiloUrl ?? null,
    colore: d.colore ?? null,
    isTirocinante: d.isTirocinante,
    genere: d.genere ?? null,
    specializzazioni: d.specializzazioni ?? null,
  };
}

function pazienteDtoToStored(d: PazienteDto): StoredPazienteProfile {
  return {
    id: d.id,
    nome: d.nome ?? null,
    cognome: d.cognome ?? null,
    prefissoCellulare: d.prefissoCellulare ?? null,
    cellulare: d.cellulare ?? null,
    email: d.email ?? null,
    dataNascita: d.dataNascita ?? null,
    eta: d.eta ?? null,
    cittaNascita: d.cittaNascita ?? null,
    codiceFiscale: d.codiceFiscale ?? null,
    linkWhatsapp: d.linkWhatsapp ?? null,
    genere: d.genere ?? null,
    note: d.note ?? null,
  };
}

function hasPazienteRole(roles: string[] | null | undefined): boolean {
  if (!Array.isArray(roles)) return false;
  return roles.some((role) => role.toUpperCase().includes('PAZIENTE'));
}

function toStoredProfile(d: LoginResponseData | UserInfoResponseDto): StoredUserProfile {
  const profile: StoredUserProfile = {
    username: d.username,
    nome: d.nome ?? '',
    cognome: d.cognome ?? '',
    email: d.email ?? '',
    ruoli: Array.isArray(d.ruoli) ? d.ruoli : [],
  };
  if ('pazienteId' in d) {
    profile.pazienteId = d.pazienteId ?? null;
  }
  if ('id' in d && typeof d.id === 'number') {
    profile.utenteId = d.id;
  }
  if ('attivo' in d && typeof d.attivo === 'boolean') {
    profile.attivo = d.attivo;
  }
  if ('osteopataId' in d) {
    profile.osteopataId = d.osteopataId ?? null;
  }
  return profile;
}

function maskSecret(value: string | undefined | null, keep = 4): string {
  if (!value) return '<empty>';
  if (value.length <= keep * 2) return '*'.repeat(value.length);
  return `${value.slice(0, keep)}…${value.slice(-keep)} (len=${value.length})`;
}

function headersToPlain(headers: unknown): Record<string, unknown> {
  if (!headers || typeof headers !== 'object') return {};
  const anyHeaders = headers as { toJSON?: () => Record<string, unknown> } & Record<string, unknown>;
  if (typeof anyHeaders.toJSON === 'function') {
    try {
      return anyHeaders.toJSON();
    } catch {
      // fallthrough
    }
  }
  return { ...anyHeaders };
}

/**
 * POST /api/auth/login — pubblico. `username` accetta username o email (backend).
 */
export async function loginMobilitas(
  usernameOrEmail: string,
  password: string
): Promise<LoginResponseData> {
  const requestBody: LoginRequestBody = { username: usernameOrEmail, password };
  const requestUrlPath = '/auth/login';
  const fullUrl = `${apiClient.defaults.baseURL ?? ''}${requestUrlPath}`;
  const requestStartedAt = Date.now();

  console.log('[LOGIN] → request', {
    method: 'POST',
    url: fullUrl,
    baseURL: apiClient.defaults.baseURL,
    path: requestUrlPath,
    timeoutMs: apiClient.defaults.timeout,
    defaultHeaders: headersToPlain(apiClient.defaults.headers?.common),
    body: { username: usernameOrEmail, password: maskSecret(password) },
  });

  try {
    const response = await apiClient.post<ApiResponseDto<LoginResponseData>>(
      requestUrlPath,
      requestBody
    );
    const elapsedMs = Date.now() - requestStartedAt;
    const { data, status, statusText, headers } = response;

    console.log('[LOGIN] ← response', {
      status,
      statusText,
      elapsedMs,
      headers: headersToPlain(headers),
      data: {
        success: data?.success,
        message: data?.message,
        error: data?.error,
        data: data?.data
          ? {
              ...data.data,
              token: maskSecret(data.data.token, 6),
            }
          : data?.data,
      },
    });

    if (!data.success || !data.data?.token) {
      throw new Error(data.message || data.error || 'Login fallito');
    }
    return data.data;
  } catch (e) {
    const elapsedMs = Date.now() - requestStartedAt;
    if (isAxiosError(e)) {
      console.log('[LOGIN] ✗ error', {
        elapsedMs,
        code: e.code,
        message: e.message,
        status: e.response?.status,
        statusText: e.response?.statusText,
        responseHeaders: headersToPlain(e.response?.headers),
        responseData: e.response?.data,
        requestUrl: e.config?.url,
        requestBaseURL: e.config?.baseURL,
      });
      if (e.response?.data && typeof e.response.data === 'object') {
        const body = e.response.data as ApiResponseDto<unknown>;
        if (body.message) throw new Error(body.message);
        if (body.error && typeof body.error === 'string') throw new Error(body.error);
      }
    } else {
      console.log('[LOGIN] ✗ error (non-axios)', { elapsedMs, error: e });
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

/** GET /api/auth/me — profilo corrente; se c’è `osteopataId`, GET /osteopati/{id}. Aggiorna storage. */
export async function fetchCurrentUser(): Promise<StoredUserProfile> {
  const { data } = await apiClient.get<ApiResponseDto<UserInfoResponseDto>>('/auth/me');
  if (!data.success || !data.data) {
    throw new Error(data.message || data.error || 'Impossibile caricare il profilo');
  }
  const me = data.data;
  let profile = toStoredProfile(me);

  if (me.osteopataId != null) {
    try {
      const o = await fetchOsteopataById(me.osteopataId);
      profile = { ...profile, osteopata: osteopataDtoToStored(o) };
    } catch {
      profile = { ...profile, osteopata: null };
    }
  } else {
    profile = { ...profile, osteopata: null, osteopataId: null };
  }

  const shouldLoadPaziente = hasPazienteRole(me.ruoli) && typeof me.id === 'number' && me.id > 0;
  if (shouldLoadPaziente) {
    try {
      const paziente = await fetchPazienteByUtenteId(me.id);
      if (paziente) {
        profile = {
          ...profile,
          pazienteId: paziente.id,
          paziente: pazienteDtoToStored(paziente),
        };
      } else {
        profile = { ...profile, pazienteId: null, paziente: null };
      }
    } catch {
      profile = { ...profile, paziente: null };
    }
  } else {
    profile = { ...profile, pazienteId: null, paziente: null };
  }

  await setStoredUserProfile(profile);
  return profile;
}

/**
 * All’avvio: se esiste un JWT salvato, lo convalida con /auth/me.
 * - 401 → sessione invalida, storage pulito.
 * - Rete o altro errore → si mantiene il token e il profilo in cache (resti collegato offline).
 */
export async function restorePersistedSession(): Promise<boolean> {
  const token = await getAuthToken();
  if (!token) return false;
  try {
    await fetchCurrentUser();
    return true;
  } catch (e) {
    if (isAxiosError(e) && e.response?.status === 401) {
      await clearAllAuth();
      return false;
    }
    return true;
  }
}

