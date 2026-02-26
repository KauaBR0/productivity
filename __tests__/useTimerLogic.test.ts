import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useTimerLogic } from '../hooks/useTimerLogic';
import { useSettings } from '@/context/SettingsContext';
import { useLocalSearchParams } from 'expo-router';
import { useTimerStore } from '@/store/useTimerStore';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ACTIVE_TIMER_STORAGE_KEY } from '@/types/timer';
import { stopForegroundTimer } from '@/services/ForegroundTimerService';

// Mocks
jest.mock('@/context/SettingsContext');
jest.mock('@/context/GamificationContext', () => ({
  useGamification: () => ({
    processCycleCompletion: jest.fn(),
    setIsFocusing: jest.fn(),
  }),
}));
jest.mock('expo-router', () => ({
  useRouter: () => {
    const { __mockBack } = jest.requireMock('expo-router') as { __mockBack: jest.Mock };
    return { back: __mockBack };
  },
  useLocalSearchParams: jest.fn(),
  __mockBack: jest.fn(),
}));
jest.mock('expo-keep-awake', () => ({ useKeepAwake: jest.fn() }));
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));
jest.mock('expo-av', () => ({ 
    Audio: { 
        Sound: { 
            createAsync: jest.fn().mockResolvedValue({ 
                sound: { 
                    playAsync: jest.fn(), 
                    stopAsync: jest.fn(),
                    setOnPlaybackStatusUpdate: jest.fn(),
                    unloadAsync: jest.fn() 
                } 
            }) 
        } 
    } 
}));
jest.mock('expo-notifications', () => ({
  scheduleNotificationAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(),
  SchedulableTriggerInputTypes: { TIME_INTERVAL: 'timeInterval' }
}));
jest.mock('@/services/ForegroundTimerService', () => ({
  startForegroundTimer: jest.fn(),
  stopForegroundTimer: jest.fn(),
  updateForegroundTimer: jest.fn(),
}));
jest.mock('@/services/AppBlockerService', () => ({
  getInstalledApps: jest.fn().mockResolvedValue([]),
  getPackagesExcludingCategory: jest.fn().mockReturnValue([]),
  resolveBlockCategoryFromReward: jest.fn().mockReturnValue(null),
  setBlocklist: jest.fn(),
  setSessionActive: jest.fn(),
}));

describe('useTimerLogic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    act(() => {
        useTimerStore.getState().resetStore();
    });
    (useLocalSearchParams as jest.Mock).mockReturnValue({ cycleId: 'c1' });
    (useSettings as jest.Mock).mockReturnValue({
      cycles: [
        { id: 'c1', label: 'Pomodoro', focusDuration: 25, rewardDuration: 5 },
        { id: 'infinite', label: 'Infinito', focusDuration: 0, rewardDuration: 0, type: 'infinite' }
      ],
      rewards: [],
      alarmSound: 'alarm',
      lofiTrack: 'off',
      rouletteExtraSpins: 0,
      blockedApps: [],
      theme: { colors: {}, radius: {}, shadow: {} },
    });
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  });

  it('initializes with correct state for fixed cycle', async () => {
    const { result } = renderHook(() => useTimerLogic());
    
    await waitFor(() => {
        expect(result.current.phase).toBe('focus');
        expect(result.current.timeLeft).toBe(25 * 60);
    });
    
    expect(result.current.isActive).toBe(true);
    expect(result.current.isInfiniteCycle).toBe(false);
  });

  it('toggles timer state', async () => {
    const { result } = renderHook(() => useTimerLogic());
    
    await waitFor(() => expect(result.current.isActive).toBe(true));
    
    act(() => {
      result.current.toggleTimer();
    });
    
    expect(result.current.isActive).toBe(false);
  });

  it('initializes infinite cycle correctly', async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ cycleId: 'infinite' });
    const { result } = renderHook(() => useTimerLogic());

    await waitFor(() => {
        expect(result.current.isInfiniteCycle).toBe(true);
        expect(result.current.timeLeft).toBe(0);
    });
  });

  it('shows toast and navigates back when cycle is missing', async () => {
    const { __mockBack } = jest.requireMock('expo-router') as { __mockBack: jest.Mock };
    (useLocalSearchParams as jest.Mock).mockReturnValue({ cycleId: 'missing' });

    renderHook(() => useTimerLogic());

    await waitFor(() => {
      expect(Toast.show).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'error' })
      );
    });
    expect(__mockBack).toHaveBeenCalled();
  });

  it('persists state and navigates back when canceling to background', async () => {
    const { __mockBack } = jest.requireMock('expo-router') as { __mockBack: jest.Mock };
    const openActionDialog = jest.fn().mockResolvedValue('background');
    const { result } = renderHook(() => useTimerLogic({ openActionDialog }));

    await waitFor(() => expect(result.current.isActive).toBe(true));

    await act(async () => {
      await result.current.handleCancel();
    });

    expect(openActionDialog).toHaveBeenCalled();
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      ACTIVE_TIMER_STORAGE_KEY,
      expect.any(String)
    );
    expect(__mockBack).toHaveBeenCalled();
    expect(stopForegroundTimer).not.toHaveBeenCalled();
  });

  it('clears state and stops foreground timer when ending the cycle', async () => {
    const { __mockBack } = jest.requireMock('expo-router') as { __mockBack: jest.Mock };
    const openActionDialog = jest.fn().mockResolvedValue('end');
    const { result } = renderHook(() => useTimerLogic({ openActionDialog }));

    await waitFor(() => expect(result.current.isActive).toBe(true));

    await act(async () => {
      await result.current.handleCancel();
    });

    expect(openActionDialog).toHaveBeenCalled();
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith(ACTIVE_TIMER_STORAGE_KEY);
    expect(stopForegroundTimer).toHaveBeenCalled();
    expect(__mockBack).toHaveBeenCalled();
  });
});
