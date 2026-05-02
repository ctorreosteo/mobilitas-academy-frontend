import { apiClient } from '../api';
import type { ApiResponseDto } from './formazioneService';

/**
 * Catalogo studi / osteopati (backend reale):
 * GET /api/studi — solo attivi, ordinati per nome
 * GET /api/osteopati/studio/{studioId} — osteopati con disponibilità o visite future su quello studio
 *
 * Disponibilità slot (intervallo date):
 * GET /api/osteopati/disponibilita-effettive?dataInizio&dataFine&studioId&osteopataIds=...
 * (Giorno singolo: GET /api/visite/disponibilita?data&osteopataId&studioId — non usato qui.)
 *
 * Creazione visita da app paziente: visiteService `POST /api/visite` (VisitaDto).
 * Legacy / altri flussi:
 * POST /api/visite-studio/prenotazioni — `creaPrenotazioneVisita`
 * DELETE /api/visite-studio/prenotazioni/:id
 *
 * Storico visite paziente: visiteService (GET /api/visite/by-paziente/...).
 */
export interface StudioDto {
  id: number;
  nome: string;
  indirizzo?: string | null;
  citta?: string | null;
  cap?: string | null;
  telefono?: string | null;
  email?: string | null;
  orariApertura?: unknown[] | null;
  note?: string | null;
  attivo?: boolean;
}

export interface OsteopataDto {
  id: number;
  nome: string;
  cognome: string;
  email?: string | null;
  telefono?: string | null;
  immagineProfiloUrl?: string | null;
  colore?: string | null;
  isTirocinante?: boolean;
  genere?: string | null;
  specializzazioni?: string | null;
  utente?: unknown;
}

/** Stanza opzionale su uno slot (backend: StanzaDto). */
export interface StanzaDto {
  id: number;
  nome: string;
  numero?: number | null;
  note?: string | null;
  attivo?: boolean;
}

/** Elemento di `slotDisponibili` (backend: SlotDisponibilitaDto). */
export interface SlotDisponibilitaBackendDto {
  data: string;
  oraInizio: string;
  oraFine: string;
  stanza?: StanzaDto | null;
  status?: string | null;
}

/** Una riga per osteopata (backend: DisponibilitaCalcolataDto). */
export interface DisponibilitaCalcolataDto {
  osteopataId: number;
  osteopataNome?: string | null;
  osteopataCognome?: string | null;
  slotDisponibili: SlotDisponibilitaBackendDto[];
  status?: string | null;
}

/** Slot normalizzato per l’app (`inizio` / `fine` in ISO per confronti e UI). */
export interface SlotDisponibilitaDto {
  inizio: string;
  fine: string;
  stanza?: StanzaDto | null;
  status?: string | null;
}

function normalizeTimePart(t: string): string {
  const s = t.trim();
  if (s.length === 5) return `${s}:00`;
  return s;
}

/** `data` YYYY-MM-DD + ora HH:mm o HH:mm:ss → coppia ISO UTC (mezzogiorno locale sul giorno per parsing stabile). */
function slotBackendToApp(row: SlotDisponibilitaBackendDto): SlotDisponibilitaDto | null {
  const day = row.data?.trim();
  const oi = row.oraInizio?.trim();
  const of = row.oraFine?.trim();
  if (!day || !oi || !of) return null;
  const start = `${day}T${normalizeTimePart(oi)}`;
  const end = `${day}T${normalizeTimePart(of)}`;
  const i = Date.parse(start);
  const f = Date.parse(end);
  if (Number.isNaN(i) || Number.isNaN(f)) return null;
  return {
    inizio: new Date(i).toISOString(),
    fine: new Date(f).toISOString(),
    stanza: row.stanza ?? null,
    status: row.status ?? null,
  };
}

function flattenDisponibilitaEffettive(payload: unknown): SlotDisponibilitaDto[] {
  if (!Array.isArray(payload)) return [];
  const out: SlotDisponibilitaDto[] = [];
  for (const perOsteopata of payload) {
    if (!perOsteopata || typeof perOsteopata !== 'object') continue;
    const raw = perOsteopata as DisponibilitaCalcolataDto;
    const slots = raw.slotDisponibili;
    if (!Array.isArray(slots)) continue;
    for (const s of slots) {
      if (!s || typeof s !== 'object') continue;
      const mapped = slotBackendToApp(s as SlotDisponibilitaBackendDto);
      if (mapped) out.push(mapped);
    }
  }
  return out;
}

export interface PrenotazioneVisitaDto {
  id: number;
  osteopataId: number;
  studioId: number;
  inizio: string;
  fine?: string | null;
  stato?: string | null;
  osteopataNome?: string | null;
  osteopataCognome?: string | null;
  studioNome?: string | null;
}

/** GET /api/studi — studi con attivo=true, ordinati per nome. */
export async function fetchStudiAttivi(): Promise<StudioDto[]> {
  const { data } = await apiClient.get<ApiResponseDto<StudioDto[]>>('/studi');
  if (!data.success || !Array.isArray(data.data)) {
    throw new Error(data.message || data.error || 'Impossibile caricare gli studi');
  }
  return data.data;
}

/** GET /api/osteopati/{id} — scheda singola (autenticato). */
export async function fetchOsteopataById(osteopataId: number): Promise<OsteopataDto> {
  const { data } = await apiClient.get<ApiResponseDto<OsteopataDto>>(`/osteopati/${osteopataId}`);
  if (!data.success || !data.data) {
    throw new Error(data.message || data.error || 'Impossibile caricare i dati dell’osteopata');
  }
  return data.data;
}

/** GET /api/osteopati/studio/{studioId} */
export async function fetchOsteopatiPerStudio(studioId: number): Promise<OsteopataDto[]> {
  const { data } = await apiClient.get<ApiResponseDto<OsteopataDto[]>>(
    `/osteopati/studio/${studioId}`
  );
  if (!data.success || !Array.isArray(data.data)) {
    throw new Error(data.message || data.error || 'Impossibile caricare gli osteopati per questo studio');
  }
  return data.data;
}

export async function fetchDisponibilitaVisite(params: {
  osteopataId: number;
  studioId: number;
  dataInizio: string;
  dataFine: string;
}): Promise<SlotDisponibilitaDto[]> {
  const qs = new URLSearchParams({
    dataInizio: params.dataInizio,
    dataFine: params.dataFine,
    studioId: String(params.studioId),
  });
  qs.append('osteopataIds', String(params.osteopataId));

  const { data } = await apiClient.get<ApiResponseDto<DisponibilitaCalcolataDto[] | null>>(
    `/osteopati/disponibilita-effettive?${qs.toString()}`
  );
  if (!data.success || data.data === undefined || data.data === null) {
    throw new Error(data.message || data.error || 'Impossibile caricare le disponibilità');
  }
  return flattenDisponibilitaEffettive(data.data);
}

export async function creaPrenotazioneVisita(body: {
  osteopataId: number;
  studioId: number;
  inizio: string;
}): Promise<PrenotazioneVisitaDto> {
  const { data } = await apiClient.post<ApiResponseDto<PrenotazioneVisitaDto>>(
    '/visite-studio/prenotazioni',
    body
  );
  if (!data.success || !data.data) {
    throw new Error(data.message || data.error || 'Prenotazione non riuscita');
  }
  return data.data;
}

export async function annullaPrenotazioneVisita(id: number): Promise<void> {
  const { data } = await apiClient.delete<ApiResponseDto<unknown>>(
    `/visite-studio/prenotazioni/${id}`
  );
  if (!data.success) {
    throw new Error(data.message || data.error || 'Impossibile annullare la prenotazione');
  }
}
