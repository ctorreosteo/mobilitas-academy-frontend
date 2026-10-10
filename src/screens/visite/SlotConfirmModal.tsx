import React from 'react';
import { View, Text, StyleSheet, Pressable, Modal, ActivityIndicator } from 'react-native';
// @ts-ignore - @expo/vector-icons è parte di Expo SDK
import { Ionicons } from '@expo/vector-icons';
import { theme, withOpacity } from '../../theme';

type DetailRow = { icon: string; label: string; value: string };

type Props = {
  visible: boolean;
  dayLabel: string;
  timeLabel: string;
  details: DetailRow[];
  /** Motivi per cui la conferma è bloccata (es. paziente o acquisto da scegliere). */
  hints: string[];
  canConfirm: boolean;
  pending: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

/** Pop-up di riepilogo che compare toccando "Prenota" su uno slot. */
export function SlotConfirmModal({
  visible,
  dayLabel,
  timeLabel,
  details,
  hints,
  canConfirm,
  pending,
  onConfirm,
  onClose,
}: Props) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={pending ? undefined : onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />
          <Text style={styles.overline}>Conferma la tua visita</Text>

          <View style={styles.whenCard}>
            <View style={styles.whenIcon}>
              <Ionicons name="calendar" size={26} color={theme.colors.primary} />
            </View>
            <View style={styles.whenText}>
              <Text style={styles.day}>{dayLabel}</Text>
              <Text style={styles.time}>{timeLabel}</Text>
            </View>
          </View>

          {details.map((d) => (
            <View key={d.label} style={styles.detailRow}>
              <Ionicons name={d.icon} size={18} color={theme.colors.secondary} />
              <View style={styles.detailText}>
                <Text style={styles.detailLabel}>{d.label}</Text>
                <Text style={styles.detailValue}>{d.value}</Text>
              </View>
            </View>
          ))}

          <View style={styles.policy}>
            <Ionicons name="time-outline" size={16} color={theme.colors.error} />
            <Text style={styles.policyText}>
              Puoi disdire o spostare la visita fino a 24 ore prima.
            </Text>
          </View>

          {hints.map((h) => (
            <Text key={h} style={styles.hint}>
              {h}
            </Text>
          ))}

          <Pressable
            style={({ pressed }) => [
              styles.primaryBtn,
              (!canConfirm || pending) && styles.primaryBtnDisabled,
              pressed && canConfirm && styles.pressed,
            ]}
            disabled={!canConfirm || pending}
            onPress={onConfirm}
            accessibilityRole="button"
          >
            {pending ? (
              <ActivityIndicator color={theme.colors.primary} />
            ) : (
              <Text style={styles.primaryBtnText}>Conferma prenotazione</Text>
            )}
          </Pressable>
          <Pressable style={styles.secondaryBtn} onPress={onClose} disabled={pending}>
            <Text style={styles.secondaryBtnText}>Scegli un altro orario</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: withOpacity(theme.colors.black, 0.6),
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: theme.colors.background.primary,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 22,
    paddingTop: 10,
    paddingBottom: 28,
    borderWidth: 1,
    borderColor: withOpacity(theme.colors.secondary, 0.22),
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: withOpacity(theme.colors.secondary, 0.35),
    marginBottom: 16,
  },
  overline: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: theme.colors.secondary,
    marginBottom: 12,
  },
  whenCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 16,
    backgroundColor: withOpacity(theme.colors.secondary, 0.12),
    borderWidth: 1,
    borderColor: withOpacity(theme.colors.secondary, 0.4),
    marginBottom: 16,
  },
  whenIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.secondary,
  },
  whenText: {
    flex: 1,
  },
  day: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.titlePrimary,
  },
  time: {
    marginTop: 2,
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.secondary,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 8,
  },
  detailText: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: withOpacity(theme.colors.text.secondary, 0.6),
  },
  detailValue: {
    marginTop: 1,
    fontSize: 15,
    color: theme.colors.text.secondary,
  },
  policy: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    padding: 10,
    borderRadius: 10,
    backgroundColor: withOpacity(theme.colors.error, 0.1),
  },
  policyText: {
    flex: 1,
    fontSize: 13,
    color: withOpacity(theme.colors.text.secondary, 0.9),
  },
  hint: {
    marginTop: 10,
    fontSize: 13,
    color: theme.colors.error,
  },
  primaryBtn: {
    marginTop: 20,
    minHeight: 54,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.secondary,
  },
  primaryBtnDisabled: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.88,
  },
  primaryBtnText: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  secondaryBtn: {
    marginTop: 6,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.secondary,
  },
});
