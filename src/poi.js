// poi.js — mid-band finds between camp and the chapters: one row per spot.
// Lore stones carry the DM's memory of each chapter; geodes crack into sparkles.
import { surfaceHeight } from './terrain.js';
import { regionCenter } from './zones.js';

// the DM remembers what each chapter was
export const LORE = [
  'First chapter. A meadow. I spent a week on flowers nobody noticed.',
  'The forest. Kevin lived here. Best NPC I ever ran.',
  'The peaks. Someone rolled a nat 1 up here and became a legend.',
  'Painted this valley on a lunch break. My best work, probably.',
  'This chapter never got played. You are the first to stand here.',
  'The dark chapter. Every campaign needs one. I overdid it.',
  'The last chapter. I never wrote the ending. Maybe that was the problem.',
];

export const POIS = [];
export const initPois = () => {
  for (let i = 0; i < 7; i++) {
    const [cx, cz] = regionCenter(i);
    // lore stone: halfway between camp and the chapter heart — in the old dead donut
    const sx = cx * .55, sz = cz * .55;
    POIS.push({ k: 1, i, x: sx, z: sz, y: surfaceHeight(sx, sz), u: 0 });
    if (!(i & 1)) { // geode on even chapters, offset off the beeline
      const gx = cx * .85 + cz * .25, gz = cz * .85 - cx * .25;
      POIS.push({ k: 0, i, x: gx, z: gz, y: surfaceHeight(gx, gz), u: 0 });
    }
  }
};
