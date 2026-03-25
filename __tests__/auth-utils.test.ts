import { getUserDisplayName, parseAuthCallbackUrl } from '../utils/auth';

describe('auth utils', () => {
  it('parses access and refresh tokens from callback hash', () => {
    const result = parseAuthCallbackUrl(
      'productivy://auth/callback#access_token=token123&refresh_token=refresh456&expires_in=3600'
    );

    expect(result).toEqual({
      accessToken: 'token123',
      refreshToken: 'refresh456',
      code: undefined,
      error: undefined,
    });
  });

  it('parses authorization code from callback query', () => {
    const result = parseAuthCallbackUrl('productivy://auth/callback?code=abc123');

    expect(result).toEqual({
      accessToken: undefined,
      refreshToken: undefined,
      code: 'abc123',
      error: undefined,
    });
  });

  it('builds a fallback display name from email when metadata is missing', () => {
    const displayName = getUserDisplayName({
      id: 'user-1',
      email: 'focus.user@example.com',
      user_metadata: {},
    } as any);

    expect(displayName).toBe('focus.user');
  });
});
