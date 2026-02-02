import { supabase } from '../lib/supabase';

export interface SocialProfile {
  id: string;
  username: string;
  avatar_url: string | null;
  is_focusing?: boolean;
  phone?: string | null;
  followers_count?: number;
  following_count?: number;
  am_i_following?: boolean; // Helper for UI
  follows_me?: boolean;
  current_streak?: number;
  last_focus_date?: string | null;
  total_focus_minutes?: number;
  total_cycles?: number;
}

export interface FocusSessionSummary {
  id: number;
  label: string | null;
  minutes: number;
  started_at: string | null;
  completed_at: string | null;
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
    const { data, error } = await supabase.rpc('get_full_profile', {
      p_target_id: targetUserId,
      p_viewer_id: currentUserId,
    });

    if (error) throw error;
    if (!data || data.length === 0) return null;

    const profile = data[0];

    return {
      id: profile.id,
      username: profile.username,
      avatar_url: profile.avatar_url,
      is_focusing: profile.is_focusing,
      current_streak: profile.current_streak,
      last_focus_date: profile.last_focus_date,
      followers_count: Number(profile.followers_count),
      following_count: Number(profile.following_count),
      total_focus_minutes: Number(profile.total_focus_minutes),
      total_cycles: Number(profile.total_cycles),
      am_i_following: profile.am_i_following,
      follows_me: profile.follows_me,
    };
  },

  async getUserFocusHistory(targetUserId: string, limit = 20): Promise<FocusSessionSummary[]> {
    const { data, error } = await supabase
      .from('focus_sessions')
      .select('id, label, minutes, started_at, completed_at')
      .eq('user_id', targetUserId)
      .order('completed_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data || []) as FocusSessionSummary[];
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
  },

  async getFriendsCount(currentUserId: string): Promise<number> {
    const { data: following, error: followingError } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', currentUserId);

    if (followingError) throw followingError;

    const { data: followers, error: followersError } = await supabase
      .from('follows')
      .select('follower_id')
      .eq('following_id', currentUserId);

    if (followersError) throw followersError;

    const followingSet = new Set((following || []).map(row => row.following_id));
    const friends = (followers || []).filter(row => followingSet.has(row.follower_id));
    return friends.length;
  },

  async getFriends(currentUserId: string, page = 0, limit = 20): Promise<SocialProfile[]> {
    const { data: following, error: followingError } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', currentUserId);

    if (followingError) throw followingError;

    const { data: followers, error: followersError } = await supabase
      .from('follows')
      .select('follower_id')
      .eq('following_id', currentUserId);

    if (followersError) throw followersError;

    const followingSet = new Set((following || []).map(row => row.following_id));
    const allFriendIds = (followers || [])
      .filter(row => followingSet.has(row.follower_id))
      .map(row => row.follower_id);

    if (allFriendIds.length === 0) return [];

    // Paginate in memory (slice IDs)
    const paginatedIds = allFriendIds.slice(page * limit, (page + 1) * limit);
    if (paginatedIds.length === 0) return [];

    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, is_focusing, current_streak, last_focus_date, phone')
      .in('id', paginatedIds);

    if (profilesError) throw profilesError;

    return (profiles || []).sort((a, b) => {
      const focusing = Number(!!b.is_focusing) - Number(!!a.is_focusing);
      if (focusing !== 0) return focusing;
      return a.username.localeCompare(b.username);
    });
  },

  async matchContactsByPhones(currentUserId: string, phones: string[]): Promise<SocialProfile[]> {
    if (!phones.length) return [];
    const chunkSize = 500;
    const results: SocialProfile[] = [];
    for (let i = 0; i < phones.length; i += chunkSize) {
      const chunk = phones.slice(i, i + chunkSize);
      const { data, error } = await supabase.rpc('match_contact_phones', {
        current_user_id: currentUserId,
        phones: chunk,
      });
      if (error) throw error;
      if (data?.length) results.push(...data);
    }
    return results;
  },
};
