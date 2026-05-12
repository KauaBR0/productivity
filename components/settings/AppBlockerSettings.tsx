import React, { useState, useMemo } from 'react';
import { View, Text, TextInput, ActivityIndicator, Platform, AppState, Pressable, Alert } from 'react-native';
import { useSettings } from '@/context/SettingsContext';
import { Shield, ShieldCheck, Search, Check, TriangleAlert, Lock, LockOpen, TimerReset } from 'lucide-react-native';
import {
  enableTotalFocus,
  getBlockerDiagnostics,
  getInstalledApps,
  isAccessibilityEnabled,
  isAppBlockerAvailable,
  openAccessibilitySettings,
  openAppDetailsSettings,
  openBatteryOptimizationSettings,
  InstalledApp,
  BlockerDiagnostics,
} from '@/services/AppBlockerService';
import { PressableScale } from '@/components/PressableScale';
import { Theme } from '@/constants/theme';
import Toast from 'react-native-toast-message';

interface AppBlockerSettingsProps {
  styles: any;
  theme: Theme;
}

const APP_UNLOCK_WAIT_SECONDS = 7 * 60;
const TOTAL_FOCUS_OPTIONS = [
  { hours: 24, label: '24 horas', detail: '1 dia inteiro' },
  { hours: 48, label: '48 horas', detail: '2 dias seguidos' },
  { hours: 72, label: '72 horas', detail: '3 dias seguidos' },
  { hours: 168, label: '7 dias', detail: 'Modo extremo' },
] as const;

export const AppBlockerSettings: React.FC<AppBlockerSettingsProps> = ({ styles, theme }) => {
  const { blockedApps, setBlockedApps } = useSettings();
  const blockerAvailable = isAppBlockerAvailable();
  const [accessibilityEnabled, setAccessibilityEnabled] = useState(false);
  const [installedApps, setInstalledApps] = useState<InstalledApp[]>([]);
  const [appsLoading, setAppsLoading] = useState(false);
  const [appsError, setAppsError] = useState<string | null>(null);
  const [appSearch, setAppSearch] = useState('');
  const [diagnostics, setDiagnostics] = useState<BlockerDiagnostics | null>(null);
  const [diagnosticsLoading, setDiagnosticsLoading] = useState(false);
  const [diagnosticsError, setDiagnosticsError] = useState<string | null>(null);
  const [unlockPhase, setUnlockPhase] = useState<'locked' | 'counting' | 'unlocked'>('locked');
  const [unlockStartedAt, setUnlockStartedAt] = useState<number | null>(null);
  const [unlockSecondsLeft, setUnlockSecondsLeft] = useState(APP_UNLOCK_WAIT_SECONDS);
  const [totalFocusActionHours, setTotalFocusActionHours] = useState<number | null>(null);
  const [totalFocusNow, setTotalFocusNow] = useState(Date.now());

  const resetUnlockState = React.useCallback(() => {
    setUnlockPhase('locked');
    setUnlockStartedAt(null);
    setUnlockSecondsLeft(APP_UNLOCK_WAIT_SECONDS);
  }, []);

  const loadDiagnostics = async () => {
    try {
      setDiagnosticsLoading(true);
      setDiagnosticsError(null);
      const [enabled, nextDiagnostics] = await Promise.all([
        isAccessibilityEnabled(),
        getBlockerDiagnostics(),
      ]);
      setAccessibilityEnabled(Boolean(enabled));
      setDiagnostics(nextDiagnostics);
    } catch {
      setDiagnosticsError('Nao foi possivel carregar o diagnostico do bloqueador.');
    } finally {
      setDiagnosticsLoading(false);
    }
  };

  React.useEffect(() => {
    if (Platform.OS !== 'android') return;
    if (!blockerAvailable) return;
    void loadDiagnostics();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void loadDiagnostics();
      } else {
        resetUnlockState();
      }
    });
    return () => subscription.remove();
  }, [blockerAvailable, resetUnlockState]);

  React.useEffect(() => {
    if (unlockPhase !== 'counting' || !unlockStartedAt) return;

    const updateCountdown = () => {
      const elapsed = Math.floor((Date.now() - unlockStartedAt) / 1000);
      const remaining = Math.max(0, APP_UNLOCK_WAIT_SECONDS - elapsed);
      setUnlockSecondsLeft(remaining);

      if (remaining === 0) {
        setUnlockPhase('unlocked');
        setUnlockStartedAt(null);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [unlockPhase, unlockStartedAt]);

  React.useEffect(() => {
    if (!diagnostics?.totalFocusActive || !diagnostics.totalFocusEndAt) return;

    const syncClock = () => {
      const now = Date.now();
      setTotalFocusNow(now);

      if (now >= diagnostics.totalFocusEndAt) {
        void loadDiagnostics();
      }
    };

    syncClock();
    const interval = setInterval(syncClock, 1000);
    return () => clearInterval(interval);
  }, [diagnostics?.totalFocusActive, diagnostics?.totalFocusEndAt]);

  React.useEffect(() => {
    if (Platform.OS !== 'android') return;
    if (!blockerAvailable) return;
    let isMounted = true;
    const loadApps = async () => {
      setAppsLoading(true);
      setAppsError(null);
      try {
        const apps = await getInstalledApps();
        if (!isMounted) return;
        setInstalledApps(apps);
      } catch {
        if (!isMounted) return;
        setAppsError('Não foi possível carregar os apps.');
      } finally {
        if (isMounted) setAppsLoading(false);
      }
    };
    void loadApps();
    return () => {
      isMounted = false;
    };
  }, [blockerAvailable]);

  const blockedSet = useMemo(() => new Set(blockedApps), [blockedApps]);

  const filteredApps = useMemo(() => {
    const query = appSearch.trim().toLowerCase();
    if (!query) return installedApps;
    return installedApps.filter((app) => {
      return (
        app.label.toLowerCase().includes(query) ||
        app.packageName.toLowerCase().includes(query)
      );
    });
  }, [installedApps, appSearch]);

  const visibleApps = useMemo(() => filteredApps.slice(0, 80), [filteredApps]);

  const groupedApps = useMemo(() => {
    const groups: Record<string, typeof installedApps> = {};
    visibleApps.forEach(app => {
      const cat = app.category || 'Outros';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(app);
    });
    
    // Priority categories
    const priority = ['Redes Sociais', 'Jogos', 'Música & Áudio', 'Vídeo'];
    
    return Object.keys(groups).sort((a, b) => {
        const idxA = priority.indexOf(a);
        const idxB = priority.indexOf(b);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        if (a === 'Outros') return 1; // Outros at bottom
        if (b === 'Outros') return -1;
        return a.localeCompare(b);
    }).map(key => ({ title: key, data: groups[key] }));
  }, [visibleApps]);

  const blockedAppDetails = useMemo(() => {
    const appMap = new Map(installedApps.map((app) => [app.packageName, app]));
    return blockedApps.map((packageName) => {
      const app = appMap.get(packageName);
      return {
        packageName,
        label: app?.label || packageName,
      };
    });
  }, [blockedApps, installedApps]);

  const formatDiagnosticTime = (timestamp: number) => {
    if (!timestamp) return 'Ainda nao registrado';
    return new Date(timestamp).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const manufacturerName = diagnostics?.manufacturer || diagnostics?.brand || '';
  const canRemoveBlockedApps = unlockPhase === 'unlocked';
  const totalFocusRemainingMs = diagnostics?.totalFocusActive
    ? Math.max(0, (diagnostics.totalFocusEndAt || 0) - totalFocusNow)
    : 0;
  const isXiaomiFamily = useMemo(() => {
    const vendor = manufacturerName.toLowerCase();
    return vendor.includes('xiaomi') || vendor.includes('redmi') || vendor.includes('poco');
  }, [manufacturerName]);

  const diagnosisText = useMemo(() => {
    if (!diagnostics) return 'Abra esta tela no aparelho afetado para coletar sinais do bloqueador.';
    if (!diagnostics.accessibilityEnabled) {
      return 'A acessibilidade esta desligada ou o servico nao foi reconhecido pelo sistema.';
    }
    if (!diagnostics.ignoringBatteryOptimizations) {
      return 'O Android ainda pode restringir o servico em segundo plano por bateria.';
    }
    if (diagnostics.lastAttemptTime > 0 && diagnostics.lastBlockScreenError) {
      return 'O app interceptou tentativas, mas houve falha ao abrir a tela de bloqueio.';
    }
    if (diagnostics.lastEventTime === 0) {
      return 'Ainda nao ha eventos recentes; tente abrir um app bloqueado para validar o fluxo.';
    }
    return 'O servico parece ativo. Se falhar no Xiaomi, o mais provavel e bloqueio de bateria ou launch em segundo plano.';
  }, [diagnostics]);

  const unlockStatusText = useMemo(() => {
    if (blockedApps.length === 0) {
      return 'Nenhum app bloqueado no momento. Marque apps abaixo para adiciona-los a lista.';
    }
    if (unlockPhase === 'unlocked') {
      return 'Desbloqueio liberado nesta sessao. Agora voce pode desmarcar os apps bloqueados abaixo.';
    }
    if (unlockPhase === 'counting') {
      return 'Mantenha o VTX aberto ate o fim da contagem para liberar a remocao dos apps bloqueados.';
    }
    return 'Para remover apps da lista, e obrigatorio aguardar 7 minutos com o app aberto.';
  }, [blockedApps.length, unlockPhase]);

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatLongCountdown = (milliseconds: number) => {
    if (milliseconds <= 0) return '00h 00m';

    const totalSeconds = Math.floor(milliseconds / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);

    if (days > 0) {
      return `${days}d ${hours.toString().padStart(2, '0')}h`;
    }

    return `${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m`;
  };

  const startUnlockCountdown = () => {
    setUnlockPhase('counting');
    setUnlockStartedAt(Date.now());
    setUnlockSecondsLeft(APP_UNLOCK_WAIT_SECONDS);
  };

  const handleEnableTotalFocus = (hours: number, label: string) => {
    Alert.alert(
      'Ativar foco total?',
      `Quase todos os apps instalados ficarao bloqueados por ${label.toLowerCase()}. O launcher principal continua liberado para evitar travar o aparelho.`,
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: diagnostics?.totalFocusActive ? 'Adicionar tempo' : 'Ativar agora',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                setTotalFocusActionHours(hours);
                const result = await enableTotalFocus(hours);
                await loadDiagnostics();
                Toast.show({
                  type: 'success',
                  text1: diagnostics?.totalFocusActive ? 'Foco total estendido' : 'Foco total ativado',
                  text2: `${result.blockedAppsCount} apps protegidos ate ${formatDiagnosticTime(result.endAt)}.`,
                });
              } catch (error: any) {
                Toast.show({
                  type: 'error',
                  text1: 'Nao foi possivel ativar o foco total',
                  text2: error?.message || 'Tente novamente em instantes.',
                });
              } finally {
                setTotalFocusActionHours(null);
              }
            })();
          },
        },
      ]
    );
  };

  const toggleBlockedApp = (packageName: string) => {
    const next = new Set(blockedSet);
    if (next.has(packageName)) {
      if (!canRemoveBlockedApps) return;
      next.delete(packageName);
    } else {
      next.add(packageName);
    }
    setBlockedApps(Array.from(next));
  };

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Bloqueio de apps</Text>
      <Text style={styles.sectionSubtitle}>Selecione apps para bloquear durante o foco</Text>

      {Platform.OS !== 'android' ? (
        <View style={styles.blockerDisabledCard}>
          <Text style={styles.blockerDisabledText}>Disponível apenas no Android.</Text>
        </View>
      ) : !blockerAvailable ? (
        <View style={styles.blockerDisabledCard}>
          <Text style={styles.blockerDisabledText}>
            Bloqueio nativo indisponível neste APK. Reinstale um build que
            inclua o módulo de bloqueio.
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.blockerStatusCard}>
            <View style={styles.blockerStatusLeft}>
              {accessibilityEnabled ? (
                <ShieldCheck color={theme.colors.accent} size={20} />
              ) : (
                <Shield color={theme.colors.textMuted} size={20} />
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.blockerStatusTitle}>
                  {accessibilityEnabled ? 'Acessibilidade ativa' : 'Acessibilidade desativada'}
                </Text>
                <Text style={styles.blockerStatusSubtitle}>
                  Necessário para bloquear apps durante o foco.
                </Text>
              </View>
            </View>
            <PressableScale
              style={styles.blockerStatusButton}
              onPress={() => { void openAccessibilitySettings(); }}
            >
              <Text style={styles.blockerStatusButtonText}>
                {accessibilityEnabled ? 'Gerenciar' : 'Ativar'}
              </Text>
            </PressableScale>
          </View>

          <View style={styles.totalFocusCard}>
            <View style={styles.totalFocusHeader}>
              <View style={styles.totalFocusTitleWrap}>
                <Text style={styles.blockerDiagnosticsTitle}>Foco total</Text>
                <Text style={styles.blockerDiagnosticsSubtitle}>
                  Bloqueia quase todos os apps instalados e adiciona friccao extra contra desinstalacao.
                </Text>
              </View>
              <View style={[
                styles.totalFocusBadge,
                diagnostics?.totalFocusActive ? styles.totalFocusBadgeActive : styles.totalFocusBadgeIdle,
              ]}>
                <Text style={styles.totalFocusBadgeText}>
                  {diagnostics?.totalFocusActive ? 'ATIVO' : 'PRONTO'}
                </Text>
              </View>
            </View>

            <Text style={styles.blockerDiagnosticSummary}>
              {diagnostics?.totalFocusActive
                ? `Todos os apps selecionaveis ficam bloqueados ate ${formatDiagnosticTime(diagnostics.totalFocusEndAt)}.`
                : 'Use quando quiser travar o celular inteiro para uma janela longa de foco.'}
            </Text>

            <View style={styles.blockerWarningBanner}>
              <TriangleAlert color={theme.colors.accent} size={16} />
              <Text style={styles.blockerWarningText}>
                Durante o foco total, o app tambem tenta barrar Configuracoes, Play Store e instaladores para dificultar a desinstalacao em aparelhos comuns.
              </Text>
            </View>

            <View style={styles.totalFocusStatusRow}>
              <Text style={styles.blockerDiagnosticFact}>
                Cobertura atual: {diagnostics?.totalFocusBlocklistSize || 0} apps
              </Text>
              <Text style={styles.totalFocusTimerText}>
                {diagnostics?.totalFocusActive ? formatLongCountdown(totalFocusRemainingMs) : '00h 00m'}
              </Text>
            </View>

            {!accessibilityEnabled ? (
              <View style={styles.blockerWarningBanner}>
                <TriangleAlert color={theme.colors.accent} size={16} />
                <Text style={styles.blockerWarningText}>
                  Ative a acessibilidade antes de ligar o foco total.
                </Text>
              </View>
            ) : null}

            <View style={styles.totalFocusOptionGrid}>
              {TOTAL_FOCUS_OPTIONS.map((option) => {
                const loading = totalFocusActionHours === option.hours;
                return (
                  <PressableScale
                    key={option.hours}
                    style={[
                      styles.totalFocusOptionButton,
                      (!accessibilityEnabled || loading) && styles.totalFocusOptionButtonDisabled,
                    ]}
                    onPress={() => handleEnableTotalFocus(option.hours, option.label)}
                    disabled={!accessibilityEnabled || loading}
                  >
                    {loading ? (
                      <ActivityIndicator color={theme.colors.accent} />
                    ) : (
                      <>
                        <Text style={styles.totalFocusOptionLabel}>
                          {diagnostics?.totalFocusActive ? `+${option.label}` : option.label}
                        </Text>
                        <Text style={styles.totalFocusOptionDetail}>{option.detail}</Text>
                      </>
                    )}
                  </PressableScale>
                );
              })}
            </View>
          </View>

          <View style={styles.blockerDiagnosticsCard}>
            <View style={styles.blockerDiagnosticsHeader}>
              <View style={styles.blockerDiagnosticsTitleWrap}>
                <Text style={styles.blockerDiagnosticsTitle}>Diagnostico do bloqueador</Text>
                <Text style={styles.blockerDiagnosticsSubtitle}>
                  {diagnostics?.model ? `${manufacturerName} ${diagnostics.model}`.trim() : 'Android'}
                </Text>
              </View>
              <PressableScale
                style={styles.blockerSecondaryButton}
                onPress={() => {
                  void loadDiagnostics();
                }}
              >
                <Text style={styles.blockerSecondaryButtonText}>Atualizar</Text>
              </PressableScale>
            </View>

            {diagnosticsLoading ? (
              <View style={styles.blockerLoading}>
                <ActivityIndicator color={theme.colors.accent} />
                <Text style={styles.blockerHint}>Coletando sinais do bloqueador...</Text>
              </View>
            ) : diagnosticsError ? (
              <Text style={styles.blockerError}>{diagnosticsError}</Text>
            ) : (
              <>
                <View style={styles.blockerDiagnosticChips}>
                  <View style={[styles.blockerDiagnosticChip, accessibilityEnabled ? styles.blockerDiagnosticChipGood : styles.blockerDiagnosticChipWarn]}>
                    <Text style={styles.blockerDiagnosticChipText}>
                      {accessibilityEnabled ? 'Acessibilidade OK' : 'Acessibilidade OFF'}
                    </Text>
                  </View>
                  <View style={[styles.blockerDiagnosticChip, diagnostics?.ignoringBatteryOptimizations ? styles.blockerDiagnosticChipGood : styles.blockerDiagnosticChipWarn]}>
                    <Text style={styles.blockerDiagnosticChipText}>
                      {diagnostics?.ignoringBatteryOptimizations ? 'Bateria livre' : 'Bateria restrita'}
                    </Text>
                  </View>
                  <View style={[styles.blockerDiagnosticChip, diagnostics?.sessionActive ? styles.blockerDiagnosticChipGood : styles.blockerDiagnosticChipNeutral]}>
                    <Text style={styles.blockerDiagnosticChipText}>
                      {diagnostics?.sessionActive ? 'Sessao ativa' : 'Sessao inativa'}
                    </Text>
                  </View>
                  <View style={[styles.blockerDiagnosticChip, diagnostics?.totalFocusActive ? styles.blockerDiagnosticChipGood : styles.blockerDiagnosticChipNeutral]}>
                    <Text style={styles.blockerDiagnosticChipText}>
                      {diagnostics?.totalFocusActive ? 'Foco total ON' : 'Foco total OFF'}
                    </Text>
                  </View>
                </View>

                <Text style={styles.blockerDiagnosticSummary}>{diagnosisText}</Text>

                <View style={styles.blockerDiagnosticFacts}>
                  <Text style={styles.blockerDiagnosticFact}>Servico conectado: {formatDiagnosticTime(diagnostics?.serviceConnectedAt || 0)}</Text>
                  <Text style={styles.blockerDiagnosticFact}>Ultimo evento: {diagnostics?.lastEventPackage || 'Nenhum'} {diagnostics?.lastEventTime ? `(${formatDiagnosticTime(diagnostics.lastEventTime)})` : ''}</Text>
                  <Text style={styles.blockerDiagnosticFact}>Ultima tentativa bloqueada: {diagnostics?.lastAttemptPackage || 'Nenhuma'} {diagnostics?.lastAttemptTime ? `(${formatDiagnosticTime(diagnostics.lastAttemptTime)})` : ''}</Text>
                  <Text style={styles.blockerDiagnosticFact}>Apps selecionados: {diagnostics?.blocklistSize || 0}</Text>
                  <Text style={styles.blockerDiagnosticFact}>Foco total: {diagnostics?.totalFocusActive ? `ate ${formatDiagnosticTime(diagnostics.totalFocusEndAt)}` : 'desligado'}</Text>
                </View>

                {diagnostics?.lastBlockScreenError ? (
                  <View style={styles.blockerWarningBanner}>
                    <TriangleAlert color={theme.colors.danger} size={16} />
                    <Text style={styles.blockerWarningText}>
                      Falha recente ao abrir a tela de bloqueio: {diagnostics.lastBlockScreenError}
                    </Text>
                  </View>
                ) : null}

                {isXiaomiFamily ? (
                  <View style={styles.blockerWarningBanner}>
                    <TriangleAlert color={theme.colors.accent} size={16} />
                    <Text style={styles.blockerWarningText}>
                      Xiaomi/Redmi/Poco costuma exigir Autostart, bateria sem restricoes e revisao manual das permissoes apos reiniciar.
                    </Text>
                  </View>
                ) : null}

                <View style={styles.blockerActionRow}>
                  <PressableScale
                    style={styles.blockerSecondaryButton}
                    onPress={() => {
                      void openBatteryOptimizationSettings();
                    }}
                  >
                    <Text style={styles.blockerSecondaryButtonText}>Bateria</Text>
                  </PressableScale>
                  <PressableScale
                    style={styles.blockerSecondaryButton}
                    onPress={() => {
                      void openAppDetailsSettings();
                    }}
                  >
                    <Text style={styles.blockerSecondaryButtonText}>Permissoes</Text>
                  </PressableScale>
                </View>
              </>
            )}
          </View>

          <View style={styles.blockerUnlockCard}>
            <View style={styles.blockerUnlockHeader}>
              <View style={styles.blockerUnlockTitleWrap}>
                <Text style={styles.blockerDiagnosticsTitle}>Gerenciar apps bloqueados</Text>
                <Text style={styles.blockerDiagnosticsSubtitle}>
                  Adicionar e imediato. Remover exige 7 minutos com o app aberto.
                </Text>
              </View>
              <View style={styles.blockerUnlockIconWrap}>
                {unlockPhase === 'unlocked' ? (
                  <LockOpen color={theme.colors.accent} size={18} />
                ) : unlockPhase === 'counting' ? (
                  <TimerReset color={theme.colors.accent} size={18} />
                ) : (
                  <Lock color={theme.colors.textMuted} size={18} />
                )}
              </View>
            </View>

            <Text style={styles.blockerDiagnosticSummary}>{unlockStatusText}</Text>

            {blockedAppDetails.length > 0 ? (
              <View style={styles.blockerBlockedChips}>
                {blockedAppDetails.map((app) => (
                  <View key={app.packageName} style={styles.blockerBlockedChip}>
                    <Text style={styles.blockerBlockedChipText}>{app.label}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            <View style={styles.blockerUnlockMetaRow}>
              <Text style={styles.blockerDiagnosticFact}>Apps bloqueados: {blockedApps.length}</Text>
              <Text style={styles.blockerUnlockTimerText}>
                {unlockPhase === 'counting'
                  ? formatCountdown(unlockSecondsLeft)
                  : unlockPhase === 'unlocked'
                    ? 'Liberado'
                    : '07:00'}
              </Text>
            </View>

            {!canRemoveBlockedApps && blockedApps.length > 0 ? (
              <PressableScale
                style={styles.blockerStatusButton}
                onPress={unlockPhase === 'counting' ? resetUnlockState : startUnlockCountdown}
              >
                <Text style={styles.blockerStatusButtonText}>
                  {unlockPhase === 'counting' ? 'Cancelar contagem' : 'Iniciar espera de 7 min'}
                </Text>
              </PressableScale>
            ) : canRemoveBlockedApps ? (
              <PressableScale style={styles.blockerSecondaryButton} onPress={resetUnlockState}>
                <Text style={styles.blockerSecondaryButtonText}>Bloquear remocao novamente</Text>
              </PressableScale>
            ) : null}
          </View>

          <View style={styles.blockerSearchRow}>
            <Search color={theme.colors.textMuted} size={16} />
            <TextInput
              style={styles.blockerSearchInput}
              placeholder="Buscar apps..."
              placeholderTextColor={theme.colors.textMuted}
              value={appSearch}
              onChangeText={setAppSearch}
            />
            <Text style={styles.blockerCount}>{blockedApps.length} selecionados</Text>
          </View>

          <View style={styles.blockerAppsList}>
            {appsLoading ? (
              <View style={styles.blockerLoading}>
                <ActivityIndicator color={theme.colors.accent} />
                <Text style={styles.blockerHint}>Carregando apps...</Text>
              </View>
            ) : appsError ? (
              <Text style={styles.blockerError}>{appsError}</Text>
            ) : (
              <>
                {groupedApps.map((group) => (
                  <View key={group.title} style={styles.categoryGroup}>
                    <Text style={styles.categoryHeader}>{group.title}</Text>
                    {group.data.map((app) => {
                      const selected = blockedSet.has(app.packageName);
                      const rowLocked = selected && !canRemoveBlockedApps;
                      return (
                        <Pressable
                          key={app.packageName}
                          onPress={() => toggleBlockedApp(app.packageName)}
                          disabled={rowLocked}
                          style={[
                            styles.blockerAppRow,
                            selected && styles.blockerAppRowActive,
                            rowLocked && styles.blockerAppRowLocked,
                          ]}
                        >
                          <View style={styles.blockerAppInfo}>
                            <Text style={styles.blockerAppName}>{app.label}</Text>
                            <Text style={styles.blockerAppPackage}>{app.packageName}</Text>
                          </View>
                          <View style={[styles.blockerCheck, selected && styles.blockerCheckActive]}>
                            {selected ? (
                              rowLocked ? (
                                <Lock color={theme.colors.accentDark} size={12} />
                              ) : (
                                <Check color={theme.colors.accentDark} size={14} />
                              )
                            ) : null}
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                ))}
                {filteredApps.length === 0 && (
                  <Text style={styles.blockerEmptyText}>Nenhum app encontrado.</Text>
                )}
                {filteredApps.length > visibleApps.length && (
                  <Text style={styles.blockerHint}>
                    Mostrando {visibleApps.length} de {filteredApps.length}. Refine sua busca.
                  </Text>
                )}
                {blockedApps.length > 0 && !canRemoveBlockedApps && (
                  <Text style={styles.blockerHint}>
                    Apps ja bloqueados ficam travados ate o fim da espera de 7 minutos.
                  </Text>
                )}
              </>
            )}
          </View>
        </>
      )}
    </View>
  );
};
