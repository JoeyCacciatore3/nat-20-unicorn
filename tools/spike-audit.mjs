// spike-audit.mjs — placement safety net for chests, decor, and critical seeds.
//
// Failure modes this catches:
//   1. SPIKE OVERLAP — groundRow() skips spike tiles when searching downward for
//      a snap surface. Chest/decor in a column with a spike-above-solid drops THROUGH
//      the spike layer and renders INSIDE it.
//   2. DECOR STACK  — two hand-placed DECO seeds at the same tile column overlap
//      visually (both snap to the same ground surface).
//   3. DECOR ON CRITICAL — hand-placed DECO at the same tile column as a chest
//      or boss obscures gameplay-relevant sprites.
//   4. SCATTER ON SPIKE — a scattered decoration landing on/above a spike tile.
//
// Run: node tools/spike-audit.mjs   (exits non-zero on any violation)
import { seeds, DECO, grid, T, W, H, groundRow } from '../src/world.js';

const AIR = 0, SOLID = 1, PLAT = 2, SPIKE = 3;
const at = (x, y) => (x < 0 || x >= W || y < 0 || y >= H) ? -1 : grid[y * W + x];

let violations = 0;
const report = (kind, i, seed, detail) => {
  violations++;
  console.log(`  ✗ ${kind} ${i} [${seed.join(', ')}] — ${detail}`);
};

// For each column, does any spike sit between seedY (inclusive) and stopRow (exclusive)?
const spikeBetween = (tx, seedY, stopRow) => {
  for (let y = seedY; y < stopRow; y++) if (at(tx, y) === SPIKE) return y;
  return -1;
};

console.log('MEADOW placement audit');

// --- CHESTS ---
// Snap: y = groundRow((x*T+4)/T|0, y|0) * T - 5  → sits ON the first solid/platform at/below seed.
seeds.chests.forEach((c, i) => {
  const [cx, cy] = c;
  const tx = ((cx * T + 4) / T) | 0;             // same rounding as snapChest in main.js
  const surf = groundRow(tx, cy | 0);
  const sp = spikeBetween(tx, cy | 0, surf);
  if (sp >= 0) report('CHEST', i, c, `spike at row ${sp} between seed y=${cy} and snap surface row ${surf}`);
  for (const dx of [-1, 1]) {
    const surfN = groundRow(tx + dx, cy | 0);
    const spN = spikeBetween(tx + dx, cy | 0, surfN);
    if (spN >= 0) report('CHEST', i, c, `adjacent-column spike at (${tx + dx}, ${spN}) — chest sprite bleeds into spike`);
  }
});

// --- HAND-PLACED DECO ---
// Snap in world.js: [x, groundRow(x, y+1) - 1, t]  → sits one row above first solid/platform ≥ y+1.
const hand = seeds.DECO;
hand.forEach((d, i) => {
  const [dx, dy] = d;
  const surf = groundRow(dx, dy + 1);
  const sp = spikeBetween(dx, dy, surf);
  if (sp >= 0) report('DECO ', i, d, `spike at row ${sp} between seed y=${dy} and snap surface row ${surf} (snap→row ${surf - 1})`);
});

// --- PROCEDURAL SCATTER ---
const scatter = DECO.slice(hand.length);
scatter.forEach((d, i) => {
  const [dx, dy] = d;
  if (at(dx, dy) === SPIKE) report('SCTTR', i, d, `scattered onto spike tile at (${dx}, ${dy})`);
  if (at(dx, dy + 1) === SPIKE) report('SCTTR', i, d, `scattered above spike at (${dx}, ${dy + 1})`);
});

// --- DECOR STACK + ADJACENT-TREE CROWDING ---
// Trees (dt 0/4) have 14-wide canopies — adjacent tiles crowd. Non-tree fits within tile.
const snapped = hand.map(d => [d[0], groundRow(d[0], d[1] + 1) - 1, d[2], d]);
for (let a = 0; a < snapped.length; a++) {
  for (let b = a + 1; b < snapped.length; b++) {
    const [x1, y1, t1, s1] = snapped[a], [x2, y2, t2, s2] = snapped[b];
    if (Math.abs(y1 - y2) > 1) continue;
    const dx = Math.abs(x1 - x2);
    if (dx === 0) report('DECO ', b, s2, `same-tile collision with DECO ${a} at (${x1},${y1})`);
    else if (dx === 1 && (t1 === 0 || t1 === 4) && (t2 === 0 || t2 === 4)) {
      report('DECO ', b, s2, `adjacent-tree crowding with DECO ${a} at x=${x1} (14-wide canopies touch)`);
    }
  }
}

// --- DECOR OVER STATIC CRITICAL SEED ---
const critical = [
  ...seeds.chests.map((s, i) => ['chest', i, s[0], (s[1] | 0) - 1]),
  ...seeds.bosses.map((s, i) => ['boss ', i, s[0], s[1]]),

];
hand.forEach((d, i) => {
  const [dx, dy] = d;
  const dSnap = groundRow(dx, dy + 1) - 1;
  critical.forEach(([kind, ci, cx, cy]) => {
    if (dx === cx && Math.abs(dSnap - cy) <= 2) {
      report('DECO ', i, d, `overlaps ${kind} ${ci} at (${cx},${cy}) — decor snap y=${dSnap}`);
    }
  });
});

if (violations === 0) console.log('  ✓ clean');
console.log(`\n${violations === 0 ? '✅ PLACEMENT CLEAN' : `❌ ${violations} violation(s) — fix world.js seeds`}`);
process.exit(violations === 0 ? 0 : 1);
