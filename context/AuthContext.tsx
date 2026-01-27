import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { supabase } from '../lib/supabase';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { normalizePhone } from '@/utils/phone';

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
  signUp: (name: string, email: string, password: string, phone: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    // 1. Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        setUser(mapSupabaseUser(session.user));
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
          name: u.user_metadata?.full_name || 'Usuário',
          avatar: u.user_metadata?.avatar_url,
          bio: u.user_metadata?.bio,
      };
  };

  // Protected Route Logic
  useEffect(() => {
    if (isLoading) return;

    const currentPath = segments.join('/');
    const isPublicRoute = currentPath === 'login' || currentPath === 'register';

    if (!user && !isPublicRoute) {
      router.replace('/login');
    } else if (user && isPublicRoute) {
      router.replace('/');
    }
  }, [user, segments, isLoading]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  };

  const signUp = async (name: string, email: string, password: string, phone: string) => {
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
    if (userId) {
      await supabase.from('profiles').upsert({
        id: userId,
        username: name,
        phone: normalizedPhone,
      });
    }
  };

  const signInWithGoogle = async () => {
    try {
        const redirectUrl = Linking.createURL('/(auth)/callback');
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
            const { url } = res;
            const params = Linking.parse(url);
            const access_token = params.queryParams?.access_token as string;
            const refresh_token = params.queryParams?.refresh_token as string;

            if (access_token && refresh_token) {
                await supabase.auth.setSession({
                    access_token,
                    refresh_token,
                });
            }
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
