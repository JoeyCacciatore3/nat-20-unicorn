// items.js — gatherables: flowers + sparkles, WIS-scaled magnet, inventory.
import { surfaceHeight } from './terrain.js';

export const inv = { fl: 0, sp: 0, tf: 0, pr: 0, ch: 0 }; // flowers sparkles tufts pearls chips
export const items = []; // {k:0 flower |1 sparkle, x,y,z,t}

export const addItem = (k, x, z) =>
  items.push({ k, x, z, y: surfaceHeight(x, z), t: Math.random() * 9 });

export const initItems = () => {
  // whole-island scatter (shore guard keeps every item on grass)
  for (let n = 0; n < 68; n++) {
    const a = Math.random() * 6.283, d = 4 + Math.random() * 24;
    const x = Math.sin(a) * d, z = Math.cos(a) * d;
    if (surfaceHeight(x, z) > .4) addItem(n % 3 ? 0 : 1, x, z);
  }
  // spilled sparkles out on the wood near the d6 — the table edge rewards explorers
  for (let n = 0; n < 6; n++)
    addItem(1, 28 + Math.random() * 14, -22 - Math.random() * 14);
};

// onPick(item) fires per collected item
export const update = (pl, dt, magnetR, onPick) => {
  for (let i = items.length; i--;) {
    const it = items[i];
    it.t += dt;
    const dx = pl.x - it.x, dz = pl.z - it.z, d = Math.hypot(dx, dz);
    if (d < magnetR && d > .1) { const s = 7 * dt / d; it.x += dx * s; it.z += dz * s; it.y = surfaceHeight(it.x, it.z); }
    if (d < 1) { it.k ? inv.sp++ : inv.fl++; items.splice(i, 1); onPick(it); }
  }
};
