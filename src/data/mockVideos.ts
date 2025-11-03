import { Video } from '../types';

export const mockVideos: Video[] = [
  // Corso 1 - Capitolo 1
  {
    id: 'v1-1-1',
    title: 'Benvenuto al corso',
    url: 'https://example.com/video1',
    duration: 180, // 3 minuti
    courseId: '1',
    chapterId: 'ch1-1',
    order: 1,
    isCompleted: true,
    thumbnail: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&h=300&fit=crop',
    description: 'Benvenuto in questo corso sull\'anatomia funzionale del sistema muscolo-scheletrico. In questa introduzione verranno presentati gli obiettivi del corso, la struttura didattica e i concetti fondamentali che verranno approfonditi nelle lezioni successive.',
  },
  {
    id: 'v1-1-2',
    title: 'Introduzione all\'anatomia funzionale',
    url: 'https://example.com/video2',
    duration: 420, // 7 minuti
    courseId: '1',
    chapterId: 'ch1-1',
    order: 2,
    isCompleted: true,
    thumbnail: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&h=300&fit=crop',
    description: 'Questo video introduce i principi fondamentali dell\'anatomia funzionale, esplorando come la struttura del corpo umano si relaziona con la sua funzione. Verranno analizzati i concetti di movimento, postura e biomeccanica di base.',
  },
  // Corso 1 - Capitolo 2
  {
    id: 'v1-2-1',
    title: 'Struttura delle ossa',
    url: 'https://example.com/video3',
    duration: 600, // 10 minuti
    courseId: '1',
    chapterId: 'ch1-2',
    order: 1,
    isCompleted: true,
    thumbnail: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&h=300&fit=crop',
    description: 'Approfondimento dettagliato sulla struttura ossea: composizione, tipologie di ossa, crescita e rimodellamento. Questo video fornisce le basi anatomiche necessarie per comprendere la biomeccanica del sistema scheletrico.',
  },
  {
    id: 'v1-2-2',
    title: 'Articolazioni e movimento',
    url: 'https://example.com/video4',
    duration: 480, // 8 minuti
    courseId: '1',
    chapterId: 'ch1-2',
    order: 2,
    isCompleted: false,
    thumbnail: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&h=300&fit=crop',
  },
  {
    id: 'v1-2-3',
    title: 'Esercizi pratici',
    url: 'https://example.com/video5',
    duration: 720, // 12 minuti
    courseId: '1',
    chapterId: 'ch1-2',
    order: 3,
    isCompleted: false,
    thumbnail: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&h=300&fit=crop',
  },
  // Corso 1 - Capitolo 3
  {
    id: 'v1-3-1',
    title: 'Tipi di muscoli',
    url: 'https://example.com/video6',
    duration: 540, // 9 minuti
    courseId: '1',
    chapterId: 'ch1-3',
    order: 1,
    isCompleted: false,
    thumbnail: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&h=300&fit=crop',
  },
  {
    id: 'v1-3-2',
    title: 'Contrazione muscolare',
    url: 'https://example.com/video7',
    duration: 660, // 11 minuti
    courseId: '1',
    chapterId: 'ch1-3',
    order: 2,
    isCompleted: false,
    thumbnail: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&h=300&fit=crop',
  },
  // Corso 1 - Capitolo 4
  {
    id: 'v1-4-1',
    title: 'Principi di biomeccanica',
    url: 'https://example.com/video8',
    duration: 780, // 13 minuti
    courseId: '1',
    chapterId: 'ch1-4',
    order: 1,
    isCompleted: false,
    thumbnail: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&h=300&fit=crop',
  },
  // Corso 2 - Capitolo 1
  {
    id: 'v2-1-1',
    title: 'Introduzione alle tecniche strutturali',
    url: 'https://example.com/video9',
    duration: 360, // 6 minuti
    courseId: '2',
    chapterId: 'ch2-1',
    order: 1,
    isCompleted: true,
    thumbnail: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=300&fit=crop',
  },
  {
    id: 'v2-1-2',
    title: 'Preparazione al trattamento',
    url: 'https://example.com/video10',
    duration: 600, // 10 minuti
    courseId: '2',
    chapterId: 'ch2-1',
    order: 2,
    isCompleted: true,
    thumbnail: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=300&fit=crop',
  },
  // Corso 3 - Capitolo 1
  {
    id: 'v3-1-1',
    title: 'Anatomia del sistema viscerale',
    url: 'https://example.com/video11',
    duration: 840, // 14 minuti
    courseId: '3',
    chapterId: 'ch3-1',
    order: 1,
    isCompleted: true,
    thumbnail: 'https://images.unsplash.com/photo-1559757175-0eb30cd8c063?w=400&h=300&fit=crop',
  },
  {
    id: 'v3-1-2',
    title: 'Relazioni viscerali',
    url: 'https://example.com/video12',
    duration: 720, // 12 minuti
    courseId: '3',
    chapterId: 'ch3-1',
    order: 2,
    isCompleted: false,
    thumbnail: 'https://images.unsplash.com/photo-1559757175-0eb30cd8c063?w=400&h=300&fit=crop',
  },
];

