import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { fetchCurrentUser } from '../services/authApi';
import { fetchVisiteByPaziente } from '../services/visiteService';
import { syncVisitReminders } from '../services/visitRemindersService';

/**
 * Tiene allineati i promemoria locali (2 ore prima) con le visite del paziente.
 * Stessa query di "Gestisci le tue visite": prenotazioni e disdette la invalidano
 * e i promemoria si aggiornano da soli. Al ritorno in primo piano si ricarica,
 * per le visite prenotate dallo studio nel frattempo.
 */
export function useVisitReminders(): void {
  const profileQuery = useQuery({
    queryKey: ['auth-me-profile'],
    queryFn: fetchCurrentUser,
    staleTime: 60_000,
  });
  const pazienteId = profileQuery.data?.pazienteId ?? null;
  const osteopataId = profileQuery.data?.osteopataId ?? null;
  // Gli osteopati vedono l’agenda, non le proprie visite da paziente: niente promemoria.
  const enabled =
    typeof pazienteId === 'number' &&
    pazienteId > 0 &&
    !(typeof osteopataId === 'number' && osteopataId > 0);

  const visiteQuery = useQuery({
    queryKey: ['visite-by-paziente', pazienteId, 'ASC'],
    queryFn: () => fetchVisiteByPaziente(pazienteId!, { sortOrder: 'ASC' }),
    enabled,
  });

  const { refetch } = visiteQuery;
  useEffect(() => {
    if (!enabled) return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refetch();
    });
    return () => sub.remove();
  }, [enabled, refetch]);

  const lastSignature = useRef<string | null>(null);
  useEffect(() => {
    const visite = visiteQuery.data;
    if (!enabled || !visite) return;
    const signature = JSON.stringify(
      visite.map((v) => [v.id, v.dataVisita, v.oraInizio, v.statusVisita, v.studioIndirizzo])
    );
    if (signature === lastSignature.current) return;
    lastSignature.current = signature;
    syncVisitReminders(visite).catch(() => {
      // un promemoria non programmato non deve mai bloccare l’app
      lastSignature.current = null;
    });
  }, [enabled, visiteQuery.data]);
}
