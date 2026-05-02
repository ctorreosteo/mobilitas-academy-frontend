import { Chapter, Video, Course } from '../types';
import { fetchLezioniByModulo, fetchModuliByCorso } from './formazioneService';

const CLOUDFLARE_STREAM_SUBDOMAIN =
  process.env.EXPO_PUBLIC_CLOUDFLARE_STREAM_SUBDOMAIN?.replace(/\/$/, '') || '';

function manifestUrlFromUid(uid: string | null | undefined): string {
  if (!uid || !CLOUDFLARE_STREAM_SUBDOMAIN) return '';
  return `https://${CLOUDFLARE_STREAM_SUBDOMAIN}/${uid}/manifest/video.m3u8`;
}

/**
 * Moduli e lezioni da GET /api/formazione/corsi/{id}/moduli e .../moduli/{id}/lezioni.
 * `course.id` deve essere l’id numerico del corso (stringa).
 */
export async function loadFormazioneCourseContent(
  course: Course
): Promise<{ chapters: Chapter[]; videos: Video[] }> {
  const corsoId = Number(course.id);
  if (!Number.isFinite(corsoId)) {
    return { chapters: [], videos: [] };
  }

  const moduli = await fetchModuliByCorso(corsoId);
  const sortedModuli = [...moduli].sort((a, b) => a.ordine - b.ordine);

  const chapters: Chapter[] = sortedModuli.map((m) => ({
    id: String(m.id),
    title: m.titolo,
    order: m.ordine,
    courseId: String(m.corsoId),
  }));

  const lezioniPerModulo = await Promise.all(
    sortedModuli.map((m) => fetchLezioniByModulo(m.id))
  );

  const videos: Video[] = [];
  sortedModuli.forEach((m, idx) => {
    const lezioni = lezioniPerModulo[idx] || [];
    const sorted = [...lezioni].sort((a, b) => a.ordine - b.ordine);
    sorted.forEach((l) => {
      videos.push({
        id: String(l.id),
        title: l.titolo,
        url: manifestUrlFromUid(l.cloudflareUid),
        duration: l.durataSecondi ?? 0,
        courseId: String(course.id),
        chapterId: String(l.moduloId),
        order: l.ordine,
        isCompleted: false,
        thumbnail: l.immagineCopertina || undefined,
        description: l.descrizione ?? '',
        cloudflareUid: l.cloudflareUid ?? undefined,
        richiedeToken: l.richiedeToken,
      });
    });
  });

  return { chapters, videos };
}
