import React from 'react';
// import { useState } from 'react'; // Temporaneamente disabilitato per splash screen
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
// @ts-ignore - @expo/vector-icons è parte di Expo SDK
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, Image } from 'react-native';

import HomeScreen from './src/screens/HomeScreen';
import CoursesScreen from './src/screens/CoursesScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import CourseVideosScreen from './src/screens/CourseVideosScreen';
import VideoPlayerScreen from './src/screens/VideoPlayerScreen';
import AdvancedCoursesScreen from './src/screens/AdvancedCoursesScreen';
import AdvancedCourseVideosScreen from './src/screens/AdvancedCourseVideosScreen';
// import SplashScreen from './src/components/SplashScreen'; // Temporaneamente disabilitato
import { theme } from './src/theme';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();
const queryClient = new QueryClient();

// Error Boundary Component
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
          <Text style={errorBoundaryStyles.hint}>
            Controlla la console per i dettagli
          </Text>
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

const styles = StyleSheet.create({
  headerLogo: {
    width: 120,
    height: 40,
  },
});

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

// Stack Navigator per la sezione Corsi Avanzati
const AdvancedCoursesStack = () => {
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
        name="AdvancedCoursesList" 
        component={AdvancedCoursesScreen}
        options={{ 
          title: 'Corsi Avanzati',
          headerShown: false,
        }}
      />
      <Stack.Screen 
        name="AdvancedCourseVideos" 
        component={AdvancedCourseVideosScreen}
        options={{ 
          title: 'Moduli del Corso',
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

export default function App() {
  // Animazione splash screen temporaneamente disabilitata
  // const [showSplash, setShowSplash] = useState(true);

  // const handleSplashFinish = () => {
  //   setShowSplash(false);
  // };

  // if (showSplash) {
  //   return (
  //     <ErrorBoundary>
  //       <SafeAreaProvider>
  //         <SplashScreen onFinish={handleSplashFinish} />
  //       </SafeAreaProvider>
  //     </ErrorBoundary>
  //   );
  // }

  return (
    <ErrorBoundary>
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
              headerTitle: () => (
                <Image
                  source={require('./assets/logo_verde.png')}
                  style={styles.headerLogo}
                  resizeMode="contain"
                />
              ),
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
            name="AdvancedCourses" 
            component={AdvancedCoursesStack} 
            options={{ 
              title: 'Corsi Avanzati',
              tabBarLabel: 'Avanzati',
              headerShown: false,
              tabBarIcon: ({ color, size, focused }) => (
                <Ionicons 
                  name={focused ? 'school' : 'school-outline'} 
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
    </ErrorBoundary>
  );
}
