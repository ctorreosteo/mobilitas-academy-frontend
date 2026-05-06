import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { theme } from '../../theme';
import FitnessScreen from '../FitnessScreen';
import FitnessBookingsScreen from './FitnessBookingsScreen';
import type { FitnessStackParamList } from './types';

const Stack = createStackNavigator<FitnessStackParamList>();

const FitnessStack: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="FitnessCalendar"
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
        name="FitnessCalendar"
        component={FitnessScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="FitnessBookings"
        component={FitnessBookingsScreen}
        options={{ title: 'Prenotazioni attive' }}
      />
    </Stack.Navigator>
  );
};

export default FitnessStack;
