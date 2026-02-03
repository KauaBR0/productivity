import React, { useState } from 'react';
import { View, Text, TextInput } from 'react-native';
import { useSettings } from '@/context/SettingsContext';

interface GoalSettingsProps {
  styles: any;
}

export const GoalSettings: React.FC<GoalSettingsProps> = ({ styles }) => {
  const { dailyGoalMinutes, setDailyGoalMinutes } = useSettings();
  const [goalInput, setGoalInput] = useState(String(dailyGoalMinutes));

  return (
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
  );
};
