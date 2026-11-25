export type UpgradeId = 'cana' | 'linha' | 'chumbo' | 'isco' | 'sorte' | 'balde' | 'barco';

export interface Upgrade {
  id: UpgradeId;
  name: string;
  icon: string;
  max: number;
  base: number;
  mult: number;
  fx: (level: number) => string;
}

// Os textos do alcance mantêm os metros do jogo original (230 → 630 m).
export const UPG: Upgrade[] = [
  { id: 'cana',  name: 'Cana',             icon: '🎣', max: 5, base: 50,   mult: 2.1, fx: l => `Zona verde ${100 + l * 12}%` },
  { id: 'linha', name: 'Linha',            icon: '🧵', max: 5, base: 40,   mult: 2.0, fx: l => `Alcance ${230 + l * 80} m` },
  // Chumbada: o anzol afunda mais do que a distância do lançamento permite (+8 m por nível)
  { id: 'chumbo', name: 'Chumbada',         icon: '⚓', max: 5, base: 80,   mult: 2.2, fx: l => (l ? `Afunda +${l * 8} m` : 'Afunda só com a distância') },
  { id: 'isco', name: 'Isco',             icon: '🪱', max: 5, base: 30,   mult: 2.0, fx: l => `Tempo de espera ${100 - l * 12}%` },
  { id: 'sorte', name: 'Amuleto da Sorte', icon: '🍀', max: 5, base: 100,  mult: 2.3, fx: l => `Sorte +${l * 25}%` },
  { id: 'balde', name: 'Balde',            icon: '🪣', max: 5, base: 35,   mult: 2.0, fx: l => `Cabem ${5 + l * 3} peixes` },
  { id: 'barco', name: 'Barco',            icon: '⛵', max: 1, base: 1500, mult: 1,   fx: l => (l ? 'Mar Profundo desbloqueado!' : 'Leva-te ao Mar Profundo') },
];
