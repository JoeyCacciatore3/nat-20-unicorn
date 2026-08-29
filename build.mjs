#!/usr/bin/env node
// NAT 20 UNICORN build pipeline:
// esbuild → terser (full prop-mangle) → roadroller (pinned flags) → inline → zip → ECT → 13,312-byte gate
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, statSync, appendFileSync } from 'node:fs';

const LIMIT = 13312;
const run = (cmd) => execSync(cmd, { stdio: ['ignore', 'pipe', 'inherit'] }).toString();

mkdirSync('dist', { recursive: true });

console.log('0/6 map audit (Return Law)…');
run('node tools/map-audit.mjs');   // FAILS the build if any reachable spot cannot return to a campfire

console.log('1/6 bundle (esbuild)…');
run('npx esbuild src/main.js --bundle --format=iife --outfile=dist/bundle.js');

// NOTE (measured, do not "optimize"): aliasing Math.* to 1-char names made the
// PACKED zip 45 B BIGGER despite -1KB raw. Roadroller models verbose repetition
// nearly free; consistency > brevity. Same law killed the CSS-token experiment.
// (GLSL squeeze step removed 2026-08-28: this project ships no shaders.)

console.log('2/6 minify (terser)…');
// full property mangling; reserved = runtime-string names (key codes, DM pools,
// inventory keys used via quoted strings, namespaced localStorage key)
const RESERVED = '"KeyW","KeyA","KeyS","KeyD","KeyB","ArrowUp","ArrowDown","ArrowLeft","ArrowRight","n20_save"';
run(`npx terser dist/bundle.js -c passes=3,unsafe=true,booleans_as_integers=true,drop_console=true -m --mangle-props 'regex=/^.{2,}$/,reserved=[${RESERVED}]' --ecma 2020 -o dist/min.js`);

// Rules compliance: no external URLs may ship (js13k rule #2)
const min = readFileSync('dist/min.js', 'utf8');
if (/https?:\/\//.test(min)) {
  console.error('❌ RULES VIOLATION: external URL found in bundle.');
  process.exit(1);
}
// Rules compliance: bare localStorage writes must use the n20_ prefix helper
if (/localStorage\.(setItem|clear)/.test(min) && !/n20_/.test(min)) {
  console.error('❌ RULES VIOLATION: localStorage use without n20_ prefix.');
  process.exit(1);
}

console.log('3/6 pack (roadroller)…');
// HTML shell rides INSIDE the packed stream (document.write) so roadroller models
// it with the code — measured −69 B vs plain-deflated template. Only doctype +
// charset stay literal (encoding must be declared before the high-byte payload).
// -D (dirty decoder) is safe: canvas id is 2 chars (cv), no single-letter DOM globals.
const SHELL = '<meta name=viewport content="width=device-width,initial-scale=1,user-scalable=no">'
  + '<title>NAT 20 UNICORN</title>'
  + '<style>html,body{margin:0;height:100%;background:#000;overflow:hidden}canvas{width:100%;height:100%;display:block;touch-action:none}</style>'
  + '<canvas id=cv></canvas>';
writeFileSync('dist/min2.js', `document.write('${SHELL.replace(/'/g, "\\'")}');` + readFileSync('dist/min.js', 'utf8'));
// Pinned flags = deterministic builds (no ±20 B jitter). After big source changes,
// re-tune: `TUNE=1 node build.mjs` and paste the "use ... to replicate" flags here.
// NOTE (measured 2026-08-19): re-tuned flags -Zab16/-Zlr1000/-Zmd10/... estimated
// 115 B smaller pre-zip but produced a 31 B BIGGER final zip after ECT. The
// estimate lies; only dist/game.zip counts. Keeping the original pin.
const ROADFLAGS = process.env.TUNE ? '-D' : '-D -Zab25 -Zlr1064 -Zmd14 -Zpr14 -S0,1,2,3,7,10,13,21,42,57,161,284';
run(`npx roadroller ${ROADFLAGS} dist/min2.js -o dist/packed.js`);

console.log('4/6 inline into template…');
const tpl = readFileSync('index.template.html', 'utf8');
const js = readFileSync('dist/packed.js', 'utf8');
if (js.includes('</script')) throw new Error('packed stream contains </script — would break HTML parsing');
writeFileSync('dist/index.html', tpl.replace('/*JS*/', () => js));

// Wavedash variant: same competition HTML + platform glue (host injects window.Wavedash).
// init() is REQUIRED to reveal the game behind Wavedash's loading screen; achievement
// unlocks are mirrored by polling the game's own save (zero bytes added to the compo zip).
const WD_IDS = 'HOMEBODY,FIRST_LIGHT,GLOOMBUSTER,NATURAL_20,UNTOUCHABLE,GREEN_HOOVES,SUMMIT,SILVER_TONGUE,WELL_RESTED,HOARDER,BELIEVER,ARCHITECT,PRISMATIC';
const WD_GLUE = `<script>(()=>{const W=window.Wavedash;if(!W)return;W.updateLoadProgressZeroToOne(1);W.init({});
const A='${WD_IDS}'.split(',');const sent={};
setInterval(()=>{try{const d=JSON.parse(localStorage.n20_save||'0');
d&&d.e&&d.e.forEach((v,i)=>{if(v&&!sent[i]){sent[i]=1;W.setAchievement(A[i],true)}})}catch(e){}},3000)})()</scr` + `ipt>`;
mkdirSync('dist/wavedash', { recursive: true });
writeFileSync('dist/wavedash/index.html', readFileSync('dist/index.html', 'utf8') + WD_GLUE);

console.log('5/6 zip…');
run('cd dist && rm -f game.zip && zip -9 -X -q game.zip index.html');
try { // ECT: strongest zip recompressor, vendored via ect-bin (no system install)
  run('node_modules/ect-bin/vendor/ect -10009 -zip dist/game.zip');
} catch {
  try { run('advzip -z -4 -q dist/game.zip'); } catch { console.log('   (no ect/advzip)'); }
}

const size = statSync('dist/game.zip').size;
const pct = ((size / LIMIT) * 100).toFixed(1);
const line = `${new Date().toISOString().slice(0, 10)}  ${size} B  (${pct}%)  free: ${LIMIT - size} B`;
console.log(`\n6/6 📦 dist/game.zip = ${size} / ${LIMIT} B (${pct}%) — ${LIMIT - size} B free`);
try { appendFileSync('SIZELOG.md', line + '\n'); } catch {}

if (size > LIMIT) {
  console.error('❌ OVER BUDGET — execute next pre-agreed cut before feature work.');
  process.exit(1);
}
console.log('✅ under budget');
