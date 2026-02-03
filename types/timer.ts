export type TimerPhase = 'focus' | 'selection' | 'reward' | 'rest';

export type StoredTimerState = {
  version: 1;
  cycleId: string;
  phase: TimerPhase;
  isActive: boolean;
  isInfiniteCycle: boolean;
  endTime: number | null;
  timeLeft: number;
  totalDuration: number;
  selectedReward: string | null;
  recentRewards: string[];
  pendingRewardSeconds: number | null;
  accumulatedFocusTime: number;
  accumulatedRewardTime: number;
  lastFocusSeconds: number;
  focusAccumulatedSeconds: number;
  focusStartTime: number | null;
  isDeepFocus: boolean;
  savedRewardSeconds: number;
};

export const ACTIVE_TIMER_STORAGE_KEY = 'active_timer_state_v1';
