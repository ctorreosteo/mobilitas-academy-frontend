import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo';

type AutofillCommitModule = { commit(): void };

const native =
  Platform.OS === 'android' ? requireOptionalNativeModule<AutofillCommitModule>('AutofillCommit') : null;

/**
 * Android: chiude la sessione di Autofill così il sistema propone di salvare le credenziali
 * appena digitate. iOS lo fa da solo quando i campi escono dallo schermo: qui è un no-op.
 */
export function commitAutofill(): void {
  native?.commit();
}
