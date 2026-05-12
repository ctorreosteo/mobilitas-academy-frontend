import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';
// @ts-ignore - @expo/vector-icons è parte di Expo SDK
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import { openStudioWhatsApp } from '../utils/openStudioWhatsApp';

type Props = {
  prefilledMessage: string;
  style?: StyleProp<ViewStyle>;
};

const StudioWhatsAppSupportButton: React.FC<Props> = ({ prefilledMessage, style }) => {
  const [busy, setBusy] = useState(false);

  const onPress = useCallback(async () => {
    setBusy(true);
    try {
      await openStudioWhatsApp({ message: prefilledMessage });
    } finally {
      setBusy(false);
    }
  }, [prefilledMessage]);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.btn,
        pressed && styles.pressed,
        busy && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={busy}
      accessibilityRole="button"
      accessibilityLabel="Apri WhatsApp per contattare la segreteria dello studio"
    >
      <Ionicons name="logo-whatsapp" size={18} color={theme.colors.background.primary} />
      <Text style={styles.btnText}>
        {busy ? 'Apertura WhatsApp…' : 'Contatta la segreteria su WhatsApp'}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  btn: {
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: '#25D366',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 14,
  },
  pressed: {
    opacity: 0.92,
  },
  disabled: {
    opacity: 0.65,
  },
  btnText: {
    color: theme.colors.background.primary,
    fontSize: 14,
    fontWeight: '700',
  },
});

export default StudioWhatsAppSupportButton;
