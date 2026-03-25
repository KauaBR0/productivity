import { User as SupabaseUser } from '@supabase/supabase-js';

type AuthCallbackParams = {
  accessToken?: string;
  refreshToken?: string;
  code?: string;
  error?: string;
};

const pickFirstNonEmpty = (...values: Array<string | null | undefined>) => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return null;
};

export const getUserDisplayName = (user: SupabaseUser) => {
  const emailPrefix = user.email?.split('@')[0]?.trim();

  return (
    pickFirstNonEmpty(
      user.user_metadata?.full_name,
      user.user_metadata?.name,
      user.user_metadata?.user_name,
      emailPrefix
    ) || 'Usuario'
  );
};

export const parseAuthCallbackUrl = (url: string): AuthCallbackParams => {
  const [baseUrl, hashFragment = ''] = url.split('#');
  const queryIndex = baseUrl.indexOf('?');
  const queryString = queryIndex >= 0 ? baseUrl.slice(queryIndex + 1) : '';
  const queryParams = new URLSearchParams(queryString);
  const hashParams = new URLSearchParams(hashFragment);

  const readParam = (key: string) => queryParams.get(key) || hashParams.get(key) || undefined;

  return {
    accessToken: readParam('access_token'),
    refreshToken: readParam('refresh_token'),
    code: readParam('code'),
    error: readParam('error_description') || readParam('error'),
  };
};
