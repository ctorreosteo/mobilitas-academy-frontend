import { createNavigationContainerRef } from '@react-navigation/native';
import type { RootStackParamList } from './types';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

/** Porta alla schermata di cambio password senza fare logout (account misti, password scaduta). */
export function navigateToForcedPasswordChange(): void {
  if (!navigationRef.isReady()) return;
  const current = navigationRef.getCurrentRoute()?.name;
  if (current === 'CambioPassword') return;
  navigationRef.navigate('Main', {
    screen: 'Profile',
    params: { screen: 'CambioPassword' },
  });
}
