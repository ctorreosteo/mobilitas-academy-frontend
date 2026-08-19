import axios, { isAxiosError } from 'axios';
import { apiClient } from '../api';
import { ApiResponseDto } from './formazioneService';
import {
  getAuthToken,
  setAuthToken,
  setStoredUserProfile,
  clearAllAuth,
  StoredOsteopataProfile,
  StoredPazienteProfile,
  StoredUserProfile,
} from './authTokenStorage';
import { fetchOsteopataById, type OsteopataDto } from './studioVisitsService';
import { fetchPazienteByUtenteId, type PazienteDto } from './pazientiService';
import { parseApiEnvelope } from '../utils/apiEnvelope';
export interface LoginRequestBody {
  username: string;
  password: string;
}

/** Blocco del login: per un paziente puro è tutto `false` / `null` — nessun avviso in app. */
export interface CambioPasswordStatoDto {
  cambioPasswordObbligatorio: boolean;
  passwordScaduta: boolean;
  cambioPasswordForzato: boolean;
  dataScadenzaCambioPassword: string | null;
  dataAperturaFinestraCambioPassword: string | null;
}

export interface LoginResponseData {
  token: string;
  username: string;
  nome: string;
  cognome: string;
  email: string;
  ruoli: string[];
  pazienteId?: number | null;
  cambioPassword?: CambioPasswordStatoDto | null;
}

export interface UserInfoResponseDto {
  id: number;
  username: string;
  nome: string;
  cognome: string;
  email: string;
  ruoli: string[];
  attivo: boolean;
  osteopataId?: number | null;
  pazienteId?: number | null;
}

function osteopataDtoToStored(d: OsteopataDto): StoredOsteopataProfile {
  return {
    id: d.id,
    nome: d.nome,
    cognome: d.cognome,
    email: d.email ?? null,
    telefono: d.telefono ?? null,
    immagineProfiloUrl: d.immagineProfiloUrl ?? null,
    colore: d.colore ?? null,
    isTirocinante: d.isTirocinante,
    genere: d.genere ?? null,
    specializzazioni: d.specializzazioni ?? null,
  };
}

function pazienteDtoToStored(d: PazienteDto): StoredPazienteProfile {
  return {
    id: d.id,
    nome: d.nome ?? null,
    cognome: d.cognome ?? null,
    prefissoCellulare: d.prefissoCellulare ?? null,
    cellulare: d.cellulare ?? null,
    email: d.email ?? null,
    dataNascita: d.dataNascita ?? null,
    eta: d.eta ?? null,
    cittaNascita: d.cittaNascita ?? null,
    codiceFiscale: d.codiceFiscale ?? null,
    linkWhatsapp: d.linkWhatsapp ?? null,
    genere: d.genere ?? null,
    note: d.note ?? null,
  };
}

export function hasPazienteRole(roles: string[] | null | undefined): boolean {
  if (!Array.isArray(roles)) return false;
  return roles.some((role) => role.toUpperCase().includes('PAZIENTE'));
}

/** Ruoli puramente app mobile: non danno accesso alle API `/api/formazione`. */
const MOBILE_ONLY_ROLES = new Set([
  'ROLE_PAZIENTE',
  'ROLE_UTENTE_MOBILE_APP',
  'ROLE_ABBONATO_MOBILE_APP',
]);

/**
 * True se l'utente ha almeno un ruolo gestionale (dipendente/osteopata/manager/admin).
 * È la condizione che il backend usa per `/api/formazione`: chi ha solo ruoli mobile
 * riceve 403. Un osteopata che è anche paziente resta gestionale.
 */
export function hasGestionaleRole(roles: string[] | null | undefined): boolean {
  if (!Array.isArray(roles)) return false;
  return roles.some((role) => {
    const normalized = role.trim().toUpperCase();
    if (!normalized) return false;
    const withPrefix = normalized.startsWith('ROLE_') ? normalized : `ROLE_${normalized}`;
    return !MOBILE_ONLY_ROLES.has(withPrefix);
  });
}

function toStoredProfile(d: LoginResponseData | UserInfoResponseDto): StoredUserProfile {
  const profile: StoredUserProfile = {
    username: d.username,
    nome: d.nome ?? '',
    cognome: d.cognome ?? '',
    email: d.email ?? '',
    ruoli: Array.isArray(d.ruoli) ? d.ruoli : [],
  };
  if ('pazienteId' in d) {
    profile.pazienteId = d.pazienteId ?? null;
  }
  if ('id' in d && typeof d.id === 'number') {
    profile.utenteId = d.id;
  }
  if ('attivo' in d && typeof d.attivo === 'boolean') {
    profile.attivo = d.attivo;
  }
  if ('osteopataId' in d) {
    profile.osteopataId = d.osteopataId ?? null;
  }
  return profile;
}

function headersToPlain(headers: unknown): Record<string, unknown> {
  if (!headers || typeof headers !== 'object') return {};
  const anyHeaders = headers as { toJSON?: () => Record<string, unknown> } & Record<string, unknown>;
  if (typeof anyHeaders.toJSON === 'function') {
    try {
      return anyHeaders.toJSON();
    } catch {
      // fallthrough
    }
  }
  return { ...anyHeaders };
}

/**
 * POST /api/auth/login — pubblico. `username` accetta username o email (backend).
 */
export async function loginMobilitas(
  usernameOrEmail: string,
  password: string
): Promise<LoginResponseData> {
  const requestBody: LoginRequestBody = { username: usernameOrEmail, password };
  const requestUrlPath = '/auth/login';
  const fullUrl = `${apiClient.defaults.baseURL ?? ''}${requestUrlPath}`;
  const requestStartedAt = Date.now();

  console.log('[LOGIN] → request', {
    method: 'POST',
    url: fullUrl,
    baseURL: apiClient.defaults.baseURL,
    path: requestUrlPath,
    timeoutMs: apiClient.defaults.timeout,
    defaultHeaders: headersToPlain(apiClient.defaults.headers?.common),
    body: { username: usernameOrEmail, hasPassword: Boolean(password) },
  });

  try {
    const response = await apiClient.post<ApiResponseDto<LoginResponseData>>(
      requestUrlPath,
      requestBody
    );
    const elapsedMs = Date.now() - requestStartedAt;
    const { data, status, statusText, headers } = response;

    console.log('[LOGIN] ← response', {
      status,
      statusText,
      elapsedMs,
      headers: headersToPlain(headers),
      data: {
        success: data?.success,
        message: data?.message,
        error: data?.error,
        hasToken: Boolean(data?.data?.token),
        username: data?.data?.username,
        ruoli: data?.data?.ruoli,
        passwordScaduta: data?.data?.cambioPassword?.passwordScaduta ?? false,
      },
    });

    if (!data.success || !data.data?.token) {
      throw new Error(data.message || data.error || 'Login fallito');
    }
    return data.data;
  } catch (e) {
    const elapsedMs = Date.now() - requestStartedAt;
    if (isAxiosError(e)) {
      console.log('[LOGIN] ✗ error', {
        elapsedMs,
        code: e.code,
        message: e.message,
        status: e.response?.status,
        statusText: e.response?.statusText,
        requestUrl: e.config?.url,
        requestBaseURL: e.config?.baseURL,
      });
      const envelope = parseApiEnvelope(e.response?.data);
      if (envelope?.message) throw new Error(envelope.message);
      if (envelope?.error) throw new Error(envelope.error);
    } else {
      console.log('[LOGIN] ✗ error (non-axios)', { elapsedMs, error: e });
    }
    throw e;
  }
}

/** Lunghezza minima imposta dal backend. L'app può essere più severa, non più permissiva. */
export const MIN_PASSWORD_LENGTH = 8;

export interface ChangePasswordRequestBody {
  currentPassword: string;
  newPassword: string;
  /** Opzionale: se assente il backend non confronta. La mandiamo per avere il controllo anche server-side. */
  confirmPassword?: string;
}

/** Campo del form a cui l'errore si riferisce, per evidenziare l'input giusto. */
export type ChangePasswordField = 'currentPassword' | 'newPassword' | 'confirmPassword';

/**
 * Errore applicativo di `POST /auth/change-password`: il backend risponde 400 con un
 * codice stabile in `error` e un testo già mostrabile in `message`. Si fa `switch` sul
 * codice, mai sul testo.
 */
export class ChangePasswordError extends Error {
  readonly code: string | null;
  readonly field: ChangePasswordField | null;

  constructor(message: string, code: string | null, field: ChangePasswordField | null) {
    super(message);
    this.name = 'ChangePasswordError';
    this.code = code;
    this.field = field;
  }
}

/** Codici documentati; l'elenco può crescere, quindi il chiamante tiene sempre un default. */
const CHANGE_PASSWORD_ERRORS: Record<string, { message: string; field: ChangePasswordField }> = {
  NUOVA_PASSWORD_OBBLIGATORIA: {
    message: 'Inserisci la nuova password.',
    field: 'newPassword',
  },
  PASSWORD_NON_COINCIDONO: {
    message: 'Le due password non coincidono.',
    field: 'confirmPassword',
  },
  PASSWORD_ATTUALE_ERRATA: {
    message: 'La password attuale non è corretta.',
    field: 'currentPassword',
  },
  PASSWORD_TROPPO_CORTA: {
    message: `La nuova password deve avere almeno ${MIN_PASSWORD_LENGTH} caratteri.`,
    field: 'newPassword',
  },
  PASSWORD_UGUALE_ALLA_PRECEDENTE: {
    message: 'La nuova password deve essere diversa da quella attuale.',
    field: 'newPassword',
  },
};

function toChangePasswordError(
  code: string | null,
  serverMessage: string | null
): ChangePasswordError {
  const known = code ? CHANGE_PASSWORD_ERRORS[code] : undefined;
  if (known) {
    return new ChangePasswordError(known.message, code, known.field);
  }
  // Codice nuovo o assente: il `message` del backend è già pensato per l'utente.
  return new ChangePasswordError(
    serverMessage || 'Non è stato possibile cambiare la password. Riprova.',
    code,
    null
  );
}

/**
 * POST /api/auth/change-password — richiede Bearer, nessun vincolo di ruolo.
 *
 * Il JWT già emesso resta valido fino alla scadenza naturale: la sessione non si chiude
 * e il cambio non disconnette gli altri dispositivi. Chiamiamo `refresh` dopo il successo
 * per ripartire con un token nuovo (best-effort: se fallisce il vecchio è ancora buono).
 *
 * Niente log di password: questa funzione non stampa mai il body.
 */
export async function changePassword(input: ChangePasswordRequestBody): Promise<string> {
  const body: ChangePasswordRequestBody = {
    currentPassword: input.currentPassword,
    newPassword: input.newPassword,
    confirmPassword: input.confirmPassword ?? input.newPassword,
  };

  try {
    const { data } = await apiClient.post<ApiResponseDto<string>>('/auth/change-password', body);
    if (!data.success) {
      throw toChangePasswordError(data.error ?? null, data.message ?? null);
    }
    try {
      await refreshAuthToken();
    } catch {
      // Il token corrente resta valido: il cambio password è comunque andato a buon fine.
    }
    return data.message || 'Password cambiata con successo';
  } catch (e) {
    if (e instanceof ChangePasswordError) throw e;
    if (isAxiosError(e) && e.response?.status === 400) {
      const envelope = parseApiEnvelope(e.response.data);
      if (envelope) {
        throw toChangePasswordError(envelope.error ?? null, envelope.message ?? null);
      }
    }
    throw e;
  }
}

/** True se un account misto deve cambiare la password prima di usare le API gestionali. */
export function isPasswordChangeRequired(
  session: Pick<LoginResponseData, 'ruoli' | 'cambioPassword'>
): boolean {
  if (!hasGestionaleRole(session.ruoli)) return false;
  const stato = session.cambioPassword;
  if (!stato) return false;
  return Boolean(stato.passwordScaduta || stato.cambioPasswordObbligatorio);
}

export const RESET_REQUEST_USER_MESSAGE =
  "Se l'account esiste, riceverai un'email con il link per reimpostare la password.";

export type ResetLinkMotivo = 'SCADUTO' | 'GIA_USATO' | 'NON_TROVATO' | null;

export interface ResetLinkVerifica {
  valido: boolean;
  motivo: ResetLinkMotivo;
  nome: string | null;
  scadenza: string | null;
}

/** Errore dei flussi pubblici (invito / reset): si interpreta lo status HTTP, non il testo. */
export class PasswordLinkError extends Error {
  readonly httpStatus: number;

  constructor(httpStatus: number, message: string) {
    super(message);
    this.name = 'PasswordLinkError';
    this.httpStatus = httpStatus;
  }
}

function messageForPasswordLinkStatus(status: number, kind: 'invite' | 'reset'): string {
  if (kind === 'invite') {
    switch (status) {
      case 400:
        return 'Link non valido: chiedi allo studio un nuovo invito.';
      case 409:
        return 'Questo link è già stato usato: accedi con la password che hai scelto.';
      case 410:
        return 'Il link è scaduto: chiedi allo studio un nuovo invito.';
      default:
        return 'Non è stato possibile impostare la password. Riprova.';
    }
  }
  switch (status) {
    case 400:
      return 'Link non valido, oppure la nuova password è troppo corta o uguale alla precedente.';
    case 409:
      return 'Questo link è già stato usato: accedi con la password che hai scelto.';
    case 410:
      return 'Il link è scaduto: chiedine uno nuovo.';
    default:
      return 'Non è stato possibile reimpostare la password. Riprova.';
  }
}

function throwPasswordLinkError(error: unknown, kind: 'invite' | 'reset'): never {
  if (isAxiosError(error) && error.response?.status) {
    throw new PasswordLinkError(
      error.response.status,
      messageForPasswordLinkStatus(error.response.status, kind)
    );
  }
  throw error;
}

/**
 * POST /api/auth/reset-password/richiedi — pubblico.
 * Risponde sempre 200 con lo stesso testo, anche se l’account non esiste: non dedurre nulla.
 */
export async function requestPasswordReset(emailOUsername: string): Promise<void> {
  const { data } = await apiClient.post<ApiResponseDto<string>>('/auth/reset-password/richiedi', {
    emailOUsername,
  });
  if (!data.success) {
    throw new Error(data.message || 'Richiesta non riuscita');
  }
}

/**
 * GET /api/auth/reset-password/verifica?token= — pubblico, sempre 200.
 * Non consuma il link. `token` va passato già decodificato: Axios lo encode una sola volta in query.
 */
export async function verifyResetPasswordToken(token: string): Promise<ResetLinkVerifica> {
  const { data } = await apiClient.get<ApiResponseDto<ResetLinkVerifica>>(
    '/auth/reset-password/verifica',
    { params: { token } }
  );
  const payload = data.data;
  if (!payload) {
    return { valido: false, motivo: 'NON_TROVATO', nome: null, scadenza: null };
  }
  return {
    valido: Boolean(payload.valido),
    motivo: payload.motivo ?? null,
    nome: payload.nome ?? null,
    scadenza: payload.scadenza ?? null,
  };
}

/** POST /api/auth/reset-password — pubblico. Interpretare 400/409/410 dallo status HTTP. */
export async function submitResetPassword(token: string, nuovaPassword: string): Promise<void> {
  try {
    const { data } = await apiClient.post<ApiResponseDto<unknown>>('/auth/reset-password', {
      token,
      nuovaPassword,
    });
    if (!data.success) {
      throw new PasswordLinkError(400, messageForPasswordLinkStatus(400, 'reset'));
    }
  } catch (e) {
    if (e instanceof PasswordLinkError) throw e;
    throwPasswordLinkError(e, 'reset');
  }
}

/**
 * POST /api/auth/applicazione/imposta-password — pubblico, primo accesso da invito.
 * Accetta anche un token di reset (senza però controllare che la password sia diversa).
 */
export async function submitImpostaPassword(token: string, nuovaPassword: string): Promise<void> {
  try {
    const { data } = await apiClient.post<ApiResponseDto<unknown>>(
      '/auth/applicazione/imposta-password',
      { token, nuovaPassword }
    );
    if (!data.success) {
      throw new PasswordLinkError(400, messageForPasswordLinkStatus(400, 'invite'));
    }
  } catch (e) {
    if (e instanceof PasswordLinkError) throw e;
    throwPasswordLinkError(e, 'invite');
  }
}

/** POST /api/auth/refresh — richiede Bearer; sostituisce il JWT in storage. */
export async function refreshAuthToken(): Promise<string> {
  const { data } = await apiClient.post<ApiResponseDto<LoginResponseData>>('/auth/refresh', {});
  if (!data.success || !data.data?.token) {
    throw new Error(data.message || data.error || 'Refresh fallito');
  }
  await persistLoginSession(data.data);
  return data.data.token;
}

/** POST /api/auth/logout — best-effort; sempre pulisce storage locale. */
export async function logoutMobilitas(): Promise<void> {
  try {
    await apiClient.post<ApiResponseDto<unknown>>('/auth/logout', {});
  } catch {
    // token scaduto / rete: comunque disconnetti lato client
  } finally {
    await clearAllAuth();
  }
}

/** Salva JWT e profilo dopo login o refresh con payload completo. */
export async function persistLoginSession(session: LoginResponseData): Promise<void> {
  await setAuthToken(session.token);
  await setStoredUserProfile(toStoredProfile(session));
}

/** GET /api/auth/me — profilo corrente; se c’è `osteopataId`, GET /osteopati/{id}. Aggiorna storage. */
export async function fetchCurrentUser(): Promise<StoredUserProfile> {
  const { data } = await apiClient.get<ApiResponseDto<UserInfoResponseDto>>('/auth/me');
  if (!data.success || !data.data) {
    throw new Error(data.message || data.error || 'Impossibile caricare il profilo');
  }
  const me = data.data;
  let profile = toStoredProfile(me);

  if (me.osteopataId != null) {
    try {
      const o = await fetchOsteopataById(me.osteopataId);
      profile = { ...profile, osteopata: osteopataDtoToStored(o) };
    } catch {
      profile = { ...profile, osteopata: null };
    }
  } else {
    profile = { ...profile, osteopata: null, osteopataId: null };
  }

  const shouldLoadPaziente = hasPazienteRole(me.ruoli) && typeof me.id === 'number' && me.id > 0;
  if (shouldLoadPaziente) {
    try {
      const paziente = await fetchPazienteByUtenteId(me.id);
      if (paziente) {
        profile = {
          ...profile,
          pazienteId: paziente.id,
          paziente: pazienteDtoToStored(paziente),
        };
      } else {
        profile = { ...profile, pazienteId: null, paziente: null };
      }
    } catch {
      profile = { ...profile, paziente: null };
    }
  } else {
    profile = { ...profile, pazienteId: null, paziente: null };
  }

  await setStoredUserProfile(profile);
  return profile;
}

/**
 * All’avvio: se esiste un JWT salvato, lo convalida con /auth/me.
 * - 401 → sessione invalida, storage pulito.
 * - Rete o altro errore → si mantiene il token e il profilo in cache (resti collegato offline).
 */
export async function restorePersistedSession(): Promise<boolean> {
  const token = await getAuthToken();
  if (!token) return false;
  try {
    await fetchCurrentUser();
    return true;
  } catch (e) {
    if (isAxiosError(e) && e.response?.status === 401) {
      await clearAllAuth();
      return false;
    }
    return true;
  }
}

