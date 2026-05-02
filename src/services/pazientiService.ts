import { apiClient } from '../api';
import type { ApiResponseDto } from './formazioneService';

/** Pagina Spring serializzata in JSON (GET /api/pazienti/search/advanced). */
export interface SpringPageDto<T> {
  content: T[];
  totalElements?: number;
  totalPages?: number;
  size?: number;
  number?: number;
}

export interface PazienteDto {
  id: number;
  nome?: string | null;
  cognome?: string | null;
  email?: string | null;
  prefissoCellulare?: string | null;
  cellulare?: string | null;
  eta?: string | null;
}

const MIN_QUERY_LEN = 2;

/**
 * GET /api/pazienti/search/advanced — ricerca vaga nome+cognome (`query`).
 * Non chiamare con stringa vuota (caricherebbe tutti i pazienti).
 */
export async function searchPazientiAdvanced(params: {
  query: string;
  page?: number;
  size?: number;
}): Promise<SpringPageDto<PazienteDto>> {
  const q = params.query.trim();
  if (q.length < MIN_QUERY_LEN) {
    return { content: [], totalElements: 0, totalPages: 0, size: params.size ?? 25, number: 0 };
  }
  const { data } = await apiClient.get<ApiResponseDto<SpringPageDto<PazienteDto>>>(
    '/pazienti/search/advanced',
    {
      params: {
        query: q,
        page: params.page ?? 0,
        size: Math.min(params.size ?? 50, 100),
      },
    }
  );
  if (!data.success || !data.data) {
    throw new Error(data.message || data.error || 'Ricerca pazienti non riuscita');
  }
  const page = data.data;
  if (!Array.isArray(page.content)) {
    throw new Error('Formato risposta pazienti non valido');
  }
  return page;
}

export function pazienteLabel(p: PazienteDto): string {
  const n = [p.nome?.trim(), p.cognome?.trim()].filter(Boolean).join(' ').trim();
  return n || `Paziente #${p.id}`;
}

export { MIN_QUERY_LEN as PAZIENTI_SEARCH_MIN_QUERY_LEN };
