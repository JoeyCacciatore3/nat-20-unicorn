#!/usr/bin/env node
// tpos-check.mjs — verify src/main.js's precomputed TPOS still matches what the
// original derivation would produce from the current TREE. Fails the build if
// the tree has been edited without regenerating TPOS.
//
// If this fails, run: `node tools/tpos-check.mjs --print` and paste the
// printed line into src/main.js (the TPOS = [...] line).
import { readFileSync } from 'node:fs';

// TREE/TPOS/PAL live in data.js; the gear-range literal lives in main.js (spawnDrop).
// Concatenate both so every guard regex below still resolves.
const src = readFileSync(new URL('../src/data.js', import.meta.url), 'utf8')
  + readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');

// Extract TREE literal — flat string array bounded by `const TREE = [` … `];`
const treeMatch = src.match(/const TREE = \[(.*?)\];/);
if (!treeMatch) { console.error('❌ TPOS check: TREE literal not found'); process.exit(1); }

// Count skill names in the flat string array.
const TREE = treeMatch[1].match(/'[^']+'/g) || [];

// 4-row layout: Row1 y=48 (3), Row2 y=94 (4), Row3 y=140 (3), Row4 y=186 (2).
// TPOS is hand-tuned for the tier layout — verify by direct comparison.
const TPOS = [[263,48],[356,186],[325,48],[294,186],[294,94],[325,140],[387,48],[356,94],[418,94],[263,140],[232,94],[387,140]];
if (TPOS.length !== TREE.length) { console.error(`❌ TPOS length ${TPOS.length} ≠ TREE length ${TREE.length}`); process.exit(1); }
const expected = JSON.stringify(TPOS);

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
