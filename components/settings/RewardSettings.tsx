import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { useSettings } from '@/context/SettingsContext';
import { Plus, Trash2 } from 'lucide-react-native';
import { PressableScale } from '../PressableScale';

interface RewardSettingsProps {
  styles: any;
}

export const RewardSettings: React.FC<RewardSettingsProps> = ({ styles }) => {
  const { rewards, updateRewards, rouletteExtraSpins, setRouletteExtraSpins } = useSettings();
  const [newReward, setNewReward] = useState('');
  const [rouletteInput, setRouletteInput] = useState(String(rouletteExtraSpins));

  const handleAddReward = () => {
    if (!newReward.trim()) return;
    updateRewards([...rewards, newReward.trim()]);
    setNewReward('');
  };

  const handleDeleteReward = (index: number) => {
    const updated = [...rewards];
    updated.splice(index, 1);
    updateRewards(updated);
  };

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Recompensas</Text>
      <Text style={styles.sectionSubtitle}>Adicione itens para a roleta de prêmios</Text>

      <View style={styles.goalCard}>
        <View style={styles.goalInputRow}>
          <Text style={styles.goalLabel}>Giros extras da roleta</Text>
          <TextInput
            style={styles.goalInput}
            keyboardType="numeric"
            value={rouletteInput}
            onChangeText={(text) => {
              const cleaned = text.replace(/[^0-9]/g, '');
              setRouletteInput(cleaned);
            }}
            onBlur={() => {
              const value = Number(rouletteInput);
              if (!Number.isNaN(value)) {
                setRouletteExtraSpins(value);
                setRouletteInput(String(Math.max(0, Math.min(value, 1))));
              } else {
                setRouletteInput(String(rouletteExtraSpins));
              }
            }}
          />
        </View>
        <Text style={styles.goalHint}>Entre 0 e 1 giro extra</Text>
      </View>

      <View style={styles.addRewardContainer}>
        <TextInput
          style={styles.addInput}
          placeholder="Nova recompensa..."
          placeholderTextColor="#666"
          value={newReward}
          onChangeText={setNewReward}
        />
        <PressableScale style={styles.addButton} onPress={handleAddReward}>
          <Plus color="#0B0B0D" size={24} />
        </PressableScale>
      </View>

      <View style={styles.rewardsList}>
        {rewards.map((reward, index) => (
          <View key={`${reward}-${index}`} style={styles.rewardItem}>
            <Text style={styles.rewardText}>{reward}</Text>
            <TouchableOpacity onPress={() => handleDeleteReward(index)}>
              <Trash2 color="#FF4545" size={20} />
            </TouchableOpacity>
          </View>
        ))}
        {rewards.length === 0 && (
          <Text style={styles.emptyText}>Nenhuma recompensa cadastrada.</Text>
        )}
      </View>
    </View>
  );
};
