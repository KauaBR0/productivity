import {
  getPackagesExcludingCategory,
  getPackagesForCategory,
  resolveBlockCategoryFromReward,
  type InstalledApp,
} from '../services/AppBlockerService';

describe('AppBlockerService reward category helpers', () => {
  it('resolves direct category matches from reward labels', () => {
    const category = resolveBlockCategoryFromReward('jogos', ['Jogos', 'Redes Sociais']);
    expect(category).toBe('Jogos');
  });

  it('resolves known aliases using available categories', () => {
    const category = resolveBlockCategoryFromReward('Filmes/Séries', ['Vídeo', 'Jogos']);
    expect(category).toBe('Vídeo');
  });

  it('returns null when reward is not a blockable category', () => {
    const category = resolveBlockCategoryFromReward('Ler um livro', ['Jogos', 'Vídeo']);
    expect(category).toBeNull();
  });

  it('gets package names by category', () => {
    const installedApps: InstalledApp[] = [
      { packageName: 'pkg.game.one', label: 'Game One', category: 'Jogos' },
      { packageName: 'pkg.video.one', label: 'Video One', category: 'Vídeo' },
      { packageName: 'pkg.game.two', label: 'Game Two', category: 'Jogos' },
    ];

    expect(getPackagesForCategory(installedApps, 'jogos')).toEqual([
      'pkg.game.one',
      'pkg.game.two',
    ]);
  });

  it('gets package names excluding the allowed reward category', () => {
    const installedApps: InstalledApp[] = [
      { packageName: 'pkg.social.one', label: 'Social One', category: 'Redes Sociais' },
      { packageName: 'pkg.video.one', label: 'Video One', category: 'Vídeo' },
      { packageName: 'pkg.game.one', label: 'Game One', category: 'Jogos' },
    ];

    expect(getPackagesExcludingCategory(installedApps, 'Redes Sociais')).toEqual([
      'pkg.video.one',
      'pkg.game.one',
    ]);
  });
});
