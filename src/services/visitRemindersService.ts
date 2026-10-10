import type * as NotificationsModule from 'expo-notifications';
import { Platform } from 'react-native';
import { loadIfNativeAvailable } from '../utils/optionalNativeModule';
import type { VisitaMinimaleDto } from './visiteService';

/**
 * Promemoria locali: una notifica 2 ore prima di ogni visita prenotata.
 * Le notifiche sono programmate sul telefono (nessun push dal backend) e vengono
 * riallineate ogni volta che l’elenco visite del paziente viene ricaricato.
 */
const REMINDER_BEFORE_MS = 2 * 60 * 60 * 1000;
const ANDROID_CHANNEL_ID = 'promemoria-visite';
const REMINDER_ID_PREFIX = 'visita-promemoria-';

function loadNotifications(): typeof NotificationsModule | null {
  return loadIfNativeAvailable(
    'ExpoNotificationScheduler',
    () => require('expo-notifications') as typeof NotificationsModule
  );
}

let handlerConfigured = false;

/** Mostra il promemoria anche se l’app è aperta in quel momento. */
function ensureForegroundHandler(N: typeof NotificationsModule): void {
  if (handlerConfigured) return;
  handlerConfigured = true;
  N.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

async function ensurePermission(N: typeof NotificationsModule): Promise<boolean> {
  const current = await N.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const requested = await N.requestPermissionsAsync();
  return requested.granted;
}

function visitaStart(v: VisitaMinimaleDto): Date {
  return new Date(`${v.dataVisita}T${v.oraInizio?.trim() || '00:00:00'}`);
}

function reminderBody(v: VisitaMinimaleDto): string {
  const ora = v.oraInizio?.slice(0, 5);
  const indirizzo =
    [v.studioIndirizzo, v.studioCitta].filter((x) => x?.trim()).join(', ') || v.studioNome?.trim();
  return [`Tra 2 ore hai la tua visita da Mobilitas${ora ? ` alle ${ora}` : ''}.`, indirizzo]
    .filter(Boolean)
    .join('\n');
}

async function cancelVisitReminders(N: typeof NotificationsModule): Promise<void> {
  const scheduled = await N.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => n.identifier.startsWith(REMINDER_ID_PREFIX))
      .map((n) => N.cancelScheduledNotificationAsync(n.identifier))
  );
}

/**
 * Riprogramma i promemoria a partire dall’elenco visite: annulla quelli esistenti
 * (visite disdette o spostate) e ne crea uno per ogni visita prenotata futura.
 * Il permesso viene chiesto solo se c’è almeno un promemoria da programmare.
 */
export async function syncVisitReminders(visite: VisitaMinimaleDto[]): Promise<void> {
  const N = loadNotifications();
  if (!N) return;
  const now = Date.now();
  const daProgrammare = visite.filter(
    (v) =>
      v.statusVisita?.toUpperCase() === 'PRENOTATA' &&
      visitaStart(v).getTime() - REMINDER_BEFORE_MS > now
  );

  await cancelVisitReminders(N);
  if (daProgrammare.length === 0) return;
  if (!(await ensurePermission(N))) return;
  ensureForegroundHandler(N);

  if (Platform.OS === 'android') {
    await N.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
      name: 'Promemoria visite',
      importance: N.AndroidImportance.HIGH,
    });
  }

  // iOS tiene al massimo 64 notifiche programmate: bastano e avanzano, ma restiamo sotto.
  for (const v of daProgrammare.slice(0, 50)) {
    await N.scheduleNotificationAsync({
      identifier: `${REMINDER_ID_PREFIX}${v.id}`,
      content: {
        title: 'Promemoria visita',
        body: reminderBody(v),
        sound: true,
        data: { type: 'visit-reminder', visitaId: v.id },
      },
      trigger: {
        type: N.SchedulableTriggerInputTypes.DATE,
        date: new Date(visitaStart(v).getTime() - REMINDER_BEFORE_MS),
        ...(Platform.OS === 'android' ? { channelId: ANDROID_CHANNEL_ID } : {}),
      },
    });
  }
}

/** Al logout: niente promemoria per un utente che non è più collegato. */
export async function clearVisitReminders(): Promise<void> {
  const N = loadNotifications();
  if (!N) return;
  try {
    await cancelVisitReminders(N);
  } catch {
    // non bloccare il logout
  }
}
