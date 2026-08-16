// home.js — 4 build slots on the house hill; every craft is a visible module.
// A module = [name, emoji, cost, mesh rows]; mesh row = [prim, dx,dy,dz, ry, sx,sy,sz, r,g,b, emis]
import { surfaceHeight } from './terrain.js';
import { inv } from './items.js';

export const MODULES = [
  ['Garden', '🌼', { fl: 4, tf: 2 }, [
    [0, 0, .15, 0, 0, 2.6, .3, 1.8, .32, .2, .12, 0],
    [1, -.8, .55, -.4, 0, .22, .5, .22, 1, .45, .6, .6],
    [1, .7, .55, .3, 0, .22, .5, .22, 1, .85, .3, .6],
    [1, 0, .55, .55, 0, .22, .5, .22, .5, .6, 1, .6],
  ]],
  ['Prism Tower', '🗼', { sp: 4, pr: 2 }, [
    [0, 0, 1.1, 0, .6, .7, 2.2, .7, .75, .78, .95, .15],
    [1, 0, 2.6, 0, 0, .55, .9, .55, 1, .7, 1, .9],
  ]],
  ['Beacon', '🔔', { sp: 3, ch: 2 }, [
    [1, 0, 1.6, 0, 0, .45, 3.2, .45, 1, .85, .4, .8],
    [0, 0, .25, 0, .78, 1.1, .5, 1.1, .5, .42, .3, 0],
  ]],
];

export const slots = [];   // {a, x, y, z, built: -1|moduleIdx}
export const initHome = () => {
  for (let i = 0; i < 3; i++) {
    const a = 1.1 + i * 1.7, r = 6.5;
    const x = Math.sin(a) * r, z = Math.cos(a) * r;
    slots.push({ x, z, y: surfaceHeight(x, z), built: -1, i });
  }
};

export const costText = (cost) => {
  const ICO = { fl: '🌼', sp: '💎', tf: '🌫️', pr: '🖤', ch: '🪨' };
  return Object.keys(cost).map(k => cost[k] + ICO[k]).join(' ');
};
export const canAfford = (cost) => Object.keys(cost).every(k => inv[k] >= cost[k]);
export const pay = (cost) => Object.keys(cost).forEach(k => inv[k] -= cost[k]);
export const towerSlot = () => slots.find(s => s.built === 1); // Prism Tower = MODULES[1]
