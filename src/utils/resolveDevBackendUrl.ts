import { Platform } from 'react-native';

/**
 * In dev su dispositivo reale, `localhost` punta al telefono: sostituisce con IP LAN
 * (`EXPO_PUBLIC_API_LOCAL_IP` o `EXPO_PUBLIC_FIREBASE_LOCAL_IP`).
 * Emulatore Android: `10.0.2.2` = host del Mac/PC.
 */
export function resolveDevBackendOrigin(origin: string): string {
  const trimmed = origin.replace(/\/$/, '');
  const isLocal =
    trimmed.includes('localhost') || trimmed.includes('127.0.0.1');

  if (!isLocal) {
    return trimmed;
  }

  if (Platform.OS === 'android') {
    return trimmed
      .replace(/localhost/g, '10.0.2.2')
      .replace(/127\.0\.0\.1/g, '10.0.2.2');
  }

  const isWeb = typeof window !== 'undefined' || Platform.OS === 'web';
  if (isWeb) {
    return trimmed;
  }

  const localIP =
    process.env.EXPO_PUBLIC_API_LOCAL_IP ?? process.env.EXPO_PUBLIC_FIREBASE_LOCAL_IP;
  if (localIP) {
    return trimmed.replace(/localhost|127\.0\.0\.1/g, localIP);
  }

  if (__DEV__) {
    console.warn(
      '[API] EXPO_PUBLIC_API_LOCAL_IP non configurato: su dispositivo reale il backend locale potrebbe non essere raggiungibile.'
    );
  }

  return trimmed;
}
