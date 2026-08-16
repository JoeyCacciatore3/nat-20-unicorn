// enemies.js — gloomlings (the DM's doubt): chaser / shooter / turret,
// with the 13th-Floor rubber-band aggression scalar.
import { surfaceHeight } from './terrain.js';
import { bloom, regionCenter } from './zones.js';

export const foes = [];   // {k,r,x,y,z,yaw,hp,t,cd,flash}
export const bolts = [];  // {x,y,z,vx,vy,vz,life}
export let aggro = .45;
export const nudgeAggro = (d) => aggro = Math.min(1, Math.max(0, aggro + d));

let waveT = 0;
export const tickSpawns = (dt) => { // keep un-restored chapters haunted
  waveT -= dt;
  if (waveT > 0) return;
  waveT = 4;
  for (let i = 0; i < 7; i++) {
    if (bloom[i] > .5) continue;
    let have = 0;
    for (const f of foes) if (f.r === i) have++;
    while (have < 3) {
      const [cx, cz] = regionCenter(i);
      const a = Math.random() * 6.283, d = 3 + Math.random() * 8;
      const x = cx + Math.sin(a) * d, z = cz + Math.cos(a) * d;
      if (Math.hypot(x, z) < 12) { have++; continue; } // never inside the house circle
      foes.push({ k: have % 3, r: i, x, z, y: surfaceHeight(x, z), yaw: 0,
                  hp: 2 + have % 3, t: Math.random() * 9, cd: 1 + Math.random(), flash: 0 });
      have++;
    }
  }
};

// gloom raid: chasers spawned at a freed chapter, marching on the house
export const raid = (i) => {
  const [cx, cz] = regionCenter(i);
  for (let n = 0; n < 3; n++) {
    const a = Math.random() * 6.283;
    const x = cx + Math.sin(a) * 3, z = cz + Math.cos(a) * 3;
    foes.push({ k: 0, r: i, x, z, y: surfaceHeight(x, z), yaw: 0,
                hp: 2, t: Math.random() * 9, cd: 1, flash: 0, raid: 1 });
  }
};

const fire = (f, px, py, pz, spd) => {
  const dx = px - f.x, dy = py + 1 - f.y - 1.2, dz = pz - f.z;
  const d = Math.hypot(dx, dy, dz) || 1;
  bolts.push({ x: f.x, y: f.y + 1.2, z: f.z, vx: dx / d * spd, vy: dy / d * spd, vz: dz / d * spd, life: 2.6 });
};

// api: { touch(f), boltHit(b) }
export const update = (pl, dt, api) => {
  for (const f of foes) {
    f.t += dt; f.cd -= dt; if (f.flash > 0) f.flash -= dt;
    const dx = pl.x - f.x, dz = pl.z - f.z, d = Math.hypot(dx, dz);
    if (f.raid && d > 5) {    // raider — marches on the house unless you engage
      const hd = Math.hypot(f.x, f.z);
      if (hd > 4) {
        const s = 2.6 * dt / hd;
        f.x -= f.x * s; f.z -= f.z * s;
        f.yaw = Math.atan2(-f.x, -f.z);
      }
      api.march && api.march(f);
      if (f.cd <= 0) f.cd = .3;
    } else if (f.k === 0) {   // chaser — hunts in a radius that grows with aggro
      if (d < 9 + 6 * aggro && d > 1.1) {
        const s = (2 + 2.8 * aggro) * dt / d;
        f.x += dx * s; f.z += dz * s;
        f.yaw = Math.atan2(dx, dz);
      }
      if (d < 1.4 && f.cd <= 0) { f.cd = 1.1; api.touch(f); }
    } else if (f.k === 1) {   // shooter — keeps range, lobs gloom
      if (d < 17) {
        f.yaw = Math.atan2(dx, dz);
        if (d < 5.5) { const s = 2.2 * dt / d; f.x -= dx * s; f.z -= dz * s; }
        if (f.cd <= 0) { f.cd = 2.8 - 1.5 * aggro; fire(f, pl.x, pl.y, pl.z, 8); }
      }
    } else if (d < 19 && f.cd <= 0) { // turret — slow heavy shots
      f.cd = 3.6 - 1.7 * aggro;
      fire(f, pl.x, pl.y, pl.z, 5.5);
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
