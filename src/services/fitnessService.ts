import { isAxiosError } from 'axios';
import { apiClient } from '../api';
import type { ApiResponseDto } from './formazioneService';
import { pickCoverImageUrl } from '../utils/pickCoverImageUrl';

export interface SessioneFitnessDto {
  id: number;
  nome: string;
  descrizione: string;
  numeroMassimoPartecipanti: number;
  durata: number;
  tags: string;
  immagineCopertinaUrl: string | null;
}

export interface CalendarioSessioneFitnessDto {
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

export interface PartecipanteSessioneFitnessDto {
  id: number;
  utenteId: number;
  utenteNomeCompleto: string;
  sessioneId: number;
  sessioneNome: string;
}

export interface PartecipanteSessioneFitnessCreateUpdateDto {
  utenteId: number;
  sessioneId: number;
}

export interface FetchCalendarioSessioniFitnessParams {
  data?: string;
  dataDa?: string;
  dataA?: string;
  sessioneId?: number;
  istruttoreId?: number;
}

function normalizeSessioneFitness(raw: SessioneFitnessDto & Record<string, unknown>): SessioneFitnessDto {
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
  raw: CalendarioSessioneFitnessDto & Record<string, unknown>
): CalendarioSessioneFitnessDto {
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

function sortCalendarRows(rows: CalendarioSessioneFitnessDto[]): CalendarioSessioneFitnessDto[] {
  return [...rows].sort((a, b) => {
    const byDate = a.data.localeCompare(b.data);
    if (byDate !== 0) return byDate;
    return a.oraInizio.localeCompare(b.oraInizio);
  });
}

function extractFitnessApiError(error: unknown): Error {
  if (isAxiosError(error) && error.response?.data && typeof error.response.data === 'object') {
    const envelope = error.response.data as ApiResponseDto<unknown>;
    const msg = envelope.message || envelope.error;
    if (typeof msg === 'string' && msg.length > 0) return new Error(msg);
  }
  if (isAxiosError(error) && typeof error.response?.data === 'string') {
    return new Error(error.response.data);
  }
  return error instanceof Error
    ? error
    : new Error('Impossibile comunicare con il servizio fitness');
}

export function parseSessioneFitnessTags(tags: string | null | undefined): string[] {
  if (!tags?.trim()) return [];
  return tags
    .split(';')
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export async function fetchSessioniFitness(): Promise<SessioneFitnessDto[]> {
  try {
    const { data } = await apiClient.get<ApiResponseDto<SessioneFitnessDto[]>>('/fitness/sessioni');
    if (!data.success || !Array.isArray(data.data)) {
      throw new Error(data.message || data.error || 'Impossibile caricare il catalogo sessioni fitness');
    }
    return data.data.map((row) =>
      normalizeSessioneFitness(row as SessioneFitnessDto & Record<string, unknown>)
    );
  } catch (error) {
    throw extractFitnessApiError(error);
  }
}

export async function fetchCalendarioSessioniFitness(
  params?: FetchCalendarioSessioniFitnessParams
): Promise<CalendarioSessioneFitnessDto[]> {
  try {
    const { data } = await apiClient.get<ApiResponseDto<CalendarioSessioneFitnessDto[]>>(
      '/fitness/calendario-sessioni',
      { params }
    );
    if (!data.success || !Array.isArray(data.data)) {
      throw new Error(data.message || data.error || 'Impossibile caricare il calendario fitness');
    }
    return sortCalendarRows(
      data.data.map((row) =>
        normalizeCalendarioRow(row as CalendarioSessioneFitnessDto & Record<string, unknown>)
      )
    );
  } catch (error) {
    throw extractFitnessApiError(error);
  }
}

export async function fetchPartecipazioniSessioniFitness(): Promise<PartecipanteSessioneFitnessDto[]> {
  try {
    const { data } = await apiClient.get<ApiResponseDto<PartecipanteSessioneFitnessDto[]>>(
      '/fitness/partecipanti-sessioni'
    );
    if (!data.success || !Array.isArray(data.data)) {
      throw new Error(data.message || data.error || 'Impossibile caricare le prenotazioni fitness');
    }
    return data.data;
  } catch (error) {
    throw extractFitnessApiError(error);
  }
}

export async function creaPrenotazioneSessioneFitness(
  payload: PartecipanteSessioneFitnessCreateUpdateDto
): Promise<PartecipanteSessioneFitnessDto> {
  try {
    const { data } = await apiClient.post<ApiResponseDto<PartecipanteSessioneFitnessDto>>(
      '/fitness/partecipanti-sessioni',
      payload
    );
    if (!data.success || !data.data) {
      throw new Error(data.message || data.error || 'Prenotazione sessione fitness non riuscita');
    }
    return data.data;
  } catch (error) {
    throw extractFitnessApiError(error);
  }
}

export async function annullaPrenotazioneSessioneFitness(partecipazioneId: number): Promise<void> {
  try {
    const { data } = await apiClient.delete<ApiResponseDto<unknown>>(
      `/fitness/partecipanti-sessioni/${partecipazioneId}`
    );
    if (!data.success) {
      throw new Error(data.message || data.error || 'Impossibile annullare la prenotazione fitness');
    }
  } catch (error) {
    throw extractFitnessApiError(error);
  }
}
