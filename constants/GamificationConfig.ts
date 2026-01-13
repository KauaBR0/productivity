export interface UserStats {
  totalFocusMinutes: number;
  completedCycles: number;
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
];
