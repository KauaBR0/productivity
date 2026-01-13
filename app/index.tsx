import React, { useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, SafeAreaView, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import LottieView from 'lottie-react-native';
import { CycleDef } from '../constants/FocusConfig';
import { useSettings } from '@/context/SettingsContext';
import { useAuth } from '@/context/AuthContext';
import { Play, Settings, User, Trophy } from 'lucide-react-native';

export default function HomeScreen() {
  const router = useRouter();
  const { cycles } = useSettings();
  const { user } = useAuth();
  const lottieRef = useRef<LottieView>(null);

  const handleSelectCycle = (cycle: CycleDef) => {
    router.push({
      pathname: '/timer',
      params: { cycleId: cycle.id },
    });
  };

  const handleOpenSettings = () => {
      router.push('/settings');
  };

  const handleOpenProfile = () => {
      router.push('/profile');
  };

  const handleOpenRanking = () => {
      router.push('/ranking');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.content}>
        
        {/* Welcome Animation Area */}
        <View style={styles.welcomeContainer}>
            <View style={styles.animationWrapper}>
                <LottieView
                    ref={lottieRef}
                    source={{ uri: 'https://lottie.host/fd1548aa-25eb-432d-8b47-8f41a7060eea/rJZblguW07.lottie' }}
                    style={styles.lottie}
                    autoPlay
                    loop
                />
                <View style={styles.headerTextContainer}>
                    <Text style={styles.headerTitle}>Olá, {user?.name.split(' ')[0]}</Text>
                    <Text style={styles.headerSubtitle}>Vamos focar hoje?</Text>
                </View>
            </View>
            <View style={styles.headerActions}>
                <TouchableOpacity onPress={handleOpenRanking} style={styles.iconButton}>
                    <Trophy color="#FFD700" size={24} />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleOpenProfile} style={styles.iconButton}>
                    <User color="#A1A1AA" size={24} />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleOpenSettings} style={styles.iconButton}>
                    <Settings color="#A1A1AA" size={24} />
                </TouchableOpacity>
            </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {cycles.map((cycle) => (
            <TouchableOpacity
              key={cycle.id}
              style={[styles.card, { borderColor: cycle.color }]}
              onPress={() => handleSelectCycle(cycle)}
              activeOpacity={0.8}
            >
              <View style={styles.cardHeader}>
                <Text style={[styles.cardTitle, { color: cycle.color }]}>{cycle.label}</Text>
                <Play size={24} color={cycle.color} fill={cycle.color} />
              </View>
              
              <View style={styles.statsContainer}>
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>{cycle.focusDuration} min</Text>
                  <Text style={styles.statLabel}>Foco</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>{cycle.rewardDuration} min</Text>
                  <Text style={styles.statLabel}>Recompensa</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121214', // Dark background
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  welcomeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  animationWrapper: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
  },
  headerActions: {
      flexDirection: 'row',
      gap: 10,
  },
  iconButton: {
      padding: 8,
      backgroundColor: 'rgba(255,255,255,0.1)',
      borderRadius: 12,
  },
  lottie: {
    width: 80, // Adjustable size for the "icon" feel
    height: 80,
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#A1A1AA',
  },
  scrollContent: {
    paddingBottom: 40,
    gap: 20,
  },
  card: {
    backgroundColor: '#1E1E24',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 14,
    color: '#A1A1AA',
    marginTop: 4,
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: '#333',
  },
});