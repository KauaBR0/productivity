import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, TextInput, Alert, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSettings } from '@/context/SettingsContext';
import { CycleDef } from '@/constants/FocusConfig';
import { X, Plus, Trash2, RotateCcw, Save, Check } from 'lucide-react-native';

export default function SettingsScreen() {
  const router = useRouter();
  const { cycles, rewards, updateCycle, addCycle, removeCycle, updateRewards, resetSettings } = useSettings();
  const [newReward, setNewReward] = useState('');

  // Creation state for new cycle
  const [isCreatingCycle, setIsCreatingCycle] = useState(false);
  const [newCycle, setNewCycle] = useState<Partial<CycleDef>>({
    label: '',
    focusDuration: 25,
    rewardDuration: 5,
    restDuration: 5,
    color: '#ffffff' // Default white, maybe random later
  });

  // Editing state for cycles
  const [editingCycleId, setEditingCycleId] = useState<string | null>(null);
  const [tempCycleValues, setTempCycleValues] = useState<Partial<CycleDef>>({});

  const handleClose = () => {
    router.back();
  };

  const handleReset = () => {
    Alert.alert(
      "Restaurar Padrões",
      "Tem certeza? Todas as suas configurações personalizadas serão perdidas.",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Restaurar", style: "destructive", onPress: resetSettings }
      ]
    );
  };

  // --- Cycle Logic ---

  const handleCreateCycle = () => {
      if (!newCycle.label?.trim()) {
          Alert.alert("Erro", "O nome do ciclo é obrigatório.");
          return;
      }

      const cycleToAdd: CycleDef = {
          id: `custom_${Date.now()}`,
          label: newCycle.label.trim(),
          focusDuration: Number(newCycle.focusDuration) || 25,
          rewardDuration: Number(newCycle.rewardDuration) || 5,
          restDuration: Number(newCycle.restDuration) || 5,
          color: generateRandomColor(),
      };

      addCycle(cycleToAdd);
      setIsCreatingCycle(false);
      setNewCycle({ label: '', focusDuration: 25, rewardDuration: 5, restDuration: 5 });
  };

  const handleDeleteCycle = (id: string) => {
    Alert.alert(
        "Excluir Ciclo",
        "Tem certeza que deseja excluir este ciclo?",
        [
            { text: "Cancelar", style: "cancel" },
            { text: "Excluir", style: "destructive", onPress: () => removeCycle(id) }
        ]
    );
  };

  const generateRandomColor = () => {
    const colors = ['#FF4500', '#00FF94', '#00D4FF', '#FF0055', '#FFD600', '#BF5AF2', '#FF9F0A', '#30D158'];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  const startEditingCycle = (cycle: CycleDef) => {
    if (editingCycleId === cycle.id) {
        // Save
        if (tempCycleValues.focusDuration && tempCycleValues.rewardDuration && tempCycleValues.restDuration) {
             updateCycle({
                ...cycle,
                focusDuration: Number(tempCycleValues.focusDuration),
                rewardDuration: Number(tempCycleValues.rewardDuration),
                restDuration: Number(tempCycleValues.restDuration),
            });
        }
        setEditingCycleId(null);
        setTempCycleValues({});
    } else {
        // Start Edit
        setEditingCycleId(cycle.id);
        setTempCycleValues({
            focusDuration: cycle.focusDuration,
            rewardDuration: cycle.rewardDuration,
            restDuration: cycle.restDuration,
        });
    }
  };

  const handleChangeCycleValue = (field: keyof CycleDef, value: string) => {
      const numValue = parseInt(value.replace(/[^0-9]/g, '')) || 0;
      setTempCycleValues(prev => ({ ...prev, [field]: numValue }));
  };

  // --- Reward Logic ---
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
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Configurações</Text>
        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
          <X color="#FFF" size={24} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
        {/* Cycles Section */}
        <View style={styles.section}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
             <View>
                <Text style={styles.sectionTitle}>Ciclos de Foco</Text>
                <Text style={styles.sectionSubtitle}>Crie e personalize seus modos</Text>
             </View>
             <TouchableOpacity style={styles.addButtonSmall} onPress={() => setIsCreatingCycle(!isCreatingCycle)}>
                {isCreatingCycle ? <X color="#000" size={20} /> : <Plus color="#000" size={20} />}
             </TouchableOpacity>
          </View>

          {/* Create Cycle Form */}
          {isCreatingCycle && (
            <View style={[styles.card, { borderColor: '#FFF', borderStyle: 'dashed' }]}>
                <Text style={styles.cardTitle}>Novo Ciclo</Text>
                
                <View style={styles.formGroup}>
                    <Text style={styles.inputLabel}>Nome do Ciclo</Text>
                    <TextInput 
                        style={[styles.input, { width: '100%', textAlign: 'left', paddingHorizontal: 10 }]} 
                        placeholder="Ex: Leitura Profunda"
                        placeholderTextColor="#666"
                        value={newCycle.label}
                        onChangeText={(t) => setNewCycle(prev => ({ ...prev, label: t }))}
                    />
                </View>

                <View style={styles.inputsRow}>
                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Foco</Text>
                        <TextInput 
                            style={styles.input} 
                            keyboardType="numeric"
                            value={String(newCycle.focusDuration)}
                            onChangeText={(t) => setNewCycle(prev => ({ ...prev, focusDuration: Number(t) }))}
                        />
                    </View>
                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Recompensa</Text>
                        <TextInput 
                            style={styles.input} 
                            keyboardType="numeric"
                            value={String(newCycle.rewardDuration)}
                            onChangeText={(t) => setNewCycle(prev => ({ ...prev, rewardDuration: Number(t) }))}
                        />
                    </View>
                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Descanso</Text>
                        <TextInput 
                            style={styles.input} 
                            keyboardType="numeric"
                            value={String(newCycle.restDuration)}
                            onChangeText={(t) => setNewCycle(prev => ({ ...prev, restDuration: Number(t) }))}
                        />
                    </View>
                </View>

                <TouchableOpacity style={styles.saveNewButton} onPress={handleCreateCycle}>
                    <Text style={styles.saveNewButtonText}>Criar Ciclo</Text>
                </TouchableOpacity>
            </View>
          )}
          
          {cycles.map((cycle) => {
            const isEditing = editingCycleId === cycle.id;
            
            return (
                <View key={cycle.id} style={[styles.card, { borderColor: cycle.color }]}>
                    <View style={styles.cardHeader}>
                        <Text style={[styles.cardTitle, { color: cycle.color }]}>{cycle.label}</Text>
                        <View style={{ flexDirection: 'row', gap: 10 }}>
                            <TouchableOpacity 
                                onPress={() => startEditingCycle(cycle)}
                                style={[styles.editButton, { backgroundColor: isEditing ? cycle.color : '#333' }]}
                            >
                                <Text style={[styles.editButtonText, { color: isEditing ? '#000' : '#FFF' }]}>
                                    {isEditing ? 'Salvar' : 'Editar'}
                                </Text>
                            </TouchableOpacity>
                            {!isEditing && (
                                <TouchableOpacity onPress={() => handleDeleteCycle(cycle.id)} style={styles.deleteButton}>
                                    <Trash2 color="#FF4545" size={20} />
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>

                    <View style={styles.inputsRow}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Foco</Text>
                            {isEditing ? (
                                <TextInput 
                                    style={styles.input} 
                                    keyboardType="numeric"
                                    value={String(tempCycleValues.focusDuration)}
                                    onChangeText={(t) => handleChangeCycleValue('focusDuration', t)}
                                />
                            ) : (
                                <Text style={styles.valueText}>{cycle.focusDuration} min</Text>
                            )}
                        </View>
                        <View style={styles.divider} />
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Recompensa</Text>
                            {isEditing ? (
                                <TextInput 
                                    style={styles.input} 
                                    keyboardType="numeric"
                                    value={String(tempCycleValues.rewardDuration)}
                                    onChangeText={(t) => handleChangeCycleValue('rewardDuration', t)}
                                />
                            ) : (
                                <Text style={styles.valueText}>{cycle.rewardDuration} min</Text>
                            )}
                        </View>
                        <View style={styles.divider} />
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Descanso</Text>
                            {isEditing ? (
                                <TextInput 
                                    style={styles.input} 
                                    keyboardType="numeric"
                                    value={String(tempCycleValues.restDuration)}
                                    onChangeText={(t) => handleChangeCycleValue('restDuration', t)}
                                />
                            ) : (
                                <Text style={styles.valueText}>{cycle.restDuration} min</Text>
                            )}
                        </View>
                    </View>
                </View>
            );
          })}
        </View>

        {/* Rewards Section */}
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recompensas</Text>
            <Text style={styles.sectionSubtitle}>Adicione itens para a roleta de prêmios</Text>

            <View style={styles.addRewardContainer}>
                <TextInput
                    style={styles.addInput}
                    placeholder="Nova recompensa..."
                    placeholderTextColor="#666"
                    value={newReward}
                    onChangeText={setNewReward}
                />
                <TouchableOpacity style={styles.addButton} onPress={handleAddReward}>
                    <Plus color="#000" size={24} />
                </TouchableOpacity>
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

        {/* Reset Section */}
        <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
            <RotateCcw color="#FF4545" size={20} />
            <Text style={styles.resetText}>Restaurar Configurações Padrão</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
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
    fontSize: 24,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 8,
    backgroundColor: '#333',
    borderRadius: 20,
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  sectionSubtitle: {
    color: '#A1A1AA',
    fontSize: 14,
    marginBottom: 0,
  },
  card: {
    backgroundColor: '#1E1E24',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  editButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  editButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  deleteButton: {
      padding: 6,
  },
  inputsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inputGroup: {
    flex: 1,
    alignItems: 'center',
  },
  inputLabel: {
    color: '#A1A1AA',
    fontSize: 12,
    marginBottom: 4,
  },
  valueText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  input: {
    backgroundColor: '#333',
    color: '#FFF',
    width: '80%',
    textAlign: 'center',
    paddingVertical: 4,
    borderRadius: 4,
    fontSize: 18,
    fontWeight: 'bold',
  },
  divider: {
    width: 1,
    height: 30,
    backgroundColor: '#333',
  },
  // Additions for Creation Form
  addButtonSmall: {
      backgroundColor: '#FFF',
      padding: 8,
      borderRadius: 20,
  },
  formGroup: {
      marginBottom: 16,
  },
  saveNewButton: {
      backgroundColor: '#00FF94',
      paddingVertical: 12,
      borderRadius: 8,
      alignItems: 'center',
      marginTop: 20,
  },
  saveNewButtonText: {
      color: '#000',
      fontWeight: 'bold',
      fontSize: 16,
  },
  // Rewards
  addRewardContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    marginTop: 16,
  },
  addInput: {
    flex: 1,
    backgroundColor: '#1E1E24',
    color: '#FFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#333',
  },
  addButton: {
    backgroundColor: '#00FF94',
    width: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rewardsList: {
    backgroundColor: '#1E1E24',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  rewardItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  rewardText: {
    color: '#FFF',
    fontSize: 16,
  },
  emptyText: {
    color: '#666',
    textAlign: 'center',
    paddingVertical: 10,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FF4545',
    gap: 10,
  },
  resetText: {
    color: '#FF4545',
    fontWeight: 'bold',
  },
});