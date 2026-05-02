import { useState, useEffect } from 'react';
import { Course } from '../types';
import { fetchCloudflareCourses } from '../services/cloudflareService';

interface UseCloudflareCoursesResult {
  courses: Course[];
  loading: boolean;
  error: string | null;
}

export function useCloudflareCourses(): UseCloudflareCoursesResult {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadCourses() {
      try {
        setLoading(true);
        setError(null);
        
        const fetchedCourses = await fetchCloudflareCourses();
        
        if (isMounted) {
          setCourses(fetchedCourses);
        }
      } catch (err: any) {
        console.error('❌ Errore nel caricamento corsi Cloudflare:', err);
        if (isMounted) {
          setCourses([]);
          setError(err.message || 'Errore nel caricamento dei corsi avanzati');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadCourses();

    return () => {
      isMounted = false;
    };
  }, []);

  return { courses, loading, error };
}


