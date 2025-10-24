// Tipi TypeScript per l'applicazione Mobilitas Academy

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
}

export interface Video {
  id: string;
  title: string;
  url: string;
  duration: number; // in secondi
  courseId: string;
}
