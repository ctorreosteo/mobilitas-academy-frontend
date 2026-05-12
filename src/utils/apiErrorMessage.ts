import { isAxiosError, type AxiosError } from 'axios';

/** Messaggi tecnici tipici del backend (anche in risposte 200 con `success: false`) da non mostrare così com’è. */
function humanizeBackendErrorText(raw: string): string {
  const t = raw.trim();
  if (/endpoint\s+non\s+trovato/i.test(t) || /endpoint\s+not\s+found/i.test(t)) {
    return 'Questa funzione non è al momento disponibile sul server. Riprova più tardi o contatta la segreteria.';
  }
  return t;
}

function extractServerMessage(error: AxiosError): string | null {
  const d = error.response?.data;
  if (d && typeof d === 'object') {
    const msg = (d as { message?: unknown; error?: unknown }).message;
    if (typeof msg === 'string' && msg.trim()) return msg.trim();
    const err = (d as { error?: unknown }).error;
    if (typeof err === 'string' && err.trim()) return err.trim();
  }
  if (typeof d === 'string' && d.trim().length > 0 && d.length < 500) {
    return d.trim();
  }
  return null;
}

/** Messaggi generati da Axios da non mostrare così com’sono all’utente. */
function isGenericAxiosMessage(msg: string): boolean {
  return /^Request failed with status code \d+$/i.test(msg.trim());
}

/**
 * Testo d’errore per UI: italiano, senza dettagli tecnici inutili.
 * @param context es. "Impossibile caricare i corsi" (senza punto finale)
 */
export function getUserFacingApiErrorMessage(
  error: unknown,
  options?: { fallback?: string; context?: string }
): string {
  const fallback = options?.fallback ?? 'Operazione non riuscita. Riprova più tardi.';
  const prefix = options?.context ? `${options.context}. ` : '';

  if (isAxiosError(error)) {
    const status = error.response?.status;
    const serverMsg = extractServerMessage(error);

    if (!error.response) {
      return `${prefix}Connessione non disponibile. Controlla la rete e riprova.`;
    }

    if (status === 401 || status === 403) {
      return `${prefix}Accesso non autorizzato. Effettua di nuovo il login.`;
    }

    if (status === 404) {
      return `${prefix}Servizio o contenuto non disponibile sul server (non trovato). Se il problema persiste, contatta la segreteria.`;
    }

    if (status === 408 || status === 504) {
      return `${prefix}Il server ha impiegato troppo tempo. Riprova tra poco.`;
    }

    if (status === 429) {
      return `${prefix}Troppe richieste. Attendi un momento e riprova.`;
    }

    if (status != null && status >= 500) {
      const msg = serverMsg ? humanizeBackendErrorText(serverMsg) : 'Errore del server. Riprova più tardi.';
      return `${prefix}${msg}`;
    }

    if (serverMsg && !isGenericAxiosMessage(serverMsg)) {
      return `${prefix}${humanizeBackendErrorText(serverMsg)}`;
    }

    return `${prefix}${fallback}`;
  }

  if (error instanceof Error && error.message && !isGenericAxiosMessage(error.message)) {
    return `${prefix}${humanizeBackendErrorText(error.message)}`;
  }

  return `${prefix}${fallback}`;
}
