export type CycleType = string;

export interface CycleDef {
  id: CycleType;
  label: string;
  focusDuration: number; // in minutes
  rewardDuration: number; // in minutes
  restDuration: number; // in minutes
  color: string;
}

export const CYCLES: CycleDef[] = [
  {
    id: 'micro',
    label: 'Ciclo Micro',
    focusDuration: 3,
    rewardDuration: 10,
    restDuration: 5,
    color: '#00D4FF', // Cyan Neon
  },
  {
    id: 'short',
    label: 'Ciclo Curto',
    focusDuration: 10,
    rewardDuration: 10,
    restDuration: 5,
    color: '#00FF94', // Green Neon
  },
  {
    id: 'medium',
    label: 'Ciclo Médio',
    focusDuration: 20,
    rewardDuration: 10,
    restDuration: 5,
    color: '#FF0055', // Pink/Red Neon
  },
  {
    id: 'long',
    label: 'Ciclo Longo',
    focusDuration: 40,
    rewardDuration: 20,
    restDuration: 10,
    color: '#FFD600', // Yellow Neon
  },
];

export const REWARDS = [
  'Música',
  'Redes Sociais',
  'Jogos',
  'Filmes/Séries',
  'Show de Stand-up',
];
