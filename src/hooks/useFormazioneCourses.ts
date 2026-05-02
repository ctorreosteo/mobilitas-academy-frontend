import { useQuery } from '@tanstack/react-query';
import { fetchCorsi } from '../services/formazioneService';
import { mapCorsoDtoToCourse } from '../utils/mapCorsoToCourse';
import { Course } from '../types';

export function useFormazioneCourses() {
  return useQuery({
    queryKey: ['formazione', 'corsi'],
    queryFn: async (): Promise<Course[]> => {
      const corsi = await fetchCorsi();
      return corsi.map(mapCorsoDtoToCourse);
    },
    staleTime: 60_000,
  });
}
