/**
 * Recupera la durata totale (in secondi) da un manifest HLS (.m3u8).
 * Se il manifest è un master playlist, segue il primo variant e somma i segmenti.
 */

const EXTINF_REGEX = /#EXTINF:\s*(\d*(?:\.\d+)?)(?:,|$)/;

function parseVariantPlaylistContent(text: string): number {
  let total = 0;
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    const m = line.match(EXTINF_REGEX);
    if (m) total += parseFloat(m[1] || '0');
  }
  return Math.round(total);
}

function getBaseUrl(manifestUrl: string): string {
  const lastSlash = manifestUrl.lastIndexOf('/');
  return lastSlash >= 0 ? manifestUrl.slice(0, lastSlash + 1) : manifestUrl;
}

function resolveUrl(baseUrl: string, relativePath: string): string {
  if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
    return relativePath;
  }
  const base = getBaseUrl(baseUrl);
  return new URL(relativePath.trim(), base).href;
}

/**
 * Scarica il manifest e restituisce la durata in secondi.
 * Per master playlist segue il primo stream variant.
 */
export async function getDurationFromHlsManifest(manifestUrl: string): Promise<number> {
  const response = await fetch(manifestUrl, { method: 'GET' });
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${manifestUrl}`);
  const text = await response.text();

  const isMaster = /#EXT-X-STREAM-INF/i.test(text);
  if (isMaster) {
    const lines = text.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      if (/#EXT-X-STREAM-INF/i.test(lines[i])) {
        const nextLine = lines[i + 1];
        if (nextLine && nextLine.trim() && !nextLine.startsWith('#')) {
          const variantUrl = resolveUrl(manifestUrl, nextLine);
          return getDurationFromHlsManifest(variantUrl);
        }
      }
    }
    throw new Error('Nessun variant trovato nel master playlist');
  }

  return parseVariantPlaylistContent(text);
}

const durationCache = new Map<string, number>();

/** Svuota la cache in-memory delle durate HLS (es. dopo “Pulisci cache” in profilo). */
export function clearHlsDurationCache(): void {
  durationCache.clear();
}

/**
 * Come getDurationFromHlsManifest ma con cache per URL (evita richieste ripetute).
 */
export async function getCachedDurationFromHls(url: string): Promise<number> {
  if (!url || !url.includes('.m3u8')) return 0;
  const cached = durationCache.get(url);
  if (cached !== undefined) return cached;
  try {
    const duration = await getDurationFromHlsManifest(url);
    durationCache.set(url, duration);
    return duration;
  } catch (e) {
    console.warn('hlsDuration: impossibile recuperare durata per', url, e);
    return 0;
  }
}
