import React from 'react';
import { View, Text, StyleSheet, Pressable, Modal, FlatList } from 'react-native';
import { theme } from '../../theme';

type SelectModalProps<T extends { id: number }> = {
  visible: boolean;
  title: string;
  options: T[];
  selectedId: number | null;
  onClose: () => void;
  getLabel: (item: T) => string;
  onSelect: (item: T) => void;
  listEmptyText?: string;
  /** Se restituisce true, la riga è mostrata ma non selezionabile. */
  isItemDisabled?: (item: T) => boolean;
  /** Testo sotto l’etichetta per le righe disabilitate (default: "Non selezionabile"). */
  disabledItemHint?: string;
};

export function SelectModal<T extends { id: number }>({
  visible,
  title,
  options,
  selectedId,
  onClose,
  getLabel,
  onSelect,
  listEmptyText,
  isItemDisabled,
  disabledItemHint = 'Non prenotabile',
}: SelectModalProps<T>) {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.modalTitle}>{title}</Text>
          <FlatList
            style={styles.modalList}
            contentContainerStyle={styles.modalListContent}
            data={options}
            keyExtractor={(item, index) => `opt-${String(item.id)}-${index}`}
            removeClippedSubviews={false}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <Text style={styles.modalEmpty}>
                {listEmptyText ?? 'Nessun elemento disponibile.'}
              </Text>
            }
            renderItem={({ item }) => {
              const sel = item.id === selectedId;
              const disabled = isItemDisabled?.(item) ?? false;
              return (
                <Pressable
                  accessibilityState={{ disabled }}
                  style={[
                    styles.modalRow,
                    sel && styles.modalRowSelected,
                    disabled && styles.modalRowDisabled,
                  ]}
                  onPress={() => {
                    if (disabled) return;
                    onSelect(item);
                    onClose();
                  }}
                >
                  <Text
                    style={[
                      styles.modalRowText,
                      sel && styles.modalRowTextSelected,
                      disabled && styles.modalRowTextDisabled,
                    ]}
                  >
                    {getLabel(item)}
                  </Text>
                  {disabled ? (
                    <Text style={[styles.modalRowHint, styles.modalRowHintDisabled]}>
                      {disabledItemHint}
                    </Text>
                  ) : null}
                </Pressable>
              );
            }}
          />
          <Pressable style={styles.modalCloseBtn} onPress={onClose}>
            <Text style={styles.modalCloseBtnText}>Chiudi</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: theme.colors.background.primary,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 16,
    maxHeight: '72%',
    borderWidth: 1,
    borderColor: 'rgba(114, 250, 147, 0.2)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.secondary,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  modalList: {
    flexGrow: 0,
    maxHeight: 360,
  },
  modalListContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 12,
  },
  modalEmpty: {
    padding: 24,
    textAlign: 'center',
    color: theme.colors.text.secondary,
    fontSize: 15,
    lineHeight: 22,
  },
  modalRow: {
    marginBottom: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(114, 250, 147, 0.28)',
    backgroundColor: 'rgba(0, 37, 82, 0.42)',
  },
  modalRowSelected: {
    borderColor: theme.colors.secondary,
    backgroundColor: 'rgba(114, 250, 147, 0.14)',
  },
  modalRowText: {
    fontSize: 16,
    color: theme.colors.text.secondary,
  },
  modalRowTextSelected: {
    color: theme.colors.secondary,
    fontWeight: '600',
  },
  modalRowDisabled: {
    opacity: 0.48,
    borderColor: 'rgba(114, 250, 147, 0.14)',
    backgroundColor: 'rgba(0, 37, 82, 0.28)',
  },
  modalRowTextDisabled: {
    opacity: 0.85,
  },
  modalRowHint: {
    marginTop: 4,
    fontSize: 12,
    color: theme.colors.text.secondary,
    opacity: 0.75,
    fontStyle: 'italic',
  },
  modalRowHintDisabled: {
    opacity: 0.55,
  },
  modalCloseBtn: {
    padding: 18,
    alignItems: 'center',
  },
  modalCloseBtnText: {
    color: theme.colors.secondary,
    fontSize: 16,
    fontWeight: '600',
  },
});
