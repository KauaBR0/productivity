import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, TextInput, Image, Alert, ScrollView, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useGamification } from '@/context/GamificationContext';
import { ACHIEVEMENTS } from '@/constants/GamificationConfig';
import { X, Camera, LogOut, User as UserIcon, Save, Trophy, Medal, Lock } from 'lucide-react-native';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, signOut, updateProfile } = useAuth();
  const { xp, level, stats, unlockedAchievements, nextLevelXp, progressToNextLevel } = useGamification();
  
  const [name, setName] = useState(user?.name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [isEditing, setIsEditing] = useState(false);

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
      <View style={styles.header}>
        <Text style={styles.title}>Meu Perfil</Text>
        <TouchableOpacity onPress={handleClose} style={styles.iconButton}>
          <X color="#FFF" size={24} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitials}>
                    {user.name.substring(0,2).toUpperCase()}
                </Text>
            </View>
            <View style={styles.levelBadge}>
                <Text style={styles.levelText}>{level}</Text>
            </View>
            <TouchableOpacity style={styles.cameraButton}>
              <Camera color="#000" size={20} />
            </TouchableOpacity>
          </View>
          <Text style={styles.emailText}>{user.email}</Text>
        </View>

        {/* Level Progress */}
        <View style={styles.progressSection}>
            <View style={styles.xpRow}>
                <Text style={styles.xpLabel}>Nível {level}</Text>
                <Text style={styles.xpValue}>{xp} / {nextLevelXp} XP</Text>
            </View>
            <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${progressToNextLevel * 100}%` }]} />
            </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
            <View style={styles.statItem}>
                <Text style={styles.statNumber}>{stats.completedCycles}</Text>
                <Text style={styles.statLabel}>Ciclos</Text>
            </View>
            <View style={styles.statItem}>
                <Text style={styles.statNumber}>{stats.totalFocusMinutes}</Text>
                <Text style={styles.statLabel}>Minutos Focados</Text>
            </View>
        </View>

        {/* Achievements Section */}
        <View style={styles.achievementsSection}>
            <Text style={styles.sectionTitle}>Conquistas</Text>
            <View style={styles.achievementsList}>
                {ACHIEVEMENTS.map((achievement) => {
                    const isUnlocked = unlockedAchievements.includes(achievement.id);
                    return (
                        <View key={achievement.id} style={[styles.achievementCard, !isUnlocked && styles.achievementLocked]}>
                            <View style={[styles.achievementIcon, isUnlocked ? styles.iconUnlocked : styles.iconLocked]}>
                                {isUnlocked ? (
                                    <Trophy color="#000" size={24} />
                                ) : (
                                    <Lock color="#666" size={24} />
                                )}
                            </View>
                            <View style={styles.achievementInfo}>
                                <Text style={[styles.achievementTitle, !isUnlocked && styles.textLocked]}>{achievement.title}</Text>
                                <Text style={styles.achievementDesc}>{achievement.description}</Text>
                            </View>
                        </View>
                    );
                })}
            </View>
        </View>

        {/* Info Section */}
        <View style={styles.formSection}>
            <View style={styles.inputGroup}>
                <Text style={styles.label}>Nome</Text>
                {isEditing ? (
                    <TextInput 
                        style={styles.input}
                        value={name}
                        onChangeText={setName}
                    />
                ) : (
                    <Text style={styles.value}>{user.name}</Text>
                )}
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.label}>Bio</Text>
                {isEditing ? (
                    <TextInput 
                        style={[styles.input, styles.multilineInput]}
                        value={bio}
                        onChangeText={setBio}
                        multiline
                        numberOfLines={3}
                    />
                ) : (
                    <Text style={styles.value}>{user.bio || 'Sem bio definida.'}</Text>
                )}
            </View>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
            {isEditing ? (
                <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                    <Save color="#000" size={20} />
                    <Text style={styles.saveButtonText}>Salvar Alterações</Text>
                </TouchableOpacity>
            ) : (
                <TouchableOpacity style={styles.editButton} onPress={() => setIsEditing(true)}>
                    <Text style={styles.editButtonText}>Editar Perfil</Text>
                </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                <LogOut color="#FF4545" size={20} />
                <Text style={styles.logoutText}>Sair da Conta</Text>
            </TouchableOpacity>
        </View>
        <View style={{height: 40}} />

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121214',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  title: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  iconButton: {
    padding: 8,
    backgroundColor: '#333',
    borderRadius: 20,
  },
  content: {
    padding: 20,
    alignItems: 'center',
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#00D4FF',
  },
  avatarInitials: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFF',
  },
  levelBadge: {
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: '#FFD600',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#121214',
    zIndex: 5,
  },
  levelText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 14,
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#00D4FF',
    padding: 8,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: '#121214',
  },
  emailText: {
    color: '#A1A1AA',
    fontSize: 14,
  },
  progressSection: {
    width: '100%',
    marginBottom: 30,
  },
  xpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  xpLabel: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  xpValue: {
    color: '#A1A1AA',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#333',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#00D4FF',
  },
  statsGrid: {
    flexDirection: 'row',
    width: '100%',
    marginBottom: 30,
    gap: 16,
  },
  statItem: {
    flex: 1,
    backgroundColor: '#1E1E24',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  statNumber: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    color: '#A1A1AA',
    fontSize: 12,
    marginTop: 4,
  },
  achievementsSection: {
    width: '100%',
    marginBottom: 30,
  },
  sectionTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  achievementsList: {
    gap: 12,
  },
  achievementCard: {
    flexDirection: 'row',
    backgroundColor: '#1E1E24',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  achievementLocked: {
    opacity: 0.5,
    borderColor: 'transparent',
  },
  achievementIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  iconUnlocked: {
    backgroundColor: '#FFD600',
  },
  iconLocked: {
    backgroundColor: '#333',
  },
  achievementInfo: {
    flex: 1,
  },
  achievementTitle: {
    color: '#FFF',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  textLocked: {
    color: '#A1A1AA',
  },
  achievementDesc: {
    color: '#A1A1AA',
    fontSize: 12,
  },
  formSection: {
    width: '100%',
    marginBottom: 40,
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    color: '#A1A1AA',
    fontSize: 14,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  value: {
    color: '#FFF',
    fontSize: 18,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  input: {
    backgroundColor: '#1E1E24',
    color: '#FFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#333',
    fontSize: 16,
  },
  multilineInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  actions: {
    width: '100%',
    gap: 16,
  },
  editButton: {
    backgroundColor: '#333',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  editButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  saveButton: {
    backgroundColor: '#00D4FF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  saveButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
    marginTop: 10,
  },
  logoutText: {
    color: '#FF4545',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
