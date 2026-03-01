/**
 * Script per popolare le durate (e altri metadata) nel file courseVideos.json.
 * Recupera la durata dai manifest HLS (.m3u8) e aggiorna il JSON.
 *
 * Uso: node scripts/fill-video-durations.js
 * Richiede Node 18+ (fetch nativo).
 */

const fs = require('fs');
const path = require('path');

const EXTINF_REGEX = /#EXTINF:\s*(\d*(?:\.\d+)?)(?:,|$)/;

function parseVariantPlaylistContent(text) {
  let total = 0;
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    const m = line.match(EXTINF_REGEX);
    if (m) total += parseFloat(m[1] || '0');
  }
  return Math.round(total);
}

function getBaseUrl(manifestUrl) {
  const lastSlash = manifestUrl.lastIndexOf('/');
  return lastSlash >= 0 ? manifestUrl.slice(0, lastSlash + 1) : manifestUrl;
}

function resolveUrl(baseUrl, relativePath) {
  if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
    return relativePath;
  }
  const base = getBaseUrl(baseUrl);
  return new URL(relativePath.trim(), base).href;
}

async function getDurationFromHlsManifest(manifestUrl) {
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

const jsonPath = path.join(__dirname, '../src/data/courseVideos.json');

async function main() {
  const raw = fs.readFileSync(jsonPath, 'utf8');
  const videos = JSON.parse(raw);

  let updated = 0;
  for (const video of videos) {
    if (video.duration > 0) {
      console.log(`[OK] ${video.id} "${video.title}" già ha durata ${video.duration}s`);
      continue;
    }
    if (!video.url || !video.url.includes('.m3u8')) {
      console.log(`[SKIP] ${video.id} non è un URL .m3u8`);
      continue;
    }
    try {
      const duration = await getDurationFromHlsManifest(video.url);
      video.duration = duration;
      updated++;
      console.log(`[OK] ${video.id} "${video.title}" → ${duration}s`);
    } catch (err) {
      console.warn(`[ERR] ${video.id} "${video.title}":`, err.message);
    }
  }

  if (updated > 0) {
    fs.writeFileSync(jsonPath, JSON.stringify(videos, null, 2), 'utf8');
    console.log(`\nScritte ${updated} durate in ${jsonPath}`);
  } else {
    console.log('\nNessuna durata da aggiornare.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
