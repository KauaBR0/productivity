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
    const mins = totalMinutes % 60;
    return `${hours.toString().padStart(2, '0')}h ${mins.toString().padStart(2, '0')}min`;
};

export const fetchRanking = async (
  period: 'daily' | 'weekly' | 'monthly',
  currentUserId: string | undefined
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
    const { data: sessions, error: sessionError } = await supabase
      .from('focus_sessions')
      .select('user_id, minutes')
      .gte('completed_at', startDateISO);

    if (sessionError) throw sessionError;

    // 3. Fetch All Profiles
    // Optimization: In a real app with many users, we would filter profiles by the user_ids found above 
    // OR use pagination. For "Squads" (Friends), we would filter by friend list.
    // Here we fetch all (prototype scale).
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, is_focusing');
      
    if (profileError) throw profileError;

    // 4. Aggregate Data
    const userMap: Record<string, number> = {};

    sessions?.forEach(session => {
        if (!userMap[session.user_id]) userMap[session.user_id] = 0;
        userMap[session.user_id] += session.minutes;
    });

    // 5. Build Ranking List
    const ranking: RankingUser[] = profiles?.map(profile => {
        // If user has 0 minutes but exists, show them? Or filter? 
        // Let's show them with 0 minutes to encourage them.
        const totalMinutes = userMap[profile.id] || 0;
        
        // Generate a random color for avatar if no URL (consistent by ID)
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
