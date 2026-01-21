import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Vibration, FlatList, Alert, Modal, Dimensions, AppState, Pressable, Animated as RNAnimated } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useKeepAwake } from 'expo-keep-awake';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
import * as Notifications from 'expo-notifications';
import LottieView from 'lottie-react-native';
import Svg, { Circle, G } from 'react-native-svg';
import Animated, { useSharedValue, useAnimatedProps, withTiming, Easing } from 'react-native-reanimated';
import { CYCLES, CycleDef } from '../constants/FocusConfig';
import { useSettings } from '@/context/SettingsContext';
import { useGamification } from '@/context/GamificationContext';
import { X, Play, Pause, Gift, Brain, Coffee, Target, Plus, Clock } from 'lucide-react-native';
import { Theme } from '@/constants/theme';

const { width } = Dimensions.get('window');
const CIRCLE_SIZE = width * 0.8;
const STROKE_WIDTH = 15;
const RADIUS = (CIRCLE_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type TimerPhase = 'focus' | 'selection' | 'reward' | 'rest';

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

// --- Sub-component: Game of Darts ---
interface RewardGameProps {
  onComplete: (reward: string) => void;
  rewardDuration: number;
  rewards: string[];
  styles: ReturnType<typeof createGameStyles>;
}

const RewardGameScreen = ({ onComplete, rewardDuration, rewards, styles }: RewardGameProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [wonReward, setWonReward] = useState<string>('');
  const lottieRef = useRef<LottieView>(null);

  const handleThrow = () => {
    if (isPlaying) return;
    
    if (rewards.length === 0) {
        Alert.alert("Ops!", "Nenhuma recompensa configurada. Adicione nas configurações.");
        onComplete("Tempo Livre");
        return;
    }

    setIsPlaying(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    // 1. Select Reward
    const randomIndex = Math.floor(Math.random() * rewards.length);
    const selectedReward = rewards[randomIndex];
    setWonReward(selectedReward);

    // 2. Play Animation
    lottieRef.current?.play();
  };

  const handleAnimationFinish = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTimeout(() => {
        setShowResult(true);
    }, 500); // Small delay for effect
  };

  const handleClaim = () => {
    setShowResult(false);
    onComplete(wonReward);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Tente a Sorte!</Text>
        <Text style={styles.subtitle}>Lance o dardo para definir sua recompensa</Text>
      </View>

      {/* Animation Area */}
      <View style={styles.animationContainer}>
        {/* Using a static target background behind the Lottie for context if needed, 
            but usually Lottie covers it. Let's keep it subtle or remove if Lottie has bg.
            Assuming Lottie is transparent dart. We keep a placeholder target. */}
        
        {!isPlaying && (
           <View style={styles.staticTarget}>
              <Target color="#333" size={200} strokeWidth={1} />
           </View>
        )}

        <LottieView
            ref={lottieRef}
            source={{ uri: 'https://lottie.host/a50c236b-b188-4111-8803-e025c25e2b08/87AxG9eeJb.lottie' }}
            style={styles.lottie}
            loop={false}
            autoPlay={false}
            onAnimationFinish={handleAnimationFinish}
        />
      </View>

      {/* Controls */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.button, isPlaying && styles.buttonDisabled]}
          onPress={handleThrow}
          disabled={isPlaying}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>
            {isPlaying ? 'LANÇANDO...' : 'LANÇAR DARDO'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Result Modal */}
      <Modal
        visible={showResult}
        transparent
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>NA MOSCA!</Text>
            <Text style={styles.modalReward}>{wonReward}</Text>
            <Text style={styles.modalSubtitle}>{rewardDuration} minutos de diversão</Text>
            
            <TouchableOpacity style={styles.modalButton} onPress={handleClaim}>
              <Text style={styles.modalButtonText}>Aproveitar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const createGameStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 40,
  },
  header: {
    alignItems: 'center',
    marginTop: 20,
    zIndex: 10,
  },
  title: {
    color: theme.colors.text,
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    color: theme.colors.textDim,
    fontSize: 16,
  },
  animationContainer: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  staticTarget: {
    position: 'absolute',
    opacity: 0.3,
  },
  lottie: {
    width: 300,
    height: 300,
  },
  footer: {
    width: '100%',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#FF4500',
    paddingVertical: 18,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    shadowColor: '#FF4500',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonDisabled: {
    backgroundColor: '#552211',
    opacity: 0.8,
  },
  buttonText: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 1,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '90%',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },
  modalTitle: {
    color: theme.colors.accent,
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 10,
    letterSpacing: 1,
  },
  modalReward: {
    color: theme.colors.text,
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  modalSubtitle: {
    color: theme.colors.textDim,
    fontSize: 16,
    marginBottom: 30,
  },
  modalButton: {
    backgroundColor: theme.colors.accent,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: theme.radius.md,
  },
  modalButtonText: {
    color: theme.colors.accentDark,
    fontSize: 18,
    fontWeight: 'bold',
  },
});


// --- Main Timer Screen ---
export default function TimerScreen() {
  useKeepAwake(); // Keep screen on
  const router = useRouter();
  const { cycleId } = useLocalSearchParams();
  const { cycles, rewards, theme, alarmSound } = useSettings();
  const { processCycleCompletion, setIsFocusing } = useGamification();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const gameStyles = useMemo(() => createGameStyles(theme), [theme]);
  const phaseConfig = useMemo(() => createPhaseConfig(theme), [theme]);
  
  // Find cycle config
  const cycle = cycles.find(c => c.id === cycleId) as CycleDef;
  
  // State
  const [phase, setPhase] = useState<TimerPhase>('focus');
  const [timeLeft, setTimeLeft] = useState(cycle ? cycle.focusDuration * 60 : 0);
  const [isActive, setIsActive] = useState(true);
  const [selectedReward, setSelectedReward] = useState<string | null>(null);
  const [endTime, setEndTime] = useState<number | null>(
    cycle ? Date.now() + cycle.focusDuration * 60 * 1000 : null
  );
  const scheduledNotificationIdRef = useRef<string | null>(null);

  // One More Feature State
  const [showOneMoreModal, setShowOneMoreModal] = useState(false);
  const [showRewardEndModal, setShowRewardEndModal] = useState(false);
  const [accumulatedFocusTime, setAccumulatedFocusTime] = useState(cycle ? cycle.focusDuration : 0);
  const [accumulatedRewardTime, setAccumulatedRewardTime] = useState(cycle ? cycle.rewardDuration : 0);
  const [isDeepFocus, setIsDeepFocus] = useState(false);
  
  // Animation State
  const [totalDuration, setTotalDuration] = useState(cycle ? cycle.focusDuration * 60 : 1);
  const progress = useSharedValue(1);
  const pulseAnim = useRef(new RNAnimated.Value(0)).current;
  const buttonScale = useRef(new RNAnimated.Value(1)).current;

  // Update Progress
  useEffect(() => {
      if (totalDuration > 0) {
          progress.value = withTiming(timeLeft / totalDuration, {
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

    return () => { void setIsFocusing(false); };
  }, [phase, isActive, showOneMoreModal]);

  useEffect(() => {
    if (phase !== 'focus' && isDeepFocus) {
      setIsDeepFocus(false);
    }
  }, [phase, isDeepFocus]);

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

  const schedulePhaseEndNotification = useCallback(async (seconds: number) => {
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

    try {
      const channelId = alarmSound === 'alarm'
        ? 'timer-alarms'
        : alarmSound === 'system'
          ? 'timer-default'
          : 'timer-silent';

      const id = await Notifications.scheduleNotificationAsync({
        content: { title, body, sound: alarmSound === 'alarm' ? 'alarm.mp3' : alarmSound === 'system' ? true : null },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds,
          repeats: false,
        },
        android: { channelId },
      });
      scheduledNotificationIdRef.current = id;
    } catch (error) {
      console.log('Failed to schedule notification', error);
    }
  }, [phase, phaseConfig, alarmSound]);

  const updateTimeLeft = useCallback(() => {
    if (!endTime) return;
    const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
    setTimeLeft(remaining);
  }, [endTime]);

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
        updateTimeLeft();
      }
    });

    return () => subscription.remove();
  }, [updateTimeLeft]);

  const handlePhaseEnd = () => {
    if (!isActive) return; // Prevent double trigger
    setIsActive(false);
    setEndTime(null);
    void cancelScheduledNotification();

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
        { text: "Voltar ao Início", onPress: () => router.back() }
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

  const startReward = (reward: string) => {
    setSelectedReward(reward);
    setPhase('reward');
    const rewardTime = accumulatedRewardTime * 60;
    setTimeLeft(rewardTime); // Use accumulated reward time
    setTotalDuration(rewardTime);
    setEndTime(Date.now() + rewardTime * 1000);
    setIsActive(true);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCancel = async () => {
    Alert.alert(
      "Desistir?",
      "O progresso será perdido.",
      [
        { text: "Cancelar", style: "cancel" },
        { 
            text: "Sair", 
            style: "destructive", 
            onPress: async () => {
                await cancelScheduledNotification();
                router.back();
            } 
        }
      ]
    );
  };

  const pauseTimer = () => {
    if (!endTime) {
      setIsActive(false);
      return;
    }
    const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
    setTimeLeft(remaining);
    setEndTime(null);
    setIsActive(false);
    void cancelScheduledNotification();
  };

  const resumeTimer = () => {
    if (timeLeft <= 0) return;
    setEndTime(Date.now() + timeLeft * 1000);
    setIsActive(true);
  };

  if (!cycle) return null;

  const CurrentIcon = phaseConfig[phase].icon;
  const currentTheme = phaseConfig[phase];
  const deepFocusEnabled = isDeepFocus && phase === 'focus' && !showOneMoreModal && !showRewardEndModal;

  // Render Selection Phase (Game)
  if (phase === 'selection') {
    return (
      <RewardGameScreen 
        onComplete={startReward} 
        rewardDuration={accumulatedRewardTime} // Pass accumulated reward time
        rewards={rewards}
        styles={gameStyles}
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
            {isActive ? 'O tempo está passando...' : 'Pausado'}
            </Text>
        </View>
        </View>

        {/* Controls */}
        {!deepFocusEnabled ? (
          <View style={styles.controlsContainer}>
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
          {phase === 'focus' && (
            <Pressable style={styles.deepFocusToggle} onPress={() => setIsDeepFocus(true)}>
              <Text style={styles.deepFocusToggleText}>Ativar foco profundo</Text>
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
            
            <TouchableOpacity 
              style={[styles.actionButton, styles.finishButton, { backgroundColor: '#FF4500' }]}
              onPress={handleStopReward}
            >
              <Text style={styles.actionButtonText}>Parar Recompensa</Text>
            </TouchableOpacity>
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
});
