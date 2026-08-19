import React from 'react';
import { useCorsiPosturali } from '../../hooks/useCorsiPosturali';
import CorsiCatalogView, { type CorsiCatalogCopy } from './CorsiCatalogView';

const COPY: CorsiCatalogCopy = {
  headerTitle: 'Corsi posturali',
  headerSubtitle: 'Catalogo dei corsi posturali, con progresso e ripresa rapida.',
  badge: 'Corsi posturali',
  loadingSubtitle: 'Sto caricando il catalogo corsi posturali…',
  emptyText: 'Nessun corso posturale disponibile',
  errorContext: 'Impossibile caricare i corsi posturali',
  errorFallback: 'Non siamo riusciti a caricare l’elenco dei corsi posturali. Riprova tra poco.',
  supportWhatsAppMessage:
    "Buongiorno, utilizzo l'app Mobilitas Academy e non riesco a caricare l'elenco dei corsi posturali. Potete aiutarmi? Grazie.",
};

/** Catalogo per pazienti e utenti app: GET /api/corsi-posturali. */
const CorsiPosturaliScreen: React.FC = () => {
  const { data: courses = [], isPending, isError, error, refetch, isRefetching } =
    useCorsiPosturali();

  return (
    <CorsiCatalogView
      copy={COPY}
      courses={courses}
      isPending={isPending}
      isError={isError}
      error={error}
      isRefetching={isRefetching}
      onRefresh={() => refetch()}
    />
  );
};

export default CorsiPosturaliScreen;
