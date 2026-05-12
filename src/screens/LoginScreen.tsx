import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Alert,
  ActivityIndicator,
  Modal,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
// @ts-ignore - @expo/vector-icons è parte di Expo SDK
import { Ionicons } from '@expo/vector-icons';
import { theme, withOpacity } from '../theme';
import { useAuth } from '../context/AuthContext';
import {
  getRememberedLoginUsername,
  getRememberUsernamePreference,
} from '../services/authTokenStorage';

const inputBg = theme.colors.background.secondary;

const LoginScreen: React.FC = () => {
  const { signIn } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberUsername, setRememberUsername] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRegisterModal, setShowRegisterModal] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const [pref, saved] = await Promise.all([
        getRememberUsernamePreference(),
        getRememberedLoginUsername(),
      ]);
      if (!active) return;
      setRememberUsername(pref);
      if (pref && saved) {
        setUsername(saved);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const onSubmit = async () => {
    setError(null);
    if (!username.trim() || !password) {
      setError('Inserisci username o email e password.');
      return;
    }
    setSubmitting(true);
    try {
      await signIn(username.trim(), password, { rememberUsername });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Accesso non riuscito');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.formBlock}>
            <Text style={styles.title}>Benvenuto in Mobilitas</Text>
            <Text style={styles.subtitle}>Accedi al tuo account Mobilitas HQ</Text>
            <View style={styles.headerBadge}>
              <Ionicons name="lock-closed-outline" size={14} color={theme.colors.text.primary} />
              <Text style={styles.headerBadgeText}>Area accesso</Text>
            </View>
            <View style={styles.dividerWrap}>
              <View style={styles.dividerLine} />
              <View style={styles.dividerIconWrap}>
                <Ionicons name="log-in-outline" size={15} color={theme.colors.secondary} />
              </View>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.fieldBlock}>
              <Text style={styles.label}>Username</Text>
              <TextInput
                style={styles.input}
                placeholder="Email o username"
                placeholderTextColor={withOpacity(theme.colors.primary, 0.45)}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="username"
                editable={!submitting}
              />
            </View>

            <View style={styles.fieldBlock}>
              <View style={styles.passwordRow}>
                <Text style={styles.passwordLabel}>Password</Text>
                <TouchableOpacity
                  onPress={() =>
                    Alert.alert(
                      'Password dimenticata?',
                      'Contatta l’amministratore di Mobilitas HQ per reimpostare l’accesso.'
                    )
                  }
                  hitSlop={12}
                >
                  <Text style={styles.linkMuted}>Password dimenticata?</Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor={withOpacity(theme.colors.primary, 0.45)}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                textContentType="password"
                editable={!submitting}
              />
            </View>

            <TouchableOpacity
              style={styles.rememberRow}
              onPress={() => setRememberUsername((v) => !v)}
              activeOpacity={0.75}
              disabled={submitting}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: rememberUsername }}
            >
              <Ionicons
                name={rememberUsername ? 'checkbox' : 'square-outline'}
                size={24}
                color={theme.colors.secondary}
              />
              <Text style={styles.rememberLabel}>
                Salva email o username per i prossimi accessi. La password non viene mai memorizzata sul
                dispositivo.
              </Text>
            </TouchableOpacity>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <TouchableOpacity
              style={[styles.primaryBtn, submitting && styles.primaryBtnDisabled]}
              onPress={onSubmit}
              disabled={submitting}
              activeOpacity={0.85}
            >
              {submitting ? (
                <ActivityIndicator color={theme.colors.secondary} />
              ) : (
                <Text style={styles.primaryBtnText}>Accedi</Text>
              )}
            </TouchableOpacity>

            <View style={styles.footerRegister}>
              <Text style={styles.footerMuted}>Non hai un account? </Text>
              <TouchableOpacity
                onPress={() => setShowRegisterModal(true)}
              >
                <Text style={styles.footerLink}>Registrati</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.legal}>
              Cliccando su Accedi, accetti i nostri{' '}
              <Text
                style={styles.legalAccent}
                onPress={() => Alert.alert('Termini', 'Documento legale in aggiornamento.')}
              >
                Termini d’uso
              </Text>
              .
            </Text>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={showRegisterModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRegisterModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconWrap}>
              <Ionicons name="person-add-outline" size={20} color={theme.colors.secondary} />
            </View>
            <Text style={styles.modalTitle}>Registrazione</Text>
            <Text style={styles.modalText}>
              La registrazione deve essere effettuata presso la segreteria dello studio o chiamando.
            </Text>
            <Pressable
              style={({ pressed }) => [styles.modalPrimaryBtn, pressed && styles.modalBtnPressed]}
              onPress={() => setShowRegisterModal(false)}
            >
              <Text style={styles.modalPrimaryBtnText}>Ho capito</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  flex: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: 24,
    paddingBottom: 32,
  },
  /** Form centrato nello spazio sopra il pittogramma (pittogramma in basso). */
  formBlock: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
    color: theme.colors.secondary,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
    color: withOpacity(theme.colors.text.secondary, 0.72),
    textAlign: 'center',
    marginBottom: 16,
  },
  headerBadge: {
    alignSelf: 'center',
    marginBottom: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: withOpacity(theme.colors.secondary, 0.35),
    backgroundColor: withOpacity(theme.colors.secondary, 0.12),
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  headerBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text.primary,
    letterSpacing: 0.2,
  },
  dividerWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: withOpacity(theme.colors.secondary, 0.24),
  },
  dividerIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: withOpacity(theme.colors.secondary, 0.32),
    backgroundColor: withOpacity(theme.colors.secondary, 0.08),
  },
  fieldBlock: {
    marginBottom: 18,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
    color: theme.colors.text.secondary,
    marginBottom: 8,
  },
  passwordLabel: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
    color: theme.colors.text.secondary,
  },
  passwordRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  linkMuted: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
    color: theme.colors.text.secondary,
    opacity: 0.9,
    textDecorationLine: 'underline',
  },
  input: {
    backgroundColor: inputBg,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 14 : 12,
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
    color: theme.colors.primary,
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
    paddingVertical: 4,
  },
  rememberLabel: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: withOpacity(theme.colors.text.secondary, 0.78),
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: 14,
    marginBottom: 12,
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
  },
  primaryBtn: {
    marginTop: 8,
    backgroundColor: theme.colors.background.primary,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: theme.colors.accent,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnDisabled: {
    opacity: 0.7,
  },
  primaryBtnText: {
    fontSize: 17,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
    color: theme.colors.secondary,
  },
  footerRegister: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: 28,
    marginBottom: 20,
  },
  footerMuted: {
    fontSize: 15,
    color: withOpacity(theme.colors.text.secondary, 0.85),
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
  },
  footerLink: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.secondary,
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
  },
  legal: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    color: withOpacity(theme.colors.text.secondary, 0.5),
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
  },
  legalAccent: {
    color: theme.colors.accent,
    fontWeight: '600',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: withOpacity(theme.colors.black, 0.45),
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    width: '100%',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: withOpacity(theme.colors.secondary, 0.28),
    backgroundColor: theme.colors.background.primary,
    padding: 18,
    gap: 12,
  },
  modalIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: withOpacity(theme.colors.secondary, 0.35),
    backgroundColor: withOpacity(theme.colors.secondary, 0.12),
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.secondary,
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
  },
  modalText: {
    fontSize: 14,
    lineHeight: 21,
    color: withOpacity(theme.colors.text.secondary, 0.92),
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
  },
  modalPrimaryBtn: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: withOpacity(theme.colors.secondary, 0.45),
    backgroundColor: theme.colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 42,
    paddingHorizontal: 12,
  },
  modalPrimaryBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.background.primary,
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
  },
  modalBtnPressed: {
    opacity: 0.9,
  },
});

export default LoginScreen;
