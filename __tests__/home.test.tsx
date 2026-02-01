import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react-native';
import HomeScreen from '../app/(tabs)/index';
import AsyncStorage from '@react-native-async-storage/async-storage';

// --- Mocks ---

// Mock expo-router
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
  useFocusEffect: (callback: () => void) => callback(),
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

// Mock Lottie
jest.mock('lottie-react-native', () => {
  const { View } = require('react-native');
  return (props: any) => <View testID="lottie-view" {...props} />;
});

// Mock Contexts
jest.mock('@/context/SettingsContext', () => ({
  useSettings: () => ({
    cycles: [
      { id: 'c1', label: 'Pomodoro', focusDuration: 25, rewardDuration: 5, color: '#FF4500' },
      { id: 'infinite', label: 'Infinito', focusDuration: 0, rewardDuration: 0, color: '#000' }
    ],
    theme: {
      colors: {
        bg: '#000',
        surface: '#111',
        text: '#FFF',
        textMuted: '#888',
        border: '#333',
        accent: '#F9D547',
        accentDark: '#F9D547',
        surfaceSoft: '#222',
      },
      radius: { lg: 8, xl: 16 },
      shadow: { card: {} },
    },
    dailyGoalMinutes: 60,
  }),
}));

jest.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ user: { name: 'Test User', avatar: null } }),
}));

jest.mock('@/context/GamificationContext', () => ({
  useGamification: () => ({ getPeriodStats: () => 30 }),
}));

// Mock timer constants
jest.mock('../app/timer', () => ({
  ACTIVE_TIMER_STORAGE_KEY: 'active_timer_state_v1',
}));

describe('HomeScreen Resume Banner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders Resume Banner when an active session is found in storage', async () => {
    const mockState = {
      version: 1,
      cycleId: 'c1',
      isActive: true,
      isInfiniteCycle: false,
    };
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(mockState));

    render(<HomeScreen />);

    await waitFor(() => {
      expect(screen.getByText('Sessão em andamento')).toBeTruthy();
      // Pomodoro appears multiple times (Hero, List, Banner), so we check getAll
      expect(screen.getAllByText('Pomodoro').length).toBeGreaterThan(1);
    });
  });

  it('renders Resume Banner for Infinite Mode', async () => {
    const mockState = {
      version: 1,
      cycleId: 'infinite',
      isActive: true,
      isInfiniteCycle: true,
    };
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(mockState));

    render(<HomeScreen />);

    await waitFor(() => {
      expect(screen.getByText('Sessão em andamento')).toBeTruthy();
      // Cycle label in mock is 'Infinito'
      expect(screen.getByText('Infinito')).toBeTruthy();
    });
  });

  it('does NOT render Resume Banner when storage is empty', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

    render(<HomeScreen />);

    await waitFor(() => {
      expect(screen.queryByText('Sessão em andamento')).toBeNull();
    });
  });

  it('navigates to timer screen with correct params when Banner is clicked', async () => {
    const mockState = {
      version: 1,
      cycleId: 'c1',
      isActive: true,
    };
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(mockState));

    render(<HomeScreen />);

    const banner = await screen.findByText('RETOMAR');
    fireEvent.press(banner);

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/timer',
      params: { cycleId: 'c1' },
    });
  });
});