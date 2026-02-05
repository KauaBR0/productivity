import { useState, useEffect, useCallback } from 'react';
import { fetchRanking, mergeRankingWithBots, RankingUser } from '@/utils/RankingLogic';
import { SocialService } from '@/services/SocialService';
import { useAuth } from '@/context/AuthContext';

export type RankingPeriod = 'daily' | 'weekly' | 'monthly';
export type RankingScope = 'global' | 'following' | 'contacts';

export const useRanking = (period: RankingPeriod, scope: RankingScope, contactsFilterIds: string[] | null) => {
  const { user } = useAuth();
  const [rankingData, setRankingData] = useState<RankingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRanking = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      let filterIds: string[] | undefined = undefined;
      
      if (scope === 'following') {
          filterIds = await SocialService.getMyFollowingIds(user.id);
      } else if (scope === 'contacts') {
          filterIds = contactsFilterIds || [];
      }

      const data = await fetchRanking(period, user.id, filterIds);
      const merged = scope === 'global'
        ? mergeRankingWithBots(data, { period, currentUserId: user.id })
        : data;
      setRankingData(merged);
    } catch (err: any) {
      console.error('[useRanking] Error:', err);
      setError(err.message || 'Erro ao carregar ranking.');
    } finally {
      setLoading(false);
    }
  }, [period, scope, user, contactsFilterIds]);

  useEffect(() => {
    loadRanking();
  }, [loadRanking]);

  return {
    rankingData,
    loading,
    error,
    refresh: loadRanking,
  };
};
