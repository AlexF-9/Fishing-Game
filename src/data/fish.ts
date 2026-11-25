export type Zone = 'lago' | 'mar';
export type FishShape = 'boot' | 'fish' | 'round' | 'eel' | 'octo' | 'lantern' | 'sword' | 'shark';

export interface Fish {
  id: string;
  name: string;
  zone: Zone;
  /** Índice da raridade em RAR (0 = Comum … 4 = Lendário). */
  r: number;
  value: number;
  min: number;
  max: number;
  shape: FishShape;
  c1: string;
  c2: string;
  stripe?: boolean;
  night?: boolean;
}

export const FISH: Fish[] = [
  // Lago
  { id: 'bota',     name: 'Bota Velha',        zone: 'lago', r: 0, value: 2,    min: 0.5, max: 1.2, shape: 'boot',    c1: '#6b4a2b', c2: '#3f2a17' },
  { id: 'prateado', name: 'Peixinho Prateado', zone: 'lago', r: 0, value: 6,    min: 0.1, max: 0.4, shape: 'fish',    c1: '#b9c6d2', c2: '#7f93a6' },
  { id: 'carpa',    name: 'Carpa',             zone: 'lago', r: 0, value: 9,    min: 1,   max: 6,   shape: 'fish',    c1: '#c9a14a', c2: '#9a7a2e' },
  { id: 'perca',    name: 'Perca',             zone: 'lago', r: 1, value: 20,   min: 0.5, max: 2,   shape: 'fish',    c1: '#a8c44f', c2: '#4f6d1c', stripe: true },
  { id: 'truta',    name: 'Truta Arco-Íris',   zone: 'lago', r: 1, value: 28,   min: 0.8, max: 4,   shape: 'fish',    c1: '#e7a1b6', c2: '#6fa7c9', stripe: true },
  { id: 'lucio',    name: 'Lúcio',             zone: 'lago', r: 2, value: 65,   min: 3,   max: 15,  shape: 'fish',    c1: '#6f8f4e', c2: '#3f5a2a', stripe: true },
  { id: 'lua',      name: 'Peixe-Lua Noturno', zone: 'lago', r: 2, value: 85,   min: 1,   max: 5,   shape: 'round',   c1: '#d9e4ff', c2: '#8fa4e6', night: true },
  { id: 'enguia',   name: 'Enguia Elétrica',   zone: 'lago', r: 3, value: 190,  min: 2,   max: 12,  shape: 'eel',     c1: '#3c5a7a', c2: '#ffe14d' },
  { id: 'koi',      name: 'Carpa Koi Dourada', zone: 'lago', r: 3, value: 240,  min: 2,   max: 9,   shape: 'fish',    c1: '#ffb627', c2: '#ff5e2b', stripe: true },
  { id: 'rei',      name: 'Rei do Lago',       zone: 'lago', r: 4, value: 900,  min: 20,  max: 60,  shape: 'fish',    c1: '#2f6f5f', c2: '#d4af37', stripe: true },
  // Mar Profundo
  { id: 'cavala',   name: 'Cavala',            zone: 'mar',  r: 0, value: 16,   min: 0.3, max: 1.5, shape: 'fish',    c1: '#5d8fb5', c2: '#2f5c80', stripe: true },
  { id: 'robalo',   name: 'Robalo',            zone: 'mar',  r: 1, value: 42,   min: 1,   max: 8,   shape: 'fish',    c1: '#9aa8b4', c2: '#5c6b78' },
  { id: 'polvo',    name: 'Polvo',             zone: 'mar',  r: 2, value: 130,  min: 2,   max: 15,  shape: 'octo',    c1: '#d9605a', c2: '#a83a35' },
  { id: 'lanterna', name: 'Peixe-Lanterna',    zone: 'mar',  r: 2, value: 160,  min: 0.5, max: 3,   shape: 'lantern', c1: '#2a2f4f', c2: '#7ef0ff', night: true },
  { id: 'espada',   name: 'Peixe-Espada',      zone: 'mar',  r: 3, value: 420,  min: 30,  max: 120, shape: 'sword',   c1: '#7aa0c4', c2: '#c0d4e6' },
  { id: 'martelo',  name: 'Tubarão-Martelo',   zone: 'mar',  r: 3, value: 520,  min: 80,  max: 250, shape: 'shark',   c1: '#7d8a96', c2: '#55616c' },
  { id: 'cristal',  name: 'Peixe Cristal',     zone: 'mar',  r: 4, value: 1800, min: 3,   max: 10,  shape: 'round',   c1: '#bff4ff', c2: '#62d6f2' },
  { id: 'lula',     name: 'Lula Gigante',      zone: 'mar',  r: 4, value: 2200, min: 150, max: 500, shape: 'octo',    c1: '#e07aa0', c2: '#a8406b', night: true },
];

export const fishById = (id: string) => FISH.find(f => f.id === id);
