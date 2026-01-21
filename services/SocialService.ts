import { supabase } from '../lib/supabase';

export interface SocialProfile {
  id: string;
  username: string;
  avatar_url: string | null;
  is_focusing?: boolean;
  followers_count?: number;
  following_count?: number;
  am_i_following?: boolean; // Helper for UI
}

export const SocialService = {
  // Buscar usuários pelo nome
  async searchUsers(query: string, currentUserId: string): Promise<SocialProfile[]> {
    if (!query) return [];

    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, is_focusing')
      .ilike('username', `%${query}%`)
      .neq('id', currentUserId) // Don't show myself
      .limit(20);

    if (error) throw error;
    return data || [];
  },

  // Pegar perfil completo de um usuário (com contagens e status de follow)
  async getUserProfile(targetUserId: string, currentUserId: string): Promise<SocialProfile | null> {
    // 1. Get Profile Data
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, is_focusing')
      .eq('id', targetUserId)
      .single();

    if (error) throw error;

    // 2. Get Counts
    const { count: followersCount } = await supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', targetUserId);

    const { count: followingCount } = await supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('follower_id', targetUserId);

    // 3. Check if I follow them
    const { data: followCheck } = await supabase
      .from('follows')
      .select('follower_id')
      .eq('follower_id', currentUserId)
      .eq('following_id', targetUserId)
      .single();

    return {
      ...profile,
      followers_count: followersCount || 0,
      following_count: followingCount || 0,
      am_i_following: !!followCheck,
    };
  },

  // Seguir
  async followUser(currentUserId: string, targetUserId: string) {
    const { error } = await supabase
      .from('follows')
      .insert({ follower_id: currentUserId, following_id: targetUserId });
    if (error) throw error;
  },

  // Deixar de seguir
  async unfollowUser(currentUserId: string, targetUserId: string) {
    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', currentUserId)
      .eq('following_id', targetUserId);
    if (error) throw error;
  },
  
  // Buscar IDs de quem eu sigo (para o Ranking)
  async getMyFollowingIds(currentUserId: string): Promise<string[]> {
      const { data, error } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', currentUserId);
      
      if(error) throw error;
      return data.map(row => row.following_id);
  }
};
