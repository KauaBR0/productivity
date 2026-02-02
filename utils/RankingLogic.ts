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
    const nowISO = new Date().toISOString();

    // CALL DATABASE FUNCTION (RPC)
    // This performs aggregation on the server, saving bandwidth and CPU.
    const { data: rankingData, error } = await supabase.rpc('get_ranking_data', {
        p_start_date: startDateISO,
        p_end_date: nowISO,
        p_user_ids: filterIds && filterIds.length > 0 ? filterIds : null // Pass array or null for global
    });

    if (error) {
        console.error('RPC Error (fallback to legacy?):', error);
        throw error;
    }

    // 5. Map to UI Model
    // Note: The RPC handles sorting and limiting.
    const ranking: RankingUser[] = (rankingData || []).map((row: any) => {
        const colors = ['#FF4500', '#00FF94', '#00D4FF', '#FF0055', '#FFD600', '#BF5AF2'];
        // Safe check for ID if row.id is missing (shouldn't happen with correct RPC)
        const id = row.id || 'unknown'; 
        const colorIndex = id.charCodeAt(0) % colors.length;

        return {
            id: id,
            name: row.username || 'Anônimo',
            minutes: Number(row.minutes), // Ensure number
            isUser: id === currentUserId,
            avatarColor: colors[colorIndex],
            isFocusing: row.is_focusing || false,
            avatarUrl: row.avatar_url || undefined
        };
    });

    return ranking; // Already sorted by RPC

  } catch (error) {
    console.error('Error fetching ranking:', error);
    return [];
  }
};
