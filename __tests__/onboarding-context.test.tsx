import React, { useEffect } from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  OnboardingProvider,
  FEATURE_TOUR_STORAGE_KEY,
  ONBOARDING_STORAGE_KEY,
  useOnboarding,
} from '../context/OnboardingContext';

jest.mock('@react-native-async-storage/async-storage');

type OnboardingSnapshot = {
  hasCompletedOnboarding: boolean;
  hasCompletedFeatureTour: boolean;
  isLoading: boolean;
  completeOnboarding: () => Promise<void>;
  completeFeatureTour: () => Promise<void>;
  resetOnboarding: () => Promise<void>;
  resetFeatureTour: () => Promise<void>;
};

const flushPromises = () => new Promise((resolve) => setImmediate(resolve));

const OnboardingProbe = ({ onReady }: { onReady: (value: OnboardingSnapshot) => void }) => {
  const value = useOnboarding();

  useEffect(() => {
    onReady(value);
  }, [onReady, value]);

  return null;
};

describe('OnboardingContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage as any).__setMockStorage({});
  });

  it('loads onboarding as incomplete by default', async () => {
    let snapshot: OnboardingSnapshot | null = null;

    act(() => {
      TestRenderer.create(
        <OnboardingProvider>
          <OnboardingProbe onReady={(value) => { snapshot = value; }} />
        </OnboardingProvider>
      );
    });

    await act(async () => {
      await flushPromises();
    });

    expect(snapshot).not.toBeNull();
    const current = snapshot!;
    expect(current.isLoading).toBe(false);
    expect(current.hasCompletedOnboarding).toBe(false);
    expect(current.hasCompletedFeatureTour).toBe(false);
  });

  it('persists completion state', async () => {
    let snapshot: OnboardingSnapshot | null = null;

    act(() => {
      TestRenderer.create(
        <OnboardingProvider>
          <OnboardingProbe onReady={(value) => { snapshot = value; }} />
        </OnboardingProvider>
      );
    });

    await act(async () => {
      await flushPromises();
    });

    await act(async () => {
      await snapshot?.completeOnboarding();
      await flushPromises();
    });

    expect(snapshot).not.toBeNull();
    const current = snapshot!;
    expect(current.hasCompletedOnboarding).toBe(true);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(ONBOARDING_STORAGE_KEY, 'true');
  });

  it('persists feature tour completion state', async () => {
    let snapshot: OnboardingSnapshot | null = null;

    act(() => {
      TestRenderer.create(
        <OnboardingProvider>
          <OnboardingProbe onReady={(value) => { snapshot = value; }} />
        </OnboardingProvider>
      );
    });

    await act(async () => {
      await flushPromises();
    });

    await act(async () => {
      await snapshot?.completeFeatureTour();
      await flushPromises();
    });

    expect(snapshot).not.toBeNull();
    const current = snapshot!;
    expect(current.hasCompletedFeatureTour).toBe(true);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(FEATURE_TOUR_STORAGE_KEY, 'true');
  });
});
