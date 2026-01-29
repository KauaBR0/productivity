import { Platform, NativeModules } from 'react-native';

let BackgroundService: any = null;
try {
  const mod = require('react-native-background-actions');
  BackgroundService = mod?.default ?? mod;
} catch (error) {
  BackgroundService = null;
}

const sleep = (time: number) => new Promise((resolve) => setTimeout(resolve, time));

const timerTask = async (taskDataArguments: { interval: number }) => {
  if (!BackgroundService) return;
  const { interval } = taskDataArguments;
  while (BackgroundService.isRunning()) {
    await sleep(interval);
  }
};

const baseOptions = {
  taskName: 'Productivy Timer',
  taskIcon: {
    name: 'ic_launcher',
    type: 'mipmap',
  },
  color: '#E7B84A',
  linkingURI: 'productivy://timer',
  parameters: {
    interval: 10000,
  },
};

export const startForegroundTimer = async (title: string, description: string) => {
  if (Platform.OS !== 'android') return;
  if (!NativeModules?.RNBackgroundActions) return;
  if (!BackgroundService?.start) return;
  try {
    if (BackgroundService.isRunning()) {
      await BackgroundService.updateNotification({ taskTitle: title, taskDesc: description });
      return;
    }
    await BackgroundService.start(timerTask, {
      ...baseOptions,
      taskTitle: title,
      taskDesc: description,
    });
  } catch (error) {
    console.warn('Foreground timer failed to start', error);
  }
};

export const updateForegroundTimer = async (title: string, description: string) => {
  if (Platform.OS !== 'android') return;
  if (!NativeModules?.RNBackgroundActions) return;
  if (!BackgroundService?.updateNotification) return;
  if (!BackgroundService.isRunning()) return;
  try {
    await BackgroundService.updateNotification({ taskTitle: title, taskDesc: description });
  } catch (error) {
    console.warn('Foreground timer failed to update', error);
  }
};

export const stopForegroundTimer = async () => {
  if (Platform.OS !== 'android') return;
  if (!NativeModules?.RNBackgroundActions) return;
  if (!BackgroundService?.stop) return;
  if (!BackgroundService.isRunning()) return;
  try {
    await BackgroundService.stop();
  } catch (error) {
    console.warn('Foreground timer failed to stop', error);
  }
};
