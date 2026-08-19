import React from 'react';
import { useCorsiAziendali } from '../../hooks/useCorsiAziendali';
import CorsiCatalogView, { type CorsiCatalogCopy } from './CorsiCatalogView';

const COPY: CorsiCatalogCopy = {
  headerTitle: 'Corsi aziendali',
  headerSubtitle: 'Formazione interna: i corsi abilitati per il tuo ruolo, modulo per modulo.',
  badge: 'Formazione interna',
  loadingSubtitle: 'Sto caricando il catalogo dei corsi aziendali…',
  emptyText: 'Nessun corso aziendale abilitato per il tuo ruolo',
  errorContext: 'Impossibile caricare i corsi aziendali',
  errorFallback: 'Non siamo riusciti a caricare l’elenco dei corsi aziendali. Riprova tra poco.',
  supportWhatsAppMessage:
    "Buongiorno, utilizzo l'app Mobilitas Academy e non riesco a caricare l'elenco dei corsi aziendali. Potete aiutarmi? Grazie.",
};

/** Catalogo formazione interna: GET /api/formazione/corsi/accessibili. */
const CorsiAziendaliScreen: React.FC = () => {
  const { data: courses = [], isPending, isError, error, refetch, isRefetching } =
    useCorsiAziendali();

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

export default CorsiAziendaliScreen;
