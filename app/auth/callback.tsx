import React, { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useSettings } from '@/context/SettingsContext';
import { Theme } from '@/constants/theme';

export default function AuthCallbackScreen() {
  const { theme } = useSettings();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <ActivityIndicator color={theme.colors.accent} />
        <Text style={styles.title}>Concluindo login com Google</Text>
        <Text style={styles.subtitle}>Aguarde um instante enquanto validamos sua sessao.</Text>
      </View>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      backgroundColor: theme.colors.bg,
    },
    card: {
      width: '100%',
      maxWidth: 360,
      alignItems: 'center',
      gap: 12,
      padding: 24,
      borderRadius: theme.radius.lg,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    title: {
      color: theme.colors.text,
      fontSize: 18,
      fontWeight: '700',
      textAlign: 'center',
    },
    subtitle: {
      color: theme.colors.textMuted,
      fontSize: 13,
      lineHeight: 18,
      textAlign: 'center',
    },
  });
