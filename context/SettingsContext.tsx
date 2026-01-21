import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CYCLES as DEFAULT_CYCLES, REWARDS as DEFAULT_REWARDS, CycleDef } from '../constants/FocusConfig';
import { defaultThemeName, ThemeName, themes } from '../constants/theme';

interface SettingsContextType {
  cycles: CycleDef[];
  rewards: string[];
  updateCycle: (updatedCycle: CycleDef) => void;
  addCycle: (cycle: CycleDef) => void;
  removeCycle: (id: string) => void;
  updateRewards: (updatedRewards: string[]) => void;
  resetSettings: () => void;
  themeName: ThemeName;
  setThemeName: (themeName: ThemeName) => void;
  theme: (typeof themes)[ThemeName];
  dailyGoalMinutes: number;
  setDailyGoalMinutes: (minutes: number) => void;
  alarmSound: 'alarm' | 'system' | 'silent';
  setAlarmSound: (sound: 'alarm' | 'system' | 'silent') => void;
  isLoading: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const [cycles, setCycles] = useState<CycleDef[]>(DEFAULT_CYCLES);
  const [rewards, setRewards] = useState<string[]>(DEFAULT_REWARDS);
  const [themeName, setThemeNameState] = useState<ThemeName>(defaultThemeName);
  const [dailyGoalMinutes, setDailyGoalMinutesState] = useState(60);
  const [alarmSound, setAlarmSoundState] = useState<'alarm' | 'system' | 'silent'>('alarm');
  const [isLoading, setIsLoading] = useState(true);

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const storedCycles = await AsyncStorage.getItem('user_cycles');
        const storedRewards = await AsyncStorage.getItem('user_rewards');
        const storedTheme = await AsyncStorage.getItem('user_theme');
        const storedGoal = await AsyncStorage.getItem('user_daily_goal');
        const storedAlarmSound = await AsyncStorage.getItem('user_alarm_sound');

        if (storedCycles) {
          setCycles(JSON.parse(storedCycles));
        }
        if (storedRewards) {
          setRewards(JSON.parse(storedRewards));
        }
        if (storedTheme && storedTheme in themes) {
          setThemeNameState(storedTheme as ThemeName);
        }
        if (storedGoal) {
          const parsed = Number(storedGoal);
          if (!Number.isNaN(parsed) && parsed > 0) {
            setDailyGoalMinutesState(parsed);
          }
        }
        if (storedAlarmSound === 'alarm' || storedAlarmSound === 'system' || storedAlarmSound === 'silent') {
          setAlarmSoundState(storedAlarmSound);
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  // Save cycles whenever they change (optional: optimization to save only on explicit update action)
  const saveCycles = async (newCycles: CycleDef[]) => {
    try {
      await AsyncStorage.setItem('user_cycles', JSON.stringify(newCycles));
    } catch (error) {
      console.error('Failed to save cycles:', error);
    }
  };

  // Save rewards whenever they change
  const saveRewards = async (newRewards: string[]) => {
    try {
      await AsyncStorage.setItem('user_rewards', JSON.stringify(newRewards));
    } catch (error) {
      console.error('Failed to save rewards:', error);
    }
  };

  const saveTheme = async (nextTheme: ThemeName) => {
    try {
      await AsyncStorage.setItem('user_theme', nextTheme);
    } catch (error) {
      console.error('Failed to save theme:', error);
    }
  };

  const saveDailyGoal = async (minutes: number) => {
    try {
      await AsyncStorage.setItem('user_daily_goal', String(minutes));
    } catch (error) {
      console.error('Failed to save daily goal:', error);
    }
  };

  const saveAlarmSound = async (sound: 'alarm' | 'system' | 'silent') => {
    try {
      await AsyncStorage.setItem('user_alarm_sound', sound);
    } catch (error) {
      console.error('Failed to save alarm sound:', error);
    }
  };

  const updateCycle = (updatedCycle: CycleDef) => {
    const newCycles = cycles.map((c) => 
      c.id === updatedCycle.id ? updatedCycle : c
    );
    setCycles(newCycles);
    saveCycles(newCycles);
  };

  const addCycle = (cycle: CycleDef) => {
    const newCycles = [...cycles, cycle];
    setCycles(newCycles);
    saveCycles(newCycles);
  };

  const removeCycle = (id: string) => {
    const newCycles = cycles.filter(c => c.id !== id);
    setCycles(newCycles);
    saveCycles(newCycles);
  };

  const updateRewards = (updatedRewards: string[]) => {
    setRewards(updatedRewards);
    saveRewards(updatedRewards);
  };

  const resetSettings = () => {
    setCycles(DEFAULT_CYCLES);
    setRewards(DEFAULT_REWARDS);
    setThemeNameState(defaultThemeName);
    setDailyGoalMinutesState(60);
    setAlarmSoundState('alarm');
    saveCycles(DEFAULT_CYCLES);
    saveRewards(DEFAULT_REWARDS);
    saveTheme(defaultThemeName);
    saveDailyGoal(60);
    saveAlarmSound('alarm');
  };

  const setThemeName = (nextTheme: ThemeName) => {
    setThemeNameState(nextTheme);
    saveTheme(nextTheme);
  };

  const setDailyGoalMinutes = (minutes: number) => {
    const safeMinutes = Math.max(10, Math.min(minutes, 600));
    setDailyGoalMinutesState(safeMinutes);
    saveDailyGoal(safeMinutes);
  };

  const setAlarmSound = (sound: 'alarm' | 'system' | 'silent') => {
    setAlarmSoundState(sound);
    saveAlarmSound(sound);
  };

  return (
    <SettingsContext.Provider 
      value={{ 
        cycles, 
        rewards, 
        updateCycle,
        addCycle,
        removeCycle, 
        updateRewards, 
        resetSettings,
        themeName,
        setThemeName,
        theme: themes[themeName],
        dailyGoalMinutes,
        setDailyGoalMinutes,
        alarmSound,
        setAlarmSound,
        isLoading 
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
