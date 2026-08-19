import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
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
  Modal,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
// @ts-ignore - @expo/vector-icons è parte di Expo SDK
import { Ionicons } from '@expo/vector-icons';
import { theme, withOpacity } from '../../theme';
import {
  changePassword,
  ChangePasswordError,
  MIN_PASSWORD_LENGTH,
  type ChangePasswordField,
} from '../../services/authApi';
import { getUserFacingApiErrorMessage } from '../../utils/apiErrorMessage';
import { useTabBarBottomPadding } from '../../hooks/useTabBarBottomPadding';
import { useAuth } from '../../context/AuthContext';
import type { ProfiloStackParamList } from './types';

type CambioPasswordNav = StackNavigationProp<ProfiloStackParamList, 'CambioPassword'>;

/**
 * Il backend non ha rate limiting su `/auth/change-password`: il freno è solo qui.
 * Dopo qualche tentativo andato male si blocca il bottone per un minuto.
 */
const MAX_FAILED_ATTEMPTS = 5;
const COOLDOWN_SECONDS = 60;

type FieldErrors = Partial<Record<ChangePasswordField, string>>;

const inputBg = theme.colors.background.secondary;

/** Le password non vengono trimmate dal backend: gli spazi ai bordi fanno parte della password. */
function hasEdgeWhitespace(value: string): boolean {
  return value.length > 0 && value !== value.trim();
}

const CambioPasswordScreen: React.FC = () => {
  const navigation = useNavigation<CambioPasswordNav>();
  const tabBarPad = useTabBarBottomPadding();
  const { passwordExpired, clearPasswordExpired } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [visibleFields, setVisibleFields] = useState<Record<ChangePasswordField, boolean>>({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  });

  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const failedAttempts = useRef(0);
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const [cooldownSecondsLeft, setCooldownSecondsLeft] = useState(0);

  useEffect(() => {
    if (cooldownUntil == null) {
      setCooldownSecondsLeft(0);
      return;
    }
    const tick = () => {
      const left = Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000));
      setCooldownSecondsLeft(left);
      if (left === 0) {
        failedAttempts.current = 0;
        setCooldownUntil(null);
      }
    };
    tick();
    const timer = setInterval(tick, 500);
    return () => clearInterval(timer);
  }, [cooldownUntil]);

  useLayoutEffect(() => {
    navigation.setOptions({
      gestureEnabled: !passwordExpired,
      headerLeft: passwordExpired ? () => null : undefined,
    });
  }, [navigation, passwordExpired]);

  const isLongEnough = newPassword.length >= MIN_PASSWORD_LENGTH;
  const isDifferentFromCurrent = newPassword.length > 0 && newPassword !== currentPassword;
  const doesConfirmMatch = confirmPassword.length > 0 && confirmPassword === newPassword;
  const isCoolingDown = cooldownSecondsLeft > 0;

  const canSubmit = useMemo(
    () =>
      !submitting &&
      !isCoolingDown &&
      currentPassword.length > 0 &&
      isLongEnough &&
      isDifferentFromCurrent &&
      doesConfirmMatch,
    [
      submitting,
      isCoolingDown,
      currentPassword,
      isLongEnough,
      isDifferentFromCurrent,
      doesConfirmMatch,
    ]
  );

  const toggleVisibility = useCallback((field: ChangePasswordField) => {
    setVisibleFields((prev) => ({ ...prev, [field]: !prev[field] }));
  }, []);

  const clearErrors = useCallback(() => {
    setFieldErrors({});
    setFormError(null);
  }, []);

  /** Le stesse regole del backend, controllate prima di spendere una chiamata. */
  const validateLocally = useCallback((): FieldErrors => {
    const errors: FieldErrors = {};
    if (!currentPassword) {
      errors.currentPassword = 'Inserisci la password attuale.';
    }
    if (!newPassword) {
      errors.newPassword = 'Inserisci la nuova password.';
    } else if (newPassword.length < MIN_PASSWORD_LENGTH) {
      errors.newPassword = `La nuova password deve avere almeno ${MIN_PASSWORD_LENGTH} caratteri.`;
    } else if (newPassword === currentPassword) {
      errors.newPassword = 'La nuova password deve essere diversa da quella attuale.';
    }
    if (!confirmPassword) {
      errors.confirmPassword = 'Ripeti la nuova password.';
    } else if (confirmPassword !== newPassword) {
      errors.confirmPassword = 'Le due password non coincidono.';
    }
    return errors;
  }, [currentPassword, newPassword, confirmPassword]);

  const onSubmit = useCallback(async () => {
    if (submitting || isCoolingDown) return;
    clearErrors();

    const errors = validateLocally();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setSubmitting(true);
    try {
      const message = await changePassword({ currentPassword, newPassword, confirmPassword });
      failedAttempts.current = 0;
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      clearPasswordExpired();
      setSuccessMessage(message);
    } catch (e) {
      failedAttempts.current += 1;
      if (failedAttempts.current >= MAX_FAILED_ATTEMPTS) {
        setCooldownUntil(Date.now() + COOLDOWN_SECONDS * 1000);
      }
      if (e instanceof ChangePasswordError) {
        if (e.field) {
          setFieldErrors({ [e.field]: e.message });
        } else {
          setFormError(e.message);
        }
      } else {
        setFormError(
          getUserFacingApiErrorMessage(e, { context: 'Password non aggiornata' })
        );
      }
    } finally {
      setSubmitting(false);
    }
  }, [
    submitting,
    isCoolingDown,
    clearErrors,
    validateLocally,
    currentPassword,
    newPassword,
    confirmPassword,
    clearPasswordExpired,
  ]);

  const renderField = (
    field: ChangePasswordField,
    label: string,
    value: string,
    onChangeText: (text: string) => void,
    options: { placeholder: string; textContentType: 'password' | 'newPassword' }
  ) => {
    const fieldError = fieldErrors[field];
    return (
      <View style={styles.fieldBlock}>
        <Text style={styles.label}>{label}</Text>
        <View style={[styles.inputWrap, fieldError ? styles.inputWrapError : null]}>
          <TextInput
            style={styles.input}
            placeholder={options.placeholder}
            placeholderTextColor={withOpacity(theme.colors.primary, 0.45)}
            value={value}
            onChangeText={(text) => {
              if (fieldError || formError) clearErrors();
              onChangeText(text);
            }}
            secureTextEntry={!visibleFields[field]}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="off"
            textContentType={options.textContentType}
            editable={!submitting}
          />
          <TouchableOpacity
            onPress={() => toggleVisibility(field)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={visibleFields[field] ? 'Nascondi password' : 'Mostra password'}
          >
            <Ionicons
              name={visibleFields[field] ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={withOpacity(theme.colors.primary, 0.6)}
            />
          </TouchableOpacity>
        </View>
        {fieldError ? <Text style={styles.fieldErrorText}>{fieldError}</Text> : null}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: tabBarPad + 24 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.introCard}>
            <View style={styles.introIconWrap}>
              <Ionicons name="key-outline" size={20} color={theme.colors.secondary} />
            </View>
            <Text style={styles.introTitle}>
              {passwordExpired ? 'Password scaduta' : 'Scegli una nuova password'}
            </Text>
            <Text style={styles.introText}>
              {passwordExpired
                ? 'Per continuare a usare l’app con questo account devi impostare una nuova password. Il cambio sblocca di nuovo tutte le funzioni.'
                : 'Ti serve la password attuale. Dopo il cambio resti collegato su questo dispositivo, mentre gli altri dispositivi già collegati restano attivi fino alla scadenza della sessione.'}
            </Text>
          </View>

          {renderField(
            'currentPassword',
            'Password attuale',
            currentPassword,
            setCurrentPassword,
            { placeholder: '••••••••', textContentType: 'password' }
          )}

          {renderField('newPassword', 'Nuova password', newPassword, setNewPassword, {
            placeholder: `Almeno ${MIN_PASSWORD_LENGTH} caratteri`,
            textContentType: 'newPassword',
          })}

          {renderField(
            'confirmPassword',
            'Ripeti la nuova password',
            confirmPassword,
            setConfirmPassword,
            {
              placeholder: 'Ripeti la nuova password',
              textContentType: 'newPassword',
            }
          )}

          <View style={styles.requirementsCard}>
            <Requirement
              met={isLongEnough}
              label={`Almeno ${MIN_PASSWORD_LENGTH} caratteri`}
            />
            <Requirement met={isDifferentFromCurrent} label="Diversa da quella attuale" />
            <Requirement met={doesConfirmMatch} label="Le due password coincidono" />
          </View>

          {hasEdgeWhitespace(newPassword) ? (
            <View style={styles.noticeRow}>
              <Ionicons
                name="information-circle-outline"
                size={16}
                color={theme.colors.accent}
              />
              <Text style={styles.noticeText}>
                La password inizia o finisce con uno spazio: verrà salvata così, spazi compresi.
              </Text>
            </View>
          ) : null}

          {formError ? <Text style={styles.formErrorText}>{formError}</Text> : null}

          {isCoolingDown ? (
            <Text style={styles.cooldownText}>
              Troppi tentativi non riusciti. Riprova tra {cooldownSecondsLeft}{' '}
              {cooldownSecondsLeft === 1 ? 'secondo' : 'secondi'}.
            </Text>
          ) : null}

          <TouchableOpacity
            style={[styles.primaryBtn, !canSubmit && styles.primaryBtnDisabled]}
            onPress={onSubmit}
            disabled={!canSubmit}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator color={theme.colors.secondary} />
            ) : (
              <Text style={styles.primaryBtnText}>Aggiorna password</Text>
            )}
          </TouchableOpacity>

          <Text style={styles.legal}>
            Se non ricordi la password attuale, contatta la segreteria dello studio per farla
            reimpostare.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={successMessage != null}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setSuccessMessage(null);
          navigation.goBack();
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconWrap}>
              <Ionicons name="checkmark-circle-outline" size={20} color={theme.colors.secondary} />
            </View>
            <Text style={styles.modalTitle}>Password aggiornata</Text>
            <Text style={styles.modalText}>
              {successMessage} Usa la nuova password al prossimo accesso.
            </Text>
            <Pressable
              style={({ pressed }) => [styles.modalPrimaryBtn, pressed && styles.modalBtnPressed]}
              onPress={() => {
                setSuccessMessage(null);
                navigation.goBack();
              }}
            >
              <Text style={styles.modalPrimaryBtnText}>Torna al profilo</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const Requirement: React.FC<{ met: boolean; label: string }> = ({ met, label }) => (
  <View style={styles.requirementRow}>
    <Ionicons
      name={met ? 'checkmark-circle' : 'ellipse-outline'}
      size={16}
      color={met ? theme.colors.secondary : withOpacity(theme.colors.text.secondary, 0.4)}
    />
    <Text style={[styles.requirementText, met && styles.requirementTextMet]}>{label}</Text>
  </View>
);

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
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  introCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: withOpacity(theme.colors.secondary, 0.25),
    backgroundColor: withOpacity(theme.colors.primary, 0.45),
    padding: 16,
    marginBottom: 24,
    gap: 10,
  },
  introIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: withOpacity(theme.colors.secondary, 0.22),
    backgroundColor: withOpacity(theme.colors.secondary, 0.12),
  },
  introTitle: {
    fontSize: 17,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
    color: theme.colors.titlePrimary,
  },
  introText: {
    fontSize: 13,
    lineHeight: 19,
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
    color: withOpacity(theme.colors.text.secondary, 0.72),
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
    borderWidth: 1,
    borderColor: 'transparent',
    paddingRight: 14,
  },
  inputWrapError: {
    borderColor: theme.colors.error,
  },
  input: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 14 : 12,
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
    color: theme.colors.primary,
  },
  fieldErrorText: {
    marginTop: 6,
    fontSize: 13,
    color: theme.colors.error,
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
  },
  requirementsCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: withOpacity(theme.colors.secondary, 0.18),
    backgroundColor: withOpacity(theme.colors.primary, 0.3),
    padding: 14,
    gap: 8,
    marginBottom: 18,
  },
  requirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  requirementText: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
    color: withOpacity(theme.colors.text.secondary, 0.62),
  },
  requirementTextMet: {
    color: theme.colors.text.primary,
  },
  noticeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 14,
  },
  noticeText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: withOpacity(theme.colors.text.secondary, 0.75),
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
  },
  formErrorText: {
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
    marginTop: 4,
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
  legal: {
    marginTop: 18,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    color: withOpacity(theme.colors.text.secondary, 0.5),
    fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary,
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

export default CambioPasswordScreen;
