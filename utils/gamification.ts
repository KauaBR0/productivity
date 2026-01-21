import type { Achievement, UserStats } from '../constants/GamificationConfig';

export const getDateKey = (date: Date) => date.toISOString().split('T')[0];

export const getNewStreak = (stats: UserStats, now: Date) => {
  const today = getDateKey(now);
  const lastDate = stats.lastFocusDate;

  if (lastDate === today) {
    return stats.currentStreak;
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = getDateKey(yesterday);

  if (lastDate === yesterdayStr) {
    return stats.currentStreak + 1;
  }

  return 1;
};

export const calculateXp = ({
  minutes,
  newStreak,
  lastFocusDate,
  today,
}: {
  minutes: number;
  newStreak: number;
  lastFocusDate: string | null;
  today: string;
}) => {
  let gainedXp = minutes * 10;

  if (newStreak > 1 && lastFocusDate !== today) {
    gainedXp += newStreak * 5;
  }

  return gainedXp;
};

export const evaluateAchievements = (
  achievements: Achievement[],
  stats: UserStats,
  unlockedIds: string[]
) => {
  const newUnlocked = [...unlockedIds];
  const newlyUnlockedIds: string[] = [];
  let xpReward = 0;

  achievements.forEach((achievement) => {
    if (newUnlocked.includes(achievement.id)) return;
    if (!achievement.condition(stats)) return;
    newUnlocked.push(achievement.id);
    newlyUnlockedIds.push(achievement.id);
    xpReward += achievement.xpReward;
  });

  return { newUnlocked, newlyUnlockedIds, xpReward };
};
