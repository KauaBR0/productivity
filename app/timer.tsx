import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Vibration, Alert, Modal, Dimensions, AppState, Pressable, Animated as RNAnimated, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useKeepAwake } from 'expo-keep-awake';
import { Audio } from 'expo-av';
import * as Notifications from 'expo-notifications';
import Svg, { Circle } from 'react-native-svg';
import Animated, { useSharedValue, useAnimatedProps, withTiming, Easing } from 'react-native-reanimated';
import { CYCLES, CycleDef } from '../constants/FocusConfig';
import { useSettings } from '@/context/SettingsContext';
import { useGamification } from '@/context/GamificationContext';
import { X, Play, Pause, Gift, Brain, Coffee, Clock, Volume2 } from 'lucide-react-native';
import { Theme } from '@/constants/theme';
import { startForegroundTimer, stopForegroundTimer, updateForegroundTimer } from '@/services/ForegroundTimerService';
import RewardRoulette from '@/components/RewardRoulette';

const { width } = Dimensions.get('window');
const CIRCLE_SIZE = width * 0.8;
const STROKE_WIDTH = 15;
const RADIUS = (CIRCLE_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const ACTIVE_TIMER_STORAGE_KEY = 'active_timer_state_v1';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type TimerPhase = 'focus' | 'selection' | 'reward' | 'rest';

type StoredTimerState = {
  version: 1;
  cycleId: string;
  phase: TimerPhase;
  isActive: boolean;
  isInfiniteCycle: boolean;
  endTime: number | null;
  timeLeft: number;
  totalDuration: number;
  selectedReward: string | null;
  recentRewards: string[];
  pendingRewardSeconds: number | null;
  accumulatedFocusTime: number;
  accumulatedRewardTime: number;
  lastFocusSeconds: number;
  focusAccumulatedSeconds: number;
  focusStartTime: number | null;
  isDeepFocus: boolean;
};

const createPhaseConfig = (theme: Theme) => ({
  focus: {
    color: '#FF4500', // Orange Red
    label: 'FOCO TOTAL',
    icon: Brain,
    bg: '#2A1010',
  },
  selection: {
    color: theme.colors.text,
    label: 'ESCOLHA SUA RECOMPENSA',
    icon: Gift,
    bg: theme.colors.bg,
  },
  reward: {
    color: '#00FF94', // Green
    label: 'RECOMPENSA',
    icon: Gift,
    bg: '#0A2A1A',
  },
  rest: {
    color: '#BF5AF2', // Purple
    label: 'DESCANSO',
    icon: Coffee,
    bg: '#1A0A2A',
  },
});

// --- Main Timer Screen ---
export default function TimerScreen() {
  useKeepAwake(); // Keep screen on
  const router = useRouter();
  const { cycleId } = useLocalSearchParams();
  const { cycles, rewards, theme, alarmSound, lofiTrack, rouletteExtraSpins } = useSettings();
  const { processCycleCompletion, setIsFocusing } = useGamification();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const phaseConfig = useMemo(() => createPhaseConfig(theme), [theme]);
  
  // Find cycle config
  const cycle = cycles.find(c => c.id === cycleId) as CycleDef;
  const isInfiniteCycle = cycle?.id === 'infinite';
  
  // State
  const [phase, setPhase] = useState<TimerPhase>('focus');
  const [timeLeft, setTimeLeft] = useState(
    cycle ? (cycle.id === 'infinite' ? 0 : cycle.focusDuration * 60) : 0
  );
  const [isActive, setIsActive] = useState(true);
  const [selectedReward, setSelectedReward] = useState<string | null>(null);
  const [endTime, setEndTime] = useState<number | null>(
    cycle ? (cycle.id === 'infinite' ? null : Date.now() + cycle.focusDuration * 60 * 1000) : null
  );
  const scheduledNotificationIdRef = useRef<string | null>(null);
  const focusStartRef = useRef<number | null>(null);
  const focusAccumulatedRef = useRef(0);
  const [lastFocusSeconds, setLastFocusSeconds] = useState(0);
  const [pendingRewardSeconds, setPendingRewardSeconds] = useState<number | null>(null);
  const shouldPersistRef = useRef(true);
  const shouldKeepFocusRef = useRef(false);

  // One More Feature State
  const [showOneMoreModal, setShowOneMoreModal] = useState(false);
  const [showRewardEndModal, setShowRewardEndModal] = useState(false);
  const [accumulatedFocusTime, setAccumulatedFocusTime] = useState(cycle ? cycle.focusDuration : 0);
  const [accumulatedRewardTime, setAccumulatedRewardTime] = useState(cycle ? cycle.rewardDuration : 0);
  const [isDeepFocus, setIsDeepFocus] = useState(false);
  const lofiSoundRef = useRef<Audio.Sound | null>(null);
  const [isLofiMuted, setIsLofiMuted] = useState(false);
  const [recentRewards, setRecentRewards] = useState<string[]>([]);
  const lastForegroundUpdateRef = useRef(0);
  
  // Animation State
  const [totalDuration, setTotalDuration] = useState(
    cycle ? (cycle.id === 'infinite' ? 1 : cycle.focusDuration * 60) : 1
  );
  const progress = useSharedValue(1);
  const pulseAnim = useRef(new RNAnimated.Value(0)).current;
  const buttonScale = useRef(new RNAnimated.Value(1)).current;

  const buildStoredState = useCallback((): StoredTimerState | null => {
    if (!cycle) return null;
    return {
      version: 1,
      cycleId: cycle.id,
      phase,
      isActive,
      isInfiniteCycle,
      endTime,
      timeLeft,
      totalDuration,
      selectedReward,
      recentRewards,
      pendingRewardSeconds,
      accumulatedFocusTime,
      accumulatedRewardTime,
      lastFocusSeconds,
      focusAccumulatedSeconds: focusAccumulatedRef.current,
      focusStartTime: focusStartRef.current,
      isDeepFocus,
    };
  }, [
    cycle,
    phase,
    isActive,
    isInfiniteCycle,
    endTime,
    timeLeft,
    totalDuration,
    selectedReward,
    recentRewards,
    pendingRewardSeconds,
    accumulatedFocusTime,
    accumulatedRewardTime,
    lastFocusSeconds,
    isDeepFocus,
  ]);

  const persistTimerState = useCallback(async () => {
    const snapshot = buildStoredState();
    if (!snapshot) return;
    try {
      await AsyncStorage.setItem(ACTIVE_TIMER_STORAGE_KEY, JSON.stringify(snapshot));
    } catch (error) {
      console.log('Failed to persist timer state', error);
    }
  }, [buildStoredState]);

  const clearTimerState = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(ACTIVE_TIMER_STORAGE_KEY);
    } catch (error) {
      console.log('Failed to clear timer state', error);
    }
  }, []);

  // Update Progress
  useEffect(() => {
      if (totalDuration > 0) {
          const nextProgress = Math.min(timeLeft / totalDuration, 1);
          progress.value = withTiming(nextProgress, {
              duration: 1000,
              easing: Easing.linear,
          });
      }
  }, [timeLeft, totalDuration]);

  useEffect(() => {
    if (!isActive || phase === 'selection') {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(0);
      return;
    }

    const loop = RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.timing(pulseAnim, { toValue: 1, duration: 1600, useNativeDriver: true }),
        RNAnimated.timing(pulseAnim, { toValue: 0, duration: 1600, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [isActive, phase, pulseAnim]);

  const animatedCircleProps = useAnimatedProps(() => {
      return {
          strokeDashoffset: CIRCUMFERENCE * (1 - progress.value),
      };
  });

  // Track start time
  const [sessionStartTime, setSessionStartTime] = useState<number>(Date.now());

  // Focus Status Sync
  useEffect(() => {
    if (phase === 'focus' && isActive && !showOneMoreModal) {
        setIsFocusing(true);
    } else {
        setIsFocusing(false);
    }

    return () => {
      const keepFocus = shouldKeepFocusRef.current && phase === 'focus' && isActive && !showOneMoreModal;
      if (!keepFocus) {
        void setIsFocusing(false);
      }
    };
  }, [phase, isActive, showOneMoreModal]);

  useEffect(() => {
    if (phase !== 'focus' && isDeepFocus) {
      setIsDeepFocus(false);
    }
  }, [phase, isDeepFocus]);

  useEffect(() => {
    const restoreTimerState = async () => {
      if (!cycle) return;
      try {
        const raw = await AsyncStorage.getItem(ACTIVE_TIMER_STORAGE_KEY);
        if (!raw) return;
        const saved = JSON.parse(raw) as StoredTimerState;
        if (saved.cycleId !== cycle.id) return;

        setPhase(saved.phase);
        setIsActive(saved.isActive);
        setSelectedReward(saved.selectedReward ?? null);
        setRecentRewards(saved.recentRewards ?? []);
        setPendingRewardSeconds(saved.pendingRewardSeconds ?? null);
        setAccumulatedFocusTime(
          Number.isFinite(saved.accumulatedFocusTime) ? saved.accumulatedFocusTime : cycle.focusDuration,
        );
        setAccumulatedRewardTime(
          Number.isFinite(saved.accumulatedRewardTime) ? saved.accumulatedRewardTime : cycle.rewardDuration,
        );
        setLastFocusSeconds(saved.lastFocusSeconds ?? 0);
        setIsDeepFocus(saved.isDeepFocus ?? false);
        focusAccumulatedRef.current = saved.focusAccumulatedSeconds ?? 0;
        focusStartRef.current = saved.focusStartTime ?? null;

        const fallbackDuration = Math.max(1, saved.timeLeft ?? 1);
        if (saved.isActive) {
          if (saved.isInfiniteCycle && saved.phase === 'focus') {
            const base = saved.focusAccumulatedSeconds ?? 0;
            const start = saved.focusStartTime;
            const elapsed = start ? base + Math.floor((Date.now() - start) / 1000) : base;
            setTimeLeft(elapsed);
            setTotalDuration(Math.max(1, elapsed));
            setEndTime(null);
            return;
          }
          if (saved.endTime) {
            const remaining = Math.max(0, Math.ceil((saved.endTime - Date.now()) / 1000));
            setTimeLeft(remaining);
            setTotalDuration(saved.totalDuration || Math.max(1, remaining));
            setEndTime(saved.endTime);
            return;
          }
        }

        setTimeLeft(saved.timeLeft ?? 0);
        setTotalDuration(saved.totalDuration || fallbackDuration);
        setEndTime(saved.isActive ? saved.endTime ?? null : null);
      } catch (error) {
        console.log('Failed to restore timer state', error);
      }
    };

    void restoreTimerState();
  }, [cycle]);

  useEffect(() => {
    return () => {
      if (!shouldPersistRef.current) return;
      void persistTimerState();
    };
  }, [persistTimerState]);

  // Validating cycle existence
  useEffect(() => {
    if (!cycle) {
      Alert.alert("Erro", "Ciclo não encontrado");
      router.back();
    }
  }, [cycle]);

  // Play Alarm Sound
  const playAlarm = async () => {
    if (alarmSound !== 'alarm') return;
    try {
      const { sound } = await Audio.Sound.createAsync(
        require('../assets/sounds/alarm.mp3')
      );
      await sound.playAsync();
      
      // Unload sound from memory after it finishes playing
      sound.setOnPlaybackStatusUpdate(async (status) => {
          if (status.isLoaded && status.didJustFinish) {
              await sound.unloadAsync();
          }
      });
    } catch (error) {
      console.log('Error playing sound', error);
    }
  };

  const stopLofi = useCallback(async () => {
    if (lofiSoundRef.current) {
      try {
        await lofiSoundRef.current.stopAsync();
        await lofiSoundRef.current.unloadAsync();
      } catch (error) {
        console.log('Error stopping lofi', error);
      } finally {
        lofiSoundRef.current = null;
      }
    }
  }, []);

  const playLofi = useCallback(async () => {
    if (phase !== 'focus' || !isActive || showOneMoreModal || showRewardEndModal) return;
    if (lofiTrack === 'off') return;
    if (isLofiMuted) return;
    if (lofiSoundRef.current) return;
    try {
      const tracks = {
        lofi1: require('../assets/sounds/lofi1.mp3'),
        lofi2: require('../assets/sounds/lofi2.mp3'),
      };
      const track = lofiTrack === 'random'
        ? (Math.random() < 0.5 ? tracks.lofi1 : tracks.lofi2)
        : tracks[lofiTrack];
      const { sound } = await Audio.Sound.createAsync(track, { shouldPlay: true, isLooping: true, volume: 0.5 });
      lofiSoundRef.current = sound;
    } catch (error) {
      console.log('Error playing lofi', error);
    }
  }, [phase, isActive, showOneMoreModal, showRewardEndModal, lofiTrack, isLofiMuted]);

  useEffect(() => {
    if (phase === 'focus' && isActive && !showOneMoreModal && !showRewardEndModal && !isLofiMuted) {
      void playLofi();
    } else {
      void stopLofi();
    }
  }, [phase, isActive, showOneMoreModal, showRewardEndModal, isLofiMuted, playLofi, stopLofi]);

  useEffect(() => {
    return () => {
      void stopLofi();
    };
  }, [stopLofi]);

  const cancelScheduledNotification = useCallback(async () => {
    if (scheduledNotificationIdRef.current) {
      try {
        await Notifications.cancelScheduledNotificationAsync(scheduledNotificationIdRef.current);
      } catch (error) {
        console.log('Failed to cancel scheduled notification', error);
      } finally {
        scheduledNotificationIdRef.current = null;
      }
    }
  }, []);

  const getFocusElapsedSeconds = useCallback(() => {
    const start = focusStartRef.current;
    if (!start) return focusAccumulatedRef.current;
    return focusAccumulatedRef.current + Math.floor((Date.now() - start) / 1000);
  }, []);

  const focusBaseMinutes = cycle ? Math.max(cycle.focusDuration, 0.01) : 1;
  const rewardRatio = cycle ? cycle.rewardDuration / focusBaseMinutes : 0;
  const restRatio = cycle ? cycle.restDuration / focusBaseMinutes : 0;

  const getProportionalSeconds = useCallback((focusSeconds: number, ratio: number) => {
    const raw = Math.round(focusSeconds * ratio);
    return Math.max(1, raw);
  }, []);

  const getPhaseNotificationContent = useCallback(() => {
    const currentConfig = phaseConfig[phase];
    let title = `${currentConfig.label} finalizado`;
    let body = 'Hora de seguir para a próxima etapa.';

    if (phase === 'focus') {
      title = 'Tempo de foco acabou! 🚨';
      body = 'Vamos escolher sua recompensa.';
    } else if (phase === 'reward') {
      title = 'Recompensa finalizada! ⏱️';
      body = 'Hora de voltar para a rotina.';
    } else if (phase === 'rest') {
      title = 'Descanso finalizado! ✅';
      body = 'Pronto para o próximo ciclo.';
    }

    return { title, body };
  }, [phase, phaseConfig]);

  const schedulePhaseEndNotification = useCallback(async (seconds: number) => {
    const { title, body } = getPhaseNotificationContent();
    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: alarmSound === 'alarm' ? 'alarm.mp3' : undefined,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds,
          repeats: false,
        },
      });
      scheduledNotificationIdRef.current = id;
    } catch (error) {
      console.log('Failed to schedule notification', error);
    }
  }, [alarmSound, getPhaseNotificationContent]);

  const updateTimeLeft = useCallback(() => {
    if (!endTime) return;
    const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
    setTimeLeft(remaining);
  }, [endTime]);

  useEffect(() => {
    if (!isInfiniteCycle || phase !== 'focus' || !isActive) return;
    if (!focusStartRef.current) {
      focusStartRef.current = Date.now();
    }
    const tick = () => {
      const elapsed = getFocusElapsedSeconds();
      setTimeLeft(elapsed);
      setTotalDuration(Math.max(1, elapsed));
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [isInfiniteCycle, phase, isActive, getFocusElapsedSeconds]);

  // Timer Logic (wall-clock based so it keeps time across background / tab switches)
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    if (isActive && endTime && phase !== 'selection') {
      interval = setInterval(() => {
        updateTimeLeft();
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, endTime, phase, updateTimeLeft]);

  // Schedule/cancel notification for phase end
  useEffect(() => {
    const syncNotification = async () => {
      await cancelScheduledNotification();

      if (!isActive || !endTime || phase === 'selection') return;
      const seconds = Math.max(1, Math.ceil((endTime - Date.now()) / 1000));
      await schedulePhaseEndNotification(seconds);
    };

    void syncNotification();
  }, [isActive, endTime, phase, cancelScheduledNotification, schedulePhaseEndNotification]);

  // Handle phase end when time reaches zero
  useEffect(() => {
    if (isActive && timeLeft === 0 && phase !== 'selection') {
      handlePhaseEnd();
    }
  }, [isActive, timeLeft, phase]);

  // Sync on AppState changes (resume from background)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        if (isInfiniteCycle && phase === 'focus') {
          const elapsed = getFocusElapsedSeconds();
          setTimeLeft(elapsed);
          setTotalDuration(Math.max(1, elapsed));
        } else {
          updateTimeLeft();
        }
      }
    });

    return () => subscription.remove();
  }, [updateTimeLeft, isInfiniteCycle, phase, getFocusElapsedSeconds]);

  const handlePhaseEnd = () => {
    if (!isActive) return; // Prevent double trigger
    if (isInfiniteCycle && phase === 'focus') return;
    setIsActive(false);
    setEndTime(null);
    void cancelScheduledNotification();

    if (isInfiniteCycle && (phase === 'reward' || phase === 'rest')) {
      playAlarm();
      Vibration.vibrate([0, 500, 200, 500]);
      return;
    }

    if (phase === 'focus') {
      playAlarm(); // Play custom alarm sound
      Vibration.vibrate([0, 500, 200, 500]); // Vibrate pattern
      setShowOneMoreModal(true); // Show "One More" option instead of direct transition
    } else if (phase === 'reward') {
      playAlarm();
      Vibration.vibrate([0, 500, 200, 500]);
      // Show manual stop modal instead of auto transition
      setShowRewardEndModal(true);
    } else if (phase === 'rest') {
      playAlarm();
      Vibration.vibrate([0, 500, 200, 500]);
      Alert.alert("Ciclo Completo!", "Parabéns, você finalizou o ciclo.", [
        {
          text: "Voltar ao Início",
          onPress: async () => {
            shouldPersistRef.current = false;
            shouldKeepFocusRef.current = false;
            await clearTimerState();
            router.back();
          },
        },
      ]);
    }
  };

  const handleFinishFocus = async () => {
    setShowOneMoreModal(false);
    const startedAt = Date.now() - accumulatedFocusTime * 60 * 1000;
    processCycleCompletion(accumulatedFocusTime, startedAt, cycle.label); // AWARD XP with total accumulated time
    setPhase('selection');
    setIsActive(false);
    setEndTime(null);
    await stopForegroundTimer();
    await cancelScheduledNotification();
  };

  const handleStopReward = async () => {
      setShowRewardEndModal(false);
      setPhase('rest');
      const restSeconds = cycle.restDuration * 60;
      setTimeLeft(restSeconds);
      setTotalDuration(restSeconds);
      setEndTime(Date.now() + restSeconds * 1000);
      setIsActive(true);
      await cancelScheduledNotification();
  };

  const handleExtendReward = async (minutes: number) => {
      setShowRewardEndModal(false);
      const extraSeconds = Math.max(1, Math.round(minutes * 60));
      setTimeLeft(extraSeconds);
      setTotalDuration(extraSeconds);
      setEndTime(Date.now() + extraSeconds * 1000);
      setIsActive(true);
      await cancelScheduledNotification();
  };

  const handleOneMore = (focusAdd: number, rewardAdd: number) => {
    setShowOneMoreModal(false);
    // Add minutes to focus
    const newTime = focusAdd * 60;
    setTimeLeft(newTime);
    setTotalDuration(newTime);
    setEndTime(Date.now() + newTime * 1000);
    // Update accumulators
    setAccumulatedFocusTime(prev => prev + focusAdd);
    setAccumulatedRewardTime(prev => prev + rewardAdd);
    // Resume
    setIsActive(true);
  };

  const startInfiniteFocus = useCallback(async () => {
    setSelectedReward(null);
    setPhase('focus');
    setIsActive(true);
    setEndTime(null);
    setTimeLeft(0);
    setTotalDuration(1);
    setLastFocusSeconds(0);
    focusAccumulatedRef.current = 0;
    focusStartRef.current = Date.now();
    await cancelScheduledNotification();
  }, [cancelScheduledNotification]);

  const handleInfiniteToReward = useCallback(() => {
    if (!cycle) return;
    const focusSeconds = Math.max(1, getFocusElapsedSeconds());
    focusAccumulatedRef.current = focusSeconds;
    focusStartRef.current = null;
    setLastFocusSeconds(focusSeconds);
    const rewardSeconds = getProportionalSeconds(focusSeconds, rewardRatio);
    const startedAt = Date.now() - focusSeconds * 1000;
    void processCycleCompletion(focusSeconds / 60, startedAt, cycle.label);
    setPendingRewardSeconds(rewardSeconds);
    setPhase('selection');
    setIsActive(false);
    setEndTime(null);
    void cancelScheduledNotification();
  }, [cycle, getFocusElapsedSeconds, getProportionalSeconds, rewardRatio, processCycleCompletion, cancelScheduledNotification]);

  const handleInfiniteToRest = useCallback(() => {
    if (!cycle) return;
    const focusSeconds = lastFocusSeconds > 0 ? lastFocusSeconds : Math.max(1, getFocusElapsedSeconds());
    if (lastFocusSeconds <= 0) {
      setLastFocusSeconds(focusSeconds);
    }
    const restSeconds = getProportionalSeconds(focusSeconds, restRatio);
    setSelectedReward(null);
    setPhase('rest');
    setTimeLeft(restSeconds);
    setTotalDuration(restSeconds);
    setEndTime(Date.now() + restSeconds * 1000);
    setIsActive(true);
    void cancelScheduledNotification();
  }, [cycle, lastFocusSeconds, getFocusElapsedSeconds, getProportionalSeconds, restRatio, cancelScheduledNotification]);

  const startReward = (reward: string, rewardSecondsOverride?: number) => {
    setRecentRewards(prev => [reward, ...prev].slice(0, 5));
    setSelectedReward(reward);
    setPhase('reward');
    const rewardTime = rewardSecondsOverride ?? accumulatedRewardTime * 60;
    setTimeLeft(rewardTime); // Use accumulated reward time
    setTotalDuration(rewardTime);
    setEndTime(Date.now() + rewardTime * 1000);
    setIsActive(true);
    setPendingRewardSeconds(null);
  };

  const rouletteRewardMinutes = useMemo(() => {
    if (isInfiniteCycle && pendingRewardSeconds) {
      return Math.max(1, Math.round(pendingRewardSeconds / 60));
    }
    return accumulatedRewardTime;
  }, [isInfiniteCycle, pendingRewardSeconds, accumulatedRewardTime]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getForegroundStatus = useCallback(() => {
    const cycleName = cycle?.label ? cycle.label : 'Ciclo';
    const modeTag = isInfiniteCycle ? 'Modo infinito' : null;
    const descSuffix = isInfiniteCycle && phase === 'focus'
      ? `Decorrido ${formatTime(timeLeft)}`
      : `Restante ${formatTime(timeLeft)}`;
    const desc = modeTag ? `${cycleName} • ${modeTag} • ${descSuffix}` : `${cycleName} • ${descSuffix}`;

    if (phase === 'focus') {
      return { title: 'Foco ativo', desc };
    }
    if (phase === 'reward') {
      return { title: 'Recompensa ativa', desc };
    }
    if (phase === 'rest') {
      return { title: 'Descanso ativo', desc };
    }
    return { title: 'Timer ativo', desc };
  }, [phase, timeLeft, cycle, isInfiniteCycle]);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const shouldRun = isActive && phase !== 'selection' && !showOneMoreModal && !showRewardEndModal;
    if (!shouldRun) {
      void stopForegroundTimer();
      return;
    }
    const { title, desc } = getForegroundStatus();
    void startForegroundTimer(title, desc);
  }, [isActive, phase, showOneMoreModal, showRewardEndModal, getForegroundStatus]);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    if (!isActive || phase === 'selection' || showOneMoreModal || showRewardEndModal) return;
    const now = Date.now();
    if (now - lastForegroundUpdateRef.current < 15000) return;
    lastForegroundUpdateRef.current = now;
    const { title, desc } = getForegroundStatus();
    void updateForegroundTimer(title, desc);
  }, [timeLeft, phase, isActive, showOneMoreModal, showRewardEndModal, getForegroundStatus]);

  useEffect(() => {
    return () => {
      void stopForegroundTimer();
    };
  }, []);

  const handleCancel = async () => {
    Alert.alert(
      "Sair do ciclo?",
      "Você pode voltar para a home e continuar depois. O timer seguirá contando.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Continuar em background",
          onPress: async () => {
            shouldKeepFocusRef.current = phase === 'focus' && isActive && !showOneMoreModal;
            await persistTimerState();
            router.back();
          },
        },
        {
          text: "Encerrar ciclo",
          style: "destructive",
          onPress: async () => {
            shouldPersistRef.current = false;
            shouldKeepFocusRef.current = false;
            await clearTimerState();
            await stopForegroundTimer();
            await cancelScheduledNotification();
            router.back();
          },
        },
      ]
    );
  };

  const handleSkipRest = async () => {
    Alert.alert(
      "Pular descanso?",
      "Você finalizará o ciclo agora.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Finalizar",
          style: "destructive",
            onPress: async () => {
              setIsActive(false);
              setEndTime(null);
              shouldPersistRef.current = false;
              shouldKeepFocusRef.current = false;
              await clearTimerState();
              await stopForegroundTimer();
              await cancelScheduledNotification();
              router.back();
            },
        },
      ]
    );
  };

  const pauseTimer = () => {
    if (isInfiniteCycle && phase === 'focus') {
      if (focusStartRef.current) {
        const elapsed = getFocusElapsedSeconds();
        focusAccumulatedRef.current = elapsed;
        focusStartRef.current = null;
        setTimeLeft(elapsed);
        setTotalDuration(Math.max(1, elapsed));
      }
      setIsActive(false);
      void stopForegroundTimer();
      void cancelScheduledNotification();
      return;
    }
    if (!endTime) {
      setIsActive(false);
      void stopForegroundTimer();
      return;
    }
    const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
    setTimeLeft(remaining);
    setEndTime(null);
    setIsActive(false);
    void stopForegroundTimer();
    void cancelScheduledNotification();
  };

  const resumeTimer = () => {
    if (isInfiniteCycle && phase === 'focus') {
      focusStartRef.current = Date.now();
      setIsActive(true);
      return;
    }
    if (timeLeft <= 0) return;
    setEndTime(Date.now() + timeLeft * 1000);
    setIsActive(true);
  };

  if (!cycle) return null;

  const CurrentIcon = phaseConfig[phase].icon;
  const currentTheme = phaseConfig[phase];
  const deepFocusEnabled = isDeepFocus && phase === 'focus' && !showOneMoreModal && !showRewardEndModal;
  const canToggleTimer = !(isInfiniteCycle && phase !== 'focus' && timeLeft === 0);
  const instructionText = isInfiniteCycle && phase === 'focus'
    ? (isActive ? 'Foco contínuo' : 'Pausado')
    : isInfiniteCycle && phase !== 'focus' && timeLeft === 0
      ? 'Tempo finalizado'
      : (isActive ? 'O tempo está passando...' : 'Pausado');

  // Render Selection Phase (Game)
  if (phase === 'selection') {
    return (
      <RewardRoulette
        onComplete={(reward) =>
          startReward(reward, isInfiniteCycle ? pendingRewardSeconds ?? undefined : undefined)
        }
        rewardDuration={rouletteRewardMinutes}
        rewards={rewards}
        extraSpins={rouletteExtraSpins}
        recentRewards={recentRewards}
        theme={theme}
      />
    );
  }

  // Render Timer Phases (Focus, Reward, Rest)
  return (
    <View style={[styles.container, { backgroundColor: currentTheme.bg }]}>
      <View style={styles.background}>
        <View style={[styles.glowOrb, { backgroundColor: `${currentTheme.color}33` }]} />
        <View style={[styles.glowOrbSecondary, { backgroundColor: `${currentTheme.color}22` }]} />
      </View>
      <View style={styles.mainContent} pointerEvents={deepFocusEnabled ? 'none' : 'auto'}>
        {/* Top Bar */}
        <View style={styles.topBar}>
          {deepFocusEnabled ? <View style={{ width: 36 }} /> : (
            <TouchableOpacity onPress={handleCancel} style={styles.iconButton}>
              <X color="#FFF" size={28} />
            </TouchableOpacity>
          )}
          <View style={styles.phaseBadge}>
            <CurrentIcon color={currentTheme.color} size={18} />
            <Text style={[styles.phaseText, { color: currentTheme.color }]}>
              {phase === 'reward' && selectedReward ? selectedReward.toUpperCase() : currentTheme.label}
            </Text>
          </View>
          <View style={{ width: 28 }} /> 
        </View>

        {/* Main Timer */}
        <View style={styles.timerContainer}>
        <RNAnimated.View
          style={[
            styles.timerHalo,
            {
              borderColor: `${currentTheme.color}66`,
              opacity: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.65] }),
              transform: [{ scale: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.98, 1.04] }) }],
            },
          ]}
        />
        <Svg width={CIRCLE_SIZE} height={CIRCLE_SIZE} style={styles.timerSvg}>
            {/* Background Circle */}
            <Circle
                cx={CIRCLE_SIZE / 2}
                cy={CIRCLE_SIZE / 2}
                r={RADIUS}
                stroke="#1E1E24"
                strokeWidth={STROKE_WIDTH}
                fill="none"
            />
            {/* Animated Progress Circle (temporarily disabled for debugging) */}
            {/* <AnimatedCircle
                cx={CIRCLE_SIZE / 2}
                cy={CIRCLE_SIZE / 2}
                r={RADIUS}
                stroke={currentTheme.color}
                strokeWidth={STROKE_WIDTH}
                fill="none"
                strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
                strokeLinecap="round"
                animatedProps={animatedCircleProps}
                rotation="-90"
                origin={`${CIRCLE_SIZE / 2}, ${CIRCLE_SIZE / 2}`}
            /> */}
            <Circle
                cx={CIRCLE_SIZE / 2}
                cy={CIRCLE_SIZE / 2}
                r={RADIUS}
                stroke={currentTheme.color}
                strokeWidth={STROKE_WIDTH}
                fill="none"
                strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
                strokeLinecap="round"
                rotation="-90"
                origin={`${CIRCLE_SIZE / 2}, ${CIRCLE_SIZE / 2}`}
            />
        </Svg>
        
        <View style={styles.timerTextContainer}>
            <Text style={[styles.timerText, { color: currentTheme.color }]}>
            {formatTime(timeLeft)}
            </Text>
            <Text style={styles.instructionText}>
            {instructionText}
            </Text>
        </View>
        </View>

        {/* Controls */}
        {!deepFocusEnabled ? (
          <View style={styles.controlsContainer}>
          {canToggleTimer && (
            <Pressable
              onPressIn={() => {
                RNAnimated.spring(buttonScale, { toValue: 0.95, useNativeDriver: true, friction: 6 }).start();
              }}
              onPressOut={() => {
                RNAnimated.spring(buttonScale, { toValue: 1, useNativeDriver: true, friction: 6 }).start();
              }}
              onPress={() => {
                if (isActive) {
                  pauseTimer();
                } else {
                  resumeTimer();
                }
              }}
            >
              <RNAnimated.View style={[styles.controlButton, { backgroundColor: currentTheme.color, transform: [{ scale: buttonScale }] }]}>
                {isActive ? (
                  <Pause color="#000" fill="#000" size={32} />
                ) : (
                  <Play color="#000" fill="#000" size={32} />
                )}
              </RNAnimated.View>
            </Pressable>
          )}
          {phase === 'focus' && (
            <Pressable style={styles.deepFocusToggle} onPress={() => setIsDeepFocus(true)}>
              <Text style={styles.deepFocusToggleText}>Ativar foco profundo</Text>
            </Pressable>
          )}
          {lofiTrack !== 'off' && (
            <Pressable
              style={[styles.lofiToggle, isLofiMuted && styles.lofiToggleMuted]}
              onPress={() => setIsLofiMuted(prev => !prev)}
            >
              <Volume2 color={theme.colors.textMuted} size={18} />
            </Pressable>
          )}
          {isInfiniteCycle && phase === 'focus' && (
            <Pressable
              style={[
                styles.infiniteActionButton,
                { borderColor: `${currentTheme.color}55`, backgroundColor: `${currentTheme.color}22` },
              ]}
              onPress={handleInfiniteToReward}
            >
              <Text style={[styles.infiniteActionText, { color: currentTheme.color }]}>Ir para recompensa</Text>
            </Pressable>
          )}
          {isInfiniteCycle && phase === 'reward' && (
            <View style={styles.infiniteActionGroup}>
              <Pressable
                style={[
                  styles.infiniteActionButton,
                  { borderColor: `${currentTheme.color}55`, backgroundColor: `${currentTheme.color}22` },
                ]}
                onPress={startInfiniteFocus}
              >
                <Text style={[styles.infiniteActionText, { color: currentTheme.color }]}>Voltar ao foco</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.infiniteActionButton,
                  { borderColor: `${currentTheme.color}88`, backgroundColor: `${currentTheme.color}33` },
                ]}
                onPress={handleInfiniteToRest}
              >
                <Text style={[styles.infiniteActionText, { color: currentTheme.color }]}>Ir para descanso</Text>
              </Pressable>
            </View>
          )}
          {isInfiniteCycle && phase === 'rest' && (
            <Pressable
              style={[
                styles.infiniteActionButton,
                { borderColor: `${currentTheme.color}55`, backgroundColor: `${currentTheme.color}22` },
              ]}
              onPress={startInfiniteFocus}
            >
              <Text style={[styles.infiniteActionText, { color: currentTheme.color }]}>Voltar ao foco</Text>
            </Pressable>
          )}
          {phase === 'rest' && !isInfiniteCycle && (
            <Pressable style={styles.skipRestButton} onPress={handleSkipRest}>
              <Text style={styles.skipRestText}>Pular descanso</Text>
            </Pressable>
          )}
          </View>
        ) : null}
      </View>

      {deepFocusEnabled && (
        <View style={styles.deepFocusFooter}>
          <Pressable
            onLongPress={() => setIsDeepFocus(false)}
            delayLongPress={400}
            style={styles.deepFocusPill}
          >
            <Text style={styles.deepFocusText}>Modo foco profundo · segure para sair</Text>
          </Pressable>
        </View>
      )}

      {/* One More Modal */}
      <Modal
        visible={showOneMoreModal}
        transparent
        animationType="slide"
        onRequestClose={() => {}} // Prevent hardware back button from closing it without action
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Brain color="#FF4500" size={32} />
              <Text style={styles.modalTitle}>Tempo Esgotado!</Text>
            </View>
            <Text style={styles.modalDescription}>
              Você entrou no fluxo! Quer estender seu foco e ganhar mais recompensa?
            </Text>
            
            <Text style={styles.optionsTitle}>Escolha sua extensão</Text>
            <View style={styles.optionsGrid}>
              <TouchableOpacity 
                style={[styles.optionCard, styles.optionCardAccent]}
                onPress={() => handleOneMore(10, 5)}
                activeOpacity={0.85}
              >
                <View>
                  <Text style={styles.optionTitle}>+10 min</Text>
                  <Text style={styles.optionSubtitle}>Esforço extra curto</Text>
                </View>
                <View style={styles.optionBadge}>
                  <Text style={styles.optionBadgeText}>+5 min recompensa</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.optionCard}
                onPress={() => handleOneMore(20, 10)}
                activeOpacity={0.85}
              >
                <View>
                  <Text style={styles.optionTitle}>+20 min</Text>
                  <Text style={styles.optionSubtitle}>Ritmo consistente</Text>
                </View>
                <View style={styles.optionBadge}>
                  <Text style={styles.optionBadgeText}>+10 min recompensa</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.optionCard}
                onPress={() => handleOneMore(30, 15)}
                activeOpacity={0.85}
              >
                <View>
                  <Text style={styles.optionTitle}>+30 min</Text>
                  <Text style={styles.optionSubtitle}>Sprint final</Text>
                </View>
                <View style={styles.optionBadge}>
                  <Text style={styles.optionBadgeText}>+15 min recompensa</Text>
                </View>
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={[styles.actionButton, styles.finishButton]}
              onPress={handleFinishFocus}
            >
              <Gift color="#000" size={20} style={{ marginRight: 8 }} />
              <Text style={[styles.actionButtonText, { color: '#000' }]}>Ir para Recompensa</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Reward End Modal */}
      <Modal
        visible={showRewardEndModal}
        transparent
        animationType="slide"
        onRequestClose={() => {}} 
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Clock color="#FF4500" size={32} />
              <Text style={styles.modalTitle}>Acabou o Tempo!</Text>
            </View>
            <Text style={styles.modalDescription}>
              Sua recompensa chegou ao fim.
            </Text>
            {isInfiniteCycle ? (
              <>
                <Text style={styles.optionsTitle}>Prolongar recompensa</Text>
                <View style={styles.optionsGrid}>
                  <TouchableOpacity
                    style={styles.optionCard}
                    onPress={() => handleExtendReward(5)}
                    activeOpacity={0.85}
                  >
                    <View>
                      <Text style={styles.optionTitle}>+5 min</Text>
                      <Text style={styles.optionSubtitle}>Pausa rápida</Text>
                    </View>
                    <View style={styles.optionBadge}>
                      <Text style={styles.optionBadgeText}>Continuar</Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.optionCard}
                    onPress={() => handleExtendReward(10)}
                    activeOpacity={0.85}
                  >
                    <View>
                      <Text style={styles.optionTitle}>+10 min</Text>
                      <Text style={styles.optionSubtitle}>Relaxar um pouco</Text>
                    </View>
                    <View style={styles.optionBadge}>
                      <Text style={styles.optionBadgeText}>Continuar</Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.optionCard}
                    onPress={() => handleExtendReward(15)}
                    activeOpacity={0.85}
                  >
                    <View>
                      <Text style={styles.optionTitle}>+15 min</Text>
                      <Text style={styles.optionSubtitle}>Recompensa longa</Text>
                    </View>
                    <View style={styles.optionBadge}>
                      <Text style={styles.optionBadgeText}>Continuar</Text>
                    </View>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  style={[styles.actionButton, styles.finishButton, { backgroundColor: '#FF4500' }]}
                  onPress={handleStopReward}
                >
                  <Text style={styles.actionButtonText}>Ir para descanso</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                style={[styles.actionButton, styles.finishButton, { backgroundColor: '#FF4500' }]}
                onPress={handleStopReward}
              >
                <Text style={styles.actionButtonText}>Parar Recompensa</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

    </View>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
    paddingHorizontal: 20,
  },
  mainContent: {
    flex: 1,
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  glowOrb: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    top: -140,
    left: -80,
  },
  glowOrbSecondary: {
    position: 'absolute',
    width: 360,
    height: 360,
    borderRadius: 180,
    bottom: -180,
    right: -120,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  iconButton: {
    padding: 8,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surfaceSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  phaseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: theme.radius.lg,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  phaseText: {
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  timerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  timerHalo: {
    position: 'absolute',
    width: CIRCLE_SIZE + 36,
    height: CIRCLE_SIZE + 36,
    borderRadius: (CIRCLE_SIZE + 36) / 2,
    borderWidth: 2,
  },
  timerSvg: {
      transform: [{ rotateZ: '-90deg' }] 
  },
  timerTextContainer: {
      position: 'absolute',
      justifyContent: 'center',
      alignItems: 'center',
  },
  timerText: {
    fontSize: 68,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
    letterSpacing: 1,
  },
  instructionText: {
    color: theme.colors.textDim,
    marginTop: 10,
    fontSize: 16,
  },
  controlsContainer: {
    marginBottom: 60,
    alignItems: 'center',
    gap: 12,
  },
  controlButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  infiniteActionGroup: {
    width: '100%',
    gap: 10,
    marginTop: 6,
  },
  infiniteActionButton: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
  },
  infiniteActionText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end', // Bottom sheet style or center
    alignItems: 'center',
    paddingBottom: 40,
  },
  modalContent: {
    width: '90%',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  modalTitle: {
    color: theme.colors.text,
    fontSize: 24,
    fontWeight: 'bold',
  },
  modalDescription: {
    color: theme.colors.textDim,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  optionsTitle: {
    width: '100%',
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  optionsGrid: {
    width: '100%',
    gap: 12,
    marginBottom: 20,
  },
  optionCard: {
    backgroundColor: theme.colors.surfaceSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionCardAccent: {
    borderColor: 'rgba(255, 69, 0, 0.5)',
    backgroundColor: 'rgba(255, 69, 0, 0.12)',
  },
  optionTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  optionSubtitle: {
    color: theme.colors.textDim,
    fontSize: 13,
    marginTop: 4,
  },
  optionBadge: {
    backgroundColor: 'rgba(231, 184, 74, 0.16)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(231, 184, 74, 0.35)',
  },
  optionBadgeText: {
    color: theme.colors.accent,
    fontSize: 12,
    fontWeight: '700',
  },
  actionButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: theme.radius.md,
    marginBottom: 12,
  },
  oneMoreButton: {
    backgroundColor: theme.colors.surfaceSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  finishButton: {
    backgroundColor: '#00FF94',
    marginTop: 4,
  },
  actionButtonText: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: 'bold',
  },
  actionSubText: {
      color: '#00FF94', // Green for reward
      fontSize: 12,
      marginTop: 2,
      fontWeight: '600',
  },
  deepFocusToggle: {
    marginTop: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSoft,
  },
  deepFocusToggleText: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  lofiToggle: {
    marginTop: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  lofiToggleMuted: {
    opacity: 0.5,
  },
  deepFocusFooter: {
    alignItems: 'center',
    marginBottom: 40,
    zIndex: 2,
  },
  deepFocusPill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  deepFocusText: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  skipRestButton: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,69,69,0.5)',
    backgroundColor: 'rgba(255,69,69,0.12)',
  },
  skipRestText: {
    color: theme.colors.danger,
    fontSize: 12,
    fontWeight: '700',
  },
});
