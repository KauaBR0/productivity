import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { ACHIEVEMENTS, LEVELS, UserStats } from '../constants/GamificationConfig';
import { calculateXp, evaluateAchievements, getDateKey, getNewStreak } from '../utils/gamification';

interface FocusSession {
  timestamp: number;
  minutes: number;
  startedAt?: number;
  label?: string;
}

interface GamificationContextType {
  xp: number;
  level: number;
  stats: UserStats;
  streak: number;
  streakActive: boolean;
  history: FocusSession[];
  isFocusing: boolean;
  setIsFocusing: (status: boolean) => Promise<void>;
  unlockedAchievements: string[];
  recentUnlockedIds: string[];
  processCycleCompletion: (minutes: number, startedAt: number, label: string) => Promise<void>;
  nextLevelXp: number;
  progressToNextLevel: number; // 0 to 1
  getPeriodStats: (period: 'daily' | 'weekly' | 'monthly') => number;
}

const GamificationContext = createContext<GamificationContextType | undefined>(undefined);

export const GamificationProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [xp, setXp] = useState(0);
  const [level, setLevel] = useState(1);
  const [stats, setStats] = useState<UserStats>({ 
      totalFocusMinutes: 0, 
      completedCycles: 0,
      currentStreak: 0,
      lastFocusDate: null 
  });
  const [history, setHistory] = useState<FocusSession[]>([]);
  const [unlockedAchievements, setUnlockedAchievements] = useState<string[]>([]);
  const [recentUnlockedIds, setRecentUnlockedIds] = useState<string[]>([]);
  const [isFocusing, _setIsFocusing] = useState(false);
  const recentUnlockTimeout = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      // 1. Load Local (Optimistic)
      try {
        const storedXp = await AsyncStorage.getItem('user_xp');
        const storedLevel = await AsyncStorage.getItem('user_level');
        const storedStats = await AsyncStorage.getItem('user_stats');
        const storedAchievements = await AsyncStorage.getItem('user_achievements');
        const storedHistory = await AsyncStorage.getItem('user_history');

        if (storedXp) setXp(Number(storedXp));
        if (storedLevel) setLevel(Number(storedLevel));
        if (storedStats) setStats(JSON.parse(storedStats));
        if (storedAchievements) setUnlockedAchievements(JSON.parse(storedAchievements));
        if (storedHistory) setHistory(JSON.parse(storedHistory));
      } catch (error) {
        console.error('Failed to load local data:', error);
      }

      // 2. Load Real from Supabase (Sync)
      if (user) {
          try {
              // Fetch Stats Aggregates
              const { data: sessions, error: sessionsError } = await supabase
                  .from('focus_sessions')
                  .select('minutes')
                  .eq('user_id', user.id);

              if (!sessionsError && sessions) {
                  const totalMinutes = sessions.reduce((acc, curr) => acc + curr.minutes, 0);
                  const totalCycles = sessions.length;
                  
                  // Fetch Profile Stats (Streak)
                  const { data: profile, error: profileError } = await supabase
                      .from('profiles')
                      .select('current_streak, last_focus_date')
                      .eq('id', user.id)
                      .single();

                  setStats(prev => ({
                      ...prev,
                      totalFocusMinutes: totalMinutes,
                      completedCycles: totalCycles,
                      currentStreak: profile?.current_streak || prev.currentStreak,
                      lastFocusDate: profile?.last_focus_date || prev.lastFocusDate
                  }));
              }
          } catch (err) {
              console.error("Failed to sync with Supabase:", err);
          }
      }
    };

    loadData();
  }, [user]);

  const saveState = async (newXp: number, newLevel: number, newStats: UserStats, newAchievements: string[], newHistory: FocusSession[]) => {
    try {
      await AsyncStorage.setItem('user_xp', String(newXp));
      await AsyncStorage.setItem('user_level', String(newLevel));
      await AsyncStorage.setItem('user_stats', JSON.stringify(newStats));
      await AsyncStorage.setItem('user_achievements', JSON.stringify(newAchievements));
      await AsyncStorage.setItem('user_history', JSON.stringify(newHistory));
    } catch (error) {
      console.error('Failed to save gamification data:', error);
    }
  };

  const getLevelForXp = (currentXp: number) => {
    // Find the highest level where xpRequired <= currentXp
    // We reverse the array to find the highest match first
    const levelObj = [...LEVELS].reverse().find(l => currentXp >= l.xpRequired);
    return levelObj ? levelObj.level : 1;
  };

  const getNextLevelXp = (currentLevel: number) => {
    const nextLvl = LEVELS.find(l => l.level === currentLevel + 1);
    return nextLvl ? nextLvl.xpRequired : LEVELS[LEVELS.length - 1].xpRequired * 1.5; // Fallback for max level
  };

  const setIsFocusing = async (status: boolean) => {
      _setIsFocusing(status);
      if (user) {
          try {
              await supabase.from('profiles').update({ is_focusing: status }).eq('id', user.id);
          } catch (error) {
              console.error("Failed to sync focus status:", error);
          }
      }
  };

  const processCycleCompletion = async (rawMinutes: number, startedAt: number, label: string) => {
    const minutes = Math.ceil(rawMinutes); // Normalize to integer for consistency

    // Calculate Streak
    const now = new Date();
    const today = getDateKey(now); // YYYY-MM-DD
    const lastDate = stats.lastFocusDate;
    const newStreak = getNewStreak(stats, now);

    let newStats = {
      totalFocusMinutes: stats.totalFocusMinutes + minutes,
      completedCycles: stats.completedCycles + 1,
      currentStreak: newStreak,
      lastFocusDate: today
    };

    // Update History
    const newSession: FocusSession = { timestamp: Date.now(), minutes, startedAt, label };
    const newHistory = [...history, newSession];

    // 1. Calculate base XP (e.g., 10 XP per minute)
    const gainedXp = calculateXp({
      minutes,
      newStreak,
      lastFocusDate: lastDate,
      today,
    });
    
    // 2. Check for new achievements
    const { newUnlocked, newlyUnlockedIds, xpReward: achievementXp } = evaluateAchievements(
      ACHIEVEMENTS,
      newStats,
      unlockedAchievements
    );

    newlyUnlockedIds.forEach((id) => {
      const achievement = ACHIEVEMENTS.find((item) => item.id === id);
      if (achievement) {
        Alert.alert('🏆 Conquista Desbloqueada!', `${achievement.title}\n+${achievement.xpReward} XP`);
      }
    });

    // 3. Update Totals
    let totalNewXp = xp + gainedXp + achievementXp;
    let newLevel = getLevelForXp(totalNewXp);

    if (newLevel > level) {
      Alert.alert('🎉 LEVEL UP!', `Você alcançou o nível ${newLevel}!`);
    }

    // Update State
    setStats(newStats);
    setUnlockedAchievements(newUnlocked);
    setXp(totalNewXp);
    setLevel(newLevel);
    setHistory(newHistory);

    if (newlyUnlockedIds.length > 0) {
      setRecentUnlockedIds(newlyUnlockedIds);
      if (recentUnlockTimeout.current) {
        clearTimeout(recentUnlockTimeout.current);
      }
      recentUnlockTimeout.current = setTimeout(() => {
        setRecentUnlockedIds([]);
      }, 6000);
    }
    
    // Turn off focus
    await setIsFocusing(false); 

    // Persist Local
    await saveState(totalNewXp, newLevel, newStats, newUnlocked, newHistory);

    // Sync to Supabase
    if (user) {
        try {
            // Insert Session
            const { error: sessionError } = await supabase.from('focus_sessions').insert({
                user_id: user.id,
                minutes: minutes,
                started_at: new Date(startedAt).toISOString(),
                completed_at: new Date().toISOString(),
                label: label,
            });

            if (sessionError) {
                console.error('Supabase session insert error:', sessionError);
                Alert.alert('Erro de Sincronização', `Não foi possível salvar sua sessão: ${sessionError.message}`);
            }

            // Update Profile Stats
            await supabase.from('profiles').update({
                current_streak: newStreak,
                last_focus_date: today,
                // optionally longest_streak logic handled by DB trigger or separate check
            }).eq('id', user.id);

        } catch (error) {
            console.error('Failed to sync session/stats to Supabase:', error);
        }
    }
  };

  const getPeriodStats = (period: 'daily' | 'weekly' | 'monthly'): number => {
      const now = new Date();
      let startTime = 0;

      if (period === 'daily') {
          const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          startTime = startOfDay.getTime();
      } else if (period === 'weekly') {
          // Assuming Sunday is start of week
          const day = now.getDay(); // 0 is Sunday
          const diff = now.getDate() - day; // adjust when day is sunday
          const startOfWeek = new Date(now.setDate(diff));
          startOfWeek.setHours(0, 0, 0, 0);
          startTime = startOfWeek.getTime();
      } else if (period === 'monthly') {
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          startTime = startOfMonth.getTime();
      }

      return history
        .filter(session => session.timestamp >= startTime)
        .reduce((acc, curr) => acc + curr.minutes, 0);
  };

  // Derived state helpers
  const nextLevelXpThreshold = getNextLevelXp(level);
  const currentLevelBaseXp = LEVELS.find(l => l.level === level)?.xpRequired || 0;
  
  // Progress within the current level
  const progressToNextLevel = Math.min(
    Math.max((xp - currentLevelBaseXp) / (nextLevelXpThreshold - currentLevelBaseXp), 0),
    1
  );

  const streakActive = stats.lastFocusDate === new Date().toISOString().split('T')[0];

  return (
    <GamificationContext.Provider 
      value={{
        xp, 
        level, 
        stats, 
        streak: stats.currentStreak,
        streakActive,
        history,
        isFocusing,
        setIsFocusing,
        unlockedAchievements, 
        recentUnlockedIds,
        processCycleCompletion,
        nextLevelXp: nextLevelXpThreshold,
        progressToNextLevel,
        getPeriodStats
      }}
    >
      {children}
    </GamificationContext.Provider>
  );
};

export const useGamification = () => {
  const context = useContext(GamificationContext);
  if (context === undefined) {
    throw new Error('useGamification must be used within a GamificationProvider');
  }
  return context;
};
