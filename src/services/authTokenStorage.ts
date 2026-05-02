import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@mobilitas_jwt';
const PROFILE_KEY = '@mobilitas_user_profile';
const REMEMBER_USERNAME_KEY = '@mobilitas_remember_username_enabled';
const LAST_USERNAME_KEY = '@mobilitas_last_login_username';

/**
 * JWT da `POST /api/auth/login` o `refresh` (`data.token`).
 */
export async function getAuthToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export async function setAuthToken(token: string): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, token);
}

export async function clearAuthToken(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}

/** Dati osteopata da GET /api/osteopati/{id} (senza `utente` annidato, evita duplicati in storage). */
export interface StoredOsteopataProfile {
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
}

/** Snapshot profilo dopo login (stesso shape utile lato UI dei campi in `data`). */
export interface StoredUserProfile {
  username: string;
  nome: string;
  cognome: string;
  email: string;
  ruoli: string[];
  /** ID utente anagrafica (GET /auth/me → `id`). */
  utenteId?: number;
  attivo?: boolean;
  /** Presente in /me se l’utente ha ruolo osteopata. */
  osteopataId?: number | null;
  /** Dettaglio da GET /osteopati/{osteopataId} quando applicabile. */
  osteopata?: StoredOsteopataProfile | null;
  /** ID paziente in anagrafica; necessario per GET /visite/by-paziente/{id} */
  pazienteId?: number | null;
}

export async function setStoredUserProfile(profile: StoredUserProfile): Promise<void> {
  await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export async function getStoredUserProfile(): Promise<StoredUserProfile | null> {
  try {
    const raw = await AsyncStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredUserProfile;
  } catch {
    return null;
  }
}

export async function clearStoredUserProfile(): Promise<void> {
  await AsyncStorage.removeItem(PROFILE_KEY);
}

/** JWT + profilo locale (logout / refresh fallito). */
export async function clearAllAuth(): Promise<void> {
  await clearAuthToken();
  await clearStoredUserProfile();
}

/**
 * Preferenza UI: ricorda solo username/email per precompilare il login.
 * La password non viene mai memorizzata.
 */
export async function setRememberUsernamePreference(
  enabled: boolean,
  username?: string
): Promise<void> {
  if (enabled && username?.trim()) {
    await AsyncStorage.multiSet([
      [REMEMBER_USERNAME_KEY, '1'],
      [LAST_USERNAME_KEY, username.trim()],
    ]);
  } else {
    await AsyncStorage.multiSet([[REMEMBER_USERNAME_KEY, '0']]);
    await AsyncStorage.removeItem(LAST_USERNAME_KEY);
  }
}

/** Default `true` finché l’utente non ha effettuato un accesso con preferenza disattiva (`0`). */
export async function getRememberUsernamePreference(): Promise<boolean> {
  const v = await AsyncStorage.getItem(REMEMBER_USERNAME_KEY);
  if (v === null) return true;
  return v === '1';
}

export async function getRememberedLoginUsername(): Promise<string | null> {
  return AsyncStorage.getItem(LAST_USERNAME_KEY);
}
