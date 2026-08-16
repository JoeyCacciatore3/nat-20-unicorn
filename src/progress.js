// progress.js — shards + abilities, 13 achievements, story beats, save/load (n20_ prefix).
import { stats, gain, S } from './stats.js';
import { inv } from './items.js';
import { slots } from './home.js';
import { bloom, setBloom } from './zones.js';
import * as DM from './dm.js';
import * as HUD from './hud.js';

// ---- event counters (feed achievements + saves) ----
export const ct = { kill: 0, crit: 0, dodge: 0, gather: 0, build: 0, sleep: 0, pass: 0, shard: 0 };

// ---- shards & abilities (one passive per chapter hue) ----
export const ABIL = [
  ['Ember Horn', '+50% damage'],
  ['Sure Hooves', 'no slope slide'],
  ['Sun Dash', 'longer dodge'],
  ['Bloom Step', 'wider magnet'],
  ['Feather Fall', 'higher jump'],
  ['Gloom Ward', '+1 heart'],
  ['Double Jump', 'air jump'],
];
export const abil = (i) => bloom[i] > .5;

// the DM's 7-beat arc: burnout -> joy (order matters, shown per shard freed)
const BEATS = [
  "Huh. That color... I'd forgotten I mixed that one myself.",
  "Two chapters back. The table's edge looks less final, doesn't it.",
  'You know the troll had a name. Kevin. It was Kevin.',
  "Half the table's awake. We— we're doing this, aren't we.",
  'I found my good pen. Not that it matters. It matters.',
  'One more, little horse. I can hear the music coming back.',
  "NAT TWENTY— sorry. Got ahead of myself. Your turn to tell it. I'll roll.",
];

export let critter = 0; // companion appears after the first rescue
export const freeShard = (i) => {
  setBloom(i, 1);
  ct.shard++;
  critter = 1;
  HUD.toast('🌈 <b>Shard freed!</b> ' + ABIL[i][0] + ' — ' + ABIL[i][1]);
  DM.line(BEATS[Math.min(ct.shard - 1, 6)]);
  save();
};

// ---- 13 achievements: [emoji, label, condition, stat] ----
const ACH = [
  ['🏠', 'Homebody — build a module', () => ct.build >= 1, S.INT],
  ['🌈', 'First Light — free a shard', () => ct.shard >= 1, S.WIS],
  ['⚔️', 'Gloombuster — slay 13', () => ct.kill >= 13, S.STR],
  ['🎯', 'Natural 20 — land a crit', () => ct.crit >= 1, S.CHA],
  ['💨', 'Untouchable — dodge 13', () => ct.dodge >= 13, S.DEX],
  ['🌼', 'Green Hooves — gather 50', () => ct.gather >= 50, S.WIS],
  ['🧗', 'Summit — top the highest peak', () => 0, S.CON], // set externally
  ['🗣', 'Silver Tongue — persuade the troll', () => 0, S.CHA], // set externally
  ['🛏', 'Well Rested — sleep 3 times', () => ct.sleep >= 3, S.CON],
  ['💎', 'Hoarder — hold 12 sparkles', () => inv.sp >= 12, S.INT],
  ['🎲', 'Believer — pass 5 checks', () => ct.pass >= 5, S.INT],
  ['🏗', 'Architect — fill all slots', () => slots.every(s => s.built >= 0), S.INT],
  ['🦄', 'Prismatic — restore all 7 chapters', () => ct.shard >= 7, -1],
];
export const earned = new Array(13).fill(0);
export const setCond = (i, f) => ACH[i][2] = f; // summit / troll wired from main
export const achList = () => ACH.map((a, i) => [a[0], a[1], earned[i]]);

export const achTick = () => {
  for (let i = 0; i < 13; i++) {
    if (earned[i] || !ACH[i][2]()) continue;
    earned[i] = 1;
    HUD.toast('🏆 ' + ACH[i][0] + ' <b>' + ACH[i][1].split(' — ')[0] + '</b>');
    if (ACH[i][3] < 0) for (let s = 0; s < 6; s++) stats[s]++; // Prismatic: all +1
    else gain(ACH[i][3], 15);
    save();
  }
};

// ---- save / load (rule: namespaced keys, never clear) ----
// Format note: all-ARRAY payload with 1-char keys — immune to the prop mangler,
// so a save from any build loads in any later build (bugfix pushes during voting).
export const save = () => {
  try {
    localStorage.n20_save = JSON.stringify({
      s: stats, i: [inv.fl, inv.sp, inv.tf, inv.pr, inv.ch],
      b: [...bloom].map(Math.round), u: slots.map(x => x.built), e: earned,
      c: [ct.kill, ct.crit, ct.dodge, ct.gather, ct.build, ct.sleep, ct.pass, ct.shard],
      v: 3,
    });
  } catch { /* storage may be unavailable */ }
};
export const load = () => {
  try {
    const d = JSON.parse(localStorage.n20_save || '0');
    if (!d || d.v !== 3 || !d.s || d.s.length !== 6) return 0;
    for (let i = 0; i < 6; i++) stats[i] = d.s[i];
    [inv.fl, inv.sp, inv.tf, inv.pr, inv.ch] = d.i;
    [ct.kill, ct.crit, ct.dodge, ct.gather, ct.build, ct.sleep, ct.pass, ct.shard] = d.c;
    for (let i = 0; i < 13; i++) earned[i] = d.e[i];
    for (let i = 0; i < 8; i++) if (d.b[i]) setBloom(i, 1);
    slots.forEach((s, i) => s.built = d.u[i]);
    if (ct.shard) critter = 1;
    return 1;
  } catch { return 0; }
};
export const hasSave = () => { try { return !!localStorage.n20_save; } catch { return 0; } };
