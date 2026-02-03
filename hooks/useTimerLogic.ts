import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { AppState, Vibration, Platform, Animated as RNAnimated } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useKeepAwake } from 'expo-keep-awake';
import { Audio } from 'expo-av';
import * as Notifications from 'expo-notifications';
import { useSharedValue, withTiming, Easing } from 'react-native-reanimated';
import { CycleDef } from '@/constants/FocusConfig';
import { useSettings } from '@/context/SettingsContext';
import { useGamification } from '@/context/GamificationContext';
import { startForegroundTimer, stopForegroundTimer, updateForegroundTimer } from '@/services/ForegroundTimerService';
import { setSessionActive } from '@/services/AppBlockerService';
import { ACTIVE_TIMER_STORAGE_KEY, StoredTimerState, TimerPhase } from '@/types/timer';
import { useTimerStore } from '@/store/useTimerStore';
import Toast from 'react-native-toast-message';
import { ActionDialogOpener, ActionDialogOptions } from '@/hooks/useActionDialog';

export const useTimerLogic = (options?: { openActionDialog?: ActionDialogOpener }) => {
  useKeepAwake();
  const router = useRouter();
  const { cycleId } = useLocalSearchParams();
  const { cycles, rewards, alarmSound, lofiTrack, rouletteExtraSpins } = useSettings();
  const { processCycleCompletion, setIsFocusing } = useGamification();

  // Global State from Zustand
  const {
    timeLeft, setTimeLeft,
    isActive, setIsActive,
    phase, setPhase,
    totalDuration, setTotalDuration,
    cycleId: storeCycleId, setCycleId,
    selectedReward, setSelectedReward,
    recentRewards, setRecentRewards,
    pendingRewardSeconds, setPendingRewardSeconds,
    accumulatedFocusTime, setAccumulatedFocusTime,
    accumulatedRewardTime, setAccumulatedRewardTime,
    lastFocusSeconds, setLastFocusSeconds,
    savedRewardSeconds, setSavedRewardSeconds,
    isDeepFocus, setIsDeepFocus,
    setTimerState,
    resetStore,
    restoreFromStorage
  } = useTimerStore();

  // Find cycle config
  const cycle = cycles.find(c => c.id === cycleId) as CycleDef;
  const isInfiniteCycle = cycle?.id === 'infinite' || cycle?.type === 'infinite';

  // Refs and non-store state
  const [endTime, setEndTime] = useState<number | null>(null);
  const scheduledNotificationIdRef = useRef<string | null>(null);
  const focusStartRef = useRef<number | null>(null);
  const focusAccumulatedRef = useRef(0);
  const shouldPersistRef = useRef(true);
  const shouldKeepFocusRef = useRef(false);
  const skipInitRef = useRef(false);
  const openActionDialog = options?.openActionDialog;

  // UI State (Modals)
  const [showOneMoreModal, setShowOneMoreModal] = useState(false);
  const [showRewardEndModal, setShowRewardEndModal] = useState(false);
  const [showRestEndModal, setShowRestEndModal] = useState(false);
  
  const lofiSoundRef = useRef<Audio.Sound | null>(null);
  const [isLofiMuted, setIsLofiMuted] = useState(false);
  const lastForegroundUpdateRef = useRef(0);
  const lastBlockerActiveRef = useRef<boolean | null>(null);

  // Initialize / Restore
  useEffect(() => {
    const init = async () => {
      if (!cycle || skipInitRef.current) return;
      
      // If store is already active with this cycle, just sync endTime
      if (storeCycleId === cycle.id && isActive) {
        if (!isInfiniteCycle && !endTime && timeLeft > 0) {
          setEndTime(Date.now() + timeLeft * 1000);
        }
        return;
      }

      // Try to restore from storage first
      const restored = await restoreFromStorage();
      
      if (!restored || storeCycleId !== cycle.id) {
        // New session initialization
        setCycleId(cycle.id as string);
        const initialTime = isInfiniteCycle ? 0 : cycle.focusDuration * 60;
        
        setTimerState({
          phase: 'focus',
          isActive: true,
          timeLeft: initialTime,
          totalDuration: Math.max(1, initialTime),
          accumulatedFocusTime: cycle.focusDuration,
          accumulatedRewardTime: cycle.rewardDuration,
          selectedReward: null,
          pendingRewardSeconds: null,
          lastFocusSeconds: 0,
          savedRewardSeconds: 0,
          isDeepFocus: false,
        });

        if (!isInfiniteCycle) {
          setEndTime(Date.now() + initialTime * 1000);
        } else {
          focusStartRef.current = Date.now();
          focusAccumulatedRef.current = 0;
        }
      }
    };

    void init();
  }, [cycle, storeCycleId]);

  // Sync Focus Refs for Infinite Timer when store values change (like on resume)
  useEffect(() => {
    if (isInfiniteCycle && phase === 'focus' && isActive && !focusStartRef.current) {
       focusAccumulatedRef.current = timeLeft;
       focusStartRef.current = Date.now();
    }
  }, [isInfiniteCycle, phase, isActive]);

  // Animation State
  const progress = useSharedValue(1);
  const pulseAnim = useRef(new RNAnimated.Value(0)).current;
  const buttonScale = useRef(new RNAnimated.Value(1)).current;

  const openDialog = useCallback(
    async (dialogOptions: ActionDialogOptions) => {
      if (!openActionDialog) {
        const cancelAction = dialogOptions.actions.find((action) => action.tone === 'cancel')
          ?? dialogOptions.actions.find((action) => action.key === 'cancel')
          ?? dialogOptions.actions[0];
        return cancelAction?.key ?? 'cancel';
      }
      return openActionDialog(dialogOptions);
    },
    [openActionDialog]
  );

  // Persistence Logic
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
      savedRewardSeconds,
    };
  }, [
    cycle, phase, isActive, isInfiniteCycle, endTime, timeLeft, totalDuration,
    selectedReward, recentRewards, pendingRewardSeconds, accumulatedFocusTime,
    accumulatedRewardTime, lastFocusSeconds, isDeepFocus, savedRewardSeconds
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

  // Update Progress Animation
  useEffect(() => {
      if (totalDuration > 0) {
          const nextProgress = Math.min(timeLeft / totalDuration, 1);
          progress.value = withTiming(nextProgress, {
              duration: 1000,
              easing: Easing.linear,
          });
      }
  }, [timeLeft, totalDuration, progress]);

  // Pulse Animation
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

  // Focus Status Sync (Context & Blocker)
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
  }, [phase, isActive, showOneMoreModal, setIsFocusing]);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const nextActive =
      phase === 'focus' && isActive && !showOneMoreModal && !showRewardEndModal && !showRestEndModal;
    if (lastBlockerActiveRef.current === nextActive) return;
    lastBlockerActiveRef.current = nextActive;
    void setSessionActive(nextActive);
  }, [phase, isActive, showOneMoreModal, showRewardEndModal, showRestEndModal]);

  useEffect(() => {
    return () => {
      if (Platform.OS !== 'android') return;
      void setSessionActive(false);
    };
  }, []);

  useEffect(() => {
    if (phase !== 'focus' && isDeepFocus) {
      setIsDeepFocus(false);
    }
  }, [phase, isDeepFocus]);

  useEffect(() => {
    return () => {
      if (!shouldPersistRef.current) return;
      void persistTimerState();
    };
  }, [persistTimerState]);

  // Validating cycle existence
  useEffect(() => {
    if (!cycle) {
      Toast.show({
        type: 'error',
        text1: 'Erro',
        text2: 'Ciclo não encontrado',
      });
      router.back();
    }
  }, [cycle, router]);

  // Audio Logic
  const playAlarm = useCallback(async () => {
    if (alarmSound !== 'alarm') return;
    try {
      const { sound } = await Audio.Sound.createAsync(require('../assets/sounds/alarm.mp3'));
      await sound.playAsync();
      sound.setOnPlaybackStatusUpdate(async (status) => {
          if (status.isLoaded && status.didJustFinish) await sound.unloadAsync();
      });
    } catch (error) {
      console.log('Error playing sound', error);
    }
  }, [alarmSound]);

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
    if (phase !== 'focus' || !isActive || showOneMoreModal || showRewardEndModal || showRestEndModal) return;
    if (lofiTrack === 'off') return;
    if (isLofiMuted) return;
    if (lofiSoundRef.current) return;
    try {
      const tracks = {
        lofi1: require('../assets/sounds/lofi1.mp3'),
        lofi2: require('../assets/sounds/lofi2.mp3'),
      };
      const track = lofiTrack === 'random' ? (Math.random() < 0.5 ? tracks.lofi1 : tracks.lofi2) : tracks[lofiTrack];
      const { sound } = await Audio.Sound.createAsync(track, { shouldPlay: true, isLooping: true, volume: 0.5 });
      lofiSoundRef.current = sound;
    } catch (error) {
      console.log('Error playing lofi', error);
    }
  }, [phase, isActive, showOneMoreModal, showRewardEndModal, showRestEndModal, lofiTrack, isLofiMuted]);

  useEffect(() => {
    if (phase === 'focus' && isActive && !showOneMoreModal && !showRewardEndModal && !showRestEndModal && !isLofiMuted) {
      void playLofi();
    } else {
      void stopLofi();
    }
  }, [phase, isActive, showOneMoreModal, showRewardEndModal, showRestEndModal, isLofiMuted, playLofi, stopLofi]);

  useEffect(() => {
    return () => { void stopLofi(); };
  }, [stopLofi]);

  // Notifications & Foreground Service
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

  const getPhaseNotificationContent = useCallback(() => {
    let title = 'Fase finalizada';
    let body = 'Hora de seguir para a próxima etapa.';
    if (phase === 'focus') { title = 'Tempo de foco acabou! 🚨'; body = 'Vamos escolher sua recompensa.'; }
    else if (phase === 'reward') { title = 'Recompensa finalizada! ⏱️'; body = 'Hora de voltar para a rotina.'; }
    else if (phase === 'rest') { title = 'Descanso finalizado! ✅'; body = 'Pronto para o próximo ciclo.'; }
    return { title, body };
  }, [phase]);

  const schedulePhaseEndNotification = useCallback(async (seconds: number) => {
    const { title, body } = getPhaseNotificationContent();
    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: { title, body, sound: alarmSound === 'alarm' ? 'alarm.mp3' : undefined },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds, repeats: false },
      });
      scheduledNotificationIdRef.current = id;
    } catch (error) {
      console.log('Failed to schedule notification', error);
    }
  }, [alarmSound, getPhaseNotificationContent]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getForegroundStatus = useCallback(() => {
    const cycleName = cycle?.label ? cycle.label : 'Ciclo';
    const modeTag = isInfiniteCycle ? 'Modo infinito' : null;
    const descSuffix = isInfiniteCycle && phase === 'focus' ? `Decorrido ${formatTime(timeLeft)}` : `Restante ${formatTime(timeLeft)}`;
    const desc = modeTag ? `${cycleName} • ${modeTag} • ${descSuffix}` : `${cycleName} • ${descSuffix}`;
    if (phase === 'focus') return { title: 'Foco ativo', desc };
    if (phase === 'reward') return { title: 'Recompensa ativa', desc };
    if (phase === 'rest') return { title: 'Descanso ativo', desc };
    return { title: 'Timer ativo', desc };
  }, [phase, timeLeft, cycle, isInfiniteCycle]);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const shouldRun = isActive && phase !== 'selection' && !showOneMoreModal && !showRewardEndModal && !showRestEndModal;
    if (!shouldRun) { void stopForegroundTimer(); return; }
    const { title, desc } = getForegroundStatus();
    void startForegroundTimer(title, desc);
  }, [isActive, phase, showOneMoreModal, showRewardEndModal, showRestEndModal, getForegroundStatus]);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    if (!isActive || phase === 'selection' || showOneMoreModal || showRewardEndModal || showRestEndModal) return;
    const now = Date.now();
    if (now - lastForegroundUpdateRef.current < 15000) return;
    lastForegroundUpdateRef.current = now;
    const { title, desc } = getForegroundStatus();
    void updateForegroundTimer(title, desc);
  }, [timeLeft, phase, isActive, showOneMoreModal, showRewardEndModal, showRestEndModal, getForegroundStatus]);

  // Timer Ticks
  const getFocusElapsedSeconds = useCallback(() => {
    const start = focusStartRef.current;
    if (!start) return focusAccumulatedRef.current;
    return focusAccumulatedRef.current + Math.floor((Date.now() - start) / 1000);
  }, []);

  const updateTimeLeft = useCallback(() => {
    if (!endTime) return;
    const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
    setTimeLeft(remaining);
  }, [endTime, setTimeLeft]);

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
  }, [isInfiniteCycle, phase, isActive, getFocusElapsedSeconds, setTimeLeft, setTotalDuration]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isActive && endTime && phase !== 'selection') {
      interval = setInterval(() => { updateTimeLeft(); }, 1000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [isActive, endTime, phase, updateTimeLeft]);

  useEffect(() => {
    const syncNotification = async () => {
      await cancelScheduledNotification();
      if (!isActive || !endTime || phase === 'selection') return;
      const seconds = Math.max(1, Math.ceil((endTime - Date.now()) / 1000));
      await schedulePhaseEndNotification(seconds);
    };
    void syncNotification();
  }, [isActive, endTime, phase, cancelScheduledNotification, schedulePhaseEndNotification]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        if (isInfiniteCycle && phase === 'focus') {
          const elapsed = getFocusElapsedSeconds();
          setTimeLeft(elapsed);
          setTotalDuration(Math.max(1, elapsed));
        } else { updateTimeLeft(); }
      }
    });
    return () => subscription.remove();
  }, [updateTimeLeft, isInfiniteCycle, phase, getFocusElapsedSeconds, setTimeLeft, setTotalDuration]);

  // Handlers
  const handlePhaseEnd = useCallback(() => {
    if (!isActive) return; 
    if (isInfiniteCycle && phase === 'focus') return;
    setIsActive(false);
    setEndTime(null);
    void cancelScheduledNotification();

    if (isInfiniteCycle && phase === 'reward') { playAlarm(); Vibration.vibrate([0, 500, 200, 500]); return; }
    if (isInfiniteCycle && phase === 'rest') { playAlarm(); Vibration.vibrate([0, 500, 200, 500]); setShowRestEndModal(true); return; }

    if (phase === 'focus') { playAlarm(); Vibration.vibrate([0, 500, 200, 500]); setShowOneMoreModal(true); } 
    else if (phase === 'reward') { playAlarm(); Vibration.vibrate([0, 500, 200, 500]); setShowRewardEndModal(true); } 
    else if (phase === 'rest') {
      playAlarm(); Vibration.vibrate([0, 500, 200, 500]);
      void openDialog({
        title: 'Ciclo Completo!',
        message: 'Parabéns, você finalizou o ciclo.',
        actions: [{ key: 'back', label: 'Voltar ao Início' }],
        allowBackdropClose: false,
      }).then(async (action) => {
        if (action !== 'back') return;
        skipInitRef.current = true;
        shouldPersistRef.current = false;
        shouldKeepFocusRef.current = false;
        await clearTimerState();
        router.back();
      });
    }
  }, [isActive, isInfiniteCycle, phase, cancelScheduledNotification, clearTimerState, playAlarm, router, setIsActive, openDialog]);

  useEffect(() => {
    if (isActive && timeLeft === 0 && phase !== 'selection') { handlePhaseEnd(); }
  }, [isActive, timeLeft, phase, handlePhaseEnd]);

  const handleFinishFocus = async () => {
    setShowOneMoreModal(false);
    const startedAt = Date.now() - accumulatedFocusTime * 60 * 1000;
    processCycleCompletion(accumulatedFocusTime, startedAt, cycle.label); 
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

  const handleExtendRest = async (minutes: number) => {
      setShowRestEndModal(false);
      const extraSeconds = Math.max(1, Math.round(minutes * 60));
      setTimeLeft(extraSeconds);
      setTotalDuration(extraSeconds);
      setEndTime(Date.now() + extraSeconds * 1000);
      setIsActive(true);
      await cancelScheduledNotification();
  };

  const startInfiniteFocus = useCallback(async () => {
    if (phase === 'reward') setSavedRewardSeconds(prev => prev + timeLeft);
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
  }, [cancelScheduledNotification, phase, timeLeft, setPhase, setIsActive, setTimeLeft, setTotalDuration, setSelectedReward, setLastFocusSeconds, setSavedRewardSeconds]);

  const handleFinishRest = async () => { setShowRestEndModal(false); await startInfiniteFocus(); };

  const handleOneMore = (focusAdd: number, rewardAdd: number) => {
    setShowOneMoreModal(false);
    const newTime = focusAdd * 60;
    setTimeLeft(newTime);
    setTotalDuration(newTime);
    setEndTime(Date.now() + newTime * 1000);
    setAccumulatedFocusTime(prev => prev + focusAdd);
    setAccumulatedRewardTime(prev => prev + rewardAdd);
    setIsActive(true);
  };

  const getProportionalSeconds = useCallback((focusSeconds: number, ratio: number) => { const raw = Math.round(focusSeconds * ratio); return Math.max(1, raw); }, []);

  const handleInfiniteToReward = useCallback(() => {
    if (!cycle) return;
    const focusSeconds = Math.max(1, getFocusElapsedSeconds());
    const focusBaseMinutes = cycle ? Math.max(cycle.focusDuration, 0.01) : 1;
    const rewardRatio = cycle ? cycle.rewardDuration / focusBaseMinutes : 0;
    focusAccumulatedRef.current = focusSeconds;
    focusStartRef.current = null;
    setLastFocusSeconds(focusSeconds);
    const rewardSeconds = getProportionalSeconds(focusSeconds, rewardRatio);
    const totalReward = rewardSeconds + savedRewardSeconds;
    const startedAt = Date.now() - focusSeconds * 1000;
    void processCycleCompletion(focusSeconds / 60, startedAt, cycle.label);
    setPendingRewardSeconds(totalReward);
    setSavedRewardSeconds(0);
    setPhase('selection');
    setIsActive(false);
    setEndTime(null);
    void cancelScheduledNotification();
  }, [cycle, getFocusElapsedSeconds, getProportionalSeconds, processCycleCompletion, cancelScheduledNotification, savedRewardSeconds, setPhase, setIsActive, setLastFocusSeconds, setPendingRewardSeconds, setSavedRewardSeconds]);

  const handleInfiniteToRest = useCallback(() => {
    if (!cycle) return;
    const focusBaseMinutes = cycle ? Math.max(cycle.focusDuration, 0.01) : 1;
    const restRatio = cycle ? cycle.restDuration / focusBaseMinutes : 0;
    const focusSeconds = lastFocusSeconds > 0 ? lastFocusSeconds : Math.max(1, getFocusElapsedSeconds());
    if (lastFocusSeconds <= 0) setLastFocusSeconds(focusSeconds);
    const restSeconds = getProportionalSeconds(focusSeconds, restRatio);
    setSelectedReward(null);
    setPhase('rest');
    setTimeLeft(restSeconds);
    setTotalDuration(restSeconds);
    setEndTime(Date.now() + restSeconds * 1000);
    setIsActive(true);
    void cancelScheduledNotification();
  }, [cycle, lastFocusSeconds, getFocusElapsedSeconds, getProportionalSeconds, cancelScheduledNotification, setPhase, setTimeLeft, setTotalDuration, setIsActive, setLastFocusSeconds, setSelectedReward]);

  const startReward = (reward: string, rewardSecondsOverride?: number) => {
    setRecentRewards(prev => [reward, ...prev].slice(0, 5));
    setSelectedReward(reward);
    setPhase('reward');
    const rewardTime = rewardSecondsOverride ?? accumulatedRewardTime * 60;
    setTimeLeft(rewardTime);
    setTotalDuration(rewardTime);
    setEndTime(Date.now() + rewardTime * 1000);
    setIsActive(true);
    setPendingRewardSeconds(null);
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
    if (!endTime) { setIsActive(false); void stopForegroundTimer(); return; }
    const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
    setTimeLeft(remaining);
    setEndTime(null);
    setIsActive(false);
    void stopForegroundTimer();
    void cancelScheduledNotification();
  };

  const resumeTimer = () => {
    if (isInfiniteCycle && phase === 'focus') { focusStartRef.current = Date.now(); setIsActive(true); return; }
    if (timeLeft <= 0) return;
    setEndTime(Date.now() + timeLeft * 1000);
    setIsActive(true);
  };

  const handleCancel = async () => {
    const action = await openDialog({
      title: 'Sair do ciclo?',
      message: 'Você pode voltar para a home e continuar depois. O timer seguirá contando.',
      actions: [
        { key: 'cancel', label: 'Cancelar', tone: 'cancel' },
        { key: 'background', label: 'Continuar em background' },
        { key: 'end', label: 'Encerrar ciclo', tone: 'destructive' },
      ],
    });

    if (action === 'background') {
      shouldKeepFocusRef.current = phase === 'focus' && isActive && !showOneMoreModal;
      await persistTimerState();
      router.back();
      return;
    }

    if (action !== 'end') return;
    skipInitRef.current = true;
    shouldPersistRef.current = false;
    shouldKeepFocusRef.current = false;
    if (isInfiniteCycle && phase === 'focus' && cycle) {
      const focusSeconds = Math.max(0, getFocusElapsedSeconds());
      if (focusSeconds > 0) {
        const startedAt = Date.now() - focusSeconds * 1000;
        await processCycleCompletion(focusSeconds / 60, startedAt, cycle.label);
      }
    }
    await clearTimerState();
    await stopForegroundTimer();
    await cancelScheduledNotification();
    resetStore();
    router.back();
  };

  const handleSkipRest = async () => {
    const action = await openDialog({
      title: 'Pular descanso?',
      message: 'Você finalizará o ciclo agora.',
      actions: [
        { key: 'cancel', label: 'Cancelar', tone: 'cancel' },
        { key: 'finish', label: 'Finalizar', tone: 'destructive' },
      ],
    });

    if (action !== 'finish') return;
    skipInitRef.current = true;
    setIsActive(false);
    setEndTime(null);
    shouldPersistRef.current = false;
    shouldKeepFocusRef.current = false;
    await clearTimerState();
    await stopForegroundTimer();
    await cancelScheduledNotification();
    router.back();
  };

  const rouletteRewardMinutes = useMemo(() => {
    if (isInfiniteCycle && pendingRewardSeconds) return Math.max(1, Math.round(pendingRewardSeconds / 60));
    return accumulatedRewardTime;
  }, [isInfiniteCycle, pendingRewardSeconds, accumulatedRewardTime]);

  const canToggleTimer = !(isInfiniteCycle && phase !== 'focus' && timeLeft === 0);
  const instructionText = isInfiniteCycle && phase === 'focus'
    ? (isActive ? 'Foco contínuo' : 'Pausado')
    : isInfiniteCycle && phase !== 'focus' && timeLeft === 0
      ? 'Tempo finalizado'
      : (isActive ? 'O tempo está passando...' : 'Pausado');

  return {
    cycle, rewards, theme: useSettings().theme, rouletteExtraSpins, recentRewards,
    phase, timeLeft, totalDuration, isActive, selectedReward, isInfiniteCycle, isLofiMuted, isDeepFocus, progress, pulseAnim, buttonScale,
    rouletteRewardMinutes, pendingRewardSeconds, instructionText, canToggleTimer,
    showOneMoreModal, showRewardEndModal, showRestEndModal,
    toggleTimer: isActive ? pauseTimer : resumeTimer,
    handleCancel, setIsDeepFocus, setIsLofiMuted,
    handleInfiniteToReward, handleInfiniteToRest, startInfiniteFocus,
    handleFinishFocus, handleOneMore, handleStopReward, handleExtendRest, handleFinishRest, handleSkipRest,
    startReward,
  };
};
