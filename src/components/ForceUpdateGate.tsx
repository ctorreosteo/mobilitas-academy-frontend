import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  AppState,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
// @ts-ignore - @expo/vector-icons è parte di Expo SDK
import { Ionicons } from '@expo/vector-icons';
import { theme, withOpacity } from '../theme';
import {
  checkRequiredUpdate,
  openStoreForUpdate,
  type UpdateCheckResult,
} from '../services/appUpdateService';

/**
 * Blocca l’app finché non è installata l’ultima versione dello store.
 * Controlla all’avvio e a ogni ritorno in primo piano (es. dopo l’aggiornamento dallo store).
 * Durante il controllo l’app resta utilizzabile: si blocca solo a esito certo.
 */
const ForceUpdateGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [update, setUpdate] = useState<UpdateCheckResult | null>(null);
  const [opening, setOpening] = useState(false);
  const checking = useRef(false);

  const runCheck = useCallback(async () => {
    if (checking.current) return;
    checking.current = true;
    try {
      setUpdate(await checkRequiredUpdate());
    } finally {
      checking.current = false;
    }
  }, []);

  useEffect(() => {
    runCheck();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') runCheck();
    });
    return () => sub.remove();
  }, [runCheck]);

  const onUpdate = useCallback(async () => {
    setOpening(true);
    try {
      await openStoreForUpdate();
    } finally {
      setOpening(false);
    }
  }, []);

  if (!update?.required) return <>{children}</>;

  const storeName = Platform.OS === 'ios' ? 'App Store' : 'Google Play';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.content}>
        <Image source={require('../../assets/logo_verde.png')} style={styles.logo} resizeMode="contain" />

        <View style={styles.iconRing}>
          <Ionicons name="cloud-download-outline" size={40} color={theme.colors.secondary} />
        </View>

        <Text style={styles.title}>È disponibile una nuova versione</Text>
        <Text style={styles.body}>
          Per continuare a usare Mobilitas aggiorna l’app all’ultima versione. Bastano pochi
          secondi: troverai le ultime novità e i miglioramenti più recenti.
        </Text>

        {update.installedVersion ? (
          <View style={styles.versionBox}>
            <Text style={styles.versionText}>
              Versione installata: <Text style={styles.versionStrong}>{update.installedVersion}</Text>
            </Text>
            {update.storeVersion ? (
              <Text style={styles.versionText}>
                Nuova versione: <Text style={styles.versionStrong}>{update.storeVersion}</Text>
              </Text>
            ) : null}
          </View>
        ) : null}
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={onUpdate}
          disabled={opening}
          activeOpacity={0.85}
          accessibilityRole="button"
        >
          {opening ? (
            <ActivityIndicator color={theme.colors.primary} />
          ) : (
            <>
              <Ionicons
                name={Platform.OS === 'ios' ? 'logo-apple-appstore' : 'logo-google-playstore'}
                size={20}
                color={theme.colors.primary}
              />
              <Text style={styles.primaryBtnText}>Aggiorna su {storeName}</Text>
            </>
          )}
        </TouchableOpacity>
        <Text style={styles.hint}>Dopo l’aggiornamento riapri l’app per continuare.</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
    paddingHorizontal: 28,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 220,
    height: 30,
    marginBottom: 40,
  },
  iconRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: withOpacity(theme.colors.secondary, 0.4),
    backgroundColor: withOpacity(theme.colors.secondary, 0.1),
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    color: theme.colors.titlePrimary,
    marginBottom: 12,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    color: withOpacity(theme.colors.text.secondary, 0.88),
  },
  versionBox: {
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: withOpacity(theme.colors.secondary, 0.25),
    backgroundColor: withOpacity(theme.colors.primary, 0.45),
    gap: 4,
  },
  versionText: {
    fontSize: 13,
    textAlign: 'center',
    color: withOpacity(theme.colors.text.secondary, 0.8),
  },
  versionStrong: {
    fontWeight: '700',
    color: theme.colors.secondary,
  },
  footer: {
    paddingBottom: 24,
    gap: 12,
  },
  primaryBtn: {
    flexDirection: 'row',
    gap: 10,
    minHeight: 54,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.secondary,
  },
  primaryBtnText: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  hint: {
    fontSize: 13,
    textAlign: 'center',
    color: withOpacity(theme.colors.text.secondary, 0.6),
  },
});

export default ForceUpdateGate;
