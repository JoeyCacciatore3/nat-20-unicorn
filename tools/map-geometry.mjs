#!/usr/bin/env node
// map-geometry.mjs — GEOMETRY & SPACING validator for the unified world.
// STABLE MATHEMATICS derived from the verified jump physics (src/main.js):
//   T=16px · GV=900 (gravity) · JV=280 (jump launch, x3 = triple) · RUN=115 · bounce=-510 · PH=14px(0.9t) player height.
//   single jump rise = JV^2/(2*GV) = 2.72t ; airtime = 2*JV/GV = 0.62s → single drift = RUN*airtime = 4.5t.
//   Tiers (sim maxima, matches map-audit): base rise<=2 drift<=5 · DJ rise<=4 drift<=7 · TRI rise<=6 drift<=10 · bounce rise 9.
// These constants make platform placement CHECKABLE instead of eyeballed. ERRORs fail the build; WARNs are advisories.
import { W, H, grid, seeds } from '../src/world.js';

const AIR = 0, SOLID = 1, PLAT = 2, SPIKE = 3;
const at = (x, y) => (x < 0 || x >= W || y >= H) ? SOLID : y < 0 ? AIR : grid[y * W + x];

// ---- derived spacing constants (tiles) ----
const HEAD_MIN = 2;     // air tiles a platform needs ABOVE it to stand+jump (player 0.9t + jump clearance). 0 = buried under ceiling.
const HEAD_STAND = 1;   // absolute floor: <1 air above = you can't even stand (hard error).
const VSTACK_MIN = 3;   // min vertical gap between platforms stacked in the same column (>= one single jump, 2.72t→3). <3 = cramped.
const HGAP_MAX = 10;    // max horizontal edge gap that can still be a route (TRI drift). >10 between "route" platforms = unreachable-looking.

const errs = [], warns = [];
const E = (m) => errs.push(m), Wn = (m) => warns.push(m);

// platform rects (v==2) with their painted footprint
const plats = seeds.MAP.filter(r => r[4] === PLAT).map(([x, y, w, h]) => ({ x, y, w, h: h || 1, x2: x + w - 1, y2: y + (h || 1) - 1 }));
const solids = seeds.MAP.filter(r => r[4] === undefined || r[4] === SOLID).map(([x, y, w, h]) => ({ x, y, w, h, x2: x + w - 1, y2: y + h - 1 }));

// ============ RULE 1 — CEILING CLEARANCE / HEADROOM ============
// Every platform tile must have air above it. 0 air = platform welded to a ceiling (the cave drop-down complaint);
// 1 air = you can stand but not jump up from it. Aggregated per rect so one message per platform.
for (const p of plats) {
  let minHead = 99, buried = 0;
  for (let x = p.x; x <= p.x2; x++) {
    if (at(x, p.y) !== PLAT) continue;          // tile was overpainted (see RULE 2) — skip for headroom
    let air = 0, yy = p.y - 1;
    while (yy >= 0 && at(x, yy) === AIR) { air++; yy--; }
    const blocker = at(x, yy);                   // what caps the air column (0 only if it reached the sky top)
    if (yy < 0) air = 99;                          // open sky above — infinite headroom
    if (air < minHead) minHead = air;
    if (air < HEAD_STAND && blocker === SOLID) buried++;
  }
  if (minHead === 99) continue;                    // fully open above — fine
  const tag = `[${p.x},${p.y},w${p.w}]`;
  if (buried) E(`RULE1 HEADROOM: platform ${tag} has ${buried} tile(s) welded under a solid ceiling (0 air above) — move it down or shrink it so it clears the ceiling by >=${HEAD_MIN}t`);
  else if (minHead < HEAD_MIN) Wn(`RULE1 HEADROOM: platform ${tag} has only ${minHead}t air above (want >=${HEAD_MIN}t so you can jump up from it)`);
}

// ============ RULE 2 — NO PLATFORM BURIED IN TERRAIN (trim to what sticks out) ============
// A platform rect whose tiles DON'T survive as PLAT in the painted grid is overlapping solid terrain.
// Fix: shrink the rect so only the protruding part is a platform (it should look like a lip sticking out of the hill).
for (const p of plats) {
  let buried = 0;
  for (let x = p.x; x <= p.x2; x++) for (let y = p.y; y <= p.y2; y++)
    if (at(x, y) !== PLAT) buried++;
  if (buried) Wn(`RULE2 OVERLAP: platform [${p.x},${p.y},w${p.w}] has ${buried} tile(s) swallowed by terrain/other rects — trim the rect so only the protruding lip is a platform`);
}

// ============ RULE 3 — VERTICAL STACK SPACING (>= one single jump) ============
// Platforms stacked in overlapping columns must be >= VSTACK_MIN apart (so climbing always takes a real jump,
// never a cramped 1-tile shuffle) — and never share a row (redundant double-paint).
for (let i = 0; i < plats.length; i++) for (let j = i + 1; j < plats.length; j++) {
  const a = plats[i], b = plats[j];
  if (a.x > b.x2 || b.x > a.x2) continue;          // no column overlap → not a stack
  const gap = Math.abs(a.y - b.y);
  if (gap === 0) Wn(`RULE3 STACK: platforms [${a.x},${a.y}] & [${b.x},${b.y}] share row ${a.y} and overlap in x — redundant, merge them`);
  else if (gap < VSTACK_MIN) Wn(`RULE3 STACK: platforms [${a.x},${a.y}] & [${b.x},${b.y}] are only ${gap}t apart vertically in an overlapping column — cramped (want >=${VSTACK_MIN}t = one jump)`);
}

// ============ RULE 4 — ISOLATED-LEDGE GAP (leads-nowhere feel check) ============
// Only flags a platform that has NO neighbour within one TRI jump (rise<=6 AND drift<=HGAP_MAX) in EITHER x direction
// AND isn't within jump range of the ground — a genuinely stranded ledge. (Cross-map same-row pairs are NOT compared.)
const near = (a, b) => Math.abs(a.y - b.y) <= 6 && (b.x - a.x2 - 1 <= HGAP_MAX && a.x - b.x2 - 1 <= HGAP_MAX);
for (const p of plats) {
  if (p.y >= 24) continue;                                   // caves handled by RULE1/3 + map-audit
  const groundReach = (18 - p.y) <= 6;                        // within a TRI jump of the ground highway (row 18) → not stranded
  const hasNeighbour = plats.some(q => q !== p && near(p, q));
  if (!groundReach && !hasNeighbour) Wn(`RULE4 ISOLATED: platform [${p.x},${p.y},w${p.w}] has no platform within a jump and isn't within a jump of the ground — reads as leading nowhere`);
}

// ---- report ----
console.log('=== MAP GEOMETRY (stable-math validator) ===');
console.log(`  platforms: ${plats.length} · ERRORS: ${errs.length} · warnings: ${warns.length}`);
for (const m of errs) console.log(`  ❌ ${m}`);
for (const m of warns) console.log(`  ⚠ ${m}`);
if (errs.length) { console.error('\n❌ MAP GEOMETRY FAILED'); process.exit(1); }
console.log('\n✅ map geometry passed' + (warns.length ? ` (${warns.length} advisory warning${warns.length > 1 ? 's' : ''})` : ''));
