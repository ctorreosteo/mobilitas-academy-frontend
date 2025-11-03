import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import HomeScreen from './src/screens/HomeScreen';
import CoursesScreen from './src/screens/CoursesScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import CourseVideosScreen from './src/screens/CourseVideosScreen';
import VideoPlayerScreen from './src/screens/VideoPlayerScreen';
import { theme } from './src/theme';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();
const queryClient = new QueryClient();

// Stack Navigator per la sezione Corsi
const CoursesStack = () => {
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
      }}
    >
      <Stack.Screen 
        name="CoursesList" 
        component={CoursesScreen}
        options={{ title: 'Corsi', headerShown: false }}
      />
      <Stack.Screen 
        name="CourseVideos" 
        component={CourseVideosScreen}
        options={{ 
          title: 'Video del Corso',
          headerBackTitleVisible: false,
        }}
      />
      <Stack.Screen 
        name="VideoPlayer" 
        component={VideoPlayerScreen}
        options={{ 
          title: 'Video',
          headerBackTitleVisible: false,
        }}
      />
    </Stack.Navigator>
  );
};

export default function App() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <NavigationContainer>
        <Tab.Navigator
          screenOptions={{
            tabBarActiveTintColor: theme.colors.secondary,
            tabBarInactiveTintColor: theme.colors.secondary,
            tabBarStyle: {
              backgroundColor: theme.colors.background.primary,
              borderTopWidth: 1,
              borderTopColor: 'rgba(114, 250, 147, 0.15)',
              elevation: 8,
              shadowColor: '#000',
              shadowOffset: {
                width: 0,
                height: -2,
              },
              shadowOpacity: 0.1,
              shadowRadius: 8,
              height: 80,
              paddingBottom: 28,
              paddingTop: 12,
            },
            tabBarLabelStyle: {
              fontSize: 12,
              fontWeight: '500',
              color: theme.colors.secondary,
            },
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
          }}
        >
          <Tab.Screen 
            name="Home" 
            component={HomeScreen} 
            options={{ 
              title: 'Home',
              tabBarLabel: 'Home',
              tabBarIcon: ({ color, size, focused }) => (
                <Ionicons 
                  name={focused ? 'home' : 'home-outline'} 
                  size={26} 
                  color={color} 
                />
              ),
            }}
          />
          <Tab.Screen 
            name="Courses" 
            component={CoursesStack} 
            options={{ 
              title: 'Corsi',
              tabBarLabel: 'Corsi',
              headerShown: false,
              tabBarIcon: ({ color, size, focused }) => (
                <Ionicons 
                  name={focused ? 'library' : 'library-outline'} 
                  size={26} 
                  color={color} 
                />
              ),
            }}
          />
          <Tab.Screen 
            name="Profile" 
            component={ProfileScreen} 
            options={{ 
              title: 'Profilo',
              tabBarLabel: 'Profilo',
              tabBarIcon: ({ color, size, focused }) => (
                <Ionicons 
                  name={focused ? 'person-circle' : 'person-circle-outline'} 
                  size={26} 
                  color={color} 
                />
              ),
            }}
          />
        </Tab.Navigator>
        <StatusBar style="auto" />
      </NavigationContainer>
    </QueryClientProvider>
    </SafeAreaProvider>
  );
}
