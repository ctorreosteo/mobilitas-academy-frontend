// Tipi TypeScript per l'applicazione Studio Osteopatico

// Tipi per il tema
export interface Theme {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    error: string;
    text: {
      primary: string;
      secondary: string;
      accent: string;
      error: string;
    };
    background: {
      primary: string;
      secondary: string;
      white: string;
    };
  };
  fonts: {
    primary: string;
    weights: {
      light: string;
      regular: string;
      medium: string;
      semiBold: string;
      bold: string;
    };
  };
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'instructor' | 'student';
}

export interface Course {
  id: string;
  title: string;
  description: string;
  instructor: string;
  duration: number; // in minuti
  isCompleted: boolean;
  completionPercentage: number; // 0-100
  category: string;
  difficulty: 'Principiante' | 'Intermedio' | 'Avanzato';
  coverImage?: string;
  youtubePlaylistId?: string; // ID playlist YouTube per questo corso
}

export interface Chapter {
  id: string;
  title: string;
  order: number;
  courseId: string;
  youtubePlaylistId?: string; // ID playlist YouTube per questo capitolo
}

export interface Video {
  id: string;
  title: string;
  url: string;
  duration: number; // in secondi
  courseId: string;
  chapterId: string;
  order: number;
  isCompleted: boolean;
  thumbnail?: string;
  description?: string;
  youtubeVideoId?: string; // ID video YouTube per il player
}
