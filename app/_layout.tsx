import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { SettingsProvider } from '@/context/SettingsContext';
import { AuthProvider } from '@/context/AuthContext';
import { GamificationProvider } from '@/context/GamificationContext';

// Configure Notifications Handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    // Request permissions on app load
    (async () => {
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') {
        await Notifications.requestPermissionsAsync();
      }
    })();
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    (async () => {
      await Notifications.setNotificationChannelAsync('timer-alarms', {
        name: 'Alarmes do Timer',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 500, 200, 500],
        sound: 'alarm.mp3',
        enableVibrate: true,
        bypassDnd: true,
        lightColor: '#E7B84A',
      });

      await Notifications.setNotificationChannelAsync('timer-silent', {
        name: 'Alertas do Timer (Silencioso)',
        importance: Notifications.AndroidImportance.DEFAULT,
        enableVibrate: false,
      });
    })();
  }, []);

  return (
    <AuthProvider>
      <GamificationProvider>
        <SettingsProvider>
          <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="timer" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="login" options={{ animation: 'fade' }} />
              <Stack.Screen name="register" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="profile" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
              <Stack.Screen name="search" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="friends" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="contacts-sync" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="groups/index" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="groups/create" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="groups/[id]" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="groups/ranking" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="user/[id]" options={{ animation: 'slide_from_right' }} />
            </Stack>
            <StatusBar style="light" />
          </ThemeProvider>
        </SettingsProvider>
      </GamificationProvider>
    </AuthProvider>
  );
}
