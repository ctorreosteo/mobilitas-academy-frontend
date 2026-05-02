import type { OsteopataDto, SlotDisponibilitaDto, StudioDto } from '../../services/studioVisitsService';

export function toYmd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
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
