#!/usr/bin/env node
// map-audit.mjs — RETURN LAW (L6) + GATE LAW (L5) enforcer for the unified world.
// Simulates conservative player movement at each ability tier, and FAILS (exit 1) if:
//   - any standable cell reachable from spawn cannot return to a campfire
//   - a boss or chest is unreachable at every audited tier
//
// Movement model (conservative, in tiles):
//   base:        jump rise <=2, drift <=5
//   +doublejump: rise <=4, drift <=6
//   +dash:       rise <=4, drift <=9
// Spikes (3) are hazards, never paths.
import { W, H, grid, seeds, BOUNCE } from '../src/world.js';

const TIERS = [
  { name: 'base       ', up: 2, h: 5 },
  { name: '+doublejump', up: 4, h: 6 },
  { name: '+dash      ', up: 4, h: 9 },
  { name: '+trijump   ', up: 6, h: 7 },      // TRI adds a 3rd jump → higher rise + slightly more air-drift
  { name: '+longdash  ', up: 4, h: 13 },     // LONG DASH doubles dash distance → wider horizontal reach
];

// Spawn point (matches main.js SX/SY = 126*T, 57*T → falls to ground row 60).
const SPAWN = [126, 59];
const BOSS_NAMES = ['RED   ', 'ORANGE', 'YELLOW', 'BLUE  ', 'VIOLET', 'GREEN ', 'INDIGO'];

const at = (c, r) => (c < 0 || c >= W || r >= H) ? 1 : r < 0 ? 0 : grid[r * W + c];
const idx = (c, r) => r * W + c;
const bounceStand = new Set((BOUNCE || []).map(([x, r]) => idx(x, r - 1)));   // cells you bounce FROM (stand row = solidRow-1)

let fail = 0;
const bossList = seeds.bosses || [];
const gates = {};                                    // first tier that reaches each named target

for (const tr of TIERS) {
  const solidV = (v) => v === 1;
  const blockV = (v) => solidV(v) || v === 3;
  const stand = (c, r) => r >= 0 && !blockV(at(c, r)) && (solidV(at(c, r + 1)) || at(c, r + 1) === 2);

  const standSet = new Set();
  for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) if (stand(c, r)) standSet.add(idx(c, r));

  const walled = (c1, r1, c2, r2) => {
    const s = Math.sign(c2 - c1), lo = Math.min(r1, r2);
    for (let ci = c1 + s; ci !== c2; ci += s)
      if (blockV(at(ci, r1)) && blockV(at(ci, r2)) && blockV(at(ci, lo - 1))) return 1;
    return 0;
  };
  const moves = (k) => {
    const c = k % W, r = (k - c) / W, list = [];
    for (let dr = 0; dr <= tr.up; dr++) for (let dc = -tr.h; dc <= tr.h; dc++) {
      if (!dr && !dc) continue;
      if (standSet.has(idx(c + dc, r - dr)) && !walled(c, r, c + dc, r - dr)) list.push(idx(c + dc, r - dr));
    }
    if (bounceStand.has(k)) {                                    // BOUNCE MUSHROOM — models the spring's extra rise (tier.up + 4)
      for (let dr = tr.up + 1; dr <= tr.up + 4; dr++) for (let dc = -tr.h; dc <= tr.h; dc++)
        if (standSet.has(idx(c + dc, r - dr)) && !walled(c, r, c + dc, r - dr)) list.push(idx(c + dc, r - dr));
    }
    for (let dc = -tr.h; dc <= tr.h; dc++) {
      if (blockV(at(c + dc, r))) continue;
      for (let rr = r + 1; rr < H; rr++) {
        if (blockV(at(c + dc, rr))) break;
        if (standSet.has(idx(c + dc, rr))) { list.push(idx(c + dc, rr)); break; }
      }
    }
    return list;
  };

  const bfs = (starts, adj) => {
    const seen = new Set(starts), q = [...starts];
    while (q.length) { const k = q.pop(); for (const t of adj(k)) if (!seen.has(t)) { seen.add(t); q.push(t); } }
    return seen;
  };

  const F = bfs([idx(...SPAWN)], moves);
  const rev = new Map();
  for (const k of F) for (const t of moves(k)) { if (!rev.has(t)) rev.set(t, []); rev.get(t).push(k); }
  const fireCells = [];
  for (const [fx, fy] of seeds.fires)
    for (let dc = -2; dc <= 2; dc++) for (let dr = -2; dr <= 2; dr++)
      if (standSet.has(idx((fx | 0) + dc, (fy | 0) + dr))) fireCells.push(idx((fx | 0) + dc, (fy | 0) + dr));
  const B = bfs(fireCells.filter(k => F.has(k)), (k) => rev.get(k) || []);
  const stuck = [...F].filter(k => !B.has(k));

  const reach = (px, py) => {
    for (let dc = -2; dc <= 2; dc++) for (let dr = -2; dr <= 2; dr++)
      if (F.has(idx((px | 0) + dc, (py | 0) + dr))) return 1;
    return 0;
  };

  bossList.forEach(([bx, by, bi]) => {
    const nm = 'boss ' + (BOSS_NAMES[bi] || bi);
    if (!gates[nm] && reach(bx, by)) gates[nm] = tr.name;
  });
  seeds.chests.forEach((c, i) => {
    const k = 'chest ' + i;
    if (!gates[k] && reach(c[0], c[1])) gates[k] = tr.name;
  });

  console.log(`  ${tr.name}  standable: ${F.size.toString().padStart(4)}  stuck: ${stuck.length}`);
  if (stuck.length) {
    fail = 1;
    for (const k of stuck.slice(0, 6)) console.log(`     ❌ STUCK (${k % W}, ${(k - k % W) / W})`);
  }
}

const line = (name, got) => {
  const g = got || 'UNREACHABLE';
  const status = got ? '✅' : '❌';
  console.log(`  ${name.padEnd(15)} got ${g}  ${status}`);
  if (!got) fail = 1;
};

console.log('\n=== MEADOW (unified world) ===');
bossList.forEach(([,,bi]) => { const nm = 'boss ' + (BOSS_NAMES[bi] || bi); line(nm, gates[nm]); });
seeds.chests.forEach((c, i) => line('chest ' + i, gates['chest ' + i]));

if (fail) { console.error('\n❌ MAP AUDIT FAILED'); process.exit(1); }
console.log('\n✅ map audit passed');
