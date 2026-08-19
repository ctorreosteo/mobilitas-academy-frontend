import type { LinkingOptions } from '@react-navigation/native';
import type { RootStackParamList } from './types';

/**
 * Deep link unico per primo accesso da invito e reset password:
 * `https://app.studiomobilitas.it/imposta-password?token=...`
 * (e lo scheme nativo `mobilitas-academy://imposta-password?token=...`).
 *
 * Il token arriva già decodificato dal parser della query string: va inoltrato
 * al backend così com’è, senza un secondo encodeURIComponent.
 */
export const navigationLinking: LinkingOptions<RootStackParamList> = {
  prefixes: ['mobilitas-academy://', 'https://app.studiomobilitas.it'],
  config: {
    screens: {
      Login: 'login',
      PasswordDimenticata: 'password-dimenticata',
      ImpostaPassword: {
        path: 'imposta-password',
        parse: {
          token: (value: string) => value,
        },
      },
      Main: {
        path: '',
        screens: {
          Home: 'home',
          Courses: 'corsi',
          StudioVisits: 'visite',
          Sessioni: 'sessioni',
          Profile: {
            path: 'profilo',
            screens: {
              ProfiloHome: '',
              CambioPassword: 'cambia-password',
            },
          },
        },
      },
    },
  },
};
