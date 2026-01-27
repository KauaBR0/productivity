import React, { useState, useRef, useMemo } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, TextInput, Alert, FlatList, KeyboardAvoidingView, Platform, Pressable, Animated, StyleProp, ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { useSettings } from '@/context/SettingsContext';
import { CycleDef } from '@/constants/FocusConfig';
import { themes, ThemeName, Theme } from '@/constants/theme';
import { Plus, Trash2, RotateCcw, Volume2, Music2, PhoneCall, X } from 'lucide-react-native';
import { Audio } from 'expo-av';

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

export default function SettingsScreen() {
  const router = useRouter();
  const { cycles, rewards, updateCycle, addCycle, removeCycle, updateRewards, resetSettings, theme, themeName, setThemeName, dailyGoalMinutes, setDailyGoalMinutes, alarmSound, setAlarmSound, lofiTrack, setLofiTrack, rouletteExtraSpins, setRouletteExtraSpins } = useSettings();
  const [newReward, setNewReward] = useState('');
  const [goalInput, setGoalInput] = useState(String(dailyGoalMinutes));
  const [rouletteInput, setRouletteInput] = useState(String(rouletteExtraSpins));
  const previewSoundRef = useRef<Audio.Sound | null>(null);
  const styles = useMemo(() => createStyles(theme), [theme]);

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

  const playAlarmPreview = async () => {
    try {
      if (previewSoundRef.current) {
        await previewSoundRef.current.unloadAsync();
        previewSoundRef.current = null;
      }
      const { sound } = await Audio.Sound.createAsync(
        require('../assets/sounds/alarm.mp3')
      );
      previewSoundRef.current = sound;
      await sound.playAsync();
      sound.setOnPlaybackStatusUpdate(async (status) => {
        if (status.isLoaded && status.didJustFinish) {
          await sound.unloadAsync();
          previewSoundRef.current = null;
        }
      });
    } catch (error) {
      console.log('Error playing preview', error);
    }
  };

  const playLofiPreview = async (track: 'lofi1' | 'lofi2') => {
    try {
      if (previewSoundRef.current) {
        await previewSoundRef.current.unloadAsync();
        previewSoundRef.current = null;
      }
      const source = track === 'lofi1'
        ? require('../assets/sounds/lofi1.mp3')
        : require('../assets/sounds/lofi2.mp3');
      const { sound } = await Audio.Sound.createAsync(source, { shouldPlay: true, isLooping: false, volume: 0.5 });
      previewSoundRef.current = sound;
      await sound.playAsync();
      sound.setOnPlaybackStatusUpdate(async (status) => {
        if (status.isLoaded && status.didJustFinish) {
          await sound.unloadAsync();
          previewSoundRef.current = null;
        }
      });
    } catch (error) {
      console.log('Error playing lofi preview', error);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.background}>
        <View style={styles.glowOrb} />
        <View style={styles.glowOrbSecondary} />
      </View>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Configurações</Text>
          <Text style={styles.subtitle}>Personalize seu ritmo e recompensas</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>

        {/* Contacts Sync */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sincronizar contatos</Text>
          <Text style={styles.sectionSubtitle}>Encontre amigos do seu telefone que usam o app</Text>

          <PressableScale style={styles.contactCard} onPress={() => router.push('/contacts-sync' as any)}>
            <View style={styles.contactCardInfo}>
              <View style={styles.contactIcon}>
                <PhoneCall color={theme.colors.accent} size={18} />
              </View>
              <View>
                <Text style={styles.contactTitle}>Conectar com seus contatos</Text>
                <Text style={styles.contactSubtitle}>Sincronizar agora</Text>
              </View>
            </View>
            <View style={styles.contactCta}>
              <Text style={styles.contactCtaText}>Abrir</Text>
            </View>
          </PressableScale>
        </View>

        {/* Theme Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tema Visual</Text>
          <Text style={styles.sectionSubtitle}>Escolha a pele que combina com seu foco</Text>

          <View style={styles.themeGrid}>
            {([
              { id: 'noir', label: 'Noir', description: 'Premium escuro' },
              { id: 'ember', label: 'Ember', description: 'Quente e energético' },
              { id: 'sage', label: 'Sage', description: 'Calmo e clean' },
            ] as { id: ThemeName; label: string; description: string }[]).map((item) => {
              const palette = themes[item.id];
              const isSelected = themeName === item.id;
              return (
                <PressableScale key={item.id} onPress={() => setThemeName(item.id)} style={[styles.themeCard, isSelected && styles.themeCardActive]}>
                  <View style={[styles.themePreview, { backgroundColor: palette.colors.bg }]}>
                    <View style={[styles.themeGlow, { backgroundColor: palette.colors.glowPrimary }]} />
                    <View style={[styles.themeDot, { backgroundColor: palette.colors.accent }]} />
                    <View style={[styles.themeDot, { backgroundColor: palette.colors.surface }]} />
                    <View style={[styles.themeDot, { backgroundColor: palette.colors.glowSecondary }]} />
                  </View>
                  <View style={styles.themeInfo}>
                    <Text style={styles.themeTitle}>{item.label}</Text>
                    <Text style={styles.themeDesc}>{item.description}</Text>
                  </View>
                </PressableScale>
              );
            })}
          </View>
        </View>

        {/* Daily Goal Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Meta diária</Text>
          <Text style={styles.sectionSubtitle}>Defina quantos minutos você quer focar por dia</Text>

          <View style={styles.goalCard}>
            <View style={styles.goalInputRow}>
              <Text style={styles.goalLabel}>Minutos</Text>
              <TextInput
                style={styles.goalInput}
                keyboardType="numeric"
                value={goalInput}
                onChangeText={(text) => {
                  const cleaned = text.replace(/[^0-9]/g, '');
                  setGoalInput(cleaned);
                }}
                onBlur={() => {
                  const value = Number(goalInput);
                  if (!Number.isNaN(value) && value > 0) {
                    setDailyGoalMinutes(value);
                    setGoalInput(String(Math.max(10, Math.min(value, 600))));
                  } else {
                    setGoalInput(String(dailyGoalMinutes));
                  }
                }}
              />
            </View>
            <Text style={styles.goalHint}>Entre 10 e 600 minutos</Text>
          </View>
        </View>

        {/* Alarm Sound Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Som do alarme</Text>
          <Text style={styles.sectionSubtitle}>Escolha como o app alerta no fim do ciclo</Text>

          <View style={styles.soundOptions}>
            {[
              { id: 'alarm', label: 'Alarmes do app', description: 'Som personalizado' },
              { id: 'silent', label: 'Silencioso', description: 'Sem som (apenas visual)' },
            ].map((option) => {
              const selected = alarmSound === option.id;
              return (
                <PressableScale
                  key={option.id}
                  style={[styles.soundCard, selected && styles.soundCardActive]}
                  onPress={() => setAlarmSound(option.id as 'alarm' | 'silent')}
                >
                  <View>
                    <Text style={styles.soundTitle}>{option.label}</Text>
                    <Text style={styles.soundSubtitle}>{option.description}</Text>
                  </View>
                  <View style={styles.soundRight}>
                    {option.id === 'alarm' && (
                      <Pressable onPress={playAlarmPreview} style={styles.soundPreview}>
                        <Volume2 color={theme.colors.accent} size={16} />
                      </Pressable>
                    )}
                    <View style={[styles.soundDot, selected && styles.soundDotActive]} />
                  </View>
                </PressableScale>
              );
            })}
          </View>
        </View>

        {/* Lofi Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Música Lo‑fi</Text>
          <Text style={styles.sectionSubtitle}>Escolha a faixa para tocar durante o foco</Text>

          <View style={styles.soundOptions}>
            {[
              { id: 'random', label: 'Aleatório', description: 'Alterna entre as faixas' },
              { id: 'lofi1', label: 'Lo‑fi 1', description: 'Faixa 1' },
              { id: 'lofi2', label: 'Lo‑fi 2', description: 'Faixa 2' },
              { id: 'off', label: 'Desligado', description: 'Sem música' },
            ].map((option) => {
              const selected = lofiTrack === option.id;
              return (
                <PressableScale
                  key={option.id}
                  style={[styles.soundCard, selected && styles.soundCardActive]}
                  onPress={() => setLofiTrack(option.id as 'random' | 'lofi1' | 'lofi2' | 'off')}
                >
                  <View>
                    <Text style={styles.soundTitle}>{option.label}</Text>
                    <Text style={styles.soundSubtitle}>{option.description}</Text>
                  </View>
                  <View style={styles.soundRight}>
                    {option.id === 'lofi1' && (
                      <Pressable onPress={() => playLofiPreview('lofi1')} style={styles.soundPreview}>
                        <Music2 color={theme.colors.accent} size={16} />
                      </Pressable>
                    )}
                    {option.id === 'lofi2' && (
                      <Pressable onPress={() => playLofiPreview('lofi2')} style={styles.soundPreview}>
                        <Music2 color={theme.colors.accent} size={16} />
                      </Pressable>
                    )}
                    <View style={[styles.soundDot, selected && styles.soundDotActive]} />
                  </View>
                </PressableScale>
              );
            })}
          </View>
        </View>
        
        {/* Cycles Section */}
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

          {/* Create Cycle Form */}
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

        {/* Rewards Section */}
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
                      setRouletteInput(String(Math.max(0, Math.min(value, 5))));
                    } else {
                      setRouletteInput(String(rouletteExtraSpins));
                    }
                  }}
                />
              </View>
              <Text style={styles.goalHint}>Entre 0 e 5 giros extras</Text>
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

        {/* Reset Section */}
        <PressableScale style={styles.resetButton} onPress={handleReset}>
            <RotateCcw color="#FF4545" size={20} />
            <Text style={styles.resetText}>Restaurar Configurações Padrão</Text>
        </PressableScale>

        <View style={{ height: 40 }} />
      </ScrollView>
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
    width: 300,
    height: 300,
    borderRadius: 150,
    top: -140,
    right: -120,
    backgroundColor: theme.colors.glowPrimary,
  },
  glowOrbSecondary: {
    position: 'absolute',
    width: 340,
    height: 340,
    borderRadius: 170,
    bottom: -180,
    left: -140,
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
  subtitle: {
    color: theme.colors.textMuted,
    fontSize: 13,
    marginTop: 4,
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 30,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    color: theme.colors.text,
    ...theme.typography.sectionTitle,
    marginBottom: 4,
  },
  sectionSubtitle: {
    color: theme.colors.textDim,
    fontSize: 13,
    marginBottom: 0,
  },
  contactCard: {
    marginTop: 16,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  contactCardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  contactIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(231, 184, 74, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(231, 184, 74, 0.4)',
  },
  contactTitle: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  contactSubtitle: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
  contactCta: {
    backgroundColor: theme.colors.accent,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  contactCtaText: {
    color: theme.colors.accentDark,
    fontSize: 12,
    fontWeight: '700',
  },
  themeGrid: {
    marginTop: 16,
    gap: 12,
  },
  themeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadow.card,
  },
  themeCardActive: {
    borderColor: theme.colors.accent,
    shadowColor: theme.colors.accent,
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 6,
  },
  themePreview: {
    width: 72,
    height: 56,
    borderRadius: 14,
    backgroundColor: theme.colors.bg,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    padding: 8,
  },
  themeGlow: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    top: -30,
    right: -20,
  },
  themeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginBottom: 4,
  },
  themeInfo: {
    marginLeft: 14,
    flex: 1,
  },
  themeTitle: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  themeDesc: {
    color: theme.colors.textMuted,
    fontSize: 12,
  },
  goalCard: {
    marginTop: 16,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  goalInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  goalLabel: {
    color: theme.colors.textDim,
    fontSize: 13,
    fontWeight: '700',
  },
  goalInput: {
    backgroundColor: theme.colors.surfaceSoft,
    color: theme.colors.text,
    borderRadius: theme.radius.md,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    fontWeight: '700',
    borderWidth: 1,
    borderColor: theme.colors.border,
    minWidth: 90,
    textAlign: 'center',
  },
  goalHint: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginTop: 10,
  },
  soundOptions: {
    marginTop: 16,
    gap: 10,
  },
  soundCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  soundCardActive: {
    borderColor: theme.colors.accent,
    backgroundColor: 'rgba(231, 184, 74, 0.08)',
  },
  soundTitle: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  soundSubtitle: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
  soundDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  soundDotActive: {
    borderColor: theme.colors.accent,
    backgroundColor: theme.colors.accent,
  },
  soundRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  soundPreview: {
    padding: 6,
    borderRadius: 10,
    backgroundColor: theme.colors.surfaceSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
    ...theme.shadow.card,
  },
  cardDraft: {
    borderColor: 'rgba(255,255,255,0.16)',
    borderStyle: 'dashed',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  editButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  editButtonText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
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
    color: theme.colors.textDim,
    fontSize: 12,
    marginBottom: 4,
  },
  valueText: {
    color: theme.colors.text,
    fontSize: 17,
    fontWeight: '700',
  },
  input: {
    backgroundColor: theme.colors.surfaceSoft,
    color: theme.colors.text,
    width: '80%',
    textAlign: 'center',
    paddingVertical: 4,
    borderRadius: theme.radius.sm,
    fontSize: 16,
    fontWeight: '600',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  inputFull: {
    width: '100%',
    textAlign: 'left',
    paddingHorizontal: 12,
  },
  divider: {
    width: 1,
    height: 30,
    backgroundColor: theme.colors.border,
  },
  // Additions for Creation Form
  addButtonSmall: {
      backgroundColor: theme.colors.accent,
      padding: 8,
      borderRadius: theme.radius.md,
      ...theme.shadow.accent,
  },
  formGroup: {
      marginBottom: 16,
  },
  saveNewButton: {
      backgroundColor: theme.colors.accent,
      paddingVertical: 12,
      borderRadius: theme.radius.md,
      alignItems: 'center',
      marginTop: 20,
  },
  saveNewButtonText: {
      color: theme.colors.accentDark,
      fontWeight: '700',
      fontSize: 15,
      letterSpacing: 0.4,
  },
  // Rewards
  addRewardContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    marginTop: 16,
  },
  addInput: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    color: theme.colors.text,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  addButton: {
    backgroundColor: theme.colors.accent,
    width: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rewardsList: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  rewardItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  rewardText: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  emptyText: {
    color: theme.colors.textMuted,
    textAlign: 'center',
    paddingVertical: 10,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,69,69,0.6)',
    gap: 10,
    backgroundColor: 'rgba(255,69,69,0.08)',
  },
  resetText: {
    color: theme.colors.danger,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
