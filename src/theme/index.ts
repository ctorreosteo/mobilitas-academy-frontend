export const colorConfigurations = {
  // Attiva di default
  scuro: {
    primary: '#002552',
    secondary: '#72fa93',
  },
  prova: {
    primary: '#000035',
    secondary: '#72fa93',
  },
  medio: {
    primary: '#3B4A64',
    secondary: '#72fa93',
  },
  chiaro: {
    primary: '#3B4A64',
    secondary: '#B7C3B2',
  },
} as const;

export type ColorConfigurationName = keyof typeof colorConfigurations;

// Cambia questo valore per selezionare la configurazione globale.
export const activeColorConfiguration: ColorConfigurationName = 'scuro';

const activePalette = colorConfigurations[activeColorConfiguration];

export const colors = {
  // Colori principali
  primary: activePalette.primary, // Blu scuro - colore principale per sfondi
  secondary: activePalette.secondary, // Verde - colore principale per scritte
  titlePrimary: '#D7FFE2', // Verde piu acceso per titoli principali

  // Colori di supporto
  accent: '#0ea5e9', // Azzurro - per enfatizzare parole chiave
  error: '#FF6869', // Rosso - per enfatizzare parole chiave
  black: '#000000',

  // Colori per testo
  text: {
    primary: activePalette.secondary, // Verde per testo principale
    secondary: '#FFFFFF', // Bianco per testo su sfondo scuro
    accent: '#0ea5e9', // Azzurro per enfatizzare
    error: '#FF6869', // Rosso per enfatizzare
  },

  // Colori per sfondi
  background: {
    primary: '#001831', // Blu profondo condiviso per sfondi pagina
    secondary: '#F4F4F4', // Panna per sfondi secondari
    white: '#FFFFFF',
  },
  gradients: {
    splash: ['#0A3D62', '#1E88E5', '#42A5F5'],
  }
};

export const withOpacity = (hexColor: string, opacity: number): string => {
  const hex = hexColor.replace('#', '');
  const normalized = hex.length === 3
    ? hex.split('').map((char) => char + char).join('')
    : hex;

  const red = parseInt(normalized.slice(0, 2), 16);
  const green = parseInt(normalized.slice(2, 4), 16);
  const blue = parseInt(normalized.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${opacity})`;
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
