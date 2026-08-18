// items.js — gatherables: flowers + sparkles, WIS-scaled magnet, inventory.
import { surfaceHeight } from './terrain.js';
import { regionCenter } from './zones.js';

export const inv = { fl: 0, sp: 0, tf: 0, pr: 0, ch: 0 }; // flowers sparkles tufts pearls chips
export const items = []; // {k:0 flower |1 sparkle, x,y,z,t}

export const addItem = (k, x, z) =>
  items.push({ k, x, z, y: surfaceHeight(x, z), t: Math.random() * 9 });

export const initItems = () => {
  for (let i = 0; i < 7; i++) {
    const [cx, cz] = regionCenter(i);
    for (let n = 0; n < 8; n++) {
      const a = Math.random() * 6.283, d = 3 + Math.random() * 13;
      addItem(n < 5 ? 0 : 1, cx + Math.sin(a) * d, cz + Math.cos(a) * d);
    }
  }
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
