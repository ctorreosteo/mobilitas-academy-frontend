import { Course } from '../types';
import { CorsoDto } from '../services/formazioneService';
import { CorsoPosturaleDto } from '../services/corsiPosturaliService';

/** Corso dell'LMS interno: GET /api/formazione/corsi/accessibili */
export function mapCorsoDtoToCourse(dto: CorsoDto): Course {
  return {
    id: String(dto.id),
    title: dto.titolo,
    description: dto.descrizione ?? '',
    instructor: 'Mobilitas',
    duration: 0,
    isCompleted: false,
    completionPercentage: 0,
    category: 'Formazione',
    difficulty: 'Principiante',
    coverImage: dto.immagineCopertina || undefined,
    catalog: 'formazione',
    formazioneAttivo: dto.attivo,
    ruoloRichiestoTipo: dto.ruoloRichiestoTipo,
    ruoloRichiestoId: dto.ruoloRichiestoId,
  };
}

/** Corso posturale per i pazienti: GET /api/corsi-posturali */
export function mapCorsoPosturaleDtoToCourse(dto: CorsoPosturaleDto): Course {
  return {
    id: String(dto.id),
    title: dto.titolo,
    description: dto.descrizione ?? '',
    instructor: 'Mobilitas',
    duration: 0,
    isCompleted: false,
    completionPercentage: 0,
    category: 'Postura',
    difficulty: 'Principiante',
    coverImage: dto.immagineCopertina || undefined,
    catalog: 'posturale',
    formazioneAttivo: dto.attivo,
  };
}
