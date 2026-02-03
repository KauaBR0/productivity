import React from 'react';
import { Text } from 'react-native';
import { useSettings } from '@/context/SettingsContext';
import { RotateCcw } from 'lucide-react-native';
import { PressableScale } from '@/components/PressableScale';
import { useActionDialog } from '@/hooks/useActionDialog';

interface ResetSettingsProps {
  styles: any;
}

export const ResetSettings: React.FC<ResetSettingsProps> = ({ styles }) => {
  const { resetSettings, theme } = useSettings();
  const { openDialog, dialog } = useActionDialog(theme);

  const handleReset = async () => {
    const action = await openDialog({
      title: 'Restaurar Padrões',
      message: 'Tem certeza? Todas as suas configurações personalizadas serão perdidas.',
      actions: [
        { key: 'cancel', label: 'Cancelar', tone: 'cancel' },
        { key: 'reset', label: 'Restaurar', tone: 'destructive' },
      ],
    });

    if (action !== 'reset') return;
    resetSettings();
  };

  return (
    <>
      <PressableScale style={styles.resetButton} onPress={handleReset}>
        <RotateCcw color="#FF4545" size={20} />
        <Text style={styles.resetText}>Restaurar Configurações Padrão</Text>
      </PressableScale>
      {dialog}
    </>
  );
};
