import AsyncStorage from '@react-native-async-storage/async-storage';
import type { QueryClient } from '@tanstack/react-query';
import { clearHlsDurationCache } from '../utils/hlsDuration';

/** Token OAuth YouTube salvato da `useYouTubeAuth` (stesso valore della hook). */
const YOUTUBE_ACCESS_TOKEN_KEY = '@youtube_access_token';

/**
 * Pulisce dati locali “usa e getta” senza fare logout:
 * cache React Query, token YouTube in AsyncStorage, cache durate HLS in RAM.
 * La sessione Mobilitas (JWT) non viene toccata.
 */
export async function cleanAndRefreshCaches(queryClient: QueryClient): Promise<void> {
  queryClient.clear();
  try {
    await AsyncStorage.removeItem(YOUTUBE_ACCESS_TOKEN_KEY);
  } catch {
    // ignora
  }
  clearHlsDurationCache();
  await queryClient.invalidateQueries();
}
