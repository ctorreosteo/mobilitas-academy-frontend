import axios from 'axios';

// Configurazione base per le chiamate API
const API_BASE_URL = 'http://localhost:8080/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor per aggiungere token di autenticazione
apiClient.interceptors.request.use(
  (config) => {
    // Qui si può aggiungere la logica per il token
    // const token = getAuthToken();
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor per gestire le risposte
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Qui si può gestire la logica di error handling globale
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);
