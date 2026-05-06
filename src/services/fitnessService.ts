import { isAxiosError } from 'axios';
import { apiClient } from '../api';
import type { ApiResponseDto } from './formazioneService';

export interface CalendarioSessioneFitnessDto {
  id: number;
  data: string;
  oraInizio: string;
  oraFine: string;
  sessioneId: number;
  sessioneNome: string;
  sessioneDescrizione?: string | null;
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
    return sortCalendarRows(data.data);
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
