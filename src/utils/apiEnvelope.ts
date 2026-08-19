/**
 * Involucro applicativo `{ success, message, data, error }`.
 * I rifiuti della catena di sicurezza (token assente/scaduto) non lo usano:
 * il corpo può essere HTML o testo del servlet container.
 */

export interface ApiEnvelope<T = unknown> {
  success: boolean;
  message?: string | null;
  data?: T;
  error?: string | null;
}

function looksLikeMarkup(text: string): boolean {
  const t = text.trim();
  return t.startsWith('<') || /<\/?(?:html|body|head|title)\b/i.test(t);
}

/** Tenta di leggere l’envelope anche se Axios ha lasciato il body come stringa. */
export function parseApiEnvelope(data: unknown): ApiEnvelope | null {
  let body: unknown = data;
  if (typeof data === 'string') {
    const trimmed = data.trim();
    if (!trimmed || looksLikeMarkup(trimmed) || !trimmed.startsWith('{')) {
      return null;
    }
    try {
      body = JSON.parse(trimmed);
    } catch {
      return null;
    }
  }
  if (!body || typeof body !== 'object') return null;
  const rec = body as Record<string, unknown>;
  if (typeof rec.success !== 'boolean') return null;
  return {
    success: rec.success,
    message: typeof rec.message === 'string' ? rec.message : rec.message === null ? null : undefined,
    data: rec.data,
    error: typeof rec.error === 'string' ? rec.error : rec.error === null ? null : undefined,
  };
}

export function getEnvelopeErrorCode(data: unknown): string | null {
  const env = parseApiEnvelope(data);
  if (!env || typeof env.error !== 'string') return null;
  const code = env.error.trim();
  return code.length > 0 ? code : null;
}

export function isPasswordExpiredResponse(data: unknown): boolean {
  return getEnvelopeErrorCode(data) === 'PASSWORD_SCADUTA';
}

export function isPasswordExpiredError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const response = (error as { response?: { status?: number; data?: unknown } }).response;
  if (response?.status !== 403) return false;
  return isPasswordExpiredResponse(response.data);
}
