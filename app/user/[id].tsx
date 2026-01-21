import React, { useEffect, useState, useRef, useMemo } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator, Image, Alert, Pressable, Animated, StyleProp, ViewStyle } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';
import { SocialService, SocialProfile } from '@/services/SocialService';
import { ArrowLeft, UserPlus, UserCheck } from 'lucide-react-native';
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
    Animated.spring(scale, { toValue: 0.98, useNativeDriver: true, friction: 6, tension: 120 }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 6, tension: 120 }).start();
  };

  return (
    <Pressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut}>
      <Animated.View style={[{ transform: [{ scale }] }, style]}>{children}</Animated.View>
    </Pressable>
  );
};

export default function PublicProfileScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const { theme } = useSettings();
  const styles = useMemo(() => createStyles(theme), [theme]);
  
  const [profile, setProfile] = useState<SocialProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [followingLoading, setFollowingLoading] = useState(false);

  useEffect(() => {
    loadProfile();
  }, [id]);

  const loadProfile = async () => {
    if (!user || !id) return;
    try {
        const data = await SocialService.getUserProfile(id as string, user.id);
        setProfile(data);
    } catch (error) {
        console.error(error);
        Alert.alert("Erro", "Não foi possível carregar o perfil.");
        router.back();
    } finally {
        setLoading(false);
    }
  };

  const handleToggleFollow = async () => {
      if (!user || !profile) return;
      setFollowingLoading(true);
      try {
          if (profile.am_i_following) {
              await SocialService.unfollowUser(user.id, profile.id);
              setProfile(prev => prev ? { ...prev, am_i_following: false, followers_count: (prev.followers_count || 1) - 1 } : null);
          } else {
              await SocialService.followUser(user.id, profile.id);
              setProfile(prev => prev ? { ...prev, am_i_following: true, followers_count: (prev.followers_count || 0) + 1 } : null);
          }
      } catch (error) {
          Alert.alert("Erro", "Falha ao atualizar seguidor.");
      } finally {
          setFollowingLoading(false);
      }
  };

  if (loading) {
      return (
          <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
              <ActivityIndicator color={theme.colors.accent} size="large" />
          </View>
      );
  }

  if (!profile) return null;

  return (
    <View style={styles.container}>
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

      <View style={styles.content}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatarPlaceholder}>
                {profile.avatar_url ? (
                    <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
                ) : (
                    <Text style={styles.avatarInitials}>
                        {profile.username?.substring(0,2).toUpperCase()}
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
                  <Text style={styles.statNumber}>{profile.followers_count}</Text>
                  <Text style={styles.statLabel}>Seguidores</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{profile.following_count}</Text>
                  <Text style={styles.statLabel}>Seguindo</Text>
              </View>
          </View>

          <PressableScale 
            style={[styles.followButton, profile.am_i_following && styles.followingButton]}
            onPress={handleToggleFollow}
            disabled={followingLoading}
          >
              {profile.am_i_following ? (
                  <>
                    <UserCheck color="#FFF" size={20} />
                    <Text style={styles.followButtonText}>Seguindo</Text>
                  </>
              ) : (
                  <>
                    <UserPlus color="#000" size={20} />
                    <Text style={[styles.followButtonText, { color: '#000' }]}>Seguir</Text>
                  </>
              )}
          </PressableScale>
      </View>
    </View>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
    paddingTop: 50,
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  glowOrb: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    top: -160,
    left: -140,
    backgroundColor: theme.colors.glowPrimary,
  },
  glowOrbSecondary: {
    position: 'absolute',
    width: 340,
    height: 340,
    borderRadius: 170,
    bottom: -200,
    right: -140,
    backgroundColor: theme.colors.glowSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
      alignItems: 'center',
      paddingHorizontal: 20,
  },
  avatarContainer: {
      position: 'relative',
      marginBottom: 16,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: theme.colors.surfaceSoft,
    justifyContent: 'center',
    alignItems: 'center',
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
    fontWeight: '700',
    color: theme.colors.text,
  },
  statusBadge: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      backgroundColor: theme.colors.surface,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#FF4500',
  },
  statusText: {
      color: '#FF4500',
      fontSize: 12,
      fontWeight: '700',
  },
  name: {
      color: theme.colors.text,
      fontSize: 24,
      fontWeight: '700',
      marginBottom: 24,
  },
  statsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      padding: 16,
      width: '100%',
      justifyContent: 'space-around',
      marginBottom: 30,
      borderWidth: 1,
      borderColor: theme.colors.border,
  },
  statItem: {
      alignItems: 'center',
  },
  statNumber: {
      color: theme.colors.text,
      fontSize: 20,
      fontWeight: '700',
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
  followButton: {
      width: '100%',
      backgroundColor: theme.colors.accent,
      paddingVertical: 16,
      borderRadius: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      ...theme.shadow.accent,
  },
  followingButton: {
      backgroundColor: theme.colors.surfaceSoft,
      borderWidth: 1,
      borderColor: theme.colors.border,
  },
  followButtonText: {
      color: theme.colors.text,
      fontSize: 16,
      fontWeight: '700',
  },
});
