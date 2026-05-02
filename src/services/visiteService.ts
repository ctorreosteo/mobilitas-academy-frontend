import { apiClient } from '../api';
import type { ApiResponseDto } from './formazioneService';

/**
 * Visite paziente (backend):
 * GET /api/visite/by-paziente/{pazienteId}?sortOrder=ASC|DESC
 * — pubblico (permitAll); payload leggero.
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
