import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { theme } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import { hasGestionaleRole } from '../../services/authApi';
import CorsiAziendaliScreen from './CorsiAziendaliScreen';
import CorsiPosturaliScreen from './CorsiPosturaliScreen';
import CourseVideosScreen from '../CourseVideosScreen';
import VideoPlayerScreen from '../VideoPlayerScreen';
import type { CorsiStackParamList } from './types';

const Stack = createStackNavigator<CorsiStackParamList>();

/**
 * Un solo catalogo per utente: chi ha un ruolo gestionale vede i corsi aziendali
 * (`/api/formazione`), pazienti e utenti app i corsi posturali
 * (`/api/corsi-posturali`). La lista non usata non viene montata, così non parte
 * nessuna chiamata al catalogo sbagliato.
 */
const CorsiStack: React.FC = () => {
  const { userProfile } = useAuth();
  const isGestionale = hasGestionaleRole(userProfile?.ruoli);

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.background.primary,
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTintColor: theme.colors.secondary,
        headerTitleStyle: {
          fontWeight: '600',
          color: theme.colors.secondary,
        },
        headerBackTitle: '',
      }}
    >
      {isGestionale ? (
        <Stack.Screen
          name="CorsiAziendaliList"
          component={CorsiAziendaliScreen}
          options={{ title: 'Corsi aziendali', headerShown: false }}
        />
      ) : (
        <Stack.Screen
          name="CorsiPosturaliList"
          component={CorsiPosturaliScreen}
          options={{ title: 'Corsi posturali', headerShown: false }}
        />
      )}
      <Stack.Screen
        name="CourseVideos"
        component={CourseVideosScreen}
        options={{ title: 'Video del Corso' }}
      />
      <Stack.Screen
        name="VideoPlayer"
        component={VideoPlayerScreen}
        options={{ title: 'Video' }}
      />
    </Stack.Navigator>
  );
};

export default CorsiStack;
