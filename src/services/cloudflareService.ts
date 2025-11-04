import axios from 'axios';
import { Course, Chapter, Video } from '../types';

const CLOUDFLARE_ACCOUNT_ID = process.env.EXPO_PUBLIC_CLOUDFLARE_ACCOUNT_ID || '';
const CLOUDFLARE_STREAM_TOKEN = process.env.EXPO_PUBLIC_CLOUDFLARE_STREAM_TOKEN || '';
const CLOUDFLARE_STREAM_SUBDOMAIN = process.env.EXPO_PUBLIC_CLOUDFLARE_STREAM_SUBDOMAIN || '';
const STREAM_API_BASE = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream`;

// Costanti per il corso temporaneo "Introduzione"
const DEFAULT_COURSE_ID = 'course-introduzione';
const DEFAULT_MODULE_ID = 'module-introduzione';

interface StreamVideo {
  uid: string;
  duration: number;
  meta: {
    course?: string;
    courseTitle?: string;
    courseDescription?: string;
    instructor?: string;
    category?: string;
    difficulty?: string;
    courseCoverImage?: string;
    module?: string;
    moduleTitle?: string;
    moduleOrder?: string;
    order?: string;
    title?: string;
    name?: string;
    description?: string;
  };
  thumbnail?: string;
}

/**
 * Recupera tutti i video da Cloudflare Stream
 */
async function fetchAllStreamVideos(): Promise<StreamVideo[]> {
  try {
    console.log(`🔗 Connessione a: ${STREAM_API_BASE}`);
    console.log(`🔑 Token configurato: ${CLOUDFLARE_STREAM_TOKEN ? 'Sì (primi 10 caratteri: ' + CLOUDFLARE_STREAM_TOKEN.substring(0, 10) + '...)' : 'No'}`);
    
    const allVideos: StreamVideo[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const response = await axios.get(STREAM_API_BASE, {
        params: {
          page: page,
          per_page: 100,
        },
        headers: {
          'Authorization': `Bearer ${CLOUDFLARE_STREAM_TOKEN}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.data && response.data.success) {
        const videos = response.data.result || [];
        allVideos.push(...videos);
        console.log(`📄 Pagina ${page}: ${videos.length} video recuperati`);

        // Controlla se ci sono più pagine
        const resultInfo = response.data.result_info;
        hasMore = resultInfo && resultInfo.page < resultInfo.total_pages;
        page++;
      } else {
        console.warn('⚠️ Risposta API non valida:', response.data);
        hasMore = false;
      }
    }

    return allVideos;
  } catch (error: any) {
    console.error('❌ Errore nel recupero video da Stream:', error.message);
    if (error.response) {
      console.error('📋 Dettagli errore API:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
      });
    }
    throw error;
  }
}

/**
 * Recupera tutti i corsi avanzati da Cloudflare Stream
 * TEMPORANEO: Tutti i video appartengono a un unico corso "Introduzione"
 */
export async function fetchCloudflareCourses(): Promise<Course[]> {
  try {
    console.log('🔄 Recupero corsi avanzati da Cloudflare Stream...');
    
    if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_STREAM_TOKEN || !CLOUDFLARE_STREAM_SUBDOMAIN) {
      throw new Error('EXPO_PUBLIC_CLOUDFLARE_ACCOUNT_ID, EXPO_PUBLIC_CLOUDFLARE_STREAM_TOKEN e EXPO_PUBLIC_CLOUDFLARE_STREAM_SUBDOMAIN devono essere configurati nel .env');
    }
    
    const videos = await fetchAllStreamVideos();
    
    console.log(`📹 Totale video recuperati da Stream: ${videos.length}`);
    
    // Se non ci sono video, restituisci array vuoto
    if (videos.length === 0) {
      console.warn('⚠️ Nessun video trovato su Cloudflare Stream');
      return [];
    }
    
    // TEMPORANEO: Crea un unico corso "Introduzione" con tutti i video
    const totalSeconds = videos.reduce((sum, v) => sum + (v.duration || 0), 0);
    const totalMinutes = Math.round(totalSeconds / 60);
    
    const courses: Course[] = [{
      id: DEFAULT_COURSE_ID,
      title: 'Introduzione',
      description: 'Corso di introduzione con tutti i video disponibili su Cloudflare Stream',
      instructor: 'Dr. Mobilitas',
      duration: totalMinutes,
      isCompleted: false,
      completionPercentage: 0,
      category: 'Avanzato',
      difficulty: 'Avanzato',
      coverImage: videos[0]?.thumbnail, // Usa la thumbnail del primo video come cover
    }];
    
    console.log(`✅ Creato corso "Introduzione" con ${videos.length} video (durata totale: ${totalMinutes} min)`);
    return courses;
  } catch (error: any) {
    console.error('❌ Errore nel recupero corsi da Cloudflare:', error.message);
    
    // Fallback a dati mock per sviluppo
    if (process.env.NODE_ENV === 'development') {
      console.log('⚠️ Usando dati mock per sviluppo');
      return getMockAdvancedCourses();
    }
    
    throw new Error(`Errore nel recupero corsi da Cloudflare: ${error.message}`);
  }
}

/**
 * Recupera i moduli (capitoli) di un corso da Cloudflare Stream
 * TEMPORANEO: Restituisce sempre un unico modulo "Introduzione"
 */
export async function fetchCloudflareCourseModules(courseId: string): Promise<Chapter[]> {
  try {
    console.log(`🔄 Recupero moduli per corso ${courseId} da Cloudflare Stream...`);
    
    if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_STREAM_TOKEN || !CLOUDFLARE_STREAM_SUBDOMAIN) {
      console.warn('⚠️ Configurazione Cloudflare non completa, restituisco array vuoto');
      return [];
    }
    
    // Se il corso è "Introduzione", restituisci un unico modulo
    if (courseId === DEFAULT_COURSE_ID) {
      const modules: Chapter[] = [{
        id: DEFAULT_MODULE_ID,
        title: 'Video del corso',
        order: 1,
        courseId: courseId,
      }];
      
      console.log(`✅ Creato modulo unico per corso "Introduzione"`);
      return modules;
    }
    
    // Per altri corsi (futuro), usa la logica originale con metadata
    const videos = await fetchAllStreamVideos();
    
    const modulesMap = new Map<string, Chapter>();
    
    for (const video of videos) {
      if (video.meta?.course !== courseId) continue;
      
      const moduleId = video.meta?.module;
      if (!moduleId) continue;
      
      if (!modulesMap.has(moduleId)) {
        modulesMap.set(moduleId, {
          id: moduleId,
          title: video.meta?.moduleTitle || moduleId,
          order: parseInt(video.meta?.moduleOrder || '0'),
          courseId: courseId,
        });
      }
    }
    
    const modules = Array.from(modulesMap.values()).sort((a, b) => a.order - b.order);
    
    console.log(`✅ Recuperati ${modules.length} moduli per corso ${courseId}`);
    return modules;
  } catch (error: any) {
    console.error(`❌ Errore nel recupero moduli per corso ${courseId}:`, error.message);
    return [];
  }
}

/**
 * Recupera i video di un modulo da Cloudflare Stream
 * TEMPORANEO: Per il modulo "Introduzione", restituisce tutti i video
 */
export async function fetchCloudflareModuleVideos(courseId: string, moduleId: string): Promise<Video[]> {
  try {
    console.log(`🔄 Recupero video per modulo ${moduleId} da Cloudflare Stream...`);
    
    if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_STREAM_TOKEN || !CLOUDFLARE_STREAM_SUBDOMAIN) {
      console.warn('⚠️ Configurazione Cloudflare non completa, restituisco array vuoto');
      return [];
    }
    
    const videos = await fetchAllStreamVideos();
    
    // Se è il modulo "Introduzione", restituisci tutti i video
    if (moduleId === DEFAULT_MODULE_ID && courseId === DEFAULT_COURSE_ID) {
      const allVideos = videos
        .map((v, index) => ({
          id: v.uid,
          title: v.meta?.title || v.meta?.name || `Video ${index + 1}`,
          url: `https://${CLOUDFLARE_STREAM_SUBDOMAIN}/${v.uid}/manifest/video.m3u8`,
          duration: v.duration || 0,
          courseId: courseId,
          chapterId: moduleId,
          order: index + 1, // Ordine basato sulla posizione nella lista
          isCompleted: false,
          thumbnail: `https://${CLOUDFLARE_STREAM_SUBDOMAIN}/${v.uid}/thumbnails/thumbnail.jpg`,
          description: v.meta?.description || '',
        }))
        .sort((a, b) => a.order - b.order);
      
      console.log(`✅ Recuperati ${allVideos.length} video per modulo "Introduzione"`);
      return allVideos;
    }
    
    // Per altri moduli (futuro), usa la logica originale con metadata
    const filteredVideos = videos
      .filter(v => 
        v.meta?.course === courseId && 
        v.meta?.module === moduleId
      )
      .map(v => ({
        id: v.uid,
        title: v.meta?.title || v.meta?.name || 'Video senza titolo',
        url: `https://${CLOUDFLARE_STREAM_SUBDOMAIN}/${v.uid}/manifest/video.m3u8`,
        duration: v.duration || 0,
        courseId: courseId,
        chapterId: moduleId,
        order: parseInt(v.meta?.order || '0'),
        isCompleted: false,
        thumbnail: `https://${CLOUDFLARE_STREAM_SUBDOMAIN}/${v.uid}/thumbnails/thumbnail.jpg`,
        description: v.meta?.description || '',
      }))
      .sort((a, b) => a.order - b.order);
    
    console.log(`✅ Recuperati ${filteredVideos.length} video per modulo ${moduleId}`);
    return filteredVideos;
  } catch (error: any) {
    console.error(`❌ Errore nel recupero video per modulo ${moduleId}:`, error.message);
    return [];
  }
}

/**
 * Recupera tutti i video di un corso (tutti i moduli) da Cloudflare
 */
export async function fetchCloudflareCourseVideos(courseId: string): Promise<Video[]> {
  try {
    const modules = await fetchCloudflareCourseModules(courseId);
    const allVideos: Video[] = [];

    for (const module of modules) {
      const videos = await fetchCloudflareModuleVideos(courseId, module.id);
      allVideos.push(...videos);
    }

    return allVideos;
  } catch (error: any) {
    console.error(`❌ Errore nel recupero video per corso ${courseId}:`, error.message);
    return [];
  }
}

/**
 * Dati mock per sviluppo (temporaneo)
 */
function getMockAdvancedCourses(): Course[] {
  return [
    {
      id: 'advanced-1',
      title: 'Osteopatia Avanzata: Tecniche Specializzate',
      description: 'Corso avanzato sulle tecniche osteopatiche più specializzate',
      instructor: 'Dr. Expert',
      duration: 180,
      isCompleted: false,
      completionPercentage: 0,
      category: 'Avanzato',
      difficulty: 'Avanzato',
      coverImage: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&h=300&fit=crop',
    },
  ];
}


