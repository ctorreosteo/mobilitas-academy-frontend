import type * as CalendarModule from 'expo-calendar';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Linking, Platform } from 'react-native';
import type { StudioDto } from './studioVisitsService';
import { loadIfNativeAvailable } from '../utils/optionalNativeModule';

export const VISIT_EVENT_TITLE = 'Visita da Mobilitas';

/**
 * Caricato solo quando serve: su una build senza il modulo nativo ExpoCalendar
 * l’import statico farebbe crashare l’app all’avvio.
 */
function loadCalendar(): typeof CalendarModule | null {
  return loadIfNativeAvailable('ExpoCalendar', () => require('expo-calendar') as typeof CalendarModule);
}

export function isDeviceCalendarAvailable(): boolean {
  return loadCalendar() != null;
}

/** Dati minimi della visita appena prenotata, da esportare nel calendario dell’utente. */
export interface VisitCalendarEvent {
  start: Date;
  end: Date;
  /** Indirizzo completo dello studio (vuoto se il backend non lo fornisce). */
  location: string;
  notes: string;
}

/** Calendario scrivibile del telefono, con l’account (di solito l’e-mail) a cui appartiene. */
export interface DeviceCalendarOption {
  id: string;
  title: string;
  account: string;
  color: string;
}

export function formatStudioAddress(studio: StudioDto | null | undefined): string {
  if (!studio) return '';
  const cityLine = [studio.cap, studio.citta].filter((v) => v?.trim()).join(' ');
  return [studio.indirizzo, cityLine].filter((v) => v?.trim()).join(', ');
}

/**
 * Evento da una visita già in elenco (GET /visite/by-paziente).
 * Senza `oraFine` (backend non ancora aggiornato) si assume un’ora di durata.
 */
export function buildCalendarEventFromVisita(v: {
  dataVisita: string;
  oraInizio?: string | null;
  oraFine?: string | null;
  osteopataNome?: string | null;
  osteopataCognome?: string | null;
  studioNome?: string | null;
  studioIndirizzo?: string | null;
  studioCitta?: string | null;
}): VisitCalendarEvent {
  const start = new Date(`${v.dataVisita}T${v.oraInizio?.trim() || '00:00:00'}`);
  const end = v.oraFine?.trim()
    ? new Date(`${v.dataVisita}T${v.oraFine.trim()}`)
    : new Date(start.getTime() + 60 * 60 * 1000);
  const osteopata = [v.osteopataNome, v.osteopataCognome].filter(Boolean).join(' ');
  return buildVisitCalendarEvent(
    { inizio: start.toISOString(), fine: end.toISOString() },
    v.studioNome
      ? { id: 0, nome: v.studioNome, indirizzo: v.studioIndirizzo, citta: v.studioCitta }
      : null,
    osteopata || null
  );
}

export function buildVisitCalendarEvent(
  slot: { inizio: string; fine: string },
  studio: StudioDto | null | undefined,
  osteopataNome?: string | null
): VisitCalendarEvent {
  const location = formatStudioAddress(studio);
  const notes = [
    studio?.nome ? `Studio: ${studio.nome}` : null,
    location ? `Indirizzo: ${location}` : null,
    osteopataNome ? `Osteopata: ${osteopataNome}` : null,
    'Per disdire o spostare la visita è necessario farlo almeno 24 ore prima.',
  ]
    .filter(Boolean)
    .join('\n');
  return { start: new Date(slot.inizio), end: new Date(slot.fine), location, notes };
}

/**
 * Calendari del telefono su cui si può scrivere, ordinati per account.
 * Restituisce null se l’utente nega il permesso.
 */
export async function getWritableDeviceCalendars(): Promise<DeviceCalendarOption[] | null> {
  const Calendar = loadCalendar();
  if (!Calendar) throw new Error('Calendario del telefono non disponibile in questa versione dell’app.');
  const { status } = await Calendar.requestCalendarPermissionsAsync();
  if (status !== 'granted') return null;
  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  return calendars
    .filter((c) => c.allowsModifications && (Platform.OS !== 'android' || c.isVisible !== false))
    .map((c) => ({
      id: c.id,
      title: c.title || c.name || 'Calendario',
      account: c.source?.name || c.ownerAccount || 'Questo dispositivo',
      color: c.color,
    }))
    .sort((a, b) => a.account.localeCompare(b.account) || a.title.localeCompare(b.title));
}

/** Crea l’evento nel calendario scelto e lo apre nell’app calendario del sistema. */
export async function addVisitToDeviceCalendar(
  calendarId: string,
  event: VisitCalendarEvent
): Promise<void> {
  const Calendar = loadCalendar();
  if (!Calendar) throw new Error('Calendario del telefono non disponibile in questa versione dell’app.');
  const eventId = await Calendar.createEventAsync(calendarId, {
    title: VISIT_EVENT_TITLE,
    startDate: event.start,
    endDate: event.end,
    location: event.location || undefined,
    notes: event.notes,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    alarms: [{ relativeOffset: -60 * 24 }],
  });
  try {
    await Calendar.openEventInCalendarAsync({ id: eventId });
  } catch {
    // L’evento è salvato: se l’anteprima di sistema non si apre non è un errore.
  }
}

/** Data UTC in formato iCalendar/Google: 20261010T153000Z. */
function toUtcStamp(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

export async function openGoogleCalendarTemplate(event: VisitCalendarEvent): Promise<void> {
  const params = [
    ['action', 'TEMPLATE'],
    ['text', VISIT_EVENT_TITLE],
    ['dates', `${toUtcStamp(event.start)}/${toUtcStamp(event.end)}`],
    ['details', event.notes],
    ['location', event.location],
  ]
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join('&');
  await Linking.openURL(`https://calendar.google.com/calendar/render?${params}`);
}

function escapeIcsText(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

/** Condivide un file .ics: lo aprono Outlook, Calendario, Google Calendar e le altre app compatibili. */
export async function shareVisitIcs(event: VisitCalendarEvent): Promise<void> {
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Mobilitas Academy//IT',
    'BEGIN:VEVENT',
    `UID:${toUtcStamp(event.start)}-${Date.now()}@studiomobilitas.it`,
    `DTSTAMP:${toUtcStamp(new Date())}`,
    `DTSTART:${toUtcStamp(event.start)}`,
    `DTEND:${toUtcStamp(event.end)}`,
    `SUMMARY:${escapeIcsText(VISIT_EVENT_TITLE)}`,
    ...(event.location ? [`LOCATION:${escapeIcsText(event.location)}`] : []),
    `DESCRIPTION:${escapeIcsText(event.notes)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
  const uri = `${FileSystem.cacheDirectory}visita-mobilitas.ics`;
  await FileSystem.writeAsStringAsync(uri, ics);
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Condivisione non disponibile su questo dispositivo.');
  }
  await Sharing.shareAsync(uri, {
    mimeType: 'text/calendar',
    UTI: 'com.apple.ical.ics',
    dialogTitle: 'Aggiungi al calendario',
  });
}
