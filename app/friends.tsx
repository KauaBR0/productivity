import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, Pressable, StyleSheet, Text, View, Animated, StyleProp, ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';
import { SocialProfile, SocialService } from '@/services/SocialService';
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

const formatLastFocus = (dateValue?: string | null) => {
  if (!dateValue) return 'Sem foco recente';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return 'Sem foco recente';
  return `Ultimo foco: ${date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}`;
};

export default function FriendsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { theme } = useSettings();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();

  const [friends, setFriends] = useState<SocialProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const loadFriends = async (isRefresh = false) => {
    if (!user) return;
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const list = await SocialService.getFriends(user.id);
      setFriends(list);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadFriends();
  }, [user]);

  const handleRemoveFriend = (friendId: string) => {
    if (!user) return;
    Alert.alert(
      'Remover amigo',
      'Tem certeza que deseja remover essa amizade?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            try {
              setRemovingId(friendId);
              await SocialService.unfollowUser(user.id, friendId);
              setFriends((prev) => prev.filter((f) => f.id !== friendId));
            } catch (error) {
              console.error(error);
              Alert.alert('Erro', 'Nao foi possivel remover o amigo.');
            } finally {
              setRemovingId(null);
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: SocialProfile }) => (
    <PressableScale style={styles.friendCard} onPress={() => router.push(`/user/${item.id}` as any)}>
      <View style={styles.avatar}>
        {item.avatar_url ? (
          <Image source={{ uri: item.avatar_url }} style={styles.avatarImage} />
        ) : (
          <Text style={styles.avatarText}>{item.username?.charAt(0).toUpperCase()}</Text>
        )}
      </View>
      <View style={styles.friendInfo}>
        <Text style={styles.friendName}>{item.username}</Text>
        {item.is_focusing ? (
          <Text style={styles.focusingText}>Focando agora</Text>
        ) : (
          <Text style={styles.metaText}>{formatLastFocus(item.last_focus_date)}</Text>
        )}
      </View>
      <View style={styles.actionColumn}>
        <View style={styles.streakPill}>
          <Text style={styles.streakValue}>{item.current_streak || 0}</Text>
          <Text style={styles.streakLabel}>dias</Text>
        </View>
        <Pressable
          style={[styles.removeButton, removingId === item.id && styles.removeButtonDisabled]}
          onPress={() => handleRemoveFriend(item.id)}
          disabled={removingId === item.id}
        >
          <Text style={styles.removeButtonText}>{removingId === item.id ? 'Removendo' : 'Remover'}</Text>
        </Pressable>
      </View>
    </PressableScale>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top + 10 }]}>
      <View style={styles.background}>
        <View style={styles.glowOrb} />
        <View style={styles.glowOrbSecondary} />
      </View>

      <View style={styles.header}>
        <PressableScale onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft color="#FFF" size={22} />
        </PressableScale>
        <View>
          <Text style={styles.title}>Amigos</Text>
          <Text style={styles.subtitle}>{friends.length} conexoes</Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={theme.colors.accent} style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={friends}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={[styles.list, { paddingBottom: Math.max(insets.bottom, 24) + 80 }]}
          refreshing={refreshing}
          onRefresh={() => loadFriends(true)}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Users color={theme.colors.accent} size={22} />
              </View>
              <Text style={styles.emptyTitle}>Sem amigos ainda</Text>
              <Text style={styles.emptySubtitle}>
                Adicione pessoas para acompanhar os ciclos e manter a motivacao.
              </Text>
              <PressableScale style={styles.emptyCta} onPress={() => router.push('/search' as any)}>
                <Sparkles color="#000" size={18} />
                <Text style={styles.emptyCtaText}>Encontrar pessoas</Text>
              </PressableScale>
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
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  glowOrb: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    top: -180,
    right: -140,
    backgroundColor: theme.colors.glowPrimary,
  },
  glowOrbSecondary: {
    position: 'absolute',
    width: 360,
    height: 360,
    borderRadius: 180,
    bottom: -220,
    left: -160,
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
  list: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  friendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: 12,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 12,
    ...theme.shadow.card,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: theme.colors.surfaceSoftStrong,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarImage: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  avatarText: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  friendInfo: {
    flex: 1,
  },
  actionColumn: {
    alignItems: 'center',
    gap: 8,
  },
  friendName: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  focusingText: {
    color: theme.colors.accent,
    fontSize: 12,
    marginTop: 4,
    fontWeight: '600',
  },
  metaText: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
  streakPill: {
    backgroundColor: 'rgba(231, 184, 74, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(231, 184, 74, 0.4)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    alignItems: 'center',
  },
  streakValue: {
    color: theme.colors.accent,
    fontSize: 14,
    fontWeight: '800',
  },
  streakLabel: {
    color: theme.colors.textMuted,
    fontSize: 10,
    marginTop: -2,
  },
  removeButton: {
    backgroundColor: 'rgba(255,69,69,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,69,69,0.45)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  removeButtonDisabled: {
    opacity: 0.6,
  },
  removeButtonText: {
    color: theme.colors.danger,
    fontSize: 11,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    gap: 10,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(231, 184, 74, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(231, 184, 74, 0.4)',
  },
  emptyTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptySubtitle: {
    color: theme.colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  emptyCta: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.accent,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
  },
  emptyCtaText: {
    color: theme.colors.accentDark,
    fontWeight: '700',
  },
});
