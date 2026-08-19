import { useQuery } from '@tanstack/react-query';
import { fetchCorsiPosturali } from '../services/corsiPosturaliService';
import { mapCorsoPosturaleDtoToCourse } from '../utils/mapCorsoToCourse';
import { Course } from '../types';

async function fetchCourses(): Promise<Course[]> {
  const corsi = await fetchCorsiPosturali();
  return corsi.map(mapCorsoPosturaleDtoToCourse);
}

/** Catalogo pazienti / utenti app: GET /api/corsi-posturali. */
export function useCorsiPosturali() {
  return useQuery({
    queryKey: ['corsi', 'posturali'],
    queryFn: fetchCourses,
    staleTime: 60_000,
  });
}
