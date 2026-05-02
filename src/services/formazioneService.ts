import { apiClient } from '../api';

export interface ApiResponseDto<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string | null;
}

export interface CorsoDto {
  id: number;
  titolo: string;
  descrizione: string;
  immagineCopertina: string;
  ruoloRichiestoId: number | null;
  ruoloRichiestoTipo: string | null;
  attivo: boolean;
}

/**
 * Catalogo corsi attivi in DB; `attivo` sul singolo corso indica se l'utente corrente può accedervi.
 */
export async function fetchCorsi(): Promise<CorsoDto[]> {
  const { data } = await apiClient.get<ApiResponseDto<CorsoDto[]>>('/formazione/corsi');
  if (!data.success || !Array.isArray(data.data)) {
    throw new Error(data.message || data.error || 'Impossibile caricare i corsi');
  }
  return data.data;
}

export interface ModuloDto {
  id: number;
  corsoId: number;
  titolo: string;
  descrizione: string;
  ordine: number;
  immagineCopertina: string;
  dataAggiunta: string;
  attivo: boolean;
}

export interface LezioneDto {
  id: number;
  moduloId: number;
  titolo: string;
  descrizione: string;
  ordine: number;
  cloudflareUid: string | null;
  immagineCopertina: string;
  durataSecondi: number | null;
  richiedeToken: boolean;
  dataAggiunta: string;
  attivo: boolean;
}

export async function fetchModuliByCorso(corsoId: number): Promise<ModuloDto[]> {
  const { data } = await apiClient.get<ApiResponseDto<ModuloDto[]>>(
    `/formazione/corsi/${corsoId}/moduli`
  );
  if (!data.success || !Array.isArray(data.data)) {
    throw new Error(data.message || data.error || 'Impossibile caricare i moduli');
  }
  return data.data;
}

export async function fetchLezioniByModulo(moduloId: number): Promise<LezioneDto[]> {
  const { data } = await apiClient.get<ApiResponseDto<LezioneDto[]>>(
    `/formazione/moduli/${moduloId}/lezioni`
  );
  if (!data.success || !Array.isArray(data.data)) {
    throw new Error(data.message || data.error || 'Impossibile caricare le lezioni');
  }
  return data.data;
}
