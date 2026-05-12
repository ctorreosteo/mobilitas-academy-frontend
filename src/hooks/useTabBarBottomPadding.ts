import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';

/** Spazio extra sopra la tab bar flottante così l’ultimo contenuto non resta attaccato. */
const SCROLL_CLEARANCE_ABOVE_TAB = 12;

/**
 * Padding verticale da sommare al fondo di ScrollView / FlatList / SectionList
 * quando la schermata è dentro il Bottom Tab Navigator con tab bar in overlay.
 */
export function useTabBarBottomPadding(): number {
  return useBottomTabBarHeight() + SCROLL_CLEARANCE_ABOVE_TAB;
}
