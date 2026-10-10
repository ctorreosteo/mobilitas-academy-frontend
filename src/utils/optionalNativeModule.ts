import { requireOptionalNativeModule } from 'expo';

/**
 * Carica un pacchetto con codice nativo solo se il modulo è presente nella build installata.
 * Non basta un try/catch attorno al require: in sviluppo Metro segnala come errore fatale
 * qualsiasi eccezione lanciata durante il caricamento del modulo, prima che arrivi al catch.
 */
export function loadIfNativeAvailable<T>(nativeModuleName: string, load: () => T): T | null {
  if (!requireOptionalNativeModule(nativeModuleName)) return null;
  try {
    return load();
  } catch {
    return null;
  }
}
