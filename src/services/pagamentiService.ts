import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { API_BASE_URL, apiClient } from '../api';
import { refreshAuthToken } from './authApi';
import { getAuthToken } from './authTokenStorage';
import type { ApiResponseDto } from './formazioneService';

export interface AllocazionePagamentoDto {
  id: number;
  pagamentoId?: number;
  acquistoId?: number;
  importoAllocato?: number | null;
  acquistoServizioNome?: string | null;
  acquistoPazienteNome?: string | null;
  acquistoPazienteCognome?: string | null;
}

export interface PagamentoDto {
  id: number;
  metodoPagamentoId?: number | null;
  pazienteId?: number;
  metodoPagamentoNome?: string | null;
  importo?: number | null;
  stato?: string | null;
  statoDescrizione?: string | null;
  dataPagamento?: string | null;
  note?: string | null;
  numeroTransazione?: string | null;
  operatorePagamento?: string | null;
  allocazioni?: AllocazionePagamentoDto[] | null;
  pazienteNome?: string | null;
  pazienteCognome?: string | null;
  studioNome?: string | null;
  fatturaPresente?: boolean | null;
}

function normalizeAllocazione(raw: unknown): AllocazionePagamentoDto {
  if (!raw || typeof raw !== 'object') {
    return { id: 0 };
  }
  return raw as AllocazionePagamentoDto;
}

function normalizePagamento(raw: unknown): PagamentoDto {
  if (!raw || typeof raw !== 'object') {
    return { id: 0 };
  }
  const base = raw as PagamentoDto;
  return {
    ...base,
    allocazioni: Array.isArray(base.allocazioni)
      ? base.allocazioni.map(normalizeAllocazione)
      : [],
  };
}

function normalizePagamentiResponse(raw: unknown): PagamentoDto[] {
  if (Array.isArray(raw)) {
    return raw.map(normalizePagamento);
  }
  if (raw && typeof raw === 'object') {
    const o = raw as Record<string, unknown>;
    if (Array.isArray(o.content)) {
      return o.content.map(normalizePagamento);
    }
    if (Array.isArray(o.data)) {
      return o.data.map(normalizePagamento);
    }
  }
  return [];
}

/**
 * GET /api/pagamenti/paziente/{pazienteId}
 * Tutti i pagamenti del paziente, senza paginazione. JWT obbligatorio.
 */
export async function fetchPagamentiByPaziente(
  pazienteId: number,
  options?: { sortDir?: 'ASC' | 'DESC' }
): Promise<PagamentoDto[]> {
  const sortDir = options?.sortDir ?? 'DESC';
  const { data } = await apiClient.get<ApiResponseDto<PagamentoDto[]>>(
    `/pagamenti/paziente/${pazienteId}`,
    { params: { sortDir } }
  );

  if (!data.success || data.data === undefined || data.data === null) {
    throw new Error(data.message || data.error || 'Impossibile caricare i pagamenti del paziente');
  }

  return normalizePagamentiResponse(data.data);
}

const FATTURA_PDF_TIMEOUT_MS = 60_000;

function headerValue(headers: Record<string, string> | undefined, name: string): string {
  if (!headers) return '';
  const want = name.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === want) return String(value ?? '');
  }
  return '';
}

function filenameFromContentDisposition(header: string): string | null {
  if (!header) return null;
  const quoted = header.match(/filename="([^"]+)"/i);
  const raw = quoted?.[1] ?? header.match(/filename=([^;]+)/i)?.[1];
  if (!raw) return null;
  const name = raw.trim().replace(/^.*[/\\]/, '');
  if (!name) return null;
  return name.toLowerCase().endsWith('.pdf') ? name : `${name}.pdf`;
}

function safePdfFilename(name: string, pagamentoId: number): string {
  const cleaned = name.replace(/[^a-zA-Z0-9._-]/g, '_');
  return cleaned || `fattura_${pagamentoId}.pdf`;
}

function withTimeout<T>(promise: Promise<T>, ms: number, timeoutMessage: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(timeoutMessage)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

function fatturaPdfUserMessage(errorText?: string | null, fallback?: string): string {
  const e = (errorText ?? '').trim();
  if (/Nessuna fattura Fatture in Cloud associata/i.test(e)) {
    return 'Per questo pagamento non è disponibile una fattura da scaricare.';
  }
  if (/non ha il documentId/i.test(e)) {
    return 'Questa fattura non è scaricabile.';
  }
  if (/non abilitata|Company ID/i.test(e)) {
    return 'Il servizio fatture non è al momento disponibile. Contatta la segreteria.';
  }
  if (/non ha restituito|Download PDF non riuscito/i.test(e)) {
    return 'Non è stato possibile scaricare la fattura. Riprova tra poco.';
  }
  if (e) return e;
  return fallback ?? 'Download della fattura non riuscito. Riprova più tardi.';
}

async function parseDownloadedErrorBody(uri: string): Promise<string> {
  try {
    const body = await FileSystem.readAsStringAsync(uri);
    const parsed = JSON.parse(body) as { error?: unknown; message?: unknown };
    const err = typeof parsed.error === 'string' ? parsed.error : null;
    const msg = typeof parsed.message === 'string' ? parsed.message : null;
    return fatturaPdfUserMessage(err || msg);
  } catch {
    return fatturaPdfUserMessage(null);
  }
}

async function downloadFatturaPdfOnce(
  pagamentoId: number,
  token: string
): Promise<FileSystem.FileSystemDownloadResult> {
  const cacheDir = FileSystem.cacheDirectory;
  if (!cacheDir) {
    throw new Error('Impossibile salvare la fattura su questo dispositivo.');
  }
  const tmpUri = `${cacheDir}fattura_${pagamentoId}_${Date.now()}.bin`;
  return withTimeout(
    FileSystem.downloadAsync(`${API_BASE_URL}/pagamenti/${pagamentoId}/fattura-fic-pdf`, tmpUri, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/pdf',
      },
      sessionType: FileSystem.FileSystemSessionType.FOREGROUND,
    }),
    FATTURA_PDF_TIMEOUT_MS,
    'Il download della fattura sta impiegando troppo tempo. Riprova tra poco.'
  );
}

/**
 * GET /api/pagamenti/{pagamentoId}/fattura-fic-pdf — bytes PDF, non JSON.
 */
export async function downloadFatturaPdf(pagamentoId: number): Promise<{ uri: string; filename: string }> {
  let token = await getAuthToken();
  if (!token) {
    throw new Error('Accesso non autorizzato. Effettua di nuovo il login.');
  }

  let result = await downloadFatturaPdfOnce(pagamentoId, token);
  if (result.status === 401) {
    try {
      await FileSystem.deleteAsync(result.uri, { idempotent: true });
    } catch {
      // ignore
    }
    token = await refreshAuthToken();
    result = await downloadFatturaPdfOnce(pagamentoId, token);
  }

  const contentType = (
    headerValue(result.headers, 'content-type') ||
    result.mimeType ||
    ''
  ).toLowerCase();
  const isPdf = result.status === 200 && contentType.includes('application/pdf');

  if (!isPdf) {
    const message =
      result.status === 403
        ? 'Accesso non autorizzato. Effettua di nuovo il login.'
        : await parseDownloadedErrorBody(result.uri);
    try {
      await FileSystem.deleteAsync(result.uri, { idempotent: true });
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  const fromHeader = filenameFromContentDisposition(headerValue(result.headers, 'content-disposition'));
  const filename = safePdfFilename(fromHeader ?? `fattura_${pagamentoId}.pdf`, pagamentoId);
  const cacheDir = FileSystem.cacheDirectory!;
  const destUri = `${cacheDir}${filename}`;
  if (result.uri !== destUri) {
    try {
      await FileSystem.deleteAsync(destUri, { idempotent: true });
    } catch {
      // ignore
    }
    await FileSystem.moveAsync({ from: result.uri, to: destUri });
  }
  return { uri: destUri, filename };
}

/** Apre il foglio di condivisione per visualizzare o salvare il PDF locale. */
export async function shareFatturaPdf(uri: string, filename: string): Promise<void> {
  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    throw new Error('Apertura della fattura non disponibile su questo dispositivo.');
  }
  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    UTI: 'com.adobe.pdf',
    dialogTitle: filename,
  });
}
