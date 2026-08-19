import { useQuery } from '@tanstack/react-query';
import { fetchCorsi } from '../services/formazioneService';
import { hasGestionaleRole } from '../services/authApi';
import { mapCorsoDtoToCourse } from '../utils/mapCorsoToCourse';
import { useAuth } from '../context/AuthContext';
import { Course } from '../types';

async function fetchCourses(): Promise<Course[]> {
  const corsi = await fetchCorsi();
  return corsi.map(mapCorsoDtoToCourse);
}

/**
 * Catalogo formazione interna: GET /api/formazione/corsi/accessibili.
 * La query parte solo con un ruolo gestionale in profilo, così un token
 * paziente/app non genera un 403 evitabile.
 */
export function useCorsiAziendali() {
  const { userProfile } = useAuth();

  return useQuery({
    queryKey: ['corsi', 'aziendali'],
    queryFn: fetchCourses,
    enabled: hasGestionaleRole(userProfile?.ruoli),
    staleTime: 60_000,
  });
}
