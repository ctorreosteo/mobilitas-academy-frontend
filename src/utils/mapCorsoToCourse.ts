import { Course } from '../types';
import { CorsoDto } from '../services/formazioneService';

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
    formazioneAttivo: dto.attivo,
    ruoloRichiestoTipo: dto.ruoloRichiestoTipo,
    ruoloRichiestoId: dto.ruoloRichiestoId,
  };
}
