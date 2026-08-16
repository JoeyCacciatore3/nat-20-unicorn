#!/usr/bin/env node
// NAT 20 UNICORN build pipeline: esbuild → terser → roadroller → inline → zip → advzip → 13,312-byte gate
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, statSync, appendFileSync } from 'node:fs';

const LIMIT = 13312;
const run = (cmd) => execSync(cmd, { stdio: ['ignore', 'pipe', 'inherit'] }).toString();

mkdirSync('dist', { recursive: true });

console.log('1/6 bundle (esbuild)…');
run('npx esbuild src/main.js --bundle --format=iife --outfile=dist/bundle.js');

// GLSL squeeze: minify shader template literals in place (comments, indentation, spaces)
{
  const b = readFileSync('dist/bundle.js', 'utf8');
  const sq = b.replace(/`#version 300 es[\s\S]*?`/g, (s) =>
    '`#version 300 es\\n' + s.slice(16, -1)
      .replace(/\/\/[^\n]*/g, '')            // line comments
      .replace(/\s+/g, ' ')                  // collapse whitespace
      .replace(/ ?([=+\-*/,;(){}<>.!?:]) ?/g, '$1') // spaces around punctuation
      .trim() + '`');
  writeFileSync('dist/bundle.js', sq);
}

console.log('2/6 minify (terser)…');
// full property mangling; reserved = runtime-string names (key codes, DM pools,
// inventory keys used via quoted strings, namespaced localStorage key)
const RESERVED = '"KeyW","KeyA","KeyS","KeyD","KeyB","ArrowUp","ArrowDown","ArrowLeft","ArrowRight","n20_save"';
run(`npx terser dist/bundle.js -c passes=3,unsafe=true,drop_console=true -m --mangle-props 'regex=/^.{2,}$/,reserved=[${RESERVED}]' -o dist/min.js`);

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
// Pinned flags = deterministic builds (no ±20 B jitter). After big source changes,
// re-tune: `npx roadroller dist/min.js -o /dev/null` and paste the "use ... to replicate" flags here.
const ROADFLAGS = process.env.TUNE ? '' : '-Zab16 -Zlr1000 -Zmd10 -Zpr14 -S0,1,2,3,6,7,13,21,25,42,198,281';
run(`npx roadroller ${ROADFLAGS} dist/min.js -o dist/packed.js`);

console.log('4/6 inline into template…');
const tpl = readFileSync('index.template.html', 'utf8');
const js = readFileSync('dist/packed.js', 'utf8');
writeFileSync('dist/index.html', tpl.replace('/*JS*/', () => js));

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
