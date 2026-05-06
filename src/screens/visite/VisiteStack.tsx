import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { theme } from '../../theme';
import VisiteMenuScreen from './VisiteMenuScreen';
import BookVisitScreen from './BookVisitScreen';
import GestioneVisiteScreen from './GestioneVisiteScreen';
import type { VisiteStackParamList } from './types';

const Stack = createStackNavigator<VisiteStackParamList>();

const VisiteStack: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="VisiteMenu"
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
        name="VisiteMenu"
        component={VisiteMenuScreen}
        options={{ title: 'Visite', headerShown: false }}
      />
      <Stack.Screen
        name="BookVisit"
        component={BookVisitScreen}
        options={{ title: 'Prenota una nuova visita' }}
      />
      <Stack.Screen
        name="GestioneVisite"
        component={GestioneVisiteScreen}
        options={{ title: 'Gestisci le tue visite' }}
      />
    </Stack.Navigator>
  );
};

export default VisiteStack;
