import React, { useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View, TextInput, Pressable, Animated, StyleProp, ViewStyle, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';
import { GroupService } from '@/services/GroupService';
import { ArrowLeft, Users, Sparkles } from 'lucide-react-native';
import { Theme } from '@/constants/theme';

const PressableScale = ({
  onPress,
  children,
  style,
}: {
  onPress?: () => void;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) => {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, { toValue: 0.98, useNativeDriver: true, friction: 6, tension: 120 }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 6, tension: 120 }).start();
  };

  return (
    <Pressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut}>
      <Animated.View style={[{ transform: [{ scale }] }, style]}>{children}</Animated.View>
    </Pressable>
  );
};

export default function GroupCreateScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { theme } = useSettings();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!user) return;
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert('Nome obrigatorio', 'Defina um nome para o grupo.');
      return;
    }
    setSaving(true);
    try {
      const groupId = await GroupService.createGroup(trimmed, description.trim() || null, 20);
      router.replace(`/groups/${groupId}` as any);
    } catch (error) {
      console.error(error);
      Alert.alert('Erro', 'Nao foi possivel criar o grupo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.background}>
        <View style={styles.glowOrb} />
        <View style={styles.glowOrbSecondary} />
      </View>

      <View style={styles.header}>
        <PressableScale onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft color="#FFF" size={22} />
        </PressableScale>
        <View>
          <Text style={styles.title}>Criar grupo</Text>
          <Text style={styles.subtitle}>Até 20 membros por grupo</Text>
        </View>
      </View>

      <View style={styles.formCard}>
        <View style={styles.formHeader}>
          <View style={styles.formIcon}>
            <Users color={theme.colors.accent} size={18} />
          </View>
          <View>
            <Text style={styles.formTitle}>Detalhes do grupo</Text>
            <Text style={styles.formSubtitle}>Defina nome e descricao</Text>
          </View>
        </View>

        <Text style={styles.label}>Nome</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: Squad Foco"
          placeholderTextColor={theme.colors.textMuted}
          value={name}
          onChangeText={setName}
          maxLength={40}
        />

        <Text style={styles.label}>Descricao (opcional)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Descreva o objetivo do grupo"
          placeholderTextColor={theme.colors.textMuted}
          value={description}
          onChangeText={setDescription}
          maxLength={120}
          multiline
        />

        <View style={styles.infoRow}>
          <Sparkles color={theme.colors.accent} size={14} />
          <Text style={styles.infoText}>Voce recebera um codigo para compartilhar.</Text>
        </View>

        <PressableScale onPress={handleCreate} style={styles.createButton}>
          {saving ? (
            <ActivityIndicator color={theme.colors.accentDark} />
          ) : (
            <Text style={styles.createButtonText}>Criar grupo</Text>
          )}
        </PressableScale>
      </View>
    </View>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
    paddingTop: 50,
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  glowOrb: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    top: -160,
    left: -120,
    backgroundColor: theme.colors.glowPrimary,
  },
  glowOrbSecondary: {
    position: 'absolute',
    width: 340,
    height: 340,
    borderRadius: 170,
    bottom: -220,
    right: -160,
    backgroundColor: theme.colors.glowSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  backButton: {
    padding: 8,
    backgroundColor: theme.colors.surfaceSoft,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  title: {
    color: theme.colors.text,
    ...theme.typography.title,
  },
  subtitle: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  formCard: {
    marginHorizontal: 20,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  formIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(231, 184, 74, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(231, 184, 74, 0.4)',
  },
  formTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  formSubtitle: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
  label: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 10,
    marginBottom: 6,
  },
  input: {
    backgroundColor: theme.colors.surfaceSoft,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
  },
  infoText: {
    color: theme.colors.textMuted,
    fontSize: 12,
  },
  createButton: {
    marginTop: 18,
    backgroundColor: theme.colors.accent,
    paddingVertical: 12,
    borderRadius: theme.radius.lg,
    alignItems: 'center',
  },
  createButtonText: {
    color: theme.colors.accentDark,
    fontWeight: '700',
  },
});
