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
}: SelectModalProps<T>) {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.modalTitle}>{title}</Text>
          <FlatList
            style={styles.modalList}
            data={options}
            keyExtractor={(item) => String(item.id)}
            ListEmptyComponent={
              <Text style={styles.modalEmpty}>
                {listEmptyText ?? 'Nessun elemento disponibile.'}
              </Text>
            }
            renderItem={({ item }) => {
              const sel = item.id === selectedId;
              return (
                <Pressable
                  style={[styles.modalRow, sel && styles.modalRowSelected]}
                  onPress={() => {
                    onSelect(item);
                    onClose();
                  }}
                >
                  <Text style={[styles.modalRowText, sel && styles.modalRowTextSelected]}>
                    {getLabel(item)}
                  </Text>
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
  modalEmpty: {
    padding: 24,
    textAlign: 'center',
    color: theme.colors.text.secondary,
    fontSize: 15,
    lineHeight: 22,
  },
  modalRow: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(114, 250, 147, 0.15)',
  },
  modalRowSelected: {
    backgroundColor: 'rgba(114, 250, 147, 0.1)',
  },
  modalRowText: {
    fontSize: 16,
    color: theme.colors.text.secondary,
  },
  modalRowTextSelected: {
    color: theme.colors.secondary,
    fontWeight: '600',
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
