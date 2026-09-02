// spike-audit.mjs — placement safety net for chests, decor, and critical seeds.
//
// Failure modes this catches:
//   1. SPIKE OVERLAP — groundRow() skips spike tiles when searching downward for
//      a snap surface. Chest/decor in a column with a spike-above-solid drops THROUGH
//      the spike layer and renders INSIDE it.
//   2. DECOR STACK  — two hand-placed DECO seeds at the same tile column overlap
//      visually (both snap to the same ground surface).
//   3. DECOR ON CRITICAL — hand-placed DECO at the same tile column as a chest,
//      foe, boss, fire, or door obscures gameplay-relevant sprites.
//
// Run: node tools/spike-audit.mjs   (exits non-zero on any violation)
import { loadZone, seeds, DECO, grid, T, W, H, groundRow } from '../src/world.js';

const AIR = 0, SOLID = 1, PLAT = 2, SPIKE = 3;
const at = (x, y) => (x < 0 || x >= W || y < 0 || y >= H) ? -1 : grid[y * W + x];

const ZN = ['MEADOW', 'CLIFFS', 'PEAK', 'DEPTHS'];
let violations = 0;
const report = (z, kind, i, seed, detail) => {
  violations++;
  console.log(`  ✗ Z${z} ${ZN[z]} ${kind} ${i} [${seed.join(', ')}] — ${detail}`);
};

// For each column, does any spike sit between seedY (inclusive) and stopRow (exclusive)?
const spikeBetween = (tx, seedY, stopRow) => {
  for (let y = seedY; y < stopRow; y++) if (at(tx, y) === SPIKE) return y;
  return -1;
};

for (let z = 0; z < ZN.length; z++) {
  loadZone(z);
  console.log(`\nZone ${z} — ${ZN[z]}`);
  const zBefore = violations;

  // --- CHESTS ---
  // Snap: y = groundRow((x*T+4)/T|0, y|0) * T - 5  → sits ON the first solid/platform at/below seed.
  // Violation: any spike between the seed row and the snap surface = chest crossed a spike layer.
  seeds.chests.forEach((c, i) => {
    const [cx, cy] = c;
    const tx = ((cx * T + 4) / T) | 0;             // same rounding as snapChest in main.js
    const surf = groundRow(tx, cy | 0);
    const sp = spikeBetween(tx, cy | 0, surf);
    if (sp >= 0) report(z, 'CHEST', i, c, `spike at row ${sp} between seed y=${cy} and snap surface row ${surf}`);
    // Also check neighbouring cells in a small footprint (chest is ~1 tile wide but sprite bleeds ±1)
    for (const dx of [-1, 1]) {
      const surfN = groundRow(tx + dx, cy | 0);
      const spN = spikeBetween(tx + dx, cy | 0, surfN);
      if (spN >= 0) report(z, 'CHEST', i, c, `adjacent-column spike at (${tx + dx}, ${spN}) — chest sprite bleeds into spike`);
    }
  });

  // --- HAND-PLACED DECO ---
  // Snap in world.js: [x, groundRow(x, y+1) - 1, t]  → sits one row above first solid/platform ≥ y+1.
  // Violation: any spike between seed y and snap row = decor visually drawn on spike.
  const hand = seeds.DECO;
  hand.forEach((d, i) => {
    const [dx, dy, dt] = d;
    const surf = groundRow(dx, dy + 1);
    const snapY = surf - 1;
    const sp = spikeBetween(dx, dy, surf);
    if (sp >= 0) report(z, 'DECO ', i, d, `spike at row ${sp} between seed y=${dy} and snap surface row ${surf} (snap→row ${snapY})`);
  });

  // --- PROCEDURAL SCATTER ---
  // Scatter finds LOWEST tile-1 with air above; places at surf-1. Skips 2/3 (spike/platform)
  // as surfaces already. Safety check: verify no scattered decor cell is on a spike row.
  const scatter = DECO.slice(hand.length);
  scatter.forEach((d, i) => {
    const [dx, dy, dt] = d;
    if (at(dx, dy) === SPIKE) report(z, 'SCTTR', i, d, `scattered onto spike tile at (${dx}, ${dy})`);
    // spike directly below the decor's ground = decor "on top of spike pit lip"
    if (at(dx, dy + 1) === SPIKE) report(z, 'SCTTR', i, d, `scattered above spike at (${dx}, ${dy + 1})`);
  });

  // --- DECOR STACK (two hand-placed DECO at same snapped position) ---
  // Compare snap positions (post-groundRow) — same column but different y-strata is fine.
  const seenAt = new Map();
  hand.forEach((d, i) => {
    const [dx, dy] = d;
    const snapY = groundRow(dx, dy + 1) - 1;
    const key = `${dx},${snapY}`;
    if (seenAt.has(key)) report(z, 'DECO ', i, d, `snap collision at (${dx},${snapY}) — another DECO idx ${seenAt.get(key)}`);
    else seenAt.set(key, i);
  });

  // --- DECOR OVER STATIC CRITICAL SEED (chest/boss/fire/door) ---
  // Foes are dynamic (move around) — grass at foe spawn is not an overlap. Only static
  // gameplay sprites matter: chests, bosses, campfires, portal doors.
  const critical = [
    ...seeds.chests.map((s, i) => ['chest', i, s[0], (s[1] | 0) - 1]),   // chest snap≈seed Y (already ground-adjusted)
    ...seeds.bosses.map((s, i) => ['boss ', i, s[0], s[1]]),
    ...seeds.fires.map((s, i) => ['fire ', i, s[0], s[1] | 0]),
    ...seeds.doors.map((s, i) => ['door ', i, s[0], s[1]]),
  ];
  hand.forEach((d, i) => {
    const [dx, dy] = d;
    const dSnap = groundRow(dx, dy + 1) - 1;
    critical.forEach(([kind, ci, cx, cy]) => {
      if (dx === cx && Math.abs(dSnap - cy) <= 2) {
        report(z, 'DECO ', i, d, `overlaps ${kind} ${ci} at (${cx},${cy}) — decor snap y=${dSnap}`);
      }
    });
  });

  if (violations === zBefore) console.log('  ✓ clean');
}

console.log(`\n${violations === 0 ? '✅ ALL ZONES CLEAN' : `❌ ${violations} violation(s) — fix world.js seeds`}`);
process.exit(violations === 0 ? 0 : 1);
