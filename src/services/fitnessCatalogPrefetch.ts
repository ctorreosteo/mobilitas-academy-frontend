import { Image } from 'react-native';
import { fetchSessioniFitness, type SessioneFitnessDto } from './fitnessService';

let catalog: SessioneFitnessDto[] | null = null;
const coverBySessionId = new Map<number, string | null>();
let inflight: Promise<void> | null = null;
const listeners = new Set<() => void>();

function notifyListeners(): void {
  for (const listener of listeners) {
    listener();
  }
}

function rebuildIndex(sessioni: SessioneFitnessDto[]): void {
  catalog = sessioni;
  coverBySessionId.clear();
  for (const sessione of sessioni) {
    coverBySessionId.set(sessione.id, sessione.immagineCopertinaUrl ?? null);
  }
}

async function prefetchCoverImages(urls: string[]): Promise<void> {
  const unique = [...new Set(urls.filter((url) => url.length > 0))];
  await Promise.allSettled(unique.map((url) => Image.prefetch(url)));
}

export function applyFitnessSessionCatalog(sessioni: SessioneFitnessDto[]): void {
  rebuildIndex(sessioni);
  notifyListeners();
}

export function getFitnessSessionCatalog(): SessioneFitnessDto[] {
  return catalog ?? [];
}

export function getFitnessSessionCoverUrl(sessioneId: number): string | null | undefined {
  if (!coverBySessionId.has(sessioneId)) return undefined;
  return coverBySessionId.get(sessioneId) ?? null;
}

export function getFitnessSessionCoversRecord(): Record<number, string | null> {
  const record: Record<number, string | null> = {};
  for (const [id, url] of coverBySessionId.entries()) {
    record[id] = url;
  }
  return record;
}

/** URL copertina: campo calendario denormalizzato, altrimenti cache catalogo. */
export function resolveFitnessSessionCoverUrl(
  sessioneId: number,
  fromCalendar?: string | null
): string | null {
  if (fromCalendar) return fromCalendar;
  const cached = getFitnessSessionCoverUrl(sessioneId);
  return cached ?? null;
}

export function subscribeFitnessSessionCatalog(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function clearFitnessSessionCatalogCache(): void {
  catalog = null;
  coverBySessionId.clear();
  inflight = null;
}

/**
 * Avvia in background il fetch del catalogo sessioni e il prefetch delle copertine.
 * Errori ignorati (best-effort). Ritorna la promise per attendere il completamento.
 */
export function prefetchFitnessSessionCatalog(): Promise<void> {
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const sessioni = await fetchSessioniFitness();
      applyFitnessSessionCatalog(sessioni);
      const urls = sessioni
        .map((s) => s.immagineCopertinaUrl)
        .filter((url): url is string => typeof url === 'string' && url.length > 0);
      await prefetchCoverImages(urls);
    } catch {
      // prefetch non bloccante
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}
