import { ACHIEVEMENTS } from "@/constants/GamificationConfig";
import { Theme } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { useSettings } from "@/context/SettingsContext";
import { FocusSessionSummary, SocialProfile, SocialService } from "@/services/SocialService";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  Clock,
  Flame,
  History as HistoryIcon,
  Trophy,
  UserCheck,
  UserPlus,
} from "lucide-react-native";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const formatDecimal = (value: number) => {
  if (!Number.isFinite(value)) return "0";
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(2).replace(".", ",");
};

const formatDate = (dateString: string | null) => {
  if (!dateString) return "Data desconhecida";
  const date = new Date(dateString);
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
};

const formatTime = (dateString: string | null) => {
  if (!dateString) return "--:--";
  const date = new Date(dateString);
  return date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

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
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View style={[{ transform: [{ scale }] }, style]}>
        {children}
      </Animated.View>
    </Pressable>
  );
};

export default function PublicProfileScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const { theme } = useSettings();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();

  const [profile, setProfile] = useState<SocialProfile | null>(null);
  const [history, setHistory] = useState<FocusSessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [followingLoading, setFollowingLoading] = useState(false);
  const [showAchievementsModal, setShowAchievementsModal] = useState(false);

  useEffect(() => {
    loadProfile();
  }, [id]);

  const loadProfile = async () => {
    if (!user || !id) return;
    setLoading(true);
    setHistoryLoading(true);
    setHistory([]);
    try {
      const data = await SocialService.getUserProfile(id as string, user.id);
      setProfile(data);
    } catch (error) {
      console.error(error);
      Alert.alert("Erro", "Não foi possível carregar o perfil.");
      router.back();
      setLoading(false);
      setHistoryLoading(false);
      return;
    }
    setLoading(false);
    try {
      const historyData = await SocialService.getUserFocusHistory(id as string, 12);
      setHistory(historyData);
    } catch (error) {
      console.error("Erro ao carregar histórico público:", error);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleToggleFollow = async () => {
    if (!user || !profile) return;
    setFollowingLoading(true);
    try {
      if (profile.am_i_following) {
        await SocialService.unfollowUser(user.id, profile.id);
        setProfile((prev) =>
          prev
            ? {
                ...prev,
                am_i_following: false,
                followers_count: (prev.followers_count || 1) - 1,
              }
            : null,
        );
      } else {
        await SocialService.followUser(user.id, profile.id);
        setProfile((prev) =>
          prev
            ? {
                ...prev,
                am_i_following: true,
                followers_count: (prev.followers_count || 0) + 1,
              }
            : null,
        );
      }
    } catch (error) {
      Alert.alert("Erro", "Falha ao atualizar seguidor.");
    } finally {
      setFollowingLoading(false);
    }
  };

  const weeklyStats = useMemo(() => {
    const today = new Date();
    const days = Array.from({ length: 7 }).map((_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() - (6 - index));
      const key = date.toISOString().split("T")[0];
      return {
        key,
        label: date.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", ""),
        minutes: 0,
      };
    });

    const minutesByDay = new Map(days.map((day) => [day.key, 0]));
    history.forEach((session) => {
      const timestamp = session.completed_at || session.started_at;
      if (!timestamp) return;
      const dateKey = new Date(timestamp).toISOString().split("T")[0];
      if (minutesByDay.has(dateKey)) {
        minutesByDay.set(
          dateKey,
          (minutesByDay.get(dateKey) || 0) + session.minutes,
        );
      }
    });

    const filled = days.map((day) => ({
      ...day,
      minutes: minutesByDay.get(day.key) || 0,
    }));
    const total = filled.reduce((acc, curr) => acc + curr.minutes, 0);
    const average = Math.round(total / 7);
    const max = Math.max(...filled.map((day) => day.minutes), 1);
    const bestDay = filled.reduce(
      (best, day) => (day.minutes > best.minutes ? day : best),
      filled[0],
    );
    const activeDays = filled.filter((day) => day.minutes > 0).length;
    const consistency = Math.round((activeDays / 7) * 100);

    const sessionsByHour = new Map<number, number>();
    history.forEach((session) => {
      const timestamp = session.completed_at || session.started_at;
      if (!timestamp) return;
      const hour = new Date(timestamp).getHours();
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
    const bestHourLabel = `${bestHour.toString().padStart(2, "0")}:00`;

    return { days: filled, total, average, max, bestDay, consistency, bestHourLabel };
  }, [history]);

  if (loading) {
    return (
      <View
        style={[
          styles.container,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
        <ActivityIndicator color={theme.colors.accent} size="large" />
      </View>
    );
  }

  if (!profile) return null;
  const publicStats = {
    totalFocusMinutes: profile.total_focus_minutes || 0,
    completedCycles: profile.total_cycles || 0,
    currentStreak: profile.current_streak || 0,
    lastFocusDate: profile.last_focus_date || null,
  };
  const unlockedAchievements = ACHIEVEMENTS.filter((achievement) =>
    achievement.condition(publicStats),
  );
  const lastFocusText = profile.last_focus_date
    ? new Date(profile.last_focus_date).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "short",
      })
    : "Sem registro";

  const totalHours = Math.round((profile.total_focus_minutes || 0) / 60);

  return (
    <View
      style={[styles.container, { paddingBottom: Math.max(20, insets.bottom) }]}
    >
      <View style={styles.background}>
        <View style={styles.glowOrb} />
        <View style={styles.glowOrbSecondary} />
      </View>
      <View style={styles.header}>
        <PressableScale onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft color="#FFF" size={24} />
        </PressableScale>
        <Text style={styles.title}>Perfil</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.avatarContainer}>
          <View style={styles.avatarPlaceholder}>
            {profile.avatar_url ? (
              <Image
                source={{ uri: profile.avatar_url }}
                style={styles.avatarImage}
              />
            ) : (
              <Text style={styles.avatarInitials}>
                {profile.username?.substring(0, 2).toUpperCase()}
              </Text>
            )}
          </View>
          {profile.is_focusing && (
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>🔥 Focando</Text>
            </View>
          )}
        </View>

        <Text style={styles.name}>{profile.username}</Text>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{formatDecimal(profile.followers_count || 0)}</Text>
            <Text style={styles.statLabel}>Seguidores</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{formatDecimal(profile.following_count || 0)}</Text>
            <Text style={styles.statLabel}>Seguindo</Text>
          </View>
        </View>

        <View style={styles.detailsGrid}>
          <View style={styles.detailCard}>
            <View
              style={[
                styles.detailIcon,
                { backgroundColor: "rgba(255,69,0,0.12)" },
              ]}
            >
              <Flame color="#FF4500" size={16} />
            </View>
            <Text style={styles.detailValue}>
              {formatDecimal(profile.current_streak || 0)}
            </Text>
            <Text style={styles.detailLabel}>Ofensiva</Text>
          </View>
          <View style={styles.detailCard}>
            <View
              style={[
                styles.detailIcon,
                { backgroundColor: "rgba(0,212,255,0.12)" },
              ]}
            >
              <Clock color="#00D4FF" size={16} />
            </View>
            <Text style={styles.detailValue}>
              {formatDecimal(Math.round((profile.total_focus_minutes || 0) / 60))}h
            </Text>
            <Text style={styles.detailLabel}>Foco total</Text>
          </View>
          <View style={styles.detailCard}>
            <View
              style={[
                styles.detailIcon,
                { backgroundColor: "rgba(255,214,0,0.12)" },
              ]}
            >
              <CheckCircle color="#FFD600" size={16} />
            </View>
            <Text style={styles.detailValue}>{formatDecimal(profile.total_cycles || 0)}</Text>
            <Text style={styles.detailLabel}>Ciclos</Text>
          </View>
        </View>

        <PressableScale
          style={[
            styles.followButton,
            profile.am_i_following && styles.followingButton,
          ]}
          onPress={handleToggleFollow}
          disabled={followingLoading}
        >
          <View style={styles.followButtonContent}>
            <View style={styles.followButtonIcon}>
              {profile.am_i_following ? (
                <UserCheck color="#FFF" size={20} />
              ) : (
                <UserPlus color="#000" size={20} />
              )}
            </View>
            <Text
              style={[
                styles.followButtonText,
                !profile.am_i_following && styles.followButtonTextDark,
              ]}
            >
              {profile.am_i_following
                ? profile.follows_me
                  ? "Amigos"
                  : "Solicitado"
                : "Adicionar amigo"}
            </Text>
          </View>
        </PressableScale>

        <View style={styles.lastFocusCard}>
          <Text style={styles.lastFocusLabel}>Último foco</Text>
          <Text style={styles.lastFocusValue}>{lastFocusText}</Text>
        </View>

        <View style={styles.achievementsSection}>
          <View style={styles.achievementsHeader}>
            <Trophy color={theme.colors.accent} size={16} />
            <Text style={styles.achievementsTitle}>Conquistas</Text>
            <Text style={styles.achievementsCount}>
              {formatDecimal(unlockedAchievements.length)}
            </Text>
          </View>
          <View style={styles.achievementsGrid}>
            {unlockedAchievements.slice(0, 6).map((achievement) => (
              <View key={achievement.id} style={styles.achievementPill}>
                <Text style={styles.achievementPillText}>
                  {achievement.title}
                </Text>
              </View>
            ))}
            {unlockedAchievements.length === 0 && (
              <Text style={styles.achievementsEmpty}>Sem conquistas ainda</Text>
            )}
          </View>
          {unlockedAchievements.length > 0 && (
            <PressableScale
              style={styles.achievementsMore}
              onPress={() => setShowAchievementsModal(true)}
            >
              <Text style={styles.achievementsMoreText}>Ver todas</Text>
            </PressableScale>
          )}
        </View>

        <View style={styles.reportCard}>
          <View style={styles.reportHeader}>
            <Text style={styles.reportTitle}>Relatório semanal</Text>
            <Text style={styles.reportSubtitle}>
              {formatDecimal(weeklyStats.total)} min
            </Text>
          </View>
          <View style={styles.reportMetrics}>
            <View style={styles.reportMetric}>
              <Text style={styles.reportMetricValue}>
                {formatDecimal(totalHours)}h
              </Text>
              <Text style={styles.reportMetricLabel}>Foco total</Text>
            </View>
            <View style={styles.reportMetric}>
              <Text style={styles.reportMetricValue}>
                {formatDecimal(weeklyStats.average)} min
              </Text>
              <Text style={styles.reportMetricLabel}>Média diária</Text>
            </View>
            <View style={styles.reportMetric}>
              <Text style={styles.reportMetricValue}>
                {formatDecimal(publicStats.completedCycles)}
              </Text>
              <Text style={styles.reportMetricLabel}>Ciclos</Text>
            </View>
          </View>
          <View style={styles.chart}>
            {weeklyStats.days.map((day) => (
              <View key={day.key} style={styles.chartColumn}>
                <View style={styles.chartBarBase}>
                  <View
                    style={[
                      styles.chartBarFill,
                      {
                        height: `${Math.round(
                          (day.minutes / weeklyStats.max) * 100,
                        )}%`,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.chartLabel}>{day.label}</Text>
              </View>
            ))}
          </View>
          <View style={styles.reportInsights}>
            <View style={styles.reportInsightRow}>
              <Text style={styles.reportInsightLabel}>Melhor dia</Text>
              <Text style={styles.reportInsightValue}>
                {weeklyStats.bestDay.label} ·{" "}
                {formatDecimal(weeklyStats.bestDay.minutes)} min
              </Text>
            </View>
            <View style={styles.reportInsightRow}>
              <Text style={styles.reportInsightLabel}>Melhor horário</Text>
              <Text style={styles.reportInsightValue}>
                {weeklyStats.bestHourLabel}
              </Text>
            </View>
            <View style={styles.reportInsightRow}>
              <Text style={styles.reportInsightLabel}>Consistência</Text>
              <Text style={styles.reportInsightValue}>
                {formatDecimal(weeklyStats.consistency)}% dos dias
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.historySection}>
          <View style={styles.historyHeader}>
            <HistoryIcon color={theme.colors.accent} size={16} />
            <Text style={styles.historyTitle}>Histórico</Text>
          </View>
          {historyLoading ? (
            <ActivityIndicator color={theme.colors.accent} size="small" />
          ) : history.length === 0 ? (
            <Text style={styles.historyEmpty}>Sem histórico disponível</Text>
          ) : (
            <View style={styles.historyList}>
              {history.map((item) => (
                <View key={item.id} style={styles.historyCard}>
                  <View style={styles.historyCardHeader}>
                    <Text style={styles.historyCardTitle}>
                      {item.label || "Ciclo de Foco"}
                    </Text>
                    <View style={styles.historyDateContainer}>
                      <Calendar color="#666" size={14} />
                      <Text style={styles.historyDateText}>
                        {formatDate(item.started_at || item.completed_at)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.historyCardBody}>
                    <View style={styles.historyTimeInfo}>
                      <Clock color="#A1A1AA" size={16} />
                      <Text style={styles.historyTimeRange}>
                        {item.started_at ? formatTime(item.started_at) : "?"} -{" "}
                        {formatTime(item.completed_at)}
                      </Text>
                    </View>
                    <View style={styles.historyDurationBadge}>
                      <Text style={styles.historyDurationText}>
                        {formatDecimal(item.minutes)} min
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <Modal
        visible={showAchievementsModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAchievementsModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            style={styles.modalBackdropPress}
            onPress={() => setShowAchievementsModal(false)}
          />
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Conquistas de {profile.username}
              </Text>
              <Pressable
                onPress={() => setShowAchievementsModal(false)}
                style={styles.modalClose}
              >
                <Text style={styles.modalCloseText}>Fechar</Text>
              </Pressable>
            </View>
            <View style={styles.modalGrid}>
              {unlockedAchievements.map((achievement) => (
                <View key={achievement.id} style={styles.modalPill}>
                  <Text style={styles.modalPillText}>{achievement.title}</Text>
                </View>
              ))}
              {unlockedAchievements.length === 0 && (
                <Text style={styles.achievementsEmpty}>
                  Sem conquistas ainda
                </Text>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.bg,
      paddingTop: 50,
    },
    background: {
      ...StyleSheet.absoluteFillObject,
      overflow: "hidden",
    },
    glowOrb: {
      position: "absolute",
      width: 300,
      height: 300,
      borderRadius: 150,
      top: -160,
      left: -140,
      backgroundColor: theme.colors.glowPrimary,
    },
    glowOrbSecondary: {
      position: "absolute",
      width: 340,
      height: 340,
      borderRadius: 170,
      bottom: -200,
      right: -140,
      backgroundColor: theme.colors.glowSecondary,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      marginBottom: 20,
    },
    backButton: {
      padding: 8,
      backgroundColor: theme.colors.surfaceSoft,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    title: {
      color: theme.colors.text,
      ...theme.typography.title,
    },
    content: {
      alignItems: "center",
      paddingHorizontal: 20,
      paddingBottom: 40,
    },
    avatarContainer: {
      position: "relative",
      marginBottom: 16,
    },
    avatarPlaceholder: {
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: theme.colors.surfaceSoft,
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 2,
      borderColor: theme.colors.accent,
    },
    avatarImage: {
      width: 120,
      height: 120,
      borderRadius: 60,
    },
    avatarInitials: {
      fontSize: 40,
      fontWeight: "700",
      color: theme.colors.text,
    },
    statusBadge: {
      position: "absolute",
      bottom: 0,
      right: 0,
      backgroundColor: theme.colors.surface,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: "#FF4500",
    },
    statusText: {
      color: "#FF4500",
      fontSize: 12,
      fontWeight: "700",
    },
    name: {
      color: theme.colors.text,
      fontSize: 24,
      fontWeight: "700",
      marginBottom: 24,
    },
    statsRow: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      padding: 16,
      width: "100%",
      justifyContent: "space-around",
      marginBottom: 30,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    statItem: {
      alignItems: "center",
    },
    statNumber: {
      color: theme.colors.text,
      fontSize: 20,
      fontWeight: "700",
    },
    statLabel: {
      color: theme.colors.textDim,
      fontSize: 12,
    },
    statDivider: {
      width: 1,
      height: 30,
      backgroundColor: theme.colors.border,
    },
    detailsGrid: {
      flexDirection: "row",
      gap: 12,
      width: "100%",
      marginBottom: 24,
    },
    detailCard: {
      flex: 1,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      padding: 12,
      alignItems: "center",
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    detailIcon: {
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 8,
    },
    detailValue: {
      color: theme.colors.text,
      fontSize: 16,
      fontWeight: "700",
    },
    detailLabel: {
      color: theme.colors.textMuted,
      fontSize: 11,
      marginTop: 4,
    },
    followButton: {
      width: "92%",
      backgroundColor: theme.colors.accent,
      paddingVertical: 14,
      borderRadius: 12,
      justifyContent: "center",
      ...theme.shadow.accent,
      marginBottom: 16,
    },
    followButtonContent: {
      flexDirection: "row", // <--- Coloca ícone e texto lado a lado
      alignItems: "center", // Alinha verticalmente
      justifyContent: "center", // Centraliza o conjunto todo no botão
    },
    followButtonIcon: {
      // Removi position: absolute e left: 16
      marginRight: 8, // <--- Dá o espaço entre o ícone e o texto
      alignItems: "center",
      justifyContent: "center",
    },
    followingButton: {
      backgroundColor: theme.colors.surfaceSoft,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    followButtonText: {
      color: theme.colors.text,
      fontSize: 16,
      fontWeight: "700",
      textAlign: "center",
    },
    followButtonTextDark: {
      color: "#000",
    },
    lastFocusCard: {
      width: "100%",
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      padding: 14,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginBottom: 18,
      alignItems: "center",
    },
    lastFocusLabel: {
      color: theme.colors.textMuted,
      fontSize: 12,
      fontWeight: "600",
    },
    lastFocusValue: {
      color: theme.colors.text,
      fontSize: 16,
      fontWeight: "700",
      marginTop: 6,
    },
    achievementsSection: {
      width: "100%",
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      padding: 14,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    achievementsHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 10,
    },
    achievementsTitle: {
      color: theme.colors.text,
      fontSize: 14,
      fontWeight: "700",
    },
    achievementsCount: {
      marginLeft: "auto",
      color: theme.colors.textMuted,
      fontSize: 12,
      fontWeight: "700",
    },
    achievementsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    achievementsMore: {
      marginTop: 12,
      alignSelf: "flex-start",
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: theme.colors.surfaceSoft,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    achievementsMoreText: {
      color: theme.colors.textMuted,
      fontSize: 11,
      fontWeight: "700",
    },
    achievementPill: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: theme.colors.surfaceSoft,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    achievementPillText: {
      color: theme.colors.text,
      fontSize: 11,
      fontWeight: "700",
    },
    achievementsEmpty: {
      color: theme.colors.textMuted,
      fontSize: 12,
    },
    reportCard: {
      width: "100%",
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginTop: 20,
    },
    reportHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 16,
    },
    reportTitle: {
      color: theme.colors.text,
      fontSize: 16,
      fontWeight: "700",
    },
    reportSubtitle: {
      color: theme.colors.textMuted,
      fontSize: 12,
      fontWeight: "700",
    },
    reportMetrics: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 16,
    },
    reportMetric: {
      flex: 1,
      alignItems: "center",
    },
    reportMetricValue: {
      color: theme.colors.text,
      fontSize: 16,
      fontWeight: "800",
    },
    reportMetricLabel: {
      color: theme.colors.textMuted,
      fontSize: 11,
      marginTop: 4,
    },
    chart: {
      flexDirection: "row",
      justifyContent: "space-between",
    },
    chartColumn: {
      alignItems: "center",
      flex: 1,
    },
    chartBarBase: {
      width: 18,
      height: 64,
      borderRadius: 999,
      backgroundColor: theme.colors.surfaceSoft,
      overflow: "hidden",
      justifyContent: "flex-end",
    },
    chartBarFill: {
      width: "100%",
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
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 6,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    reportInsightLabel: {
      color: theme.colors.textMuted,
      fontSize: 12,
      fontWeight: "600",
    },
    reportInsightValue: {
      color: theme.colors.text,
      fontSize: 12,
      fontWeight: "700",
    },
    historySection: {
      width: "100%",
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginTop: 16,
      marginBottom: 30,
    },
    historyHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 12,
    },
    historyTitle: {
      color: theme.colors.text,
      fontSize: 14,
      fontWeight: "700",
    },
    historyList: {
      gap: 12,
    },
    historyCard: {
      backgroundColor: theme.colors.surfaceSoft,
      borderRadius: theme.radius.md,
      padding: 14,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    historyCardHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 12,
    },
    historyCardTitle: {
      color: theme.colors.text,
      fontWeight: "700",
      fontSize: 14,
    },
    historyDateContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    historyDateText: {
      color: theme.colors.textMuted,
      fontSize: 12,
    },
    historyCardBody: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    historyTimeInfo: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    historyTimeRange: {
      color: theme.colors.textDim,
      fontSize: 13,
    },
    historyDurationBadge: {
      backgroundColor: "rgba(231, 184, 74, 0.12)",
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
    },
    historyDurationText: {
      color: theme.colors.accent,
      fontWeight: "700",
    },
    historyEmpty: {
      color: theme.colors.textMuted,
      fontSize: 12,
      textAlign: "center",
      paddingVertical: 12,
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: "rgba(5,6,10,0.72)",
      justifyContent: "center",
      alignItems: "center",
    },
    modalBackdropPress: {
      ...StyleSheet.absoluteFillObject,
    },
    modalCard: {
      width: "86%",
      backgroundColor: theme.colors.surface,
      borderRadius: 22,
      padding: 18,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    modalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 12,
    },
    modalTitle: {
      color: theme.colors.text,
      fontSize: 15,
      fontWeight: "700",
    },
    modalClose: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 10,
      backgroundColor: theme.colors.surfaceSoft,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    modalCloseText: {
      color: theme.colors.textMuted,
      fontSize: 11,
      fontWeight: "700",
    },
    modalGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    modalPill: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: theme.colors.surfaceSoft,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    modalPillText: {
      color: theme.colors.text,
      fontSize: 11,
      fontWeight: "700",
    },
  });
