import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Image, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AlertTriangle, ArrowLeft, Users } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';
import { SocialProfile, SocialService } from '@/services/SocialService';
import { Theme } from '@/constants/theme';
import { PressableScale } from '@/components/PressableScale';
import { EmptyState } from '@/components/ui/EmptyState';

const formatLastFocus = (dateValue?: string | null) => {
  if (!dateValue) return 'Sem foco recente';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return 'Sem foco recente';
  return `Ultimo foco: ${date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}`;
};

export default function FollowListScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { theme } = useSettings();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();

  const paramUserId = typeof params.userId === 'string' ? params.userId : params.userId?.[0];
  const targetUserId = paramUserId ?? user?.id ?? null;
  const listType = params.type === 'following' ? 'following' : 'followers';
  const username = typeof params.username === 'string' ? params.username : params.username?.[0];

  const [profiles, setProfiles] = useState<SocialProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProfiles = useCallback(
    async (isRefresh = false) => {
      if (!targetUserId) {
        setError('Usuário inválido.');
        setLoading(false);
        return;
      }

      setError(null);
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const list =
          listType === 'followers'
            ? await SocialService.getFollowers(targetUserId)
            : await SocialService.getFollowing(targetUserId);
        setProfiles(list);
      } catch (err) {
        console.error(err);
        setError(
          listType === 'followers'
            ? 'Não foi possível carregar os seguidores.'
            : 'Não foi possível carregar quem você segue.',
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [listType, targetUserId],
  );

  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  const title = listType === 'followers' ? 'Seguidores' : 'Seguindo';
  const subtitle = username ? `de ${username}` : null;

  const handleOpenProfile = (profileId: string) => {
    if (profileId === user?.id) {
      router.push('/profile' as any);
      return;
    }
    router.push(`/user/${profileId}` as any);
  };

  const renderItem = ({ item }: { item: SocialProfile }) => (
    <PressableScale style={styles.card} onPress={() => handleOpenProfile(item.id)}>
      <View style={styles.avatar}>
        {item.avatar_url ? (
          <Image source={{ uri: item.avatar_url }} style={styles.avatarImage} />
        ) : (
          <Text style={styles.avatarText}>{item.username?.charAt(0).toUpperCase()}</Text>
        )}
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>{item.username}</Text>
        {item.is_focusing ? (
          <Text style={styles.focusingText}>Focando agora</Text>
        ) : (
          <Text style={styles.metaText}>{formatLastFocus(item.last_focus_date)}</Text>
        )}
      </View>
    </PressableScale>
  );

  const showErrorState = !!error && profiles.length === 0 && !loading;

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
          <Text style={styles.title}>{title}</Text>
          {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={theme.colors.accent} style={{ marginTop: 20 }} />
      ) : showErrorState ? (
        <EmptyState
          theme={theme}
          icon={AlertTriangle}
          title="Erro ao carregar"
          description={error || 'Tente novamente em instantes.'}
          actionLabel="Tentar novamente"
          onAction={() => loadProfiles(true)}
        />
      ) : (
        <FlatList
          data={profiles}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: Math.max(insets.bottom, 24) + 60 },
          ]}
          refreshing={refreshing}
          onRefresh={() => loadProfiles(true)}
          ListEmptyComponent={
            <EmptyState
              theme={theme}
              icon={Users}
              title={listType === 'followers' ? 'Sem seguidores ainda' : 'Você não segue ninguém'}
              description={
                listType === 'followers'
                  ? 'Compartilhe seu progresso para atrair novas conexões.'
                  : 'Encontre pessoas para acompanhar os ciclos.'
              }
              actionLabel={listType === 'following' ? 'Encontrar pessoas' : undefined}
              onAction={listType === 'following' ? () => router.push('/search' as any) : undefined}
            />
          }
        />
      )}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
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
    card: {
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
    info: {
      flex: 1,
    },
    name: {
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
  });
