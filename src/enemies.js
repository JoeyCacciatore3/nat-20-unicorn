// enemies.js — gloomlings (the DM's doubt), table-driven: one KINDS row per foe,
// two behaviors (melee / ranged) + the 13th-Floor rubber-band aggression scalar.
// Roster taxonomy mined from the game-asset-library (KayKit skeleton roles,
// Quaternius "Evolved" variants) — data ships, models never could.
import { surfaceHeight } from './terrain.js';
import { bloomTarget, regionCenter } from './zones.js';

// KINDS rows: [speed, detect, atkCd, boltSpd(0=melee), hp, scale, color, sprite]
// sprite = bit-packed 5x4 1-bit pattern (space-invader technique), rows written
// top→bottom in the literal, decoded bottom-up; color + scale read as power.
export const KINDS = [
  [1.7, 6, 1.4, 0, 2, .85, [.24, .2, .3], 0b01110_11111_10101_01010],   // 0 minion — pale blob
  [2.2, 15, 3.4, 7, 3, .85, [.18, .16, .38], 0b00100_01110_01110_11111], // 1 mage — hatted robe
  [0, 16, 3.6, 5.5, 3, 1.3, [.32, .14, .32], 0b00100_01110_11111_11111], // 2 turret — pyramid
  [2.6, 8, 1.1, 0, 1, .6, [.18, .26, .22], 0b00100_01110_00100_01010],   // 3 rogue — small scout
  [1.1, 5, 1.8, 0, 5, 1.2, [.34, .1, .12], 0b11111_11111_11011_11011],   // 4 warrior — red hulk
];

export const foes = [];   // {k,r,x,y,z,yaw,hp,t,cd,flash,el?}
export const bolts = [];  // {x,y,z,vx,vy,vz,life}
export let aggro = .45;
export const nudgeAggro = (d) => aggro = Math.min(1, Math.max(0, aggro + d));

// difficulty curve, driven by shards freed (main calls setDiff each frame)
let packSize = 2, kindN = 3, hpScale = 1, eliteP = 0;
export const setDiff = (sh) => {
  packSize = 2 + (sh > 2 ? 1 : 0) + (sh > 5 ? 1 : 0);
  kindN = 3 + (sh > 2 ? 1 : 0) + (sh > 4 ? 1 : 0);
  hpScale = 1 + sh * .12;
  eliteP = sh > 5 ? .5 : sh > 3 ? .2 : 0; // the last chapter is defended by Evolved elites
};

const spawn = (k, r, x, z, extra) => {
  const f = { k, r, x, z, y: surfaceHeight(x, z), yaw: 0,
    hp: Math.round(KINDS[k][4] * hpScale),
    t: Math.random() * 9, cd: 1 + Math.random(), flash: 0 };
  if (extra) Object.assign(f, extra);
  if (!extra && Math.random() < eliteP) { f.el = 1; f.hp *= 2; } // Evolved variant
  foes.push(f);
};

let waveT = 0;
export const tickSpawns = (dt, pl) => { // keep un-restored chapters haunted
  waveT -= dt;
  if (waveT > 0) return;
  waveT = 4;
  for (let i = 0; i < 7; i++) {
    if (bloomTarget[i] > .5) continue; // authoritative — no pack spawns into a just-freed chapter
    let have = 0;
    for (const f of foes) if (f.r === i) have++;
    while (have < packSize) {
      const [cx, cz] = regionCenter(i);
      const a = Math.random() * 6.283, d = 5 + Math.random() * 24; // spread packs across the whole wedge
      const x = cx + Math.sin(a) * d, z = cz + Math.cos(a) * d;
      have++;
      if (Math.hypot(x, z) < 12) continue;              // never inside the house circle
      if (Math.hypot(x - pl.x, z - pl.z) < 13) continue; // never ambush-spawn on the player
      if (surfaceHeight(x, z) < .4) continue;            // never on the gray shore fringe / bare table
      spawn((have - 1) % kindN, i, x, z);
    }
  }
};


const fire = (f, px, py, pz, spd) => {
  const dx = px - f.x, dy = py + 1 - f.y - 1.2, dz = pz - f.z;
  const d = Math.hypot(dx, dy, dz) || 1;
  bolts.push({ x: f.x, y: f.y + 1.2, z: f.z, vx: dx / d * spd, vy: dy / d * spd, vz: dz / d * spd, life: 2.6 });
};

// api: { touch(f), boltHit(b) }
export const update = (pl, dt, api) => {
  for (let fi = foes.length; fi--;) { // reverse: api callbacks may splice
    const f = foes[fi];
    const T = KINDS[f.k];
    f.t += dt; f.cd -= dt; if (f.flash > 0) f.flash -= dt;
    const dx = pl.x - f.x, dz = pl.z - f.z, d = Math.hypot(dx, dz);
    if (T[3]) { // ranged — keeps range, lobs gloom
      if (d < T[1]) {
        f.yaw = Math.atan2(dx, dz);
        if (T[0] && d < 5.5) { const s = T[0] * dt / Math.max(d, .1); f.x -= dx * s; f.z -= dz * s; }
        if (f.cd <= 0) { f.cd = T[2] - 1.6 * aggro; fire(f, pl.x, pl.y, pl.z, T[3]); }
      }
    } else { // melee — hunts in a radius that grows with aggro
      if (d < T[1] + 5 * aggro && d > 1.1) {
        const s = (T[0] + 2.4 * aggro) * dt / d;
        f.x += dx * s; f.z += dz * s;
        f.yaw = Math.atan2(dx, dz);
      }
      if (d < T[5] + .55 && f.cd <= 0) { f.cd = T[2]; api.touch(f); }
    }
    f.y = surfaceHeight(f.x, f.z);
  }
  for (let i = bolts.length; i--;) {
    const b = bolts[i];
    b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt; b.life -= dt;
    if (Math.hypot(pl.x - b.x, pl.y + 1 - b.y, pl.z - b.z) < .95) { api.boltHit(b); b.life = 0; }
    if (b.life <= 0 || b.y < surfaceHeight(b.x, b.z)) bolts.splice(i, 1);
  }
};
