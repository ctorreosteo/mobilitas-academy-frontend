import { getStateFromPath, type LinkingOptions } from '@react-navigation/native';
import { Linking } from 'react-native';
import type { RootStackParamList } from './types';

/**
 * Solo i link pubblici di password. `Main` non va nel config: un path vuoto
 * farebbe rincorrere Login e l’app autenticata a ogni logout.
 *
 * Il token arriva già decodificato dal parser della query string: va inoltrato
 * al backend così com’è, senza un secondo encodeURIComponent.
 */
const linkingConfig: LinkingOptions<RootStackParamList>['config'] = {
  screens: {
    Login: 'login',
    PasswordDimenticata: 'password-dimenticata',
    ImpostaPassword: {
      path: 'imposta-password',
      parse: {
        token: (value: string) => value,
      },
    },
  },
};

function isPasswordDeepLink(url: string): boolean {
  return /(?:^|[/?#])(?:imposta-password|password-dimenticata|login)(?:[/?#]|$)/i.test(
    url
  );
}

export const navigationLinking: LinkingOptions<RootStackParamList> = {
  prefixes: ['mobilitas-academy://', 'https://app.studiomobilitas.it'],
  config: linkingConfig,
  getStateFromPath: (path, options) => {
    if (!path || path.includes('expo-development-client')) return undefined;
    return getStateFromPath(path, options);
  },
  async getInitialURL() {
    const url = await Linking.getInitialURL();
    if (url && isPasswordDeepLink(url)) return url;
    return null;
  },
  subscribe(listener) {
    const subscription = Linking.addEventListener('url', ({ url }) => {
      if (isPasswordDeepLink(url)) listener(url);
    });
    return () => subscription.remove();
  },
};
