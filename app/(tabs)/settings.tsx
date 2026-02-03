import React, { useMemo } from 'react';
import { StyleSheet, Text, View, ScrollView, Platform } from 'react-native';
import { useSettings } from '@/context/SettingsContext';
import { Theme } from '@/constants/theme';
import { ContactSyncSettings } from '@/components/settings/ContactSyncSettings';
import { ThemeSettings } from '@/components/settings/ThemeSettings';
import { GoalSettings } from '@/components/settings/GoalSettings';
import { SoundSettings } from '@/components/settings/SoundSettings';
import { AppBlockerSettings } from '@/components/settings/AppBlockerSettings';
import { CycleSettings } from '@/components/settings/CycleSettings';
import { RewardSettings } from '@/components/settings/RewardSettings';
import { ResetSettings } from '@/components/settings/ResetSettings';

export default function SettingsScreen() {
  const { theme, themeName } = useSettings();
  const styles = useMemo(() => createStyles(theme), [theme]);

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

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ContactSyncSettings styles={styles} theme={theme} />
        <ThemeSettings styles={styles} />
        <GoalSettings styles={styles} />
        <SoundSettings styles={styles} theme={theme} />
        <AppBlockerSettings styles={styles} theme={theme} />
        <CycleSettings styles={styles} theme={theme} themeName={themeName} />
        <RewardSettings styles={styles} />
        <ResetSettings styles={styles} />
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
  blockerDisabledCard: {
    marginTop: 16,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  blockerDisabledText: {
    color: theme.colors.textMuted,
    fontSize: 13,
  },
  blockerStatusCard: {
    marginTop: 16,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  blockerStatusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  blockerStatusTitle: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  blockerStatusSubtitle: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
  blockerStatusButton: {
    backgroundColor: theme.colors.accent,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  blockerStatusButtonText: {
    color: theme.colors.accentDark,
    fontSize: 12,
    fontWeight: '700',
  },
  blockerSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  blockerSearchInput: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 14,
  },
  blockerCount: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  blockerAppsList: {
    marginTop: 12,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  blockerLoading: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  categoryGroup: {
    marginBottom: 12,
  },
  categoryHeader: {
    color: theme.colors.accent,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 8,
    marginTop: 8,
    letterSpacing: 0.5,
  },
  blockerAppRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  blockerAppRowActive: {
    backgroundColor: 'rgba(231, 184, 74, 0.08)',
    borderRadius: 12,
    paddingHorizontal: 6,
  },
  blockerAppInfo: {
    flex: 1,
    paddingRight: 10,
  },
  blockerAppName: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  blockerAppPackage: {
    color: theme.colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  blockerCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blockerCheckActive: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  blockerEmptyText: {
    color: theme.colors.textMuted,
    textAlign: 'center',
    paddingVertical: 12,
  },
  blockerHint: {
    color: theme.colors.textMuted,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 10,
  },
  blockerError: {
    color: theme.colors.danger,
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: 12,
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
  toggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
      paddingHorizontal: 4,
  },
  toggleLabelContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
  },
  toggleLabel: {
      color: '#666',
      fontSize: 14,
      fontWeight: '600',
  },
  helperText: {
      color: '#666',
      fontSize: 11,
      marginBottom: 16,
      fontStyle: 'italic',
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