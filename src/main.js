// NAT 20 UNICORN v2 — 2D metroidvania platformer. Canvas 2D, no WebGL.
// Phase 1 (bible-approved): dual-convention controls + touch overlay,
// verb economy (stomp free · melee GENERATES mana · shot/heal SPEND it),
// 4 stats chosen at level-up (HORN/HOOF/HEART/SPARK), contextual prompts.
import { T, W, H, grid, tile, regions, regionAt, seeds } from './world.js';

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
  if (['ShiftLeft', 'ShiftRight', 'KeyO'].includes(e.code)) dash();
  if (choosing) { const n = '123456'.indexOf(e.key); if (n >= 0) pick(n); }
  else if (shopping) {
    const n = '12345'.indexOf(e.key); if (n >= 0) buy(n);
    if (e.code === 'KeyB' || e.code === 'KeyE') { shopping = 0; keys.delete('KeyE'); }
  } else if (e.code === 'KeyB' && nearFire) shopping = 1;
  boot();
});
addEventListener('keyup', (e) => keys.delete(e.code));
const held = (...c) => c.some(k => keys.has(k));
const jumpHeld = () => J_KEYS.some(k => keys.has(k)) || keys.has('TBtnJ'); // button jump gets full hold-height too
const healHeld = () => HE_KEYS.some(k => keys.has(k)) || keys.has('TBtnH');

// ---------- touch overlay (auto-shown; fixed dpad left, verb cluster right) ----------
const btns = () => {
  const b = [
    { x: VW - 36, y: VH - 34, r: 28, l: '▲', h: 'SPACE', c: 'TBtnJ' },  // JUMP — biggest, thumb rest
    { x: VW - 94, y: VH - 28, r: 22, l: '⚔', h: 'J', c: 'TBtnM' },      // melee
  ];
  if (touch) b.unshift(                                                 // dpad is touch-only — keyboard moves on desktop
    { x: 28, y: VH - 30, r: 22, l: '◀', h: '', c: 'TBtnL' },
    { x: 76, y: VH - 30, r: 22, l: '▼', h: '', c: 'TBtnDn' },            // drop through platforms
    { x: 124, y: VH - 30, r: 22, l: '▶', h: '', c: 'TBtnR' });
  if (abil & 4) b.push({ x: VW - 86, y: VH - 74, r: 19, l: '✦', h: 'L', c: 'TBtnS' });
  if (abil & 2) b.push({ x: VW - 34, y: VH - 86, r: 17, l: '＋', h: 'S', c: 'TBtnH' });
  if (abil & 8) b.push({ x: VW - 138, y: VH - 62, r: 19, l: '»', h: 'SHIFT', c: 'TBtnD' });
  if (nearFire || nearLore) b.push({ x: VW / 2, y: VH - 28, r: 18, l: 'E', h: '', c: 'KeyE' });
  return b;
};
const ptrs = new Map();
const toV = (e) => [(e.clientX - SOX) / SS, (e.clientY - SOY) / SS];
addEventListener('pointerdown', (e) => {
  boot();
  if (e.pointerType === 'touch') touch = 1;
  const [vx, vy] = toV(e);
  if (choosing) {
    const pitch = 82, sx0 = VW / 2 - (menu.length * pitch - 6) / 2;
    if (vy > 100 && vy < 196) { const n = (vx - sx0) / pitch | 0; if (n >= 0 && n < menu.length) pick(n); }
    return;
  }
  if (shopping) {
    const n = (vy - 92) / 26 | 0;
    if (vy >= 92 && n < SHOP.length && vx > VW / 2 - 130 && vx < VW / 2 + 130) buy(n);
    else shopping = 0;
    return;
  }
  for (const b of btns()) if (Math.hypot(vx - b.x, vy - b.y) < b.r + 6) {
    ptrs.set(e.pointerId, b.c); keys.add(b.c);
    if (b.c === 'TBtnJ') jbuf = .12;
    if (b.c === 'TBtnM') swing();
    if (b.c === 'TBtnS') shoot();
    if (b.c === 'TBtnD') dash();
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
const LORE = [
  'Before the doubt, every tile of this table was painted. I remember the brush.',
  'The roots drink what the sky forgets. Even doubt has an underside.',
];

// ---------- RPG 2.0 (researched): milestone dice, modifier stats, D&D perks ----------
let ho = 1, he = 1, sp = 1;                       // HORN (+dmg) HEART (+♥) SPARK (+✦) — HOOF cut (useless + broke gate proofs)
let hp = 3, xp = 0, lvl = 1, spk = 0;
let sh = 0, abil = 0, bossDead = 0;               // sh = shards HELD; abil = skills LEARNED; bits: 1 DJ 2 heal 4 shot 8 dash 16 heart
let mn = 5, choosing = 0, pending = 0, pk = 0, edg = 0, shp = 0, shopB = 0, shopping = 0;
const bossLive = [0, 0, 0, 0, 0];
const mHP = () => 2 + he + shp, mMN = () => 3 + sp * 2;
const DIE = () => lvl >= 12 ? 12 : lvl >= 9 ? 10 : lvl >= 6 ? 8 : lvl >= 3 ? 6 : 4; // die = LEVEL MILESTONE (Zelda-heart law)
const MOD = () => ho - 1 + edg;                   // flat damage modifier — the +N in "d8+N"
const roll = (adv) => {                           // adv: ADVANTAGE perk (melee only) rolls 2d keep best
  let r = 1 + (Math.random() * DIE() | 0);
  if (adv && (pk & 2)) r = Math.max(r, 1 + (Math.random() * DIE() | 0));
  if ((pk & 4) && r === 1) r = 1 + (Math.random() * DIE() | 0);   // REROLL 1s
  return r;
};
const isCrit = (r) => r >= DIE() - ((pk & 1) ? 1 : 0);            // KEEN HORN widens crit range
const earned = Array(13).fill(0);
const need = () => 8 + lvl * 6;
const gainXp = (n, x, y) => {
  if (pk & 16) n = Math.round(n * 1.25);          // SCHOLAR
  xp += n; fly(x, y, '+' + n + ' XP', '#9f9');
  while (xp >= need()) { xp -= need(); pending++; }
  if (pending && !choosing) { choosing = 1; openMenu(); S_NAT(); }
};
const STATS = [
  ['HORN', '+1 damage mod', '#ffd75e', () => ho++],
  ['HEART', '+1 max ♥ · faster heal', '#ff5d6c', () => { he++; hp++; }],
  ['SPARK', '+2 max mana', '#e08ae0', () => { sp++; mn += 2; }],
];
const PERKS = [                                   // even levels: pick 1 of 3 — real table rules, zero movement physics
  { b: 1, n: 'KEEN HORN', d: 'crit on top 2 rolls' },
  { b: 2, n: 'ADVANTAGE', d: 'melee rolls 2d, keeps best' },
  { b: 4, n: 'REROLL 1s', d: 'a rolled 1 rerolls once' },
  { b: 8, n: 'MANA FONT', d: '+1 ✦ every kill' },
  { b: 16, n: 'SCHOLAR', d: '+25% XP' },
  { b: 32, n: 'THICK MANE', d: 'longer grace after hits' },
  { b: 64, n: 'PIERCE', d: 'bolts pass through foes' },
  { b: 128, n: 'STOMP SPARK', d: '+2 ✦ on stomp kills' },
];
const SKILLS = {
  1: ['DBL JUMP', 'jump again in air', '#6bc5ff'],
  2: ['R. HEAL', 'hold S · mend 1♥', '#9fe8a0'],
  4: ['R. SHOT', 'press L · ✦3 bolt', '#e08ae0'],
  8: ['AIR DASH', 'Shift · burst fwd', '#ffd75e'],
};
const LEARN = {
  1: 'DOUBLE JUMP. You remember the sky.',
  2: 'RAINBOW HEAL. Hold S, stand still, mend. Mercy costs mana — swing that horn to earn it.',
  4: 'RAINBOW SHOT. Press L. Gloom crystal shatters before it.',
  8: 'AIR DASH. The space between platforms was always a suggestion.',
};
let menu = [];                                    // cached per screen — random perk offers must not reshuffle each frame
const openMenu = () => {
  menu = [];
  for (const bit of [1, 2, 4, 8]) if ((sh & bit) && !(abil & bit)) menu.push({ k: bit, n: SKILLS[bit][0], d: SKILLS[bit][1], col: SKILLS[bit][2] });
  const un = PERKS.filter(p => !(pk & p.b));
  if ((lvl + 1) % 2 === 0 && un.length) {         // even level -> perk offer
    for (let i = 0; i < 3 && un.length; i++) { const j = Math.random() * un.length | 0; const p = un[j]; un.splice(j, 1); menu.push({ p, n: p.n, d: p.d, col: '#c9a6f7' }); }
  } else STATS.forEach((s, i) => menu.push({ i, n: s[0], d: s[1], col: s[2] }));
  menu = menu.slice(0, 6);
};
const pick = (n) => {
  const c = menu[n]; if (!c) return;
  if (c.k) { abil |= c.k; say(LEARN[c.k]); }
  else if (c.p) pk |= c.p.b;
  else STATS[c.i][3]();
  lvl++; pending--;
  fly(pl.x, pl.y - 14, c.n + '!', '#ffd75e', 1); sfx(660, 990, .15, 'triangle', .12);
  if ([3, 6, 9, 12].includes(lvl)) { fly(pl.x, pl.y - 26, '🎲 → d' + DIE(), '#fff', 1); say('The die grows. A d' + DIE() + ' now. The table approves.'); }
  if (!pending) { choosing = 0; save(); } else openMenu();
  if (lvl === 3) say('Choosing who you become. That is the whole game, little horse.');
};

// ---------- campfire shop (the ONE fire is where sparkles become power) ----------
const SHOP = [
  { c: 6, n: 'Kindled Horn', d: '+1 damage', f: () => edg++ },
  { c: 10, n: 'Warm Heart', d: '+1 max ♥', f: () => { shp++; hp++; } },
  { c: 12, n: 'Kindled Horn II', d: '+1 damage', f: () => edg++ },
  { c: 15, n: 'Sparkstone', d: '+1 max ♥', f: () => { shp++; hp++; } },
  { c: 18, n: 'Ember Edge', d: '+1 damage', f: () => edg++ },
];
const buy = (i) => {
  const it = SHOP[i]; if (!it || (shopB & (1 << i)) || spk < it.c) { if (it) sfx(160, 90, .1, 'square', .08); return; }
  spk -= it.c; shopB |= 1 << i; it.f(); save();
  sfx(700, 1400, .18, 'triangle', .12); burst(pl.x + PW / 2, pl.y, 12, '#ffd75e');
  fly(pl.x, pl.y - 14, it.n + '!', '#ffd75e', 1);
};

// ---------- save (single-char keys — terser mangle-props law) ----------
const save = () => {
  localStorage.n20_save = JSON.stringify({
    v: 4, e: earned, h: hp, x: xp, l: lvl, s: spk, a: abil, n: mn, q: sh, g: bossDead,
    p: pk, w: shopB, t: [ho, he, sp], c: [cp[0], cp[1]], b: regions.map(r => r.t),
  });
};
const load = () => {
  try {
    const d = JSON.parse(localStorage.n20_save || '0');
    if (!d || d.v !== 4) return;                                // RPG 2.0 — old saves start fresh
    d.e.forEach((v, i) => earned[i] = v);
    hp = d.h; xp = d.x; lvl = d.l; spk = d.s; abil = d.a; mn = d.n || 5;
    sh = d.q || abil; bossDead = d.g || sh;
    pk = d.p || 0; shopB = d.w || 0;
    edg = ((shopB >> 0) & 1) + ((shopB >> 2) & 1) + ((shopB >> 4) & 1); // rebuild shop effects from bought bits
    shp = ((shopB >> 1) & 1) + ((shopB >> 3) & 1);
    if (d.t) [ho, he, sp] = d.t;
    cp = d.c; pl.x = cp[0]; pl.y = cp[1];
    d.b.forEach((v, i) => { regions[i].t = v; regions[i].b = v; });
  } catch (e) { /* fresh oath */ }
};

// ---------- player ----------
const PW = 10, PH = 14;
const pl = { x: 126 * T, y: 57 * T, vx: 0, vy: 0, ground: 0, face: 1, coyote: 0, air: 0, sq: 1, inv: 0, t: 0 };
let cp = [126 * T, 57 * T], lastSafe = [126 * T, 57 * T], deathT = 0;
let atkCd = 0, swT = 0, chT = 0, nearFire = 0, nearLore = 0, seenM = 0, seenH = 0;
let dashT = 0, dashCd = 0, adash = 0, dropT = 0;
const loreRead = [0, 0];
// FIXED physics — never stat-scaled: the map gate proofs depend on these numbers
const G_RISE = 750, G_FALL = 1500, FALLCAP = 400;
const RUN = () => 115, V0 = () => 250;

const solid = (x, y) => { const v = tile(x / T | 0, y / T | 0); return v === 1 || v === 4; }; // gloom crystal is solid until shot
const spike = (x, y) => tile(x / T | 0, y / T | 0) === 3;

// ---------- entities ----------
const sparks = seeds.sparks.map(([x, y]) => ({ x: x * T, y: y * T, got: 0, ph: Math.random() * 7 }));
const motes = seeds.motes.map(([x, y]) => ({ x: x * T, y: y * T, got: 0, ph: Math.random() * 7 }));
const FOECOL = ['', '#cba6f7', '#5aa0e0', '#e05555'];
const PAT = [0b01110, 0b11111, 0b11011, 0b11111];
const foes = seeds.foes.map(([x, y, k]) => ({ x: x * T, y: y * T, vx: (18 + 26 / k) * (Math.random() < .5 ? 1 : -1), k, hp: k * 4, fl: 0, t: Math.random() * 7 })); // HP scaled for the d+MOD damage line
const fsz = (f) => 5 * (f.cz || 1 + f.k);          // one size rule for sprites + collision
const shots = [], flies = [], parts = [];
const fly = (x, y, txt, c, big) => flies.push({ x, y, txt, c, big, t: 1.2 });
const burst = (x, y, n, c) => { for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, s = 40 + Math.random() * 80; parts.push({ x, y, vx: Math.sin(a) * s, vy: Math.cos(a) * s - 60, t: .5 + Math.random() * .4, c }); } };

const BOSS_INTRO = [
  "A guardian rises. The meadow's doubt has a body. ROLL INITIATIVE.",
  'The roots kept their worst below. Guardian of the caves!',
  'The canopy shakes — this one has watched you climb.',
  'The summit wind carries a giant. Peak guardian!',
  'The Heart itself stands up. Everything gray began here.',
];
const BOSS_DEAD = [
  'Guardian down. The shard is loose — take it.',
  'It folds. The caves exhale. Claim it.',
  'Timber. Take your prize, little horse.',
  'The peak is yours.',
  'The doubt... surrenders.',
];

// damage a foe: dmg = die + MOD, crit doubles. Full D&D damage line, visible.
const strike = (f, r, gen, viaStomp) => {
  const crit = isCrit(r), dmg = (r + MOD()) * (crit ? 2 : 1);
  f.hp -= dmg; f.fl = .15;
  fly(f.x, f.y - 8, crit ? 'NAT ' + r + '! ' + dmg : MOD() ? r + '+' + MOD() : '🎲' + r, crit ? '#ffd75e' : '#fff', crit);
  if (crit) { S_NAT(); earned[3] = 1; burst(f.x, f.y, 24, '#ffd75e'); }
  if (gen) { mn = Math.min(mMN(), mn + 1); }                    // melee GENERATES mana
  if (f.hp <= 0) {
    foes.splice(foes.indexOf(f), 1);
    burst(f.x, f.y, 12, FOECOL[f.k]); gainXp(f.k * 3 + (crit ? 4 : 0), f.x, f.y - 16);
    spk += f.bit ? 5 : 1;                                       // kills drop sparkles — the shop economy's income
    if (pk & 8) mn = Math.min(mMN(), mn + 1);                   // MANA FONT
    if (viaStomp && (pk & 128)) mn = Math.min(mMN(), mn + 2);   // STOMP SPARK
    if (f.bit) {                                                // GUARDIAN falls — shard unlocks
      bossDead |= f.bit; bossLive[f.bi] = 0;
      gainXp(12 + 6 * f.bi, f.x, f.y - 26); burst(f.x, f.y, 30, '#fff');
      say(BOSS_DEAD[f.bi]); save();
    }
    if (!earned[2]) { earned[2] = 1; say('First gloom, popped. That is how doubt dies: under hooves.'); }
    return 1;
  }
};

// ---------- verbs ----------
function swing() {                                              // melee: horn swipe
  if (!started || choosing || shopping || deathT > 0 || atkCd > 0) return;
  atkCd = .28; swT = .14; seenM = 1; sfx(340, 90, .07, 'square', .1);
  const hx = pl.x + (pl.face > 0 ? PW : -16), hy = pl.y - 2;
  for (const f of [...foes]) {
    const fs = fsz(f);
    if (f.x + fs > hx && f.x < hx + 16 && f.y + fs > hy && f.y < hy + PH + 4) strike(f, roll(1), 1, 0);
  }
}
function shoot() {                                              // rainbow shot: 3 mana
  if (!started || choosing || shopping || deathT > 0 || !(abil & 4)) return;
  if (mn < 3) { fly(pl.x, pl.y - 12, 'need ✦3', '#f9c'); return; }
  mn -= 3; sfx(700, 1300, .12, 'sawtooth', .09);
  shots.push({ x: pl.x + PW / 2, y: pl.y + 5, vx: pl.face * 270, t: 1.1 });
}
function dash() {                                               // air dash: burst, resets on landing
  if (!started || choosing || shopping || deathT > 0 || !(abil & 8) || dashCd > 0) return;
  if (!pl.ground) { if (adash) return; adash = 1; }
  chT = 0;                                                      // dash cancels a heal channel (no move-while-rooted exploit)
  dashT = .15; dashCd = .45; pl.sq = .6; sfx(600, 200, .12, 'sawtooth', .12);
}

const hurt = (n, safe) => {
  if (pl.inv > 0 || deathT > 0) return;
  hp -= n; pl.inv = (pk & 32) ? 1.8 : 1.2; chT = 0; sfx(140, 55, .25, 'sawtooth', .2); burst(pl.x, pl.y + 7, 10, '#e05555'); // THICK MANE
  if ((abil & 2) && !seenH) { seenH = 1; say('Hurt? Hold S. Channel the rainbow — but stand STILL to do it.'); }
  if (hp <= 0) { deathT = 1.6; say('The mini falls over. ...We do not stop rolling. Back to the fire.'); return; }
  if (safe) { pl.x = lastSafe[0]; pl.y = lastSafe[1]; pl.vx = pl.vy = 0; }
  else pl.vy = -180;
};

// ---------- update ----------
let last = performance.now(), time = 0;
const step = (dt) => {
  time += dt; dmT -= dt; jbuf -= dt; pl.inv -= dt; pl.t += dt; atkCd -= dt; swT -= dt; dashT -= dt; dashCd -= dt; dropT -= dt;
  regions.forEach(r => r.b += (r.t - r.b) * Math.min(1, dt * .9));
  pl.sq += (1 - pl.sq) * Math.min(1, dt * 10);

  if (deathT > 0) {
    deathT -= dt;
    if (deathT <= 0) { hp = mHP(); pl.x = cp[0]; pl.y = cp[1]; pl.vx = pl.vy = 0; pl.inv = 1.5; }
    return;
  }
  if (!started || choosing || shopping) return;

  // -- drop-through: DOWN on a one-way platform falls through it (S doubles as
  // down here — movement wins over heal on platforms; heal works on solid ground) --
  const onPlat = pl.ground && tile((pl.x + PW / 2) / T | 0, (pl.y + PH + 1) / T | 0) === 2;
  if (onPlat && held('ArrowDown', 'KeyS', 'TBtnDn')) { dropT = .16; pl.ground = 0; pl.y += 3; pl.vy = 60; chT = 0; }

  // -- heal channel: rooted, costs 5, restores 1 (faster with HEART) --
  const canHeal = (abil & 2) && mn >= 5 && hp < mHP() && pl.ground && !onPlat;
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
  if (dashT > 0) {                                              // dash overrides physics: flat burst
    pl.vx = pl.face * 400; pl.vy = 0;
    parts.push({ x: pl.x + PW / 2, y: pl.y + 8, vx: 0, vy: 0, t: .3, c: `hsl(${(time * 500) % 360} 80% 65%)` });
  } else {
    pl.vy += (pl.vy < 0 ? G_RISE : G_FALL) * (Math.abs(pl.vy) < 40 ? .5 : 1) * dt;
    pl.vy = Math.min(pl.vy, FALLCAP);
  }

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
      if (tv === 1 || (tv === 2 && py + PH <= top + 4 && dropT <= 0)) {
        pl.y = top - PH;
        if (!wasGround && pl.vy > 250) { pl.sq = 1.35; burst(pl.x + PW / 2, feet, 5, '#bbb'); sfx(150, 70, .06, 'square', .07); }
        pl.vy = 0; pl.ground = 1; pl.air = 0; break;
      }
    }
  } else {
    for (const ox of [1, PW - 1]) if (solid(pl.x + ox, pl.y)) { pl.y = ((pl.y / T | 0) + 1) * T + .01; pl.vy = 0; break; }
  }
  if (pl.ground) {
    adash = 0;                                                  // air dash recharges on landing
    // NO-SOFTLOCK: only record lastSafe when NO spike exists in the 3x3 tiles
    // around the feet — a pit floor beside spikes can never become "safe"
    let ok = 1;
    const fc = (pl.x + PW / 2) / T | 0, fr = (pl.y + PH) / T | 0;
    for (let j = fr - 1; j <= fr + 1; j++) for (let i = fc - 1; i <= fc + 1; i++) if (tile(i, j) === 3) ok = 0;
    if (ok) lastSafe = [pl.x, pl.y];
  }

  for (const [ox, oy] of [[1, PH - 1], [PW - 1, PH - 1], [PW / 2, PH]])
    if (spike(pl.x + ox, pl.y + oy)) { hurt(1, 1); break; }
  if (pl.y > H * T) hurt(1, 1);

  // -- sparks --
  for (const s of sparks) {
    if (s.got) continue;
    if (Math.hypot(pl.x + PW / 2 - s.x, pl.y + PH / 2 - s.y) < 13) { s.got = 1; spk++; mn = Math.min(mMN(), mn + 1); sfx(880, 1500, .07, 'triangle', .09); burst(s.x, s.y, 5, '#fe9'); }
  }

  // -- guardians: each shard is boss-gated --
  seeds.bosses.forEach(([bx, by], i) => {
    const bit = seeds.shards[i][2];
    if ((bossDead & bit) || bossLive[i]) return;
    if (Math.hypot(pl.x - bx * T, pl.y - by * T) < 80) {
      bossLive[i] = 1;
      foes.push({ x: bx * T, y: by * T, vx: 0, vy: 0, k: 3, hp: 24 + 10 * i, mx: 24 + 10 * i, bi: i, bit, cz: 4, fl: 0, t: 0, hop: 1 });
      say(BOSS_INTRO[i]); sfx(110, 55, .5, 'sawtooth', .18);
    }
  });

  // -- shards: locked (ghost) until the guardian falls; pickup = a level moment --
  for (const [sx, sy, bit] of seeds.shards) {
    if ((sh & bit) || !(bossDead & bit)) continue;
    if (Math.hypot(pl.x - sx * T, pl.y - sy * T) < 16) {
      sh |= bit; earned[1] = 1; S_SHARD(); burst(sx * T, sy * T, 30, '#fff');
      if (bit === 1) regions[1].t = 1;
      if (bit === 2) regions[2].t = 1;
      if (bit === 4) { regions[5].t = 1; regions[6].t = 1; }
      if (bit === 8) regions[4].t = 1;
      if (bit === 16) { abil |= 16; regions.forEach(r => r.t = 1); earned[12] = 1; say('The heart of the doubt, gone soft and bright. The diorama breathes. ...To be continued.'); }
      else say('The shard is yours — the world remembers. Its gift waits at your LEVEL UP.');
      pending++; choosing = 1; openMenu(); S_NAT();             // the RPG moment, guaranteed
      save();
    }
  }

  // -- stardust motes: exploration XP (worth a small pack of kills) --
  for (const m of motes) {
    if (m.got) continue;
    if (Math.hypot(pl.x + PW / 2 - m.x, pl.y + PH / 2 - m.y) < 13) { m.got = 1; sfx(660, 1100, .1, 'triangle', .1); burst(m.x, m.y, 8, '#8cf'); gainXp(8, m.x, m.y - 10); }
  }

  // -- shots --
  for (const s of shots) {
    s.t -= dt; s.x += s.vx * dt;
    parts.push({ x: s.x, y: s.y + Math.sin(time * 30) * 2, vx: 0, vy: 0, t: .25, c: `hsl(${(time * 500) % 360} 80% 65%)` });
    const tc = s.x / T | 0, tr = s.y / T | 0;
    if (tile(tc, tr) === 4) {                                   // shatter gloom crystal (3x3)
      for (let j = tr - 1; j <= tr + 1; j++) for (let i = tc - 1; i <= tc + 1; i++)
        if (tile(i, j) === 4) { grid[j * W + i] = 0; burst(i * T + 8, j * T + 8, 5, '#c9f'); }
      s.t = 0; sfx(900, 200, .2, 'square', .15);
    } else if (solid(s.x, s.y)) { s.t = 0; burst(s.x, s.y, 6, '#fff'); }
    if (s.t > 0) for (const f of foes) {                        // a spent bolt can't also hit a foe
      const fs = fsz(f);
      if (s.x > f.x && s.x < f.x + fs && s.y > f.y && s.y < f.y + fs) { if (!(pk & 64)) s.t = 0; strike(f, roll(0), 0, 0); break; } // PIERCE keeps flying
    }
  }
  for (let i = shots.length; i--;) if (shots[i].t <= 0) shots.splice(i, 1);

  // -- foes --
  for (const f of [...foes]) {
    f.t += dt; f.fl -= dt;
    const fs = fsz(f);
    if (f.bit) {                                                // GUARDIAN AI: chase + hop, leashed to its arena
      if (Math.hypot(pl.x - f.x, pl.y - f.y) > 220) { foes.splice(foes.indexOf(f), 1); bossLive[f.bi] = 0; continue; }
      f.hop -= dt;
      f.vx = Math.sign(pl.x + PW / 2 - f.x - fs / 2) * (28 + f.bi * 5);
      if (f.gr && f.hop <= 0) { f.vy = -240; f.hop = 2.4; f.gr = 0; }
    }
    f.vy = (f.vy || 0) + 900 * dt; f.y += f.vy * dt;
    const ty = (f.y + fs) / T | 0;
    const tv = tile((f.x + fs / 2) / T | 0, ty);
    if (f.vy > 0 && (tv === 1 || tv === 2 || tv === 4)) { f.y = ty * T - fs; f.vy = 0; f.gr = 1; }
    f.x += f.vx * dt;
    const ahead = f.x + fs / 2 + Math.sign(f.vx) * fs * .7;
    const blockedAhead = solid(ahead, f.y + fs / 2) || tile(ahead / T | 0, (f.y + fs + 6) / T | 0) === 0;
    if (blockedAhead) { if (f.bit) f.vx = 0; else f.vx *= -1; } // bosses hold their ground at edges — never lost off-arena
    if (pl.x < f.x + fs && pl.x + PW > f.x && pl.y < f.y + fs && pl.y + PH > f.y) {
      if (pl.vy > 40 && pl.y + PH - f.y < 10) {                 // stomp (free, mobility)
        strike(f, roll(0), 0, 1);
        pl.vy = jumpHeld() ? -290 : -220; pl.air = 0; pl.sq = .75; sfx(200, 55, .1, 'square', .2);
      } else hurt(1, 0);
    }
  }

  // -- campfires + lore stones --
  nearFire = 0; nearLore = 0;
  for (const [fx, fy] of seeds.fires) {
    if (Math.hypot(pl.x - fx * T, pl.y - fy * T) > 26) continue;
    nearFire = 1;
    if (keys.has('KeyE')) {
      keys.delete('KeyE');
      hp = mHP(); cp = [fx * T - 20, (fy - 1) * T]; earned[0] = 1; save();
      burst(fx * T, fy * T - 8, 12, '#fc6'); sfx(500, 900, .3, 'triangle', .1);
      say('Rest. Saved. The fire keeps what you earned.');
    }
  }
  seeds.lores.forEach(([lx, ly], i) => {
    if (Math.hypot(pl.x - lx * T, pl.y - ly * T) > 22) return;
    nearLore = 1;
    if (keys.has('KeyE')) {
      keys.delete('KeyE'); say(LORE[i]);
      if (!loreRead[i]) { loreRead[i] = 1; gainXp(6, pl.x, pl.y - 12); }
    }
  });

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

  const rg = regionAt(pl.x + PW / 2, pl.y + 7);
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
    const r = regionAt(i * T + 8, j * T + 8), hue = r.h * 360, b = r.b;
    if (v === 1) {
      ctx.fillStyle = `hsl(${hue} ${40 * b}% ${26 + 6 * b}%)`; ctx.fillRect(i * T, j * T, T + .5, T + .5);
      if (tile(i, j - 1) !== 1) { ctx.fillStyle = `hsl(${hue} ${55 * b}% ${42 + 12 * b}%)`; ctx.fillRect(i * T, j * T, T + .5, 4); }
    } else if (v === 2) {
      ctx.fillStyle = `hsl(${hue} ${50 * b}% ${45 + 8 * b}%)`; ctx.fillRect(i * T, j * T, T + .5, 4);
    } else if (v === 4) {                                       // gloom crystal — pulses, begs to be shot
      ctx.fillStyle = `hsl(280 60% ${26 + Math.sin(time * 4 + i + j) * 8}%)`;
      ctx.fillRect(i * T, j * T, T + .5, T + .5);
      ctx.fillStyle = 'hsl(290 80% 60%)'; ctx.fillRect(i * T + 5, j * T + 5, 6, 6);
    } else {
      ctx.fillStyle = 'hsl(280 40% 40%)';
      for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(i * T + k * 4, j * T + T); ctx.lineTo(i * T + k * 4 + 2, j * T + 8); ctx.lineTo(i * T + k * 4 + 4, j * T + T); ctx.fill(); }
    }
  }

  // campfires + lore stones
  ctx.font = '9px monospace'; ctx.textAlign = 'center';
  for (const [fx, fy] of seeds.fires) {
    const cxp = fx * T, cyp = fy * T;
    ctx.fillStyle = '#6b4a2b'; ctx.fillRect(cxp - 8, cyp + 4, 16, 4);
    const fl = 8 + Math.sin(time * 13) * 2 + Math.sin(time * 31) * 1.5;
    ctx.fillStyle = '#ff9d3c'; ctx.beginPath(); ctx.moveTo(cxp - 5, cyp + 5); ctx.lineTo(cxp, cyp + 5 - fl); ctx.lineTo(cxp + 5, cyp + 5); ctx.fill();
    ctx.fillStyle = '#ffe08a'; ctx.beginPath(); ctx.moveTo(cxp - 2.5, cyp + 5); ctx.lineTo(cxp, cyp + 5 - fl * .6); ctx.lineTo(cxp + 2.5, cyp + 5); ctx.fill();
    if (nearFire && Math.hypot(pl.x - cxp, pl.y - cyp) < 26) { ctx.fillStyle = '#fff'; ctx.fillText('E — rest & save · B — shop', cxp, cyp - 18); }
  }
  for (const [lx, ly] of seeds.lores) {
    ctx.fillStyle = '#7a7a85'; ctx.fillRect(lx * T - 5, ly * T - 6, 10, 15);
    ctx.fillStyle = '#aee'; ctx.fillRect(lx * T - 1, ly * T - 2, 2, 6);
  }
  // stardust motes (blue — exploration XP)
  for (const m of motes) {
    if (m.got) continue;
    const b = Math.sin(time * 2.5 + m.ph) * 2;
    ctx.fillStyle = '#8cf';
    ctx.fillRect(m.x - 1.5, m.y - 5 + b, 3, 10); ctx.fillRect(m.x - 5, m.y - 1.5 + b, 10, 3);
  }

  // shards + tease
  const gem = (gx, gy, a, lock) => {
    ctx.save(); ctx.translate(gx * T, gy * T + Math.sin(time * 2.4) * 3); ctx.rotate(time * 1.5);
    ctx.globalAlpha = a; ctx.fillStyle = lock ? '#889' : `hsl(${(time * 40) % 360} 80% 70%)`;
    ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(6, 0); ctx.lineTo(0, 8); ctx.lineTo(-6, 0); ctx.fill();
    ctx.restore(); ctx.globalAlpha = 1;
  };
  for (const [sx, sy, bit] of seeds.shards) if (!(sh & bit)) gem(sx, sy, (bossDead & bit) ? .95 : .3, !(bossDead & bit));

  for (const sk of sparks) {
    if (sk.got) continue;
    const b = Math.sin(time * 3 + sk.ph) * 2;
    ctx.fillStyle = '#ffe28a';
    ctx.fillRect(sk.x - 1, sk.y - 4 + b, 2, 8); ctx.fillRect(sk.x - 4, sk.y - 1 + b, 8, 2);
  }
  for (const f of foes) {
    const cell = f.cz || 1 + f.k, wob = Math.sin(f.t * 6) * 1.5;
    ctx.fillStyle = f.fl > 0 ? '#fff' : FOECOL[f.k];
    for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++)
      if (PAT[r] >> (4 - c) & 1) ctx.fillRect(f.x + c * cell, f.y + r * cell + wob, cell, cell);
    if (f.bit) {                                                // guardian HP bar
      const fs = fsz(f);
      ctx.fillStyle = '#2a2a33'; ctx.fillRect(f.x, f.y - 8, fs, 3);
      ctx.fillStyle = '#e05555'; ctx.fillRect(f.x, f.y - 8, fs * f.hp / f.mx, 3);
    }
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
  ctx.fillStyle = '#9f9'; ctx.fillText('LV' + lvl + ' 🎲d' + DIE() + (MOD() ? '+' + MOD() : ''), 8, 54); // the damage line, always visible
  ctx.fillStyle = '#2a2a33'; ctx.fillRect(70, 48, 40, 5);
  ctx.fillStyle = '#6bc56b'; ctx.fillRect(70, 48, 40 * Math.min(1, xp / need()), 5);
  ctx.textAlign = 'center'; ctx.fillStyle = '#ccc';
  ctx.fillText((sh & ~abil & 15) ? '⬆ A shard gift waits — take it at your next LEVEL UP'
    : !(abil & 1) ? '✧ East, through the gloom — a guardian holds the First Shard ➜'
      : !(abil & 2) ? '✧ Something glows beneath the meadow — find the way down'
        : !(abil & 4) ? '✧ West and UP — the cliffs, then the treetops'
          : !(abil & 8) ? '✧ Shoot the gloom crystal — the summit is past it'
            : !(abil & 16) ? '✧ A shaft west of home leads down. End the doubt.'
              : '🌈 The diorama breathes — you have every shard', VW / 2, 14);
  if (dmT > 0) {
    ctx.globalAlpha = Math.min(1, dmT); ctx.fillStyle = 'rgba(10,8,14,.82)';
    ctx.fillRect(VW / 2 - 190, VH - 60, 380, 24);
    ctx.fillStyle = '#e8d9b0'; ctx.font = 'italic 9px monospace';
    ctx.fillText('DM — ' + dmTxt, VW / 2, VH - 45); ctx.globalAlpha = 1;
  }
  if (deathT > 0) { ctx.fillStyle = `rgba(0,0,0,${1 - Math.abs(deathT - .8) / .8})`; ctx.fillRect(0, 0, VW, VH); }

  // action buttons — always visible, clickable with mouse OR touch
  if (started && !choosing) {
    for (const b of btns()) {
      ctx.globalAlpha = keys.has(b.c) ? .7 : (touch ? .35 : .22);
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 7); ctx.fill();
      ctx.globalAlpha = .9; ctx.fillStyle = '#111'; ctx.font = '14px monospace'; ctx.fillText(b.l, b.x, b.y + 5);
      if (!touch && b.h) {                                       // key hint for mouse users — above the button (bottom edge clips)
        ctx.globalAlpha = .7; ctx.fillStyle = '#fff'; ctx.font = '6px monospace';
        ctx.fillText(b.h, b.x, b.y - b.r - 3);
      }
    }
    ctx.globalAlpha = 1;
  }

  // level-up choice
  if (choosing) {
    ctx.fillStyle = 'rgba(8,6,12,.8)'; ctx.fillRect(0, 0, VW, VH);
    ctx.fillStyle = '#ffd75e'; ctx.font = 'bold 14px monospace';
    ctx.fillText('LEVEL ' + (lvl + 1) + ' — choose your growth', VW / 2, 80);
    const pitch = 82, sx0 = VW / 2 - (menu.length * pitch - 6) / 2;
    menu.forEach((c, i) => {
      const bx = sx0 + i * pitch;
      ctx.fillStyle = c.k ? 'rgba(255,215,94,.16)' : 'rgba(255,255,255,.08)';   // new skills glow
      ctx.fillRect(bx, 100, 76, 92);
      if (c.k || c.p) { ctx.fillStyle = c.k ? '#ffd75e' : '#c9a6f7'; ctx.font = '8px monospace'; ctx.fillText(c.k ? 'NEW SKILL' : 'PERK', bx + 38, 111); }
      ctx.fillStyle = c.col; ctx.font = 'bold 10px monospace'; ctx.fillText((i + 1) + ' ' + c.n, bx + 38, 126);
      ctx.fillStyle = '#ccc'; ctx.font = '8px monospace';
      c.d.split(' ').forEach((w, k) => ctx.fillText(w, bx + 38, 140 + k * 10));
    });
    ctx.fillStyle = '#888'; ctx.font = '9px monospace'; ctx.fillText('press 1–' + menu.length + ' or tap', VW / 2, 214);
  }

  // campfire shop
  if (shopping) {
    ctx.fillStyle = 'rgba(8,6,12,.85)'; ctx.fillRect(0, 0, VW, VH);
    ctx.fillStyle = '#ff9d3c'; ctx.font = 'bold 13px monospace'; ctx.fillText('🔥 THE HEARTH — 💎' + spk, VW / 2, 70);
    ctx.font = '9px monospace';
    SHOP.forEach((it, i) => {
      const y = 100 + i * 26, own = shopB & (1 << i), can = spk >= it.c;
      ctx.fillStyle = own ? 'rgba(155,232,160,.1)' : 'rgba(255,255,255,.07)';
      ctx.fillRect(VW / 2 - 130, y - 8, 260, 22);
      ctx.textAlign = 'left'; ctx.fillStyle = own ? '#9fe8a0' : can ? '#fff' : '#777';
      ctx.fillText((i + 1) + '  ' + it.n + ' — ' + it.d, VW / 2 - 122, y + 6);
      ctx.textAlign = 'right'; ctx.fillText(own ? '✓' : '💎' + it.c, VW / 2 + 122, y + 6);
      ctx.textAlign = 'center';
    });
    ctx.fillStyle = '#888'; ctx.fillText('1–5 buy · B close', VW / 2, 240);
  }

  // title
  if (!started) {
    ctx.fillStyle = 'rgba(8,6,12,.75)'; ctx.fillRect(0, 0, VW, VH);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 22px monospace'; ctx.fillText('NAT 20 UNICORN', VW / 2, 104);
    ctx.fillStyle = '#ffd75e'; ctx.font = '10px monospace'; ctx.fillText('the diorama has gone gray — paint it back', VW / 2, 124);
    ctx.fillStyle = '#aaa';
    ctx.fillText('A/D or ←→ move · SPACE/Z jump · J/X swipe', VW / 2, 148);
    ctx.fillText('L/C shot · hold S heal · SHIFT dash · E interact', VW / 2, 162);
    ctx.fillStyle = '#fff'; ctx.fillText(Math.sin(time * 3) > 0 ? '— press any key or tap —' : '', VW / 2, 186);
  }
  ctx.restore();
};

// ---------- loop ----------
load();
cam.x = Math.max(0, Math.min(W * T - VW, pl.x - VW / 2));      // camera starts ON the player (was: panned in from world origin)
cam.y = Math.max(0, Math.min(H * T - VH, pl.y - VH / 2 + 30));
say('Ah. The last painted mini wakes. Shall we finish the campaign, little horse?');
const loop = () => {
  const now = performance.now(), dt = Math.min(.033, (now - last) / 1000); last = now;
  step(dt); draw();
  requestAnimationFrame(loop);
};
loop();
