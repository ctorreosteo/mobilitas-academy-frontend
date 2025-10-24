import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api';

// Hook personalizzato per le chiamate API
export const useApi = () => {
  const queryClient = useQueryClient();

  // Esempio di hook per fetch dei corsi
  const useCourses = () => {
    return useQuery({
      queryKey: ['courses'],
      queryFn: async () => {
        const response = await apiClient.get('/courses');
        return response.data;
      },
    });
  };

  // Esempio di hook per creare un nuovo corso
  const useCreateCourse = () => {
    return useMutation({
      mutationFn: async (courseData: any) => {
        const response = await apiClient.post('/courses', courseData);
        return response.data;
      },
      onSuccess: () => {
        // Invalida la cache dei corsi per aggiornare la lista
        queryClient.invalidateQueries({ queryKey: ['courses'] });
      },
    });
  };

  return {
    useCourses,
    useCreateCourse,
  };
};
