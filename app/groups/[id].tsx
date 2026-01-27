import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, FlatList, Pressable, Animated, StyleProp, ViewStyle, Alert, ActivityIndicator, TextInput } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';
import { Group, GroupMember, GroupRole, GroupService } from '@/services/GroupService';
import { ArrowLeft, Users, ShieldCheck, Shield, Crown, Trash2, LogOut } from 'lucide-react-native';
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

const roleLabel = (role: GroupRole) => {
  if (role === 'owner') return 'Dono';
  if (role === 'admin') return 'Admin';
  return 'Membro';
};

const roleIcon = (role: GroupRole, color: string) => {
  if (role === 'owner') return <Crown color={color} size={14} />;
  if (role === 'admin') return <ShieldCheck color={color} size={14} />;
  return <Shield color={color} size={14} />;
};

export default function GroupDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const groupId = Array.isArray(id) ? id[0] : id;
  const { user } = useAuth();
  const { theme } = useSettings();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [draftDescription, setDraftDescription] = useState('');

  const loadGroup = useCallback(async () => {
    if (!groupId) return;
    setLoading(true);
    try {
      const [groupData, membersData] = await Promise.all([
        GroupService.getGroupById(groupId),
        GroupService.getGroupMembers(groupId),
      ]);
      if (!groupData) {
        Alert.alert('Grupo nao encontrado');
        router.back();
        return;
      }
      setGroup(groupData);
      setMembers(membersData);
      setDraftName(groupData.name);
      setDraftDescription(groupData.description || '');
    } catch (error) {
      console.error(error);
      Alert.alert('Erro', 'Nao foi possivel carregar o grupo.');
      router.back();
    } finally {
      setLoading(false);
    }
  }, [groupId, router]);

  useEffect(() => {
    loadGroup();
  }, [loadGroup]);

  const myRole = members.find((member) => member.id === user?.id)?.role || 'member';
  const canManage = myRole === 'owner' || myRole === 'admin';
  const isOwner = myRole === 'owner';

  const handleSave = async () => {
    if (!group) return;
    const nameValue = draftName.trim();
    if (!nameValue) {
      Alert.alert('Nome obrigatorio');
      return;
    }
    setSaving(true);
    try {
      await GroupService.updateGroup(group.id, {
        name: nameValue,
        description: draftDescription.trim() || null,
      });
      setIsEditing(false);
      await loadGroup();
    } catch (error) {
      console.error(error);
      Alert.alert('Erro', 'Nao foi possivel salvar.');
    } finally {
      setSaving(false);
    }
  };

  const handleLeave = async () => {
    if (!group || !user) return;
    if (isOwner) {
      Alert.alert('Voce e o dono', 'Para sair, exclua o grupo.');
      return;
    }
    Alert.alert('Sair do grupo?', 'Voce perdera o acesso ao ranking.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: async () => {
          try {
            await GroupService.leaveGroup(group.id, user.id);
            router.back();
          } catch (error) {
            console.error(error);
            Alert.alert('Erro', 'Nao foi possivel sair.');
          }
        },
      },
    ]);
  };

  const handleDeleteGroup = async () => {
    if (!group) return;
    Alert.alert('Excluir grupo?', 'Essa acao nao pode ser desfeita.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          try {
            await GroupService.deleteGroup(group.id);
            router.back();
          } catch (error) {
            console.error(error);
            Alert.alert('Erro', 'Nao foi possivel excluir o grupo.');
          }
        },
      },
    ]);
  };

  const handleRemoveMember = (member: GroupMember) => {
    if (!group) return;
    Alert.alert('Remover membro?', `Remover ${member.username || 'membro'} do grupo?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: async () => {
          try {
            await GroupService.removeMember(group.id, member.id);
            await loadGroup();
          } catch (error) {
            console.error(error);
            Alert.alert('Erro', 'Nao foi possivel remover.');
          }
        },
      },
    ]);
  };

  const renderMember = ({ item }: { item: GroupMember }) => (
    <View style={styles.memberRow}>
      <View style={styles.memberLeft}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{(item.username || 'U').charAt(0).toUpperCase()}</Text>
        </View>
        <View>
          <Text style={styles.memberName}>{item.username || 'Usuario'}</Text>
          <View style={styles.roleRow}>
            {roleIcon(item.role, theme.colors.textMuted)}
            <Text style={styles.roleText}>{roleLabel(item.role)}</Text>
          </View>
        </View>
      </View>
      {canManage && item.role !== 'owner' && item.id !== user?.id && (
        <Pressable style={styles.removeButton} onPress={() => handleRemoveMember(item)}>
          <Trash2 color={theme.colors.danger} size={16} />
        </Pressable>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={theme.colors.accent} />
      </View>
    );
  }

  if (!group) return null;

  return (
    <View style={styles.container}>
      <View style={styles.background}>
        <View style={styles.glowOrb} />
        <View style={styles.glowOrbSecondary} />
      </View>

      <FlatList
        data={members}
        renderItem={renderMember}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View>
            <View style={styles.header}>
              <PressableScale onPress={() => router.back()} style={styles.backButton}>
                <ArrowLeft color="#FFF" size={22} />
              </PressableScale>
              <View>
                <Text style={styles.title}>Detalhes do grupo</Text>
                <Text style={styles.subtitle}>{members.length} / {group.member_limit} membros</Text>
              </View>
            </View>

            <View style={styles.groupCard}>
              {isEditing ? (
                <View style={styles.editSection}>
                  <Text style={styles.label}>Nome</Text>
                  <TextInput
                    style={styles.input}
                    value={draftName}
                    onChangeText={setDraftName}
                    maxLength={40}
                  />
                  <Text style={styles.label}>Descricao</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={draftDescription}
                    onChangeText={setDraftDescription}
                    multiline
                    maxLength={120}
                  />
                  <View style={styles.editActions}>
                    <PressableScale
                      onPress={() => {
                        setDraftName(group.name);
                        setDraftDescription(group.description || '');
                        setIsEditing(false);
                      }}
                      style={styles.secondaryButton}
                    >
                      <Text style={styles.secondaryButtonText}>Cancelar</Text>
                    </PressableScale>
                    <PressableScale onPress={handleSave} style={styles.primaryButton}>
                      {saving ? (
                        <ActivityIndicator color={theme.colors.accentDark} />
                      ) : (
                        <Text style={styles.primaryButtonText}>Salvar</Text>
                      )}
                    </PressableScale>
                  </View>
                </View>
              ) : (
                <View>
                  <View style={styles.groupHeaderRow}>
                    <View style={styles.groupTitleRow}>
                      <View style={styles.groupIcon}>
                        <Users color={theme.colors.accent} size={18} />
                      </View>
                      <View>
                        <Text style={styles.groupName}>{group.name}</Text>
                        <Text style={styles.groupDescription}>{group.description || 'Sem descricao'}</Text>
                      </View>
                    </View>
                    {canManage && (
                      <PressableScale onPress={() => setIsEditing(true)} style={styles.editButton}>
                        <Text style={styles.editButtonText}>Editar</Text>
                      </PressableScale>
                    )}
                  </View>

                  <View style={styles.codeRow}>
                    <Text style={styles.codeLabel}>Codigo</Text>
                    <Text style={styles.codeValue}>{group.join_code}</Text>
                  </View>

                  <View style={styles.actionRow}>
                    {isOwner ? (
                      <PressableScale onPress={handleDeleteGroup} style={styles.dangerButton}>
                        <Trash2 color="#FFF" size={16} />
                        <Text style={styles.dangerButtonText}>Excluir grupo</Text>
                      </PressableScale>
                    ) : (
                      <PressableScale onPress={handleLeave} style={styles.secondaryAction}>
                        <LogOut color={theme.colors.text} size={16} />
                        <Text style={styles.secondaryActionText}>Sair do grupo</Text>
                      </PressableScale>
                    )}
                  </View>
                </View>
              )}
            </View>

            <Text style={styles.sectionTitle}>Membros</Text>
          </View>
        }
      />
    </View>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  glowOrb: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    top: -180,
    right: -140,
    backgroundColor: theme.colors.glowPrimary,
  },
  glowOrbSecondary: {
    position: 'absolute',
    width: 340,
    height: 340,
    borderRadius: 170,
    bottom: -220,
    left: -160,
    backgroundColor: theme.colors.glowSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    marginTop: 50,
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
  groupCard: {
    marginHorizontal: 20,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 16,
  },
  groupHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  groupTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  groupIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(231, 184, 74, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(231, 184, 74, 0.4)',
  },
  groupName: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  groupDescription: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
  editButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSoft,
  },
  editButtonText: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  codeRow: {
    marginTop: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  codeLabel: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  codeValue: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 6,
    letterSpacing: 1,
  },
  actionRow: {
    marginTop: 16,
  },
  dangerButton: {
    backgroundColor: theme.colors.danger,
    borderRadius: theme.radius.lg,
    paddingVertical: 12,
    alignItems: 'center',
    gap: 6,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  dangerButtonText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 13,
  },
  secondaryAction: {
    borderRadius: theme.radius.lg,
    paddingVertical: 12,
    alignItems: 'center',
    gap: 6,
    flexDirection: 'row',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSoft,
  },
  secondaryActionText: {
    color: theme.colors.text,
    fontWeight: '700',
    fontSize: 13,
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '700',
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  listContent: {
    paddingBottom: 40,
  },
  memberRow: {
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  memberLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: theme.colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  memberName: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  roleText: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  removeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,69,69,0.4)',
    backgroundColor: 'rgba(255,69,69,0.12)',
  },
  editSection: {
    gap: 10,
  },
  label: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
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
  editActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  primaryButtonText: {
    color: theme.colors.accentDark,
    fontWeight: '700',
  },
  secondaryButton: {
    flex: 1,
    borderRadius: theme.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  secondaryButtonText: {
    color: theme.colors.textMuted,
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: theme.colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
