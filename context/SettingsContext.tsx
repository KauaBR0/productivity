import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CYCLES as DEFAULT_CYCLES, REWARDS as DEFAULT_REWARDS, CycleDef } from '../constants/FocusConfig';

interface SettingsContextType {
  cycles: CycleDef[];
  rewards: string[];
  updateCycle: (updatedCycle: CycleDef) => void;
  addCycle: (cycle: CycleDef) => void;
  removeCycle: (id: string) => void;
  updateRewards: (updatedRewards: string[]) => void;
  resetSettings: () => void;
  isLoading: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const [cycles, setCycles] = useState<CycleDef[]>(DEFAULT_CYCLES);
  const [rewards, setRewards] = useState<string[]>(DEFAULT_REWARDS);
  const [isLoading, setIsLoading] = useState(true);

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const storedCycles = await AsyncStorage.getItem('user_cycles');
        const storedRewards = await AsyncStorage.getItem('user_rewards');

        if (storedCycles) {
          setCycles(JSON.parse(storedCycles));
        }
        if (storedRewards) {
          setRewards(JSON.parse(storedRewards));
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
    saveCycles(DEFAULT_CYCLES);
    saveRewards(DEFAULT_REWARDS);
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
