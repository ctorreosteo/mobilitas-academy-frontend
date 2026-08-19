import { isAxiosError } from 'axios';
import { apiClient } from '../api';
import type { ApiResponseDto } from './formazioneService';
import { pickCoverImageUrl } from '../utils/pickCoverImageUrl';

export interface CorsoPosturaleDto {
  id: number;
  titolo: string;
  descrizione: string | null;
  immagineCopertina: string | null;
  attivo: boolean;
}

export interface ModuloPosturaleDto {
  id: number;
  corsoId: number;
  titolo: string;
  descrizione: string | null;
  ordine: number;
  immagineCopertina: string | null;
  dataAggiunta: string;
  attivo: boolean;
}

export interface LezionePosturaleDto {
  id: number;
  moduloId: number;
  titolo: string;
  descrizione: string | null;
  ordine: number;
  cloudflareUid: string | null;
  immagineCopertina: string | null;
  durataSecondi: number | null;
  richiedeToken: boolean;
  dataAggiunta: string;
  attivo: boolean;
}

function normalizeCorso(raw: CorsoPosturaleDto & Record<string, unknown>): CorsoPosturaleDto {
  return {
    ...raw,
    immagineCopertina: pickCoverImageUrl(raw.immagineCopertina, raw.immagine_copertina),
  };
}

function normalizeModulo(raw: ModuloPosturaleDto & Record<string, unknown>): ModuloPosturaleDto {
  return {
    ...raw,
    immagineCopertina: pickCoverImageUrl(raw.immagineCopertina, raw.immagine_copertina),
  };
}

function normalizeLezione(raw: LezionePosturaleDto & Record<string, unknown>): LezionePosturaleDto {
  return {
    ...raw,
    immagineCopertina: pickCoverImageUrl(raw.immagineCopertina, raw.immagine_copertina),
  };
}

function extractCorsiPosturaliApiError(error: unknown, fallback: string): Error {
  if (isAxiosError(error) && error.response?.status === 404) {
    return new Error('Contenuto non disponibile');
  }
  if (isAxiosError(error) && error.response?.data && typeof error.response.data === 'object') {
    const envelope = error.response.data as ApiResponseDto<unknown>;
    const msg = envelope.message || envelope.error;
    if (typeof msg === 'string' && msg.length > 0) return new Error(msg);
  }
  if (isAxiosError(error) && typeof error.response?.data === 'string' && error.response.data.trim()) {
    return new Error(error.response.data);
  }
  return error instanceof Error ? error : new Error(fallback);
}

export async function fetchCorsiPosturali(): Promise<CorsoPosturaleDto[]> {
  try {
    const { data } = await apiClient.get<ApiResponseDto<CorsoPosturaleDto[]>>('/corsi-posturali');
    if (!data.success || !Array.isArray(data.data)) {
      throw new Error(data.message || data.error || 'Impossibile caricare i corsi posturali');
    }
    return data.data.map((row) => normalizeCorso(row as CorsoPosturaleDto & Record<string, unknown>));
  } catch (error) {
    throw extractCorsiPosturaliApiError(error, 'Impossibile caricare i corsi posturali');
  }
}

export async function fetchCorsoPosturaleById(corsoId: number): Promise<CorsoPosturaleDto> {
  try {
    const { data } = await apiClient.get<ApiResponseDto<CorsoPosturaleDto>>(`/corsi-posturali/${corsoId}`);
    if (!data.success || !data.data) {
      throw new Error(data.message || data.error || 'Corso posturale non disponibile');
    }
    return normalizeCorso(data.data as CorsoPosturaleDto & Record<string, unknown>);
  } catch (error) {
    throw extractCorsiPosturaliApiError(error, 'Corso posturale non disponibile');
  }
}

export async function fetchModuliByCorsoPosturale(corsoId: number): Promise<ModuloPosturaleDto[]> {
  try {
    const { data } = await apiClient.get<ApiResponseDto<ModuloPosturaleDto[]>>(
      `/corsi-posturali/${corsoId}/moduli`
    );
    if (!data.success || !Array.isArray(data.data)) {
      throw new Error(data.message || data.error || 'Impossibile caricare i moduli');
    }
    return [...data.data]
      .map((row) => normalizeModulo(row as ModuloPosturaleDto & Record<string, unknown>))
      .sort((a, b) => a.ordine - b.ordine);
  } catch (error) {
    throw extractCorsiPosturaliApiError(error, 'Impossibile caricare i moduli');
  }
}

export async function fetchLezioniByModuloPosturale(moduloId: number): Promise<LezionePosturaleDto[]> {
  try {
    const { data } = await apiClient.get<ApiResponseDto<LezionePosturaleDto[]>>(
      `/corsi-posturali/moduli/${moduloId}/lezioni`
    );
    if (!data.success || !Array.isArray(data.data)) {
      throw new Error(data.message || data.error || 'Impossibile caricare le lezioni');
    }
    return [...data.data]
      .map((row) => normalizeLezione(row as LezionePosturaleDto & Record<string, unknown>))
      .sort((a, b) => a.ordine - b.ordine);
  } catch (error) {
    throw extractCorsiPosturaliApiError(error, 'Impossibile caricare le lezioni');
  }
}

export async function fetchLezionePosturaleById(lezioneId: number): Promise<LezionePosturaleDto> {
  try {
    const { data } = await apiClient.get<ApiResponseDto<LezionePosturaleDto>>(
      `/corsi-posturali/lezioni/${lezioneId}`
    );
    if (!data.success || !data.data) {
      throw new Error(data.message || data.error || 'Lezione non disponibile');
    }
    return normalizeLezione(data.data as LezionePosturaleDto & Record<string, unknown>);
  } catch (error) {
    throw extractCorsiPosturaliApiError(error, 'Lezione non disponibile');
  }
}
