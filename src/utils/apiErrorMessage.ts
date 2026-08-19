import { isAxiosError, type AxiosError } from 'axios';
import { parseApiEnvelope, getEnvelopeErrorCode } from './apiEnvelope';

/** Messaggi tecnici tipici del backend (anche in risposte 200 con `success: false`) da non mostrare così com’è. */
function humanizeBackendErrorText(raw: string): string {
  const t = raw.trim();
  if (/endpoint\s+non\s+trovato/i.test(t) || /endpoint\s+not\s+found/i.test(t)) {
    return 'Questa funzione non è al momento disponibile sul server. Riprova più tardi o contatta la segreteria.';
  }
  return t;
}

/**
 * True se il corpo è l’envelope applicativo `{ success, message, data, error }`.
 * I rifiuti della catena di sicurezza (token assente, scaduto, malformato) non ci passano:
 * arriva la pagina d’errore del servlet container, che non è JSON.
 */
function hasEnvelopeBody(error: AxiosError): boolean {
  return parseApiEnvelope(error.response?.data) != null;
}

/** Corpi HTML/XML (pagine d’errore del container) da non riversare in UI. */
function looksLikeMarkup(text: string): boolean {
  const t = text.trim();
  return t.startsWith('<') || /<\/?(?:html|body|head|title)\b/i.test(t);
}

function extractServerMessage(error: AxiosError): string | null {
  const envelope = parseApiEnvelope(error.response?.data);
  if (envelope) {
    if (typeof envelope.message === 'string' && envelope.message.trim()) {
      return envelope.message.trim();
    }
    if (typeof envelope.error === 'string' && envelope.error.trim()) {
      return envelope.error.trim();
    }
  }
  const d = error.response?.data;
  if (typeof d === 'string' && d.trim().length > 0 && d.length < 500 && !looksLikeMarkup(d)) {
    return d.trim();
  }
  return null;
}

/** Codice `error` dell’envelope backend, quando presente. */
function extractServerErrorCode(error: AxiosError): string | null {
  return getEnvelopeErrorCode(error.response?.data);
}

/** Messaggi generati da Axios da non mostrare così com’sono all’utente. */
function isGenericAxiosMessage(msg: string): boolean {
  return /^Request failed with status code \d+$/i.test(msg.trim());
}

const NETWORK_USER_MESSAGE =
  'Connessione non disponibile. Controlla la rete e riprova.';

/** Messaggi tecnici di rete (Axios, fetch, RN) da non mostrare così com’è. */
function isNetworkFailureMessage(msg: string): boolean {
  const t = msg.trim().toLowerCase();
  return (
    t === 'network error' ||
    t === 'network request failed' ||
    t.includes('network connection was lost') ||
    t.includes('internet connection appears to be offline') ||
    t.includes('failed to connect') ||
    t.includes('could not connect') ||
    t.includes('connessione interrotta')
  );
}

function isNetworkFailure(error: unknown): boolean {
  if (isAxiosError(error)) {
    if (!error.response) return true;
    const code = error.code;
    if (code === 'ERR_NETWORK' || code === 'ECONNREFUSED' || code === 'ENOTFOUND') {
      return true;
    }
  }
  if (error instanceof Error) {
    if (error.message && isNetworkFailureMessage(error.message)) return true;
    const code = (error as Error & { code?: string }).code;
    if (code === 'ERR_NETWORK') return true;
  }
  return false;
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

  if (isNetworkFailure(error)) {
    return `${prefix}${NETWORK_USER_MESSAGE}`;
  }

  if (isAxiosError(error)) {
    const status = error.response?.status;
    const serverMsg = extractServerMessage(error);

    if (!error.response) {
      return `${prefix}${NETWORK_USER_MESSAGE}`;
    }

    if (status === 403) {
      // La password gestionale scade a rotazione: non è una sessione da rifare.
      if (extractServerErrorCode(error) === 'PASSWORD_SCADUTA') {
        return `${prefix}${
          serverMsg ||
          'La tua password è scaduta: cambiala da Profilo › Cambia Password per continuare.'
        }`;
      }
      // Senza envelope il 403 arriva dalla catena di sicurezza: manca il token, non i permessi.
      if (!hasEnvelopeBody(error)) {
        return `${prefix}Sessione non più valida. Effettua di nuovo il login.`;
      }
      return `${prefix}Non hai i permessi per accedere a questo contenuto.`;
    }

    if (status === 401) {
      return `${prefix}Accesso non autorizzato. Effettua di nuovo il login.`;
    }

    if (status === 404) {
      return `${prefix}Contenuto non disponibile.`;
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

  if (
    error instanceof Error &&
    error.message &&
    !isGenericAxiosMessage(error.message) &&
    !isNetworkFailureMessage(error.message)
  ) {
    return `${prefix}${humanizeBackendErrorText(error.message)}`;
  }

  return `${prefix}${fallback}`;
}
