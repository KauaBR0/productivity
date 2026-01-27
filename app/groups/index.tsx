import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, FlatList, Pressable, Animated, StyleProp, ViewStyle, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';
import { GroupMembership, GroupService } from '@/services/GroupService';
import { ArrowLeft, Users, Plus, LogIn } from 'lucide-react-native';
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

export default function GroupsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { theme } = useSettings();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [groups, setGroups] = useState<GroupMembership[]>([]);
  const [loading, setLoading] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);

  const loadGroups = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await GroupService.getMyGroups(user.id);
      setGroups(data);
    } catch (error) {
      console.error(error);
      Alert.alert('Erro', 'Nao foi possivel carregar seus grupos.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  const handleJoin = async () => {
    if (!user) return;
    const code = joinCode.trim().toUpperCase();
    if (!code) return;
    setJoining(true);
    try {
      const groupId = await GroupService.joinGroupByCode(code);
      setJoinCode('');
      await loadGroups();
      router.push(`/groups/${groupId}` as any);
    } catch (error) {
      console.error(error);
      Alert.alert('Erro', 'Codigo invalido ou grupo cheio.');
    } finally {
      setJoining(false);
    }
  };

  const renderItem = ({ item }: { item: GroupMembership }) => (
    <PressableScale
      style={styles.groupCard}
      onPress={() => router.push(`/groups/${item.group.id}` as any)}
    >
      <View style={styles.groupInfo}>
        <View style={styles.groupIcon}>
          <Users color={theme.colors.accent} size={18} />
        </View>
        <View style={styles.groupText}>
          <Text style={styles.groupName}>{item.group.name}</Text>
          <Text style={styles.groupMeta}>{item.group.description || 'Sem descricao'}</Text>
        </View>
      </View>
      <View style={styles.groupRolePill}>
        <Text style={styles.groupRoleText}>{item.role.toUpperCase()}</Text>
      </View>
    </PressableScale>
  );

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
          <Text style={styles.title}>Grupos</Text>
          <Text style={styles.subtitle}>Crie ou participe usando um codigo</Text>
        </View>
      </View>

      <View style={styles.actionsRow}>
        <PressableScale onPress={() => router.push('/groups/create' as any)} style={styles.primaryAction}>
          <Plus color={theme.colors.accentDark} size={18} />
          <Text style={styles.primaryActionText}>Criar grupo</Text>
        </PressableScale>
        <View style={styles.joinContainer}>
          <TextInput
            style={styles.joinInput}
            placeholder="Codigo"
            placeholderTextColor={theme.colors.textMuted}
            value={joinCode}
            onChangeText={setJoinCode}
            autoCapitalize="characters"
            maxLength={10}
          />
          <PressableScale onPress={handleJoin} style={styles.joinButton}>
            {joining ? (
              <ActivityIndicator color={theme.colors.accentDark} size="small" />
            ) : (
              <LogIn color={theme.colors.accentDark} size={16} />
            )}
          </PressableScale>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={theme.colors.accent} style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={groups}
          renderItem={renderItem}
          keyExtractor={(item) => item.group.id}
          contentContainerStyle={styles.listContent}
          onRefresh={loadGroups}
          refreshing={loading}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>Nenhum grupo ainda</Text>
              <Text style={styles.emptySubtitle}>Crie um grupo ou entre usando um codigo.</Text>
            </View>
          }
        />
      )}
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
  actionsRow: {
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 12,
  },
  primaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignSelf: 'flex-start',
    ...theme.shadow.accent,
  },
  primaryActionText: {
    color: theme.colors.accentDark,
    fontWeight: '700',
    fontSize: 13,
  },
  joinContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  joinInput: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  joinButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.accent,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 12,
  },
  groupCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...theme.shadow.card,
  },
  groupInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  groupIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(231, 184, 74, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(231, 184, 74, 0.4)',
  },
  groupText: {
    flex: 1,
  },
  groupName: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  groupMeta: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
  groupRolePill: {
    backgroundColor: theme.colors.surfaceSoft,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  groupRoleText: {
    color: theme.colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 10,
  },
  emptyTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  emptySubtitle: {
    color: theme.colors.textMuted,
    fontSize: 12,
  },
});
