type Listener = () => void;

const listeners = new Set<Listener>();

/** Notifica l’UI che un 403 `PASSWORD_SCADUTA` è arrivato: niente logout. */
export function notifyPasswordExpired(): void {
  listeners.forEach((listener) => listener());
}

export function subscribePasswordExpired(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
