import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { theme } from '../../theme';
import SessioniHomeScreen from './SessioniHomeScreen';
import SessioniPrenotazioniScreen from './SessioniPrenotazioniScreen';
import SessioniCalendarioScreen from './SessioniCalendarioScreen';
import type { SessioniStackParamList } from './types';

const Stack = createStackNavigator<SessioniStackParamList>();

const SessioniStack: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="SessioniHome"
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
      <Stack.Screen
        name="SessioniHome"
        component={SessioniHomeScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="SessioniPrenotazioni"
        component={SessioniPrenotazioniScreen}
        options={{ title: 'Prenotazioni attive' }}
      />
      <Stack.Screen
        name="SessioniCalendario"
        component={SessioniCalendarioScreen}
        options={{ title: 'Calendario sessioni' }}
      />
    </Stack.Navigator>
  );
};

export default SessioniStack;
