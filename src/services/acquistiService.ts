import { isAxiosError } from 'axios';
import { apiClient } from '../api';
import type { ApiResponseDto } from './formazioneService';

export interface AcquistoDto {
  id: number;
  pazienteId?: number;
  pazienteNome?: string | null;
  pazienteCognome?: string | null;
  servizioId?: number | null;
  servizioNome?: string | null;
  statusPagamento?: string | null;
  statusPagamentoDescrizione?: string | null;
  dataAcquisto?: string | null;
  prenotabile?: boolean;
  /** Alcune serializzazioni Jackson espongono il getter `isPrenotabile()` così. */
  isPrenotabile?: boolean;
  totaleScontato?: number | null;
  totalePagamenti?: number | null;
}

/** True solo se il backend indica esplicitamente che si può prenotare una visita su questo acquisto. */
export function isAcquistoPrenotabile(a: AcquistoDto): boolean {
  return a.prenotabile === true || a.isPrenotabile === true;
}

function dataAcquistoToMs(iso: string | null | undefined): number {
  if (iso == null || String(iso).trim() === '') return Number.POSITIVE_INFINITY;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? Number.POSITIVE_INFINITY : t;
}

/**
 * Tra gli acquisti prenotabili, l’id con `dataAcquisto` meno recente (più vecchio).
 * Senza data parsabile si considera “più nuovo” e non vince il confronto.
 */
export function leastRecentPrenotabileAcquistoId(acquisti: AcquistoDto[]): number | null {
  const pren = acquisti.filter(isAcquistoPrenotabile);
  if (pren.length === 0) return null;
  let chosen = pren[0];
  let chosenMs = dataAcquistoToMs(chosen.dataAcquisto);
  for (let i = 1; i < pren.length; i++) {
    const a = pren[i];
    const ms = dataAcquistoToMs(a.dataAcquisto);
    if (ms < chosenMs) {
      chosenMs = ms;
      chosen = a;
    } else if (ms === chosenMs && a.id < chosen.id) {
      chosen = a;
    }
  }
  return chosen.id;
}

function normalizeAcquistiResponse(raw: unknown): AcquistoDto[] {
  if (Array.isArray(raw)) {
    return raw.map(normalizeAcquistoShape) as AcquistoDto[];
  }
  if (raw && typeof raw === 'object') {
    const o = raw as Record<string, unknown>;
    if (Array.isArray(o.content)) {
      return o.content.map(normalizeAcquistoShape) as AcquistoDto[];
    }
    if (Array.isArray(o.acquisti)) {
      return o.acquisti.map(normalizeAcquistoShape) as AcquistoDto[];
    }
    if (Array.isArray(o.data)) {
      return o.data.map(normalizeAcquistoShape) as AcquistoDto[];
    }
  }
  return [];
}

/** Allinea `id` se il JSON usa `Id` / `acquistoId` (Jackson / DTO). */
function normalizeAcquistoShape(raw: unknown): AcquistoDto {
  if (!raw || typeof raw !== 'object') {
    return { id: 0 };
  }
  const r = raw as Record<string, unknown>;
  const base = { ...(raw as AcquistoDto) };
  const fromAlt =
    typeof r.Id === 'number' && Number.isFinite(r.Id)
      ? r.Id
      : typeof r.acquistoId === 'number' && Number.isFinite(r.acquistoId)
        ? r.acquistoId
        : undefined;
  if (typeof base.id !== 'number' || !Number.isFinite(base.id)) {
    if (typeof fromAlt === 'number') {
      base.id = fromAlt;
    }
  }
  return base;
}

/**
 * GET /api/acquisti/paziente/{pazienteId}
 * Richiede JWT (endpoint protetto rispetto a pazienti/visite).
 */
export async function fetchAcquistiByPaziente(
  pazienteId: number,
  options?: { sortDir?: 'ASC' | 'DESC'; size?: number }
): Promise<AcquistoDto[]> {
  const sortDir = options?.sortDir ?? 'DESC';
  const size = options?.size != null ? Math.min(options.size, 1000) : undefined;
  const { data } = await apiClient.get<ApiResponseDto<AcquistoDto[]>>(
    `/acquisti/paziente/${pazienteId}`,
    {
      params: {
        sortDir,
        ...(size != null ? { size } : {}),
      },
    }
  );

  if (!data.success || data.data === undefined || data.data === null) {
    throw new Error(data.message || data.error || 'Impossibile caricare gli acquisti del paziente');
  }

  return normalizeAcquistiResponse(data.data);
}

export type MetodoPagamentoAcquisto = 'VOLTA_PER_VOLTA' | 'TUTTO_ANTICIPATO' | 'RATE';

export interface CreateAcquistoRequestDto {
  pazienteId: number;
  servizioId: number;
  metodoPagamento?: MetodoPagamentoAcquisto;
  tipoSconto?: 'PERCENTUALE' | 'FISSO' | null;
  sconto?: number | null;
  note?: string | null;
  motivoSconto?: string | null;
  dataAcquisto?: string | null;
  visiteIds?: number[];
}

/** POST /api/acquisti — crea acquisto; risposta arricchita come in lettura. */
export async function createAcquisto(body: CreateAcquistoRequestDto): Promise<AcquistoDto> {
  try {
    const { data } = await apiClient.post<ApiResponseDto<AcquistoDto>>('/acquisti', body);
    if (!data.success || !data.data) {
      throw new Error(data.message || data.error || 'Creazione acquisto non riuscita');
    }
    return normalizeAcquistoShape(data.data);
  } catch (e) {
    if (isAxiosError(e) && e.response?.data && typeof e.response.data === 'object') {
      const envelope = e.response.data as ApiResponseDto<unknown>;
      const msg = envelope.message || envelope.error;
      if (typeof msg === 'string' && msg.length > 0) throw new Error(msg);
    }
    throw e;
  }
}

/** Etichetta compatta per elenco / menu. */
export function acquistoLabel(a: AcquistoDto): string {
  const svc = a.servizioNome?.trim() || 'Acquisto';
  const data = a.dataAcquisto?.trim();
  const dataShort = data && data.length >= 10 ? data.slice(0, 10) : data;
  const stato = a.statusPagamentoDescrizione?.trim() || a.statusPagamento?.trim();
  return [svc, dataShort, stato].filter(Boolean).join(' · ');
}
