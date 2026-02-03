import React, { useMemo, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Modal, Dimensions, Pressable, Animated as RNAnimated, Platform } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Gift, Brain, Coffee, Clock, Volume2, X, Play, Pause } from 'lucide-react-native';
import { Theme } from '@/constants/theme';
import { useSettings } from '@/context/SettingsContext';
import RewardRoulette from '@/components/RewardRoulette';
import { useTimerLogic } from '@/hooks/useTimerLogic';

const { width } = Dimensions.get('window');
const CIRCLE_SIZE = width * 0.8;
const STROKE_WIDTH = 15;
const RADIUS = (CIRCLE_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

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

export default function TimerScreen() {
  const {
    cycle,
    rewards,
    theme,
    rouletteExtraSpins,
    recentRewards,
    phase,
    timeLeft,
    isActive,
    selectedReward,
    isInfiniteCycle,
    isLofiMuted,
    isDeepFocus,
    pulseAnim,
    buttonScale,
    rouletteRewardMinutes,
    pendingRewardSeconds,
    instructionText,
    canToggleTimer,
    showOneMoreModal,
    showRewardEndModal,
    showRestEndModal,
    toggleTimer,
    handleCancel,
    setIsDeepFocus,
    setIsLofiMuted,
    handleInfiniteToReward,
    handleInfiniteToRest,
    startInfiniteFocus,
    handleFinishFocus,
    handleOneMore,
    handleStopReward,
    handleExtendRest,
    handleFinishRest,
    handleSkipRest,
    startReward,
  } = useTimerLogic();

  const styles = useMemo(() => createStyles(theme), [theme]);
  const phaseConfig = useMemo(() => createPhaseConfig(theme), [theme]);

  if (!cycle) return null;

  const CurrentIcon = phaseConfig[phase].icon;
  const currentTheme = phaseConfig[phase];
  const deepFocusEnabled = isDeepFocus && phase === 'focus' && !showOneMoreModal && !showRewardEndModal && !showRestEndModal;

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
            {Math.floor(timeLeft / 60).toString().padStart(2, '0')}:{Math.floor(timeLeft % 60).toString().padStart(2, '0')}
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
              onPress={toggleTimer}
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
          {/* Lofi removed from UI logic but kept in hook logic, simplified UI here */}
          {/* Re-adding UI elements based on hook state */}
          {useSettings().lofiTrack !== 'off' && (
            <Pressable
              style={[styles.lofiToggle, isLofiMuted && styles.lofiToggleMuted]}
              onPress={() => setIsLofiMuted((prev: boolean) => !prev)}
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

      {/* Rest End Modal */}
      <Modal
        visible={showRestEndModal}
        transparent
        animationType="slide"
        onRequestClose={() => {}}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Coffee color="#FF4500" size={32} />
              <Text style={styles.modalTitle}>Descanso finalizado!</Text>
            </View>
            <Text style={styles.modalDescription}>
              Quer estender o seu descanso antes de voltar ao foco?
            </Text>

            <Text style={styles.optionsTitle}>Prolongar descanso</Text>
            <View style={styles.optionsGrid}>
              <TouchableOpacity
                style={styles.optionCard}
                onPress={() => handleExtendRest(5)}
                activeOpacity={0.85}
              >
                <View>
                  <Text style={styles.optionTitle}>+5 min</Text>
                  <Text style={styles.optionSubtitle}>Recuperacao rapida</Text>
                </View>
                <View style={styles.optionBadge}>
                  <Text style={styles.optionBadgeText}>Continuar</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.optionCard}
                onPress={() => handleExtendRest(10)}
                activeOpacity={0.85}
              >
                <View>
                  <Text style={styles.optionTitle}>+10 min</Text>
                  <Text style={styles.optionSubtitle}>Pausa completa</Text>
                </View>
                <View style={styles.optionBadge}>
                  <Text style={styles.optionBadgeText}>Continuar</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.optionCard}
                onPress={() => handleExtendRest(15)}
                activeOpacity={0.85}
              >
                <View>
                  <Text style={styles.optionTitle}>+15 min</Text>
                  <Text style={styles.optionSubtitle}>Descanso longo</Text>
                </View>
                <View style={styles.optionBadge}>
                  <Text style={styles.optionBadgeText}>Continuar</Text>
                </View>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.actionButton, styles.finishButton, { backgroundColor: '#FF4500' }]}
              onPress={handleFinishRest}
            >
              <Text style={styles.actionButtonText}>Voltar ao foco</Text>
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
              <TouchableOpacity
                style={[styles.actionButton, styles.finishButton, { backgroundColor: '#FF4500' }]}
                onPress={handleStopReward}
              >
                <Text style={styles.actionButtonText}>Ir para descanso</Text>
              </TouchableOpacity>
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
  // ... styles content omitted as they are unchanged ...
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
