type Listener = () => void;

const listeners = new Set<Listener>();

/** True mentre si sta chiudendo la sessione: l’interceptor non deve reintrodurre stato. */
let authTearingDown = false;

export function beginAuthTeardown(): void {
  authTearingDown = true;
}

export function endAuthTeardown(): void {
  authTearingDown = false;
}

export function isAuthTearingDown(): boolean {
  return authTearingDown;
}

/** Notifica l’UI che un 403 `PASSWORD_SCADUTA` è arrivato: niente logout. */
export function notifyPasswordExpired(): void {
  if (authTearingDown) return;
  listeners.forEach((listener) => listener());
}

export function subscribePasswordExpired(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
