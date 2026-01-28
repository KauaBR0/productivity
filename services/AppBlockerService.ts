import { NativeModules, Platform } from 'react-native';

type AttemptStats = {
  countToday: number;
  lastAttemptDate: string | null;
  lastAttemptPackage: string | null;
  lastAttemptTime: number;
};

type InstalledApp = {
  packageName: string;
  label: string;
};

const BlockerModule = NativeModules?.AppBlocker;
const isAndroid = Platform.OS === 'android';

export const setBlocklist = async (packages: string[]) => {
  if (!isAndroid || !BlockerModule?.setBlocklist) return;
  BlockerModule.setBlocklist(packages);
};

export const setSessionActive = async (active: boolean) => {
  if (!isAndroid || !BlockerModule?.setSessionActive) return;
  BlockerModule.setSessionActive(active);
};

export const openAccessibilitySettings = async () => {
  if (!isAndroid || !BlockerModule?.openAccessibilitySettings) return;
  BlockerModule.openAccessibilitySettings();
};

export const isAccessibilityEnabled = async (): Promise<boolean> => {
  if (!isAndroid || !BlockerModule?.isAccessibilityEnabled) return false;
  return BlockerModule.isAccessibilityEnabled();
};

export const getAttemptStats = async (): Promise<AttemptStats> => {
  if (!isAndroid || !BlockerModule?.getAttemptStats) {
    return {
      countToday: 0,
      lastAttemptDate: null,
      lastAttemptPackage: null,
      lastAttemptTime: 0,
    };
  }
  return BlockerModule.getAttemptStats();
};

export const getInstalledApps = async (): Promise<InstalledApp[]> => {
  if (!isAndroid || !BlockerModule?.getInstalledApps) return [];
  return BlockerModule.getInstalledApps();
};
