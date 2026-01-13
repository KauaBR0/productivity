import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { ACHIEVEMENTS, LEVELS, UserStats, Achievement } from '../constants/GamificationConfig';

interface FocusSession {
  timestamp: number;
  minutes: number;
}

interface GamificationContextType {
  xp: number;
  level: number;
  stats: UserStats;
  history: FocusSession[];
  isFocusing: boolean;
  setIsFocusing: (status: boolean) => Promise<void>;
  unlockedAchievements: string[];
  processCycleCompletion: (minutes: number) => Promise<void>;
  nextLevelXp: number;
  progressToNextLevel: number; // 0 to 1
  getPeriodStats: (period: 'daily' | 'weekly' | 'monthly') => number;
}

const GamificationContext = createContext<GamificationContextType | undefined>(undefined);

export const GamificationProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [xp, setXp] = useState(0);
  const [level, setLevel] = useState(1);
  const [stats, setStats] = useState<UserStats>({ totalFocusMinutes: 0, completedCycles: 0 });
  const [history, setHistory] = useState<FocusSession[]>([]);
  const [unlockedAchievements, setUnlockedAchievements] = useState<string[]>([]);
  const [isFocusing, _setIsFocusing] = useState(false);

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
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
        console.error('Failed to load gamification data:', error);
      }
    };

    loadData();
  }, []);

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

  const processCycleCompletion = async (minutes: number) => {
    let newStats = {
      totalFocusMinutes: stats.totalFocusMinutes + minutes,
      completedCycles: stats.completedCycles + 1,
    };

    // Update History
    const newSession: FocusSession = { timestamp: Date.now(), minutes };
    const newHistory = [...history, newSession];

    // 1. Calculate base XP (e.g., 10 XP per minute)
    let gainedXp = minutes * 10;
    
    // 2. Check for new achievements
    let newUnlocked = [...unlockedAchievements];
    let achievementXp = 0;

    ACHIEVEMENTS.forEach(achievement => {
      if (!newUnlocked.includes(achievement.id)) {
        if (achievement.condition(newStats)) {
          newUnlocked.push(achievement.id);
          achievementXp += achievement.xpReward;
          Alert.alert('🏆 Conquista Desbloqueada!', `${achievement.title}\n+${achievement.xpReward} XP`);
        }
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
    
    // Turn off focus
    await setIsFocusing(false); 

    // Persist Local
    await saveState(totalNewXp, newLevel, newStats, newUnlocked, newHistory);

    // Sync to Supabase
    if (user) {
        try {
            const { error } = await supabase.from('focus_sessions').insert({
                user_id: user.id,
                minutes: minutes,
                // completed_at defaults to now() in DB
            });
            if (error) throw error;
        } catch (error) {
            console.error('Failed to sync session to Supabase:', error);
            // Optionally queue for retry
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

  return (
    <GamificationContext.Provider 
      value={{
        xp, 
        level, 
        stats, 
        history,
        isFocusing,
        setIsFocusing,
        unlockedAchievements, 
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

