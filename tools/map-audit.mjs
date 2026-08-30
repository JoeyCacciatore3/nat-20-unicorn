#!/usr/bin/env node
// map-audit.mjs — RETURN LAW (L6) + GATE LAW (L5) enforcer for ALL 5 zones.
// Simulates conservative player movement across each zone's grid, at each
// ability tier, and FAILS (exit 1) if:
//   - any standable cell you can reach cannot return to a campfire
//   - a required gate is reachable without its intended ability
//   - a boss or return portal is unreachable at its zone's tier
//
// Movement model (conservative, in tiles):
//   base:        jump rise <=2, drift <=5
//   +doublejump: rise <=4, drift <=6
//   +dash:       rise <=4, drift <=9
//   +shot:       same as +dash, dark crystal (tile 4) removed
// Spikes (3) are hazards, never paths.
import { W, H, grid, seeds, loadZone } from '../src/world.js';

const TIERS = [
  { name: 'base       ', up: 2, h: 5, gloom: 0 },
  { name: '+doublejump', up: 4, h: 6, gloom: 0 },
  { name: '+dash      ', up: 4, h: 9, gloom: 0 },
  { name: '+shot      ', up: 4, h: 9, gloom: 1 },
];

// Per-zone spawn positions (tile where player stands after entry-fall).
// Zone 0: player spawn point SX/SY = (126, 57) → falls to (126, 59) on ground row 60.
// Zones 1-4: portal-spawn positions from Z0.doors, each falls to its zone's ground.
const ZONE_META = [
  { name: 'MEADOW', spawn: [126, 59], hub: true  },
  { name: 'CAVE  ', spawn: [40, 59],  hub: false },
  { name: 'CLIFFS', spawn: [40, 41],  hub: false },
  { name: 'PEAK  ', spawn: [40, 31],  hub: false },
  { name: 'DEPTHS', spawn: [40, 59],  hub: false },
];

// Zone 0 hub — each portal MUST be reachable at exactly its designed tier.
// Positions read from seeds.doors[i] at run time (single source of truth).
// Names + expected tiers indexed to match Z0.doors order in world.js.
const HUB_PORTAL_NAMES = ['CAVE portal  ', 'CLIFFS portal', 'PEAK portal  ', 'DEPTHS portal'];
const HUB_PORTAL_EXPECT = ['base       ', '+doublejump', '+shot      ', '+dash      '];

const at = (c, r) => (c < 0 || c >= W || r >= H) ? 1 : r < 0 ? 0 : grid[r * W + c];
const idx = (c, r) => r * W + c;

let fail = 0;

const auditZone = (zi, meta) => {
  loadZone(zi);
  const bossPos = seeds.bosses[0] || null;
  const doors = seeds.doors || [];
  console.log(`\n=== ZONE ${zi}: ${meta.name.trim()} ${meta.hub ? '(HUB)' : ''} ===`);

  const tiersToRun = TIERS;                            // audit ALL tiers per zone — chests may be climb-rewards requiring DJ+
  const gates = {};                                    // first tier that reaches each named target

  for (const tr of tiersToRun) {
    const solidV = (v) => v === 1 || (v === 4 && !tr.gloom);
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

    const F = bfs([idx(...meta.spawn)], moves);
    const rev = new Map();
    for (const k of F) for (const t of moves(k)) { if (!rev.has(t)) rev.set(t, []); rev.get(t).push(k); }
    const fireCells = [];
    for (const [fx, fy] of seeds.fires)
      for (let dc = -2; dc <= 2; dc++) for (let dr = -2; dr <= 2; dr++)
        if (standSet.has(idx((fx | 0) + dc, (fy | 0) + dr))) fireCells.push(idx((fx | 0) + dc, (fy | 0) + dr));
    const B = bfs(fireCells.filter(k => F.has(k)), (k) => rev.get(k) || []);

    const stuck = [...F].filter(k => !B.has(k));

    // Check targets — first tier that reaches wins
    const reach = (px, py) => {
      for (let dc = -2; dc <= 2; dc++) for (let dr = -2; dr <= 2; dr++)
        if (F.has(idx((px | 0) + dc, (py | 0) + dr))) return 1;
      return 0;
    };

    if (bossPos && !gates.boss && reach(bossPos[0], bossPos[1])) gates.boss = tr.name;
    seeds.chests.forEach((c, i) => {   // every chest must be reachable at SOME tier (records first)
      const k = 'chest ' + i;
      if (!gates[k] && reach(c[0], c[1])) gates[k] = tr.name;
    });
    if (meta.hub) {
      doors.forEach((d, i) => {
        const nm = HUB_PORTAL_NAMES[i];
        if (nm && !gates[nm] && reach(d[0], d[1])) gates[nm] = tr.name;
      });
    } else {
      for (const d of doors)
        if (!gates['return portal'] && reach(d[0], d[1])) gates['return portal'] = tr.name;
    }

    console.log(`  ${tr.name}  standable: ${F.size.toString().padStart(4)}  stuck: ${stuck.length}`);
    if (stuck.length) {
      fail = 1;
      for (const k of stuck.slice(0, 6)) console.log(`     ❌ STUCK (${k % W}, ${(k - k % W) / W})`);
    }
  }

  // Report gate results
  const line = (name, got, exp) => {
    const g = got || 'UNREACHABLE';
    const status = !got ? '❌' : exp && g.trim() !== exp.trim() ? '⚠' : '✅';
    console.log(`  ${name.padEnd(15)} ${exp ? `expect ${exp}  ` : ''}got ${g}  ${status}`);
    if (!got || (exp && g.trim() !== exp.trim())) fail = 1;
  };

  if (bossPos) line('boss', gates.boss);
  seeds.chests.forEach((c, i) => line('chest ' + i, gates['chest ' + i]));
  if (meta.hub) {
    HUB_PORTAL_NAMES.forEach((nm, i) => line(nm, gates[nm], HUB_PORTAL_EXPECT[i]));
  } else {
    line('return portal', gates['return portal']);
  }
};

for (let z = 0; z < 5; z++) auditZone(z, ZONE_META[z]);

if (fail) { console.error('\n❌ MAP AUDIT FAILED'); process.exit(1); }
console.log('\n✅ map audit passed — all 5 zones verified');
