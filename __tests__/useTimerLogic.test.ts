import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useTimerLogic } from '../hooks/useTimerLogic';
import { useSettings } from '@/context/SettingsContext';
import { useLocalSearchParams } from 'expo-router';
import { useTimerStore } from '@/store/useTimerStore';

// Mocks
jest.mock('@/context/SettingsContext');
jest.mock('@/context/GamificationContext', () => ({
  useGamification: () => ({
    processCycleCompletion: jest.fn(),
    setIsFocusing: jest.fn(),
  }),
}));
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn() }),
  useLocalSearchParams: jest.fn(),
}));
jest.mock('expo-keep-awake', () => ({ useKeepAwake: jest.fn() }));
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
      theme: { colors: {}, radius: {}, shadow: {} },
    });
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
});
