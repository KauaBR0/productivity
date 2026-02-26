import { NativeModules, Platform } from 'react-native';

type AttemptStats = {
  countToday: number;
  lastAttemptDate: string | null;
  lastAttemptPackage: string | null;
  lastAttemptTime: number;
};

export type InstalledApp = {
  packageName: string;
  label: string;
  category?: string;
};

const normalizeCategoryKey = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const REWARD_CATEGORY_ALIASES: Record<string, string> = {
  jogo: 'Jogos',
  jogos: 'Jogos',
  game: 'Jogos',
  games: 'Jogos',
  social: 'Redes Sociais',
  'rede social': 'Redes Sociais',
  'redes sociais': 'Redes Sociais',
  'social media': 'Redes Sociais',
  musica: 'Musica & Audio',
  music: 'Musica & Audio',
  audio: 'Musica & Audio',
  'musica e audio': 'Musica & Audio',
  video: 'Video',
  videos: 'Video',
  filme: 'Video',
  filmes: 'Video',
  serie: 'Video',
  series: 'Video',
  'filmes series': 'Video',
  noticia: 'Noticias',
  noticias: 'Noticias',
  news: 'Noticias',
  mapa: 'Mapas & Navegacao',
  mapas: 'Mapas & Navegacao',
  navegacao: 'Mapas & Navegacao',
  produtividade: 'Produtividade',
  outros: 'Outros',
};

export const resolveBlockCategoryFromReward = (
  reward: string | null | undefined,
  availableCategories: string[] = []
): string | null => {
  if (!reward) return null;
  const rewardKey = normalizeCategoryKey(reward);
  if (!rewardKey) return null;

  const normalizedCategories = availableCategories
    .filter(Boolean)
    .map((category) => ({
      original: category,
      normalized: normalizeCategoryKey(category),
    }))
    .filter((category) => Boolean(category.normalized));

  const directMatch = normalizedCategories.find(
    (category) => category.normalized === rewardKey
  );
  if (directMatch) return directMatch.original;

  const aliasTarget = REWARD_CATEGORY_ALIASES[rewardKey];
  if (!aliasTarget) return null;

  const aliasKey = normalizeCategoryKey(aliasTarget);
  const availableAliasMatch = normalizedCategories.find(
    (category) => category.normalized === aliasKey
  );

  return availableAliasMatch?.original ?? aliasTarget;
};

export const getPackagesForCategory = (
  installedApps: InstalledApp[],
  category: string | null | undefined
): string[] => {
  if (!category) return [];
  const categoryKey = normalizeCategoryKey(category);
  if (!categoryKey) return [];

  return installedApps
    .filter((app) => normalizeCategoryKey(app.category || 'Outros') === categoryKey)
    .map((app) => app.packageName)
    .filter(Boolean);
};

export const getPackagesExcludingCategory = (
  installedApps: InstalledApp[],
  allowedCategory: string | null | undefined
): string[] => {
  if (!allowedCategory) return [];
  const allowedCategoryKey = normalizeCategoryKey(allowedCategory);
  if (!allowedCategoryKey) return [];

  return installedApps
    .filter((app) => normalizeCategoryKey(app.category || 'Outros') !== allowedCategoryKey)
    .map((app) => app.packageName)
    .filter(Boolean);
};

const BlockerModule = NativeModules?.AppBlocker;
const isAndroid = Platform.OS === 'android';

export const isAppBlockerAvailable = () => isAndroid && !!BlockerModule;

export const setBlocklist = async (packages: string[]) => {
  if (!isAndroid || !BlockerModule?.setBlocklist) return;
  BlockerModule.setBlocklist(packages);
};

export const setSessionActive = async (active: boolean) => {
  if (!isAndroid || !BlockerModule?.setSessionActive) return;
  BlockerModule.setSessionActive(active);
};

export const openAccessibilitySettings = async () => {
  if (!isAndroid || !BlockerModule?.openAccessibilitySettings) return;
  BlockerModule.openAccessibilitySettings();
};

export const isAccessibilityEnabled = async (): Promise<boolean> => {
  if (!isAndroid || !BlockerModule?.isAccessibilityEnabled) return false;
  return BlockerModule.isAccessibilityEnabled();
};

export const checkOverlayPermission = async (): Promise<boolean> => {
  if (!isAndroid || !BlockerModule?.checkOverlayPermission) return true;
  return BlockerModule.checkOverlayPermission();
};

export const requestOverlayPermission = async () => {
  if (!isAndroid || !BlockerModule?.requestOverlayPermission) return;
  BlockerModule.requestOverlayPermission();
};

export const getAttemptStats = async (): Promise<AttemptStats> => {
  if (!isAndroid || !BlockerModule?.getAttemptStats) {
    return {
      countToday: 0,
      lastAttemptDate: null,
      lastAttemptPackage: null,
      lastAttemptTime: 0,
    };
  }
  return BlockerModule.getAttemptStats();
};

export const getInstalledApps = async (): Promise<InstalledApp[]> => {
  if (!isAndroid || !BlockerModule?.getInstalledApps) return [];
  return BlockerModule.getInstalledApps();
};
