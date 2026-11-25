// Resolução interna em pixel art (480×300), ampliada no ecrã.
// Todas as medidas são metade das do pescaria.html original (960×600).
export const W = 480;
export const H = 300;
export const WATER_Y = 175;
export const DOCK_END = 131;
/** Posição dos pés do animal. */
export const AX = 85;
export const AY = 166;
/** Altura total do mundo: debaixo de água o ecrã desce atrás do anzol até ao fundo. */
export const WORLD_H = 640;
/** Píxeis de descida do anzol por unidade de profundidade (1 = lançamento máximo sem Chumbada). */
export const DEPTH_PX = 200;
/** Profundidade extra por nível de Chumbada (em unidades de profundidade; 0,2 = +8 m). */
export const SINKER_PER_LEVEL = 0.2;
/** Comprimento da cana em píxeis. */
export const ROD_LEN = 62;

export const SAVE_KEY = 'pescaria_save_v1';
/** Duração de um dia completo, em segundos. */
export const DAY_SECONDS = 240;
