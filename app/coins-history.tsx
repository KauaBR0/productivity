import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, AlertTriangle, Gem, Coins } from 'lucide-react-native';
import { useSettings } from '@/context/SettingsContext';
import { useAuth } from '@/context/AuthContext';
import { CoinTransaction, ReferralService } from '@/services/ReferralService';
import { Theme } from '@/constants/theme';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { PressableScale } from '@/components/PressableScale';

const CoinsHistorySkeleton = ({ styles }: { styles: any }) => (
  <View style={styles.listContent}>
    {[1, 2, 3, 4, 5].map((i) => (
      <View key={i} style={styles.card}>
        <View style={styles.cardHeader}>
          <Skeleton width={170} height={16} />
          <Skeleton width={70} height={20} borderRadius={8} />
        </View>
        <Skeleton width={110} height={12} />
      </View>
    ))}
  </View>
);

const reasonLabelMap: Record<string, string> = {
  referral_inviter_bonus: 'Bonus por indicar amigo',
  referral_invitee_bonus: 'Bonus por entrar com indicacao',
};

const formatDateTime = (value: string) => {
  const date = new Date(value);
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const toNumber = (value: number) => Number.isFinite(value) ? value : 0;

const formatAmount = (amount: number) => {
  const normalized = toNumber(amount);
  const signal = normalized > 0 ? '+' : '';
  return `${signal}${normalized} moedas`;
};

const CounterpartyInfo = ({ transaction, styles }: { transaction: CoinTransaction; styles: any }) => {
  const metadata = transaction.metadata || {};
  const invitee = typeof metadata.invitee_id === 'string' ? metadata.invitee_id : null;
  const inviter = typeof metadata.inviter_id === 'string' ? metadata.inviter_id : null;

  if (invitee) {
    return <Text style={styles.metaText}>Convidado: {invitee.slice(0, 8)}...</Text>;
  }

  if (inviter) {
    return <Text style={styles.metaText}>Indicador: {inviter.slice(0, 8)}...</Text>;
  }

  return null;
};

const TransactionItem = React.memo(
  ({ item, styles }: { item: CoinTransaction; styles: any }) => {
    const reasonLabel = reasonLabelMap[item.reason] || item.reason;
    const isPositive = item.amount > 0;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{reasonLabel}</Text>
          <View style={[styles.amountPill, isPositive ? styles.amountPillPositive : styles.amountPillNegative]}>
            <Text style={[styles.amountText, isPositive ? styles.amountTextPositive : styles.amountTextNegative]}>
              {formatAmount(item.amount)}
            </Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.dateText}>{formatDateTime(item.createdAt)}</Text>
          <CounterpartyInfo transaction={item} styles={styles} />
        </View>
      </View>
    );
  }
);

TransactionItem.displayName = 'TransactionItem';

export default function CoinsHistoryScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { theme } = useSettings();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [transactions, setTransactions] = useState<CoinTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTransactions = useCallback(async () => {
    if (!user) return;

    setError(null);
    try {
      const data = await ReferralService.getMyCoinTransactions(80);
      setTransactions(data);
    } catch (err) {
      console.error('Failed to load coin transactions:', err);
      setError('Nao foi possivel carregar seu extrato agora.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    setLoading(true);
    fetchTransactions();
  }, [fetchTransactions]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchTransactions();
  }, [fetchTransactions]);

  const renderItem = useCallback(
    ({ item }: { item: CoinTransaction }) => <TransactionItem item={item} styles={styles} />,
    [styles]
  );

  const showErrorState = !!error && transactions.length === 0 && !loading;

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
          <Text style={styles.title}>Extrato de moedas</Text>
          <Text style={styles.subtitle}>Historico de ganhos</Text>
        </View>
      </View>

      {loading && !refreshing ? (
        <CoinsHistorySkeleton styles={styles} />
      ) : showErrorState ? (
        <EmptyState
          theme={theme}
          icon={AlertTriangle}
          title="Erro ao carregar extrato"
          description={error || 'Tente novamente em instantes.'}
          actionLabel="Tentar novamente"
          onAction={fetchTransactions}
        />
      ) : (
        <FlatList
          data={transactions}
          renderItem={renderItem}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          onRefresh={onRefresh}
          refreshing={refreshing}
          ListHeaderComponent={
            <View style={styles.tipCard}>
              <View style={styles.tipIcon}>
                <Coins color={theme.colors.accent} size={16} />
              </View>
              <Text style={styles.tipText}>
                As moedas sao creditadas quando a indicacao conclui o primeiro ciclo qualificado.
              </Text>
            </View>
          }
          ListEmptyComponent={
            <EmptyState
              theme={theme}
              icon={Gem}
              title="Sem movimentacoes ainda"
              description="Convide amigos com seu codigo para comecar a acumular moedas."
              actionLabel="Voltar ao perfil"
              onAction={() => router.back()}
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
    listContent: {
      paddingHorizontal: 20,
      paddingBottom: 40,
      gap: 12,
    },
    tipCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: 12,
      marginBottom: 8,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    tipIcon: {
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(231, 184, 74, 0.14)',
      borderWidth: 1,
      borderColor: 'rgba(231, 184, 74, 0.4)',
    },
    tipText: {
      color: theme.colors.textMuted,
      fontSize: 12,
      flex: 1,
      lineHeight: 16,
    },
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: 14,
      ...theme.shadow.card,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
      gap: 8,
    },
    cardTitle: {
      color: theme.colors.text,
      fontSize: 14,
      fontWeight: '700',
      flex: 1,
    },
    amountPill: {
      borderRadius: 999,
      borderWidth: 1,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    amountPillPositive: {
      backgroundColor: 'rgba(16, 185, 129, 0.14)',
      borderColor: 'rgba(16, 185, 129, 0.45)',
    },
    amountPillNegative: {
      backgroundColor: 'rgba(239, 68, 68, 0.14)',
      borderColor: 'rgba(239, 68, 68, 0.45)',
    },
    amountText: {
      fontSize: 12,
      fontWeight: '700',
    },
    amountTextPositive: {
      color: '#10B981',
    },
    amountTextNegative: {
      color: '#EF4444',
    },
    cardFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    dateText: {
      color: theme.colors.textMuted,
      fontSize: 12,
    },
    metaText: {
      color: theme.colors.textDim,
      fontSize: 11,
    },
  });
