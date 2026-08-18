import { isAxiosError } from 'axios';
import { apiClient } from '../api';
import type { ApiResponseDto } from './formazioneService';

/**
 * Visite paziente (backend):
 * GET /api/visite/by-paziente/{pazienteId}?sortOrder=ASC|DESC
 * POST /api/visite — creazione visita (VisitaDto); permitAll sul path in SecurityConfig.
 */
export type VisitaSortOrder = 'ASC' | 'DESC';

/** Valori `Visita.StatusVisita` lato backend. */
export type VisitaStatus =
  | 'PRENOTATA'
  | 'EFFETTUATA'
  | 'NO_SHOW_CONTA'
  | 'NO_SHOW_NON_CONTA'
  | 'DISDETTA';

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

/** Discriminatore timeline GET /api/calendario/completo. `id` non è globale: chiave UI = tipo + id. */
export type CalendarioItemTipo = 'VISITA' | 'EVENTO' | 'NON_REPERIBILITA';

export type TipoEventoCalendario =
  | 'FORMAZIONE_INDIVIDUALE'
  | 'FORMAZIONE_TEAM'
  | 'RIUNIONE'
  | 'RIUNIONE_INDIVIDUALE'
  | 'RIUNIONE_TEAM'
  | 'SHOOTING_CONTENUTI'
  | 'SHOOTING_VISITA'
  | 'SHOOTING_PODCAST'
  | 'GPADEL'
  | 'CHIUSURA_STUDIO'
  | 'PAUSA_PRANZO'
  | 'TIROCINIO'
  | 'CORSO_FORMAZIONE'
  | 'COLLOQUIO'
  | 'ALTRO';

interface CalendarioNomeRef {
  id?: number;
  nome?: string | null;
  cognome?: string | null;
}

interface CalendarioItemBase {
  tipo: CalendarioItemTipo;
  id: number;
  /** Locale Europe/Rome, senza Z/offset: `2026-08-18T09:00:00`. */
  dataInizio?: string;
  dataFine?: string;
  dataVisita?: string;
  oraInizio?: string;
  oraFine?: string;
  osteopataNome?: string;
  osteopataCognome?: string;
  osteopata?: CalendarioNomeRef | null;
  studioId?: number;
  studioNome?: string;
  studio?: CalendarioNomeRef | null;
  stanzaId?: number;
  stanzaNome?: string;
  stanza?: CalendarioNomeRef | null;
}

export interface CalendarioVisitaItem extends CalendarioItemBase {
  tipo: 'VISITA';
  pazienteNome?: string;
  pazienteCognome?: string;
  paziente?: CalendarioNomeRef | null;
  siglaVisita?: string;
}

export interface CalendarioEventoItem extends CalendarioItemBase {
  tipo: 'EVENTO';
  tipoEvento?: TipoEventoCalendario | string;
  titolo?: string;
  descrizione?: string;
  raggruppamentoId?: string;
  /** ID utente, non osteopataId. */
  invitatoId?: number;
  invitatoNome?: string;
  invitatoCognome?: string;
}

export interface CalendarioNonReperibilitaItem extends CalendarioItemBase {
  tipo: 'NON_REPERIBILITA';
  tipoReperibilita?: string;
  motivo?: string;
}

export type CalendarioItemDto =
  | CalendarioVisitaItem
  | CalendarioEventoItem
  | CalendarioNonReperibilitaItem;

export interface CalendarioCompletoDto {
  items?: CalendarioItemDto[];
  totalVisite?: number;
  totalPagesVisite?: number;
  currentPageVisite?: number;
  totalEventi?: number;
  totalNonReperibilita?: number;
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

/**
 * GET /api/calendario/completo — timeline osteopata (visite + eventi invitati + non reperibilità).
 * Sostituisce GET /api/visite per l’agenda del giorno. Sempre passare osteopataId + date.
 * `items` è già ordinato per dataInizio crescente.
 */
export async function fetchCalendarioCompletoGiorno(params: {
  osteopataId: number;
  dataInizio: string;
  dataFine: string;
}): Promise<CalendarioItemDto[]> {
  const { osteopataId, dataInizio, dataFine } = params;
  const { data } = await apiClient.get<ApiResponseDto<CalendarioCompletoDto>>('/calendario/completo', {
    params: { osteopataId, dataInizio, dataFine },
  });
  if (!data.success || !data.data) {
    throw new Error(data.message || data.error || 'Impossibile caricare l’agenda');
  }
  return Array.isArray(data.data.items) ? data.data.items : [];
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
