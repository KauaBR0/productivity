jest.mock('../lib/supabase', () => ({
  supabase: {
    rpc: jest.fn(),
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
    })),
  },
}));

import { supabase } from '../lib/supabase';
import { fetchRanking, formatTimeDisplay } from '../utils/RankingLogic';

describe('ranking helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('formats minutes to HHh MMmin', () => {
    expect(formatTimeDisplay(0)).toBe('00h 00min');
    expect(formatTimeDisplay(61)).toBe('01h 01min');
    expect(formatTimeDisplay(125)).toBe('02h 05min');
  });

  it('maps RPC data and passes filter ids', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-01-15T12:00:00.000Z'));
    (supabase.rpc as jest.Mock).mockResolvedValueOnce({
      data: [
        {
          id: 'user_a',
          username: 'Ana',
          minutes: 90,
          is_focusing: true,
          avatar_url: 'https://example.com/avatar.png',
        },
        {
          id: 'user_b',
          username: null,
          minutes: 30,
        },
      ],
      error: null,
    });

    const result = await fetchRanking('daily', 'user_a', ['user_a', 'user_b']);

    expect(supabase.rpc).toHaveBeenCalledWith(
      'get_ranking_data',
      expect.objectContaining({
        p_user_ids: ['user_a', 'user_b'],
      })
    );
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      id: 'user_a',
      name: 'Ana',
      minutes: 90,
      isUser: true,
      isFocusing: true,
      avatarUrl: 'https://example.com/avatar.png',
    });
    expect(result[1]).toMatchObject({
      id: 'user_b',
      name: 'Anônimo',
      minutes: 30,
      isUser: false,
      isFocusing: false,
      avatarUrl: undefined,
    });

    jest.useRealTimers();
  });

  it('returns empty list when RPC errors and sends null user ids when none provided', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-01-15T12:00:00.000Z'));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    (supabase.rpc as jest.Mock).mockResolvedValueOnce({
      data: null,
      error: new Error('RPC failed'),
    });

    const result = await fetchRanking('weekly', 'user_a');

    expect(supabase.rpc).toHaveBeenCalledWith(
      'get_ranking_data',
      expect.objectContaining({
        p_user_ids: null,
      })
    );
    expect(result).toEqual([]);

    consoleSpy.mockRestore();
    jest.useRealTimers();
  });
});
