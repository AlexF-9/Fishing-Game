export type AnimalId = 'gato' | 'urso' | 'pinguim' | 'lontra';

export interface Animal {
  name: string;
  emoji: string;
  perk: string;
  main: string;
  light: string;
  dark: string;
}

export const ANIMALS: Record<AnimalId, Animal> = {
  gato:    { name: 'Gato',    emoji: '🐱', perk: 'Zona verde 15% maior',          main: '#f0a04b', light: '#fde3c2', dark: '#b8661c' },
  urso:    { name: 'Urso',    emoji: '🐻', perk: 'Peixes valem +25% de moedas',   main: '#8b5a2b', light: '#d9b38c', dark: '#5e3a17' },
  pinguim: { name: 'Pinguim', emoji: '🐧', perk: 'Peixes mordem 25% mais rápido', main: '#2b3440', light: '#ffffff', dark: '#151a20' },
  lontra:  { name: 'Lontra',  emoji: '🦦', perk: 'Mais sorte com peixes raros',   main: '#7a5232', light: '#ead2b0', dark: '#4e321c' },
};

export const ANIMAL_IDS = Object.keys(ANIMALS) as AnimalId[];
export const isAnimalId = (v: unknown): v is AnimalId => typeof v === 'string' && v in ANIMALS;
