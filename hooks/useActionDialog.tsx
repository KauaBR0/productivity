import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Theme } from '@/constants/theme';
import { PressableScale } from '@/components/PressableScale';

export type ActionDialogTone = 'default' | 'cancel' | 'destructive';

export interface ActionDialogAction {
  key: string;
  label: string;
  tone?: ActionDialogTone;
}

export interface ActionDialogOptions {
  title: string;
  message?: string;
  actions: ActionDialogAction[];
  allowBackdropClose?: boolean;
}

interface DialogState extends ActionDialogOptions {}

export type ActionDialogOpener = (options: ActionDialogOptions) => Promise<string>;

export const useActionDialog = (theme: Theme) => {
  const [state, setState] = useState<DialogState | null>(null);
  const resolveRef = useRef<((key: string) => void) | null>(null);
  const styles = useMemo(() => createStyles(theme), [theme]);

  const resolveAndClose = useCallback((key: string) => {
    const resolve = resolveRef.current;
    resolveRef.current = null;
    setState(null);
    resolve?.(key);
  }, []);

  const openDialog = useCallback<ActionDialogOpener>((options) => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setState(options);
    });
  }, []);

  const cancelKey = useMemo(() => {
    if (!state) return undefined;
    const cancelAction = state.actions.find((action) => action.tone === 'cancel')
      ?? state.actions.find((action) => action.key === 'cancel');
    return cancelAction?.key ?? state.actions[0]?.key;
  }, [state]);

  const dialog = state ? (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={() => {
        if (!cancelKey) return;
        resolveAndClose(cancelKey);
      }}
    >
      <View style={styles.backdrop}>
        <Pressable
          style={styles.backdropPress}
          onPress={() => {
            if (state.allowBackdropClose === false || !cancelKey) return;
            resolveAndClose(cancelKey);
          }}
        />
        <View style={styles.card}>
          <Text style={styles.title}>{state.title}</Text>
          {!!state.message && <Text style={styles.message}>{state.message}</Text>}
          <View style={styles.actions}>
            {state.actions.map((action) => {
              const tone = action.tone ?? 'default';
              return (
                <PressableScale
                  key={action.key}
                  style={[
                    styles.actionButton,
                    tone === 'cancel' && styles.actionButtonCancel,
                    tone === 'destructive' && styles.actionButtonDestructive,
                  ]}
                  onPress={() => resolveAndClose(action.key)}
                >
                  <Text
                    style={[
                      styles.actionText,
                      tone === 'cancel' && styles.actionTextCancel,
                      tone === 'destructive' && styles.actionTextDestructive,
                    ]}
                  >
                    {action.label}
                  </Text>
                </PressableScale>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  ) : null;

  return { openDialog, dialog, visible: !!state };
};

const createStyles = (theme: Theme) => StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(5,6,10,0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  backdropPress: {
    ...StyleSheet.absoluteFillObject,
  },
  card: {
    width: '100%',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  title: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  message: {
    color: theme.colors.textMuted,
    fontSize: 13,
    marginTop: 8,
    lineHeight: 18,
  },
  actions: {
    marginTop: 18,
    gap: 10,
  },
  actionButton: {
    paddingVertical: 12,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.accent,
  },
  actionButtonCancel: {
    backgroundColor: theme.colors.surfaceSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  actionButtonDestructive: {
    backgroundColor: theme.colors.danger,
  },
  actionText: {
    color: theme.colors.accentDark,
    fontWeight: '700',
    fontSize: 13,
  },
  actionTextCancel: {
    color: theme.colors.text,
  },
  actionTextDestructive: {
    color: '#FFF',
  },
});
