export interface UserStats {
  totalFocusMinutes: number;
  completedCycles: number;
  currentStreak: number;
  lastFocusDate: string | null; // ISO Date String (YYYY-MM-DD)
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string; // We'll use this to map to Lucide icons or emojis
  xpReward: number;
  condition: (stats: UserStats) => boolean;
}

export const LEVELS = [
  { level: 1, xpRequired: 0 },
  { level: 2, xpRequired: 100 },
  { level: 3, xpRequired: 300 },
  { level: 4, xpRequired: 600 },
  { level: 5, xpRequired: 1000 },
  { level: 6, xpRequired: 1500 },
  { level: 7, xpRequired: 2100 },
  { level: 8, xpRequired: 2800 },
  { level: 9, xpRequired: 3600 },
  { level: 10, xpRequired: 4500 },
];

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_step',
    title: 'Primeiro Passo',
    description: 'Complete seu primeiro ciclo de foco.',
    icon: 'footprints',
    xpReward: 50,
    condition: (stats) => stats.completedCycles >= 1,
  },
  {
    id: 'focused',
    title: 'Focado',
    description: 'Complete 5 ciclos de foco.',
    icon: 'focus',
    xpReward: 150,
    condition: (stats) => stats.completedCycles >= 5,
  },
  {
    id: 'cycle_runner',
    title: 'Corredor de Ciclos',
    description: 'Complete 10 ciclos de foco.',
    icon: 'rocket',
    xpReward: 250,
    condition: (stats) => stats.completedCycles >= 10,
  },
  {
    id: 'dedicated',
    title: 'Dedicado',
    description: 'Acumule 60 minutos de foco total.',
    icon: 'clock',
    xpReward: 200,
    condition: (stats) => stats.totalFocusMinutes >= 60,
  },
  {
    id: 'master',
    title: 'Mestre da Produtividade',
    description: 'Complete 20 ciclos de foco.',
    icon: 'trophy',
    xpReward: 500,
    condition: (stats) => stats.completedCycles >= 20,
  },
  {
    id: 'marathon',
    title: 'Maratonista',
    description: 'Acumule 300 minutos de foco.',
    icon: 'medal',
    xpReward: 600,
    condition: (stats) => stats.totalFocusMinutes >= 300,
  },
  {
    id: 'focused_hours',
    title: 'Primeiras 10h',
    description: 'Acumule 600 minutos de foco.',
    icon: 'star',
    xpReward: 800,
    condition: (stats) => stats.totalFocusMinutes >= 600,
  },
  {
    id: 'veteran',
    title: 'Veterano',
    description: 'Complete 50 ciclos de foco.',
    icon: 'shield',
    xpReward: 900,
    condition: (stats) => stats.completedCycles >= 50,
  },
  {
    id: 'deep_focus',
    title: 'Foco Profundo',
    description: 'Acumule 1200 minutos de foco.',
    icon: 'gem',
    xpReward: 1200,
    condition: (stats) => stats.totalFocusMinutes >= 1200,
  },
  {
    id: 'centurion',
    title: 'Centurião',
    description: 'Complete 100 ciclos de foco.',
    icon: 'crown',
    xpReward: 1500,
    condition: (stats) => stats.completedCycles >= 100,
  },
  {
    id: 'streak_3',
    title: 'Trinca de Foco',
    description: 'Mantenha 3 dias de ofensiva.',
    icon: 'flame',
    xpReward: 180,
    condition: (stats) => stats.currentStreak >= 3,
  },
  {
    id: 'streak_7',
    title: 'Semana Imbatível',
    description: 'Mantenha 7 dias de ofensiva.',
    icon: 'flame',
    xpReward: 420,
    condition: (stats) => stats.currentStreak >= 7,
  },
  {
    id: 'streak_14',
    title: 'Fortaleza',
    description: 'Mantenha 14 dias de ofensiva.',
    icon: 'flame',
    xpReward: 900,
    condition: (stats) => stats.currentStreak >= 14,
  },
  {
    id: 'streak_30',
    title: 'Lenda do Foco',
    description: 'Mantenha 30 dias de ofensiva.',
    icon: 'crown',
    xpReward: 2500,
    condition: (stats) => stats.currentStreak >= 30,
  },
  {
    id: 'ultra_focus',
    title: 'Ultra Foco',
    description: 'Acumule 2400 minutos de foco.',
    icon: 'zap',
    xpReward: 2200,
    condition: (stats) => stats.totalFocusMinutes >= 2400,
  },
];
