// spike-audit.mjs — placement safety net for chests + procedural decoration.
//
// Failure modes this catches:
//   1. SPIKE OVERLAP — groundRow() skips spike tiles when searching downward for
//      a snap surface. A chest in a column with a spike-above-solid drops THROUGH
//      the spike layer and renders INSIDE it (checks the chest column + neighbors).
//   2. SCATTER ON SPIKE — a scattered / PEAKDECO decoration on/above a spike tile.
//
// NOTE: hand-placed DECO (seeds.DECO) was retired 2026-09-08 and the map editor emits
// none, so the old DECOR-STACK / crowding / DECOR-OVER-CRITICAL checks were dead and
// have been removed. Revive from git if that feature ever returns.
//
// Run: node tools/spike-audit.mjs   (exits non-zero on any violation)
import { seeds, DECO, grid, T, W, H, groundRow } from '../src/world.js';

const SPIKE = 3;   // grid tile values: 0=air · 1=solid · 2=platform · 3=spike
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

// --- PROCEDURAL SCATTER (all DECO: PEAKDECO stone props + scatter()) ---
const scatter = DECO;
scatter.forEach((d, i) => {
  const [dx, dy] = d;
  if (at(dx, dy) === SPIKE) report('SCTTR', i, d, `scattered onto spike tile at (${dx}, ${dy})`);
  if (at(dx, dy + 1) === SPIKE) report('SCTTR', i, d, `scattered above spike at (${dx}, ${dy + 1})`);
});

if (violations === 0) console.log('  ✓ clean');
console.log(`\n${violations === 0 ? '✅ PLACEMENT CLEAN' : `❌ ${violations} violation(s) — fix world.js seeds`}`);
process.exit(violations === 0 ? 0 : 1);
