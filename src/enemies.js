// enemies.js — gloomlings (the DM's doubt), table-driven: one KINDS row per foe,
// two behaviors (melee / ranged) + the 13th-Floor rubber-band aggression scalar.
// Roster taxonomy mined from the game-asset-library (KayKit skeleton roles,
// Quaternius "Evolved" variants) — data ships, models never could.
import { surfaceHeight } from './terrain.js';
import { bloomTarget, regionCenter } from './zones.js';

// KINDS rows: [speed, detect, atkCd, boltSpd(0=melee), hp, scale, drop]
export const KINDS = [
  [1.7, 6, 1.4, 0, 2, .85, 0],    // 0 minion — chaser
  [2.2, 15, 3.4, 7, 3, .85, 1],   // 1 mage — keeps range, lobs gloom
  [0, 16, 3.6, 5.5, 3, 1.3, 2],   // 2 turret — slow heavy shots
  [2.6, 8, 1.1, 0, 1, .6, 0],     // 3 rogue — fast, fragile (after 2 shards)
  [1.1, 5, 1.8, 0, 5, 1.2, 2],    // 4 warrior — slow tank (after 4 shards)
  [1.5, 99, 2.4, 6, 12, 2.6, 1],  // 5 GLOOM DRAGON — the finale
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
  eliteP = sh > 3 ? .2 : 0;
};

const spawn = (k, r, x, z, extra) => {
  const f = { k, r, x, z, y: surfaceHeight(x, z), yaw: 0,
    hp: Math.round(KINDS[k][4] * (k === 5 ? 1 : hpScale)),
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
      const a = Math.random() * 6.283, d = 5 + Math.random() * 11;
      const x = cx + Math.sin(a) * d, z = cz + Math.cos(a) * d;
      have++;
      if (Math.hypot(x, z) < 12) continue;              // never inside the house circle
      if (Math.hypot(x - pl.x, z - pl.z) < 13) continue; // never ambush-spawn on the player
      if (surfaceHeight(x, z) < .4) continue;            // never on the gray shore fringe / bare table
      spawn((have - 1) % kindN, i, x, z);
    }
  }
};


// the finale: the Gloom Dragon guards the last shard (rescue needs the area clear)
export const bossAt = (i) => {
  const [cx, cz] = regionCenter(i);
  spawn(5, i, cx + 3, cz + 3, {});
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
    if (T[3] && f.k !== 5) { // ranged — keeps range, lobs gloom
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
      if (f.k === 5) { // the dragon also breathes gloom while it hunts
        f.b = (f.b || 0) - dt;
        if (f.b <= 0) { f.b = 2.2; fire(f, pl.x, pl.y, pl.z, T[3]); }
      }
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
