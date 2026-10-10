import React from 'react';
import { View, Text, StyleSheet, Pressable, Modal, ActivityIndicator } from 'react-native';
// @ts-ignore - @expo/vector-icons è parte di Expo SDK
import { Ionicons } from '@expo/vector-icons';
import { theme, withOpacity } from '../theme';

type Props = {
  visible: boolean;
  icon: string;
  /** Colore dell’icona e del suo alone (default: verde dell’app). */
  iconColor?: string;
  title: string;
  message: string;
  primaryLabel: string;
  onPrimary: () => void;
  /** `danger`: pulsante principale rosso, per azioni irreversibili (es. disdetta). */
  primaryTone?: 'default' | 'danger';
  /** `danger`: tutta la scheda in rosso (bordo, titolo, link), per avvisi bloccanti. */
  tone?: 'default' | 'danger';
  /** Mostra lo spinner sul pulsante principale e blocca la chiusura. */
  loading?: boolean;
  secondaryLabel?: string;
  onSecondary?: () => void;
  onClose: () => void;
};

/** Pop-up centrato nello stile dell’app, al posto dell’Alert di sistema. */
export function AppDialog({
  visible,
  icon,
  iconColor = theme.colors.secondary,
  title,
  message,
  primaryLabel,
  onPrimary,
  primaryTone = 'default',
  tone = 'default',
  loading = false,
  secondaryLabel,
  onSecondary,
  onClose,
}: Props) {
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={loading ? undefined : onClose}>
        <Pressable
          style={[styles.card, tone === 'danger' && styles.cardDanger]}
          onPress={(e) => e.stopPropagation()}
        >
          <View
            style={[
              styles.iconRing,
              { borderColor: withOpacity(iconColor, 0.4), backgroundColor: withOpacity(iconColor, 0.12) },
            ]}
          >
            <Ionicons name={icon} size={34} color={iconColor} />
          </View>
          <Text style={[styles.title, tone === 'danger' && styles.textDanger]}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          <Pressable
            style={({ pressed }) => [
              styles.primaryBtn,
              primaryTone === 'danger' && styles.primaryBtnDanger,
              pressed && styles.pressed,
            ]}
            onPress={onPrimary}
            disabled={loading}
            accessibilityRole="button"
          >
            {loading ? (
              <ActivityIndicator color={primaryTone === 'danger' ? theme.colors.background.white : theme.colors.primary} />
            ) : (
              <Text style={[styles.primaryBtnText, primaryTone === 'danger' && styles.primaryBtnTextDanger]}>
                {primaryLabel}
              </Text>
            )}
          </Pressable>
          {secondaryLabel ? (
            <Pressable
              style={styles.secondaryBtn}
              onPress={onSecondary ?? onClose}
              disabled={loading}
              accessibilityRole="button"
            >
              <Text style={[styles.secondaryBtnText, tone === 'danger' && styles.textDanger]}>
                {secondaryLabel}
              </Text>
            </Pressable>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: withOpacity(theme.colors.black, 0.6),
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    borderRadius: 22,
    paddingTop: 28,
    paddingHorizontal: 22,
    paddingBottom: 12,
    backgroundColor: theme.colors.background.primary,
    borderWidth: 1,
    borderColor: withOpacity(theme.colors.secondary, 0.25),
  },
  cardDanger: {
    borderColor: withOpacity(theme.colors.error, 0.7),
    backgroundColor: theme.colors.background.primary,
  },
  textDanger: {
    color: theme.colors.error,
  },
  iconRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  title: {
    fontSize: 21,
    fontWeight: '800',
    textAlign: 'center',
    color: theme.colors.titlePrimary,
    marginBottom: 8,
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    color: withOpacity(theme.colors.text.secondary, 0.88),
  },
  primaryBtn: {
    alignSelf: 'stretch',
    marginTop: 24,
    minHeight: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.secondary,
  },
  primaryBtnDanger: {
    backgroundColor: theme.colors.error,
  },
  pressed: {
    opacity: 0.88,
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  primaryBtnTextDanger: {
    color: theme.colors.background.white,
  },
  secondaryBtn: {
    alignSelf: 'stretch',
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.secondary,
  },
});
