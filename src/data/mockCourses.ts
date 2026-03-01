import { Course } from '../types';

export const mockCourses: Course[] = [
  {
    id: 'gestionale',
    title: 'Formazione sul gestionale',
    description: 'Corso di formazione sul gestionale: panoramiche e procedure.',
    instructor: 'Mobilitas',
    duration: 60,
    isCompleted: false,
    completionPercentage: 0,
    category: 'Formazione',
    difficulty: 'Principiante',
    coverImage: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&h=300&fit=crop',
  },
];
