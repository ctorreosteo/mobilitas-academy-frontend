import type { OsteopataDto, SlotDisponibilitaDto, StudioDto } from '../../services/studioVisitsService';

const HOUR_MS = 60 * 60 * 1000;

/**
 * Scompone una fascia oraria lunga (es. 9–13) in segmenti consecutivi da al massimo 1 ora,
 * mantenendo stanza e status. Sotto l’ora resta un solo segmento (es. 45 min).
 */
export function expandSlotToHourlyChunks(slot: SlotDisponibilitaDto): SlotDisponibilitaDto[] {
  const startMs = new Date(slot.inizio).getTime();
  const endMs = new Date(slot.fine).getTime();
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
    return [slot];
  }

  const out: SlotDisponibilitaDto[] = [];
  let cursor = startMs;
  while (cursor < endMs) {
    const next = Math.min(cursor + HOUR_MS, endMs);
    out.push({
      ...slot,
      inizio: new Date(cursor).toISOString(),
      fine: new Date(next).toISOString(),
    });
    cursor = next;
  }
  return out.length > 0 ? out : [slot];
}

export function expandSlotsToHourly(slots: SlotDisponibilitaDto[]): SlotDisponibilitaDto[] {
  return slots.flatMap(expandSlotToHourlyChunks);
}

export function toYmd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Data locale `YYYY-MM-DD` (evita shift UTC di {@link toYmd} verso mezzanotte). */
export function toLocalYmd(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function addMonths(d: Date, n: number): Date {
  const x = new Date(d.getTime());
  x.setMonth(x.getMonth() + n);
  return x;
}

export function formatSlotLabel(inizio: string, fine: string): string {
  const a = new Date(inizio);
  const b = new Date(fine);
  return `${a.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })} – ${b.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}`;
}

export function formatDayTitle(isoDay: string): string {
  const d = new Date(isoDay + 'T12:00:00');
  return d.toLocaleDateString('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** Giorno della settimana per esteso in italiano, es. "Lunedì", "Mercoledì". */
export function formatWeekdayLongIt(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(`${d}T12:00:00`) : d;
  const raw = date.toLocaleDateString('it-IT', { weekday: 'long' }).trim();
  if (!raw) return '';
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

/** Alias verso {@link formatWeekdayLongIt}: evita crash se il bundle Metro è ancora su import vecchi. */
export const formatWeekdayShortIt = formatWeekdayLongIt;

export function groupSlotsByDay(
  slots: SlotDisponibilitaDto[]
): { title: string; data: SlotDisponibilitaDto[] }[] {
  const sorted = [...slots].sort((x, y) => new Date(x.inizio).getTime() - new Date(y.inizio).getTime());
  const map = new Map<string, SlotDisponibilitaDto[]>();
  for (const s of sorted) {
    const key = new Date(s.inizio).toISOString().slice(0, 10);
    const arr = map.get(key) ?? [];
    arr.push(s);
    map.set(key, arr);
  }
  return Array.from(map.entries()).map(([day, data]) => ({
    title: formatDayTitle(day),
    data,
  }));
}

export function osteopataLabel(o: OsteopataDto): string {
  return [o.cognome, o.nome].filter(Boolean).join(' ').trim();
}

/** Osteopati che non devono comparire nel picker di prenotazione visite. */
export function isOsteopataExcludedFromVisitBooking(o: {
  cognome?: string | null;
  nome?: string | null;
}): boolean {
  const parts = [o.cognome, o.nome]
    .map((p) => (p ?? '').trim().toLowerCase())
    .filter(Boolean);
  return parts.includes('ricciardi');
}

export function studioLabel(s: StudioDto): string {
  const geo = [s.indirizzo, s.citta, s.cap].filter(Boolean).join(', ');
  if (geo) return `${s.nome} — ${geo}`;
  return s.nome;
}

export function formatOraDisplay(ora: string | null | undefined): string {
  if (!ora || typeof ora !== 'string') return '';
  return ora.length >= 5 ? ora.slice(0, 5) : ora;
}

/** Estrae `HH:mm` da `YYYY-MM-DDTHH:mm:ss` senza interpretarlo come UTC. */
export function formatLocalDateTimeTime(isoLocal: string | null | undefined): string {
  if (!isoLocal || typeof isoLocal !== 'string') return '';
  const timePart = isoLocal.includes('T') ? isoLocal.split('T')[1] : isoLocal;
  return formatOraDisplay(timePart);
}

/**
 * Data e ora da datetime locale senza timezone (`2026-07-16T10:05:00`).
 * Non passa da `Date` sull’istante intero, per evitare shift UTC.
 */
export function formatLocalDateTimeDisplay(isoLocal: string | null | undefined): string {
  if (!isoLocal || typeof isoLocal !== 'string') return '';
  const datePart = isoLocal.includes('T') ? isoLocal.split('T')[0] : isoLocal.slice(0, 10);
  const time = formatLocalDateTimeTime(isoLocal);
  const day = datePart.length >= 10 ? formatDayTitle(datePart) : '';
  if (day && time) return `${day} · ${time}`;
  return day || time;
}

function formatShortDayIt(ymd: string): string {
  const d = new Date(`${ymd}T12:00:00`);
  return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
}

/**
 * Fascia oraria in timeline: preferisce `oraInizio`/`oraFine`; altrimenti `dataInizio`/`dataFine`.
 * Se l’evento copre più giorni, include anche la data.
 */
export function formatTimelineFascia(item: {
  oraInizio?: string | null;
  oraFine?: string | null;
  dataInizio?: string | null;
  dataFine?: string | null;
}): string {
  const oraIn = formatOraDisplay(item.oraInizio);
  const oraOut = formatOraDisplay(item.oraFine);
  if (oraIn || oraOut) {
    return oraIn && oraOut && oraOut !== oraIn ? `${oraIn} – ${oraOut}` : oraIn || oraOut;
  }
  const startDay = item.dataInizio?.slice(0, 10);
  const endDay = item.dataFine?.slice(0, 10);
  const startTime = formatLocalDateTimeTime(item.dataInizio);
  const endTime = formatLocalDateTimeTime(item.dataFine);
  if (startDay && endDay && startDay !== endDay) {
    const left = [formatShortDayIt(startDay), startTime].filter(Boolean).join(' ');
    const right = [formatShortDayIt(endDay), endTime].filter(Boolean).join(' ');
    if (left && right) return `${left} – ${right}`;
    return left || right;
  }
  return startTime && endTime && endTime !== startTime
    ? `${startTime} – ${endTime}`
    : startTime || endTime || '';
}

const TIPO_EVENTO_LABELS: Record<string, string> = {
  FORMAZIONE_INDIVIDUALE: 'Formazione Individuale',
  FORMAZIONE_TEAM: 'Formazione Team',
  RIUNIONE: 'Riunione',
  RIUNIONE_INDIVIDUALE: 'Riunione Individuale',
  RIUNIONE_TEAM: 'Riunione Team',
  SHOOTING_CONTENUTI: 'Shooting Contenuti',
  SHOOTING_VISITA: 'Shooting Visita',
  SHOOTING_PODCAST: 'Shooting Podcast',
  GPADEL: 'GPADEL',
  CHIUSURA_STUDIO: 'Chiusura Studio',
  PAUSA_PRANZO: 'Pausa Pranzo',
  TIROCINIO: 'Tirocinio',
  CORSO_FORMAZIONE: 'Corso Formazione',
  COLLOQUIO: 'Colloquio',
  ALTRO: 'Altro',
};

export function tipoEventoLabel(tipoEvento: string | null | undefined): string {
  if (!tipoEvento) return 'Evento';
  return TIPO_EVENTO_LABELS[tipoEvento] ?? tipoEvento;
}

/** Stato visita per la UI paziente. */
export function visitaStatusLabel(status?: string | null): string {
  if (!status) return '';
  const key = status.toUpperCase();
  if (key === 'NO_SHOW_NON_CONTA') return 'DISDETTA';
  if (key === 'NO_SHOW_CONTA') return 'EFFETTUATA';
  return status;
}

export function formatPrezzoEUR(n: number | null | undefined): string | null {
  if (n == null || Number.isNaN(Number(n))) return null;
  return Number(n).toLocaleString('it-IT', { style: 'currency', currency: 'EUR' });
}

/**
 * Da istanti ISO dello slot (come in `SlotDisponibilitaDto`) a campi attesi dal backend per una visita
 * (`dataVisita` YYYY-MM-DD e orari HH:mm:ss nel fuso locale del dispositivo).
 */
export function slotIsoToVisitaFields(inizioIso: string, fineIso: string): {
  dataVisita: string;
  oraInizio: string;
  oraFine: string;
} {
  const a = new Date(inizioIso);
  const b = new Date(fineIso);
  const pad = (n: number) => String(n).padStart(2, '0');
  const ymd = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const hms = (d: Date) =>
    `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  return { dataVisita: ymd(a), oraInizio: hms(a), oraFine: hms(b) };
}
