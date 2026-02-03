import { useState, useEffect, useCallback } from 'react';
import { SocialService, SocialProfile } from '@/services/SocialService';
import { useAuth } from '@/context/AuthContext';

export const useProfile = (targetUserId: string | undefined) => {
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState<SocialProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!targetUserId || !currentUser) return;
    
    setLoading(true);
    setError(null);
    try {
      const data = await SocialService.getUserProfile(targetUserId, currentUser.id);
      setProfile(data);
    } catch (err: any) {
      console.error('[useProfile] Error:', err);
      setError(err.message || 'Erro ao carregar perfil.');
    } finally {
      setLoading(false);
    }
  }, [targetUserId, currentUser]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return {
    profile,
    loading,
    error,
    refresh: fetchProfile,
  };
};
