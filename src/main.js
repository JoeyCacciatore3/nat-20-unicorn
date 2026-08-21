// NAT 20 UNICORN v2 — 2D metroidvania platformer. Canvas 2D, no WebGL.
// The DM's diorama seen from the side: a gray world, one painted mini.
// Free the shards; every shard is a movement ability that re-opens the map.
import { T, W, H, tile, regions, regionAt, seeds } from './world.js';

const cv = document.getElementById('cv'), ctx = cv.getContext('2d');
const VW = 480, VH = 270;                       // internal view (letterboxed)
const fit = () => { cv.width = innerWidth; cv.height = innerHeight; };
addEventListener('resize', fit); fit();

// ---------- input (Set of e.code — immune to property mangling) ----------
const keys = new Set();
let jbuf = 0, started = 0;
addEventListener('keydown', (e) => {
  if (e.repeat) return;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
  keys.add(e.code);
  if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') jbuf = .12;
  boot();
});
addEventListener('keyup', (e) => keys.delete(e.code));
addEventListener('pointerdown', boot);
const held = (...c) => c.some(k => keys.has(k));
const jumpHeld = () => held('Space', 'ArrowUp', 'KeyW');

// ---------- audio (tiny synth; ZzFX-class sounds return later) ----------
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
const S_JUMP = () => sfx(280, 520, .12), S_AIR = () => sfx(390, 760, .12, 'triangle');
const S_STOMP = () => sfx(200, 55, .1, 'square', .2), S_HURT = () => sfx(140, 55, .25, 'sawtooth', .2);
const S_PICK = () => sfx(880, 1500, .07, 'triangle', .09);
const S_SHARD = () => { sfx(523, 523, .14, 'triangle', .15); sfx(659, 659, .14, 'triangle', .15, .12); sfx(784, 1568, .3, 'triangle', .15, .24); };
const S_NAT = () => { for (let i = 0; i < 4; i++) sfx(440 * (1 + i * .25), 440 * (1 + i * .25), .1, 'square', .12, i * .07); };

// ---------- DM voice ----------
let dmTxt = '', dmT = 0;
const say = (t) => { dmTxt = t; dmT = 4.5; };
const LORE = 'Before the doubt, every tile of this table was painted. I remember the brush.';

// ---------- RPG state ----------
let hp = 3, maxHp = 3, xp = 0, lvl = 1, sp = 0, abil = 0; // abil bit0 = double jump
const earned = Array(13).fill(0);                          // achievement slots (Wavedash-shaped)
const need = () => 8 + lvl * 6;
const gainXp = (n, x, y) => {
  xp += n; fly(x, y, '+' + n + ' XP', '#9f9');
  while (xp >= need()) {
    xp -= need(); lvl++;
    if (lvl % 3 === 0) maxHp++;
    hp = Math.min(hp + 1, maxHp);
    fly(pl.x, pl.y - 14, 'LEVEL ' + lvl + '!', '#ffd75e', 1); S_NAT();
    say('Level ' + lvl + '. The dice are starting to like you.');
  }
};

// ---------- save (single-char keys — terser mangle-props law) ----------
const save = () => {
  localStorage.n20_save = JSON.stringify({
    e: earned, h: hp, m: maxHp, x: xp, l: lvl, s: sp, a: abil,
    c: [cp[0], cp[1]], b: regions.map(r => r.t),
  });
};
const load = () => {
  try {
    const d = JSON.parse(localStorage.n20_save || '0');
    if (!d) return;
    d.e.forEach((v, i) => earned[i] = v);
    hp = d.h; maxHp = d.m; xp = d.x; lvl = d.l; sp = d.s; abil = d.a;
    cp = d.c; pl.x = cp[0]; pl.y = cp[1];
    d.b.forEach((v, i) => { regions[i].t = v; regions[i].b = v; });
    if (abil & 1) shardGot = 1;
  } catch (e) { /* fresh oath */ }
};

// ---------- player ----------
const PW = 10, PH = 14;
const pl = { x: 46 * T, y: 24 * T, vx: 0, vy: 0, ground: 0, face: 1, coyote: 0, air: 0, sq: 1, inv: 0, t: 0 };
let cp = [46 * T, 24 * T], lastSafe = [46 * T, 24 * T], deathT = 0, shardGot = 0;

// physics constants (the full feel recipe)
const RUN = 115, G_RISE = 750, G_FALL = 1500, V0 = 250, VAIR = 225, FALLCAP = 400;

const solid = (x, y) => tile(x / T | 0, y / T | 0) === 1;
const spike = (x, y) => tile(x / T | 0, y / T | 0) === 3;

// ---------- entities ----------
const sparks = seeds.sparks.map(([x, y]) => ({ x: x * T, y: y * T, got: 0, ph: Math.random() * 7 }));
const FOECOL = ['', '#cba6f7', '#5aa0e0', '#e05555'];
const PAT = [0b01110, 0b11111, 0b11011, 0b11111]; // gloomling: blob with eye-gaps
const foes = seeds.foes.map(([x, y, k]) => ({ x: x * T, y: y * T, vx: (18 + 26 / k) * (Math.random() < .5 ? 1 : -1), k, hp: k, fl: 0, t: Math.random() * 7 }));
const flies = [], parts = [];
const fly = (x, y, txt, c, big) => flies.push({ x, y, txt, c, big, t: 1.2 });
const burst = (x, y, n, c) => { for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, s = 40 + Math.random() * 80; parts.push({ x, y, vx: Math.sin(a) * s, vy: Math.cos(a) * s - 60, t: .5 + Math.random() * .4, c }); } };

const hurt = (n, safe) => {
  if (pl.inv > 0 || deathT > 0) return;
  hp -= n; pl.inv = 1.2; S_HURT(); burst(pl.x, pl.y + 7, 10, '#e05555');
  if (hp <= 0) { deathT = 1.6; say('The mini falls over. ...We do not stop rolling. Back to the fire.'); return; }
  if (safe) { pl.x = lastSafe[0]; pl.y = lastSafe[1]; pl.vx = pl.vy = 0; }
  else pl.vy = -180;
};

// ---------- update ----------
let last = performance.now(), time = 0, resting = 0;
const step = (dt) => {
  time += dt; dmT -= dt; jbuf -= dt; pl.inv -= dt; pl.t += dt;
  regions.forEach(r => r.b += (r.t - r.b) * Math.min(1, dt * .9));
  pl.sq += (1 - pl.sq) * Math.min(1, dt * 10);

  if (deathT > 0) {
    deathT -= dt;
    if (deathT <= 0) { hp = maxHp; pl.x = cp[0]; pl.y = cp[1]; pl.vx = pl.vy = 0; pl.inv = 1.5; }
    return;
  }
  if (!started) return;

  // -- run --
  const dir = (held('KeyD', 'ArrowRight') ? 1 : 0) - (held('KeyA', 'ArrowLeft') ? 1 : 0);
  const ctl = pl.ground ? 1 : .65;
  pl.vx += (dir * RUN - pl.vx) * Math.min(1, dt * 12 * ctl);
  if (dir) pl.face = dir;

  // -- jump: buffer + coyote + variable height + double jump --
  pl.coyote = pl.ground ? .1 : pl.coyote - dt;
  if (jbuf > 0) {
    if (pl.coyote > 0) { pl.vy = -V0; pl.coyote = 0; pl.air = 0; jbuf = 0; pl.sq = .7; S_JUMP(); burst(pl.x, pl.y + PH, 4, '#ccc'); }
    else if ((abil & 1) && pl.air < 1) { pl.vy = -VAIR; pl.air++; jbuf = 0; pl.sq = .7; S_AIR(); burst(pl.x, pl.y + PH, 6, '#f9c'); }
  }
  if (pl.vy < 0 && !jumpHeld()) pl.vy *= .82;                       // variable height
  const g = pl.vy < 0 ? G_RISE : G_FALL;                            // 2x fall gravity
  pl.vy += g * (Math.abs(pl.vy) < 40 ? .5 : 1) * dt;                // apex hang
  pl.vy = Math.min(pl.vy, FALLCAP);

  // -- move + collide (per axis, corner samples) --
  const px = pl.x, py = pl.y;
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
        pl.y = top - PH; if (!wasGround && pl.vy > 250) { pl.sq = 1.35; burst(pl.x + PW / 2, feet, 5, '#bbb'); sfx(150, 70, .06, 'square', .07); }
        pl.vy = 0; pl.ground = 1; pl.air = 0; break;
      }
    }
  } else {
    for (const ox of [1, PW - 1]) if (solid(pl.x + ox, pl.y)) { pl.y = ((pl.y / T | 0) + 1) * T + .01; pl.vy = 0; break; }
  }
  if (pl.ground && !spike(pl.x + PW / 2, pl.y + PH + 4)) { lastSafe = [pl.x, pl.y]; }

  // hazards
  for (const [ox, oy] of [[1, PH - 1], [PW - 1, PH - 1], [PW / 2, PH]])
    if (spike(pl.x + ox, pl.y + oy)) { hurt(1, 1); break; }
  if (pl.y > H * T) hurt(1, 1);

  // -- sparks --
  for (const s of sparks) {
    if (s.got) continue;
    if (Math.hypot(pl.x + PW / 2 - s.x, pl.y + PH / 2 - s.y) < 13) {
      s.got = 1; sp++; S_PICK(); burst(s.x, s.y, 5, '#fe9');
    }
  }

  // -- shard --
  if (!shardGot) {
    const [sx, sy] = seeds.shard;
    if (Math.hypot(pl.x - sx * T, pl.y - sy * T) < 16) {
      shardGot = 1; abil |= 1; earned[1] = 1;
      regions[1].t = 1; S_SHARD(); burst(sx * T, sy * T, 30, '#fff');
      say('The meadow remembers its color. And you — you remember the sky. DOUBLE JUMP.');
      save();
    }
  }

  // -- foes --
  for (const f of foes) {
    f.t += dt; f.fl -= dt;
    f.vy = (f.vy || 0) + 900 * dt;
    f.y += f.vy * dt;
    const fs = 6 + 4 * f.k, feet = f.y + fs, ty = feet / T | 0;
    const tv = tile((f.x + fs / 2) / T | 0, ty);
    if (f.vy > 0 && (tv === 1 || tv === 2)) { f.y = ty * T - fs; f.vy = 0; }
    f.x += f.vx * dt;
    const ahead = f.x + fs / 2 + Math.sign(f.vx) * fs * .7;
    if (solid(ahead, f.y + fs / 2) || tile(ahead / T | 0, (f.y + fs + 6) / T | 0) === 0) f.vx *= -1;
    // player contact
    if (pl.x < f.x + fs && pl.x + PW > f.x && pl.y < f.y + fs && pl.y + PH > f.y) {
      if (pl.vy > 40 && pl.y + PH - f.y < 10) {              // STOMP — roll the d20
        const roll = 1 + (Math.random() * 20 | 0), crit = roll === 20;
        const dmg = crit ? 99 : 1 + (lvl / 4 | 0);
        f.hp -= dmg; f.fl = .15;
        fly(f.x, f.y - 8, crit ? 'NAT 20!' : '🎲' + roll, crit ? '#ffd75e' : '#fff', crit);
        pl.vy = jumpHeld() ? -290 : -220; pl.air = 0; pl.sq = .75; S_STOMP();
        if (crit) { S_NAT(); earned[3] = 1; burst(f.x, f.y, 24, '#ffd75e'); }
        if (f.hp <= 0) {
          foes.splice(foes.indexOf(f), 1);
          burst(f.x, f.y, 12, FOECOL[f.k]); gainXp(f.k * 3 + (crit ? 5 : 0), f.x, f.y - 16);
          if (!earned[2]) { earned[2] = 1; say('First gloom, popped. That is how doubt dies: under hooves.'); }
        }
      } else hurt(1, 0);
    }
  }

  // -- campfire + lore --
  resting = 0;
  const [fx, fy] = seeds.fire;
  if (Math.hypot(pl.x - fx * T, pl.y - fy * T) < 26) {
    resting = 1;
    if (keys.has('KeyE')) {
      keys.delete('KeyE');
      hp = maxHp; cp = [fx * T - 20, (fy - 1) * T]; earned[0] = 1; save();
      burst(fx * T, fy * T - 8, 12, '#fc6'); sfx(500, 900, .3, 'triangle', .1);
      say('Rest. Saved. The fire keeps what you earned.');
    }
  }
  const [lx, ly] = seeds.lore;
  if (Math.hypot(pl.x - lx * T, pl.y - ly * T) < 22 && keys.has('KeyE')) {
    keys.delete('KeyE'); say(LORE); gainXp(4, pl.x, pl.y - 12);
  }

  // fx
  for (const p of parts) { p.t -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 300 * dt; }
  for (let i = parts.length; i--;) if (parts[i].t <= 0) parts.splice(i, 1);
  for (const f of flies) { f.t -= dt; f.y -= 28 * dt; }
  for (let i = flies.length; i--;) if (flies[i].t <= 0) flies.splice(i, 1);
};

// ---------- render ----------
const cam = { x: 0, y: 0 };
const draw = () => {
  const s = Math.min(cv.width / VW, cv.height / VH);
  const ox = (cv.width - VW * s) / 2, oy = (cv.height - VH * s) / 2;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.setTransform(s, 0, 0, s, ox, oy);
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, VW, VH); ctx.clip();

  // camera: lookahead toward facing, clamped to world
  const tx = pl.x + PW / 2 + pl.face * 40 - VW / 2, ty = pl.y - VH / 2 + 30;
  cam.x += (tx - cam.x) * .08; cam.y += (ty - cam.y) * .1;
  cam.x = Math.max(0, Math.min(W * T - VW, cam.x));
  cam.y = Math.max(0, Math.min(H * T - VH, cam.y));

  // sky: region-tinted, grays when unbloomed
  const rg = regionAt(pl.x + PW / 2);
  const sat = 22 * rg.b, lit = 12 + 6 * rg.b;
  ctx.fillStyle = `hsl(${rg.h * 360} ${sat}% ${lit}%)`; ctx.fillRect(0, 0, VW, VH);

  // parallax hills (two depths)
  for (const [par, base, amp, l] of [[.25, 90, 22, 8], [.5, 60, 16, 11]]) {
    ctx.fillStyle = `hsl(${rg.h * 360} ${sat * .8}% ${l}%)`;
    for (let x = 0; x < VW; x += 8) {
      const wx = x + cam.x * par;
      const h = base + Math.sin(wx * .011) * amp + Math.sin(wx * .027 + 5) * amp * .5;
      ctx.fillRect(x, VH - h, 8, h);
    }
  }

  ctx.translate(-cam.x | 0, -cam.y | 0);

  // tiles
  const x0 = cam.x / T | 0, x1 = Math.min(W, x0 + VW / T + 2), y0 = Math.max(0, cam.y / T | 0), y1 = Math.min(H, y0 + VH / T + 2);
  for (let j = y0; j < y1; j++) for (let i = x0; i < x1; i++) {
    const v = tile(i, j); if (!v) continue;
    const r = regionAt(i * T + 8), hue = r.h * 360, b = r.b;
    if (v === 1) {
      ctx.fillStyle = `hsl(${hue} ${40 * b}% ${26 + 6 * b}%)`;
      ctx.fillRect(i * T, j * T, T, T);
      if (tile(i, j - 1) !== 1) { ctx.fillStyle = `hsl(${hue} ${55 * b}% ${42 + 12 * b}%)`; ctx.fillRect(i * T, j * T, T, 4); }
    } else if (v === 2) {
      ctx.fillStyle = `hsl(${hue} ${50 * b}% ${45 + 8 * b}%)`; ctx.fillRect(i * T, j * T, T, 4);
    } else {
      ctx.fillStyle = `hsl(${280} ${20 + 30 * b}% 40%)`;
      for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(i * T + k * 4, j * T + T); ctx.lineTo(i * T + k * 4 + 2, j * T + 8); ctx.lineTo(i * T + k * 4 + 4, j * T + T); ctx.fill(); }
    }
  }

  // campfire
  const [fx, fy] = seeds.fire, cxp = fx * T, cyp = fy * T;
  ctx.fillStyle = '#6b4a2b'; ctx.fillRect(cxp - 8, cyp + 4, 16, 4);
  const fl = 8 + Math.sin(time * 13) * 2 + Math.sin(time * 31) * 1.5;
  ctx.fillStyle = '#ff9d3c'; ctx.beginPath(); ctx.moveTo(cxp - 5, cyp + 5); ctx.lineTo(cxp, cyp + 5 - fl); ctx.lineTo(cxp + 5, cyp + 5); ctx.fill();
  ctx.fillStyle = '#ffe08a'; ctx.beginPath(); ctx.moveTo(cxp - 2.5, cyp + 5); ctx.lineTo(cxp, cyp + 5 - fl * .6); ctx.lineTo(cxp + 2.5, cyp + 5); ctx.fill();
  if (resting) { ctx.fillStyle = '#fff'; ctx.font = '9px monospace'; ctx.textAlign = 'center'; ctx.fillText('E — rest & save', cxp, cyp - 18); }

  // lore stone
  const [lx, ly] = seeds.lore;
  ctx.fillStyle = '#7a7a85'; ctx.fillRect(lx * T - 5, ly * T - 6, 10, 15);
  ctx.fillStyle = '#aee'; ctx.fillRect(lx * T - 1, ly * T - 2, 2, 6);

  // shard + tease
  const gem = (gx, gy, a, lock) => {
    ctx.save(); ctx.translate(gx * T, gy * T + Math.sin(time * 2.4) * 3); ctx.rotate(time * 1.5);
    ctx.globalAlpha = a; ctx.fillStyle = lock ? '#889' : `hsl(${(time * 40) % 360} 80% 70%)`;
    ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(6, 0); ctx.lineTo(0, 8); ctx.lineTo(-6, 0); ctx.fill();
    ctx.restore(); ctx.globalAlpha = 1;
  };
  if (!shardGot) gem(seeds.shard[0], seeds.shard[1], .9 + Math.sin(time * 4) * .1, 0);
  gem(seeds.tease[0], seeds.tease[1], .35, 1);

  // sparks
  for (const sk of sparks) {
    if (sk.got) continue;
    const b = Math.sin(time * 3 + sk.ph) * 2;
    ctx.fillStyle = '#ffe28a';
    ctx.fillRect(sk.x - 1, sk.y - 4 + b, 2, 8); ctx.fillRect(sk.x - 4, sk.y - 1 + b, 8, 2);
  }

  // foes: bit-pattern standees, size + color = power
  for (const f of foes) {
    const cell = 1 + f.k, wob = Math.sin(f.t * 6) * 1.5;
    ctx.fillStyle = f.fl > 0 ? '#fff' : FOECOL[f.k];
    for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++)
      if (PAT[r] >> (4 - c) & 1) ctx.fillRect(f.x + c * cell, f.y + r * cell + wob, cell, cell);
  }

  // unicorn
  if (pl.inv <= 0 || Math.sin(time * 40) > 0) {
    ctx.save();
    const cx2 = pl.x + PW / 2, feet = pl.y + PH;
    ctx.translate(cx2, feet); ctx.scale((2 - pl.sq) * pl.face, pl.sq); ctx.translate(-PW / 2, -PH);
    const ph = pl.ground && Math.abs(pl.vx) > 20 ? Math.sin(pl.t * 16) * 3 : (pl.ground ? 0 : 2);
    ctx.fillStyle = '#f5f1f4';
    ctx.fillRect(1, 12 + ph * .3, 2, 4 - ph * .3); ctx.fillRect(7, 12 - ph * .3, 2, 4 + ph * .3); // legs
    ctx.fillRect(0, 5, 10, 7);                                            // body
    ctx.fillRect(7, 0, 5, 6);                                             // head
    ctx.fillStyle = '#ffd75e'; ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(14, -5); ctx.lineTo(12, 1); ctx.fill(); // horn
    const MANE = ['#ff6b6b', '#ffd75e', '#6bc5ff'];
    MANE.forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(5 - i * 2, 1 + i * 2, 2, 4); });
    ctx.fillStyle = '#333'; ctx.fillRect(10, 2, 1.5, 1.5);                // eye
    ctx.restore();
  }

  // particles + flytext
  for (const p of parts) { ctx.globalAlpha = Math.min(1, p.t * 2); ctx.fillStyle = p.c; ctx.fillRect(p.x - 1.5, p.y - 1.5, 3, 3); }
  ctx.globalAlpha = 1; ctx.textAlign = 'center';
  for (const f of flies) {
    ctx.globalAlpha = Math.min(1, f.t * 2); ctx.font = (f.big ? 'bold 12px' : '9px') + ' monospace';
    ctx.fillStyle = f.c; ctx.fillText(f.txt, f.x, f.y);
  }
  ctx.globalAlpha = 1;
  ctx.translate(cam.x | 0, cam.y | 0);

  // ---------- HUD ----------
  ctx.font = '12px monospace'; ctx.textAlign = 'left';
  for (let i = 0; i < maxHp; i++) { ctx.fillStyle = i < hp ? '#ff5d6c' : '#3a3a44'; ctx.fillText('♥', 8 + i * 13, 16); }
  ctx.fillStyle = '#ffe28a'; ctx.fillText('✦ ' + sp, 8, 32);
  ctx.fillStyle = '#9f9'; ctx.font = '9px monospace'; ctx.fillText('LV ' + lvl, 8, 45);
  ctx.fillStyle = '#2a2a33'; ctx.fillRect(34, 39, 40, 5);
  ctx.fillStyle = '#6bc56b'; ctx.fillRect(34, 39, 40 * xp / need(), 5);
  ctx.textAlign = 'center'; ctx.fillStyle = '#ccc';
  ctx.fillText(!shardGot ? '✧ Find the First Shard — east, through the gloom ➜'
    : rg.n === 'West Cliffs' ? '✧ Climb. Something glitters above the cliffs.'
      : '⬅ The west gate will yield to your new jump', VW / 2, 14);
  if (dmT > 0) {
    ctx.globalAlpha = Math.min(1, dmT); ctx.fillStyle = 'rgba(10,8,14,.82)';
    ctx.fillRect(VW / 2 - 190, VH - 34, 380, 24);
    ctx.fillStyle = '#e8d9b0'; ctx.font = 'italic 9px monospace';
    ctx.fillText('DM — ' + dmTxt, VW / 2, VH - 19); ctx.globalAlpha = 1;
  }
  if (deathT > 0) { ctx.fillStyle = `rgba(0,0,0,${1 - Math.abs(deathT - .8) / .8})`; ctx.fillRect(0, 0, VW, VH); }

  // title
  if (!started) {
    ctx.fillStyle = 'rgba(8,6,12,.75)'; ctx.fillRect(0, 0, VW, VH);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 22px monospace'; ctx.fillText('NAT 20 UNICORN', VW / 2, 108);
    ctx.fillStyle = '#ffd75e'; ctx.font = '10px monospace'; ctx.fillText('the diorama has gone gray — paint it back', VW / 2, 128);
    ctx.fillStyle = '#aaa'; ctx.fillText('A/D move · SPACE jump · E interact · stomp the gloom', VW / 2, 152);
    ctx.fillStyle = '#fff'; ctx.fillText(Math.sin(time * 3) > 0 ? '— press any key —' : '', VW / 2, 176);
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
