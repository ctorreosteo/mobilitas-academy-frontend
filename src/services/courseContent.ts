import { Chapter, Video, Course } from '../types';
import { fetchLezioniByModulo, fetchModuliByCorso } from './formazioneService';
import {
  fetchCorsoPosturaleById,
  fetchLezioniByModuloPosturale,
  fetchModuliByCorsoPosturale,
} from './corsiPosturaliService';

const CLOUDFLARE_STREAM_SUBDOMAIN =
  process.env.EXPO_PUBLIC_CLOUDFLARE_STREAM_SUBDOMAIN?.replace(/\/$/, '') || '';

function manifestUrlFromUid(uid: string | null | undefined): string {
  if (!uid || !CLOUDFLARE_STREAM_SUBDOMAIN) return '';
  return `https://${CLOUDFLARE_STREAM_SUBDOMAIN}/${uid}/manifest/video.m3u8`;
}

export interface CourseContent {
  chapters: Chapter[];
  videos: Video[];
  /** Corso aggiornato dal dettaglio remoto, quando disponibile. */
  course?: Course;
}

/** Modulo/lezione nella forma minima usata per costruire capitoli e video. */
interface RawModulo {
  id: number;
  corsoId: number;
  titolo: string;
  ordine: number;
}

interface RawLezione {
  id: number;
  moduloId: number;
  titolo: string;
  descrizione: string | null;
  ordine: number;
  cloudflareUid: string | null;
  immagineCopertina: string | null;
  durataSecondi: number | null;
  richiedeToken: boolean;
}

function buildContent(
  course: Course,
  moduli: RawModulo[],
  lezioniPerModulo: RawLezione[][]
): { chapters: Chapter[]; videos: Video[] } {
  const chapters: Chapter[] = moduli.map((m) => ({
    id: String(m.id),
    title: m.titolo,
    order: m.ordine,
    courseId: String(m.corsoId),
  }));

  const videos: Video[] = [];
  moduli.forEach((_, idx) => {
    const lezioni = [...(lezioniPerModulo[idx] || [])].sort((a, b) => a.ordine - b.ordine);
    lezioni.forEach((l) => {
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

/** LMS interno: GET /api/formazione/corsi/{id}/moduli e /api/formazione/moduli/{id}/lezioni */
async function loadFormazioneContent(course: Course, corsoId: number): Promise<CourseContent> {
  const moduli = [...(await fetchModuliByCorso(corsoId))].sort((a, b) => a.ordine - b.ordine);
  const lezioniPerModulo = await Promise.all(moduli.map((m) => fetchLezioniByModulo(m.id)));
  return buildContent(course, moduli, lezioniPerModulo);
}

/**
 * Catalogo pazienti: GET /api/corsi-posturali/{id}, /api/corsi-posturali/{id}/moduli
 * e /api/corsi-posturali/moduli/{id}/lezioni. Il backend filtra già i contenuti
 * non attivi (404 su corso/modulo/lezione disattivati).
 */
async function loadCorsoPosturaleContent(course: Course, corsoId: number): Promise<CourseContent> {
  const corso = await fetchCorsoPosturaleById(corsoId);
  const moduli = [...(await fetchModuliByCorsoPosturale(corsoId))].sort(
    (a, b) => a.ordine - b.ordine
  );
  const lezioniPerModulo = await Promise.all(
    moduli.map((m) => fetchLezioniByModuloPosturale(m.id))
  );

  return {
    ...buildContent(course, moduli, lezioniPerModulo),
    course: {
      ...course,
      title: corso.titolo,
      description: corso.descrizione ?? '',
      coverImage: corso.immagineCopertina || course.coverImage,
      formazioneAttivo: corso.attivo,
    },
  };
}

/**
 * Moduli e lezioni del corso, dal catalogo corretto per il ruolo dell'utente.
 * `course.id` deve essere l'id numerico del corso (stringa).
 */
export async function loadCourseContent(course: Course): Promise<CourseContent> {
  const corsoId = Number(course.id);
  if (!Number.isFinite(corsoId)) {
    return { chapters: [], videos: [] };
  }

  return course.catalog === 'posturale'
    ? loadCorsoPosturaleContent(course, corsoId)
    : loadFormazioneContent(course, corsoId);
}
