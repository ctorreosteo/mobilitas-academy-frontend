/** Estrae il primo URL copertina valido tra candidati (camelCase / snake_case). */
export function pickCoverImageUrl(...candidates: unknown[]): string | null {
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }
  return null;
}
