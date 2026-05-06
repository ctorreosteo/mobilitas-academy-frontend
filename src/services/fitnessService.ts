import { apiClient } from '../api';
import type { ApiResponseDto } from './formazioneService';

export interface CalendarioSessioneFitnessDto {
  id: number;
  data: string;
  oraInizio: string;
  oraFine: string;
  sessioneId: number;
  sessioneNome: string;
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

export async function fetchCalendarioSessioniFitness(): Promise<CalendarioSessioneFitnessDto[]> {
  const { data } = await apiClient.get<ApiResponseDto<CalendarioSessioneFitnessDto[]>>(
    '/fitness/calendario-sessioni'
  );
  if (!data.success || !Array.isArray(data.data)) {
    throw new Error(data.message || data.error || 'Impossibile caricare il calendario fitness');
  }
  return data.data;
}

export async function fetchPartecipazioniSessioniFitness(): Promise<PartecipanteSessioneFitnessDto[]> {
  const { data } = await apiClient.get<ApiResponseDto<PartecipanteSessioneFitnessDto[]>>(
    '/fitness/partecipanti-sessioni'
  );
  if (!data.success || !Array.isArray(data.data)) {
    throw new Error(data.message || data.error || 'Impossibile caricare le prenotazioni fitness');
  }
  return data.data;
}

export async function creaPrenotazioneSessioneFitness(
  payload: PartecipanteSessioneFitnessCreateUpdateDto
): Promise<PartecipanteSessioneFitnessDto> {
  const { data } = await apiClient.post<ApiResponseDto<PartecipanteSessioneFitnessDto>>(
    '/fitness/partecipanti-sessioni',
    payload
  );
  if (!data.success || !data.data) {
    throw new Error(data.message || data.error || 'Prenotazione sessione fitness non riuscita');
  }
  return data.data;
}

export async function annullaPrenotazioneSessioneFitness(partecipazioneId: number): Promise<void> {
  const { data } = await apiClient.delete<ApiResponseDto<unknown>>(
    `/fitness/partecipanti-sessioni/${partecipazioneId}`
  );
  if (!data.success) {
    throw new Error(data.message || data.error || 'Impossibile annullare la prenotazione fitness');
  }
}
