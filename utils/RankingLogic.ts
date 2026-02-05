import { supabase } from '../lib/supabase';

export interface RankingUser {
  id: string;
  name: string;
  minutes: number;
  isUser: boolean;
  avatarColor: string; // Placeholder for now or use avatar_url if available
  isFocusing: boolean;
  avatarUrl?: string;
  isBot?: boolean;
}

const BOT_NAMES = [
  'Ana',
  'Bruno',
  'Carla',
  'Davi',
  'Elisa',
  'Fabio',
  'Giulia',
  'Heitor',
  'Isis',
  'Joao',
  'Katia',
  'Luca',
  'Mila',
  'Noah',
  'Otavio',
  'Paula',
  'Raul',
  'Sara',
  'Theo',
  'Vera',
  'Yara',
  'Zeca',
  'Lia',
  'Bia',
  'Caio',
  'Nina',
  'Rafa',
  'Sofia',
  'Tomas',
  'Vitor',
];

const BOT_ALIASES = [
  'Focus',
  'Flow',
  'Zen',
  'Pulse',
  'Sprint',
  'Orbit',
  'Mind',
];

const BOT_COLORS = ['#FF4500', '#00FF94', '#00D4FF', '#FF0055', '#FFD600', '#BF5AF2'];
const BOT_TARGET_COUNT = 18;

const PERIOD_BOUNDS: Record<'daily' | 'weekly' | 'monthly', { min: number; max: number }> = {
  daily: { min: 30, max: 240 },
  weekly: { min: 240, max: 1800 },
  monthly: { min: 900, max: 7200 },
};

const xmur3 = (str: string) => {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
};

const mulberry32 = (seed: number) => {
  let t = seed;
  return () => {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
};

const createSeededRng = (seed: string) => {
  const seedFn = xmur3(seed);
  return mulberry32(seedFn());
};

const getPeriodSeed = (period: 'daily' | 'weekly' | 'monthly', date = new Date()) => {
  if (period === 'daily') {
    return date.toISOString().slice(0, 10);
  }
  if (period === 'weekly') {
    const start = new Date(date);
    const day = start.getDay();
    start.setDate(start.getDate() - day);
    start.setHours(0, 0, 0, 0);
    return start.toISOString().slice(0, 10);
  }
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

const pick = <T,>(list: T[], rng: () => number) => list[Math.floor(rng() * list.length)];

const buildBotName = (rng: () => number, index: number) => {
  const base = pick(BOT_NAMES, rng);
  const alias = pick(BOT_ALIASES, rng);
  const suffix = String.fromCharCode(65 + (index % 26));
  return `${base} ${alias} ${suffix}`;
};

const getBotBounds = (period: 'daily' | 'weekly' | 'monthly', ranking: RankingUser[]) => {
  const defaults = PERIOD_BOUNDS[period];
  if (!ranking.length) return { ...defaults };
  const realMax = Math.max(...ranking.map((item) => item.minutes));
  const min = Math.max(defaults.min, Math.round(realMax * 0.4));
  const max = Math.max(defaults.max, Math.round(realMax * 1.1));
  if (min >= max) {
    return { min: Math.max(defaults.min, max - 10), max };
  }
  return { min, max };
};

const buildBotMinutes = (count: number, rng: () => number, min: number, max: number) => {
  const values = Array.from({ length: count }, () => {
    const t = rng();
    const curved = Math.pow(t, 0.7);
    return Math.round(min + (max - min) * curved);
  });
  return values.sort((a, b) => b - a);
};

export const mergeRankingWithBots = (
  ranking: RankingUser[],
  options: {
    period: 'daily' | 'weekly' | 'monthly';
    currentUserId?: string;
    targetCount?: number;
    seed?: string;
  }
) => {
  const targetCount = options.targetCount ?? BOT_TARGET_COUNT;
  if (ranking.length >= targetCount) return ranking;
  const periodSeed = getPeriodSeed(options.period);
  const seed = options.seed ?? `${options.currentUserId || 'anon'}:${periodSeed}`;
  const rng = createSeededRng(seed);
  const botCount = Math.max(0, targetCount - ranking.length);
  if (!botCount) return ranking;

  const { min, max } = getBotBounds(options.period, ranking);
  const minutesList = buildBotMinutes(botCount, rng, min, max);
  const seedHash = xmur3(seed)().toString(36);

  const bots: RankingUser[] = minutesList.map((minutes, index) => {
    const name = buildBotName(rng, index);
    const color = pick(BOT_COLORS, rng);
    return {
      id: `bot_${seedHash}_${index}`,
      name,
      minutes,
      isUser: false,
      avatarColor: color,
      isFocusing: rng() < 0.18,
      avatarUrl: undefined,
      isBot: true,
    };
  });

  const combined = [...ranking, ...bots];
  combined.sort((a, b) => {
    if (b.minutes !== a.minutes) return b.minutes - a.minutes;
    if (a.isUser && !b.isUser) return -1;
    if (b.isUser && !a.isUser) return 1;
    if (a.isBot && !b.isBot) return 1;
    if (b.isBot && !a.isBot) return -1;
    return a.id.localeCompare(b.id);
  });
  return combined;
};

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
