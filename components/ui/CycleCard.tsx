import React, { useMemo } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, StyleProp, ViewStyle } from 'react-native';
import { Edit2, Play } from 'lucide-react-native';
import { CycleDef } from '@/constants/FocusConfig';
import { Theme } from '@/constants/theme';
import { PressableScale } from '@/components/PressableScale';

interface CycleCardProps {
  cycle: CycleDef;
  theme: Theme;
  onPress: (cycle: CycleDef) => void;
  onEdit?: (cycle: CycleDef) => void;
  style?: StyleProp<ViewStyle>;
}

export const CycleCard: React.FC<CycleCardProps> = ({ cycle, theme, onPress, onEdit, style }) => {
  const styles = useMemo(() => createStyles(theme), [theme]);
  const isCustom = cycle.id.startsWith('custom_');

  return (
    <PressableScale onPress={() => onPress(cycle)} style={[styles.card, { borderColor: cycle.color }, style]}>
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <View style={[styles.cardAccent, { backgroundColor: cycle.color }]} />
          <View>
            <View style={styles.cardTitleRow}>
              <Text style={[styles.cardTitle, { color: cycle.color }]}>{cycle.label.toUpperCase()}</Text>
            </View>
            <Text style={styles.cardSubtitle}>
              {isCustom ? 'Ciclo personalizado' : 'Ciclo padrão'}
            </Text>
          </View>
        </View>

        <View style={styles.cardActions}>
          {isCustom && onEdit && (
            <TouchableOpacity onPress={() => onEdit(cycle)} style={styles.editActionButton}>
              <Edit2 color="#8A8A8F" size={16} />
            </TouchableOpacity>
          )}
          <View style={[styles.playButton, { backgroundColor: cycle.color }]}>
            <Play size={20} color="#000" fill="#000" style={{ marginLeft: 2 }} />
          </View>
        </View>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{cycle.focusDuration} min</Text>
          <Text style={styles.statLabel}>FOCO</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{cycle.rewardDuration} min</Text>
          <Text style={styles.statLabel}>RECOMPENSA</Text>
        </View>
      </View>
    </PressableScale>
  );
};

const createStyles = (theme: Theme) => StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: 24,
    borderWidth: 1.5,
    marginBottom: 4,
    ...theme.shadow.card,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardAccent: {
    width: 10,
    height: 42,
    borderRadius: 6,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  cardSubtitle: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 4,
    letterSpacing: 0.4,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  editActionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.surfaceSoft,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  playButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.textMuted,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: theme.colors.border,
    marginHorizontal: 10,
  },
});
