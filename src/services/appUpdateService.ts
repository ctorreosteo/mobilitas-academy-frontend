import type * as ApplicationModule from 'expo-application';
import type * as InAppUpdatesModule from 'expo-in-app-updates';
import { Linking, Platform } from 'react-native';
import { loadIfNativeAvailable } from '../utils/optionalNativeModule';

/**
 * Aggiornamento obbligatorio: l’app si usa solo con l’ultima versione pubblicata.
 * - iOS: versione installata vs `version` dell’iTunes Lookup API.
 * - Android: Play In-App Updates (`updateAvailable`), unico canale ufficiale di Google.
 * Ogni errore (rete, app non installata dallo store, build di sviluppo) lascia entrare:
 * un controllo fallito non deve mai bloccare l’utente.
 */
const IOS_APP_STORE_ID = '6768769344';
const ANDROID_PACKAGE = 'com.mobilitas.academy';

export interface UpdateCheckResult {
  required: boolean;
  installedVersion: string | null;
  storeVersion: string | null;
}

const NO_UPDATE: UpdateCheckResult = { required: false, installedVersion: null, storeVersion: null };

/** Confronto numerico per segmenti: 2.0.10 > 2.0.9. */
export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map((n) => parseInt(n, 10) || 0);
  const pb = b.split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

async function checkIos(installed: string): Promise<UpdateCheckResult> {
  // Il timestamp evita la cache CDN di Apple subito dopo una pubblicazione.
  const url = `https://itunes.apple.com/lookup?id=${IOS_APP_STORE_ID}&country=it&_=${Date.now()}`;
  const res = await fetch(url, { headers: { 'Cache-Control': 'no-cache' } });
  if (!res.ok) return NO_UPDATE;
  const json = (await res.json()) as { results?: { version?: string }[] };
  const storeVersion = json.results?.[0]?.version;
  if (!storeVersion) return NO_UPDATE;
  return {
    required: compareVersions(storeVersion, installed) > 0,
    installedVersion: installed,
    storeVersion,
  };
}

async function checkAndroid(installed: string): Promise<UpdateCheckResult> {
  const InAppUpdates = loadIfNativeAvailable(
    'ExpoInAppUpdates',
    () => require('expo-in-app-updates') as typeof InAppUpdatesModule
  );
  if (!InAppUpdates) return NO_UPDATE;
  const result = await InAppUpdates.checkForUpdate();
  return {
    required: result.updateAvailable === true,
    installedVersion: installed,
    storeVersion: null,
  };
}

export async function checkRequiredUpdate(): Promise<UpdateCheckResult> {
  if (__DEV__ || Platform.OS === 'web') return NO_UPDATE;
  // Build senza questi moduli nativi: il controllo viene saltato, l’app si avvia comunque.
  const Application = loadIfNativeAvailable(
    'ExpoApplication',
    () => require('expo-application') as typeof ApplicationModule
  );
  const installed = Application?.nativeApplicationVersion;
  if (!installed) return NO_UPDATE;
  try {
    return Platform.OS === 'ios' ? await checkIos(installed) : await checkAndroid(installed);
  } catch {
    return NO_UPDATE;
  }
}

export async function openStoreForUpdate(): Promise<void> {
  const [nativeUrl, webUrl] =
    Platform.OS === 'ios'
      ? [
          `itms-apps://apps.apple.com/app/id${IOS_APP_STORE_ID}`,
          `https://apps.apple.com/app/id${IOS_APP_STORE_ID}`,
        ]
      : [
          `market://details?id=${ANDROID_PACKAGE}`,
          `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}`,
        ];
  try {
    await Linking.openURL(nativeUrl);
  } catch {
    await Linking.openURL(webUrl);
  }
}
