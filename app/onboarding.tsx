import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Notifications from 'expo-notifications';
import {
  ArrowLeft,
  ArrowRight,
  BatteryCharging,
  BellRing,
  CheckCircle2,
  ShieldCheck,
  Smartphone,
  TriangleAlert,
} from 'lucide-react-native';
import { PressableScale } from '@/components/PressableScale';
import { useSettings } from '@/context/SettingsContext';
import { useOnboarding } from '@/context/OnboardingContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  getBlockerDiagnostics,
  openAccessibilitySettings,
  openAppDetailsSettings,
  openBatteryOptimizationSettings,
  type BlockerDiagnostics,
} from '@/services/AppBlockerService';
import { Theme } from '@/constants/theme';

type StepId = 'welcome' | 'accessibility' | 'notifications' | 'battery' | 'done';

const ANDROID_STEPS: StepId[] = ['welcome', 'accessibility', 'notifications', 'battery', 'done'];
const OTHER_STEPS: StepId[] = ['welcome', 'notifications', 'done'];

export default function OnboardingScreen() {
  const { theme } = useSettings();
  const { completeOnboarding } = useOnboarding();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const steps = Platform.OS === 'android' ? ANDROID_STEPS : OTHER_STEPS;
  const footerBottomInset = Math.max(insets.bottom, Platform.OS === 'android' ? 20 : 12);
  const scrollBottomPadding = 140 + footerBottomInset;

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [diagnostics, setDiagnostics] = useState<BlockerDiagnostics | null>(null);
  const [notificationGranted, setNotificationGranted] = useState(false);
  const [statusLoading, setStatusLoading] = useState(true);
  const [notificationLoading, setNotificationLoading] = useState(false);
  const [finishing, setFinishing] = useState(false);

  const currentStep = steps[currentStepIndex];
  const isAndroid = Platform.OS === 'android';
  const accessibilityEnabled = diagnostics?.accessibilityEnabled ?? false;
  const batteryOptimizationsReleased = diagnostics?.ignoringBatteryOptimizations ?? false;
  const manufacturerName = diagnostics?.manufacturer || diagnostics?.brand || '';
  const isXiaomiFamily = ['xiaomi', 'redmi', 'poco'].some((name) =>
    manufacturerName.toLowerCase().includes(name)
  );

  const loadStatuses = async () => {
    try {
      setStatusLoading(true);
      const [notificationSettings, blockerDiagnostics] = await Promise.all([
        Notifications.getPermissionsAsync(),
        getBlockerDiagnostics(),
      ]);

      setNotificationGranted(notificationSettings.status === 'granted');
      setDiagnostics(blockerDiagnostics);
    } catch (error) {
      console.error('Failed to load onboarding statuses:', error);
    } finally {
      setStatusLoading(false);
    }
  };

  useEffect(() => {
    void loadStatuses();

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void loadStatuses();
      }
    });

    return () => subscription.remove();
  }, []);

  const handleRequestNotifications = async () => {
    try {
      setNotificationLoading(true);
      const result = await Notifications.requestPermissionsAsync();
      setNotificationGranted(result.status === 'granted');
    } catch (error) {
      console.error('Failed to request notifications:', error);
    } finally {
      setNotificationLoading(false);
    }
  };

  const goNext = async () => {
    if (currentStep === 'done') {
      try {
        setFinishing(true);
        await completeOnboarding();
      } finally {
        setFinishing(false);
      }
      return;
    }

    setCurrentStepIndex((value) => Math.min(value + 1, steps.length - 1));
  };

  const goBack = () => {
    setCurrentStepIndex((value) => Math.max(value - 1, 0));
  };

  const primaryLabel = (() => {
    switch (currentStep) {
      case 'welcome':
        return 'Comecar guia';
      case 'accessibility':
        return 'Continuar';
      case 'notifications':
        return 'Continuar';
      case 'battery':
        return 'Continuar';
      case 'done':
        return 'Entrar no app';
      default:
        return 'Continuar';
    }
  })();

  const primaryDisabled =
    statusLoading ||
    finishing ||
    (currentStep === 'accessibility' && isAndroid && !accessibilityEnabled) ||
    notificationLoading;

  const handlePrimaryPress = async () => {
    await goNext();
  };

  const renderStatusPill = (label: string, tone: 'good' | 'warn' | 'neutral') => (
    <View
      style={[
        styles.statusPill,
        tone === 'good'
          ? styles.statusPillGood
          : tone === 'warn'
            ? styles.statusPillWarn
            : styles.statusPillNeutral,
      ]}
    >
      <Text style={styles.statusPillText}>{label}</Text>
    </View>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 'welcome':
        return (
          <>
            <Text style={styles.eyebrow}>Primeira configuracao</Text>
            <Text style={styles.title}>Vamos deixar o VTX pronto para funcionar de verdade.</Text>
            <Text style={styles.description}>
              Em menos de 2 minutos voce ativa as permissoes que fazem o bloqueio de apps,
              notificacoes e o foco total funcionarem sem falhas.
            </Text>

            <View style={styles.featureList}>
              <View style={styles.featureCard}>
                <ShieldCheck color={theme.colors.accent} size={18} />
                <Text style={styles.featureText}>Bloqueio de apps e foco total</Text>
              </View>
              <View style={styles.featureCard}>
                <BellRing color={theme.colors.accent} size={18} />
                <Text style={styles.featureText}>Alarmes e alertas do timer</Text>
              </View>
              <View style={styles.featureCard}>
                <BatteryCharging color={theme.colors.accent} size={18} />
                <Text style={styles.featureText}>Menos interrupcoes do sistema em background</Text>
              </View>
            </View>
          </>
        );

      case 'accessibility':
        return (
          <>
            <Text style={styles.eyebrow}>Passo 1 de {steps.length - 1}</Text>
            <Text style={styles.title}>Ative a acessibilidade do bloqueador.</Text>
            <Text style={styles.description}>
              Essa e a permissao principal do app. Sem ela, o VTX nao consegue bloquear
              outros apps nem aplicar o foco total.
            </Text>

            <View style={styles.statusRow}>
              {renderStatusPill(accessibilityEnabled ? 'Acessibilidade ativa' : 'Obrigatorio ativar', accessibilityEnabled ? 'good' : 'warn')}
            </View>

            <View style={styles.calloutCard}>
              <TriangleAlert color={theme.colors.accent} size={18} />
              <Text style={styles.calloutText}>
                Toque em abrir configuracoes, procure por VTX na lista e habilite o servico.
              </Text>
            </View>

            <View style={styles.actionStack}>
              <PressableScale style={styles.actionButtonPrimary} onPress={() => { void openAccessibilitySettings(); }}>
                <Text style={styles.actionButtonPrimaryText}>Abrir acessibilidade</Text>
              </PressableScale>
              <PressableScale style={styles.actionButtonSecondary} onPress={() => { void loadStatuses(); }}>
                <Text style={styles.actionButtonSecondaryText}>Ja ativei, verificar</Text>
              </PressableScale>
            </View>
          </>
        );

      case 'notifications':
        return (
          <>
            <Text style={styles.eyebrow}>Passo {isAndroid ? '2' : '1'} de {steps.length - 1}</Text>
            <Text style={styles.title}>Permita as notificacoes do timer.</Text>
            <Text style={styles.description}>
              Elas avisam quando o foco, pausa ou recompensa terminam. Sem isso, fica facil perder a troca de ciclo.
            </Text>

            <View style={styles.statusRow}>
              {renderStatusPill(notificationGranted ? 'Notificacoes liberadas' : 'Ainda pendente', notificationGranted ? 'good' : 'neutral')}
            </View>

            {!notificationGranted ? (
              <>
                <View style={styles.calloutCard}>
                  <BellRing color={theme.colors.accent} size={18} />
                  <Text style={styles.calloutText}>
                    O Android vai mostrar um popup do sistema assim que voce tocar no botao abaixo.
                  </Text>
                </View>

                <View style={styles.actionStack}>
                  <PressableScale
                    style={styles.actionButtonPrimary}
                    onPress={() => {
                      void handleRequestNotifications();
                    }}
                    disabled={notificationLoading}
                  >
                    {notificationLoading ? (
                      <ActivityIndicator color={theme.colors.accentDark} />
                    ) : (
                      <Text style={styles.actionButtonPrimaryText}>Permitir notificacoes</Text>
                    )}
                  </PressableScale>
                </View>
              </>
            ) : (
              <View style={styles.calloutCard}>
                <CheckCircle2 color={theme.colors.accent} size={18} />
                <Text style={styles.calloutText}>
                  Perfeito. Seus ciclos ja podem disparar alertas sonoros e notificacoes locais.
                </Text>
              </View>
            )}
          </>
        );

      case 'battery':
        return (
          <>
            <Text style={styles.eyebrow}>Passo 3 de {steps.length - 1}</Text>
            <Text style={styles.title}>Reduza as restricoes do Android.</Text>
            <Text style={styles.description}>
              Alguns aparelhos matam o bloqueador em segundo plano. Esta etapa ajuda o VTX a continuar ativo durante o foco.
            </Text>

            <View style={styles.statusRow}>
              {renderStatusPill(
                batteryOptimizationsReleased ? 'Bateria sem restricoes' : 'Recomendado liberar bateria',
                batteryOptimizationsReleased ? 'good' : 'neutral'
              )}
              {isXiaomiFamily ? renderStatusPill('Dica especial para Xiaomi', 'warn') : null}
            </View>

            <View style={styles.actionStack}>
              <PressableScale style={styles.actionButtonPrimary} onPress={() => { void openBatteryOptimizationSettings(); }}>
                <Text style={styles.actionButtonPrimaryText}>Abrir bateria</Text>
              </PressableScale>
              <PressableScale style={styles.actionButtonSecondary} onPress={() => { void openAppDetailsSettings(); }}>
                <Text style={styles.actionButtonSecondaryText}>Permissoes do app</Text>
              </PressableScale>
            </View>

            <View style={styles.tipCard}>
              <Smartphone color={theme.colors.accent} size={18} />
              <Text style={styles.tipText}>
                {isXiaomiFamily
                  ? 'No Xiaomi/Redmi/Poco, procure tambem por Autostart, pop-up em segundo plano e bateria em Sem restricoes.'
                  : 'Se o bloqueador parar sozinho, revise bateria, pop-ups em segundo plano e permissoes do app.'}
              </Text>
            </View>
          </>
        );

      case 'done':
        return (
          <>
            <Text style={styles.eyebrow}>Tudo pronto</Text>
            <Text style={styles.title}>Agora sim o VTX esta armado para te proteger.</Text>
            <Text style={styles.description}>
              Voce pode revisar tudo depois em Configuracoes, mas o principal ja foi explicado e ativado.
            </Text>

            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Acessibilidade</Text>
                <Text style={styles.summaryValue}>{accessibilityEnabled ? 'Ativa' : 'Pendente'}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Notificacoes</Text>
                <Text style={styles.summaryValue}>{notificationGranted ? 'Liberadas' : 'Pendente'}</Text>
              </View>
              {isAndroid ? (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Bateria</Text>
                  <Text style={styles.summaryValue}>{batteryOptimizationsReleased ? 'Sem restricoes' : 'Revisar depois'}</Text>
                </View>
              ) : null}
            </View>
          </>
        );
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: scrollBottomPadding }]} bounces={false}>
        <View style={styles.progressRow}>
          {steps.map((step, index) => (
            <View
              key={step}
              style={[
                styles.progressDot,
                index === currentStepIndex && styles.progressDotActive,
                index < currentStepIndex && styles.progressDotDone,
              ]}
            />
          ))}
        </View>

        <View style={styles.card}>
          {statusLoading ? (
            <View style={styles.loadingState}>
              <ActivityIndicator color={theme.colors.accent} />
              <Text style={styles.loadingText}>Carregando o status do aparelho...</Text>
            </View>
          ) : (
            renderStepContent()
          )}
        </View>
      </ScrollView>

      <View style={[styles.footer, { bottom: footerBottomInset }]}>
        <PressableScale
          style={[styles.footerButtonSecondary, currentStepIndex === 0 && styles.footerButtonHidden]}
          onPress={goBack}
          disabled={currentStepIndex === 0 || finishing}
        >
          <View style={styles.footerButtonRow}>
            <ArrowLeft color={theme.colors.text} size={16} />
            <Text style={styles.footerButtonSecondaryText}>Voltar</Text>
          </View>
        </PressableScale>

        <PressableScale
          style={[styles.footerButtonPrimary, primaryDisabled && styles.footerButtonPrimaryDisabled]}
          onPress={() => {
            void handlePrimaryPress();
          }}
          disabled={primaryDisabled}
        >
          <View style={styles.footerButtonRow}>
            {notificationLoading || finishing ? (
              <ActivityIndicator color={theme.colors.accentDark} />
            ) : (
              <>
                <Text style={styles.footerButtonPrimaryText}>{primaryLabel}</Text>
                <ArrowRight color={theme.colors.accentDark} size={16} />
              </>
            )}
          </View>
        </PressableScale>
      </View>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.bg,
    },
    glowTop: {
      position: 'absolute',
      top: -180,
      left: -120,
      width: 300,
      height: 300,
      borderRadius: 150,
      backgroundColor: theme.colors.glowPrimary,
    },
    glowBottom: {
      position: 'absolute',
      bottom: -200,
      right: -120,
      width: 340,
      height: 340,
      borderRadius: 170,
      backgroundColor: theme.colors.glowSecondary,
    },
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: 20,
      paddingTop: 70,
      paddingBottom: 140,
    },
    progressRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 18,
    },
    progressDot: {
      flex: 1,
      height: 6,
      borderRadius: 999,
      backgroundColor: theme.colors.surfaceSoftStrong,
    },
    progressDotActive: {
      backgroundColor: theme.colors.accent,
    },
    progressDotDone: {
      backgroundColor: theme.colors.glowPrimary,
    },
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.xl,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: 22,
      gap: 18,
      ...theme.shadow.card,
    },
    eyebrow: {
      color: theme.colors.accent,
      fontSize: 12,
      fontWeight: '800',
      letterSpacing: 0.6,
      textTransform: 'uppercase',
    },
    title: {
      color: theme.colors.text,
      fontSize: 29,
      fontWeight: '800',
      lineHeight: 34,
      marginTop: 10,
    },
    description: {
      color: theme.colors.textDim,
      fontSize: 15,
      lineHeight: 23,
      marginTop: 12,
    },
    featureList: {
      gap: 12,
      marginTop: 22,
    },
    featureCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: theme.colors.surfaceSoft,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingHorizontal: 14,
      paddingVertical: 14,
    },
    featureText: {
      flex: 1,
      color: theme.colors.text,
      fontSize: 14,
      fontWeight: '700',
      lineHeight: 20,
    },
    statusRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 22,
    },
    statusPill: {
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderWidth: 1,
    },
    statusPillGood: {
      backgroundColor: 'rgba(34, 197, 94, 0.12)',
      borderColor: 'rgba(34, 197, 94, 0.3)',
    },
    statusPillWarn: {
      backgroundColor: 'rgba(239, 68, 68, 0.12)',
      borderColor: 'rgba(239, 68, 68, 0.3)',
    },
    statusPillNeutral: {
      backgroundColor: theme.colors.surfaceSoft,
      borderColor: theme.colors.border,
    },
    statusPillText: {
      color: theme.colors.text,
      fontSize: 12,
      fontWeight: '700',
    },
    calloutCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      backgroundColor: theme.colors.surfaceSoft,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingHorizontal: 14,
      paddingVertical: 14,
      marginTop: 18,
    },
    calloutText: {
      flex: 1,
      color: theme.colors.text,
      fontSize: 13,
      lineHeight: 20,
    },
    actionStack: {
      gap: 10,
      marginTop: 18,
    },
    actionButtonPrimary: {
      backgroundColor: theme.colors.accent,
      borderRadius: theme.radius.md,
      paddingVertical: 15,
      alignItems: 'center',
      justifyContent: 'center',
      ...theme.shadow.accent,
    },
    actionButtonPrimaryText: {
      color: theme.colors.accentDark,
      fontSize: 14,
      fontWeight: '800',
    },
    actionButtonSecondary: {
      backgroundColor: theme.colors.surfaceSoft,
      borderRadius: theme.radius.md,
      paddingVertical: 15,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    actionButtonSecondaryText: {
      color: theme.colors.text,
      fontSize: 14,
      fontWeight: '700',
    },
    tipCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      marginTop: 16,
      paddingHorizontal: 14,
      paddingVertical: 14,
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.surfaceSoft,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    tipText: {
      flex: 1,
      color: theme.colors.text,
      fontSize: 13,
      lineHeight: 20,
    },
    summaryCard: {
      marginTop: 24,
      gap: 12,
      backgroundColor: theme.colors.surfaceSoft,
      borderRadius: theme.radius.lg,
      padding: 18,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    summaryRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    summaryLabel: {
      color: theme.colors.textDim,
      fontSize: 13,
      fontWeight: '600',
    },
    summaryValue: {
      color: theme.colors.text,
      fontSize: 13,
      fontWeight: '800',
    },
    loadingState: {
      minHeight: 320,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
    },
    loadingText: {
      color: theme.colors.textMuted,
      fontSize: 14,
      textAlign: 'center',
    },
    footer: {
      position: 'absolute',
      left: 16,
      right: 16,
      bottom: 18,
      flexDirection: 'row',
      gap: 12,
    },
    footerButtonPrimary: {
      flex: 1.5,
      backgroundColor: theme.colors.accent,
      borderRadius: theme.radius.lg,
      paddingVertical: 16,
      paddingHorizontal: 16,
      ...theme.shadow.accent,
    },
    footerButtonPrimaryDisabled: {
      opacity: 0.5,
    },
    footerButtonSecondary: {
      flex: 1,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      paddingVertical: 16,
      paddingHorizontal: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    footerButtonHidden: {
      opacity: 0.35,
    },
    footerButtonRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    footerButtonPrimaryText: {
      color: theme.colors.accentDark,
      fontSize: 14,
      fontWeight: '800',
    },
    footerButtonSecondaryText: {
      color: theme.colors.text,
      fontSize: 14,
      fontWeight: '700',
    },
  });
