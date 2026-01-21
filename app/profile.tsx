import React, { useState, useEffect, useRef, useMemo } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, TextInput, Image, Alert, ScrollView, Platform, Pressable, Animated as RNAnimated, StyleProp, ViewStyle, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown, FadeIn, ZoomIn, useAnimatedStyle, useSharedValue, withRepeat, withTiming, withSequence, Easing, interpolate, Extrapolate } from 'react-native-reanimated';
import { useAuth } from '@/context/AuthContext';
import { useGamification } from '@/context/GamificationContext';
import { useSettings } from '@/context/SettingsContext';
import { ACHIEVEMENTS, Achievement } from '@/constants/GamificationConfig';
import { SocialService } from '@/services/SocialService';
import { X, Camera, LogOut, Save, Trophy, Lock, Flame, Clock, CheckCircle, ChevronRight, Users, Footprints, Target, Medal, Star, Crown, Zap, Rocket, Shield, Gem } from 'lucide-react-native';
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
  const scale = useRef(new RNAnimated.Value(1)).current;

  const handlePressIn = () => {
    RNAnimated.spring(scale, { toValue: 0.98, useNativeDriver: true, friction: 6, tension: 120 }).start();
  };

  const handlePressOut = () => {
    RNAnimated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 6, tension: 120 }).start();
  };

  return (
    <Pressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut}>
      <RNAnimated.View style={[{ transform: [{ scale }] }, style]}>{children}</RNAnimated.View>
    </Pressable>
  );
};

const achievementIconMap = {
  footprints: Footprints,
  target: Target,
  clock: Clock,
  trophy: Trophy,
  medal: Medal,
  star: Star,
  crown: Crown,
  zap: Zap,
  rocket: Rocket,
  shield: Shield,
  gem: Gem,
  flame: Flame,
};

const achievementVisuals: Record<string, { primary: string; secondary: string; icon: keyof typeof achievementIconMap }> = {
  first_step: { primary: '#7DD3FC', secondary: '#38BDF8', icon: 'footprints' },
  focused: { primary: '#86EFAC', secondary: '#34D399', icon: 'target' },
  dedicated: { primary: '#FCD34D', secondary: '#F59E0B', icon: 'clock' },
  master: { primary: '#FDE047', secondary: '#F59E0B', icon: 'trophy' },
  marathon: { primary: '#C4B5FD', secondary: '#8B5CF6', icon: 'medal' },
  cycle_runner: { primary: '#38BDF8', secondary: '#0EA5E9', icon: 'rocket' },
  focused_hours: { primary: '#FCD34D', secondary: '#F59E0B', icon: 'star' },
  veteran: { primary: '#CBD5F5', secondary: '#94A3B8', icon: 'shield' },
  deep_focus: { primary: '#A7F3D0', secondary: '#34D399', icon: 'gem' },
  centurion: { primary: '#FDE68A', secondary: '#F59E0B', icon: 'crown' },
  streak_3: { primary: '#FDBA74', secondary: '#F97316', icon: 'flame' },
  streak_7: { primary: '#FB7185', secondary: '#F43F5E', icon: 'flame' },
  streak_14: { primary: '#FCA5A5', secondary: '#FB7185', icon: 'flame' },
  streak_30: { primary: '#FDE047', secondary: '#F59E0B', icon: 'crown' },
  ultra_focus: { primary: '#93C5FD', secondary: '#3B82F6', icon: 'zap' },
};

const AchievementBadge = ({
  title,
  description,
  xpReward,
  isUnlocked,
  visualKey,
  highlight,
  onPress,
  styles,
  theme,
}: {
  title: string;
  description: string;
  xpReward: number;
  isUnlocked: boolean;
  visualKey: string;
  highlight?: boolean;
  onPress?: () => void;
  styles: ReturnType<typeof createStyles>;
  theme: Theme;
}) => {
  const visuals = achievementVisuals[visualKey] ?? achievementVisuals.first_step;
  const Icon = achievementIconMap[visuals.icon] ?? Trophy;
  const rotation = useSharedValue(0);
  const pulse = useSharedValue(0);
  const shimmer = useSharedValue(0);
  const pop = useSharedValue(0);
  const flash = useSharedValue(0);

  React.useEffect(() => {
    if (!isUnlocked) return;
    rotation.value = withRepeat(withTiming(1, { duration: 8000, easing: Easing.linear }), -1, false);
    pulse.value = withRepeat(withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }), -1, true);
    shimmer.value = withRepeat(withTiming(1, { duration: 2400, easing: Easing.out(Easing.quad) }), -1, false);
  }, [isUnlocked, rotation, pulse, shimmer]);

  React.useEffect(() => {
    if (!highlight) return;
    pop.value = 0;
    flash.value = 0;
    pop.value = withSequence(
      withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) }),
      withTiming(0, { duration: 260, easing: Easing.inOut(Easing.ease) })
    );
    flash.value = withSequence(
      withTiming(1, { duration: 180, easing: Easing.out(Easing.quad) }),
      withTiming(0, { duration: 400, easing: Easing.inOut(Easing.ease) })
    );
  }, [highlight, pop, flash]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${interpolate(rotation.value, [0, 1], [0, 360])}deg` }],
    opacity: isUnlocked ? 0.8 : 0.2,
  }));

  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(pulse.value, [0, 1], [1, 1.08], Extrapolate.CLAMP) }],
    opacity: isUnlocked ? interpolate(pulse.value, [0, 1], [0.5, 0.9]) : 0,
  }));

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(shimmer.value, [0, 1], [-30, 60]) }],
    opacity: isUnlocked ? interpolate(shimmer.value, [0, 0.5, 1], [0, 0.5, 0]) : 0,
  }));

  const popStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + pop.value * 0.06 }],
  }));

  const flashStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + flash.value * 0.8 }],
    opacity: flash.value * 0.6,
  }));

  return (
    <PressableScale onPress={onPress}>
      <Animated.View style={[styles.achievementCard, !isUnlocked && styles.achievementLocked, popStyle]}>
        <View style={styles.badgeWrap}>
          <Animated.View style={[styles.badgeFlash, flashStyle]} />
          <Animated.View style={[styles.badgeGlow, { backgroundColor: visuals.secondary }, glowStyle]} />
          <Animated.View style={[styles.badgeRing, ringStyle, { borderColor: visuals.primary }]} />
        <View style={[styles.badgeCore, { backgroundColor: isUnlocked ? visuals.primary : theme.colors.border }]}>
            {isUnlocked ? <Icon color="#101010" size={22} /> : <Lock color="#6B7280" size={20} />}
          </View>
          {isUnlocked && <Animated.View style={[styles.badgeShine, shimmerStyle]} />}
        </View>
        <Text style={[styles.achievementTitle, !isUnlocked && styles.textLocked]} numberOfLines={1}>{title}</Text>
        <Text style={[styles.achievementDescription, !isUnlocked && styles.textLocked]} numberOfLines={2}>{description}</Text>
        <View style={[styles.xpPill, !isUnlocked && styles.xpPillLocked]}>
          <Text style={[styles.achievementReward, !isUnlocked && styles.textLocked]}>+{xpReward} XP</Text>
        </View>
      </Animated.View>
    </PressableScale>
  );
};

export default function ProfileScreen() {
  const router = useRouter();
  const { user, signOut, updateProfile } = useAuth();
  const { xp, level, stats, streak, history, unlockedAchievements, recentUnlockedIds, nextLevelXp, progressToNextLevel } = useGamification();
  const { theme } = useSettings();
  const styles = useMemo(() => createStyles(theme), [theme]);
  
  const [name, setName] = useState(user?.name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [isEditing, setIsEditing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);
  const [showAchievementModal, setShowAchievementModal] = useState(false);

  const weeklyStats = useMemo(() => {
    const today = new Date();
    const days = Array.from({ length: 7 }).map((_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() - (6 - index));
      const key = date.toISOString().split('T')[0];
      return {
        key,
        label: date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', ''),
        minutes: 0,
      };
    });

    const minutesByDay = new Map(days.map((day) => [day.key, 0]));
    history.forEach((session) => {
      const dateKey = new Date(session.timestamp).toISOString().split('T')[0];
      if (minutesByDay.has(dateKey)) {
        minutesByDay.set(dateKey, (minutesByDay.get(dateKey) || 0) + session.minutes);
      }
    });

    const filled = days.map((day) => ({ ...day, minutes: minutesByDay.get(day.key) || 0 }));
    const total = filled.reduce((acc, curr) => acc + curr.minutes, 0);
    const average = Math.round(total / 7);
    const max = Math.max(...filled.map((day) => day.minutes), 1);
    const bestDay = filled.reduce((best, day) => (day.minutes > best.minutes ? day : best), filled[0]);
    const activeDays = filled.filter((day) => day.minutes > 0).length;
    const consistency = Math.round((activeDays / 7) * 100);

    const sessionsByHour = new Map<number, number>();
    history.forEach((session) => {
      const hour = new Date(session.timestamp).getHours();
      sessionsByHour.set(hour, (sessionsByHour.get(hour) || 0) + session.minutes);
    });
    let bestHour = 9;
    let bestHourMinutes = 0;
    sessionsByHour.forEach((minutes, hour) => {
      if (minutes > bestHourMinutes) {
        bestHourMinutes = minutes;
        bestHour = hour;
      }
    });
    const bestHourLabel = `${bestHour.toString().padStart(2, '0')}:00`;

    return { days: filled, total, average, max, bestDay, consistency, bestHourLabel };
  }, [history]);

  const totalHours = Math.round(stats.totalFocusMinutes / 60);

  useEffect(() => {
      if (user) {
          SocialService.getUserProfile(user.id, user.id).then(p => {
              if (p) setFollowersCount(p.followers_count || 0);
          });
      }
  }, [user]);

  const handleClose = () => {
    router.back();
  };

  const handleLogout = () => {
    Alert.alert(
      "Sair",
      "Deseja realmente sair da sua conta?",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Sair", style: "destructive", onPress: signOut }
      ]
    );
  };

  const openAchievementModal = (achievement: Achievement) => {
    setSelectedAchievement(achievement);
    setShowAchievementModal(true);
  };

  const closeAchievementModal = () => {
    setShowAchievementModal(false);
  };

  const handleSave = async () => {
    try {
      await updateProfile({ name, bio });
      setIsEditing(false);
      Alert.alert("Sucesso", "Perfil atualizado!");
    } catch (error) {
      Alert.alert("Erro", "Falha ao atualizar perfil.");
    }
  };

  if (!user) return null;

  return (
    <View style={styles.container}>
      <View style={styles.background}>
        <View style={styles.glowOrb} />
        <View style={styles.glowOrbSecondary} />
      </View>
      <View style={styles.header}>
        <Text style={styles.title}>Perfil</Text>
        <TouchableOpacity onPress={handleClose} style={styles.iconButton}>
          <X color="#FFF" size={24} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Avatar Section */}
        <Animated.View entering={FadeInDown.delay(100).duration(600)} style={styles.avatarSection}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatarRing}>
                <View style={styles.avatarPlaceholder}>
                    {user.avatar ? (
                        <Image source={{ uri: user.avatar }} style={styles.avatarImage} />
                    ) : (
                        <Text style={styles.avatarInitials}>
                            {user.name ? user.name.substring(0,2).toUpperCase() : 'US'}
                        </Text>
                    )}
                </View>
            </View>
            
            <Animated.View entering={ZoomIn.delay(400)} style={styles.levelBadge}>
                <Text style={styles.levelText}>{level}</Text>
            </Animated.View>

            <TouchableOpacity style={styles.cameraButton}>
              <Camera color="#FFF" size={16} />
            </TouchableOpacity>
          </View>
          <Text style={styles.userName}>{user.name}</Text>
          <Text style={styles.emailText}>{user.email}</Text>
          <View style={styles.followersTag}>
              <Users color="#666" size={14} />
              <Text style={styles.followersText}>{followersCount} Seguidores</Text>
          </View>
        </Animated.View>

        {/* Level Progress */}
        <Animated.View entering={FadeInDown.delay(200).duration(600)} style={styles.progressSection}>
            <View style={styles.xpRow}>
                <Text style={styles.xpLabel}>Nível {level}</Text>
                <Text style={styles.xpValue}>{xp} / {nextLevelXp} XP</Text>
            </View>
            <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${progressToNextLevel * 100}%` }]} />
            </View>
        </Animated.View>

        {/* Stats Grid */}
        <Animated.View entering={FadeInDown.delay(300).duration(600)} style={styles.statsGrid}>
            <View style={styles.statCard}>
                <View style={[styles.iconContainer, { backgroundColor: 'rgba(255,69,0,0.1)' }]}>
                    <Flame color="#FF4500" size={20} fill="#FF4500" />
                </View>
                <Text style={styles.statNumber}>{streak}</Text>
                <Text style={styles.statLabel}>Ofensiva</Text>
            </View>
            <View style={styles.statCard}>
                <View style={[styles.iconContainer, { backgroundColor: 'rgba(0,212,255,0.1)' }]}>
                    <CheckCircle color="#00D4FF" size={20} />
                </View>
                <Text style={styles.statNumber}>{stats.completedCycles}</Text>
                <Text style={styles.statLabel}>Ciclos</Text>
            </View>
            <View style={styles.statCard}>
                <View style={[styles.iconContainer, { backgroundColor: 'rgba(255,214,0,0.1)' }]}>
                    <Clock color="#FFD600" size={20} />
                </View>
                <Text style={styles.statNumber}>{Math.round(stats.totalFocusMinutes / 60)}h</Text>
                <Text style={styles.statLabel}>Foco Total</Text>
            </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(350)} style={{width: '90%', marginBottom: 30}}>
            <PressableScale style={styles.historyLink} onPress={() => router.push('/history')}>
                <Text style={styles.historyLinkText}>Ver Histórico Detalhado</Text>
                <ChevronRight color="#E7B84A" size={16} />
            </PressableScale>
        </Animated.View>

        {/* Achievements Section */}
        <Animated.View entering={FadeInDown.delay(400).duration(600)} style={styles.achievementsSection}>
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Conquistas</Text>
                <Text style={styles.sectionCount}>{unlockedAchievements.length} / {ACHIEVEMENTS.length}</Text>
            </View>
            
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.achievementsScroll}>
                {ACHIEVEMENTS.map((achievement) => {
                    const isUnlocked = unlockedAchievements.includes(achievement.id);
                    const isRecentUnlock = recentUnlockedIds.includes(achievement.id);
                    return (
                        <AchievementBadge
                          key={achievement.id}
                          title={achievement.title}
                          description={achievement.description}
                          xpReward={achievement.xpReward}
                          isUnlocked={isUnlocked}
                          visualKey={achievement.id}
                          highlight={isRecentUnlock}
                          onPress={() => openAchievementModal(achievement)}
                          styles={styles}
                          theme={theme}
                        />
                    );
                })}
            </ScrollView>
        </Animated.View>

        {/* Performance CTA */}
        <Animated.View entering={FadeInDown.delay(520).duration(600)} style={styles.performanceCard}>
            <View style={styles.performanceHeader}>
                <View>
                    <Text style={styles.performanceTitle}>Melhorar performance</Text>
                    <Text style={styles.performanceSubtitle}>Dicas rápidas para aumentar sua consistência</Text>
                </View>
                <View style={styles.performanceBadge}>
                    <Text style={styles.performanceBadgeText}>PRO</Text>
                </View>
            </View>
            <View style={styles.performanceTips}>
                <View style={styles.performanceTip}>
                    <Text style={styles.performanceTipTitle}>Meta diária</Text>
                    <Text style={styles.performanceTipText}>
                        {stats.currentStreak < 3
                          ? 'Feche 1 ciclo hoje para manter o ritmo.'
                          : 'Você está consistente. Aumente 10 min na meta.'}
                    </Text>
                </View>
                <View style={styles.performanceTip}>
                    <Text style={styles.performanceTipTitle}>Ritual de foco</Text>
                    <Text style={styles.performanceTipText}>
                        Defina uma recompensa clara antes de iniciar o ciclo.
                    </Text>
                </View>
            </View>
            <PressableScale style={styles.performanceButton} onPress={() => router.push('/settings')}>
                <Text style={styles.performanceButtonText}>Personalizar metas</Text>
            </PressableScale>
        </Animated.View>

        {/* Weekly Report */}
        <Animated.View entering={FadeInDown.delay(560).duration(600)} style={styles.reportCard}>
            <View style={styles.reportHeader}>
                <Text style={styles.reportTitle}>Relatório semanal</Text>
                <Text style={styles.reportSubtitle}>{weeklyStats.total} min</Text>
            </View>
            <View style={styles.reportMetrics}>
                <View style={styles.reportMetric}>
                    <Text style={styles.reportMetricValue}>{totalHours}h</Text>
                    <Text style={styles.reportMetricLabel}>Foco total</Text>
                </View>
                <View style={styles.reportMetric}>
                    <Text style={styles.reportMetricValue}>{weeklyStats.average} min</Text>
                    <Text style={styles.reportMetricLabel}>Média diária</Text>
                </View>
                <View style={styles.reportMetric}>
                    <Text style={styles.reportMetricValue}>{stats.completedCycles}</Text>
                    <Text style={styles.reportMetricLabel}>Ciclos</Text>
                </View>
            </View>
            <View style={styles.chart}>
                {weeklyStats.days.map((day) => (
                    <View key={day.key} style={styles.chartColumn}>
                        <View style={styles.chartBarBase}>
                            <View style={[styles.chartBarFill, { height: `${Math.round((day.minutes / weeklyStats.max) * 100)}%` }]} />
                        </View>
                        <Text style={styles.chartLabel}>{day.label}</Text>
                    </View>
                ))}
            </View>
            <View style={styles.reportInsights}>
                <View style={styles.reportInsightRow}>
                    <Text style={styles.reportInsightLabel}>Melhor dia</Text>
                    <Text style={styles.reportInsightValue}>{weeklyStats.bestDay.label} · {weeklyStats.bestDay.minutes} min</Text>
                </View>
                <View style={styles.reportInsightRow}>
                    <Text style={styles.reportInsightLabel}>Melhor horário</Text>
                    <Text style={styles.reportInsightValue}>{weeklyStats.bestHourLabel}</Text>
                </View>
                <View style={styles.reportInsightRow}>
                    <Text style={styles.reportInsightLabel}>Consistência</Text>
                    <Text style={styles.reportInsightValue}>{weeklyStats.consistency}% dos dias</Text>
                </View>
            </View>
        </Animated.View>

        {/* Info Section */}
        <Animated.View entering={FadeInDown.delay(500).duration(600)} style={styles.formSection}>
            <View style={styles.inputGroup}>
                <Text style={styles.label}>Bio</Text>
                {isEditing ? (
                    <TextInput 
                        style={[styles.input, styles.multilineInput]}
                        value={bio}
                        onChangeText={setBio}
                        multiline
                        placeholder="Escreva algo sobre você..."
                        placeholderTextColor="#666"
                    />
                ) : (
                    <Text style={styles.bioText}>{user.bio || 'Sem bio definida. Toque em editar para adicionar.'}</Text>
                )}
            </View>
            
            {isEditing && (
                 <View style={styles.inputGroup}>
                    <Text style={styles.label}>Nome de Exibição</Text>
                    <TextInput 
                        style={styles.input}
                        value={name}
                        onChangeText={setName}
                    />
                </View>
            )}
        </Animated.View>

        {/* Actions */}
        <Animated.View entering={FadeIn.delay(600).duration(800)} style={styles.actions}>
            {isEditing ? (
                <PressableScale style={styles.saveButton} onPress={handleSave}>
                    <Save color="#000" size={20} />
                    <Text style={styles.saveButtonText}>Salvar Perfil</Text>
                </PressableScale>
            ) : (
                <PressableScale style={styles.editButton} onPress={() => setIsEditing(true)}>
                    <Text style={styles.editButtonText}>Editar Detalhes</Text>
                </PressableScale>
            )}

            <PressableScale style={styles.logoutButton} onPress={handleLogout}>
                <LogOut color="#FF4545" size={20} />
                <Text style={styles.logoutText}>Desconectar</Text>
            </PressableScale>
        </Animated.View>
        
        <View style={{height: 60}} />

      </ScrollView>

      <Modal
        visible={showAchievementModal}
        transparent
        animationType="fade"
        onRequestClose={closeAchievementModal}
      >
        <View style={styles.modalBackdrop}>
          <Pressable style={styles.modalBackdropPress} onPress={closeAchievementModal} />
          <View style={styles.modalCard}>
            {selectedAchievement && (() => {
              const visuals = achievementVisuals[selectedAchievement.id] ?? achievementVisuals.first_step;
              const Icon = achievementIconMap[visuals.icon] ?? Trophy;
              const isUnlocked = unlockedAchievements.includes(selectedAchievement.id);
              return (
                <>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Detalhes da Conquista</Text>
                    <Pressable onPress={closeAchievementModal} style={styles.modalClose}>
                      <X color="#FFF" size={16} />
                    </Pressable>
                  </View>
                  <View style={styles.modalBadgeWrap}>
                    <View style={[styles.modalBadgeGlow, { backgroundColor: visuals.secondary }]} />
                    <View style={[styles.modalBadgeCore, { backgroundColor: isUnlocked ? visuals.primary : theme.colors.border }]}>
                      {isUnlocked ? <Icon color="#101010" size={28} /> : <Lock color="#6B7280" size={26} />}
                    </View>
                  </View>
                  <Text style={styles.modalAchievementTitle}>{selectedAchievement.title}</Text>
                  <Text style={styles.modalAchievementDesc}>{selectedAchievement.description}</Text>
                  <View style={styles.modalStatusRow}>
                    <View style={[styles.modalStatusPill, isUnlocked ? styles.modalUnlocked : styles.modalLocked]}>
                      <Text style={styles.modalStatusText}>{isUnlocked ? 'Desbloqueada' : 'Bloqueada'}</Text>
                    </View>
                    <View style={styles.modalXpPill}>
                      <Text style={styles.modalXpText}>+{selectedAchievement.xpReward} XP</Text>
                    </View>
                  </View>
                  <PressableScale onPress={closeAchievementModal} style={styles.modalPrimaryButton}>
                    <Text style={styles.modalPrimaryText}>Fechar</Text>
                  </PressableScale>
                </>
              );
            })()}
          </View>
        </View>
      </Modal>
    </View>
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
    top: -160,
    left: -120,
    backgroundColor: theme.colors.glowPrimary,
  },
  glowOrbSecondary: {
    position: 'absolute',
    width: 360,
    height: 360,
    borderRadius: 180,
    bottom: -200,
    right: -140,
    backgroundColor: theme.colors.glowSecondary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: Platform.OS === 'android' ? 40 : 20,
  },
  title: {
    color: theme.colors.text,
    ...theme.typography.title,
  },
  iconButton: {
    padding: 8,
    backgroundColor: theme.colors.surfaceSoft,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  content: {
    alignItems: 'center',
    paddingBottom: 40,
  },
  // Avatar
  avatarSection: {
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 10,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  avatarRing: {
      padding: 4,
      borderRadius: 100,
      borderWidth: 1.5,
      borderColor: theme.colors.border,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
      width: '100%',
      height: '100%',
  },
  avatarInitials: {
    fontSize: 32,
    fontWeight: '700',
    color: theme.colors.textMuted,
  },
  levelBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: theme.colors.accent,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#121214',
    zIndex: 5,
  },
  levelText: {
    color: theme.colors.accentDark,
    fontWeight: '700',
    fontSize: 12,
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: theme.colors.surfaceSoftStrong,
    padding: 8,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: theme.colors.bg,
  },
  userName: {
      fontSize: 24,
      fontWeight: '700',
      color: theme.colors.text,
      marginBottom: 4,
  },
  emailText: {
    color: theme.colors.textMuted,
    fontSize: 14,
  },
  followersTag: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 12,
      backgroundColor: theme.colors.surface,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.colors.border,
  },
  followersText: {
      color: '#A1A1AA',
      fontSize: 12,
      fontWeight: '600',
  },
  // Progress
  progressSection: {
    width: '90%',
    marginBottom: 30,
  },
  xpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  xpLabel: {
    color: theme.colors.textDim,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  xpValue: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: theme.colors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: theme.colors.accent,
    borderRadius: 3,
  },
  // Stats
  statsGrid: {
    flexDirection: 'row',
    width: '90%',
    marginBottom: 30,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    padding: 16,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  iconContainer: {
      padding: 8,
      borderRadius: 12,
      marginBottom: 8,
  },
  statNumber: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: '700',
  },
  statLabel: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginTop: 2,
    fontWeight: '600',
  },
  historyLink: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.colors.surface,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
  },
  historyLinkText: {
      color: theme.colors.accent,
      fontSize: 14,
      fontWeight: '700',
  },
  // Achievements
  achievementsSection: {
    width: '100%',
    marginBottom: 30,
  },
  sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      marginBottom: 16,
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  sectionCount: {
      color: theme.colors.textMuted,
      fontWeight: '700',
  },
  achievementsScroll: {
    paddingHorizontal: 20,
    gap: 12,
  },
  achievementCard: {
    backgroundColor: theme.colors.surface,
    padding: 12,
    borderRadius: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    width: 140,
    height: 170,
    justifyContent: 'space-between',
  },
  achievementLocked: {
    opacity: 0.6,
    backgroundColor: 'rgba(18,18,20,0.9)',
  },
  badgeWrap: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  badgeGlow: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 32,
    opacity: 0.6,
  },
  badgeFlash: {
    position: 'absolute',
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  badgeRing: {
    position: 'absolute',
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 1.5,
    borderStyle: 'dashed',
  },
  badgeCore: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.12)',
  },
  badgeShine: {
    position: 'absolute',
    width: 20,
    height: 44,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  achievementTitle: {
    color: theme.colors.text,
    fontWeight: '700',
    fontSize: 12,
    textAlign: 'center',
  },
  achievementDescription: {
    color: theme.colors.textMuted,
    fontSize: 10,
    textAlign: 'center',
    lineHeight: 14,
  },
  textLocked: {
    color: theme.colors.textMuted,
  },
  achievementReward: {
    color: theme.colors.accent,
    fontSize: 10,
    fontWeight: '700',
  },
  xpPill: {
    backgroundColor: 'rgba(231,184,74,0.15)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(231,184,74,0.35)',
  },
  xpPillLocked: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: theme.colors.border,
  },
  performanceCard: {
    width: '90%',
    backgroundColor: theme.colors.surface,
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 30,
  },
  performanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  performanceTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  performanceSubtitle: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
  performanceBadge: {
    backgroundColor: 'rgba(231, 184, 74, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(231, 184, 74, 0.4)',
  },
  performanceBadgeText: {
    color: theme.colors.accent,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  performanceTips: {
    gap: 12,
    marginBottom: 16,
  },
  performanceTip: {
    backgroundColor: theme.colors.surfaceSoft,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  performanceTipTitle: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  performanceTipText: {
    color: theme.colors.textMuted,
    fontSize: 12,
    lineHeight: 16,
  },
  performanceButton: {
    backgroundColor: theme.colors.accent,
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  performanceButtonText: {
    color: theme.colors.accentDark,
    fontWeight: '700',
    fontSize: 14,
  },
  reportCard: {
    width: '90%',
    backgroundColor: theme.colors.surface,
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 30,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  reportTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  reportSubtitle: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  reportMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  reportMetric: {
    flex: 1,
    alignItems: 'center',
  },
  reportMetricValue: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  reportMetricLabel: {
    color: theme.colors.textMuted,
    fontSize: 11,
    marginTop: 4,
  },
  chart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  chartColumn: {
    alignItems: 'center',
    flex: 1,
  },
  chartBarBase: {
    width: 18,
    height: 64,
    borderRadius: 999,
    backgroundColor: theme.colors.surfaceSoft,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  chartBarFill: {
    width: '100%',
    backgroundColor: theme.colors.accent,
    borderRadius: 999,
  },
  chartLabel: {
    color: theme.colors.textMuted,
    fontSize: 10,
    marginTop: 6,
  },
  reportInsights: {
    marginTop: 16,
    gap: 10,
  },
  reportInsightRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  reportInsightLabel: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  reportInsightValue: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  // Modal
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(5,6,10,0.72)',
  },
  modalBackdropPress: {
    ...StyleSheet.absoluteFillObject,
  },
  modalCard: {
    width: '86%',
    backgroundColor: theme.colors.surface,
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  modalClose: {
    padding: 6,
    borderRadius: 12,
    backgroundColor: theme.colors.surfaceSoft,
  },
  modalBadgeWrap: {
    width: 86,
    height: 86,
    borderRadius: 43,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  modalBadgeGlow: {
    position: 'absolute',
    width: 86,
    height: 86,
    borderRadius: 43,
    opacity: 0.65,
  },
  modalBadgeCore: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.12)',
  },
  modalAchievementTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 6,
  },
  modalAchievementDesc: {
    color: theme.colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  modalStatusRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  modalStatusPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  modalUnlocked: {
    backgroundColor: 'rgba(34,197,94,0.15)',
    borderColor: 'rgba(34,197,94,0.35)',
  },
  modalLocked: {
    backgroundColor: 'rgba(148,163,184,0.15)',
    borderColor: 'rgba(148,163,184,0.35)',
  },
  modalStatusText: {
    color: theme.colors.text,
    fontSize: 11,
    fontWeight: '700',
  },
  modalXpPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(231,184,74,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(231,184,74,0.35)',
  },
  modalXpText: {
    color: theme.colors.accent,
    fontSize: 11,
    fontWeight: '700',
  },
  modalPrimaryButton: {
    backgroundColor: theme.colors.accent,
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalPrimaryText: {
    color: theme.colors.accentDark,
    fontSize: 14,
    fontWeight: '700',
  },
  // Form
  formSection: {
    width: '90%',
    marginBottom: 30,
    backgroundColor: theme.colors.surface,
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  bioText: {
    color: theme.colors.text,
    fontSize: 16,
    lineHeight: 24,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    color: theme.colors.text,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  multilineInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  // Actions
  actions: {
    width: '90%',
    gap: 12,
  },
  editButton: {
    backgroundColor: theme.colors.surfaceSoft,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  editButtonText: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  saveButton: {
    backgroundColor: theme.colors.accent,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  saveButtonText: {
    color: theme.colors.accentDark,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,69,69,0.4)',
    backgroundColor: 'rgba(255,69,69,0.08)',
  },
  logoutText: {
    color: theme.colors.danger,
    fontSize: 14,
    fontWeight: '700',
  },
});
