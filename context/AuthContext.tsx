import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { normalizePhone } from '@/utils/phone';
import { ReferralService } from '@/services/ReferralService';
import { getUserDisplayName, parseAuthCallbackUrl } from '@/utils/auth';

// Ensure the browser can return to the app
WebBrowser.maybeCompleteAuthSession();

// Define User Type
export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  bio?: string;
  phone?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    name: string,
    email: string,
    password: string,
    phone: string,
    referralCode?: string
  ) => Promise<{ referralApplied: boolean; referralError: string | null }>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const getReferralErrorMessage = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error || '');
  const normalized = message.toLowerCase();

  if (normalized.includes('own referral code')) {
    return 'Nao e possivel usar seu proprio codigo.';
  }

  if (normalized.includes('already claimed')) {
    return 'Este codigo ja foi usado nesta conta.';
  }

  if (normalized.includes('not found') || normalized.includes('invalid')) {
    return 'Codigo de indicacao invalido.';
  }

  return 'Nao foi possivel aplicar o codigo de indicacao agora.';
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 1. Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        setUser(mapSupabaseUser(session.user));
        void ensureProfileRow(session.user);
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    // 2. Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        setUser(mapSupabaseUser(session.user));
        void ensureProfileRow(session.user);
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const mapSupabaseUser = (u: SupabaseUser): User => {
      return {
          id: u.id,
          email: u.email || '',
          name: getUserDisplayName(u),
          avatar: u.user_metadata?.avatar_url,
          bio: u.user_metadata?.bio,
      };
  };

  const ensureProfileRow = async (authUser: SupabaseUser, phone?: string | null) => {
    const username = getUserDisplayName(authUser);
    const profilePayload: Record<string, string | null> = {
      id: authUser.id,
      username,
      avatar_url: authUser.user_metadata?.avatar_url || null,
    };

    const normalizedPhone = normalizePhone(phone || authUser.phone || '');
    if (normalizedPhone) {
      profilePayload.phone = normalizedPhone;
    }

    const { error } = await supabase.from('profiles').upsert(profilePayload);
    if (error) throw error;
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  };

  const signUp = async (
    name: string,
    email: string,
    password: string,
    phone: string,
    referralCode?: string
  ) => {
    const normalizedPhone = normalizePhone(phone);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
        },
      },
    });
    if (error) throw error;

    const userId = data.user?.id;
    let referralApplied = false;
    let referralError: string | null = null;

    if (data.user && userId) {
      await ensureProfileRow(
        {
          ...data.user,
          user_metadata: {
            ...data.user.user_metadata,
            full_name: name,
          },
        },
        normalizedPhone
      );

      const cleanCode = referralCode?.trim();
      if (cleanCode) {
        try {
          await ReferralService.claimReferralCode(cleanCode);
          referralApplied = true;
        } catch (claimError) {
          referralError = getReferralErrorMessage(claimError);
          console.warn('Failed to claim referral code:', claimError);
        }
      }
    }

    return { referralApplied, referralError };
  };

  const signInWithGoogle = async () => {
    try {
        const redirectUrl = Linking.createURL('/auth/callback');
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: redirectUrl,
                skipBrowserRedirect: true,
            },
        });

        if (error) throw error;

        const res = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);

        if (res.type === 'success') {
            const params = parseAuthCallbackUrl(res.url);

            if (params.error) {
                throw new Error(params.error);
            }

            if (params.accessToken && params.refreshToken) {
                await supabase.auth.setSession({
                    access_token: params.accessToken,
                    refresh_token: params.refreshToken,
                });
                return;
            }

            if (params.code) {
                await supabase.auth.exchangeCodeForSession(params.code);
                return;
            }

            throw new Error('Nao foi possivel concluir o login com Google.');
        }

        if (res.type !== 'cancel') {
            throw new Error('O login com Google foi interrompido.');
        }
    } catch (error) {
        console.error('Google Sign In Error:', error);
        throw error;
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const updateProfile = async (data: Partial<User>) => {
    if (!user) return;
    
    // Update metadata for simple fields
    const updates: any = {};
    if (data.name) updates.full_name = data.name;
    if (data.avatar) updates.avatar_url = data.avatar;
    if (data.bio) updates.bio = data.bio;

    const { error } = await supabase.auth.updateUser({
        data: updates
    });

    if (error) throw error;

    if (data.phone) {
      await supabase.from('profiles').update({ phone: normalizePhone(data.phone) }).eq('id', user.id);
    }
  };

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        session,
        isLoading, 
        signIn, 
        signUp, 
        signInWithGoogle,
        signOut, 
        updateProfile 
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within a AuthProvider');
  }
  return context;
};
