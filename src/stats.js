// stats.js — the D&D layer: 6 stats, ONE modifier formula, d20, level-by-use XP.
export const S = { STR: 0, DEX: 1, CON: 2, INT: 3, WIS: 4, CHA: 5 };
export const NAMES = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];
export const stats = [10, 10, 10, 10, 10, 10];
export const xp = [0, 0, 0, 0, 0, 0], lvl = [0, 0, 0, 0, 0, 0];

// every derived value in the game is base * mod(stat) — D&D's curve, one line
export const mod = (s) => 1 + (stats[s] - 10) / 20;
export const d20 = () => 1 + Math.random() * 20 | 0;
export const roll4d6 = () => {
  const r = [0, 0, 0, 0].map(() => 1 + Math.random() * 6 | 0).sort((a, b) => a - b);
  return r[1] + r[2] + r[3];
};

let onLevel = () => {};
export const setOnLevel = (f) => onLevel = f;
export const gain = (s, n) => {          // level-by-use (Skyrim): doing is training
  xp[s] += n;
  const need = 25 * (1 << lvl[s]);       // threshold doubles per level
  if (xp[s] >= need) { xp[s] -= need; lvl[s]++; stats[s]++; onLevel(s); }
};
export const maxHearts = () => 3 + Math.max(0, stats[S.CON] - 10 >> 2);
