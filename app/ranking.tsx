import React, { useEffect, useState, useCallback } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, Image } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { fetchRanking, RankingUser, formatTimeDisplay } from '@/utils/RankingLogic';
import { supabase } from '@/lib/supabase';
import { ArrowLeft } from 'lucide-react-native';

export default function RankingScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [rankingData, setRankingData] = useState<RankingUser[]>([]);
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  // Load Ranking
  useEffect(() => {
    loadRanking();
  }, [period]);

  // Realtime Subscription for "Fire" status
  useEffect(() => {
    const channel = supabase
      .channel('public:profiles')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles' },
        (payload) => {
          const updatedProfile = payload.new;
          setRankingData((currentData) => 
            currentData.map((item) => {
              if (item.id === updatedProfile.id) {
                return { ...item, isFocusing: updatedProfile.is_focusing };
              }
              return item;
            })
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadRanking = async () => {
    const data = await fetchRanking(period, user?.id);
    setRankingData(data);
  };

  const renderItem = ({ item, index }: { item: RankingUser; index: number }) => {
    const isTop3 = index < 3;
    let medalColor = '#333';
    let medalIcon = null;

    if (index === 0) { medalColor = '#FFD700'; medalIcon = '🥇'; } // Gold
    if (index === 1) { medalColor = '#C0C0C0'; medalIcon = '🥈'; } // Silver
    if (index === 2) { medalColor = '#CD7F32'; medalIcon = '🥉'; } // Bronze

    return (
      <View style={[
        styles.rankItem, 
        item.isUser && styles.userHighlight,
      ]}>
        <View style={styles.rankLeft}>
          <View style={[styles.positionContainer]}>
            <Text style={[styles.positionText, { color: isTop3 ? medalColor : '#888' }]}>
                {medalIcon ? medalIcon : index + 1}
            </Text>
          </View>
          
          <View style={[styles.avatar, { backgroundColor: item.avatarColor }]}>
            {item.avatarUrl ? (
                <Image source={{ uri: item.avatarUrl }} style={{ width: 40, height: 40, borderRadius: 20 }} />
            ) : (
                <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
            )}
          </View>

          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[styles.nameText, item.isUser && styles.userNameText]}>
                {item.name} {item.isUser && '(Você)'}
                </Text>
                {item.isFocusing && (
                    <View style={styles.fireTag}>
                        <Text style={{fontSize: 12}}>🔥</Text>
                        <Text style={styles.fireText}>Focando</Text>
                    </View>
                )}
            </View>
          </View>
        </View>

        <View style={styles.rankRight}>
          <Text style={styles.timeText}>{formatTimeDisplay(item.minutes)}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft color="#FFF" size={24} />
        </TouchableOpacity>
        <Text style={styles.title}>Ranking Global</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity 
          style={[styles.tab, period === 'daily' && styles.activeTab]}
          onPress={() => setPeriod('daily')}
        >
          <Text style={[styles.tabText, period === 'daily' && styles.activeTabText]}>Hoje</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, period === 'weekly' && styles.activeTab]}
          onPress={() => setPeriod('weekly')}
        >
          <Text style={[styles.tabText, period === 'weekly' && styles.activeTabText]}>Semana</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, period === 'monthly' && styles.activeTab]}
          onPress={() => setPeriod('monthly')}
        >
          <Text style={[styles.tabText, period === 'monthly' && styles.activeTabText]}>Mês</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={rankingData}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshing={false}
        onRefresh={loadRanking}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121214',
    paddingTop: 50,
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
    backgroundColor: '#333',
    borderRadius: 12,
  },
  title: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 24,
    backgroundColor: '#1E1E24',
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#333',
  },
  tabText: {
    color: '#888',
    fontWeight: '600',
  },
  activeTabText: {
    color: '#FFF',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  rankItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E1E24',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  userHighlight: {
    borderWidth: 1,
    borderColor: '#00FF94',
    backgroundColor: 'rgba(0, 255, 148, 0.05)',
  },
  rankLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  positionContainer: {
    width: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  positionText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 18,
  },
  nameText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  userNameText: {
    color: '#00FF94',
  },
  fireTag: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(255, 69, 0, 0.2)',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 8,
      gap: 4,
  },
  fireText: {
      color: '#FF4500',
      fontSize: 10,
      fontWeight: 'bold',
  },
  rankRight: {
    alignItems: 'flex-end',
  },
  timeText: {
    color: '#FFF', 
    fontWeight: 'bold',
    fontSize: 16,
    fontVariant: ['tabular-nums'],
  },
});
