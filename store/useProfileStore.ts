import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SocialProfile, SocialService } from '@/services/SocialService';

const PROFILE_CACHE_STORAGE_KEY = 'productivy-profile-cache-v1';
const PROFILE_CACHE_TTL_MS = 5 * 60 * 1000;

interface ProfileState {
  viewerId: string | null;
  profiles: Record<string, SocialProfile | null>;
  fetchedAt: Record<string, number>;
  loading: Record<string, boolean>;
  errors: Record<string, string | null>;
  setViewerId: (viewerId: string | null) => void;
  getProfile: (
    targetUserId: string,
    currentUserId: string,
    options?: { force?: boolean }
  ) => Promise<SocialProfile | null>;
  refreshProfile: (
    targetUserId: string,
    currentUserId: string,
    options?: { silent?: boolean }
  ) => Promise<SocialProfile | null>;
  setProfile: (targetUserId: string, profile: SocialProfile | null) => void;
  updateProfile: (
    targetUserId: string,
    updater: (prev: SocialProfile | null) => SocialProfile | null
  ) => void;
  clearProfile: (targetUserId: string) => void;
  clearAll: () => void;
}

const getErrorMessage = (err: unknown) => {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return 'Erro ao carregar perfil.';
};

export const useProfileStore = create<ProfileState>()(
  persist(
    (set, get) => ({
      viewerId: null,
      profiles: {},
      fetchedAt: {},
      loading: {},
      errors: {},
      setViewerId: (viewerId) =>
        set((state) => {
          if (state.viewerId === viewerId) return state;
          return {
            viewerId,
            profiles: {},
            fetchedAt: {},
            loading: {},
            errors: {},
          };
        }),
      getProfile: async (targetUserId, currentUserId, options) => {
        if (!targetUserId || !currentUserId) return null;
        const state = get();
        const hasCache = Object.prototype.hasOwnProperty.call(state.profiles, targetUserId);
        const cached = hasCache ? state.profiles[targetUserId] ?? null : null;

        if (!options?.force && hasCache) {
          const lastFetched = state.fetchedAt[targetUserId];
          const isStale = !lastFetched || Date.now() - lastFetched > PROFILE_CACHE_TTL_MS;
          if (isStale && !state.loading[targetUserId]) {
            void get().refreshProfile(targetUserId, currentUserId, { silent: true });
          }
          return cached;
        }

        return get().refreshProfile(targetUserId, currentUserId);
      },
      refreshProfile: async (targetUserId, currentUserId, options) => {
        if (!targetUserId || !currentUserId) return null;
        if (get().loading[targetUserId]) {
          return get().profiles[targetUserId] ?? null;
        }

        const silent = options?.silent;
        const hasCachedProfile = get().profiles[targetUserId] != null;

        if (!silent) {
          set((state) => ({
            loading: { ...state.loading, [targetUserId]: true },
            errors: { ...state.errors, [targetUserId]: null },
          }));
        } else if (!hasCachedProfile) {
          set((state) => ({
            errors: { ...state.errors, [targetUserId]: null },
          }));
        }

        try {
          const data = await SocialService.getUserProfile(targetUserId, currentUserId);
          if (!data) {
            const message = 'Perfil não encontrado.';
            set((state) => ({
              profiles: { ...state.profiles, [targetUserId]: null },
              fetchedAt: { ...state.fetchedAt, [targetUserId]: Date.now() },
              errors: silent && hasCachedProfile ? state.errors : { ...state.errors, [targetUserId]: message },
            }));
            return null;
          }

          set((state) => ({
            profiles: { ...state.profiles, [targetUserId]: data },
            fetchedAt: { ...state.fetchedAt, [targetUserId]: Date.now() },
            errors: { ...state.errors, [targetUserId]: null },
          }));
          return data;
        } catch (err) {
          const message = getErrorMessage(err);
          set((state) => ({
            fetchedAt: { ...state.fetchedAt, [targetUserId]: Date.now() },
            errors: silent && hasCachedProfile ? state.errors : { ...state.errors, [targetUserId]: message },
          }));
          return null;
        } finally {
          if (!silent) {
            set((state) => ({
              loading: { ...state.loading, [targetUserId]: false },
            }));
          }
        }
      },
      setProfile: (targetUserId, profile) =>
        set((state) => ({
          profiles: { ...state.profiles, [targetUserId]: profile },
          fetchedAt: { ...state.fetchedAt, [targetUserId]: Date.now() },
          errors: { ...state.errors, [targetUserId]: null },
        })),
      updateProfile: (targetUserId, updater) =>
        set((state) => ({
          profiles: {
            ...state.profiles,
            [targetUserId]: updater(state.profiles[targetUserId] ?? null),
          },
          fetchedAt: { ...state.fetchedAt, [targetUserId]: Date.now() },
        })),
      clearProfile: (targetUserId) =>
        set((state) => {
          const { [targetUserId]: _p, ...profiles } = state.profiles;
          const { [targetUserId]: _f, ...fetchedAt } = state.fetchedAt;
          const { [targetUserId]: _l, ...loading } = state.loading;
          const { [targetUserId]: _e, ...errors } = state.errors;
          return { profiles, fetchedAt, loading, errors };
        }),
      clearAll: () =>
        set({
          profiles: {},
          fetchedAt: {},
          loading: {},
          errors: {},
        }),
    }),
    {
      name: PROFILE_CACHE_STORAGE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        profiles: state.profiles,
        fetchedAt: state.fetchedAt,
        viewerId: state.viewerId,
      }),
      merge: (persisted, current) => {
        const data = persisted as Partial<ProfileState>;
        return {
          ...current,
          viewerId: data.viewerId ?? current.viewerId,
          profiles: data.profiles ?? {},
          fetchedAt: data.fetchedAt ?? {},
        };
      },
    }
  )
);
