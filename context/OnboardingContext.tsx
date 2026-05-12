import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ONBOARDING_STORAGE_KEY = 'permissions_onboarding_v1_complete';
const FEATURE_TOUR_STORAGE_KEY = 'home_feature_tour_v1_complete';

interface OnboardingContextType {
  hasCompletedOnboarding: boolean;
  hasCompletedFeatureTour: boolean;
  isLoading: boolean;
  completeOnboarding: () => Promise<void>;
  completeFeatureTour: () => Promise<void>;
  resetOnboarding: () => Promise<void>;
  resetFeatureTour: () => Promise<void>;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export const OnboardingProvider = ({ children }: { children: ReactNode }) => {
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [hasCompletedFeatureTour, setHasCompletedFeatureTour] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadState = async () => {
      try {
        const [onboardingValue, featureTourValue] = await Promise.all([
          AsyncStorage.getItem(ONBOARDING_STORAGE_KEY),
          AsyncStorage.getItem(FEATURE_TOUR_STORAGE_KEY),
        ]);
        setHasCompletedOnboarding(onboardingValue === 'true');
        setHasCompletedFeatureTour(featureTourValue === 'true');
      } catch (error) {
        console.error('Failed to load onboarding state:', error);
      } finally {
        setIsLoading(false);
      }
    };

    void loadState();
  }, []);

  const completeOnboarding = async () => {
    setHasCompletedOnboarding(true);
    await AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
  };

  const completeFeatureTour = async () => {
    setHasCompletedFeatureTour(true);
    await AsyncStorage.setItem(FEATURE_TOUR_STORAGE_KEY, 'true');
  };

  const resetOnboarding = async () => {
    setHasCompletedOnboarding(false);
    await AsyncStorage.removeItem(ONBOARDING_STORAGE_KEY);
  };

  const resetFeatureTour = async () => {
    setHasCompletedFeatureTour(false);
    await AsyncStorage.removeItem(FEATURE_TOUR_STORAGE_KEY);
  };

  return (
    <OnboardingContext.Provider
      value={{
        hasCompletedOnboarding,
        hasCompletedFeatureTour,
        isLoading,
        completeOnboarding,
        completeFeatureTour,
        resetOnboarding,
        resetFeatureTour,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
};

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }

  return context;
};

export { ONBOARDING_STORAGE_KEY };
export { FEATURE_TOUR_STORAGE_KEY };
