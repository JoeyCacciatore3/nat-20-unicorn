#!/usr/bin/env node
// map-audit.mjs — RETURN LAW (L6) enforcer. Simulates conservative player
// movement over the tile grid at each ability tier and FAILS (exit 1) if any
// standable cell you can reach cannot get back to a campfire with the same
// moveset. Also reports which tier first reaches each boss arena (GATE LAW).
//
// Movement model (conservative, in tiles):
//   base:        jump rise <=2, jump/fall drift <=4
//   +doublejump: rise <=4, drift <=6
//   +dash:       rise <=4, drift <=9
//   +shot:       same as +dash, gloom crystal (tile 4) removed
// Spikes (3) are treated as walls: the engine rescues on touch, so they are
// hazards, never paths — and never traps.
import { W, H, grid, seeds } from '../src/world.js';

const TIERS = [
  { name: 'base       ', up: 2, h: 4, gloom: 0 },
  { name: '+doublejump', up: 4, h: 6, gloom: 0 },
  { name: '+dash      ', up: 4, h: 9, gloom: 0 },
  { name: '+shot      ', up: 4, h: 9, gloom: 1 },
];
const at = (c, r) => (c < 0 || c >= W || r >= H) ? 1 : r < 0 ? 0 : grid[r * W + c];
const idx = (c, r) => r * W + c;

// Boss arenas (from seeds.bosses) — each at its world-tile coordinate
const BOSS_POS = seeds.bosses;
const NAMES = ['MEADOW', 'CAVES', 'TREETOP', 'SUMMIT', 'HEART'];
const EXPECT = ['base', '+doublejump', '+doublejump', '+shot', '+dash'];

let fail = 0;
const bossTier = BOSS_POS.map(() => null);

for (const tr of TIERS) {
  const solidV = (v) => v === 1 || (v === 4 && !tr.gloom);
  const blockV = (v) => solidV(v) || v === 3;
  const stand = (c, r) => r >= 0 && !blockV(at(c, r)) && (solidV(at(c, r + 1)) || at(c, r + 1) === 2);

  const standSet = new Set();
  for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) if (stand(c, r)) standSet.add(idx(c, r));

  // a jump is walled off if an intermediate column is solid at both endpoint
  // heights AND above them (a real wall, not a thin platform)
  const walled = (c1, r1, c2, r2) => {
    const s = Math.sign(c2 - c1), lo = Math.min(r1, r2);
    for (let ci = c1 + s; ci && ci !== c2; ci += s)
      if (blockV(at(ci, r1)) && blockV(at(ci, r2)) && blockV(at(ci, lo - 1))) return 1;
    return 0;
  };
  const moves = (k) => {
    const c = k % W, r = (k - c) / W, list = [];
    for (let dr = 0; dr <= tr.up; dr++) for (let dc = -tr.h; dc <= tr.h; dc++) {
      if (!dr && !dc) continue;
      if (standSet.has(idx(c + dc, r - dr)) && !walled(c, r, c + dc, r - dr)) list.push(idx(c + dc, r - dr));
    }
    for (let dc = -tr.h; dc <= tr.h; dc++) {                     // falls: drift then drop
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

  const F = bfs([idx(126, 59)], moves);                          // forward from spawn

  const rev = new Map();                                         // reverse edges over F
  for (const k of F) for (const t of moves(k)) { if (!rev.has(t)) rev.set(t, []); rev.get(t).push(k); }
  const fireCells = [];
  for (const [fx, fy] of seeds.fires)
    for (let dc = -2; dc <= 2; dc++) for (let dr = -2; dr <= 2; dr++)
      if (standSet.has(idx((fx | 0) + dc, (fy | 0) + dr))) fireCells.push(idx((fx | 0) + dc, (fy | 0) + dr));
  const B = bfs(fireCells.filter(k => F.has(k)), (k) => rev.get(k) || []);

  const stuck = [...F].filter(k => !B.has(k));
  BOSS_POS.forEach(([bx, by], i) => {
    if (bossTier[i] !== null) return;
    for (let dc = -2; dc <= 2; dc++) for (let dr = -2; dr <= 2; dr++)
      if (F.has(idx((bx | 0) + dc, (by | 0) + dr))) { bossTier[i] = tr.name.trim(); return; }
  });

  console.log(`tier ${tr.name}  standable in reach: ${F.size}  stuck: ${stuck.length}`);
  if (stuck.length) {
    fail = 1;
    for (const k of stuck.slice(0, 12)) console.log(`   ❌ STUCK at tile (${k % W}, ${(k - k % W) / W}) — reachable, cannot return to a campfire`);
  }
}

console.log('boss gating (first tier that reaches each arena):');
BOSS_POS.forEach((s, i) => console.log(`   ${NAMES[i].padEnd(12)} -> ${bossTier[i] || '❌ UNREACHABLE AT ANY TIER'}`));
BOSS_POS.forEach((s, i) => {
  if (!bossTier[i]) { fail = 1; return; }
  if (bossTier[i] !== EXPECT[i]) console.log(`   ⚠ GATE: ${NAMES[i]} expected ${EXPECT[i]}, got ${bossTier[i]}`);
});

if (fail) { console.error('❌ MAP AUDIT FAILED — Return Law violated.'); process.exit(1); }
console.log('✅ map audit passed — no stuck spots at any tier');
