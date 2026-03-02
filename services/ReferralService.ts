import { supabase } from '../lib/supabase';

type NullableRecord = Record<string, unknown> | null;

export interface ReferralSummary {
  referralCode: string;
  coinsBalance: number;
  totalReferrals: number;
  pendingReferrals: number;
  qualifiedReferrals: number;
}

export interface CoinTransaction {
  id: number;
  amount: number;
  reason: string;
  metadata: NullableRecord;
  createdAt: string;
}

const toSingleRow = <T>(data: T[] | T | null): T | null => {
  if (!data) return null;
  return Array.isArray(data) ? (data[0] ?? null) : data;
};

const normalizeCode = (code: string) => code.trim().toUpperCase();

export const ReferralService = {
  async claimReferralCode(code: string) {
    const cleanCode = normalizeCode(code);
    if (!cleanCode) return;

    const { error } = await supabase.rpc('claim_referral_code', {
      p_code: cleanCode,
    });

    if (error) throw error;
  },

  async getMyReferralSummary(): Promise<ReferralSummary | null> {
    const { data, error } = await supabase.rpc('get_my_referral_summary');

    if (error) throw error;

    const row = toSingleRow<any>(data as any);
    if (!row) return null;

    return {
      referralCode: String(row.referral_code || ''),
      coinsBalance: Number(row.coins_balance || 0),
      totalReferrals: Number(row.total_referrals || 0),
      pendingReferrals: Number(row.pending_referrals || 0),
      qualifiedReferrals: Number(row.qualified_referrals || 0),
    };
  },

  async getMyCoinTransactions(limit = 20): Promise<CoinTransaction[]> {
    const { data, error } = await supabase.rpc('get_my_coin_transactions', {
      p_limit: limit,
    });

    if (error) throw error;

    return ((data as any[]) || []).map((row) => ({
      id: Number(row.id),
      amount: Number(row.amount),
      reason: String(row.reason || ''),
      metadata: (row.metadata as NullableRecord) || null,
      createdAt: String(row.created_at),
    }));
  },
};
