import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@mobilitas_jwt';
const PROFILE_KEY = '@mobilitas_user_profile';

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

/** Snapshot profilo dopo login (stesso shape utile lato UI dei campi in `data`). */
export interface StoredUserProfile {
  username: string;
  nome: string;
  cognome: string;
  email: string;
  ruoli: string[];
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
