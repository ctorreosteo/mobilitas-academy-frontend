export const colors = {
  // Colori principali
  primary: '#002552', // Blu scuro - colore principale per sfondi
  secondary: '#72fa93', // Verde - colore principale per scritte
  
  // Colori di supporto
  accent: '#0ea5e9', // Azzurro - per enfatizzare parole chiave
  error: '#FF6869', // Rosso - per enfatizzare parole chiave
  
  // Colori per testo
  text: {
    primary: '#72fa93', // Verde per testo principale
    secondary: '#FFFFFF', // Bianco per testo su sfondo scuro
    accent: '#0ea5e9', // Azzurro per enfatizzare
    error: '#FF6869', // Rosso per enfatizzare
  },
  
  // Colori per sfondi
  background: {
    primary: '#002552', // Blu scuro principale
    secondary: '#F4F4F4', // Panna per sfondi secondari
    white: '#FFFFFF',
  }
};

export const fonts = {
  primary: 'Montserrat',
  // Fallback per iOS se il font non è caricato
  fallback: 'System',
  weights: {
    light: '300',
    regular: '400',
    medium: '500',
    semiBold: '600',
    bold: '700',
  }
};

export const theme = {
  colors,
  fonts,
};
