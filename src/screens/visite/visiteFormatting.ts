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

export function studioLabel(s: StudioDto): string {
  const geo = [s.indirizzo, s.citta, s.cap].filter(Boolean).join(', ');
  if (geo) return `${s.nome} — ${geo}`;
  return s.nome;
}

export function formatOraDisplay(ora: string | null | undefined): string {
  if (!ora || typeof ora !== 'string') return '';
  return ora.length >= 5 ? ora.slice(0, 5) : ora;
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
