import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments, type Href } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { useEffect } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import * as Notifications from 'expo-notifications';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { SettingsProvider } from '@/context/SettingsContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { GamificationProvider } from '@/context/GamificationContext';
import { OnboardingProvider, useOnboarding } from '@/context/OnboardingContext';
import { useTimerStore } from '@/store/useTimerStore';
import Toast from 'react-native-toast-message';
import { toastConfig } from '@/components/ToastConfig';
import { OfflineNotice } from '@/components/ui/OfflineNotice';

function AppNavigationGuard() {
  const router = useRouter();
  const segments = useSegments();
  const { user, isLoading: authLoading } = useAuth();
  const { hasCompletedOnboarding, isLoading: onboardingLoading } = useOnboarding();

  useEffect(() => {
    if (authLoading || onboardingLoading) return;

    const currentPath = segments.join('/');
    const isOnboardingRoute = currentPath === 'onboarding';
    const isPublicRoute =
      currentPath === 'login' ||
      currentPath === 'register' ||
      currentPath === 'auth/callback';

    if (!hasCompletedOnboarding) {
      if (!isOnboardingRoute) {
        router.replace('/onboarding' as Href);
      }
      return;
    }

    if (isOnboardingRoute) {
      router.replace(user ? '/' : '/login');
      return;
    }

    if (!user && !isPublicRoute) {
      router.replace('/login');
      return;
    }

    if (user && isPublicRoute) {
      router.replace('/');
    }
  }, [authLoading, hasCompletedOnboarding, onboardingLoading, router, segments, user]);

  return null;
}

function AppShell() {
  const colorScheme = useColorScheme();
  const { isLoading: authLoading } = useAuth();
  const { isLoading: onboardingLoading } = useOnboarding();

  if (authLoading || onboardingLoading) {
    return (
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#121214' }}>
          <ActivityIndicator color="#E7B84A" size="large" />
        </View>
        <StatusBar style="light" />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <OfflineNotice />
      <AppNavigationGuard />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
        <Stack.Screen name="auth/callback" options={{ animation: 'fade' }} />
        <Stack.Screen name="timer" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="login" options={{ animation: 'fade' }} />
        <Stack.Screen name="register" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="profile" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="search" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="friends" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="coins-history" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="follows" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="contacts-sync" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="groups/index" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="groups/create" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="groups/[id]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="groups/ranking" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="user/[id]" options={{ animation: 'slide_from_right' }} />
      </Stack>
      <StatusBar style="light" />
      <Toast config={toastConfig} />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  const restoreTimer = useTimerStore(s => s.restoreFromStorage);

  useEffect(() => {
    restoreTimer();
  }, [restoreTimer]);

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
          <OnboardingProvider>
            <AppShell />
          </OnboardingProvider>
        </SettingsProvider>
      </GamificationProvider>
    </AuthProvider>
  );
}
