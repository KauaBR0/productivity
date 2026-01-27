import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { StyleSheet, Text, View, FlatList, Image, Pressable, Animated, StyleProp, ViewStyle, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';
import { fetchRanking, RankingUser, formatTimeDisplay } from '@/utils/RankingLogic';
import { GroupMembership, GroupService } from '@/services/GroupService';
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

export default function GroupRankingScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { theme } = useSettings();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [groups, setGroups] = useState<GroupMembership[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [rankingData, setRankingData] = useState<RankingUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  const fetchGroups = useCallback(async () => {
    if (!user) return;
    try {
      const data = await GroupService.getMyGroups(user.id);
      setGroups(data);
      if (data.length === 0) {
        setSelectedGroupId(null);
      } else if (!selectedGroupId) {
        setSelectedGroupId(data[0].group.id);
      }
    } catch (error) {
      console.error('Failed to load groups', error);
    }
  }, [user, selectedGroupId]);

  useFocusEffect(
    useCallback(() => {
      fetchGroups();
    }, [fetchGroups])
  );

  const loadGroupRanking = useCallback(async () => {
    if (!selectedGroupId || !user) {
      setRankingData([]);
      return;
    }
    setLoading(true);
    try {
      const memberIds = await GroupService.getGroupMemberIds(selectedGroupId);
      const data = await fetchRanking(period, user.id, memberIds);
      setRankingData(data);
    } catch (error) {
      console.error('Failed to load group ranking', error);
    } finally {
      setLoading(false);
    }
  }, [selectedGroupId, period, user]);

  useEffect(() => {
    loadGroupRanking();
  }, [loadGroupRanking]);

  const renderItem = ({ item, index }: { item: RankingUser; index: number }) => {
    const isTop3 = index < 3;
    let medalColor = '#333';
    let medalIcon = null;

    if (index === 0) { medalColor = '#FFD700'; medalIcon = '🥇'; }
    if (index === 1) { medalColor = '#C0C0C0'; medalIcon = '🥈'; }
    if (index === 2) { medalColor = '#CD7F32'; medalIcon = '🥉'; }

    return (
      <PressableScale
        style={[styles.rankItem, item.isUser && styles.userHighlight]}
        onPress={() => item.isUser ? router.push('/profile') : router.push(`/user/${item.id}` as any)}
      >
        <View style={styles.rankLeft}>
          <View style={styles.positionContainer}>
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
            <Text style={[styles.nameText, item.isUser && styles.userNameText]}>
              {item.name} {item.isUser && '(Você)'}
            </Text>
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

      <View style={styles.header}>
        <PressableScale onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft color="#FFF" size={22} />
        </PressableScale>
        <View>
          <Text style={styles.title}>Ranking de grupos</Text>
          <Text style={styles.subtitle}>Compare seu grupo com base em foco</Text>
        </View>
        <PressableScale onPress={() => router.push('/groups' as any)} style={styles.manageButton}>
          <Text style={styles.manageButtonText}>Gerenciar</Text>
        </PressableScale>
      </View>

      <View style={styles.tabs}>
        <PressableScale style={[styles.tab, period === 'daily' && styles.activeTab]} onPress={() => setPeriod('daily')}>
          <Text style={[styles.tabText, period === 'daily' && styles.activeTabText]}>Hoje</Text>
        </PressableScale>
        <PressableScale style={[styles.tab, period === 'weekly' && styles.activeTab]} onPress={() => setPeriod('weekly')}>
          <Text style={[styles.tabText, period === 'weekly' && styles.activeTabText]}>Semana</Text>
        </PressableScale>
        <PressableScale style={[styles.tab, period === 'monthly' && styles.activeTab]} onPress={() => setPeriod('monthly')}>
          <Text style={[styles.tabText, period === 'monthly' && styles.activeTabText]}>Mês</Text>
        </PressableScale>
      </View>

      {groups.length > 0 ? (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.groupChips}>
            {groups.map((membership) => (
              <PressableScale
                key={membership.group.id}
                style={[
                  styles.groupChip,
                  selectedGroupId === membership.group.id && styles.groupChipActive,
                ]}
                onPress={() => setSelectedGroupId(membership.group.id)}
              >
                <Text
                  style={[
                    styles.groupChipText,
                    selectedGroupId === membership.group.id && styles.groupChipTextActive,
                  ]}
                >
                  {membership.group.name}
                </Text>
              </PressableScale>
            ))}
          </ScrollView>

          {loading ? (
            <ActivityIndicator color={theme.colors.accent} style={{ marginTop: 20 }} />
          ) : (
            <FlatList
              data={rankingData}
              renderItem={renderItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              ListHeaderComponent={
                rankingData.length > 0 ? (
                  <View style={styles.podiumHeader}>
                    <View style={styles.podiumTitleWrap}>
                      <Sparkles color={theme.colors.accent} size={16} />
                      <Text style={styles.podiumTitle}>Destaques</Text>
                    </View>
                  </View>
                ) : null
              }
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Text style={styles.emptyTitle}>Sem dados para este grupo</Text>
                  <Text style={styles.emptySubtitle}>Complete ciclos para aparecer no ranking.</Text>
                </View>
              }
            />
          )}
        </>
      ) : (
        <View style={styles.groupEmpty}>
          <View style={styles.groupEmptyIcon}>
            <Users color={theme.colors.accent} size={20} />
          </View>
          <Text style={styles.groupEmptyTitle}>Voce ainda nao tem grupos</Text>
          <Text style={styles.groupEmptySubtitle}>Crie um grupo ou entre com um codigo.</Text>
          <PressableScale onPress={() => router.push('/groups' as any)} style={styles.groupCta}>
            <Text style={styles.groupCtaText}>Criar ou entrar</Text>
          </PressableScale>
        </View>
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
    width: 300,
    height: 300,
    borderRadius: 150,
    top: -180,
    left: -140,
    backgroundColor: theme.colors.glowPrimary,
  },
  glowOrbSecondary: {
    position: 'absolute',
    width: 340,
    height: 340,
    borderRadius: 170,
    bottom: -220,
    right: -140,
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
  manageButton: {
    marginLeft: 'auto',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSoft,
  },
  manageButtonText: {
    color: theme.colors.text,
    fontWeight: '700',
    fontSize: 12,
  },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 16,
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
  groupChips: {
    paddingHorizontal: 20,
    gap: 8,
    paddingBottom: 8,
  },
  groupChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSoft,
  },
  groupChipActive: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  groupChipText: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  groupChipTextActive: {
    color: theme.colors.accentDark,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 8,
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
  rankRight: {
    alignItems: 'flex-end',
  },
  timeText: {
    color: theme.colors.text,
    fontWeight: '700',
    fontSize: 16,
    fontVariant: ['tabular-nums'],
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
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    gap: 10,
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
  groupEmpty: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    gap: 10,
  },
  groupEmptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(231, 184, 74, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(231, 184, 74, 0.4)',
  },
  groupEmptyTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  groupEmptySubtitle: {
    color: theme.colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  groupCta: {
    marginTop: 6,
    backgroundColor: theme.colors.accent,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
  },
  groupCtaText: {
    color: theme.colors.accentDark,
    fontWeight: '700',
  },
});
