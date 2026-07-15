import React, { useEffect } from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import type { Session } from '@supabase/supabase-js';

const mockGetSession = jest.fn();
const mockUpsert = jest.fn().mockResolvedValue({ error: null });
let mockAuthStateCallback: ((event: string, session: Session | null) => void) | null = null;
const mockUnsubscribe = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: mockGetSession,
      onAuthStateChange: jest.fn((callback) => {
        mockAuthStateCallback = callback;
        return { data: { subscription: { unsubscribe: mockUnsubscribe } } };
      }),
    },
    from: jest.fn(() => ({ upsert: mockUpsert })),
  },
}));

jest.mock('expo-web-browser', () => ({
  maybeCompleteAuthSession: jest.fn(),
}));

jest.mock('expo-linking', () => ({
  createURL: jest.fn(),
}));

jest.mock('@/services/ReferralService', () => ({
  ReferralService: {},
}));

import { AuthProvider, type User, useAuth } from '@/context/AuthContext';

type AuthSnapshot = {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
};

const AuthProbe = ({ onChange }: { onChange: (snapshot: AuthSnapshot) => void }) => {
  const { user, session, isLoading } = useAuth();

  useEffect(() => {
    onChange({ user, session, isLoading });
  }, [isLoading, onChange, session, user]);

  return null;
};

const createSession = (): Session => ({
  access_token: 'access-token',
  refresh_token: 'refresh-token',
  expires_in: 3600,
  expires_at: 4_102_444_800,
  token_type: 'bearer',
  user: {
    id: 'user-1',
    app_metadata: {},
    user_metadata: { full_name: 'Usuario Teste' },
    aud: 'authenticated',
    email: 'usuario@example.com',
    created_at: '2026-07-14T00:00:00.000Z',
  },
});

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthStateCallback = null;
  });

  it('keeps a signed-in session as the only result of auth event ordering', async () => {
    const staleInitialSession = Promise.withResolvers<{ data: { session: Session | null } }>();
    mockGetSession.mockReturnValue(staleInitialSession.promise);
    let snapshot: AuthSnapshot | null = null;

    act(() => {
      TestRenderer.create(
        <AuthProvider>
          <AuthProbe onChange={(value) => { snapshot = value; }} />
        </AuthProvider>
      );
    });

    expect(mockAuthStateCallback).not.toBeNull();

    await act(async () => {
      mockAuthStateCallback?.('INITIAL_SESSION', null);
    });

    const signedInSession = createSession();
    await act(async () => {
      mockAuthStateCallback?.('SIGNED_IN', signedInSession);
    });

    staleInitialSession.resolve({ data: { session: null } });
    await act(async () => {
      await staleInitialSession.promise;
    });

    expect(mockGetSession).not.toHaveBeenCalled();
    expect(snapshot).toMatchObject({
      isLoading: false,
      session: signedInSession,
      user: {
        id: 'user-1',
        email: 'usuario@example.com',
        name: 'Usuario Teste',
      },
    });
  });
});
