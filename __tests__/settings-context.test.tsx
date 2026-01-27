import React, { useEffect } from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { SettingsProvider, useSettings } from '../context/SettingsContext';
import { CYCLES as DEFAULT_CYCLES, REWARDS as DEFAULT_REWARDS } from '../constants/FocusConfig';
import { defaultThemeName } from '../constants/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage');

type SettingsSnapshot = any;

const flushPromises = () => new Promise((resolve) => setImmediate(resolve));

const SettingsProbe = ({ onReady }: { onReady: (value: SettingsSnapshot) => void }) => {
  const ctx = useSettings();
  useEffect(() => {
    onReady(ctx);
  }, [ctx, onReady]);
  return null;
};

describe('SettingsContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage as any).__setMockStorage({});
  });

  it('loads default settings when storage is empty', async () => {
    let snapshot: SettingsSnapshot | null = null;

    act(() => {
      TestRenderer.create(
        <SettingsProvider>
          <SettingsProbe onReady={(value) => { snapshot = value; }} />
        </SettingsProvider>
      );
    });

    await act(async () => {
      await flushPromises();
    });

    expect(snapshot).not.toBeNull();
    expect(snapshot?.isLoading).toBe(false);
    expect(snapshot?.cycles.length).toBe(DEFAULT_CYCLES.length);
    expect(snapshot?.rewards).toEqual(DEFAULT_REWARDS);
    expect(snapshot?.themeName).toBe(defaultThemeName);
    expect(snapshot?.dailyGoalMinutes).toBe(60);
    expect(snapshot?.alarmSound).toBe('alarm');
    expect(snapshot?.lofiTrack).toBe('random');
    expect(snapshot?.rouletteExtraSpins).toBe(2);
  });

  it('adds infinite cycle when missing from stored cycles', async () => {
    const storedCycles = [
      { id: 'custom_1', label: 'Custom', focusDuration: 10, rewardDuration: 5, restDuration: 5, color: '#fff' },
    ];
    (AsyncStorage as any).__setMockStorage({
      user_cycles: JSON.stringify(storedCycles),
    });

    let snapshot: SettingsSnapshot | null = null;

    act(() => {
      TestRenderer.create(
        <SettingsProvider>
          <SettingsProbe onReady={(value) => { snapshot = value; }} />
        </SettingsProvider>
      );
    });

    await act(async () => {
      await flushPromises();
    });

    const ids = snapshot?.cycles.map((cycle: any) => cycle.id) || [];
    expect(ids).toContain('custom_1');
    expect(ids).toContain('infinite');
  });

  it('does not duplicate infinite cycle when already stored', async () => {
    const storedCycles = [
      { id: 'infinite', label: 'Cronometro Infinito', focusDuration: 5, rewardDuration: 2, restDuration: 0.5, color: '#8B5CF6' },
    ];
    (AsyncStorage as any).__setMockStorage({
      user_cycles: JSON.stringify(storedCycles),
    });

    let snapshot: SettingsSnapshot | null = null;

    act(() => {
      TestRenderer.create(
        <SettingsProvider>
          <SettingsProbe onReady={(value) => { snapshot = value; }} />
        </SettingsProvider>
      );
    });

    await act(async () => {
      await flushPromises();
    });

    const infiniteCount = snapshot?.cycles.filter((cycle: any) => cycle.id === 'infinite').length || 0;
    expect(infiniteCount).toBe(1);
  });

  it('clamps daily goal between 10 and 600', async () => {
    let snapshot: SettingsSnapshot | null = null;

    act(() => {
      TestRenderer.create(
        <SettingsProvider>
          <SettingsProbe onReady={(value) => { snapshot = value; }} />
        </SettingsProvider>
      );
    });

    await act(async () => {
      await flushPromises();
    });

    await act(async () => {
      snapshot?.setDailyGoalMinutes(5);
      await flushPromises();
    });
    expect(snapshot?.dailyGoalMinutes).toBe(10);

    await act(async () => {
      snapshot?.setDailyGoalMinutes(999);
      await flushPromises();
    });
    expect(snapshot?.dailyGoalMinutes).toBe(600);
  });

  it('falls back to alarm sound when legacy system sound is stored', async () => {
    (AsyncStorage as any).__setMockStorage({
      user_alarm_sound: 'system',
    });

    let snapshot: SettingsSnapshot | null = null;

    act(() => {
      TestRenderer.create(
        <SettingsProvider>
          <SettingsProbe onReady={(value) => { snapshot = value; }} />
        </SettingsProvider>
      );
    });

    await act(async () => {
      await flushPromises();
    });

    expect(snapshot?.alarmSound).toBe('alarm');
  });

  it('updates and resets cycles and rewards', async () => {
    let snapshot: SettingsSnapshot | null = null;

    act(() => {
      TestRenderer.create(
        <SettingsProvider>
          <SettingsProbe onReady={(value) => { snapshot = value; }} />
        </SettingsProvider>
      );
    });

    await act(async () => {
      await flushPromises();
    });

    const firstCycle = snapshot?.cycles[0];
    expect(firstCycle).toBeTruthy();

    await act(async () => {
      snapshot?.updateCycle({ ...firstCycle!, focusDuration: 99 });
      await flushPromises();
    });
    expect(snapshot?.cycles.find((cycle: any) => cycle.id === firstCycle?.id)?.focusDuration).toBe(99);

    await act(async () => {
      snapshot?.updateRewards(['Nova recompensa']);
      await flushPromises();
    });
    expect(snapshot?.rewards).toEqual(['Nova recompensa']);

    await act(async () => {
      snapshot?.resetSettings();
      await flushPromises();
    });
    expect(snapshot?.rewards).toEqual(DEFAULT_REWARDS);
    expect(snapshot?.cycles.length).toBe(DEFAULT_CYCLES.length);
    expect(snapshot?.rouletteExtraSpins).toBe(2);
  });

  it('clamps roulette extra spins between 0 and 5', async () => {
    let snapshot: SettingsSnapshot | null = null;

    act(() => {
      TestRenderer.create(
        <SettingsProvider>
          <SettingsProbe onReady={(value) => { snapshot = value; }} />
        </SettingsProvider>
      );
    });

    await act(async () => {
      await flushPromises();
    });

    await act(async () => {
      snapshot?.setRouletteExtraSpins(-3);
      await flushPromises();
    });
    expect(snapshot?.rouletteExtraSpins).toBe(0);

    await act(async () => {
      snapshot?.setRouletteExtraSpins(10);
      await flushPromises();
    });
    expect(snapshot?.rouletteExtraSpins).toBe(5);
  });
});
