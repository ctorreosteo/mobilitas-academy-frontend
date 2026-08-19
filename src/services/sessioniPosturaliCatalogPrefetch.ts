import { Image } from 'react-native';
import { fetchSessioniPosturali, type SessionePosturaleDto } from './sessioniPosturaliService';

let catalog: SessionePosturaleDto[] | null = null;
const coverBySessionId = new Map<number, string | null>();
const sessionById = new Map<number, SessionePosturaleDto>();
let inflight: Promise<void> | null = null;
const listeners = new Set<() => void>();

function notifyListeners(): void {
  for (const listener of listeners) {
    listener();
  }
}

function rebuildIndex(sessioni: SessionePosturaleDto[]): void {
  catalog = sessioni;
  coverBySessionId.clear();
  sessionById.clear();
  for (const sessione of sessioni) {
    coverBySessionId.set(sessione.id, sessione.immagineCopertinaUrl ?? null);
    sessionById.set(sessione.id, sessione);
  }
}

async function prefetchCoverImages(urls: string[]): Promise<void> {
  const unique = [...new Set(urls.filter((url) => url.length > 0))];
  await Promise.allSettled(unique.map((url) => Image.prefetch(url)));
}

export function applySessioniPosturaliCatalog(sessioni: SessionePosturaleDto[]): void {
  rebuildIndex(sessioni);
  notifyListeners();
}

export function getSessioniPosturaliCatalog(): SessionePosturaleDto[] {
  return catalog ?? [];
}

export function getSessionePosturaleById(sessioneId: number): SessionePosturaleDto | undefined {
  return sessionById.get(sessioneId);
}

export function getSessionePosturaleCoverUrl(sessioneId: number): string | null | undefined {
  if (!coverBySessionId.has(sessioneId)) return undefined;
  return coverBySessionId.get(sessioneId) ?? null;
}

export function getSessioniPosturaliCoversRecord(): Record<number, string | null> {
  const record: Record<number, string | null> = {};
  for (const [id, url] of coverBySessionId.entries()) {
    record[id] = url;
  }
  return record;
}

export function subscribeSessioniPosturaliCatalog(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function clearSessioniPosturaliCatalogCache(): void {
  catalog = null;
  coverBySessionId.clear();
  sessionById.clear();
  inflight = null;
}

export function prefetchSessioniPosturaliCatalog(): Promise<void> {
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const sessioni = await fetchSessioniPosturali();
      applySessioniPosturaliCatalog(sessioni);
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
