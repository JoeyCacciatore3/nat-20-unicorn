// pack-estimate.mjs — measure realistic byte cost of a packed World-Engine zone
// Simulates a 64x64 tile zone: heights (smooth terrain), tile types, entities.
// Compares: naive JSON vs binary pack, both raw and deflated (zip ≈ deflate).
import { deflateRawSync } from 'node:zlib';

const W = 64, H = 64;

// --- Smooth heightfield via value noise (realistic editor-authored terrain) ---
const rand = (() => { let s = 12345; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
const grid = 8, gp = [];
for (let i = 0; i <= grid; i++) { gp[i] = []; for (let j = 0; j <= grid; j++) gp[i][j] = rand() * 12; }
const lerp = (a, b, t) => a + (b - a) * (t * t * (3 - 2 * t));
function heightAt(x, z) {
  const gx = x / W * grid, gz = z / H * grid;
  const x0 = Math.floor(gx), z0 = Math.floor(gz);
  const h = lerp(
    lerp(gp[x0][z0], gp[Math.min(x0 + 1, grid)][z0], gx - x0),
    lerp(gp[x0][Math.min(z0 + 1, grid)], gp[Math.min(x0 + 1, grid)][Math.min(z0 + 1, grid)], gx - x0),
    gz - z0);
  return Math.round(h * 2) / 2; // half-step heights like the editor
}

// --- Tile types: 6 terrain types, spatially coherent (painted regions) ---
const heights = [], types = [];
for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) {
  const h = heightAt(x, z);
  heights.push(h);
  types.push(h < 2 ? 0 : h < 4 ? 1 : h < 6 ? 2 : h < 8 ? 3 : h < 10 ? 4 : 5);
}

// --- Entities: 120 placements (trees, rocks, pickups, NPCs), 8 kinds ---
const entities = [];
for (let i = 0; i < 120; i++) {
  entities.push({ k: Math.floor(rand() * 8), x: Math.floor(rand() * W), z: Math.floor(rand() * H), r: Math.floor(rand() * 4) });
}

// ================= Format 1: naive JSON (WorldSerializer-style) =================
const json = JSON.stringify({ w: W, h: H, heights, types, entities });

// ================= Format 2: binary pack =================
// heights: quantized to half-steps 0..25.5 -> uint8 (x2)
// types: 4 bits each (16 max types), packed 2 per byte
// entities: 3 bytes each (kind 3b + rot 2b, x, z)
const buf = new Uint8Array(4 + W * H + Math.ceil(W * H / 2) + entities.length * 3);
let o = 0;
buf[o++] = W; buf[o++] = H; buf[o++] = entities.length & 255; buf[o++] = entities.length >> 8;
for (const h of heights) buf[o++] = Math.round(h * 2);
for (let i = 0; i < types.length; i += 2) buf[o++] = types[i] | (types[i + 1] << 4);
for (const e of entities) { buf[o++] = e.k | (e.r << 3); buf[o++] = e.x; buf[o++] = e.z; }

// ================= Format 3: delta-encoded binary (heights as deltas) =================
const buf2 = new Uint8Array(buf.length);
buf2.set(buf); let p = 4, prev = 0;
for (const h of heights) { const q = Math.round(h * 2); buf2[p++] = (q - prev) & 255; prev = q; }

const d = (x) => deflateRawSync(Buffer.from(x), { level: 9 }).length;
console.log('=== 64x64 zone, 120 entities ===');
console.log(`JSON            raw ${json.length.toString().padStart(6)}  deflated ${d(json)}`);
console.log(`Binary          raw ${buf.length.toString().padStart(6)}  deflated ${d(buf)}`);
console.log(`Binary+delta    raw ${buf2.length.toString().padStart(6)}  deflated ${d(buf2)}`);
console.log('');
console.log('Per-zone budget impact (13,312 byte total):');
for (const [name, bytes] of [['Binary', d(buf)], ['Binary+delta', d(buf2)]]) {
  console.log(`  ${name}: ${bytes} B = ${(bytes / 13312 * 100).toFixed(1)}% of zip per zone`);
}
