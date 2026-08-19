import React, { useCallback, useState } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { theme, withOpacity } from '../../theme';
import {
  requestPasswordReset,
  RESET_REQUEST_USER_MESSAGE,
} from '../../services/authApi';
import { getUserFacingApiErrorMessage } from '../../utils/apiErrorMessage';
import { useCooldown } from '../../hooks/useCooldown';
import StudioWhatsAppSupportButton from '../../components/StudioWhatsAppSupportButton';
import type { RootStackParamList } from '../../navigation/types';

type Nav = StackNavigationProp<RootStackParamList, 'PasswordDimenticata'>;

const RESET_COOLDOWN_SECONDS = 60;
const WHATSAPP_PREFILL =
  'Buongiorno, non ricevo l’email per reimpostare la password dell’app Mobilitas Academy. Potete aiutarmi?';

const inputBg = theme.colors.background.secondary;

const PasswordDimenticataScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const [emailOUsername, setEmailOUsername] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const { isCoolingDown, secondsLeft, start: startCooldown } = useCooldown(RESET_COOLDOWN_SECONDS);

  const onSubmit = useCallback(async () => {
    if (submitting || isCoolingDown) return;
    setError(null);
    const value = emailOUsername.trim();
    if (!value) {
      setError('Inserisci email o username.');
      return;
    }
    setSubmitting(true);
    try {
      await requestPasswordReset(value);
      setSent(true);
      startCooldown();
    } catch (e) {
      setError(getUserFacingApiErrorMessage(e, { context: 'Invio non riuscito' }));
    } finally {
      setSubmitting(false);
    }
  }, [submitting, isCoolingDown, emailOUsername, startCooldown]);

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
          {sent ? (
            <View style={styles.resultCard}>
              <Text style={styles.title}>Controlla la tua email</Text>
              <Text style={styles.body}>{RESET_REQUEST_USER_MESSAGE}</Text>
              <Text style={styles.bodyMuted}>
                Vale solo l’ultima richiesta. Se non arriva nulla, contatta la segreteria: è
                l’unica via d’uscita, l’app non può dirti se l’indirizzo è registrato.
              </Text>
              <StudioWhatsAppSupportButton prefilledMessage={WHATSAPP_PREFILL} />
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => navigation.navigate('Login')}
                activeOpacity={0.85}
              >
                <Text style={styles.secondaryBtnText}>Torna al login</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Text style={styles.title}>Password dimenticata</Text>
              <Text style={styles.body}>
                Inserisci l’email o lo username dell’account. Se esiste, ti arriverà un link per
                scegliere una nuova password.
              </Text>

              <View style={styles.fieldBlock}>
                <Text style={styles.label}>Email o username</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Email o username"
                  placeholderTextColor={withOpacity(theme.colors.primary, 0.45)}
                  value={emailOUsername}
                  onChangeText={(text) => {
                    if (error) setError(null);
                    setEmailOUsername(text);
                  }}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  textContentType="username"
                  editable={!submitting}
                />
              </View>

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              {isCoolingDown ? (
                <Text style={styles.cooldownText}>
                  Puoi inviare una nuova richiesta tra {secondsLeft}{' '}
                  {secondsLeft === 1 ? 'secondo' : 'secondi'}.
                </Text>
              ) : null}

              <TouchableOpacity
                style={[
                  styles.primaryBtn,
                  (submitting || isCoolingDown) && styles.primaryBtnDisabled,
                ]}
                onPress={onSubmit}
                disabled={submitting || isCoolingDown}
                activeOpacity={0.85}
              >
                {submitting ? (
                  <ActivityIndicator color={theme.colors.secondary} />
                ) : (
                  <Text style={styles.primaryBtnText}>Invia il link</Text>
                )}
              </TouchableOpacity>
            </>
          )}
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
  bodyMuted: {
    fontSize: 13,
    lineHeight: 19,
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
    color: withOpacity(theme.colors.text.secondary, 0.62),
    marginBottom: 18,
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
  input: {
    backgroundColor: inputBg,
    borderRadius: 12,
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
  cooldownText: {
    color: theme.colors.error,
    fontSize: 13,
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
  resultCard: {
    gap: 4,
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

export default PasswordDimenticataScreen;
