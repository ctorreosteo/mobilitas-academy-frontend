import React from 'react';
import { View, Text, StyleSheet, Platform, ScrollView, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../theme';
import CourseCard from '../components/CourseCard';
import { mockCourses } from '../data/mockCourses';
import { Course } from '../types';

const HomeScreen: React.FC = () => {
  const renderCourse = ({ item }: { item: Course }) => (
    <CourseCard
      title={item.title}
      instructor={item.instructor}
      duration={item.duration}
      completionPercentage={item.completionPercentage}
      isCompleted={item.isCompleted}
      coverImage={item.coverImage}
    />
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <Text style={styles.title}>Studio Osteopatico</Text>
        <Text style={styles.subtitle}>
          La tua formazione continua in osteopatia
        </Text>
      </View>
      
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{mockCourses.length}</Text>
          <Text style={styles.statLabel}>Corsi</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>
            {mockCourses.filter(course => course.isCompleted).length}
          </Text>
          <Text style={styles.statLabel}>Completati</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>
            {Math.round(mockCourses.reduce((acc, course) => acc + course.completionPercentage, 0) / mockCourses.length)}%
          </Text>
          <Text style={styles.statLabel}>Progresso</Text>
        </View>
      </View>

      <FlatList
        data={mockCourses}
        renderItem={renderCourse}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.coursesList}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary, // Blu scuro dal tema
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 0,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
    color: theme.colors.text.primary, // Verde dal tema
    marginTop: 32,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
    color: theme.colors.text.secondary, // Bianco dal tema
    opacity: 0.9,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: theme.colors.text.primary, // Verde
    marginHorizontal: 20,
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
    color: theme.colors.primary, // Blu
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
    color: theme.colors.primary, // Blu
    opacity: 0.7,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  coursesList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
});

export default HomeScreen;
