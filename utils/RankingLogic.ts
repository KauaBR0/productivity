import { supabase } from '../lib/supabase';

export interface RankingUser {
  id: string;
  name: string;
  minutes: number;
  isUser: boolean;
  avatarColor: string; // Placeholder for now or use avatar_url if available
  isFocusing: boolean;
  avatarUrl?: string;
}

export const formatTimeDisplay = (totalMinutes: number) => {
    const hours = Math.floor(totalMinutes / 60);
    const mins = Math.round(totalMinutes % 60);
    return `${hours.toString().padStart(2, '0')}h ${mins.toString().padStart(2, '0')}min`;
};

export const fetchRanking = async (
  period: 'daily' | 'weekly' | 'monthly',
  currentUserId: string | undefined,
  filterIds?: string[] // IDs to include (Squad)
): Promise<RankingUser[]> => {
  try {
    // 1. Determine Start Date
    const now = new Date();
    let startDate = new Date();

    if (period === 'daily') {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (period === 'weekly') {
        const day = now.getDay(); 
        const diff = now.getDate() - day; 
        startDate = new Date(now.setDate(diff));
        startDate.setHours(0, 0, 0, 0);
    } else {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }
    
    const startDateISO = startDate.toISOString();

    // 2. Fetch Sessions for the period
    // Optimization: Filter by user_ids if provided to avoid scanning full table
    let sessionQuery = supabase
      .from('focus_sessions')
      .select('user_id, minutes')
      .gte('completed_at', startDateISO);
    
    if (filterIds) {
        // If filterIds provided, include them + me
        const idsToFetch = currentUserId ? [...filterIds, currentUserId] : filterIds;
        if (idsToFetch.length > 0) {
            sessionQuery = sessionQuery.in('user_id', idsToFetch);
        } else {
             // Following no one, show only me
             if (currentUserId) sessionQuery = sessionQuery.eq('user_id', currentUserId);
        }
    }

    const { data: sessions, error: sessionError } = await sessionQuery;

    if (sessionError) throw sessionError;

    // 3. Fetch Profiles
    let profileQuery = supabase
      .from('profiles')
      .select('id, username, avatar_url, is_focusing');

    if (filterIds) {
        const idsToFetch = currentUserId ? [...filterIds, currentUserId] : filterIds;
        if (idsToFetch.length > 0) {
            profileQuery = profileQuery.in('id', idsToFetch);
        } else {
             if (currentUserId) profileQuery = profileQuery.eq('id', currentUserId);
        }
    }

    const { data: profiles, error: profileError } = await profileQuery;
      
    if (profileError) throw profileError;

    // 4. Aggregate Data
    const userMap: Record<string, number> = {};

    sessions?.forEach(session => {
        if (!userMap[session.user_id]) userMap[session.user_id] = 0;
        userMap[session.user_id] += session.minutes;
    });

    // 5. Build Ranking List
    const ranking: RankingUser[] = profiles?.map(profile => {
        const totalMinutes = userMap[profile.id] || 0;
        
        const colors = ['#FF4500', '#00FF94', '#00D4FF', '#FF0055', '#FFD600', '#BF5AF2'];
        const colorIndex = profile.id.charCodeAt(0) % colors.length;

        return {
            id: profile.id,
            name: profile.username || 'Anônimo',
            minutes: totalMinutes,
            isUser: profile.id === currentUserId,
            avatarColor: colors[colorIndex],
            isFocusing: profile.is_focusing || false,
            avatarUrl: profile.avatar_url || undefined
        };
    }) || [];

    // 6. Sort
    return ranking.sort((a, b) => b.minutes - a.minutes);

  } catch (error) {
    console.error('Error fetching ranking:', error);
    return [];
  }
};
