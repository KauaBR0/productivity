import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import HistoryScreen from '../app/(tabs)/history';
const mockFrom = jest.fn();
const mockPush = jest.fn();
const mockUser = { id: 'user_1' };

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: (...args: any[]) => mockFrom(...args),
  },
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
  __mockPush: mockPush,
}));

jest.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ user: mockUser }),
}));

jest.mock('@/context/SettingsContext', () => ({
  useSettings: () => {
    const { theme } = require('../constants/theme');
    return { theme };
  },
}));

const createQuery = () => ({
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  limit: jest.fn(),
});

describe('HistoryScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders error state when history fetch fails', async () => {
    const query = createQuery();
    query.limit.mockResolvedValueOnce({ data: null, error: new Error('fail') });
    mockFrom.mockReturnValue(query);
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const { getByText } = render(<HistoryScreen />);

    await waitFor(() => {
      expect(getByText('Erro ao carregar histórico')).toBeTruthy();
    });

    consoleSpy.mockRestore();
  });

  it('renders empty state and navigates to timer', async () => {
    const query = createQuery();
    query.limit.mockResolvedValueOnce({ data: [], error: null });
    mockFrom.mockReturnValue(query);

    const { getByText } = render(<HistoryScreen />);

    await waitFor(() => {
      expect(getByText('Seu histórico está vazio')).toBeTruthy();
    });

    fireEvent.press(getByText('Iniciar foco'));
    expect(mockPush).toHaveBeenCalledWith('/timer');
  });
});
