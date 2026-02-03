import React, { useEffect, useRef, useMemo } from 'react';
import { StyleSheet, Text, View, ScrollView, SafeAreaView, StatusBar, Platform, Animated, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { CycleDef } from '@/constants/FocusConfig';
import { useSettings } from '@/context/SettingsContext';
import { useAuth } from '@/context/AuthContext';
import { useGamification } from '@/context/GamificationContext';
import { Play, Settings, Plus, Sparkles, BarChart3, RotateCcw } from 'lucide-react-native';
import LottieView from 'lottie-react-native';
import { Theme } from '@/constants/theme';
import { useTimerStore } from '@/store/useTimerStore';
import { PressableScale } from '@/components/PressableScale';
import { CycleCard } from '@/components/ui/CycleCard';

export default function HomeScreen() {
  const router = useRouter();
  const { cycles, theme, dailyGoalMinutes } = useSettings();
  const { user } = useAuth();
  const { getPeriodStats } = useGamification();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const glowAnim = useRef(new Animated.Value(0)).current;
  const dailyFocusMinutes = getPeriodStats('daily');
  const dailyProgress = Math.min(dailyFocusMinutes / dailyGoalMinutes, 1);
  const formatMinutes = (value: number) => {
    if (!Number.isFinite(value)) return '0';
    if (Number.isInteger(value)) return String(value);
    return value.toFixed(2).replace('.', ',');
  };

  const { timeLeft, isActive, cycleId: activeCycleId } = useTimerStore();
  const activeTimerCycle = useMemo(() => activeCycleId ? cycles.find(c => c.id === activeCycleId) : null, [activeCycleId, cycles]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 2800, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 2800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [glowAnim]);

  const glowScale = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.98, 1.05],
  });

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.25, 0.45],
  });

  const handleSelectCycle = (cycle: CycleDef) => {
    router.push({
      pathname: '/timer',
      params: { cycleId: cycle.id },
    });
  };

  const handleCreateCycle = () => {
      router.push('/settings'); // Redirect to settings for creation for now
  };

  const handleEditCycle = (cycle: CycleDef) => {
      router.push('/settings'); // Redirect to settings for editing
  };

  const infiniteCycles = cycles.filter((cycle) => cycle.id === 'infinite' || cycle.type === 'infinite');
  const fixedCycles = cycles.filter((cycle) => cycle.id !== 'infinite' && cycle.type !== 'infinite');
  const primaryCycle = fixedCycles.length > 0 ? fixedCycles[0] : cycles[0]; // Hero prefers fixed cycle

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.bg} />
      <View style={styles.background}>
        <Animated.View style={[styles.glowOrb, styles.glowOrbPrimary, { opacity: glowOpacity, transform: [{ scale: glowScale }] }]} />
        <View style={[styles.glowOrb, styles.glowOrbSecondary]} />
      </View>
      <View style={styles.content}>
        
        {/* Header */}
        <View style={styles.header}>
            <View style={styles.headerLeft}>
              <PressableScale onPress={() => router.push('/profile')} style={styles.profileButton}>
                <View style={styles.profileAvatar}>
                  {user?.avatar ? (
                    <Image source={{ uri: user.avatar }} style={styles.profileAvatarImage} />
                  ) : (
                    <Text style={styles.profileAvatarText}>
                      {user?.name ? user.name.substring(0, 2).toUpperCase() : 'US'}
                    </Text>
                  )}
                </View>
              </PressableScale>
            </View>

            <View style={styles.headerRightGrid}>
              <PressableScale onPress={() => router.push('/settings')} style={styles.iconButton}>
                <Settings color={theme.colors.text} size={20} />
              </PressableScale>
            </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Resume Active Session Banner */}
          {activeCycleId && isActive && (
            <PressableScale
              style={styles.resumeBanner}
              onPress={() => router.push({ pathname: '/timer', params: { cycleId: activeCycleId } })}
            >
              <View style={styles.resumeIcon}>
                <RotateCcw color="#000" size={20} />
              </View>
              <View style={styles.resumeInfo}>
                <Text style={styles.resumeLabel}>Sessão em andamento • {formatTime(timeLeft)}</Text>
                <Text style={styles.resumeTitle}>
                  {activeTimerCycle?.label || 'Ciclo'}
                </Text>
              </View>
              <View style={styles.resumeAction}>
                <Text style={styles.resumeActionText}>RETOMAR</Text>
                <Play size={14} color="#000" fill="#000" />
              </View>
            </PressableScale>
          )}

          {/* Hero */}
          {primaryCycle && (
            <View style={styles.heroCard}>
              <View style={styles.heroTop}>
                <View>
                  <View style={styles.heroBadge}>
                    <Sparkles color={theme.colors.accent} size={14} />
                    <Text style={styles.heroBadgeText}>PRÓXIMA SESSÃO</Text>
                  </View>
                  <Text style={styles.heroTitle}>{primaryCycle.label}</Text>
                  <Text style={styles.heroSubtitle}>
                    {primaryCycle.focusDuration} min foco • {primaryCycle.rewardDuration} min recompensa
                  </Text>
                </View>
                <View style={[styles.heroAccent, { backgroundColor: primaryCycle.color }]} />
              </View>
              <PressableScale style={[styles.heroButton, { backgroundColor: primaryCycle.color }]} onPress={() => handleSelectCycle(primaryCycle)}>
                <Play size={22} color="#000" fill="#000" />
                <Text style={styles.heroButtonText}>Iniciar agora</Text>
              </PressableScale>
            </View>
          )}

          {/* Daily Goal */}
          <View style={styles.goalCard}>
            <View style={styles.goalHeader}>
              <View style={styles.goalTitleWrap}>
                <BarChart3 color={theme.colors.accent} size={16} />
                <Text style={styles.goalTitle}>Meta do dia</Text>
              </View>
              <Text style={styles.goalValue}>{formatMinutes(dailyFocusMinutes)} / {formatMinutes(dailyGoalMinutes)} min</Text>
            </View>
            <View style={styles.goalBar}>
              <View style={[styles.goalFill, { width: `${dailyProgress * 100}%` }]} />
            </View>
            <Text style={styles.goalHint}>
              {dailyFocusMinutes >= dailyGoalMinutes
                ? 'Meta concluída! 🔥'
                : `Faltam ${formatMinutes(Math.max(dailyGoalMinutes - dailyFocusMinutes, 0))} min para bater a meta.`}
            </Text>
          </View>

          {/* Infinite Cycles Carousel */}
          <View style={styles.quickActions}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carouselContent}>
              {infiniteCycles.map((cycle) => (
                <PressableScale
                  key={cycle.id}
                  style={[styles.quickCard, styles.infiniteQuickCard, { width: 300, marginRight: 12 }]}
                  onPress={() => handleSelectCycle(cycle)}
                >
                  <View style={styles.infiniteContent}>
                    <View style={styles.lottieWrap}>
                      {cycle.id === 'infinite' ? (
                        <LottieView
                          source={{ uri: 'https://lottie.host/945575cf-3408-4525-915e-d9587010dda1/T6PV3zCNW5.lottie' }}
                          autoPlay
                          loop
                          style={styles.lottieIcon}
                        />
                      ) : (
                        <View style={[styles.customIconPlaceholder, { backgroundColor: cycle.color }]}>
                           <RotateCcw color="#000" size={32} />
                        </View>
                      )}
                    </View>
                    <View style={styles.infiniteText}>
                      <Text style={styles.quickTitle} numberOfLines={1}>{cycle.label}</Text>
                      <Text style={styles.quickSubtitle} numberOfLines={2}>
                        {cycle.id === 'infinite' 
                          ? 'Voce decide quando alternar.'
                          : `Foco: ${cycle.focusDuration}m • Rec: ${cycle.rewardDuration}m`}
                      </Text>
                    </View>
                  </View>
                </PressableScale>
              ))}
            </ScrollView>
          </View>

          {/* Fixed Cycles List */}
          {fixedCycles.map((cycle) => (
            <CycleCard
              key={cycle.id}
              cycle={cycle}
              theme={theme}
              onPress={handleSelectCycle}
              onEdit={handleEditCycle}
            />
          ))}

          {/* New Cycle Button */}
          <PressableScale onPress={handleCreateCycle} style={styles.newCycleButton}>
            <Plus color="#F9D547" size={22} />
            <Text style={styles.newCycleText}>CRIAR NOVO CICLO</Text>
          </PressableScale>

        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
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
  },
  glowOrbPrimary: {
    top: -120,
    left: -40,
    backgroundColor: 'rgba(255, 69, 0, 0.35)',
  },
  glowOrbSecondary: {
    bottom: -140,
    right: -80,
    width: 360,
    height: 360,
    borderRadius: 180,
    backgroundColor: 'rgba(0, 255, 148, 0.2)',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 40 : 10, // Added padding for Android status bar
  },
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 30,
  },
  headerLeft: {
      flexDirection: 'row',
      gap: 12,
  },
  profileButton: {
    borderRadius: 28,
  },
  profileAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.surfaceSoft,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
  profileAvatarImage: {
    width: '100%',
    height: '100%',
  },
  profileAvatarText: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: '700',
  },
  headerRightGrid: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
  },
  iconButton: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: theme.colors.surface,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.colors.border,
  },
  
  // Resume Banner
  resumeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.accent, // Gold/Yellow
    borderRadius: theme.radius.lg,
    padding: 12,
    marginBottom: 16, // Space before Hero
    shadowColor: theme.colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  resumeIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  resumeInfo: {
    flex: 1,
  },
  resumeLabel: {
    color: theme.colors.accentDark,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    opacity: 0.8,
  },
  resumeTitle: {
    color: '#000',
    fontSize: 15,
    fontWeight: '800',
  },
  resumeAction: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  resumeActionText: {
    color: '#000',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  // Cards
  scrollContent: {
    paddingBottom: 40,
    gap: 16,
  },
  heroCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadow.card,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(231, 184, 74, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(231, 184, 74, 0.35)',
    marginBottom: 8,
  },
  heroBadgeText: {
    color: theme.colors.accent,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  heroTitle: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: '800',
  },
  heroSubtitle: {
    color: theme.colors.textMuted,
    fontSize: 13,
    marginTop: 4,
  },
  heroAccent: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  heroButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
  },
  heroButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  goalCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  goalTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  goalTitle: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  goalValue: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  goalBar: {
    height: 8,
    borderRadius: 999,
    backgroundColor: theme.colors.border,
    overflow: 'hidden',
    marginBottom: 10,
  },
  goalFill: {
    height: '100%',
    backgroundColor: theme.colors.accent,
    borderRadius: 999,
  },
  goalHint: {
    color: theme.colors.textMuted,
    fontSize: 12,
  },
  quickActions: {
    width: '100%',
  },
  carouselContent: {
    paddingRight: 20, // Padding for last item
  },
  customIconPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickCard: {
    width: '100%',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  infiniteQuickCard: {
    borderColor: 'rgba(139, 92, 246, 0.5)',
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
  },
  infiniteContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  lottieWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.45)',
    overflow: 'hidden',
  },
  lottieIcon: {
    width: 72,
    height: 72,
  },
  infiniteText: {
    flex: 1,
  },
  quickTitle: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  quickSubtitle: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
  infiniteCard: {
    backgroundColor: 'rgba(139, 92, 246, 0.08)',
    borderWidth: 1.5,
  },
  infiniteBadge: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.45)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  infiniteBadgeText: {
    color: '#C4B5FD',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  infiniteSubtitle: {
    color: theme.colors.textDim,
    fontSize: 11,
    marginTop: 6,
  },

  // New Cycle Button
  newCycleButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 20,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.12)',
      borderStyle: 'dashed',
      marginTop: 10,
      gap: 8,
      backgroundColor: 'rgba(0,0,0,0.2)',
  },
  newCycleText: {
      color: theme.colors.accent,
      fontWeight: 'bold',
      fontSize: 14,
      letterSpacing: 1,
  },
});
