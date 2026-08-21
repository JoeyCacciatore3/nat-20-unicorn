// NAT 20 UNICORN v2 — 2D metroidvania platformer. Canvas 2D, no WebGL.
// Phase 1 (bible-approved): dual-convention controls + touch overlay,
// verb economy (stomp free · melee GENERATES mana · shot/heal SPEND it),
// 4 stats chosen at level-up (HORN/HOOF/HEART/SPARK), contextual prompts.
import { T, W, H, tile, regions, regionAt, seeds } from './world.js';

const cv = document.getElementById('cv'), ctx = cv.getContext('2d');
const VW = 480, VH = 270;
const fit = () => { cv.width = innerWidth; cv.height = innerHeight; };
addEventListener('resize', fit); fit();
let SS = 1, SOX = 0, SOY = 0;                    // view transform (for pointer mapping)

// ---------- input: BOTH conventions (WASD+Space/J/L/S and arrows+Z/X/C/I) ----------
const J_KEYS = ['Space', 'KeyK', 'KeyZ', 'KeyW', 'ArrowUp'];
const M_KEYS = ['KeyJ', 'KeyX'], SH_KEYS = ['KeyL', 'KeyC'], HE_KEYS = ['KeyS', 'KeyI'];
const keys = new Set();
let jbuf = 0, started = 0, touch = 0;
addEventListener('keydown', (e) => {
  if (e.repeat) return;
  if (e.code === 'Space' || e.code.indexOf('Arrow') === 0) e.preventDefault();
  keys.add(e.code);
  if (J_KEYS.includes(e.code)) jbuf = .12;
  if (M_KEYS.includes(e.code)) swing();
  if (SH_KEYS.includes(e.code)) shoot();
  if (choosing) { const n = '1234'.indexOf(e.key); if (n >= 0) pick(n); }
  boot();
});
addEventListener('keyup', (e) => keys.delete(e.code));
const held = (...c) => c.some(k => keys.has(k));
const jumpHeld = () => J_KEYS.some(k => keys.has(k));
const healHeld = () => HE_KEYS.some(k => keys.has(k)) || keys.has('TBtnH');

// ---------- touch overlay (auto-shown; fixed dpad left, verb cluster right) ----------
const btns = () => {
  const b = [
    { x: 34, y: VH - 32, r: 26, l: '◀', c: 'TBtnL' }, { x: 92, y: VH - 32, r: 26, l: '▶', c: 'TBtnR' },
    { x: VW - 36, y: VH - 34, r: 28, l: '▲', c: 'TBtnJ' },        // JUMP — biggest, thumb rest
    { x: VW - 94, y: VH - 28, r: 22, l: '⚔', c: 'TBtnM' },        // melee
  ];
  if (abil & 4) b.push({ x: VW - 86, y: VH - 74, r: 19, l: '✦', c: 'TBtnS' });
  if (abil & 2) b.push({ x: VW - 34, y: VH - 86, r: 17, l: '＋', c: 'TBtnH' });
  if (nearFire || nearLore) b.push({ x: VW - 140, y: VH - 66, r: 17, l: 'E', c: 'KeyE' });
  return b;
};
const ptrs = new Map();
const toV = (e) => [(e.clientX - SOX) / SS, (e.clientY - SOY) / SS];
addEventListener('pointerdown', (e) => {
  boot();
  if (e.pointerType === 'touch') touch = 1;
  const [vx, vy] = toV(e);
  if (choosing) { const n = (vy > 100 && vy < 200) ? ((vx - VW / 2 + 172) / 88 | 0) : -1; if (n >= 0 && n < 4) pick(n); return; }
  for (const b of btns()) if (Math.hypot(vx - b.x, vy - b.y) < b.r + 6) {
    ptrs.set(e.pointerId, b.c); keys.add(b.c);
    if (b.c === 'TBtnJ') jbuf = .12;
    if (b.c === 'TBtnM') swing();
    if (b.c === 'TBtnS') shoot();
  }
});
addEventListener('pointerup', (e) => { const c = ptrs.get(e.pointerId); if (c) { keys.delete(c); ptrs.delete(e.pointerId); } });
addEventListener('pointercancel', (e) => { const c = ptrs.get(e.pointerId); if (c) { keys.delete(c); ptrs.delete(e.pointerId); } });

// ---------- audio ----------
let AC;
function boot() { started = 1; if (!AC) AC = new AudioContext(); AC.resume(); }
const sfx = (f0, f1, d, type = 'square', v = .12, dl = 0) => {
  if (!AC) return;
  const o = AC.createOscillator(), g = AC.createGain(), t = AC.currentTime + dl;
  o.type = type; o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(f1, 1), t + d);
  g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.001, t + d);
  o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + d);
};
const S_SHARD = () => { sfx(523, 523, .14, 'triangle', .15); sfx(659, 659, .14, 'triangle', .15, .12); sfx(784, 1568, .3, 'triangle', .15, .24); };
const S_NAT = () => { for (let i = 0; i < 4; i++) sfx(440 * (1 + i * .25), 440 * (1 + i * .25), .1, 'square', .12, i * .07); };

// ---------- DM voice ----------
let dmTxt = '', dmT = 0;
const say = (t) => { dmTxt = t; dmT = 4.5; };
const LORE = 'Before the doubt, every tile of this table was painted. I remember the brush.';

// ---------- RPG: 4 stats, chosen at level-up ----------
let ho = 1, hf = 1, he = 1, sp = 1;               // HORN HOOF HEART SPARK
let hp = 3, xp = 0, lvl = 1, spk = 0, abil = 0;   // abil bits: 1 DJ, 2 heal, 4 shot
let mn = 5, choosing = 0, pending = 0;
const mHP = () => 2 + he, mMN = () => 3 + sp * 2;
const DIE = () => [0, 4, 6, 8, 10, 12][Math.min(ho, 5)];
const roll = () => 1 + (Math.random() * DIE() | 0);
const earned = Array(13).fill(0);
const need = () => 8 + lvl * 6;
const gainXp = (n, x, y) => {
  xp += n; fly(x, y, '+' + n + ' XP', '#9f9');
  while (xp >= need()) { xp -= need(); pending++; }
  if (pending && !choosing) { choosing = 1; S_NAT(); }
};
const STATS = [
  ['HORN', '🎲 bigger damage die', () => ho++],
  ['HOOF', '🐎 faster · higher jump', () => hf++],
  ['HEART', '♥ +1 max · stronger heal', () => { he++; hp++; }],
  ['SPARK', '✦ +2 max mana', () => { sp++; mn += 2; }],
];
const pick = (n) => {
  STATS[n][2](); lvl++; pending--;
  fly(pl.x, pl.y - 14, STATS[n][0] + ' UP!', '#ffd75e', 1); sfx(660, 990, .15, 'triangle', .12);
  if (!pending) { choosing = 0; save(); }
  if (lvl === 3) say('Choosing who you become. That is the whole game, little horse.');
};

// ---------- save (single-char keys — terser mangle-props law) ----------
const save = () => {
  localStorage.n20_save = JSON.stringify({
    e: earned, h: hp, x: xp, l: lvl, s: spk, a: abil, n: mn,
    t: [ho, hf, he, sp], c: [cp[0], cp[1]], b: regions.map(r => r.t),
  });
};
const load = () => {
  try {
    const d = JSON.parse(localStorage.n20_save || '0');
    if (!d) return;
    d.e.forEach((v, i) => earned[i] = v);
    hp = d.h; xp = d.x; lvl = d.l; spk = d.s; abil = d.a; mn = d.n || 5;
    if (d.t) [ho, hf, he, sp] = d.t;
    cp = d.c; pl.x = cp[0]; pl.y = cp[1];
    d.b.forEach((v, i) => { regions[i].t = v; regions[i].b = v; });
  } catch (e) { /* fresh oath */ }
};

// ---------- player ----------
const PW = 10, PH = 14;
const pl = { x: 46 * T, y: 24 * T, vx: 0, vy: 0, ground: 0, face: 1, coyote: 0, air: 0, sq: 1, inv: 0, t: 0 };
let cp = [46 * T, 24 * T], lastSafe = [46 * T, 24 * T], deathT = 0;
let atkCd = 0, swT = 0, chT = 0, nearFire = 0, nearLore = 0, seenM = 0, seenH = 0;
const G_RISE = 750, G_FALL = 1500, FALLCAP = 400;
const RUN = () => 105 + 10 * hf, V0 = () => 240 + 8 * hf;

const solid = (x, y) => tile(x / T | 0, y / T | 0) === 1;
const spike = (x, y) => tile(x / T | 0, y / T | 0) === 3;

// ---------- entities ----------
const sparks = seeds.sparks.map(([x, y]) => ({ x: x * T, y: y * T, got: 0, ph: Math.random() * 7 }));
const FOECOL = ['', '#cba6f7', '#5aa0e0', '#e05555'];
const PAT = [0b01110, 0b11111, 0b11011, 0b11111];
const foes = seeds.foes.map(([x, y, k]) => ({ x: x * T, y: y * T, vx: (18 + 26 / k) * (Math.random() < .5 ? 1 : -1), k, hp: k, fl: 0, t: Math.random() * 7 }));
const shots = [], flies = [], parts = [];
const fly = (x, y, txt, c, big) => flies.push({ x, y, txt, c, big, t: 1.2 });
const burst = (x, y, n, c) => { for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, s = 40 + Math.random() * 80; parts.push({ x, y, vx: Math.sin(a) * s, vy: Math.cos(a) * s - 60, t: .5 + Math.random() * .4, c }); } };

// damage a foe with a visible die roll; returns true if it died
const strike = (f, r, mult, gen) => {
  const crit = r === DIE(), dmg = (1 + ((r - 1) / 4 | 0)) * (crit ? 2 : 1) * mult;
  f.hp -= dmg; f.fl = .15;
  fly(f.x, f.y - 8, crit ? 'NAT ' + r + '!' : '🎲' + r, crit ? '#ffd75e' : '#fff', crit);
  if (crit) { S_NAT(); earned[3] = 1; burst(f.x, f.y, 24, '#ffd75e'); }
  if (gen) { mn = Math.min(mMN(), mn + 1); }                    // melee GENERATES mana
  if (f.hp <= 0) {
    foes.splice(foes.indexOf(f), 1);
    burst(f.x, f.y, 12, FOECOL[f.k]); gainXp(f.k * 3 + (crit ? 4 : 0), f.x, f.y - 16);
    if (!earned[2]) { earned[2] = 1; say('First gloom, popped. That is how doubt dies: under hooves.'); }
    return 1;
  }
};

// ---------- verbs ----------
function swing() {                                              // melee: horn swipe
  if (!started || choosing || deathT > 0 || atkCd > 0) return;
  atkCd = .28; swT = .14; seenM = 1; sfx(340, 90, .07, 'square', .1);
  const hx = pl.x + (pl.face > 0 ? PW : -16), hy = pl.y - 2;
  for (const f of [...foes]) {
    const fs = 6 + 4 * f.k;
    if (f.x + fs > hx && f.x < hx + 16 && f.y + fs > hy && f.y < hy + PH + 4) strike(f, roll(), 1, 1);
  }
}
function shoot() {                                              // rainbow shot: 3 mana
  if (!started || choosing || deathT > 0 || !(abil & 4)) return;
  if (mn < 3) { fly(pl.x, pl.y - 12, 'need ✦3', '#f9c'); return; }
  mn -= 3; sfx(700, 1300, .12, 'sawtooth', .09);
  shots.push({ x: pl.x + PW / 2, y: pl.y + 5, vx: pl.face * 270, t: 1.1 });
}

const hurt = (n, safe) => {
  if (pl.inv > 0 || deathT > 0) return;
  hp -= n; pl.inv = 1.2; chT = 0; sfx(140, 55, .25, 'sawtooth', .2); burst(pl.x, pl.y + 7, 10, '#e05555');
  if ((abil & 2) && !seenH) { seenH = 1; say('Hurt? Hold S. Channel the rainbow — but stand STILL to do it.'); }
  if (hp <= 0) { deathT = 1.6; say('The mini falls over. ...We do not stop rolling. Back to the fire.'); return; }
  if (safe) { pl.x = lastSafe[0]; pl.y = lastSafe[1]; pl.vx = pl.vy = 0; }
  else pl.vy = -180;
};

// ---------- update ----------
let last = performance.now(), time = 0;
const step = (dt) => {
  time += dt; dmT -= dt; jbuf -= dt; pl.inv -= dt; pl.t += dt; atkCd -= dt; swT -= dt;
  regions.forEach(r => r.b += (r.t - r.b) * Math.min(1, dt * .9));
  pl.sq += (1 - pl.sq) * Math.min(1, dt * 10);

  if (deathT > 0) {
    deathT -= dt;
    if (deathT <= 0) { hp = mHP(); pl.x = cp[0]; pl.y = cp[1]; pl.vx = pl.vy = 0; pl.inv = 1.5; }
    return;
  }
  if (!started || choosing) return;

  // -- heal channel: rooted, costs 5, restores 1 (faster with HEART) --
  const canHeal = (abil & 2) && mn >= 5 && hp < mHP() && pl.ground;
  if (canHeal && healHeld()) {
    chT += dt; pl.vx = 0;
    if (chT > 1.3 - .1 * he) { chT = 0; mn -= 5; hp++; burst(pl.x + PW / 2, pl.y + 4, 14, '#9fe8a0'); sfx(520, 1040, .25, 'triangle', .12); fly(pl.x, pl.y - 12, '+♥', '#9fe8a0', 1); }
  } else chT = 0;
  const rooted = chT > 0;

  // -- run --
  const dir = rooted ? 0 : (held('KeyD', 'ArrowRight', 'TBtnR') ? 1 : 0) - (held('KeyA', 'ArrowLeft', 'TBtnL') ? 1 : 0);
  pl.vx += (dir * RUN() - pl.vx) * Math.min(1, dt * 12 * (pl.ground ? 1 : .65));
  if (dir) pl.face = dir;

  // -- jump: buffer + coyote + variable + double --
  pl.coyote = pl.ground ? .1 : pl.coyote - dt;
  if (jbuf > 0 && !rooted) {
    if (pl.coyote > 0) { pl.vy = -V0(); pl.coyote = 0; pl.air = 0; jbuf = 0; pl.sq = .7; sfx(280, 520, .12); burst(pl.x, pl.y + PH, 4, '#ccc'); }
    else if ((abil & 1) && pl.air < 1) { pl.vy = -(V0() - 20); pl.air++; jbuf = 0; pl.sq = .7; sfx(390, 760, .12, 'triangle'); burst(pl.x, pl.y + PH, 6, '#f9c'); }
  }
  if (pl.vy < 0 && !jumpHeld()) pl.vy *= .82;
  pl.vy += (pl.vy < 0 ? G_RISE : G_FALL) * (Math.abs(pl.vy) < 40 ? .5 : 1) * dt;
  pl.vy = Math.min(pl.vy, FALLCAP);

  // -- move + collide --
  const py = pl.y;
  pl.x += pl.vx * dt;
  for (const oy of [1, PH / 2, PH - 1]) {
    if (pl.vx > 0 && solid(pl.x + PW, py + oy)) { pl.x = ((pl.x + PW) / T | 0) * T - PW - .01; pl.vx = 0; }
    if (pl.vx < 0 && solid(pl.x, py + oy)) { pl.x = ((pl.x / T | 0) + 1) * T + .01; pl.vx = 0; }
  }
  const wasGround = pl.ground; pl.ground = 0;
  pl.y += pl.vy * dt;
  if (pl.vy >= 0) {
    const feet = pl.y + PH, ty = feet / T | 0, top = ty * T;
    for (const ox of [1, PW - 1]) {
      const tv = tile((pl.x + ox) / T | 0, ty);
      if (tv === 1 || (tv === 2 && py + PH <= top + 4)) {
        pl.y = top - PH;
        if (!wasGround && pl.vy > 250) { pl.sq = 1.35; burst(pl.x + PW / 2, feet, 5, '#bbb'); sfx(150, 70, .06, 'square', .07); }
        pl.vy = 0; pl.ground = 1; pl.air = 0; break;
      }
    }
  } else {
    for (const ox of [1, PW - 1]) if (solid(pl.x + ox, pl.y)) { pl.y = ((pl.y / T | 0) + 1) * T + .01; pl.vy = 0; break; }
  }
  if (pl.ground && !spike(pl.x + PW / 2, pl.y + PH + 4)) lastSafe = [pl.x, pl.y];

  for (const [ox, oy] of [[1, PH - 1], [PW - 1, PH - 1], [PW / 2, PH]])
    if (spike(pl.x + ox, pl.y + oy)) { hurt(1, 1); break; }
  if (pl.y > H * T) hurt(1, 1);

  // -- sparks --
  for (const s of sparks) {
    if (s.got) continue;
    if (Math.hypot(pl.x + PW / 2 - s.x, pl.y + PH / 2 - s.y) < 13) { s.got = 1; spk++; mn = Math.min(mMN(), mn + 1); sfx(880, 1500, .07, 'triangle', .09); burst(s.x, s.y, 5, '#fe9'); }
  }

  // -- shards --
  for (const [sx, sy, bit] of seeds.shards) {
    if (abil & bit) continue;
    if (Math.hypot(pl.x - sx * T, pl.y - sy * T) < 16) {
      abil |= bit; earned[1] = 1; S_SHARD(); burst(sx * T, sy * T, 30, '#fff');
      if (bit === 1) { regions[1].t = 1; say('The meadow remembers its color. And you remember the sky. DOUBLE JUMP.'); }
      if (bit === 2) { say('RAINBOW HEAL. Hold S, stand still, mend. Mercy costs mana — swing that horn to earn it.'); }
      if (bit === 4) { regions[2].t = 1; say('RAINBOW SHOT. Press L. Some doubts you cannot reach with hooves.'); }
      save();
    }
  }

  // -- shots --
  for (const s of shots) {
    s.t -= dt; s.x += s.vx * dt;
    parts.push({ x: s.x, y: s.y + Math.sin(time * 30) * 2, vx: 0, vy: 0, t: .25, c: `hsl(${(time * 500) % 360} 80% 65%)` });
    if (solid(s.x, s.y)) { s.t = 0; burst(s.x, s.y, 6, '#fff'); }
    for (const f of foes) {
      const fs = 6 + 4 * f.k;
      if (s.x > f.x && s.x < f.x + fs && s.y > f.y && s.y < f.y + fs) { s.t = 0; strike(f, roll(), 1, 0); break; }
    }
  }
  for (let i = shots.length; i--;) if (shots[i].t <= 0) shots.splice(i, 1);

  // -- foes --
  for (const f of [...foes]) {
    f.t += dt; f.fl -= dt;
    f.vy = (f.vy || 0) + 900 * dt; f.y += f.vy * dt;
    const fs = 6 + 4 * f.k, ty = (f.y + fs) / T | 0;
    const tv = tile((f.x + fs / 2) / T | 0, ty);
    if (f.vy > 0 && (tv === 1 || tv === 2)) { f.y = ty * T - fs; f.vy = 0; }
    f.x += f.vx * dt;
    const ahead = f.x + fs / 2 + Math.sign(f.vx) * fs * .7;
    if (solid(ahead, f.y + fs / 2) || tile(ahead / T | 0, (f.y + fs + 6) / T | 0) === 0) f.vx *= -1;
    if (pl.x < f.x + fs && pl.x + PW > f.x && pl.y < f.y + fs && pl.y + PH > f.y) {
      if (pl.vy > 40 && pl.y + PH - f.y < 10) {                 // stomp (free, mobility)
        strike(f, roll(), 1, 0);
        pl.vy = jumpHeld() ? -290 : -220; pl.air = 0; pl.sq = .75; sfx(200, 55, .1, 'square', .2);
      } else hurt(1, 0);
    }
  }

  // -- campfire + lore --
  const [fx, fy] = seeds.fire, [lx, ly] = seeds.lore;
  nearFire = Math.hypot(pl.x - fx * T, pl.y - fy * T) < 26;
  nearLore = Math.hypot(pl.x - lx * T, pl.y - ly * T) < 22;
  if (nearFire && keys.has('KeyE')) {
    keys.delete('KeyE');
    hp = mHP(); cp = [fx * T - 20, (fy - 1) * T]; earned[0] = 1; save();
    burst(fx * T, fy * T - 8, 12, '#fc6'); sfx(500, 900, .3, 'triangle', .1);
    say('Rest. Saved. The fire keeps what you earned.');
  }
  if (nearLore && keys.has('KeyE')) { keys.delete('KeyE'); say(LORE); gainXp(4, pl.x, pl.y - 12); }

  // fx
  for (const p of parts) { p.t -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 300 * dt; }
  for (let i = parts.length; i--;) if (parts[i].t <= 0) parts.splice(i, 1);
  for (const f of flies) { f.t -= dt; f.y -= 28 * dt; }
  for (let i = flies.length; i--;) if (flies[i].t <= 0) flies.splice(i, 1);
};

// ---------- render ----------
const cam = { x: 0, y: 0 };
const draw = () => {
  SS = Math.min(cv.width / VW, cv.height / VH);
  SOX = (cv.width - VW * SS) / 2; SOY = (cv.height - VH * SS) / 2;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.setTransform(SS, 0, 0, SS, SOX, SOY);
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, VW, VH); ctx.clip();

  const tx = pl.x + PW / 2 + pl.face * 40 - VW / 2, ty = pl.y - VH / 2 + 30;
  cam.x += (tx - cam.x) * .08; cam.y += (ty - cam.y) * .1;
  cam.x = Math.max(0, Math.min(W * T - VW, cam.x));
  cam.y = Math.max(0, Math.min(H * T - VH, cam.y));

  const rg = regionAt(pl.x + PW / 2);
  const sat = 22 * rg.b, lit = 12 + 6 * rg.b;
  ctx.fillStyle = `hsl(${rg.h * 360} ${sat}% ${lit}%)`; ctx.fillRect(0, 0, VW, VH);
  for (const [par, base, amp, l] of [[.25, 90, 22, 8], [.5, 60, 16, 11]]) {
    ctx.fillStyle = `hsl(${rg.h * 360} ${sat * .8}% ${l}%)`;
    for (let x = 0; x < VW; x += 8) {
      const wx = x + cam.x * par;
      ctx.fillRect(x, VH - (base + Math.sin(wx * .011) * amp + Math.sin(wx * .027 + 5) * amp * .5), 8, VH);
    }
  }

  ctx.translate(-cam.x | 0, -cam.y | 0);
  const x0 = cam.x / T | 0, x1 = Math.min(W, x0 + VW / T + 2), y0 = Math.max(0, cam.y / T | 0), y1 = Math.min(H, y0 + VH / T + 2);
  for (let j = y0; j < y1; j++) for (let i = x0; i < x1; i++) {
    const v = tile(i, j); if (!v) continue;
    const r = regionAt(i * T + 8), hue = r.h * 360, b = r.b;
    if (v === 1) {
      ctx.fillStyle = `hsl(${hue} ${40 * b}% ${26 + 6 * b}%)`; ctx.fillRect(i * T, j * T, T + .5, T + .5);
      if (tile(i, j - 1) !== 1) { ctx.fillStyle = `hsl(${hue} ${55 * b}% ${42 + 12 * b}%)`; ctx.fillRect(i * T, j * T, T + .5, 4); }
    } else if (v === 2) {
      ctx.fillStyle = `hsl(${hue} ${50 * b}% ${45 + 8 * b}%)`; ctx.fillRect(i * T, j * T, T + .5, 4);
    } else {
      ctx.fillStyle = 'hsl(280 40% 40%)';
      for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(i * T + k * 4, j * T + T); ctx.lineTo(i * T + k * 4 + 2, j * T + 8); ctx.lineTo(i * T + k * 4 + 4, j * T + T); ctx.fill(); }
    }
  }

  // campfire + lore
  const [fx, fy] = seeds.fire, cxp = fx * T, cyp = fy * T;
  ctx.fillStyle = '#6b4a2b'; ctx.fillRect(cxp - 8, cyp + 4, 16, 4);
  const fl = 8 + Math.sin(time * 13) * 2 + Math.sin(time * 31) * 1.5;
  ctx.fillStyle = '#ff9d3c'; ctx.beginPath(); ctx.moveTo(cxp - 5, cyp + 5); ctx.lineTo(cxp, cyp + 5 - fl); ctx.lineTo(cxp + 5, cyp + 5); ctx.fill();
  ctx.fillStyle = '#ffe08a'; ctx.beginPath(); ctx.moveTo(cxp - 2.5, cyp + 5); ctx.lineTo(cxp, cyp + 5 - fl * .6); ctx.lineTo(cxp + 2.5, cyp + 5); ctx.fill();
  ctx.font = '9px monospace'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff';
  if (nearFire) ctx.fillText('E — rest & save', cxp, cyp - 18);
  const [lx, ly] = seeds.lore;
  ctx.fillStyle = '#7a7a85'; ctx.fillRect(lx * T - 5, ly * T - 6, 10, 15);
  ctx.fillStyle = '#aee'; ctx.fillRect(lx * T - 1, ly * T - 2, 2, 6);

  // shards + tease
  const gem = (gx, gy, a, lock) => {
    ctx.save(); ctx.translate(gx * T, gy * T + Math.sin(time * 2.4) * 3); ctx.rotate(time * 1.5);
    ctx.globalAlpha = a; ctx.fillStyle = lock ? '#889' : `hsl(${(time * 40) % 360} 80% 70%)`;
    ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(6, 0); ctx.lineTo(0, 8); ctx.lineTo(-6, 0); ctx.fill();
    ctx.restore(); ctx.globalAlpha = 1;
  };
  for (const [sx, sy, bit] of seeds.shards) if (!(abil & bit)) gem(sx, sy, .9, 0);
  gem(seeds.tease[0], seeds.tease[1], .35, 1);

  for (const sk of sparks) {
    if (sk.got) continue;
    const b = Math.sin(time * 3 + sk.ph) * 2;
    ctx.fillStyle = '#ffe28a';
    ctx.fillRect(sk.x - 1, sk.y - 4 + b, 2, 8); ctx.fillRect(sk.x - 4, sk.y - 1 + b, 8, 2);
  }
  for (const f of foes) {
    const cell = 1 + f.k, wob = Math.sin(f.t * 6) * 1.5;
    ctx.fillStyle = f.fl > 0 ? '#fff' : FOECOL[f.k];
    for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++)
      if (PAT[r] >> (4 - c) & 1) ctx.fillRect(f.x + c * cell, f.y + r * cell + wob, cell, cell);
  }
  for (const s of shots) { ctx.fillStyle = `hsl(${(time * 500) % 360} 85% 65%)`; ctx.fillRect(s.x - 3, s.y - 2, 6, 4); }

  // contextual melee prompt (once, near first foe)
  if (!seenM && foes.some(f => Math.hypot(f.x - pl.x, f.y - pl.y) < 70)) {
    ctx.fillStyle = '#fff'; ctx.fillText(touch ? '⚔ — horn swipe' : 'J — horn swipe', pl.x + PW / 2, pl.y - 16);
  }

  // unicorn
  if (pl.inv <= 0 || Math.sin(time * 40) > 0) {
    ctx.save();
    ctx.translate(pl.x + PW / 2, pl.y + PH); ctx.scale((2 - pl.sq) * pl.face, pl.sq); ctx.translate(-PW / 2, -PH);
    const ph = pl.ground && Math.abs(pl.vx) > 20 ? Math.sin(pl.t * 16) * 3 : (pl.ground ? 0 : 2);
    ctx.fillStyle = '#f5f1f4';
    ctx.fillRect(1, 12 + ph * .3, 2, 4 - ph * .3); ctx.fillRect(7, 12 - ph * .3, 2, 4 + ph * .3);
    ctx.fillRect(0, 5, 10, 7); ctx.fillRect(7, 0, 5, 6);
    ctx.fillStyle = '#ffd75e'; ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(14, -5); ctx.lineTo(12, 1); ctx.fill();
    ['#ff6b6b', '#ffd75e', '#6bc5ff'].forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(5 - i * 2, 1 + i * 2, 2, 4); });
    ctx.fillStyle = '#333'; ctx.fillRect(10, 2, 1.5, 1.5);
    if (swT > 0) {                                               // swipe arc
      ctx.fillStyle = 'rgba(255,255,255,.75)';
      ctx.fillRect(10, -2, 13 * (swT / .14), 16);
    }
    ctx.restore();
    if (chT > 0) {                                               // heal channel ring
      ctx.strokeStyle = '#9fe8a0'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(pl.x + PW / 2, pl.y + 6, 12, -1.57, -1.57 + 6.28 * chT / (1.3 - .1 * he)); ctx.stroke();
    }
  }

  for (const p of parts) { ctx.globalAlpha = Math.min(1, p.t * 2); ctx.fillStyle = p.c; ctx.fillRect(p.x - 1.5, p.y - 1.5, 3, 3); }
  ctx.globalAlpha = 1;
  for (const f of flies) {
    ctx.globalAlpha = Math.min(1, f.t * 2); ctx.font = (f.big ? 'bold 12px' : '9px') + ' monospace';
    ctx.fillStyle = f.c; ctx.fillText(f.txt, f.x, f.y);
  }
  ctx.globalAlpha = 1;
  ctx.translate(cam.x | 0, cam.y | 0);

  // ---------- HUD ----------
  ctx.font = '12px monospace'; ctx.textAlign = 'left';
  for (let i = 0; i < mHP(); i++) { ctx.fillStyle = i < hp ? '#ff5d6c' : '#3a3a44'; ctx.fillText('♥', 8 + i * 13, 16); }
  ctx.fillStyle = '#2a2a33'; ctx.fillRect(8, 22, 52, 5);        // mana bar
  ctx.fillStyle = '#e08ae0'; ctx.fillRect(8, 22, 52 * mn / mMN(), 5);
  ctx.fillStyle = '#e08ae0'; ctx.font = '9px monospace'; ctx.fillText('✦' + mn, 64, 28);
  ctx.fillStyle = '#ffe28a'; ctx.fillText('💎' + spk, 8, 41);
  ctx.fillStyle = '#9f9'; ctx.fillText('LV' + lvl + ' 🎲d' + DIE(), 8, 54);
  ctx.fillStyle = '#2a2a33'; ctx.fillRect(70, 48, 40, 5);
  ctx.fillStyle = '#6bc56b'; ctx.fillRect(70, 48, 40 * Math.min(1, xp / need()), 5);
  ctx.textAlign = 'center'; ctx.fillStyle = '#ccc';
  ctx.fillText(!(abil & 1) ? '✧ Find the First Shard — east, through the gloom ➜'
    : !(abil & 2) ? '⬅ The west gate yields to your new jump — climb'
      : !(abil & 4) ? '✧ Higher. The last light waits on the plateau'
        : '✧ End of the slice — the world grows from here', VW / 2, 14);
  if (dmT > 0) {
    ctx.globalAlpha = Math.min(1, dmT); ctx.fillStyle = 'rgba(10,8,14,.82)';
    ctx.fillRect(VW / 2 - 190, VH - 60, 380, 24);
    ctx.fillStyle = '#e8d9b0'; ctx.font = 'italic 9px monospace';
    ctx.fillText('DM — ' + dmTxt, VW / 2, VH - 45); ctx.globalAlpha = 1;
  }
  if (deathT > 0) { ctx.fillStyle = `rgba(0,0,0,${1 - Math.abs(deathT - .8) / .8})`; ctx.fillRect(0, 0, VW, VH); }

  // touch overlay
  if (touch && started && !choosing) {
    ctx.font = '14px monospace';
    for (const b of btns()) {
      ctx.globalAlpha = keys.has(b.c) ? .7 : .35;
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 7); ctx.fill();
      ctx.globalAlpha = .9; ctx.fillStyle = '#111'; ctx.fillText(b.l, b.x, b.y + 5);
    }
    ctx.globalAlpha = 1;
  }

  // level-up choice
  if (choosing) {
    ctx.fillStyle = 'rgba(8,6,12,.8)'; ctx.fillRect(0, 0, VW, VH);
    ctx.fillStyle = '#ffd75e'; ctx.font = 'bold 14px monospace';
    ctx.fillText('LEVEL ' + (lvl + 1) + ' — choose your growth', VW / 2, 80);
    const NAMES = ['HORN', 'HOOF', 'HEART', 'SPARK'], COLS = ['#ffd75e', '#6bc5ff', '#ff5d6c', '#e08ae0'];
    STATS.forEach((s, i) => {
      const bx = VW / 2 - 172 + i * 88;
      ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.fillRect(bx, 100, 80, 92);
      ctx.fillStyle = COLS[i]; ctx.font = 'bold 11px monospace'; ctx.fillText((i + 1) + ' ' + NAMES[i], bx + 40, 122);
      ctx.fillStyle = '#ccc'; ctx.font = '8px monospace';
      const words = s[1].split(' ');
      words.forEach((w, k) => ctx.fillText(w, bx + 40, 140 + k * 11));
    });
    ctx.fillStyle = '#888'; ctx.font = '9px monospace'; ctx.fillText('press 1–4 or tap', VW / 2, 214);
  }

  // title
  if (!started) {
    ctx.fillStyle = 'rgba(8,6,12,.75)'; ctx.fillRect(0, 0, VW, VH);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 22px monospace'; ctx.fillText('NAT 20 UNICORN', VW / 2, 104);
    ctx.fillStyle = '#ffd75e'; ctx.font = '10px monospace'; ctx.fillText('the diorama has gone gray — paint it back', VW / 2, 124);
    ctx.fillStyle = '#aaa';
    ctx.fillText('A/D or ←→ move · SPACE/Z jump · J/X swipe', VW / 2, 148);
    ctx.fillText('L/C shot · hold S heal · E interact', VW / 2, 162);
    ctx.fillStyle = '#fff'; ctx.fillText(Math.sin(time * 3) > 0 ? '— press any key or tap —' : '', VW / 2, 186);
  }
  ctx.restore();
};

// ---------- loop ----------
load();
say('Ah. The last painted mini wakes. Shall we finish the campaign, little horse?');
const loop = () => {
  const now = performance.now(), dt = Math.min(.033, (now - last) / 1000); last = now;
  step(dt); draw();
  requestAnimationFrame(loop);
};
loop();
