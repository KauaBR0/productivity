import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import RankingScreen from '../app/(tabs)/ranking';
import { useRanking } from '@/hooks/useRanking';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('expo-contacts', () => ({
  requestPermissionsAsync: jest.fn(),
  getContactsAsync: jest.fn(),
  Fields: { PhoneNumbers: 'phoneNumbers' },
}));

jest.mock('@/services/SocialService', () => ({
  SocialService: { matchContactsByPhones: jest.fn() },
}));

jest.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user_1' } }),
}));

jest.mock('@/context/SettingsContext', () => ({
  useSettings: () => {
    const { theme } = require('../constants/theme');
    return { theme };
  },
}));

jest.mock('@/hooks/useRanking', () => ({
  useRanking: jest.fn(),
}));

jest.mock('@/utils/RankingLogic', () => ({
  formatTimeDisplay: (minutes: number) => `${minutes}min`,
}));

describe('RankingScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders error state and retries', () => {
    const refresh = jest.fn();
    (useRanking as jest.Mock).mockReturnValue({
      rankingData: [],
      loading: false,
      error: 'Falha ao carregar',
      refresh,
    });

    const { getByText } = render(<RankingScreen />);

    expect(getByText('Erro ao carregar ranking')).toBeTruthy();
    fireEvent.press(getByText('Tentar novamente'));
    expect(refresh).toHaveBeenCalled();
  });

  it('renders empty state when no data', () => {
    (useRanking as jest.Mock).mockReturnValue({
      rankingData: [],
      loading: false,
      error: null,
      refresh: jest.fn(),
    });

    const { getByText } = render(<RankingScreen />);

    expect(getByText('Sem dados no ranking')).toBeTruthy();
  });
});
