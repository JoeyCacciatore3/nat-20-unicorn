#!/usr/bin/env node
// NAT 20 UNICORN build pipeline: esbuild → terser → roadroller → inline → zip → advzip → 13,312-byte gate
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, statSync, appendFileSync } from 'node:fs';

const LIMIT = 13312;
const run = (cmd) => execSync(cmd, { stdio: ['ignore', 'pipe', 'inherit'] }).toString();

mkdirSync('dist', { recursive: true });

console.log('1/6 bundle (esbuild)…');
run('npx esbuild src/main.js --bundle --format=iife --outfile=dist/bundle.js');

console.log('2/6 minify (terser)…');
run('npx terser dist/bundle.js -c passes=3,unsafe=true,drop_console=true -m --mangle-props "regex=/^_/" -o dist/min.js');

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
run('npx roadroller dist/min.js -o dist/packed.js');

console.log('4/6 inline into template…');
const tpl = readFileSync('index.template.html', 'utf8');
const js = readFileSync('dist/packed.js', 'utf8');
writeFileSync('dist/index.html', tpl.replace('/*JS*/', () => js));

console.log('5/6 zip…');
run('cd dist && rm -f game.zip && zip -9 -X -q game.zip index.html');
try {
  run('advzip -z -4 -q dist/game.zip');
} catch {
  console.log('   (advzip not found — install advancecomp for ~5-10% extra)');
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
