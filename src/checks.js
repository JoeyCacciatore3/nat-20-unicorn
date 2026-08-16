// checks.js — authored skill-check spots: DM table-talk + a d20 falling from the sky.
import { surfaceHeight } from './terrain.js';
import { regionCenter } from './zones.js';
import { stats, d20, gain, S } from './stats.js';
import { inv } from './items.js';
import * as DM from './dm.js';

// [stat, dc, region, label, reward {..}, offsetX, offsetZ]
const DEFS = [
  [S.STR, 12, 1, 'Stuck chest', { sp: 4 }, 3, 2],
  [S.DEX, 13, 3, 'Wobbling plank', { sp: 3 }, -4, 3],
  [S.INT, 13, 5, 'Ancient rune', { sp: 4 }, 2, -4],
  [S.WIS, 12, 2, 'Suspicious mound', { fl: 5 }, -3, -3],
  [S.CHA, 14, 4, 'Grumpy troll', { pr: 3 }, 4, -2],
  [S.STR, 14, 6, 'Massive boulder', { ch: 3 }, -2, 4],
];
export const checks = []; // {stat,dc,label,reward,x,y,z,done,cool,troll}
export const initChecks = () => {
  for (const [st, dc, r, label, reward, ox, oz] of DEFS) {
    const [cx, cz] = regionCenter(r);
    const x = cx + ox, z = cz + oz;
    checks.push({ stat: st, dc, label, reward, x, z, y: surfaceHeight(x, z),
                  done: 0, cool: 0, troll: st === S.CHA });
  }
};

// the falling die (rendered by main while active)
export const die = { t: 0, x: 0, y: 0, z: 0 }; // t counts down; resolves at 0
let pend = null;

// returns prompt text if near an open check
export const near = (px, pz) => {
  for (const ck of checks) {
    if (ck.done || ck.cool > 0 || Math.hypot(px - ck.x, pz - ck.z) > 2.6) continue;
    return ck;
  }
  return null;
};

export const attempt = (ck) => {
  if (die.t > 0) return;
  die.t = .8; die.x = ck.x; die.z = ck.z; die.y = ck.y;
  pend = ck;
};

// api: { fly(x,y,z,txt,color,big), burst(x,y,z,n,hue,spread), onPass(ck) }
export const tick = (dt, api) => {
  for (const ck of checks) if (ck.cool > 0) ck.cool -= dt;
  if (die.t <= 0 || (die.t -= dt) > 0) return;
  const ck = pend; pend = null;
  const roll = d20(), bonus = stats[ck.stat] - 10 >> 1;
  const ok = roll === 20 || (roll !== 1 && roll + bonus >= ck.dc);
  api.fly(ck.x, ck.y + 2.4, ck.z,
    roll + (bonus ? '+' + bonus : '') + ' vs DC ' + ck.dc, ok ? '#8f8' : '#f88', 1);
  if (ok) {
    ck.done = 1;
    for (const k in ck.reward) inv[k] += ck.reward[k];
    api.burst(ck.x, ck.y + 1, ck.z, 20, null, 5);
    gain(ck.stat, 10);
    DM.say('pass');
    api.onPass(ck);
  } else {
    ck.cool = 8; // failure routes you the long way, never a dead end
    DM.say('fail');
  }
};
