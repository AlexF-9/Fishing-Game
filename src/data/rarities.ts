export interface Rarity {
  name: string;
  color: string;
  /** Peso base no sorteio. */
  weight: number;
  /** Velocidade do marcador no minijogo. */
  speed: number;
  /** Largura base da zona verde (0–1). */
  zone: number;
}

export const RAR: Rarity[] = [
  { name: 'Comum',    color: '#8a8f98', weight: 60, speed: 1.00, zone: 0.26 },
  { name: 'Incomum',  color: '#3aa655', weight: 25, speed: 1.20, zone: 0.22 },
  { name: 'Raro',     color: '#2f7fd8', weight: 10, speed: 1.45, zone: 0.18 },
  { name: 'Épico',    color: '#9b4fd6', weight: 4,  speed: 1.70, zone: 0.15 },
  { name: 'Lendário', color: '#e8a317', weight: 1,  speed: 2.00, zone: 0.12 },
];
