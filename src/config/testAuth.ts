/**
 * Credenziali fisse solo per fase di test (login automatico).
 * Inviate a POST /api/auth/login nel campo `username` (il backend accetta anche email lì).
 * In produzione: schermata login e niente secret in repo.
 */
export const TEST_AUTH_EMAIL = 'c.torre@studiomobilitas.it';
export const TEST_AUTH_PASSWORD = '0000';
