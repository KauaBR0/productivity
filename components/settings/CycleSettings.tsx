import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Switch, Alert, Platform, StyleSheet } from 'react-native';
import { CycleDef } from '@/constants/FocusConfig';
import { useSettings } from '@/context/SettingsContext';
import { Plus, X, Trash2, Infinity as InfinityIcon } from 'lucide-react-native';
import { Theme } from '@/constants/theme';
import { PressableScale } from '../PressableScale';
import Toast from 'react-native-toast-message';

interface CycleSettingsProps {
  theme: Theme;
  themeName: string;
  styles: any;
}

export const CycleSettings: React.FC<CycleSettingsProps> = ({ theme, themeName, styles }) => {
  const { cycles, addCycle, updateCycle, removeCycle } = useSettings();
  const [isCreatingCycle, setIsCreatingCycle] = useState(false);
  const [isInfiniteMode, setIsInfiniteMode] = useState(false);
  const [newCycle, setNewCycle] = useState<Partial<CycleDef>>({
    label: '',
    focusDuration: 25,
    rewardDuration: 5,
    restDuration: 5,
    color: '#ffffff'
  });
  const [editingCycleId, setEditingCycleId] = useState<string | null>(null);
  const [tempCycleValues, setTempCycleValues] = useState<Partial<CycleDef>>({});

  const generateRandomColor = () => {
    const colors = ['#FF4500', '#00FF94', '#00D4FF', '#FF0055', '#FFD600', '#BF5AF2', '#FF9F0A', '#30D158'];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  const handleCreateCycle = () => {
      if (!newCycle.label?.trim()) {
          Toast.show({
              type: 'error',
              text1: 'Nome obrigatório',
              text2: 'Por favor, dê um nome ao seu ciclo.',
          });
          return;
      }

      const cycleToAdd: CycleDef = {
          id: `custom_${Date.now()}`,
          label: newCycle.label.trim(),
          focusDuration: Number(newCycle.focusDuration) || 25,
          rewardDuration: Number(newCycle.rewardDuration) || 5,
          restDuration: Number(newCycle.restDuration) || 5,
          color: generateRandomColor(),
          type: isInfiniteMode ? 'infinite' : 'fixed',
      };

      addCycle(cycleToAdd);
      setIsCreatingCycle(false);
      setIsInfiniteMode(false);
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

  const startEditingCycle = (cycle: CycleDef) => {
    if (editingCycleId === cycle.id) {
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

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
         <View>
            <Text style={styles.sectionTitle}>Ciclos de Foco</Text>
            <Text style={styles.sectionSubtitle}>Crie e personalize seus modos</Text>
         </View>
         <PressableScale style={styles.addButtonSmall} onPress={() => setIsCreatingCycle(!isCreatingCycle)}>
           {isCreatingCycle ? <X color="#0B0B0D" size={20} /> : <Plus color="#0B0B0D" size={20} />}
         </PressableScale>
      </View>

      {isCreatingCycle && (
        <View style={[styles.card, styles.cardDraft]}>
            <Text style={styles.cardTitle}>Novo Ciclo</Text>
            
            <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Nome do Ciclo</Text>
                <TextInput 
                    style={[styles.input, styles.inputFull]} 
                    placeholder="Ex: Leitura Profunda"
                    placeholderTextColor="#666"
                    value={newCycle.label}
                    onChangeText={(t) => setNewCycle(prev => ({ ...prev, label: t }))}
                />
            </View>

            <View style={styles.toggleRow}>
                <View style={styles.toggleLabelContainer}>
                    <InfinityIcon color={isInfiniteMode ? theme.colors.accent : '#666'} size={20} />
                    <Text style={[styles.toggleLabel, isInfiniteMode && { color: theme.colors.accent }]}>
                        Modo Infinito
                    </Text>
                </View>
                <Switch
                    value={isInfiniteMode}
                    onValueChange={setIsInfiniteMode}
                    trackColor={{ false: '#333', true: theme.colors.accent }}
                    thumbColor={Platform.OS === 'android' ? '#FFF' : ''}
                />
            </View>
            {isInfiniteMode && (
                <Text style={styles.helperText}>
                    O tempo de foco é livre. Os valores abaixo definem a proporção de recompensa ganha por tempo focado.
                </Text>
            )}

            <View style={styles.inputsRow}>
                <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>{isInfiniteMode ? 'Foco (para proporção)' : 'Foco'}</Text>
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

            <PressableScale style={styles.saveNewButton} onPress={handleCreateCycle}>
                <Text style={styles.saveNewButtonText}>Criar Ciclo</Text>
            </PressableScale>
        </View>
      )}
      
      {cycles.map((cycle) => {
        const isEditing = editingCycleId === cycle.id;
        return (
            <View key={cycle.id} style={[styles.card, { borderColor: cycle.color }]}>
                <View style={styles.cardHeader}>
                    <Text style={[styles.cardTitle, { color: cycle.color }]}>{cycle.label}</Text>
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                        <PressableScale 
                            onPress={() => startEditingCycle(cycle)}
                            style={[styles.editButton, { backgroundColor: isEditing ? cycle.color : '#333' }]}
                        >
                            <Text style={[styles.editButtonText, { color: isEditing ? '#000' : '#FFF' }]}>
                                {isEditing ? 'Salvar' : 'Editar'}
                            </Text>
                        </PressableScale>
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
  );
};
