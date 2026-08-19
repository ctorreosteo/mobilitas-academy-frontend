import type { NavigatorScreenParams } from '@react-navigation/native';

export type ProfiloStackParamList = {
  ProfiloHome: undefined;
  CambioPassword: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Courses: undefined;
  StudioVisits: undefined;
  Sessioni: undefined;
  Profile: NavigatorScreenParams<ProfiloStackParamList> | undefined;
};

export type RootStackParamList = {
  Login: undefined;
  PasswordDimenticata: undefined;
  ImpostaPassword: { token?: string };
  Main: NavigatorScreenParams<MainTabParamList> | undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
