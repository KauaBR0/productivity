jest.mock('../lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
    })),
  },
}));

import { formatTimeDisplay } from '../utils/RankingLogic';

describe('ranking helpers', () => {
  it('formats minutes to HHh MMmin', () => {
    expect(formatTimeDisplay(0)).toBe('00h 00min');
    expect(formatTimeDisplay(61)).toBe('01h 01min');
    expect(formatTimeDisplay(125)).toBe('02h 05min');
  });
});
