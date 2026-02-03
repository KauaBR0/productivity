import React from 'react';
import { View, Text } from 'react-native';
import { useSettings } from '@/context/SettingsContext';
import { themes, ThemeName } from '@/constants/theme';
import { PressableScale } from '@/components/PressableScale';

interface ThemeSettingsProps {
  styles: any;
}

export const ThemeSettings: React.FC<ThemeSettingsProps> = ({ styles }) => {
  const { themeName, setThemeName } = useSettings();

  return (
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
  );
};
