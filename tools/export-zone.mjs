#!/usr/bin/env node
// export-zone.mjs — packs World-Engine-authored terrain edits into src/zones.js.
//
// Contract: input JSON is { "points": [[x, z, h], ...] } where h is the DESIRED
// absolute surface height at world coords (x, z). A World-Engine-side script maps
// its WorldData tiles into this contract (heights sampled at our grid vertices).
//
// Each point snaps to the nearest 97×97 grid vertex; we store only the delta vs
// the procedural baseline (same baselineHeight() the game runs), quantized to
// 1/8 unit int8 (±15.9 range), packed [u16 index LE, i8 delta*8], base64'd.
//
// Usage: node tools/export-zone.mjs world-edits.json
import { readFileSync, writeFileSync } from 'node:fs';
import { baselineHeight, WORLD, GRID, STEP } from '../src/terrain.js';

const file = process.argv[2];
if (!file) { console.error('usage: node tools/export-zone.mjs <edits.json>'); process.exit(1); }

const { points } = JSON.parse(readFileSync(file, 'utf8'));
const V = GRID + 1;
const deltas = new Map(); // vertex index -> quantized delta (last write wins)

for (const [x, z, h] of points) {
  const i = Math.round((x + WORLD / 2) / STEP), j = Math.round((z + WORLD / 2) / STEP);
  if (i < 0 || j < 0 || i >= V || j >= V) continue;
  const gx = i * STEP - WORLD / 2, gz = j * STEP - WORLD / 2;
  const q = Math.max(-127, Math.min(127, Math.round((h - baselineHeight(gx, gz)) * 8)));
  if (q) deltas.set(j * V + i, q);
}

const bytes = new Uint8Array(deltas.size * 3);
let p = 0;
for (const [k, q] of deltas) {
  bytes[p++] = k & 255; bytes[p++] = k >> 8; bytes[p++] = q & 255;
}
const b64 = Buffer.from(bytes).toString('base64');

const zonesPath = new URL('../src/zones.js', import.meta.url).pathname;
const src = readFileSync(zonesPath, 'utf8');
const out = src.replace(/\/\*DELTA\*\/'[^']*'\/\*END\*\//, `/*DELTA*/'${b64}'/*END*/`);
writeFileSync(zonesPath, out);

console.log(`${deltas.size} vertex deltas → ${bytes.length} bytes raw, ${b64.length} b64 chars, written to src/zones.js`);
