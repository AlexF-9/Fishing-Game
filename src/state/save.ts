import { SAVE_KEY } from '../config';
import type { AnimalId } from '../data/animals';
import type { Zone } from '../data/fish';
import type { UpgradeId } from '../data/upgrades';

export interface BookEntry { n: number; best: number }
export interface BucketItem { id: string; kg: number; v: number }

/** Mesmo formato JSON do pescaria.html original (chave 'pescaria_save_v1'). */
export interface SaveData {
  animal: AnimalId | null;
  coins: number;
  upg: Record<UpgradeId, number>;
  book: Record<string, BookEntry>;
  bucket: BucketItem[];
  zone: Zone;
  /** Hora do dia, de 0 a 1. */
  time: number;
  /** Silencia tudo (🔊). */
  mute: boolean;
  /** Música ligada (🎵). Campo novo: saves antigos ficam com a música ligada. */
  music: boolean;
}

export const newSave = (): SaveData => ({
  animal: null,
  coins: 0,
  upg: { cana: 0, linha: 0, isco: 0, sorte: 0, balde: 0, barco: 0 },
  book: {},
  bucket: [],
  zone: 'lago',
  time: 0.18,
  mute: false,
  music: true,
});

function loadSave(): SaveData {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY) ?? 'null');
    if (s) {
      const d = newSave();
      return { ...d, ...s, upg: { ...d.upg, ...(s.upg || {}) } };
    }
  } catch { /* save corrompido: começa do zero */ }
  return newSave();
}

/** Estado persistente único. É sempre o mesmo objeto (o reset troca o conteúdo). */
export const save: SaveData = loadSave();
if (save.zone === 'mar' && !save.upg.barco) save.zone = 'lago';

export function persist(): void {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch { /* sem armazenamento */ }
}

export function resetSave(): void {
  Object.assign(save, newSave());
  persist();
}
