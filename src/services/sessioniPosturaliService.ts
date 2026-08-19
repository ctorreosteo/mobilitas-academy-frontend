import { isAxiosError } from 'axios';
import { apiClient } from '../api';
import type { ApiResponseDto } from './formazioneService';
import { pickCoverImageUrl } from '../utils/pickCoverImageUrl';

export interface SessionePosturaleDto {
  id: number;
  nome: string;
  descrizione: string;
  numeroMassimoPartecipanti: number;
  durata: number;
  tags: string;
  immagineCopertinaUrl: string | null;
}

export interface CalendarioSessionePosturaleDto {
  id: number;
  data: string;
  oraInizio: string;
  oraFine: string;
  sessioneId: number;
  sessioneNome: string;
  sessioneDescrizione?: string | null;
  sessioneImmagineCopertinaUrl?: string | null;
  istruttoreId: number;
  istruttoreNomeCompleto: string;
}

export interface PartecipanteSessionePosturaleDto {
  id: number;
  utenteId: number;
  utenteNomeCompleto: string;
  sessioneId: number;
  sessioneNome: string;
}

export interface PartecipanteSessionePosturaleCreateDto {
  sessioneId: number;
  utenteId?: number;
}

export interface FetchCalendarioSessioniPosturaliParams {
  data?: string;
  dataDa?: string;
  dataA?: string;
  sessioneId?: number;
  istruttoreId?: number;
}

function normalizeSessionePosturale(
  raw: SessionePosturaleDto & Record<string, unknown>
): SessionePosturaleDto {
  return {
    ...raw,
    immagineCopertinaUrl: pickCoverImageUrl(
      raw.immagineCopertinaUrl,
      raw.immagine_copertina_url,
      raw.immagineCopertina
    ),
  };
}

function normalizeCalendarioRow(
  raw: CalendarioSessionePosturaleDto & Record<string, unknown>
): CalendarioSessionePosturaleDto {
  const cover = pickCoverImageUrl(
    raw.sessioneImmagineCopertinaUrl,
    raw.sessione_immagine_copertina_url,
    raw.immagineCopertinaUrl,
    raw.immagine_copertina_url
  );
  return {
    ...raw,
    sessioneImmagineCopertinaUrl: cover ?? raw.sessioneImmagineCopertinaUrl ?? null,
  };
}

function sortCalendarRows(rows: CalendarioSessionePosturaleDto[]): CalendarioSessionePosturaleDto[] {
  return [...rows].sort((a, b) => {
    const byDate = a.data.localeCompare(b.data);
    if (byDate !== 0) return byDate;
    return a.oraInizio.localeCompare(b.oraInizio);
  });
}

function extractSessioniPosturaliApiError(error: unknown, fallback: string): Error {
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

export function parseSessionePosturaleTags(tags: string | null | undefined): string[] {
  if (!tags?.trim()) return [];
  return tags
    .split(';')
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export async function fetchSessioniPosturali(): Promise<SessionePosturaleDto[]> {
  try {
    const { data } = await apiClient.get<ApiResponseDto<SessionePosturaleDto[]>>('/sessioni-posturali');
    if (!data.success || !Array.isArray(data.data)) {
      throw new Error(data.message || data.error || 'Impossibile caricare il catalogo sessioni posturali');
    }
    return data.data.map((row) =>
      normalizeSessionePosturale(row as SessionePosturaleDto & Record<string, unknown>)
    );
  } catch (error) {
    throw extractSessioniPosturaliApiError(error, 'Impossibile caricare il catalogo sessioni posturali');
  }
}

export async function fetchSessionePosturaleById(id: number): Promise<SessionePosturaleDto> {
  try {
    const { data } = await apiClient.get<ApiResponseDto<SessionePosturaleDto>>(
      `/sessioni-posturali/${id}`
    );
    if (!data.success || !data.data) {
      throw new Error(data.message || data.error || 'Sessione posturale non disponibile');
    }
    return normalizeSessionePosturale(data.data as SessionePosturaleDto & Record<string, unknown>);
  } catch (error) {
    throw extractSessioniPosturaliApiError(error, 'Sessione posturale non disponibile');
  }
}

export async function fetchCalendarioSessioniPosturali(
  params?: FetchCalendarioSessioniPosturaliParams
): Promise<CalendarioSessionePosturaleDto[]> {
  try {
    const { data } = await apiClient.get<ApiResponseDto<CalendarioSessionePosturaleDto[]>>(
      '/sessioni-posturali/calendario',
      { params }
    );
    if (!data.success || !Array.isArray(data.data)) {
      throw new Error(data.message || data.error || 'Impossibile caricare il calendario sessioni');
    }
    return sortCalendarRows(
      data.data.map((row) =>
        normalizeCalendarioRow(row as CalendarioSessionePosturaleDto & Record<string, unknown>)
      )
    );
  } catch (error) {
    throw extractSessioniPosturaliApiError(error, 'Impossibile caricare il calendario sessioni');
  }
}

export async function fetchCalendarioSessionePosturaleById(
  id: number
): Promise<CalendarioSessionePosturaleDto> {
  try {
    const { data } = await apiClient.get<ApiResponseDto<CalendarioSessionePosturaleDto>>(
      `/sessioni-posturali/calendario/${id}`
    );
    if (!data.success || !data.data) {
      throw new Error(data.message || data.error || 'Occorrenza di calendario non disponibile');
    }
    return normalizeCalendarioRow(data.data as CalendarioSessionePosturaleDto & Record<string, unknown>);
  } catch (error) {
    throw extractSessioniPosturaliApiError(error, 'Occorrenza di calendario non disponibile');
  }
}

/** Restituisce solo le prenotazioni dell’utente autenticato (filtro server-side). */
export async function fetchPartecipazioniSessioniPosturali(): Promise<PartecipanteSessionePosturaleDto[]> {
  try {
    const { data } = await apiClient.get<ApiResponseDto<PartecipanteSessionePosturaleDto[]>>(
      '/sessioni-posturali/partecipanti'
    );
    if (!data.success || !Array.isArray(data.data)) {
      throw new Error(data.message || data.error || 'Impossibile caricare le prenotazioni');
    }
    return data.data;
  } catch (error) {
    throw extractSessioniPosturaliApiError(error, 'Impossibile caricare le prenotazioni');
  }
}

export async function creaPrenotazioneSessionePosturale(
  payload: PartecipanteSessionePosturaleCreateDto
): Promise<PartecipanteSessionePosturaleDto> {
  try {
    const { data } = await apiClient.post<ApiResponseDto<PartecipanteSessionePosturaleDto>>(
      '/sessioni-posturali/partecipanti',
      { sessioneId: payload.sessioneId }
    );
    if (!data.success || !data.data) {
      throw new Error(data.message || data.error || 'Prenotazione non riuscita');
    }
    return data.data;
  } catch (error) {
    throw extractSessioniPosturaliApiError(error, 'Prenotazione non riuscita');
  }
}

export async function eliminaPrenotazioneSessionePosturale(prenotazioneId: number): Promise<void> {
  try {
    const { data } = await apiClient.delete<ApiResponseDto<unknown>>(
      `/sessioni-posturali/partecipanti/${prenotazioneId}`
    );
    if (data && data.success === false) {
      throw new Error(data.message || data.error || 'Impossibile annullare la prenotazione');
    }
  } catch (error) {
    throw extractSessioniPosturaliApiError(error, 'Impossibile annullare la prenotazione');
  }
}
