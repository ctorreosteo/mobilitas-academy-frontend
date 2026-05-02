import { apiClient } from '../api';
import type { ApiResponseDto } from './formazioneService';

export interface ServizioDto {
  id: number;
  nome: string;
  descrizione?: string | null;
  dataInizioValidita?: string | null;
  dataFineValidita?: string | null;
  numeroVisite?: number | null;
  prezzo?: number | null;
  prezzoAnticipato?: number | null;
  prezzoRate?: number | null;
  numeroRate?: number | null;
  durata?: number | null;
}

function coerceId(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function normalizeServizioShape(raw: unknown): ServizioDto {
  if (!raw || typeof raw !== 'object') {
    return { id: 0, nome: '' };
  }
  const r = raw as Record<string, unknown>;
  const base = { ...(raw as ServizioDto) };
  const resolved =
    coerceId(base.id) ??
    coerceId(r.Id) ??
    coerceId(r.servizioId) ??
    coerceId(r.id);
  base.id = typeof resolved === 'number' ? resolved : 0;
  if (typeof base.nome !== 'string' || base.nome.trim() === '') {
    const n = r.nome;
    base.nome = typeof n === 'string' ? n : '';
  }
  return base;
}

/** Estrae un array di servizi da `ApiResponseDto.data` o da oggetti annidati (Jackson / paginazione). */
export function normalizeServiziList(raw: unknown): ServizioDto[] {
  if (raw == null) return [];
  if (Array.isArray(raw)) {
    return raw
      .map(normalizeServizioShape)
      .filter((s) => s.id > 0 && (s.nome?.trim().length ?? 0) > 0);
  }
  if (typeof raw === 'object') {
    const o = raw as Record<string, unknown>;
    for (const key of ['content', 'servizi', 'data', 'items', 'results'] as const) {
      const v = o[key];
      if (Array.isArray(v)) {
        return normalizeServiziList(v);
      }
    }
  }
  return [];
}

/** GET /api/servizi/attivi — servizi validi alla data del server (JWT). */
export async function fetchServiziAttivi(): Promise<ServizioDto[]> {
  const { data } = await apiClient.get<ApiResponseDto<unknown>>('/servizi/attivi');
  if (!data.success) {
    throw new Error(data.message || data.error || 'Impossibile caricare i servizi');
  }
  return normalizeServiziList(data.data);
}

function servizioPriceSegment(s: ServizioDto): string | null {
  const rateCount =
    s.numeroRate != null && Number.isFinite(Number(s.numeroRate)) && Number(s.numeroRate) > 0
      ? Number(s.numeroRate)
      : null;
  const anticipato =
    s.prezzoAnticipato != null && !Number.isNaN(Number(s.prezzoAnticipato))
      ? Number(s.prezzoAnticipato).toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })
      : null;
  const rate =
    s.prezzoRate != null && !Number.isNaN(Number(s.prezzoRate))
      ? rateCount != null
        ? `${(Number(s.prezzoRate) / rateCount).toLocaleString('it-IT', {
            style: 'currency',
            currency: 'EUR',
          })} x ${rateCount} rate`
        : Number(s.prezzoRate).toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })
      : null;
  const standard =
    s.prezzo != null && !Number.isNaN(Number(s.prezzo))
      ? Number(s.prezzo).toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })
      : null;

  if (anticipato && rate) return `${anticipato} oppure ${rate}`;
  if (anticipato) return anticipato;
  if (rate) return rate;
  if (standard) return standard;
  return null;
}

/** Visite e prezzi, senza il nome servizio (per layout con badge sul nome). */
export function servizioRestLabel(s: ServizioDto): string {
  const parts: string[] = [];
  if (s.numeroVisite != null) {
    parts.push(`${s.numeroVisite} visite`);
  }
  const price = servizioPriceSegment(s);
  if (price) parts.push(price);
  return parts.join(' · ');
}

export function servizioLabel(s: ServizioDto): string {
  const nome = s.nome?.trim();
  const rest = servizioRestLabel(s);
  return [nome, rest].filter(Boolean).join(' · ');
}
