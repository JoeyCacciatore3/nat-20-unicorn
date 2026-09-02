#!/usr/bin/env node
// pin-guard.mjs — roadroller PIN-STALENESS guard. Verifies the pinned flags in
// build.mjs (ROADFLAGS) still produce the smallest FINAL ZIP vs a fresh -O2 search.
// Compares real zip+ECT bytes — the roadroller ESTIMATE lies (build.mjs proved a
// 115 B smaller estimate became a 31 B bigger zip). Run from the repo root on
// release / after big source changes:
//
//     node tools/pin-guard.mjs
//
// If it reports STALE, re-tune: run `TUNE=1 node build.mjs` a few times, take the
// flag set whose FINAL zip is smallest (single -O2 has ~±18 B variance), and paste
// it into build.mjs ROADFLAGS. Exits non-zero when the pin is clearly stale so CI
// can gate on it.
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, statSync, rmSync } from 'node:fs';

const sh  = (cmd) => execSync(cmd, { stdio: ['ignore', 'pipe', 'inherit'] }).toString();
const cap = (cmd) => execSync(cmd + ' 2>&1', { encoding: 'utf8' });   // capture stdout+stderr
const size = (f) => statSync(f).size;
const STALE_MARGIN = 20;   // fresh must beat the pin by MORE than this (above ~±18 B search noise) to call STALE

// 1. Build the pinned baseline via the REAL pipeline (no duplication). NOLOG keeps
//    this tool build out of SIZELOG.md. Leaves dist/min2.js (the pack input) + dist/game.zip.
console.log('pin-guard 1/4 — building pinned baseline (NOLOG)…');
sh('NOLOG=1 node build.mjs');
const pinned = size('dist/game.zip');
console.log(`  pinned zip = ${pinned} B`);

// 2. Fresh -O2 search on the same pack input. -D stays fixed; the optimizer tunes
//    the -S/-Z params. Prints "use `<flags>` to replicate: <estimate>".
console.log('pin-guard 2/4 — fresh -O2 search (~1-2 min)…');
const out = cap('npx roadroller -D -O2 dist/min2.js -o dist/packed_fresh.js');
const m = out.match(/use `([^`]+)` to replicate/);
const freshFlags = m ? m[1] : null;
if (!freshFlags) { console.error('❌ could not parse fresh flags from roadroller output:\n' + out.slice(-400)); process.exit(2); }
console.log(`  fresh flags: ${freshFlags}`);

// 3. Pack the fresh candidate through the SAME inline → zip -9 → ECT as build.mjs,
//    so the comparison is apples-to-apples on the FINAL artifact.
console.log('pin-guard 3/4 — pack fresh candidate → zip → ECT…');
const tpl = readFileSync('index.template.html', 'utf8');
const js  = readFileSync('dist/packed_fresh.js', 'utf8');
if (js.includes('</script')) { console.error('❌ fresh packed stream contains </script'); process.exit(2); }
writeFileSync('dist/index_fresh.html', tpl.replace('/*JS*/', () => js));
sh('cd dist && rm -f game_fresh.zip && zip -9 -X -q game_fresh.zip index_fresh.html');
try { sh('node_modules/ect-bin/vendor/ect -10009 -zip dist/game_fresh.zip'); }
catch { try { sh('advzip -z -4 -q dist/game_fresh.zip'); } catch {} }
const fresh = size('dist/game_fresh.zip');
console.log(`  fresh zip  = ${fresh} B`);

// 4. Cleanup temp artifacts (never touch the real pinned dist/game.zip).
for (const f of ['dist/packed_fresh.js', 'dist/index_fresh.html', 'dist/game_fresh.zip']) { try { rmSync(f); } catch {} }

// Verdict — positive delta means the fresh search produced a SMALLER zip (pin drifted).
const delta = pinned - fresh;
console.log('\n=== pin-guard verdict ===');
console.log(`pinned ${pinned} B  vs  fresh -O2 ${fresh} B  →  fresh is ${delta > 0 ? delta + ' B SMALLER' : (-delta) + ' B larger/equal'}`);
if (delta > STALE_MARGIN) {
  console.log(`\n❌ PIN STALE by ${delta} B (> ${STALE_MARGIN} B noise floor). Update ROADFLAGS in build.mjs to:`);
  console.log(`   -D ${freshFlags}`);
  console.log('   (first confirm: run TUNE=1 node build.mjs a few times, take the flags whose FINAL zip is smallest — one -O2 has ~±18 B variance.)');
  process.exit(1);
}
console.log(`\n✅ PIN HEALTHY — pinned flags are within ${STALE_MARGIN} B of a fresh -O2 (search noise ~±18 B). No action needed.`);
