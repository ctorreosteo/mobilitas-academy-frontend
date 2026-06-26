import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
// @ts-ignore - @expo/vector-icons è parte di Expo SDK
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';

import HomeScreen from './src/screens/HomeScreen';
import CoursesScreen from './src/screens/CoursesScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import CourseVideosScreen from './src/screens/CourseVideosScreen';
import VideoPlayerScreen from './src/screens/VideoPlayerScreen';
import VisiteStack from './src/screens/visite/VisiteStack';
import FitnessStack from './src/screens/fitness/FitnessStack';
import LoginScreen from './src/screens/LoginScreen';
import { theme } from './src/theme';
import { AuthProvider, useAuth } from './src/context/AuthContext';

const tabBarColors = {
  background: '#07294A',
  border: 'rgba(114, 250, 147, 0.24)',
  shadow: '#001022',
  inactive: 'rgba(114, 250, 147, 0.45)',
};

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();
const RootStack = createStackNavigator();
const queryClient = new QueryClient();
const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: theme.colors.background.primary,
    card: theme.colors.background.primary,
  },
};

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('❌ Errore React catturato:', error);
    console.error('Error Info:', errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={errorBoundaryStyles.container}>
          <Text style={errorBoundaryStyles.title}>Ops! Qualcosa è andato storto</Text>
          <Text style={errorBoundaryStyles.message}>
            {this.state.error?.message || 'Errore sconosciuto'}
          </Text>
          <Text style={errorBoundaryStyles.hint}>Controlla la console per i dettagli</Text>
        </View>
      );
    }

    return this.props.children;
  }
}

const errorBoundaryStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background.primary,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.secondary,
    marginBottom: 16,
  },
  message: {
    fontSize: 16,
    color: theme.colors.text.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  hint: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    textAlign: 'center',
  },
});

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
        options={{
          title: 'Corsi',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="CourseVideos"
        component={CourseVideosScreen}
        options={{
          title: 'Video del Corso',
          headerBackTitle: '',
        }}
      />
      <Stack.Screen
        name="VideoPlayer"
        component={VideoPlayerScreen}
        options={{
          title: 'Video',
          headerBackTitle: '',
        }}
      />
    </Stack.Navigator>
  );
};

function MainTabNavigator() {
  const { bottom: bottomInset } = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={{
        sceneStyle: {
          paddingTop: 12,
        },
        tabBarActiveTintColor: theme.colors.secondary,
        tabBarInactiveTintColor: tabBarColors.inactive,
        tabBarStyle: {
          position: 'absolute',
          left: 14,
          right: 14,
          bottom: bottomInset,
          borderRadius: 24,
          backgroundColor: tabBarColors.background,
          borderTopWidth: 1,
          borderTopColor: tabBarColors.border,
          elevation: 14,
          shadowColor: tabBarColors.shadow,
          shadowOffset: {
            width: 0,
            height: 8,
          },
          shadowOpacity: 0.35,
          shadowRadius: 16,
          height: 84,
          paddingBottom: 20,
          paddingTop: 12,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          letterSpacing: 0.2,
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
          headerShown: false,
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={26} color={color} />
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
            <Ionicons name={focused ? 'library' : 'library-outline'} size={26} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="StudioVisits"
        component={VisiteStack}
        options={{
          title: 'Visite',
          tabBarLabel: 'Visite',
          headerShown: false,
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'calendar' : 'calendar-outline'} size={26} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Fitness"
        component={FitnessStack}
        options={{
          title: 'Fitness',
          tabBarLabel: 'Fitness',
          headerShown: false,
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'barbell' : 'barbell-outline'} size={26} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Profilo',
          tabBarLabel: 'Profilo',
          headerShown: false,
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'person-circle' : 'person-circle-outline'} size={26} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const bootStyles = StyleSheet.create({
  boot: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background.primary,
  },
});

function RootNavigator() {
  const { isReady, isSignedIn } = useAuth();

  if (!isReady) {
    return (
      <View style={bootStyles.boot}>
        <ActivityIndicator size="large" color={theme.colors.secondary} />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navigationTheme}>
      <RootStack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: {
            paddingTop: 12,
          },
        }}
      >
        {!isSignedIn ? (
          <RootStack.Screen name="Login" component={LoginScreen} />
        ) : (
          <RootStack.Screen name="Main" component={MainTabNavigator} />
        )}
      </RootStack.Navigator>
      <StatusBar style="light" />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <RootNavigator />
          </AuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
