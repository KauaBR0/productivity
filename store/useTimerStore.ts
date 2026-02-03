import { create } from 'zustand';
import { TimerPhase, ACTIVE_TIMER_STORAGE_KEY, StoredTimerState } from '@/types/timer';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface TimerState {
  // Core State
  timeLeft: number;
  totalDuration: number;
  isActive: boolean;
  phase: TimerPhase;
  cycleId: string | null;
  
  // Secondary state (Persistent)
  selectedReward: string | null;
  recentRewards: string[];
  pendingRewardSeconds: number | null;
  accumulatedFocusTime: number;
  accumulatedRewardTime: number;
  lastFocusSeconds: number;
  savedRewardSeconds: number;
  isDeepFocus: boolean;
  
  // Actions
  setTimeLeft: (time: number | ((prev: number) => number)) => void;
  setTotalDuration: (duration: number | ((prev: number) => number)) => void;
  setIsActive: (active: boolean | ((prev: boolean) => boolean)) => void;
  setPhase: (phase: TimerPhase | ((prev: TimerPhase) => TimerPhase)) => void;
  setCycleId: (id: string | null | ((prev: string | null) => string | null)) => void;
  
  // Secondary Setters
  setSelectedReward: (val: string | null) => void;
  setRecentRewards: (val: string[] | ((prev: string[]) => string[])) => void;
  setPendingRewardSeconds: (val: number | null) => void;
  setAccumulatedFocusTime: (val: number | ((prev: number) => number)) => void;
  setAccumulatedRewardTime: (val: number | ((prev: number) => number)) => void;
  setLastFocusSeconds: (val: number) => void;
  setSavedRewardSeconds: (val: number | ((prev: number) => number)) => void;
  setIsDeepFocus: (val: boolean) => void;

  // Bulk update for restoration
  setTimerState: (state: Partial<Omit<TimerState, 'setTimerState' | 'resetStore' | 'restoreFromStorage'>>) => void;
  
  // Recovery
  restoreFromStorage: () => Promise<boolean>;
  
  // Reset
  resetStore: () => void;
}

export const useTimerStore = create<TimerState>((set, get) => ({
  timeLeft: 0,
  totalDuration: 1,
  isActive: false,
  phase: 'focus',
  cycleId: null,
  
  selectedReward: null,
  recentRewards: [],
  pendingRewardSeconds: null,
  accumulatedFocusTime: 0,
  accumulatedRewardTime: 0,
  lastFocusSeconds: 0,
  savedRewardSeconds: 0,
  isDeepFocus: false,

  setTimeLeft: (time) => set((state) => ({ 
    timeLeft: typeof time === 'function' ? time(state.timeLeft) : time 
  })),
  setTotalDuration: (duration) => set((state) => ({ 
    totalDuration: typeof duration === 'function' ? duration(state.totalDuration) : duration 
  })),
  setIsActive: (active) => set((state) => ({ 
    isActive: typeof active === 'function' ? active(state.isActive) : active 
  })),
  setPhase: (phase) => set((state) => ({ 
    phase: typeof phase === 'function' ? phase(state.phase) : phase 
  })),
  setCycleId: (id) => set((state) => ({ 
    cycleId: typeof id === 'function' ? id(state.cycleId) : id 
  })),

  setSelectedReward: (val) => set({ selectedReward: val }),
  setRecentRewards: (val) => set((state) => ({ 
    recentRewards: typeof val === 'function' ? val(state.recentRewards) : val 
  })),
  setPendingRewardSeconds: (val) => set({ pendingRewardSeconds: val }),
  setAccumulatedFocusTime: (val) => set((state) => ({ 
    accumulatedFocusTime: typeof val === 'function' ? val(state.accumulatedFocusTime) : val 
  })),
  setAccumulatedRewardTime: (val) => set((state) => ({ 
    accumulatedRewardTime: typeof val === 'function' ? val(state.accumulatedRewardTime) : val 
  })),
  setLastFocusSeconds: (val) => set({ lastFocusSeconds: val }),
  setSavedRewardSeconds: (val) => set((state) => ({ 
    savedRewardSeconds: typeof val === 'function' ? val(state.savedRewardSeconds) : val 
  })),
  setIsDeepFocus: (val) => set({ isDeepFocus: val }),
  
  setTimerState: (state) => set((prev) => ({ ...prev, ...state })),

  restoreFromStorage: async () => {
    try {
      const raw = await AsyncStorage.getItem(ACTIVE_TIMER_STORAGE_KEY);
      if (!raw) return false;
      const saved = JSON.parse(raw) as StoredTimerState;
      
      const fallbackDuration = Math.max(1, saved.timeLeft ?? 1);
      let restoredTime = saved.timeLeft ?? 0;
      let restoredTotal = saved.totalDuration || fallbackDuration;

      if (saved.isActive) {
        if (saved.isInfiniteCycle && saved.phase === 'focus') {
          const base = saved.focusAccumulatedSeconds ?? 0;
          const start = saved.focusStartTime;
          const elapsed = start ? base + Math.floor((Date.now() - start) / 1000) : base;
          restoredTime = elapsed;
          restoredTotal = Math.max(1, elapsed);
        } else if (saved.endTime) {
          const remaining = Math.max(0, Math.ceil((saved.endTime - Date.now()) / 1000));
          restoredTime = remaining;
          restoredTotal = saved.totalDuration || Math.max(1, remaining);
        }
      }

      set({
        cycleId: saved.cycleId,
        phase: saved.phase,
        isActive: saved.isActive,
        timeLeft: restoredTime,
        totalDuration: restoredTotal,
        selectedReward: saved.selectedReward ?? null,
        recentRewards: saved.recentRewards ?? [],
        pendingRewardSeconds: saved.pendingRewardSeconds ?? null,
        accumulatedFocusTime: saved.accumulatedFocusTime ?? 0,
        accumulatedRewardTime: saved.accumulatedRewardTime ?? 0,
        lastFocusSeconds: saved.lastFocusSeconds ?? 0,
        savedRewardSeconds: saved.savedRewardSeconds ?? 0,
        isDeepFocus: saved.isDeepFocus ?? false,
      });
      return true;
    } catch (e) {
      console.warn('[TimerStore] Failed to restore state', e);
      return false;
    }
  },
  
  resetStore: () => set({
    timeLeft: 0,
    totalDuration: 1,
    isActive: false,
    phase: 'focus',
    cycleId: null,
    selectedReward: null,
    pendingRewardSeconds: null,
    savedRewardSeconds: 0,
    isDeepFocus: false,
  }),
}));


