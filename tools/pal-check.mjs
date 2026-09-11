#!/usr/bin/env node
// pal-check.mjs — build guard: the gear color range in spawnDrop
// ("d.c = [N + ]Math.random() * R | 0") must cover PAL indices [N..](length-1),
// i.e. R = swatches - N. Fails the build if PAL is edited without updating the
// spawnDrop literal (or vice-versa). Split out of the retired tpos-check.mjs when
// the skill tree / TREE / TPOS were removed (2026-09) — the TPOS-drift half is gone,
// this PAL/gear-range half is unrelated to skills and still worth guarding.
import { readFileSync } from 'node:fs';

// PAL lives in data.js; the gear-range literal lives in main.js (spawnDrop). Concatenate both.
const src = readFileSync(new URL('../src/data.js', import.meta.url), 'utf8')
  + readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');

const palMatch = src.match(/const PAL = \[([\s\S]*?)\n\];/);
if (!palMatch) { console.error('❌ PAL check: PAL literal not found'); process.exit(1); }
const swatches = (palMatch[1].match(/'#[^']+'/g) || []).length;

const gearRangeMatch = src.match(/d\.c = \(?(?:(\d+) \+ )?Math\.random\(\) \* (\d+)/);
const gearBase = gearRangeMatch && gearRangeMatch[1] ? +gearRangeMatch[1] : 0;
const gearRange = gearRangeMatch ? +gearRangeMatch[2] : NaN;

if (swatches - gearBase !== gearRange) {
  console.error(`❌ PAL/gear-range drift: PAL has ${swatches} swatches, gear range is ${gearBase} + random*${gearRange} (expected ${swatches - gearBase}).`);
  console.error(`   fix: update the "Math.random() * ${swatches - gearBase}" literal in spawnDrop.`);
  process.exit(1);
}

console.log(`   PAL check ✓ (${swatches} swatches · gear range ${gearBase}+random*${gearRange})`);
