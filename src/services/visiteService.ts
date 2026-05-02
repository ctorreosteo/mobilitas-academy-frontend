import { isAxiosError } from 'axios';
import { apiClient } from '../api';
import type { ApiResponseDto } from './formazioneService';

/**
 * Visite paziente (backend):
 * GET /api/visite/by-paziente/{pazienteId}?sortOrder=ASC|DESC
 * POST /api/visite — creazione visita (VisitaDto); permitAll sul path in SecurityConfig.
 */
export type VisitaSortOrder = 'ASC' | 'DESC';

export interface VisitaMinimaleDto {
  id: number;
  dataVisita: string;
  oraInizio?: string | null;
  pazienteNome?: string | null;
  pazienteCognome?: string | null;
  osteopataNome?: string | null;
  osteopataCognome?: string | null;
  statusVisita?: string | null;
  statusPagamento?: string | null;
  siglaVisita?: string | null;
  prezzoVisita?: number | null;
}

/** Riferimenti per-id nel body POST /api/visite (allineato a VisitaDto lato Java). */
export interface VisitaIdRefDto {
  id: number;
}

export interface CreateVisitaRequestDto {
  dataVisita: string;
  oraInizio: string;
  oraFine: string;
  prezzoVisita?: number | null;
  paziente?: VisitaIdRefDto | null;
  osteopata?: VisitaIdRefDto | null;
  studio?: VisitaIdRefDto | null;
  stanza?: VisitaIdRefDto | null;
  note?: string | null;
  motivoDisdetta?: string | null;
  /** Serializzato come `risorse` dal backend (`risorseUtilizzate`). */
  risorse?: VisitaIdRefDto[];
  acquistoId?: number | null;
  servizio?: VisitaIdRefDto | null;
  richiestaRecensione?: boolean;
}

/** Risposta creazione: envelope con VisitaDto completo; qui solo i campi usati dall’app. */
export type VisitaCreataDto = VisitaMinimaleDto & {
  oraFine?: string | null;
};

export async function fetchVisiteByPaziente(
  pazienteId: number,
  options?: { sortOrder?: VisitaSortOrder }
): Promise<VisitaMinimaleDto[]> {
  const sortOrder = options?.sortOrder ?? 'DESC';
  const { data } = await apiClient.get<ApiResponseDto<VisitaMinimaleDto[]>>(
    `/visite/by-paziente/${pazienteId}`,
    { params: { sortOrder } }
  );
  if (!data.success || !Array.isArray(data.data)) {
    throw new Error(data.message || data.error || 'Impossibile caricare le visite');
  }
  return data.data;
}

export async function createVisita(body: CreateVisitaRequestDto): Promise<VisitaCreataDto> {
  try {
    const { data } = await apiClient.post<ApiResponseDto<VisitaCreataDto>>('/visite', body);
    if (!data.success || !data.data) {
      throw new Error(data.message || data.error || 'Errore nella creazione visita');
    }
    return data.data;
  } catch (e) {
    if (isAxiosError(e) && e.response?.data && typeof e.response.data === 'object') {
      const envelope = e.response.data as ApiResponseDto<unknown>;
      const msg = envelope.message || envelope.error;
      if (typeof msg === 'string' && msg.length > 0) throw new Error(msg);
    }
    if (isAxiosError(e) && typeof e.response?.data === 'string') {
      throw new Error(e.response.data);
    }
    throw e;
  }
}
