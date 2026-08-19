import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
// @ts-ignore - @expo/vector-icons è parte di Expo SDK
import { Ionicons } from '@expo/vector-icons';
import { theme, withOpacity } from '../../theme';
import {
  MIN_PASSWORD_LENGTH,
  PasswordLinkError,
  submitImpostaPassword,
  submitResetPassword,
  verifyResetPasswordToken,
} from '../../services/authApi';
import { getUserFacingApiErrorMessage } from '../../utils/apiErrorMessage';
import { useAuth } from '../../context/AuthContext';
import StudioWhatsAppSupportButton from '../../components/StudioWhatsAppSupportButton';
import type { RootStackParamList } from '../../navigation/types';

type Nav = StackNavigationProp<RootStackParamList, 'ImpostaPassword'>;
type ScreenRoute = RouteProp<RootStackParamList, 'ImpostaPassword'>;

type ScreenStatus = 'loading' | 'form' | 'blocked' | 'success';
type TokenFlow = 'reset' | 'invite';

const WHATSAPP_PREFILL =
  'Buongiorno, il link per impostare la password dell’app Mobilitas Academy non funziona. Potete inviarmene uno nuovo?';

const inputBg = theme.colors.background.secondary;

function blockedMessage(motivo: string | null): string {
  switch (motivo) {
    case 'SCADUTO':
      return 'Il link è scaduto: chiedine uno nuovo.';
    case 'GIA_USATO':
      return 'Link già usato: prova ad accedere con la nuova password.';
    default:
      return 'Link non valido: chiedi allo studio un nuovo invito.';
  }
}

const ImpostaPasswordScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<ScreenRoute>();
  const { isSignedIn } = useAuth();
  /** Già decodificato dal deep link: non va ri-encodato. */
  const token = route.params?.token ?? '';

  const [status, setStatus] = useState<ScreenStatus>(token ? 'loading' : 'blocked');
  const [flow, setFlow] = useState<TokenFlow>('invite');
  const [nome, setNome] = useState<string | null>(null);
  const [blockedText, setBlockedText] = useState(
    token ? '' : 'Link non valido: chiedi allo studio un nuovo invito.'
  );

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const result = await verifyResetPasswordToken(token);
        if (cancelled) return;
        if (result.valido) {
          setFlow('reset');
          setNome(result.nome);
          setStatus('form');
          return;
        }
        if (result.motivo === 'SCADUTO' || result.motivo === 'GIA_USATO') {
          setBlockedText(blockedMessage(result.motivo));
          setStatus('blocked');
          return;
        }
        // NON_TROVATO: può essere un token di primo accesso da invito.
        setFlow('invite');
        setStatus('form');
      } catch {
        if (cancelled) return;
        // Rete assente: mostriamo comunque il form e proviamo l’endpoint invito.
        setFlow('invite');
        setStatus('form');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const isLongEnough = newPassword.length >= MIN_PASSWORD_LENGTH;
  const doesConfirmMatch = confirmPassword.length > 0 && confirmPassword === newPassword;
  const canSubmit = useMemo(
    () => !submitting && isLongEnough && doesConfirmMatch,
    [submitting, isLongEnough, doesConfirmMatch]
  );

  const goToLogin = useCallback(() => {
    if (isSignedIn) {
      navigation.navigate('Main');
      return;
    }
    navigation.navigate('Login');
  }, [isSignedIn, navigation]);

  const onSubmit = useCallback(async () => {
    if (!canSubmit) return;
    setError(null);
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setError(`La password deve avere almeno ${MIN_PASSWORD_LENGTH} caratteri.`);
      return;
    }
    if (confirmPassword !== newPassword) {
      setError('Le due password non coincidono.');
      return;
    }
    setSubmitting(true);
    try {
      if (flow === 'reset') {
        await submitResetPassword(token, newPassword);
      } else {
        await submitImpostaPassword(token, newPassword);
      }
      setStatus('success');
    } catch (e) {
      if (e instanceof PasswordLinkError) {
        setError(e.message);
      } else {
        setError(getUserFacingApiErrorMessage(e, { context: 'Password non impostata' }));
      }
    } finally {
      setSubmitting(false);
    }
  }, [canSubmit, confirmPassword, flow, newPassword, token]);

  const renderPasswordField = (
    label: string,
    value: string,
    onChange: (text: string) => void,
    visible: boolean,
    onToggle: () => void
  ) => (
    <View style={styles.fieldBlock}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputWrap}>
        <TextInput
          style={styles.input}
          placeholder={`Almeno ${MIN_PASSWORD_LENGTH} caratteri`}
          placeholderTextColor={withOpacity(theme.colors.primary, 0.45)}
          value={value}
          onChangeText={(text) => {
            if (error) setError(null);
            onChange(text);
          }}
          secureTextEntry={!visible}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="off"
          textContentType="newPassword"
          editable={!submitting}
        />
        <TouchableOpacity onPress={onToggle} hitSlop={10} accessibilityRole="button">
          <Ionicons
            name={visible ? 'eye-off-outline' : 'eye-outline'}
            size={20}
            color={withOpacity(theme.colors.primary, 0.6)}
          />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {status === 'loading' ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={theme.colors.secondary} />
              <Text style={styles.muted}>Verifica del link in corso…</Text>
            </View>
          ) : null}

          {status === 'blocked' ? (
            <View>
              <Text style={styles.title}>Link non utilizzabile</Text>
              <Text style={styles.body}>{blockedText}</Text>
              <StudioWhatsAppSupportButton prefilledMessage={WHATSAPP_PREFILL} />
              <TouchableOpacity style={styles.secondaryBtn} onPress={goToLogin} activeOpacity={0.85}>
                <Text style={styles.secondaryBtnText}>Vai al login</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {status === 'success' ? (
            <View>
              <Text style={styles.title}>Password impostata</Text>
              <Text style={styles.body}>Ora puoi accedere con la nuova password.</Text>
              <TouchableOpacity style={styles.primaryBtn} onPress={goToLogin} activeOpacity={0.85}>
                <Text style={styles.primaryBtnText}>Vai al login</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {status === 'form' ? (
            <>
              <Text style={styles.title}>
                {nome ? `Ciao ${nome}, scegli una password` : 'Scegli una password'}
              </Text>
              <Text style={styles.body}>
                Minimo {MIN_PASSWORD_LENGTH} caratteri. Non viene richiesto nient’altro.
              </Text>

              {renderPasswordField(
                'Nuova password',
                newPassword,
                setNewPassword,
                showNew,
                () => setShowNew((v) => !v)
              )}
              {renderPasswordField(
                'Ripeti la password',
                confirmPassword,
                setConfirmPassword,
                showConfirm,
                () => setShowConfirm((v) => !v)
              )}

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <TouchableOpacity
                style={[styles.primaryBtn, !canSubmit && styles.primaryBtnDisabled]}
                onPress={onSubmit}
                disabled={!canSubmit}
                activeOpacity={0.85}
              >
                {submitting ? (
                  <ActivityIndicator color={theme.colors.secondary} />
                ) : (
                  <Text style={styles.primaryBtnText}>Salva password</Text>
                )}
              </TouchableOpacity>
            </>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
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
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 32,
  },
  centered: {
    paddingTop: 48,
    alignItems: 'center',
    gap: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
    color: theme.colors.secondary,
    marginBottom: 12,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
    color: withOpacity(theme.colors.text.secondary, 0.86),
    marginBottom: 18,
  },
  muted: {
    fontSize: 14,
    color: withOpacity(theme.colors.text.secondary, 0.7),
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
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
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: inputBg,
    borderRadius: 12,
    paddingRight: 14,
  },
  input: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 14 : 12,
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
    color: theme.colors.primary,
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
    opacity: 0.5,
  },
  primaryBtnText: {
    fontSize: 17,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
    color: theme.colors.secondary,
  },
  secondaryBtn: {
    marginTop: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: withOpacity(theme.colors.secondary, 0.32),
    backgroundColor: withOpacity(theme.colors.secondary, 0.1),
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.secondary,
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
  },
});

export default ImpostaPasswordScreen;
