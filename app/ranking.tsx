import React, { useEffect, useState, useRef, useMemo } from 'react';
import { StyleSheet, Text, View, FlatList, Image, Pressable, Animated, StyleProp, ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';
import { fetchRanking, RankingUser, formatTimeDisplay } from '@/utils/RankingLogic';
import { SocialService } from '@/services/SocialService';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, UserPlus, Globe, Users, Crown, Sparkles, Users2 } from 'lucide-react-native';
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

export default function RankingScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { theme } = useSettings();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [rankingData, setRankingData] = useState<RankingUser[]>([]);
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [scope, setScope] = useState<'global' | 'following'>('global');
  const topThree = rankingData.slice(0, 3);
  const currentUser = rankingData.find((item) => item.isUser);
  const currentUserRank = currentUser ? rankingData.findIndex((item) => item.id === currentUser.id) + 1 : null;

  // Load Ranking
  useEffect(() => {
    loadRanking();
  }, [period, scope]);

  // Realtime Subscription
  useEffect(() => {
    const channel = supabase
      .channel('public:profiles')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles' },
        (payload) => {
          const updatedProfile = payload.new;
          setRankingData((currentData) => 
            currentData.map((item) => {
              if (item.id === updatedProfile.id) {
                return { ...item, isFocusing: updatedProfile.is_focusing };
              }
              return item;
            })
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadRanking = async () => {
    let filterIds: string[] | undefined = undefined;
    
    if (scope === 'following' && user) {
        try {
            filterIds = await SocialService.getMyFollowingIds(user.id);
        } catch (error) {
            console.error("Failed to load following ids", error);
        }
    }

    const data = await fetchRanking(period, user?.id, filterIds);
    setRankingData(data);
  };

  const renderItem = ({ item, index }: { item: RankingUser; index: number }) => {
    const isTop3 = index < 3;
    let medalColor = '#333';
    let medalIcon = null;

    if (index === 0) { medalColor = '#FFD700'; medalIcon = '🥇'; } // Gold
    if (index === 1) { medalColor = '#C0C0C0'; medalIcon = '🥈'; } // Silver
    if (index === 2) { medalColor = '#CD7F32'; medalIcon = '🥉'; } // Bronze

    return (
      <PressableScale 
        style={[styles.rankItem, item.isUser && styles.userHighlight]}
        onPress={() => item.isUser ? router.push('/profile') : router.push(`/user/${item.id}` as any)}
      >
        <View style={styles.rankLeft}>
          <View style={[styles.positionContainer]}>
            <Text style={[styles.positionText, { color: isTop3 ? medalColor : '#888' }]}>
                {medalIcon ? medalIcon : index + 1}
            </Text>
          </View>
          
          <View style={[styles.avatar, { backgroundColor: item.avatarColor }]}>
            {item.avatarUrl ? (
                <Image source={{ uri: item.avatarUrl }} style={{ width: 40, height: 40, borderRadius: 20 }} />
            ) : (
                <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
            )}
          </View>

          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[styles.nameText, item.isUser && styles.userNameText]}>
                {item.name} {item.isUser && '(Você)'}
                </Text>
                {item.isFocusing && (
                    <View style={styles.fireTag}>
                        <Text style={{fontSize: 12}}>🔥</Text>
                    </View>
                )}
            </View>
          </View>
        </View>

        <View style={styles.rankRight}>
          <Text style={styles.timeText}>{formatTimeDisplay(item.minutes)}</Text>
        </View>
      </PressableScale>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.background}>
        <View style={styles.glowOrb} />
        <View style={styles.glowOrbSecondary} />
      </View>
      {/* Header */}
      <View style={styles.header}>
        <PressableScale onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft color="#FFF" size={24} />
        </PressableScale>
        <Text style={styles.title}>Ranking</Text>
        <PressableScale onPress={() => router.push('/search' as any)} style={styles.searchButton}>
            <UserPlus color="#000" size={20} />
            <Text style={styles.searchButtonText}>Buscar</Text>
        </PressableScale>
      </View>

      {/* Scope Toggle */}
      <View style={styles.scopeToggle}>
          <PressableScale 
            style={[styles.scopeButton, scope === 'global' && styles.activeScope]}
            onPress={() => setScope('global')}
          >
              <Globe color={scope === 'global' ? '#FFF' : '#666'} size={16} />
              <Text style={[styles.scopeText, scope === 'global' && styles.activeScopeText]}>Global</Text>
          </PressableScale>
          <PressableScale 
            style={[styles.scopeButton, scope === 'following' && styles.activeScope]}
            onPress={() => setScope('following')}
          >
              <Users color={scope === 'following' ? '#FFF' : '#666'} size={16} />
              <Text style={[styles.scopeText, scope === 'following' && styles.activeScopeText]}>Seguindo</Text>
          </PressableScale>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <PressableScale 
          style={[styles.tab, period === 'daily' && styles.activeTab]}
          onPress={() => setPeriod('daily')}
        >
          <Text style={[styles.tabText, period === 'daily' && styles.activeTabText]}>Hoje</Text>
        </PressableScale>
        <PressableScale 
          style={[styles.tab, period === 'weekly' && styles.activeTab]}
          onPress={() => setPeriod('weekly')}
        >
          <Text style={[styles.tabText, period === 'weekly' && styles.activeTabText]}>Semana</Text>
        </PressableScale>
        <PressableScale 
          style={[styles.tab, period === 'monthly' && styles.activeTab]}
          onPress={() => setPeriod('monthly')}
        >
          <Text style={[styles.tabText, period === 'monthly' && styles.activeTabText]}>Mês</Text>
        </PressableScale>
      </View>

      {/* Podium */}
      {topThree.length > 0 && (
        <View style={styles.podiumCard}>
          <View style={styles.podiumHeader}>
            <View style={styles.podiumTitleWrap}>
              <Sparkles color={theme.colors.accent} size={16} />
              <Text style={styles.podiumTitle}>Destaques</Text>
            </View>
            <Text style={styles.podiumSubtitle}>
              {period === 'daily' ? 'Hoje' : period === 'weekly' ? 'Semana' : 'Mês'}
            </Text>
          </View>
          <View style={styles.podiumRow}>
            {topThree.map((item, index) => {
              const rank = index + 1;
              const medalColor = rank === 1 ? '#FDE047' : rank === 2 ? '#C0C0C0' : '#CD7F32';
              return (
                <View key={item.id} style={[styles.podiumItem, rank === 1 && styles.podiumItemChampion]}>
                  <View style={[styles.podiumBadge, { borderColor: medalColor }]}>
                    {rank === 1 ? <Crown color={medalColor} size={16} /> : <Text style={styles.podiumRank}>{rank}</Text>}
                  </View>
                  <View style={[styles.podiumAvatar, { backgroundColor: item.avatarColor }]}>
                    {item.avatarUrl ? (
                      <Image source={{ uri: item.avatarUrl }} style={styles.podiumAvatarImage} />
                    ) : (
                      <Text style={styles.podiumAvatarText}>{item.name.charAt(0)}</Text>
                    )}
                  </View>
                  <Text style={styles.podiumName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.podiumTime}>{formatTimeDisplay(item.minutes)}</Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {currentUser && currentUserRank && (
        <View style={styles.myRankCard}>
          <View>
            <Text style={styles.myRankLabel}>Sua posição</Text>
            <Text style={styles.myRankValue}>#{currentUserRank}</Text>
          </View>
          <View style={styles.myRankMeta}>
            <Text style={styles.myRankName}>{currentUser.name}</Text>
            <Text style={styles.myRankTime}>{formatTimeDisplay(currentUser.minutes)}</Text>
          </View>
        </View>
      )}

      <FlatList
        data={rankingData}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshing={false}
        onRefresh={loadRanking}
        ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Users2 color={theme.colors.accent} size={24} />
              </View>
              <Text style={styles.emptyTitle}>
                {scope === 'following' ? 'Sua comunidade ainda está vazia' : 'Sem dados no ranking'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {scope === 'following'
                  ? 'Siga pessoas para comparar desempenho e evoluir juntos.'
                  : 'Complete ciclos para aparecer no ranking.'}
              </Text>
              {scope === 'following' && (
                <PressableScale style={styles.emptyCta} onPress={() => router.push('/search' as any)}>
                  <UserPlus color="#000" size={18} />
                  <Text style={styles.emptyCtaText}>Encontrar pessoas</Text>
                </PressableScale>
              )}
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
    paddingTop: 50,
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
    top: -160,
    left: -140,
    backgroundColor: theme.colors.glowPrimary,
  },
  glowOrbSecondary: {
    position: 'absolute',
    width: 340,
    height: 340,
    borderRadius: 170,
    bottom: -200,
    right: -140,
    backgroundColor: theme.colors.glowSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 20,
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
  searchButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.accent,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 20,
      gap: 6,
      ...theme.shadow.accent,
  },
  searchButtonText: {
      color: theme.colors.accentDark,
      fontWeight: '700',
      fontSize: 12,
  },
  scopeToggle: {
      flexDirection: 'row',
      marginHorizontal: 20,
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      padding: 4,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
  },
  scopeButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 10,
      gap: 8,
      borderRadius: 10,
  },
  activeScope: {
      backgroundColor: theme.colors.surfaceSoft,
  },
  scopeText: {
      color: theme.colors.textMuted,
      fontWeight: '700',
  },
  activeScopeText: {
      color: '#FFF',
  },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 24,
    // borderBottomWidth: 1,
    // borderBottomColor: '#333',
    paddingBottom: 4,
  },
  tab: {
    marginRight: 20,
    paddingVertical: 8,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.accent,
  },
  tabText: {
    color: theme.colors.textMuted,
    fontWeight: '600',
    fontSize: 16,
  },
  activeTabText: {
    color: '#FFF',
  },
  podiumCard: {
    backgroundColor: theme.colors.surface,
    marginHorizontal: 20,
    borderRadius: theme.radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 16,
    ...theme.shadow.card,
  },
  podiumHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  podiumTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  podiumTitle: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  podiumSubtitle: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  podiumRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  podiumItem: {
    flex: 1,
    backgroundColor: theme.colors.surfaceSoft,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  podiumItemChampion: {
    borderColor: 'rgba(231, 184, 74, 0.6)',
    backgroundColor: 'rgba(231, 184, 74, 0.08)',
  },
  podiumBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  podiumRank: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  podiumAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  podiumAvatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  podiumAvatarText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 18,
  },
  podiumName: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  podiumTime: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  myRankCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(231, 184, 74, 0.5)',
    backgroundColor: 'rgba(231, 184, 74, 0.08)',
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  myRankLabel: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  myRankValue: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: '800',
  },
  myRankMeta: {
    alignItems: 'flex-end',
  },
  myRankName: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  myRankTime: {
    color: theme.colors.accent,
    fontSize: 12,
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  rankItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    padding: 16,
    borderRadius: theme.radius.lg,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadow.card,
  },
  userHighlight: {
    borderWidth: 1,
    borderColor: 'rgba(231, 184, 74, 0.6)',
    backgroundColor: 'rgba(231, 184, 74, 0.08)',
  },
  rankLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  positionContainer: {
    width: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  positionText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 18,
  },
  nameText: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  userNameText: {
    color: theme.colors.accent,
  },
  fireTag: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(255, 69, 0, 0.2)',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 8,
      gap: 4,
  },
  fireText: {
      color: '#FF4500',
      fontSize: 10,
      fontWeight: 'bold',
  },
  rankRight: {
    alignItems: 'flex-end',
  },
  timeText: {
    color: theme.colors.text, 
    fontWeight: '700',
    fontSize: 16,
    fontVariant: ['tabular-nums'],
  },
  emptyText: {
      color: theme.colors.textMuted,
      textAlign: 'center',
      marginTop: 40,
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
