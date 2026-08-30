#!/usr/bin/env node
// tpos-check.mjs — verify src/main.js's precomputed TPOS still matches what the
// original derivation would produce from the current TREE. Fails the build if
// the tree has been edited without regenerating TPOS.
//
// If this fails, run: `node tools/tpos-check.mjs --print` and paste the
// printed line into src/main.js (the TPOS = [...] line).
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');

// Extract TREE literal — the block bounded by `const TREE = [` … `];`
const treeMatch = src.match(/const TREE = \[([\s\S]*?)\n\];/);
if (!treeMatch) { console.error('❌ TPOS check: TREE literal not found'); process.exit(1); }

// Grab each row as ['NAME', N] tuples. Comments/whitespace ignored.
const TREE = [];
const rowRe = /\[\s*'([^']+)'\s*,\s*(-?\d+)\s*\]/g;
let m; while ((m = rowRe.exec(treeMatch[1])) !== null) TREE.push([m[1], +m[2]]);

// Reproduce the original derivation.
const TD = []; TREE.forEach((n, i) => TD[i] = n[1] < 0 ? 0 : TD[n[1]] + 1);
const TPOS = []; { let r = 0; for (let t = 0; t <= Math.max(...TD); t++) {
  const tier = []; TREE.forEach((n, i) => TD[i] === t && tier.push(i));
  tier.sort((a, b) => (TREE[a][1] < 0 ? a * 20 : TPOS[TREE[a][1]][0]) - (TREE[b][1] < 0 ? b * 20 : TPOS[TREE[b][1]][0]));
  let c = 0; tier.forEach(i => { if (c === 4) { c = 0; r++; } TPOS[i] = [170 + c * 78, 54 + r * 16]; c++; }); r++;
} }
const expected = JSON.stringify(TPOS).replace(/,/g, ',');

if (process.argv.includes('--print')) {
  console.log(`const TPOS = ${expected};`);
  process.exit(0);
}

// Extract the current TPOS literal from source.
const posMatch = src.match(/const TPOS = (\[[^\n]+\]);/);
if (!posMatch) { console.error('❌ TPOS check: TPOS literal not found'); process.exit(1); }
const actual = posMatch[1].replace(/\s+/g, '');

if (actual !== expected) {
  console.error('❌ TPOS drift: TREE was edited but TPOS was not regenerated.');
  console.error(`   expected: ${expected}`);
  console.error(`   actual:   ${actual}`);
  console.error(`   fix: node tools/tpos-check.mjs --print   (paste output into src/main.js)`);
  process.exit(1);
}

// PAL length gate — gear color range at line "4 + Math.random() * 11" assumes
// PAL.length === 15 (4 skin/neutral + 11 vivid). If PAL is trimmed/extended,
// that literal 11 must move with it.
const palMatch = src.match(/const PAL = \[([\s\S]*?)\n\];/);
if (palMatch) {
  const swatches = (palMatch[1].match(/'#[^']+'/g) || []).length;
  const gearRangeMatch = src.match(/Math\.random\(\) \* (\d+)\) \| 0;? *const t/);
  const gearRange = gearRangeMatch ? +gearRangeMatch[1] : NaN;
  if (swatches - 4 !== gearRange) {
    console.error(`❌ PAL/gear-range drift: PAL has ${swatches} swatches, gear range is ${gearRange} (expected ${swatches - 4}).`);
    console.error(`   fix: update the "4 + Math.random() * ${swatches - 4}" literal in spawnDrop.`);
    process.exit(1);
  }
}

console.log(`   TPOS check ✓ (${TREE.length} nodes) · PAL ${(palMatch?.[1].match(/'#[^']+'/g) || []).length} swatches`);
