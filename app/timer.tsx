import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Vibration, FlatList, Alert, Modal, Dimensions, AppState } from 'react-native';
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

const { width } = Dimensions.get('window');
const CIRCLE_SIZE = width * 0.8;
const STROKE_WIDTH = 15;
const RADIUS = (CIRCLE_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type TimerPhase = 'focus' | 'selection' | 'reward' | 'rest';

const PHASE_CONFIG = {
  focus: {
    color: '#FF4500', // Orange Red
    label: 'FOCO TOTAL',
    icon: Brain,
    bg: '#2A1010',
  },
  selection: {
    color: '#FFFFFF',
    label: 'ESCOLHA SUA RECOMPENSA',
    icon: Gift,
    bg: '#121214',
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
};

// --- Sub-component: Game of Darts ---
interface RewardGameProps {
  onComplete: (reward: string) => void;
  rewardDuration: number;
  rewards: string[];
}

const RewardGameScreen = ({ onComplete, rewardDuration, rewards }: RewardGameProps) => {
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
    <View style={gameStyles.container}>
      <View style={gameStyles.header}>
        <Text style={gameStyles.title}>Tente a Sorte!</Text>
        <Text style={gameStyles.subtitle}>Lance o dardo para definir sua recompensa</Text>
      </View>

      {/* Animation Area */}
      <View style={gameStyles.animationContainer}>
        {/* Using a static target background behind the Lottie for context if needed, 
            but usually Lottie covers it. Let's keep it subtle or remove if Lottie has bg.
            Assuming Lottie is transparent dart. We keep a placeholder target. */}
        
        {!isPlaying && (
           <View style={gameStyles.staticTarget}>
              <Target color="#333" size={200} strokeWidth={1} />
           </View>
        )}

        <LottieView
            ref={lottieRef}
            source={{ uri: 'https://lottie.host/a50c236b-b188-4111-8803-e025c25e2b08/87AxG9eeJb.lottie' }}
            style={gameStyles.lottie}
            loop={false}
            autoPlay={false}
            onAnimationFinish={handleAnimationFinish}
        />
      </View>

      {/* Controls */}
      <View style={gameStyles.footer}>
        <TouchableOpacity 
          style={[gameStyles.button, isPlaying && gameStyles.buttonDisabled]}
          onPress={handleThrow}
          disabled={isPlaying}
          activeOpacity={0.8}
        >
          <Text style={gameStyles.buttonText}>
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
        <View style={gameStyles.modalOverlay}>
          <View style={gameStyles.modalContent}>
            <Text style={gameStyles.modalTitle}>NA MOSCA!</Text>
            <Text style={gameStyles.modalReward}>{wonReward}</Text>
            <Text style={gameStyles.modalSubtitle}>{rewardDuration} minutos de diversão</Text>
            
            <TouchableOpacity style={gameStyles.modalButton} onPress={handleClaim}>
              <Text style={gameStyles.modalButtonText}>Aproveitar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const gameStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121214',
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
    color: '#FFF',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    color: '#A1A1AA',
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
    borderRadius: 16,
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
    color: '#FFF',
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
    backgroundColor: '#1E1E24',
    borderRadius: 24,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },
  modalTitle: {
    color: '#00FF94',
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 10,
    letterSpacing: 1,
  },
  modalReward: {
    color: '#FFF',
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  modalSubtitle: {
    color: '#A1A1AA',
    fontSize: 16,
    marginBottom: 30,
  },
  modalButton: {
    backgroundColor: '#00FF94',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  modalButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
  },
});


// --- Main Timer Screen ---
export default function TimerScreen() {
  useKeepAwake(); // Keep screen on
  const router = useRouter();
  const { cycleId } = useLocalSearchParams();
  const { cycles, rewards } = useSettings();
  const { processCycleCompletion, setIsFocusing } = useGamification();
  
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
  const [extensionTime, setExtensionTime] = useState(10); // Default extension time
  const [accumulatedFocusTime, setAccumulatedFocusTime] = useState(cycle ? cycle.focusDuration : 0);
  const [accumulatedRewardTime, setAccumulatedRewardTime] = useState(cycle ? cycle.rewardDuration : 0);
  
  // Animation State
  const [totalDuration, setTotalDuration] = useState(cycle ? cycle.focusDuration * 60 : 1);
  const progress = useSharedValue(1);

  // Update Progress
  useEffect(() => {
      if (totalDuration > 0) {
          progress.value = withTiming(timeLeft / totalDuration, {
              duration: 1000,
              easing: Easing.linear,
          });
      }
  }, [timeLeft, totalDuration]);

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

  // Validating cycle existence
  useEffect(() => {
    if (!cycle) {
      Alert.alert("Erro", "Ciclo não encontrado");
      router.back();
    }
  }, [cycle]);

  // Play Alarm Sound
  const playAlarm = async () => {
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
    const currentConfig = PHASE_CONFIG[phase];
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
      const id = await Notifications.scheduleNotificationAsync({
        content: { title, body, sound: true },
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
  }, [phase]);

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

  const CurrentIcon = PHASE_CONFIG[phase].icon;
  const currentTheme = PHASE_CONFIG[phase];

  // Render Selection Phase (Game)
  if (phase === 'selection') {
    return (
      <RewardGameScreen 
        onComplete={startReward} 
        rewardDuration={accumulatedRewardTime} // Pass accumulated reward time
        rewards={rewards}
      />
    );
  }

  // Render Timer Phases (Focus, Reward, Rest)
  return (
    <View style={[styles.container, { backgroundColor: currentTheme.bg }]}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={handleCancel} style={styles.iconButton}>
          <X color="#FFF" size={28} />
        </TouchableOpacity>
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
      <View style={styles.controlsContainer}>
        <TouchableOpacity 
          style={[styles.controlButton, { backgroundColor: currentTheme.color }]}
          onPress={() => {
            if (isActive) {
              pauseTimer();
            } else {
              resumeTimer();
            }
          }}
        >
          {isActive ? (
            <Pause color="#000" fill="#000" size={32} />
          ) : (
            <Play color="#000" fill="#000" size={32} />
          )}
        </TouchableOpacity>
      </View>

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
            
            {/* Dynamic Time Selector */}
            <View style={styles.selectorContainer}>
                <TouchableOpacity 
                    style={styles.stepperButton} 
                    onPress={() => setExtensionTime(prev => Math.max(5, prev - 5))}
                >
                    <Text style={styles.stepperText}>-</Text>
                </TouchableOpacity>
                
                <View style={styles.valueContainer}>
                    <Text style={styles.valueText}>{extensionTime}</Text>
                    <Text style={styles.unitText}>min</Text>
                </View>

                <TouchableOpacity 
                    style={styles.stepperButton} 
                    onPress={() => setExtensionTime(prev => prev + 5)}
                >
                    <Text style={styles.stepperText}>+</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.bonusBadge}>
              <Text style={styles.bonusText}>
                  +{extensionTime} min FOCO = +{Math.floor(extensionTime / 2)} min RECOMPENSA
              </Text>
            </View>

            <TouchableOpacity 
              style={[styles.actionButton, styles.oneMoreButton]}
              onPress={() => handleOneMore(extensionTime, Math.floor(extensionTime / 2))}
            >
              <Plus color="#FFF" size={20} style={{ marginRight: 8 }} />
              <Text style={styles.actionButtonText}>Estender Foco</Text>
            </TouchableOpacity>

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
    paddingHorizontal: 20,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  iconButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  phaseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
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
  timerSvg: {
      transform: [{ rotateZ: '-90deg' }] 
  },
  timerTextContainer: {
      position: 'absolute',
      justifyContent: 'center',
      alignItems: 'center',
  },
  timerText: {
    fontSize: 64, // Slightly smaller to fit circle
    fontWeight: 'bold',
    fontVariant: ['tabular-nums'],
  },
  instructionText: {
    color: '#A1A1AA',
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
    backgroundColor: '#1E1E24',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
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
    color: '#FFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  modalDescription: {
    color: '#A1A1AA',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  selectorContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 20,
      marginBottom: 20,
  },
  stepperButton: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: '#333',
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: '#555',
  },
  stepperText: {
      color: '#FFF',
      fontSize: 24,
      fontWeight: 'bold',
  },
  valueContainer: {
      alignItems: 'center',
      minWidth: 80,
  },
  valueText: {
      color: '#FFF',
      fontSize: 48,
      fontWeight: 'bold',
  },
  unitText: {
      color: '#A1A1AA',
      fontSize: 14,
      marginTop: -5,
  },
  bonusBadge: {
    backgroundColor: 'rgba(255, 69, 0, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 69, 0, 0.3)',
  },
  bonusText: {
    color: '#FF4500',
    fontWeight: 'bold',
    fontSize: 14,
  },
  actionButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  oneMoreButton: {
    backgroundColor: '#333',
    borderWidth: 1,
    borderColor: '#555',
  },
  finishButton: {
    backgroundColor: '#00FF94',
    marginTop: 4,
  },
  actionButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  actionSubText: {
      color: '#00FF94', // Green for reward
      fontSize: 12,
      marginTop: 2,
      fontWeight: '600',
  }
});
