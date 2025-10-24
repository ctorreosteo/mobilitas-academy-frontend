import { Platform } from 'react-native';
import { theme } from '../theme';

// Utility functions per utilizzare il tema facilmente
export const getTheme = () => theme;

// Helper per ottenere i colori
export const getColors = () => theme.colors;

// Helper per ottenere i font
export const getFonts = () => theme.fonts;

// Helper per ottenere il font corretto per la piattaforma
export const getFontFamily = (weight: keyof typeof theme.fonts.weights = 'regular') => {
  if (Platform.OS === 'ios') {
    // Su iOS, usa il font di sistema se Montserrat non è disponibile
    return Platform.select({
      ios: 'System',
      android: theme.fonts.primary,
    });
  }
  return theme.fonts.primary;
};

// Helper per creare stili comuni
export const createTextStyle = (size: number, weight: keyof typeof theme.fonts.weights = 'regular', color?: string) => ({
  fontSize: size,
  fontFamily: getFontFamily(weight),
  fontWeight: Platform.OS === 'ios' ? theme.fonts.weights[weight] : 'normal',
  color: color || theme.colors.text.primary,
});

// Helper per creare stili di container
export const createContainerStyle = (backgroundColor?: string, padding?: number) => ({
  backgroundColor: backgroundColor || theme.colors.background.primary,
  padding: padding || 16,
});

// Esporta il tema direttamente per uso immediato
export { theme };
