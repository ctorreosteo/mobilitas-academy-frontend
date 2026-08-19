import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { theme } from '../../theme';
import ProfileScreen from '../ProfileScreen';
import CambioPasswordScreen from './CambioPasswordScreen';
import type { ProfiloStackParamList } from './types';

const Stack = createStackNavigator<ProfiloStackParamList>();

const ProfiloStack: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="ProfiloHome"
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
        name="ProfiloHome"
        component={ProfileScreen}
        options={{ title: 'Profilo', headerShown: false }}
      />
      <Stack.Screen
        name="CambioPassword"
        component={CambioPasswordScreen}
        options={{ title: 'Cambia password' }}
      />
    </Stack.Navigator>
  );
};

export default ProfiloStack;
