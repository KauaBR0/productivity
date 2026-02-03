import React, { useState, useMemo } from 'react';
import { View, Text, TextInput, ActivityIndicator, Platform, AppState, Pressable } from 'react-native';
import { useSettings } from '@/context/SettingsContext';
import { Shield, ShieldCheck, Search, Check } from 'lucide-react-native';
import { getInstalledApps, isAccessibilityEnabled, isAppBlockerAvailable, openAccessibilitySettings, InstalledApp } from '@/services/AppBlockerService';
import { PressableScale } from '@/components/PressableScale';
import { Theme } from '@/constants/theme';

interface AppBlockerSettingsProps {
  styles: any;
  theme: Theme;
}

export const AppBlockerSettings: React.FC<AppBlockerSettingsProps> = ({ styles, theme }) => {
  const { blockedApps, setBlockedApps } = useSettings();
  const blockerAvailable = isAppBlockerAvailable();
  const [accessibilityEnabled, setAccessibilityEnabled] = useState(false);
  const [installedApps, setInstalledApps] = useState<InstalledApp[]>([]);
  const [appsLoading, setAppsLoading] = useState(false);
  const [appsError, setAppsError] = useState<string | null>(null);
  const [appSearch, setAppSearch] = useState('');

  const checkAccessibility = async () => {
    try {
      const enabled = await isAccessibilityEnabled();
      setAccessibilityEnabled(Boolean(enabled));
    } catch {
      setAccessibilityEnabled(false);
    }
  };

  React.useEffect(() => {
    if (Platform.OS !== 'android') return;
    if (!blockerAvailable) return;
    void checkAccessibility();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void checkAccessibility();
      }
    });
    return () => subscription.remove();
  }, [blockerAvailable]);

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

  const toggleBlockedApp = (packageName: string) => {
    const next = new Set(blockedSet);
    if (next.has(packageName)) {
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
                      return (
                        <Pressable
                          key={app.packageName}
                          onPress={() => toggleBlockedApp(app.packageName)}
                          style={[styles.blockerAppRow, selected && styles.blockerAppRowActive]}
                        >
                          <View style={styles.blockerAppInfo}>
                            <Text style={styles.blockerAppName}>{app.label}</Text>
                            <Text style={styles.blockerAppPackage}>{app.packageName}</Text>
                          </View>
                          <View style={[styles.blockerCheck, selected && styles.blockerCheckActive]}>
                            {selected && <Check color={theme.colors.accentDark} size={14} />}
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
              </>
            )}
          </View>
        </>
      )}
    </View>
  );
};
