import React, { useEffect, useRef, useMemo } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, SafeAreaView, StatusBar, Platform, Pressable, Animated, StyleProp, ViewStyle, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { CycleDef } from '../constants/FocusConfig';
import { useSettings } from '@/context/SettingsContext';
import { useAuth } from '@/context/AuthContext';
import { useGamification } from '@/context/GamificationContext';
import { Play, Settings, Plus, Edit2, Sparkles, BarChart3 } from 'lucide-react-native';
import LottieView from 'lottie-react-native';
import { Theme } from '@/constants/theme';

const PressableScale = ({
  onPress,
  children,
  style,
}: {
  onPress?: () => void;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) => {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.98,
      useNativeDriver: true,
      friction: 6,
      tension: 120,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      friction: 6,
      tension: 120,
    }).start();
  };

  return (
    <Pressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut}>
      <Animated.View style={[{ transform: [{ scale }] }, style]}>{children}</Animated.View>
    </Pressable>
  );
};

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

  const primaryCycle = cycles[0];
  const infiniteCycle = cycles.find((cycle) => cycle.id === 'infinite');
  const visibleCycles = cycles.filter((cycle) => cycle.id !== 'infinite');

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

          {/* Cronometro Infinito */}
          <View style={styles.quickActions}>
            <PressableScale
              style={[styles.quickCard, styles.infiniteQuickCard]}
              onPress={() => infiniteCycle && handleSelectCycle(infiniteCycle)}
            >
              <View style={styles.infiniteContent}>
                <View style={styles.lottieWrap}>
                  <LottieView
                    source={{ uri: 'https://lottie.host/945575cf-3408-4525-915e-d9587010dda1/T6PV3zCNW5.lottie' }}
                    autoPlay
                    loop
                    style={styles.lottieIcon}
                  />
                </View>
                <View style={styles.infiniteText}>
                  <Text style={styles.quickTitle}>Cronometro Infinito</Text>
                  <Text style={styles.quickSubtitle}>Voce decide quando alternar entre foco, recompensa e descanso</Text>
                </View>
              </View>
            </PressableScale>
          </View>
          {visibleCycles.map((cycle) => (
            <PressableScale
              key={cycle.id}
              onPress={() => handleSelectCycle(cycle)}
              style={[styles.card, { borderColor: cycle.color }, cycle.id === 'infinite' && styles.infiniteCard]}
            >
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <View style={[styles.cardAccent, { backgroundColor: cycle.color }]} />
                  <View>
                    <View style={styles.cardTitleRow}>
                      <Text style={[styles.cardTitle, { color: cycle.color }]}>{cycle.label.toUpperCase()}</Text>
                      {cycle.id === 'infinite' && (
                        <View style={styles.infiniteBadge}>
                          <Text style={styles.infiniteBadgeText}>CONTINUO</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.cardSubtitle}>
                      {cycle.id.startsWith('custom_') ? 'Ciclo personalizado' : 'Ciclo padrão'}
                    </Text>
                    {cycle.id === 'infinite' && (
                      <Text style={styles.infiniteSubtitle}>Voce decide quando alternar entre foco, recompensa e descanso</Text>
                    )}
                  </View>
                </View>
                
                <View style={styles.cardActions}>
                  {cycle.id.startsWith('custom_') && (
                    <TouchableOpacity onPress={() => handleEditCycle(cycle)} style={styles.editActionButton}>
                      <Edit2 color="#8A8A8F" size={16} />
                    </TouchableOpacity>
                  )}
                  <View style={[styles.playButton, { backgroundColor: cycle.color }]}>
                    <Play size={20} color="#000" fill="#000" style={{ marginLeft: 2 }} />
                  </View>
                </View>
              </View>
              
              <View style={styles.statsContainer}>
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>{cycle.focusDuration} min</Text>
                  <Text style={styles.statLabel}>FOCO</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>{cycle.rewardDuration} min</Text>
                  <Text style={styles.statLabel}>RECOMPENSA</Text>
                </View>
              </View>
            </PressableScale>
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
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: 24,
    borderWidth: 1.5,
    marginBottom: 4,
    ...theme.shadow.card,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardAccent: {
    width: 10,
    height: 42,
    borderRadius: 6,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  cardSubtitle: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 4,
    letterSpacing: 0.4,
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
  cardActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
  },
  editActionButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.colors.surfaceSoft,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.colors.border,
  },
  playButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 8,
      elevation: 5,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between', // Space out to fill width
  },
  statBox: {
    flex: 1,
    alignItems: 'center', // Center text
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.textMuted,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: theme.colors.border,
    marginHorizontal: 10,
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
