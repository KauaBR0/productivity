import { calculateXp, evaluateAchievements, getDateKey, getNewStreak } from '../utils/gamification';
import type { Achievement, UserStats } from '../constants/GamificationConfig';

describe('gamification helpers', () => {
  const baseStats: UserStats = {
    totalFocusMinutes: 120,
    completedCycles: 4,
    currentStreak: 3,
    lastFocusDate: null,
  };

  it('getNewStreak keeps streak when already focused today', () => {
    const now = new Date('2026-01-21T10:00:00.000Z');
    const stats = { ...baseStats, lastFocusDate: getDateKey(now), currentStreak: 5 };
    expect(getNewStreak(stats, now)).toBe(5);
  });

  it('getNewStreak increments when last focus was yesterday', () => {
    const now = new Date('2026-01-21T10:00:00.000Z');
    const yesterday = new Date('2026-01-20T10:00:00.000Z');
    const stats = { ...baseStats, lastFocusDate: getDateKey(yesterday), currentStreak: 4 };
    expect(getNewStreak(stats, now)).toBe(5);
  });

  it('getNewStreak resets after a gap', () => {
    const now = new Date('2026-01-21T10:00:00.000Z');
    const twoDaysAgo = new Date('2026-01-19T10:00:00.000Z');
    const stats = { ...baseStats, lastFocusDate: getDateKey(twoDaysAgo), currentStreak: 6 };
    expect(getNewStreak(stats, now)).toBe(1);
  });

  it('calculateXp applies streak bonus only on a new day', () => {
    const today = '2026-01-21';
    expect(calculateXp({ minutes: 20, newStreak: 3, lastFocusDate: '2026-01-20', today })).toBe(215);
    expect(calculateXp({ minutes: 20, newStreak: 3, lastFocusDate: today, today })).toBe(200);
  });

  it('evaluateAchievements returns new unlocks and XP reward', () => {
    const achievements: Achievement[] = [
      { id: 'a', title: 'A', description: 'A', icon: 'trophy', xpReward: 50, condition: (s) => s.completedCycles >= 1 },
      { id: 'b', title: 'B', description: 'B', icon: 'trophy', xpReward: 100, condition: (s) => s.totalFocusMinutes >= 200 },
    ];
    const stats = { ...baseStats, completedCycles: 2, totalFocusMinutes: 220 };
    const result = evaluateAchievements(achievements, stats, []);
    expect(result.newUnlocked).toEqual(['a', 'b']);
    expect(result.newlyUnlockedIds).toEqual(['a', 'b']);
    expect(result.xpReward).toBe(150);
  });
});
