import React from 'react';
import { View, Text, Alert } from 'react-native';
import { useSettings } from '@/context/SettingsContext';
import { RotateCcw } from 'lucide-react-native';
import { PressableScale } from '@/components/PressableScale';

interface ResetSettingsProps {
  styles: any;
}

export const ResetSettings: React.FC<ResetSettingsProps> = ({ styles }) => {
  const { resetSettings } = useSettings();

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

  return (
    <PressableScale style={styles.resetButton} onPress={handleReset}>
      <RotateCcw color="#FF4545" size={20} />
      <Text style={styles.resetText}>Restaurar Configurações Padrão</Text>
    </PressableScale>
  );
};
