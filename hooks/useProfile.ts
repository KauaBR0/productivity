import { useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useProfileStore } from '@/store/useProfileStore';

export const useProfile = (targetUserId: string | undefined) => {
  const { user: currentUser } = useAuth();
  const currentUserId = currentUser?.id;
  const setViewerId = useProfileStore((state) => state.setViewerId);
  const getProfile = useProfileStore((state) => state.getProfile);
  const refreshProfile = useProfileStore((state) => state.refreshProfile);
  const profile = useProfileStore((state) =>
    targetUserId ? state.profiles[targetUserId] ?? null : null
  );
  const rawLoading = useProfileStore((state) =>
    targetUserId ? state.loading[targetUserId] ?? false : false
  );
  const error = useProfileStore((state) =>
    targetUserId ? state.errors[targetUserId] ?? null : null
  );
  const fetchedAt = useProfileStore((state) =>
    targetUserId ? state.fetchedAt[targetUserId] : undefined
  );

  useEffect(() => {
    setViewerId(currentUserId ?? null);
  }, [currentUserId, setViewerId]);

  useEffect(() => {
    if (!targetUserId || !currentUserId) return;
    getProfile(targetUserId, currentUserId);
  }, [targetUserId, currentUserId, getProfile]);

  const refresh = useCallback(() => {
    if (!targetUserId || !currentUserId) return Promise.resolve(null);
    return refreshProfile(targetUserId, currentUserId);
  }, [targetUserId, currentUserId, refreshProfile]);

  const loading =
    rawLoading || (!!targetUserId && !!currentUserId && !fetchedAt && !error);

  return {
    profile,
    loading,
    error,
    refresh,
  };
};
