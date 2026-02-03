import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { StyleSheet, Text, View, FlatList, ActivityIndicator, Pressable, Animated, StyleProp, ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';
import { Calendar, Clock, History as HistoryIcon, Play } from 'lucide-react-native';
import { Theme } from '@/constants/theme';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';

const HistorySkeleton = ({ styles }: { styles: any }) => (
  <View style={styles.listContent}>
    {[1, 2, 3, 4, 5].map((i) => (
      <View key={i} style={styles.card}>
        <View style={styles.cardHeader}>
          <Skeleton width={140} height={18} />
          <Skeleton width={80} height={14} />
        </View>
        <View style={styles.cardBody}>
          <Skeleton width={120} height={16} />
          <Skeleton width={60} height={24} borderRadius={8} />
        </View>
      </View>
    ))}
  </View>
);

const HistoryItemComponent = React.memo(({ item, styles }: { item: HistoryItem; styles: any }) => {
  const formatDate = (dateString: string) => {
    if (!dateString) return 'Data desconhecida';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
  };

  const formatTime = (dateString: string) => {
    if (!dateString) return '--:--';
    const date = new Date(dateString);
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{item.label || 'Ciclo de Foco'}</Text>
        <View style={styles.dateContainer}>
           <Calendar color="#666" size={14} />
           <Text style={styles.dateText}>{formatDate(item.started_at || item.completed_at)}</Text>
        </View>
      </View>

      <View style={styles.cardBody}>
          <View style={styles.timeInfo}>
              <Clock color="#A1A1AA" size={16} />
              <Text style={styles.timeRange}>
                  {item.started_at ? formatTime(item.started_at) : '?'} - {formatTime(item.completed_at)}
              </Text>
          </View>
          <View style={styles.durationBadge}>
              <Text style={styles.durationText}>{Number(item.minutes).toFixed(2).replace(/\.00$/, '')} min</Text>
          </View>
      </View>
    </View>
  );
});

export default function HistoryScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { theme } = useSettings();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHistory = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('focus_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('completed_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setHistory(data || []);
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    setLoading(true);
    fetchHistory();
  }, [fetchHistory]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchHistory();
  }, [fetchHistory]);

  const renderItem = useCallback(({ item }: { item: HistoryItem }) => (
    <HistoryItemComponent item={item} styles={styles} />
  ), [styles]);

  return (
    <View style={styles.container}>
      <View style={styles.background}>
        <View style={styles.glowOrb} />
        <View style={styles.glowOrbSecondary} />
      </View>
      <View style={styles.header}>
        <Text style={styles.title}>Histórico de Foco</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading && !refreshing ? (
        <HistorySkeleton styles={styles} />
      ) : (
        <FlatList
            data={history}
            renderItem={renderItem}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.listContent}
            refreshing={refreshing}
            onRefresh={onRefresh}
            ListEmptyComponent={
                <EmptyState
                  theme={theme}
                  icon={HistoryIcon}
                  title="Seu histórico está vazio"
                  description="Conclua um ciclo de foco para começar a registrar seu progresso."
                  actionLabel="Iniciar foco"
                  onAction={() => router.push('/timer')}
                />
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
    width: 300,
    height: 300,
    borderRadius: 150,
    top: -160,
    right: -120,
    backgroundColor: theme.colors.glowPrimary,
  },
  glowOrbSecondary: {
    position: 'absolute',
    width: 340,
    height: 340,
    borderRadius: 170,
    bottom: -200,
    left: -140,
    backgroundColor: theme.colors.glowSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  title: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
  },
  listContent: {
      paddingHorizontal: 20,
      paddingBottom: 40,
  },
  card: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
      ...theme.shadow.card,
  },
  cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
  },
  cardTitle: {
      color: theme.colors.text,
      fontWeight: '700',
      fontSize: 15,
      letterSpacing: 0.2,
  },
  dateContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
  },
  dateText: {
      color: theme.colors.textMuted,
      fontSize: 12,
  },
  cardBody: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
  },
  timeInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
  },
  timeRange: {
      color: theme.colors.textDim,
      fontSize: 14,
  },
  durationBadge: {
      backgroundColor: 'rgba(231, 184, 74, 0.12)',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
  },
  durationText: {
      color: theme.colors.accent,
      fontWeight: '700',
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
