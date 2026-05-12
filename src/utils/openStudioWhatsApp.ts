import { Linking } from 'react-native';

/** Numero WhatsApp segreteria (solo cifre, prefisso internazionale senza +). */
const STUDIO_WHATSAPP_E164 = '393518198457';

export async function openStudioWhatsApp(options?: { message?: string }): Promise<boolean> {
  const q = options?.message?.trim();
  const url = q
    ? `https://wa.me/${STUDIO_WHATSAPP_E164}?text=${encodeURIComponent(q)}`
    : `https://wa.me/${STUDIO_WHATSAPP_E164}`;
  try {
    if (await Linking.canOpenURL(url)) {
      await Linking.openURL(url);
      return true;
    }
  } catch {
    // ignoriamo: il pulsante non deve far crashare l’app
  }
  return false;
}
