// UNI-CORN, the last savior — 2D pixel-art platformer. Canvas 2D, no WebGL.
//
// Design pillars (see OneStone project "uni-corn" for full history + rationale):
//   - D&D-style stat allocation (STR/HP/MAG/DEF/LUCK), no classes
//   - 4-slot palette customization (BODY/MANE/HORN/HOOVES)
//   - Metroidvania skill gating by LEVEL only (LV3/5/7/9)
//   - Rainbow shards = collection goal (5 guardian bosses)
//   - Unified character sheet: pause + level-up + creation share layout
//   - No overlay narrator — feedback via fly() and NPC dialog only
//   - Fixed world palette (no rebloom)
//
// Systems intentionally REMOVED (don't re-add without explicit ask):
//   classes · shop · region rebloom · overlay narrator · lore stones ·
//   scattered map currency (motes/sparks pickups) · STARSEEKER perk ·
//   L3 class fork · even-level perk offers · SHOP dialog option.
//
// Build: esbuild → terser → roadroller → inline → zip → ECT → 13,312-byte gate.
//   npm run build   (also runs map audit, logs to SIZELOG.md)
//   wavedash build push -m "message"
//
// Save format v13:
//   { v, e, h, x, l, s, a, n, q, g, p,
//     t:[STR,HP,MAG,DEF,LUCK], c:[cpx,cpy], m:name, f:seenFlags,
//     o:openedChestBits, u:[bod,man,hrn,hof] }
//   Version bumps discard prior saves — early-access, no migration path.

import { T, W, H, grid, tile, regions, regionAt, seeds } from './world.js';

const cv = document.getElementById('cv'), ctx = cv.getContext('2d');
const VW = 480, VH = 270;
// DPR + visualViewport: draw at native device pixels (retina crispness), size to
// the actual viewport (fixes iOS URL-bar overshoot). imageSmoothingEnabled=false
// keeps the pixel art crisp when the letterbox scale is fractional.
let DPR = 1;
const fit = () => {
  const vv = visualViewport, w = vv ? vv.width : innerWidth, h = vv ? vv.height : innerHeight;
  DPR = devicePixelRatio || 1;
  cv.width = w * DPR | 0; cv.height = h * DPR | 0;
  cv.style.width = w + 'px'; cv.style.height = h + 'px';
  ctx.imageSmoothingEnabled = false;
};
addEventListener('resize', fit);
visualViewport && visualViewport.addEventListener('resize', fit);
fit();
let SS = 1, SOX = 0, SOY = 0;                    // view transform (for pointer mapping)

// ---------- input: BOTH conventions (WASD+Space/J/L/S and arrows+Z/X/C/I) ----------
const J_KEYS = ['Space', 'KeyK', 'KeyZ', 'KeyW', 'ArrowUp'];
const M_KEYS = ['KeyJ', 'KeyX'], SH_KEYS = ['KeyL', 'KeyC'], HE_KEYS = ['KeyS', 'KeyI'];
const keys = new Set();
let jbuf = 0, started = 0, touch = 0;
// ---------- title / name-entry / class-select flow ----------
// phase 0 = title menu, 1 = character create (name + colors combined), 2 = playing (started=1)
let phase = 0, ent = '', pName = 'HORSE', mSel = 0, cRow = 0, delConf = 0;   // cRow: 0 name · 1..4 body/mane/horn/hooves · delConf: 2-step title DELETE guard
// Stardust particles for the title screen — 22 dots falling at varied speeds, wrap
// at bottom, procedural (no assets). Ambient motion = "living world," the single
// cheapest first-impression polish (Celeste snow / Hollow Knight rain pattern).
const stars = Array.from({ length: 22 }, () => ({
  x: Math.random() * VW, y: Math.random() * VH,
  s: 1 + (Math.random() * 1.5 | 0), v: 4 + Math.random() * 14, a: .3 + Math.random() * .5,
}));
const hasSave = () => !!localStorage.n20_save;
// Character create: UP/DOWN pick row (name/body/mane/horn), then row-specific input:
//   NAME row → A-Z type, BACKSPACE delete
//   color rows → LEFT/RIGHT cycle
// ENTER begins (only if a name is typed).
const createKey = (e) => {
  if (e.code === 'ArrowUp' || e.code === 'KeyW')        cRow = (cRow + 4) % 5;   // 5 rows: NAME/BODY/MANE/HORN/HOOVES
  else if (e.code === 'ArrowDown' || e.code === 'KeyS') cRow = (cRow + 1) % 5;
  else if (cRow === 0 && e.code === 'Backspace')        ent = ent.slice(0, -1);
  else if (cRow === 0 && ent.length < 8 && /^[a-z]$/i.test(e.key)) ent += e.key.toUpperCase();
  else if (e.code === 'ArrowLeft' || e.code === 'KeyA') { if (cRow === 1) bod = (bod + 4) % 5; else if (cRow === 2) man = (man + 4) % 5; else if (cRow === 3) hrn = (hrn + 4) % 5; else if (cRow === 4) hof = (hof + 4) % 5; }
  else if (e.code === 'ArrowRight' || e.code === 'KeyD') { if (cRow === 1) bod = (bod + 1) % 5; else if (cRow === 2) man = (man + 1) % 5; else if (cRow === 3) hrn = (hrn + 1) % 5; else if (cRow === 4) hof = (hof + 1) % 5; }
  else if ((e.code === 'Enter' || (e.code === 'Space' && cRow > 0)) && ent.length > 0) { pName = ent; phase = 2; started = 1; save(); }
};
const titleKey = (e) => {
  const opts = hasSave() ? 3 : 1;                                    // NEW GAME · CONTINUE · DELETE SAVE (last two only when save exists)
  if (e.code === 'ArrowUp' || e.code === 'KeyW') { mSel = (mSel + opts - 1) % opts; delConf = 0; }
  else if (e.code === 'ArrowDown' || e.code === 'KeyS') { mSel = (mSel + 1) % opts; delConf = 0; }
  else if (e.key === '1' || (mSel === 0 && (e.code === 'Enter' || e.code === 'Space'))) { phase = 1; ent = ''; cRow = 0; delConf = 0; }
  else if ((e.key === '2' || (mSel === 1 && (e.code === 'Enter' || e.code === 'Space'))) && hasSave()) { load(); phase = 2; started = 1; }
  else if ((e.key === '3' || (mSel === 2 && (e.code === 'Enter' || e.code === 'Space'))) && hasSave()) {
    // 2-step delete: first press arms, second press wipes
    if (delConf) { localStorage.removeItem('n20_save'); location.reload(); } else delConf = 1;
  }
};
addEventListener('keydown', (e) => {
  if (e.repeat) return;
  if (e.code === 'Space' || e.code.indexOf('Arrow') === 0) e.preventDefault();
  boot();                                                    // resume audio on any key (autoplay policy)
  if (phase === 0) return titleKey(e);
  if (phase === 1) return createKey(e);
  // DIALOG owns input — arrow keys navigate, JUMP confirms, MELEE cancels
  if (dialog) {
    if (e.code === 'ArrowUp')        dialog = dialog === 1 ? 2 : 1;
    else if (e.code === 'ArrowDown') dialog = dialog === 2 ? 1 : 2;
    else if (J_KEYS.includes(e.code) || e.code === 'Enter') dialogDo();
    else if (M_KEYS.includes(e.code) || e.code === 'Escape') dialog = 0;
    return;
  }
  // Near NPC: JUMP becomes universal INTERACT (open dialog) — no dedicated interact key
  if (J_KEYS.includes(e.code) && nearFire) { dialog = 1; return; }
  if (J_KEYS.includes(e.code) && nearChest >= 0) { openChest(nearChest); return; }
  keys.add(e.code);
  if (J_KEYS.includes(e.code)) jbuf = .12;
  if (M_KEYS.includes(e.code)) swing();
  if (SH_KEYS.includes(e.code)) shoot();
  if (['ShiftLeft', 'ShiftRight', 'KeyO'].includes(e.code)) dash();
  if (choosing) {
    const n = picks().length;
    if (e.code === 'ArrowUp' || e.code === 'KeyW') aRow = (aRow + n - 1) % n;
    else if (e.code === 'ArrowDown' || e.code === 'KeyS') aRow = (aRow + 1) % n;
    else if (e.code === 'ArrowRight' || e.code === 'KeyD' || e.code === 'Enter' || e.code === 'Space') allocate();
  }
  else if (e.code === 'KeyP' || e.code === 'Escape') paused = paused ? 0 : 1;
});
addEventListener('keyup', (e) => keys.delete(e.code));
const held = (...c) => c.some(k => keys.has(k));
const jumpHeld = () => J_KEYS.some(k => keys.has(k)) || keys.has('TBtnJ'); // button jump gets full hold-height too
const healHeld = () => HE_KEYS.some(k => keys.has(k)) || keys.has('TBtnH');

// ---------- touch overlay (minimal: dpad + JUMP + MELEE + earned skills; JUMP + MELEE contextualize) ----------
// No dedicated hearth buttons — JUMP is the universal interact/confirm, MELEE is back/cancel.
const btns = () => {
  // JUMP contextualizes: dialog open = ↵ confirm · nearFire (closed) = ☰ open dialog · else = ▲ jump
  const jl = dialog ? '↵' : nearFire ? '☰' : nearChest >= 0 ? '📦' : '▲';
  const jc = dialog || nearFire || nearChest >= 0 ? '#ffd75e' : '#8cf';
  // MELEE contextualizes: dialog open = ← back · else = ⚔ swipe
  const ml = dialog ? '←' : '⚔';
  const b = [
    { x: VW - 40, y: VH - 40, r: 26, l: jl, h: 'SPACE', c: 'TBtnJ', col: jc },
    { x: VW - 96, y: VH - 30, r: 22, l: ml, h: 'J',     c: 'TBtnM', col: '#fff' },
  ];
  if (touch) b.unshift(
    { x: 30,  y: VH - 30, r: 22, l: '◀', h: '', c: 'TBtnL',  col: '#ccc' },
    { x: 78,  y: VH - 30, r: 22, l: '▼', h: '', c: 'TBtnDn', col: '#aaa' },
    { x: 126, y: VH - 30, r: 22, l: '▶', h: '', c: 'TBtnR',  col: '#ccc' });
  // learned skills — color-coded per school (unchanged)
  if (abil & 4) b.push({ x: VW - 96,  y: VH - 76, r: 20, l: '✦', h: 'L',     c: 'TBtnS', col: '#c9a6f7' });
  if (abil & 2) b.push({ x: VW - 40,  y: VH - 88, r: 18, l: '＋', h: 'S',    c: 'TBtnH', col: '#9fe8a0' });
  if (abil & 8) b.push({ x: VW - 140, y: VH - 62, r: 20, l: '»', h: 'SHIFT', c: 'TBtnD', col: '#ffd75e' });
  return b;
};
const ptrs = new Map();
const toV = (e) => [(e.clientX * DPR - SOX) / SS, (e.clientY * DPR - SOY) / SS];
addEventListener('pointerdown', (e) => {
  boot();
  if (e.pointerType === 'touch') touch = 1;
  const [vx, vy] = toV(e);
  // TITLE: tap top half = New Game (skips name — touch users can't type), bottom = Continue
  if (phase === 0) { if (vy > VH / 2 && hasSave()) { load(); phase = 2; started = 1; } else { phase = 2; started = 1; save(); } return; }
  // NAME ENTRY: tap = accept current buffer (or default HORSE), same as Enter
  // CHARACTER CREATE: tap the BEGIN NEW GAME button (bottom-center) to start. Name required.
  if (phase === 1) {
    if (vx >= VW / 2 - 70 && vx <= VW / 2 + 70 && vy >= VH - 42 && vy <= VH - 16 && ent.length > 0) {
      pName = ent; phase = 2; started = 1; save();
    }
    return;
  }
  // PAUSE overlay — top-right corner icon opens it (48px tap zone); tap anywhere to close
  if (paused) { paused = 0; return; }
  if (started && !choosing && !dialog && vx > VW - 40 && vy < 40) { paused = 1; return; }
  // DIALOG overlay taps: JUMP btn = confirm · MELEE btn = back · bubble row = pick · else close
  if (dialog) {
    const bs = btns();
    const jb = bs.find(b => b.c === 'TBtnJ'), mb = bs.find(b => b.c === 'TBtnM');
    if (jb && Math.hypot(vx - jb.x, vy - jb.y) < jb.r + 6) { dialogDo(); return; }
    if (mb && Math.hypot(vx - mb.x, vy - mb.y) < mb.r + 6) { dialog = 0; return; }
    if (vx >= VW / 2 - 70 && vx <= VW / 2 + 70 && vy >= 56 && vy <= 86) {
      const row = ((vy - 58) / 14) | 0;
      if (row >= 0 && row <= 1) { dialog = row + 1; dialogDo(); return; }
    }
    dialog = 0; return;
  }
  if (choosing) {
    // Rows rendered at y = 82 + i*12 in pause overlay. Tap a row → select + allocate.
    const arr = picks();
    const row = ((vy - 74) / 12) | 0;
    if (vx > 160 && vx < 350 && row >= 0 && row < arr.length) { aRow = row; allocate(); }
    return;
  }
  for (const b of btns()) if (Math.hypot(vx - b.x, vy - b.y) < b.r + 6) {
    // JUMP button contextualizes: near NPC it's INTERACT, not jump
    if (b.c === 'TBtnJ' && nearFire) { dialog = 1; return; }
    if (b.c === 'TBtnJ' && nearChest >= 0) { openChest(nearChest); return; }
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
function boot() { if (!AC) AC = new AudioContext(); AC.resume(); }        // audio-only wake — the game only starts when the title menu is accepted
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

// Narrator overlay removed — feedback comes via fly() text over the player/NPC.

// ---------- RPG 2.0 (researched): milestone dice, modifier stats, D&D perks ----------
// 5-stat system: STR (dmg) HP (max ♥) MAG (max ✦) DEF (dmg reduction) LUCK (drop bonus)
let ho = 1, he = 1, sp = 1, df = 0, lk = 0;
// Unicorn customization — palette indices picked at character creation. Four body types:
// bod (skin/body), man (mane sweep), hrn (horn tip), hof (hooves/legs). Future: swappable "item pieces".
let bod = 0, man = 0, hrn = 0, hof = 0;
const PALB = [['#f5f1f4','SNOW'],['#f7d9c0','CREAM'],['#c6c8d1','SILVER'],['#f7bcd9','ROSE'],['#c8f0d3','MINT']];
const PALM = [
  [['#ff6b6b','#ffd75e','#6bc5ff'],'RAINBOW'],
  [['#ff5a3a','#ff9d4a','#ffd75e'],'EMBER'],
  [['#3ac4ff','#6bc5ff','#a0e0ff'],'OCEAN'],
  [['#5ac878','#8fd88f','#c8f0a0'],'FOREST'],
  [['#c07af0','#8f5ad0','#e08ae0'],'VOID'],
];
const PALH = [['#ffd75e','GOLD'],['#e0e0e6','SILVER'],['#6bc5ff','CYAN'],['#ff9dc8','ROSE'],['#ffffff','WHITE']];
const PALF = [['#2a1f14','ONYX'],['#ffd75e','GOLD'],['#e0e0e6','SILVER'],['#ff9dc8','ROSE'],['#c8f0d3','MINT']];
// Outline text helper (module-scope so pause overlay AND creation portrait can both use it)
const T2 = (t, x, y) => { ctx.strokeStyle = 'rgba(0,0,0,.85)'; ctx.lineWidth = 2; ctx.strokeText(t, x, y); ctx.fillText(t, x, y); };
// Shared portrait panel — renders the identity card (title bar, bordered box with
// hearts row at top, live unicorn silhouette, name+class below) used by both the
// PAUSE overlay and the CHARACTER-CREATE screen. isCreate flag turns on the blink
// cursor when the name row is active.
const portraitPanel = (title, isCreate) => {
  ctx.fillStyle = 'rgba(8,6,12,.96)'; ctx.fillRect(0, 0, VW, VH);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd75e'; ctx.font = 'bold 13px monospace'; T2(title, VW / 2, 20);
  // Portrait box (left) — gold border, hearts top, unicorn middle, name bottom
  ctx.strokeStyle = '#ffd75e'; ctx.lineWidth = 1;
  ctx.fillStyle = 'rgba(255,255,255,.04)'; ctx.fillRect(20, 32, 130, 108); ctx.strokeRect(20, 32, 130, 108);
  // Hearts row — same style as in-game HUD (♥ icons, filled/empty by hp state)
  const m = mHP(), hw = 12;
  ctx.font = '11px monospace'; ctx.textAlign = 'left';
  for (let i = 0; i < m; i++) { ctx.fillStyle = i < hp ? '#ff5d6c' : '#3a3a44'; T2('♥', 85 - (m * hw) / 2 + i * hw, 48); }
  // Unicorn — 2.6× scale, gentle bob, centered below hearts
  ctx.save(); ctx.translate(85, 92); ctx.scale(2.6, 2.6); ctx.translate(-6, -8);
  drawU(Math.sin(time * 1.4) * .8);
  ctx.restore();
  // Name (bold) + class subtitle inside the box — only in PAUSE (creation has its own NAME row)
  if (!isCreate) {
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff'; ctx.font = 'bold 11px monospace'; T2(pName, 85, 124);

  }
};
// draw the player unicorn geometry — used by in-game player render + pause portrait.
// scale sets pixel scale. All colors come from current bod/man/hrn palette picks.
const drawU = (bob) => {
  const [bc] = PALB[bod], [mc] = PALM[man], [hc] = PALH[hrn], [fc] = PALF[hof];
  ctx.fillStyle = fc;                                                                               // hooves (whole leg)
  ctx.fillRect(1, 12 + bob * .3, 2, 4 - bob * .3); ctx.fillRect(7, 12 - bob * .3, 2, 4 + bob * .3);
  ctx.fillStyle = bc; ctx.fillRect(0, 5, 10, 7); ctx.fillRect(7, 0, 5, 6);                          // body + head
  ctx.fillStyle = hc; ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(14, -5); ctx.lineTo(12, 1); ctx.fill(); // horn
  mc.forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(5 - i * 2, 1 + i * 2, 2, 4); });           // mane 3-color
  ctx.fillStyle = '#333'; ctx.fillRect(10, 2, 1.5, 1.5);                                            // eye
};
let hp = 3, xp = 0, lvl = 1, spk = 0;             // spk = collection score / future potion currency (shop removed)
let sh = 0, abil = 0, bossDead = 0;               // sh = shards HELD (flavor now); abil = skills LEARNED; bits: 1 DJ 2 heal 4 shot 8 dash 16 heart
let mn = 5, choosing = 0, pending = 0, pk = 0;
const CAP = 15;                                   // hard level cap. L15 grants APOTHEOSIS (+2 dmg, +1 max ♥); post-cap XP → sparks 1:1
const SKILL_MIN = { 1: 3, 2: 5, 4: 7, 8: 9 };     // level thresholds for the 4 movement skills — leveling is the ONLY gate (shards are flavor)
let hs = 0, shk = 0;                              // combat feel: hitstop freeze + screen shake, both in seconds
const bossLive = [0, 0, 0, 0, 0];
const mHP = () => 2 + he + (lvl >= CAP ? 1 : 0);            // APOTHEOSIS grants +1 max ♥ at cap
const mMN = () => 3 + sp * 2;
const DIE = () => lvl >= 12 ? 12 : lvl >= 9 ? 10 : lvl >= 6 ? 8 : lvl >= 3 ? 6 : 4; // die = LEVEL MILESTONE (Zelda-heart law)
const MOD = () => ho - 1 + (lvl >= CAP ? 2 : 0) + ((pk & 256) ? (mHP() - hp) : 0); // BLOODLETTER: +1/missing ♥ · APOTHEOSIS: +2
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
  if (lvl >= CAP) { spk += n; fly(x, y, '+' + n + ' 💎', '#ffe28a'); return; } // post-cap: XP is currency
  xp += n; fly(x, y, '+' + n + ' XP', '#9f9');
  while (xp >= need() && lvl + pending < CAP) { xp -= need(); pending++; }
  if (lvl + pending >= CAP) xp = 0;
  if (pending && !choosing) { choosing = 1; aRow = 0; S_NAT(); }
};
const STATS = [
  ['STR', '+1 damage', '#ffd75e', () => ho++],
  ['HP', '+1 max ♥', '#ff5d6c', () => { he++; hp++; }],
  ['MAG', '+2 max mana', '#e08ae0', () => { sp++; mn += 2; }],
  ['DEF', '-1 damage taken', '#8cf', () => df++],
  ['LUCK', '+50% shard drops', '#9fe89a', () => lk++],
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
  { b: 256, n: 'BLOODLETTER', d: '+1 dmg per missing ♥' },
  { b: 512, n: 'THIRST', d: 'kills refill 1 ✦' },
  { b: 1024, n: 'NIMBLE', d: '−25% dash cooldown' },
  { b: 2048, n: 'OVERCHANNEL', d: 'heal costs 4 (was 5)' },
];
const SKILLS = {
  1: ['DBL JUMP', 'jump again in air', '#6bc5ff'],
  2: ['R. HEAL', 'hold S · mend 1♥', '#9fe8a0'],
  4: ['R. SHOT', 'press L · ✦3 bolt', '#e08ae0'],
  8: ['AIR DASH', 'Shift · burst fwd', '#ffd75e'],
};
// D&D leveling: every level offers all 5 STATS (pure allocation, no classes).
// Skill unlocks (LV3/5/7/9) join the menu at their milestone level as bonus picks.
// Perks are elite-kill drops ONLY — never surface on level-up.
// Level-up ALLOCATION reuses the character sheet: no separate modal, no menu[] array.
// picks() returns rows the player can spend a point on at current lvl+1
// (available skill unlocks + 5 stats). aRow indexes into this list.
let aRow = 0;
const picks = () => {
  const nxt = lvl + 1, r = [];
  for (const bit of [1, 2, 4, 8]) if (!(abil & bit) && nxt >= SKILL_MIN[bit]) r.push({ k: bit, n: SKILLS[bit][0], col: SKILLS[bit][2] });
  STATS.forEach((s, i) => r.push({ i, n: s[0], col: s[2] }));
  return r;
};
const allocate = () => {
  const arr = picks(), c = arr[aRow]; if (!c) return;
  if (c.k) abil |= c.k;
  else STATS[c.i][3]();
  lvl++; pending--;
  fly(pl.x, pl.y - 14, c.n + '!', '#ffd75e', 1); sfx(660, 990, .15, 'triangle', .12);
  if ([3, 6, 9, 12].includes(lvl)) fly(pl.x, pl.y - 26, 'POWER UP', '#fff', 1);
  if (lvl === CAP) { fly(pl.x, pl.y - 28, 'APOTHEOSIS', '#ffd75e', 1); hp = mHP(); }
  if (!pending) { choosing = 0; save(); }
  else aRow = Math.min(aRow, picks().length - 1);   // clamp cursor after skill row disappears
};
// grant one random un-owned perk (elite drop). If all owned, tip 6 sparks instead.
const grantPerk = (x, y) => {
  const un = PERKS.filter(p => !(pk & p.b));
  if (un.length) {
    const p = un[Math.random() * un.length | 0];
    pk |= p.b; fly(x, y, p.n + '!', '#c9a6f7', 1);
  } else { spk += 6; fly(x, y, '+6 ✦', '#ffe28a', 1); }
};

// ---------- save (single-char keys — terser mangle-props law) ----------
const save = () => {
  localStorage.n20_save = JSON.stringify({
    v: 13, e: earned, h: hp, x: xp, l: lvl, s: spk, a: abil, n: mn, q: sh, g: bossDead,
    p: pk, t: [ho, he, sp, df, lk], c: [cp[0], cp[1]],
    m: pName, f: seenM | (seenH << 1) | (seenT << 2), o: oc,
    u: [bod, man, hrn, hof],                                       // v13 — 4-slot palette (added hooves)
  });
};
const load = () => {
  try {
    const d = JSON.parse(localStorage.n20_save || '0');
    if (!d || d.v !== 13) return;                               // v13 — HOOVES added to color palette. v12 saves start fresh.
    d.e.forEach((v, i) => earned[i] = v);
    hp = d.h; xp = d.x; lvl = d.l; spk = d.s; abil = d.a; mn = d.n;
    sh = d.q; bossDead = d.g; pk = d.p; pName = d.m; oc = d.o;
    seenM = d.f & 1; seenH = (d.f >> 1) & 1; seenT = (d.f >> 2) & 1;
    [ho, he, sp, df, lk] = d.t;
    [bod, man, hrn, hof] = d.u;
    cp = d.c; pl.x = cp[0]; pl.y = cp[1];
  } catch (e) { /* fresh oath */ }
};

// ---------- player ----------
const PW = 10, PH = 14;
const pl = { x: 126 * T, y: 57 * T, vx: 0, vy: 0, ground: 0, face: 1, coyote: 0, air: 0, sq: 1, inv: 0, t: 0 };
let cp = [126 * T, 57 * T], lastSafe = [126 * T, 57 * T], deathT = 0;
let atkCd = 0, swT = 0, chT = 0, nearFire = 0, seenM = 0, seenH = 0, seenT = 0;
let paused = 0;                                   // pause overlay open — freezes sim, character sheet renders
// hearth dialog: 0 = closed, 1..3 = current option highlight (1 TALK, 2 REST, 3 SHOP).
// JUMP button is the universal interact/confirm; MELEE button is back. No separate dialogue buttons.
// Hearth dialog: 2 options — 1 TALK · 2 REST (SHOP removed with shop system)
let dialog = 0;
const dialogDo = () => {
  if (dialog === 1) {                             // TALK — first talk grants +10 XP boon
    if (!seenT) { seenT = 1; gainXp(10, pl.x, pl.y - 14); fly(pl.x, pl.y - 16, '+10 XP · WELCOME', '#9fe89a', 1); save(); }
    else fly(pl.x, pl.y - 16, 'the sage nods', '#c9a6f7', 1);
  } else {                                        // REST + save
    const [fx, fy] = seeds.fires[0];
    if (hp === mHP()) earned[8] = 1;              // WELL_RESTED — rest without needing it
    hp = mHP(); cp = [fx * T - 20, (fy - 1) * T]; earned[0] = 1; save();
    burst(fx * T, fy * T - 8, 12, '#fc6'); sfx(500, 900, .3, 'triangle', .1);
    fly(pl.x, pl.y - 16, 'SAVED', '#9fe89a', 1);
  }
  dialog = 0;
};
// Chest reward: fixed +15 sparks + full heal. Predictable, no RNG.
const openChest = (i) => {
  if (oc & (1 << i)) return;
  oc |= 1 << i;
  const c = chests[i], drop = 15;
  spk += drop; hp = mHP();
  burst(c.x, c.y - 4, 18, '#ffd75e'); sfx(660, 990, .18, 'triangle', .12);
  fly(c.x, c.y - 12, '+' + drop + ' ✦', '#ffe28a', 1); fly(c.x + 6, c.y - 4, '+HEAL', '#9fe8a0');
  save();
};
let dashT = 0, dashCd = 0, adash = 0, dropT = 0;
// FIXED physics — never stat-scaled: the map gate proofs depend on these numbers
const G_RISE = 750, G_FALL = 1500, FALLCAP = 400;
const RUN = () => 115, V0 = () => 250;

const solid = (x, y) => { const v = tile(x / T | 0, y / T | 0); return v === 1 || v === 4; }; // gloom crystal is solid until shot
const spike = (x, y) => tile(x / T | 0, y / T | 0) === 3;

// ---------- entities ----------
// Chests: exploration rewards. `oc` bitfield tracks opened state (persisted v9).
const chests = seeds.chests.map(([x, y], i) => ({ x: x * T, y: y * T, i }));
let oc = 0, nearChest = -1;                       // opened bitfield · which chest index the player is standing on (-1 = none)
const FOECOL = ['', '#cba6f7', '#5aa0e0', '#e05555'];
// SPAWN LAW — every non-boss foe carries: dm (contact damage), el (elite roll),
// rc (ranged clock if tier 3 = Gloomcast). Boss adds ph / spd / rc at 50%-HP
// phase 2, plus wt (wind-up-tell clock) filled on first contact.
const foes = seeds.foes.map(([x, y, k]) => {
  const el = k < 3 && Math.random() < .17;        // ELITE: only lower tiers can roll — tier-3 already has a role (ranged)
  return {
    x: x * T, y: y * T, k,
    vx: (18 + 26 / k) * (Math.random() < .5 ? 1 : -1),
    hp: k * 4 * (el ? 2 : 1), mx: k * 4 * (el ? 2 : 1),
    dm: el ? 2 : 1,
    el, fl: 0, t: Math.random() * 7,
    cz: el ? 2 + k : undefined,                   // elite: one cell bigger than natural (1+k -> 2+k)
    rc: k === 3 ? 1.5 + Math.random() : undefined,
  };
});
const fsz = (f) => 5 * (f.cz || 1 + f.k);          // one size rule for sprites + collision
const shots = [], flies = [], parts = [], fbolts = [];
const fly = (x, y, txt, c, big) => flies.push({ x, y, txt, c, big, t: 1.2 });
const burst = (x, y, n, c) => { for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, s = 40 + Math.random() * 80; parts.push({ x, y, vx: Math.sin(a) * s, vy: Math.cos(a) * s - 60, t: .5 + Math.random() * .4, c }); } };

// damage a foe: dmg = die + MOD, crit doubles. Full D&D damage line, visible.
// Feel pass: knockback on non-boss/non-stomp hits, hitstop + shake on crit, boss
// phase-2 trigger at half HP, elite perk drop on kill, minion cleanup on boss death.
const strike = (f, r, gen, viaStomp) => {
  const crit = isCrit(r), dmg = (r + MOD()) * (crit ? 2 : 1);
  f.hp -= dmg; f.fl = .15;
  if (!f.bit && !viaStomp) f.vx += (crit ? 220 : 140) * (f.x > pl.x ? 1 : -1); // KNOCKBACK — bosses hold their arena
  shk = Math.max(shk, crit ? .22 : .09);
  if (crit) hs = .06;                             // hitstop punch — 60 ms world freeze on Nat crit
  fly(f.x, f.y - 8, (crit ? 'CRIT ' : '') + '-' + dmg, crit ? '#ffd75e' : '#ff5d6c', crit);
  if (crit) { S_NAT(); earned[3] = 1; burst(f.x, f.y, 24, '#ffd75e'); }
  if (gen) mn = Math.min(mMN(), mn + 1);          // melee GENERATES mana
  // BOSS PHASE 2 — first crossing of half HP, permanent
  if (f.bit && !f.ph && f.hp <= f.mx / 2 && f.hp > 0) {
    f.ph = 1; sfx(220, 110, .35, 'sawtooth', .16);
    if (f.bi === 1 || f.bi === 4) for (let n = 0; n < 2; n++)                                  // CAVES + HEART: summon minions
      foes.push({ x: f.x + n * 20 - 10, y: f.y - 10, k: 1, vx: 40 * (n ? 1 : -1), hp: 4, dm: 1, fl: 0, t: 0 });
    if (f.bi === 2 || f.bi === 4) f.rc = 1.6;     // TREETOPS + HEART: fire ranged bolts
    if (f.bi === 0 || f.bi === 4) f.spd = 1.65;   // MEADOW + HEART: faster chase + hop
  }
  if (f.hp <= 0) {
    if (f.dead) return;                                         // 2nd hit same frame — cash-out already ran
    f.dead = 1;                                                 // frame-end prune below; avoids splice-race index shift
    burst(f.x, f.y, 12, FOECOL[f.k]); gainXp(f.k * 4 + (crit ? 4 : 0) + (f.bit ? 25 : 0), f.x, f.y - 16);
    // Drop economy (v10): base normal 1-2 · elite 4 · boss 20. LUCK adds +50% per pip.
    let drop = f.bit ? 20 : f.el ? 4 : 1 + (Math.random() * 2 | 0);
    drop = Math.round(drop * (1 + lk * .5));
    spk += drop; fly(f.x, f.y - 20, '+' + drop + ' ✦', '#ffe28a');
    if (pk & 8) mn = Math.min(mMN(), mn + 1);                   // MANA FONT
    if (pk & 512) mn = Math.min(mMN(), mn + 1);                 // THIRST — kills refill 1 ✦
    if (viaStomp && (pk & 128)) mn = Math.min(mMN(), mn + 2);   // STOMP SPARK
    if (f.el) { burst(f.x, f.y, 18, '#ffd75e'); grantPerk(f.x, f.y - 20); sfx(880, 1760, .3, 'triangle', .14); }
    if (f.bit) {                                                // GUARDIAN falls — shard unlocks
      bossDead |= f.bit; bossLive[f.bi] = 0;
      // clean up the boss's summoned minions/twins tagged with the same bit
      for (let i = foes.length; i--;) if (foes[i].bit === f.bit) foes.splice(i, 1);
      if (!f.hit) earned[4] = 1;                                // UNTOUCHABLE — no damage during the fight (not healed-over)
      gainXp(12 + 6 * f.bi, f.x, f.y - 26); burst(f.x, f.y, 30, '#fff');
save();
    }
    if (!earned[2]) { earned[2] = 1; }
    return 1;
  }
};

// ---------- verbs ----------
function swing() {                                              // melee: horn swipe
  if (!started || choosing || deathT > 0 || atkCd > 0) return;
  atkCd = .28; swT = .14; seenM = 1; sfx(340, 90, .07, 'square', .1);
  const hx = pl.x + (pl.face > 0 ? PW : -16), hy = pl.y - 2;
  for (const f of [...foes]) {
    const fs = fsz(f);
    if (f.x + fs > hx && f.x < hx + 16 && f.y + fs > hy && f.y < hy + PH + 4) strike(f, roll(1), 1, 0);
  }
}
function shoot() {                                              // rainbow shot: 3 mana
  if (!started || choosing || deathT > 0 || !(abil & 4)) return;
  if (mn < 3) { fly(pl.x, pl.y - 12, 'need ✦3', '#f9c'); return; }
  mn -= 3; sfx(700, 1300, .12, 'sawtooth', .09);
  shots.push({ x: pl.x + PW / 2, y: pl.y + 5, vx: pl.face * 270, t: 1.1 });
}
function dash() {                                               // air dash: burst, resets on landing
  if (!started || choosing || deathT > 0 || !(abil & 8) || dashCd > 0) return;
  if (!pl.ground) { if (adash) return; adash = 1; }
  chT = 0;                                                      // dash cancels a heal channel (no move-while-rooted exploit)
  dashT = .15; dashCd = .45 * ((pk & 1024) ? .75 : 1); pl.sq = .6; sfx(600, 200, .12, 'sawtooth', .12); // NIMBLE perk -25% cd
}

const hurt = (n, safe) => {
  if (pl.inv > 0 || deathT > 0) return;
  n = Math.max(1, n - df);                                    // DEFENSE — subtract pips, always leave at least 1
  hp -= n; pl.inv = (pk & 32) ? 1.8 : 1.2; chT = 0; shk = Math.max(shk, .22);
  for (const f of foes) if (f.bit) f.hit = 1;                    // any hit disqualifies UNTOUCHABLE for the active boss(es)
  sfx(140, 55, .25, 'sawtooth', .2); burst(pl.x, pl.y + 7, 10, '#e05555'); // THICK MANE grace inside pl.inv
  if ((abil & 2) && !seenH) { seenH = 1; }
  if (hp <= 0) { deathT = 1.6; return; }
  if (safe) { pl.x = lastSafe[0]; pl.y = lastSafe[1]; pl.vx = pl.vy = 0; }
  else pl.vy = -180;
};

// ---------- update ----------
let last = performance.now(), time = 0;
const step = (dt) => {
  if (hs > 0) { hs -= dt; return; }               // HITSTOP — world freezes for the crit punch
  if (paused || dialog || choosing) return;        // pause / dialog / level-up allocation freezes sim; render still draws
  time += dt; jbuf -= dt; pl.inv -= dt; pl.t += dt; atkCd -= dt; swT -= dt; dashT -= dt; dashCd -= dt; dropT -= dt; shk -= dt;
  pl.sq += (1 - pl.sq) * Math.min(1, dt * 10);

  if (deathT > 0) {
    deathT -= dt;
    if (deathT <= 0) { hp = mHP(); pl.x = cp[0]; pl.y = cp[1]; pl.vx = pl.vy = 0; pl.inv = 1.5; }
    return;
  }
  if (!started || choosing) return;

  // -- drop-through: DOWN on a one-way platform falls through it (S doubles as
  // down here — movement wins over heal on platforms; heal works on solid ground) --
  const onPlat = pl.ground && tile((pl.x + PW / 2) / T | 0, (pl.y + PH + 1) / T | 0) === 2;
  if (onPlat && held('ArrowDown', 'KeyS', 'TBtnDn')) { dropT = .16; pl.ground = 0; pl.y += 3; pl.vy = 60; chT = 0; }

  // -- heal channel: rooted, costs 5, restores 1 (faster with HEART) --
  const healCost = (pk & 2048) ? 4 : 5;                              // OVERCHANNEL — heal costs 4 (perk bit moved from 4096 when STARSEEKER was cut)
  const canHeal = (abil & 2) && mn >= healCost && hp < mHP() && pl.ground && !onPlat;
  if (canHeal && healHeld()) {
    chT += dt; pl.vx = 0;
    if (chT > 1.3 - .1 * he) { chT = 0; mn -= healCost; hp++; burst(pl.x + PW / 2, pl.y + 4, 14, '#9fe8a0'); sfx(520, 1040, .25, 'triangle', .12); fly(pl.x, pl.y - 12, '+1', '#9fe8a0', 1); }
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

  // -- chest proximity — JUMP-to-open handled in keydown; here just flag the nearest --
  nearChest = -1;
  for (const c of chests) if (!(oc & (1 << c.i)) && Math.hypot(pl.x + PW / 2 - c.x, pl.y + PH / 2 - c.y) < 20) { nearChest = c.i; break; }

  // -- guardians: each shard is boss-gated --
  seeds.bosses.forEach(([bx, by], i) => {
    const bit = seeds.shards[i][2];
    // bossLive[i]: 0 = never spawned, 1 = currently on-screen, {hp,ph,spd,rc} = leash-out stash
    if ((bossDead & bit) || bossLive[i] === 1) return;
    if (Math.hypot(pl.x - bx * T, pl.y - by * T) < 80) {
      // LEASH RESTORE — if the boss was in-fight and player walked out of leash,
      // resume with the saved hp/phase/spd/rc (no free heal). Fresh spawn otherwise.
      const st = bossLive[i], fresh = !st;
      bossLive[i] = 1;
      foes.push({
        x: bx * T, y: by * T, vx: 0, vy: 0, k: 3, bi: i, bit, cz: 4, dm: 2,
        fl: 0, t: 0, hop: 1, hit: 0, mx: 24 + 10 * i,
        hp: fresh ? 24 + 10 * i : st.hp,
        ph: fresh ? 0 : st.ph, spd: fresh ? 0 : st.spd, rc: fresh ? undefined : st.rc,
      });
sfx(110, 55, .5, 'sawtooth', .18);
    }
  });

  // -- shards: locked (ghost) until the guardian falls; pickup = a level moment --
  for (const [sx, sy, bit] of seeds.shards) {
    if ((sh & bit) || !(bossDead & bit)) continue;
    if (Math.hypot(pl.x - sx * T, pl.y - sy * T) < 16) {
      sh |= bit; earned[1] = 1; S_SHARD(); burst(sx * T, sy * T, 30, '#fff');
      if (bit === 16) { abil |= 16; earned[12] = 1; }           // HEART shard — endgame flag
      pending++; choosing = 1; aRow = 0; S_NAT();               // the RPG moment, guaranteed
      save();
    }
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

  // -- foe bolts (Gloomcast + boss phase 2): hit the player, die on solid --
  for (const b of fbolts) {
    b.t -= dt; b.x += b.vx * dt; b.y += b.vy * dt;
    if (solid(b.x, b.y)) b.t = 0;
    else if (pl.x + PW > b.x - 2 && pl.x < b.x + 2 && pl.y + PH > b.y - 2 && pl.y < b.y + 2) { hurt(1, 0); b.t = 0; }
  }
  for (let i = fbolts.length; i--;) if (fbolts[i].t <= 0) fbolts.splice(i, 1);

  // -- foes --
  for (const f of [...foes]) {
    f.t += dt; f.fl -= dt;
    const fs = fsz(f);
    // RANGED CLOCK (tier-3 Gloomcast + boss phase 2): fire aimed bolt when in range
    if (f.rc !== undefined) {
      f.rc -= dt;
      if (f.rc <= 0 && Math.abs(pl.x - f.x) < 230) {
        f.rc = f.bit ? 1.6 : 2.1;
        const dx = pl.x + PW / 2 - f.x - fs / 2, dy = pl.y + PH / 2 - f.y - fs / 2, d = Math.hypot(dx, dy) || 1, sp = f.bit ? 115 : 90;
        fbolts.push({ x: f.x + fs / 2, y: f.y + fs / 2, vx: dx / d * sp, vy: dy / d * sp, t: 2.6 });
        sfx(f.bit ? 260 : 380, 180, .14, 'sawtooth', .09);
        if (!f.bit) f.vx = 0;                                   // ranged foe stops to fire
      }
    }
    if (f.bit) {                                                // GUARDIAN AI: chase + hop, leashed to its arena
      if (Math.hypot(pl.x - f.x, pl.y - f.y) > 220) {           // walk-out: stash hp/phase so re-trigger resumes, no free heal
        bossLive[f.bi] = { hp: f.hp, ph: f.ph || 0, spd: f.spd || 0, rc: f.rc };
        foes.splice(foes.indexOf(f), 1); continue;
      }
      f.hop -= dt;
      f.vx = Math.sign(pl.x + PW / 2 - f.x - fs / 2) * (28 + f.bi * 5) * (f.spd || 1);
      if (f.gr && f.hop <= 0) { f.vy = -240; f.hop = 2.4 / (f.spd || 1); f.gr = 0; }
    }
    const wasGr = f.gr;
    f.vy = (f.vy || 0) + 900 * dt; f.y += f.vy * dt;
    const ty = (f.y + fs) / T | 0;
    const tv = tile((f.x + fs / 2) / T | 0, ty);
    if (f.vy > 0 && (tv === 1 || tv === 2 || tv === 4)) {
      f.y = ty * T - fs; f.vy = 0; f.gr = 1;
      // SUMMIT SHOCKWAVE — guardian bi=3 in phase 2 rings the ground on landing
      if (f.bit && f.bi === 3 && f.ph && !wasGr) {
        shk = Math.max(shk, .3); burst(f.x + fs / 2, f.y + fs, 16, '#e08ae0'); sfx(90, 40, .3, 'sawtooth', .18);
        if (pl.ground && Math.abs(pl.x - f.x) < 64) hurt(1, 0);
      }
    }
    f.x += f.vx * dt;
    const ahead = f.x + fs / 2 + Math.sign(f.vx) * fs * .7;
    const blockedAhead = solid(ahead, f.y + fs / 2) || tile(ahead / T | 0, (f.y + fs + 6) / T | 0) === 0;
    if (blockedAhead) { if (f.bit) f.vx = 0; else f.vx *= -1; } // bosses hold their ground at edges — never lost off-arena
    // CONTACT with wind-up tell: touching sets .wt clock; hurt only fires after 0.3s
    // (visible red flash). Cooldown holds .wt < 0 until the strike can re-arm.
    // FIRST-FOE MELEE HINT — fired ONCE per save via DM voice, no player-anchored spam
    if (!seenM && !f.bit && Math.hypot(f.x - pl.x, f.y - pl.y) < 60) {
      seenM = 1; save();
    }
    const hit = pl.x < f.x + fs && pl.x + PW > f.x && pl.y < f.y + fs && pl.y + PH > f.y;
    if (hit && pl.vy > 40 && pl.y + PH - f.y < 10) {
      strike(f, roll(0), 0, 1);
      // STOMP LAUNCH — big vertical bounce + horizontal push AWAY from foe center.
      // pl.air = 0 keeps DJ available so a skilled player can chain stomps; the
      // horizontal push means an unskilled player lands far away instead of bunny-hopping.
      pl.vx = (f.x + fs / 2 < pl.x + PW / 2 ? 1 : -1) * 220;
      pl.vy = jumpHeld() ? -360 : -280; pl.air = 0; pl.sq = .75; sfx(200, 55, .1, 'square', .2);
      if (f.wt > 0) f.wt = 0;
    } else if (hit && (f.wt || 0) >= 0) {
      f.wt = (f.wt || 0) + dt;
      if (f.wt > .3) { hurt(f.dm, 0); f.wt = -.7; }
    } else if (!hit && (f.wt || 0) > 0) f.wt = 0;
    if (f.wt < 0) f.wt = Math.min(0, f.wt + dt);
  }
  for (let i = foes.length; i--;) if (foes[i].dead) foes.splice(i, 1);   // frame-end prune (fixes splice-race #5)

  // -- HEARTH proximity flag (input handling lives in keydown/pointerdown; JUMP is universal interact) --
  nearFire = 0;
  for (const [fx, fy] of seeds.fires) if (Math.hypot(pl.x - fx * T, pl.y - fy * T) <= 26) { nearFire = 1; break; }
  if (!nearFire && dialog) dialog = 0;                    // walk-away auto-closes dialog

  // -- achievement watchers (all 13 Wavedash slots live) --
  if (spk >= 30) earned[9] = 1;                                 // HOARDER
  if ((abil & 15) === 15) earned[10] = 1;                       // BELIEVER — every skill learned
  if (seenT) earned[7] = 1;                                     // SILVER_TONGUE — spoke with the DM at least once
  if (regionAt(pl.x + PW / 2, pl.y + 7) === regions[4]) earned[6] = 1; // SUMMIT
  if (hof === 4) earned[5] = 1;                                 // GREEN_HOOVES — MINT hooves picked (repurposed from region-rebloom)
  if (bod && man && hrn && hof) earned[11] = 1;                 // ARCHITECT — all 4 body parts customized off default

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

  // Sky + parallax — fixed 22%/12% palette per zone (rebloom removed)
  const rg = regionAt(pl.x + PW / 2, pl.y + 7);
  ctx.fillStyle = `hsl(${rg.h * 360} 22% 12%)`; ctx.fillRect(0, 0, VW, VH);
  for (const [par, base, amp, l] of [[.25, 90, 22, 8], [.5, 60, 16, 11]]) {
    ctx.fillStyle = `hsl(${rg.h * 360} 18% ${l}%)`;
    for (let x = 0; x < VW; x += 8) {
      const wx = x + cam.x * par;
      ctx.fillRect(x, VH - (base + Math.sin(wx * .011) * amp + Math.sin(wx * .027 + 5) * amp * .5), 8, VH);
    }
  }

  // SCREEN SHAKE — offset the world translate, not the HUD (which draws after the untranslate)
  const so = shk > 0 ? Math.random() * 6 - 3 : 0;
  ctx.translate((-cam.x + so) | 0, (-cam.y + so) | 0);
  const x0 = cam.x / T | 0, x1 = Math.min(W, x0 + VW / T + 2), y0 = Math.max(0, cam.y / T | 0), y1 = Math.min(H, y0 + VH / T + 2);
  for (let j = y0; j < y1; j++) for (let i = x0; i < x1; i++) {
    const v = tile(i, j); if (!v) continue;
    const r = regionAt(i * T + 8, j * T + 8), hue = r.h * 360;
    if (v === 1) {
      ctx.fillStyle = `hsl(${hue} 40% 32%)`; ctx.fillRect(i * T, j * T, T + .5, T + .5);
      if (tile(i, j - 1) !== 1) { ctx.fillStyle = `hsl(${hue} 55% 54%)`; ctx.fillRect(i * T, j * T, T + .5, 4); }
    } else if (v === 2) {
      ctx.fillStyle = `hsl(${hue} 50% 53%)`; ctx.fillRect(i * T, j * T, T + .5, 4);
    } else if (v === 4) {                                       // gloom crystal — pulses, begs to be shot
      ctx.fillStyle = `hsl(280 60% ${26 + Math.sin(time * 4 + i + j) * 8}%)`;
      ctx.fillRect(i * T, j * T, T + .5, T + .5);
      ctx.fillStyle = 'hsl(290 80% 60%)'; ctx.fillRect(i * T + 5, j * T + 5, 6, 6);
    } else {
      ctx.fillStyle = 'hsl(280 40% 40%)';
      for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(i * T + k * 4, j * T + T); ctx.lineTo(i * T + k * 4 + 2, j * T + 8); ctx.lineTo(i * T + k * 4 + 4, j * T + T); ctx.fill(); }
    }
  }

  // Hearth: campfire + SAGE wizard NPC (the shopkeeper — dialogue on approach)
  ctx.font = '9px monospace'; ctx.textAlign = 'center';
  for (const [fx, fy] of seeds.fires) {
    const cxp = fx * T, cyp = fy * T;
    // -- fire --
    ctx.fillStyle = '#6b4a2b'; ctx.fillRect(cxp - 8, cyp + 4, 16, 4);
    const fl = 8 + Math.sin(time * 13) * 2 + Math.sin(time * 31) * 1.5;
    ctx.fillStyle = '#ff9d3c'; ctx.beginPath(); ctx.moveTo(cxp - 5, cyp + 5); ctx.lineTo(cxp, cyp + 5 - fl); ctx.lineTo(cxp + 5, cyp + 5); ctx.fill();
    ctx.fillStyle = '#ffe08a'; ctx.beginPath(); ctx.moveTo(cxp - 2.5, cyp + 5); ctx.lineTo(cxp, cyp + 5 - fl * .6); ctx.lineTo(cxp + 2.5, cyp + 5); ctx.fill();
    // -- DM wizard NPC (stands to the right of the fire, feet on the ground) --
    // wy = head anchor. Fire base bottom = cyp+8 (ground level); boot bottoms sit exactly there.
    const wx = cxp + 14, wy = cyp - 10, wob = Math.sin(time * 2) * .3;
    ctx.fillStyle = '#4a3a7c';                                    // deep purple robe torso
    ctx.fillRect(wx - 3, wy + 6, 6, 7);                           // torso
    ctx.fillRect(wx - 4, wy + 11, 8, 3);                          // robe skirt (flare down to knees)
    ctx.fillStyle = '#3a2f5c';                                    // pants — darker purple, longer legs
    ctx.fillRect(wx - 2, wy + 14, 1, 3);                          // left leg
    ctx.fillRect(wx + 1, wy + 14, 1, 3);                          // right leg
    ctx.fillStyle = '#f5e0c8';                                    // face
    ctx.fillRect(wx - 2, wy + 3, 4, 3);
    ctx.fillStyle = '#e8e8f0';                                    // white beard
    ctx.fillRect(wx - 2, wy + 5, 4, 2);
    ctx.fillStyle = '#4a3a7c';                                    // pointed hat (stepped triangle)
    ctx.fillRect(wx - 3, wy + 1, 6, 2);
    ctx.fillRect(wx - 2, wy - 1, 4, 2);
    ctx.fillRect(wx - 1, wy - 3, 2, 2);
    ctx.fillStyle = '#ffd75e';                                    // gold star on hat tip (bobs gently)
    ctx.fillRect(wx, wy - 4 + wob, 1, 1);
    ctx.fillStyle = '#111';                                       // eyes
    ctx.fillRect(wx - 1, wy + 4, 1, 1); ctx.fillRect(wx + 1, wy + 4, 1, 1);
    ctx.fillStyle = '#2a1f3c';                                    // boots — planted on the ground line (cyp+8)
    ctx.fillRect(wx - 3, wy + 17, 3, 1);                          // left boot
    ctx.fillRect(wx + 1, wy + 17, 3, 1);                          // right boot
    ctx.fillStyle = '#8a6a3a';                                    // wooden staff (taller now to match)
    ctx.fillRect(wx + 5, wy + 2, 1, 15);
    ctx.fillStyle = '#8cf'; ctx.fillRect(wx + 5, wy + 1, 1, 1);   // cyan crystal tip
    // Prompt-above-head removed — JUMP button glyph (☰) already signals interact when nearby.
  }
  // CHESTS — 6 hand-placed exploration rewards. Opened chests render with lid up.
  // Prompt "▲ OPEN" pulses above the nearest unopened chest. (Design pivot v9.)
  for (const c of chests) {
    const opened = oc & (1 << c.i);
    ctx.fillStyle = '#6b4a2b';                              // dark oak base
    ctx.fillRect(c.x - 6, c.y - 2, 12, 7);                  // body
    ctx.fillStyle = '#8a6a3a';                              // lighter oak (lid or interior)
    if (opened) ctx.fillRect(c.x - 6, c.y - 6, 12, 3);      // lid tilted back (open)
    else ctx.fillRect(c.x - 6, c.y - 5, 12, 3);             // lid down (closed)
    ctx.fillStyle = '#ffd75e';                              // gold latch/band
    ctx.fillRect(c.x - 1, c.y - 1, 2, 3);
    if (!opened && nearChest === c.i && !dialog) {          // proximity prompt
      const pf = 1 + Math.sin(time * 5) * .3;
      ctx.fillStyle = '#ffd75e'; ctx.textAlign = 'center';
      ctx.font = 'bold 6px monospace'; ctx.fillText('▲ OPEN', c.x, c.y - 10 - pf);
    }
  }

  // shards + tease
  const gem = (gx, gy, a, lock) => {
    ctx.save(); ctx.translate(gx * T, gy * T + Math.sin(time * 2.4) * 3); ctx.rotate(time * 1.5);
    ctx.globalAlpha = a; ctx.fillStyle = lock ? '#889' : `hsl(${(time * 40) % 360} 80% 70%)`;
    ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(6, 0); ctx.lineTo(0, 8); ctx.lineTo(-6, 0); ctx.fill();
    ctx.restore(); ctx.globalAlpha = 1;
  };
  for (const [sx, sy, bit] of seeds.shards) if (!(sh & bit)) gem(sx, sy, (bossDead & bit) ? .95 : .3, !(bossDead & bit));

  // ARTICULATED ENEMY SPRITES — unicorn-quality (legs step, antennae bob,
  // hoods, glowing rune-eyes, robe folds). One draw fn per tier, boss shares
  // the caster-with-crown silhouette scaled up. cz=elite/boss cell multiplier.
  for (const f of foes) {
    const s = f.cz || 1 + f.k, fs = 5 * s, wob = Math.sin(f.t * 6) * 1.5;
    const step = Math.sin(f.t * 8) * s * .35;                   // leg-step animation, shared
    if (f.el) {                                                 // ELITE — small gold crown ABOVE head (no box, sprite-integrated read)
      ctx.fillStyle = '#ffd75e';
      const cx = f.x + fs / 2, cy = f.y - 4 + Math.sin(time * 4) * .5; // gentle bob
      ctx.fillRect(cx - 3, cy + 1, 6, 1);                         // crown base
      ctx.fillRect(cx - 3, cy, 1, 1);                             // three spikes
      ctx.fillRect(cx - 1, cy - 1, 1, 2);
      ctx.fillRect(cx + 2, cy, 1, 1);
    }
    ctx.save();
    ctx.translate(f.x + fs / 2, f.y + fs);
    ctx.scale((f.vx || 1) < 0 ? -1 : 1, 1);
    ctx.translate(-fs / 2, -fs);
    // colour: white flash on hit > red pre-strike wind-up tell > tier base
    ctx.fillStyle = f.fl > 0 ? '#fff' : f.wt > .12 ? '#ffb0b0' : f.bit ? '#111' : FOECOL[f.k];
    if (f.bit) {                                                // DARK HORSE — reflection of the player unicorn: same shape,
      // BLACK body, per-boss eye/horn color (bi 0..4), spectral gray mane.
      // Eye + horn flip to bright rage colors in phase 2 (half HP transition).
      const eye = ['#ff5d6c', '#c9a6f7', '#9fe89a', '#8cf', '#ffd75e'][f.bi];
      const sc = fs / 14, ph = Math.sin(f.t * 8) * 3;            // scale player unicorn bbox → fs; walk cycle
      ctx.scale(sc, sc);
      ctx.fillRect(1, 12 + ph * .3, 2, 4 - ph * .3);              // leg L (steps)
      ctx.fillRect(7, 12 - ph * .3, 2, 4 + ph * .3);              // leg R
      ctx.fillRect(0, 5, 10, 7);                                  // body
      ctx.fillRect(7, 0, 5, 6);                                   // head
      ctx.fillStyle = f.ph ? '#fff' : eye;                        // horn matches eye; white-hot rage in phase 2
      ctx.beginPath();
      ctx.moveTo(10, 0); ctx.lineTo(14, -5); ctx.lineTo(12, 1); ctx.fill();
      ctx.fillStyle = '#333';                                     // spectral gray mane (contrasts with black body)
      ctx.fillRect(5, 1, 2, 4); ctx.fillRect(3, 3, 2, 4); ctx.fillRect(1, 5, 2, 4);
      ctx.fillStyle = f.ph ? '#fff' : eye;                        // eye — signature per boss, flips to rage-white in phase 2
      ctx.fillRect(10, 2, 1.5, 1.5);
    } else if (f.k === 1) {                                     // DOUBTLING — 4-legged crawler w/ antennae
      ctx.fillRect(s * .2, fs - s + step, s * .6, s);            // legs step
      ctx.fillRect(s * 1.6, fs - s - step * .7, s * .6, s);
      ctx.fillRect(fs - s * 2.2, fs - s + step * .7, s * .6, s);
      ctx.fillRect(fs - s * .8, fs - s - step, s * .6, s);
      ctx.fillRect(0, s + wob * .4, fs, s * 2.5);                // body
      ctx.fillRect(s * .8, wob * .4, s * .3, s * 1.2);           // antennae
      ctx.fillRect(fs - s * 1.1, wob * .4, s * .3, s * 1.2);
      ctx.fillStyle = '#fff';                                    // eye
      ctx.fillRect(fs - s * 1.7, s * 1.6, s * .7, s * .7);
      ctx.fillStyle = '#000';
      ctx.fillRect(fs - s * 1.4, s * 1.8, s * .3, s * .3);
    } else if (f.k === 2) {                                     // GLOOMER — floating jelly w/ 3 dangling tendrils
      const flt = wob * 1.5;
      for (let i = 0; i < 3; i++) {                              // tendrils sway
        const tx = s * (.5 + i * 1.5);
        ctx.fillRect(tx, s * 2 + flt, s * .5, s * 2 + Math.sin(f.t * 4 + i) * s * .5);
      }
      ctx.fillRect(s * .3, s * .4 + flt, fs - s * .6, s * 2);    // body dome
      ctx.fillRect(0, s + flt, s * .3, s * 1.4);
      ctx.fillRect(fs - s * .3, s + flt, s * .3, s * 1.4);
      ctx.fillStyle = '#fff';                                    // paired eyes
      ctx.fillRect(s, s + flt, s * .6, s * .6);
      ctx.fillRect(fs - s * 1.6, s + flt, s * .6, s * .6);
    } else {                                                    // GLOOMCAST (k=3) — hooded caster w/ glowing rune-eye + charge orb
      ctx.fillRect(s * .2, s * 1.5, fs - s * .4, s * 2.7);       // robe
      ctx.fillRect(0, s * 2, s * .4, s * 1.5);                   // shoulders
      ctx.fillRect(fs - s * .4, s * 2, s * .4, s * 1.5);
      ctx.fillRect(s * 1.2, wob * .3, fs - s * 2.4, s * 1.4);    // hood top
      ctx.fillRect(s * .8, wob * .3 + s * .6, fs - s * 1.6, s * 1); // hood brim
      ctx.fillStyle = '#ffd75e';                                 // rune eye
      ctx.fillRect(fs / 2 - s * .3, s * .9 + wob * .3, s * .6, s * .35);
      if (f.rc !== undefined && f.rc < .5) {                     // charge orb (tell before firing)
        const p = (.5 - f.rc) * 2;
        ctx.fillStyle = '#c47fe0';
        ctx.fillRect(fs - s * .5, s * 2.5, s * (.8 + p * .6), s * (.8 + p * .6));
      }
    }
    ctx.restore();
    if (f.bit) {                                                // guardian HP bar
      ctx.fillStyle = '#2a2a33'; ctx.fillRect(f.x, f.y - 8, fs, 3);
      ctx.fillStyle = f.ph ? '#ffd75e' : '#e05555'; ctx.fillRect(f.x, f.y - 8, fs * f.hp / f.mx, 3);
    } else if (f.el && f.hp < f.mx) {                           // elite HP tick (mini-boss read, hidden until first hit)
      ctx.fillStyle = '#2a2a33'; ctx.fillRect(f.x, f.y - 3, fs, 1);
      ctx.fillStyle = '#ffd75e'; ctx.fillRect(f.x, f.y - 3, fs * f.hp / f.mx, 1);
    }
  }
  for (const s of shots) { ctx.fillStyle = `hsl(${(time * 500) % 360} 85% 65%)`; ctx.fillRect(s.x - 3, s.y - 2, 6, 4); }
  for (const b of fbolts) {                                     // foe bolt: purple diamond with a pale core
    ctx.fillStyle = '#c47fe0'; ctx.fillRect(b.x - 3, b.y - 3, 6, 6);
    ctx.fillStyle = '#fff'; ctx.fillRect(b.x - 1, b.y - 1, 2, 2);
  }

  // unicorn
  if (pl.inv <= 0 || Math.sin(time * 40) > 0) {
    ctx.save();
    ctx.translate(pl.x + PW / 2, pl.y + PH); ctx.scale((2 - pl.sq) * pl.face, pl.sq); ctx.translate(-PW / 2, -PH);
    drawU(pl.ground && Math.abs(pl.vx) > 20 ? Math.sin(pl.t * 16) * 3 : (pl.ground ? 0 : 2));
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
    ctx.fillStyle = f.c; ctx.fillText(f.txt, f.x | 0, f.y | 0);
  }
  ctx.globalAlpha = 1;
  ctx.translate((cam.x - so) | 0, (cam.y - so) | 0);            // undo world translate (incl. shake)

  // ---------- HUD (minimalist: hearts / mana / xp cluster top-left, pause icon top-right) ----------
  if (started && !paused) {
    ctx.textAlign = 'left';
    // TOP-LEFT CLUSTER — hearts row · mana bar · xp bar. Always-on, one place, high-contrast.
    ctx.font = '12px monospace';
    for (let i = 0; i < mHP(); i++) { ctx.fillStyle = i < hp ? '#ff5d6c' : '#3a3a44'; T2('♥', 10 + i * 13, 20); }
    const bw = 60;                                                  // shared bar width for mana + xp
    ctx.fillStyle = '#2a2a33'; ctx.fillRect(10, 26, bw, 4);         // mana track
    ctx.fillStyle = '#e08ae0'; ctx.fillRect(10, 26, bw * mn / mMN(), 4);
    ctx.fillStyle = '#2a2a33'; ctx.fillRect(10, 32, bw, 2);         // xp track (slimmer — level is less urgent than mana)
    ctx.fillStyle = lvl >= CAP ? '#ffd75e' : '#9fe89a'; ctx.fillRect(10, 32, lvl >= CAP ? bw : bw * xp / need(), 2);
    // TOP-RIGHT — pause icon (48px+ tap zone handled in pointerdown)
    ctx.textAlign = 'right'; ctx.fillStyle = '#aaa'; ctx.font = 'bold 14px monospace';
    T2('☰', VW - 10, 18);
    // Overlay narrator removed per design pivot. NPC dialog uses its own bubble.
    if (deathT > 0) { ctx.fillStyle = `rgba(0,0,0,${1 - Math.abs(deathT - .8) / .8})`; ctx.fillRect(0, 0, VW, VH); }
  }

  // HEARTH DIALOG OVERLAY — view-space bubble, keyboard nav + touch row-tap. Universal JUMP=confirm, MELEE=back.
  if (dialog && started) {
    const rows = ['1 TALK', '2 REST'];
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(20,15,30,.95)'; ctx.fillRect(VW / 2 - 70, 44, 140, 46);
    ctx.strokeStyle = '#ffd75e'; ctx.lineWidth = 1; ctx.strokeRect(VW / 2 - 70, 44, 140, 46);
    ctx.fillStyle = '#ffe08a'; ctx.font = 'bold 9px monospace'; ctx.fillText('THE SAGE', VW / 2, 54);
    ctx.font = 'bold 8px monospace';
    for (let i = 0; i < 2; i++) {
      if (dialog === i + 1) { ctx.fillStyle = 'rgba(255,215,94,.18)'; ctx.fillRect(VW / 2 - 60, 58 + i * 14, 120, 12); }
      ctx.fillStyle = dialog === i + 1 ? '#ffd75e' : '#ddd';
      ctx.fillText(rows[i], VW / 2, 67 + i * 14);
    }
    ctx.fillStyle = '#888'; ctx.font = '6px monospace';
    ctx.fillText(touch ? 'tap row · ← back' : '↕ select · ▲ confirm · ⚔ back', VW / 2, 100);
  }

  // CHARACTER SHEET overlay — pause (view) + level-up ALLOCATION (spend points).
  // Both share the split-panel layout; allocation mode adds ‹ › cursor + skill-unlock rows.
  if ((paused || choosing) && started) {
    portraitPanel('CHARACTER', 0);
    const alloc = !!choosing, arr = alloc ? picks() : [];
    // Right panel: header (LEVEL or LEVEL UP prompt) + XP bar
    ctx.textAlign = 'left';
    if (alloc) {
      ctx.fillStyle = '#ffd75e'; ctx.font = 'bold 10px monospace';
      ctx.fillText('LEVEL UP · ' + pending + ' pt' + (pending > 1 ? 's' : ''), 164, 48);
    } else {
      ctx.fillStyle = '#9fe89a'; ctx.font = 'bold 10px monospace';
      ctx.fillText('LEVEL ' + lvl, 164, 48);
    }
    const nx = need(), atCap = lvl >= CAP;
    ctx.fillStyle = '#3a3a44'; ctx.fillRect(164, 54, 180, 4);
    ctx.fillStyle = atCap ? '#ffd75e' : '#9fe89a'; ctx.fillRect(164, 54, atCap ? 180 : 180 * xp / nx, 4);
    ctx.fillStyle = '#666'; ctx.font = '7px monospace';
    ctx.fillText(atCap ? 'APOTHEOSIS · XP→SPK' : xp + ' / ' + nx + ' XP', 164, 66);
    // Rows — in ALLOC mode: [skill unlocks | 5 stats]. In pause: [5 stats only].
    const statList = [['HP', he, '#ff5d6c'], ['STR', ho, '#ffd75e'], ['DEF', df, '#8cf'], ['MAG', sp, '#e08ae0'], ['LUCK', lk, '#9fe89a']];
    const rows = alloc
      ? arr.map(c => c.k ? { name: 'NEW SKILL · ' + c.n, val: '', col: c.col, skill: 1 } : { name: statList[c.i][0], val: String(statList[c.i][1]), col: statList[c.i][2] })
      : statList.map(([l, v, c]) => ({ name: l, val: String(v), col: c }));
    ctx.font = 'bold 9px monospace';
    rows.forEach((r, i) => {
      const y = 82 + i * 12, sel = alloc && i === aRow;
      if (sel) { ctx.fillStyle = 'rgba(255,215,94,.14)'; ctx.fillRect(160, y - 9, 190, 12); }
      ctx.fillStyle = r.col; ctx.textAlign = 'left'; ctx.fillText(r.name, 164, y);
      if (r.val) { ctx.fillStyle = '#fff'; ctx.textAlign = 'right'; ctx.fillText((sel ? '‹ ' : '') + r.val + (sel ? ' ›' : ''), 340, y); }
      else if (sel) { ctx.fillStyle = '#ffd75e'; ctx.textAlign = 'right'; ctx.fillText('▶', 340, y); }
    });
    ctx.textAlign = 'left';
    // Perks + skills bottom
    ctx.fillStyle = '#c9a6f7'; ctx.font = 'bold 8px monospace'; ctx.fillText('PERKS', 20, 156);
    PERKS.filter(p => pk & p.b).forEach((p, i) => {
      const x = 20 + (i % 6) * 34, y = 162 + Math.floor(i / 6) * 26;
      ctx.strokeStyle = '#c9a6f7'; ctx.strokeRect(x, y, 20, 20);
      ctx.fillStyle = '#c9a6f7'; ctx.textAlign = 'center'; ctx.font = 'bold 11px monospace';
      ctx.fillText(p.n[0], x + 10, y + 14);
      ctx.font = '6px monospace'; ctx.fillText(p.n.slice(0, 6), x + 10, y + 26);
    });
    ctx.textAlign = 'left'; ctx.fillStyle = '#8cf'; ctx.font = 'bold 8px monospace'; ctx.fillText('SKILLS', 260, 156);
    [[1, '▲', 'JUMP', '#6bc5ff'], [2, '+', 'HEAL', '#9fe8a0'], [4, '✦', 'SHOT', '#c9a6f7'], [8, '»', 'DASH', '#ffd75e']].forEach(([bit, g, nm, col], i) => {
      const x = 260 + i * 34, y = 162, on = abil & bit;
      ctx.strokeStyle = on ? col : '#333'; ctx.strokeRect(x, y, 20, 20);
      ctx.fillStyle = on ? col : '#333'; ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center'; ctx.fillText(g, x + 10, y + 14);
      ctx.font = '6px monospace'; ctx.fillText(nm, x + 10, y + 26);
    });
    // Footer
    ctx.font = 'bold 9px monospace';
    ctx.fillStyle = '#ffd75e'; T2('RAINBOW · ' + [1, 2, 4, 8, 16].filter(b => sh & b).length + ' / 5', 130, 254);
    ctx.fillStyle = '#ffe28a'; T2('SPARKS · ' + spk, 350, 254);
    ctx.fillStyle = '#666'; ctx.font = '7px monospace';
    T2(alloc ? '↑↓ pick · → allocate · cannot close' : 'P / ESC / tap · close', VW / 2, VH - 4);
  }

  // action buttons — hidden during pause / level-up / shop (dedicated overlays own the input)
  // Colored ring per action, dark disc, glyph in accent color. Modern mobile pattern.
  if (started && !choosing && !paused) {
    ctx.textAlign = 'center';
    for (const b of btns()) {
      const pressed = keys.has(b.c);
      // dark disc for hit legibility over any background
      ctx.globalAlpha = pressed ? .85 : (touch ? .55 : .38);
      ctx.fillStyle = 'rgba(15,15,20,.75)';
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 7); ctx.fill();
      // colored outer ring
      ctx.strokeStyle = b.col; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 7); ctx.stroke();
      // glyph in ring color (pressed = full brightness)
      ctx.globalAlpha = pressed ? 1 : .9;
      ctx.fillStyle = b.col; ctx.font = 'bold 14px monospace';
      ctx.fillText(b.l, b.x, b.y + 5);
      if (!touch && b.h) {                                        // key hint for desktop users
        ctx.globalAlpha = .7; ctx.fillStyle = '#ccc'; ctx.font = '6px monospace';
        ctx.fillText(b.h, b.x, b.y - b.r - 3);
      }
    }
    ctx.globalAlpha = 1;
  }

  // TITLE screen (phase 0) — branded start: black sky, stars, rainbow arc, unicorn
  if (phase === 0) {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, VW, VH);
    for (const p of stars) {
      const y = (p.y + time * p.v) % (VH + 4);
      ctx.fillStyle = 'rgba(220,225,255,' + p.a + ')';
      ctx.fillRect(p.x | 0, y | 0, p.s, p.s);
    }
    // Rainbow arc
    ctx.lineWidth = 3;
    ['#ff5d6c', '#ff9d3c', '#ffd75e', '#9fe8a0', '#8cf', '#7a8cff', '#c9a6f7'].forEach((c, i) => {
      ctx.strokeStyle = c; ctx.beginPath(); ctx.arc(VW / 2, 130, 78 - i * 3, Math.PI, 0); ctx.stroke();
    });
    // Centered white unicorn silhouette (default palette look — pre-customization)
    const bob = Math.sin(time * 1.6) * 1;
    ctx.save(); ctx.translate(VW / 2, 108); ctx.scale(2.4, 2.4);
    ctx.fillStyle = '#f5f1f4';
    ctx.fillRect(-6, bob, 12, 7); ctx.fillRect(2, bob - 4, 5, 5);
    ctx.fillStyle = '#ffd75e'; ctx.beginPath();
    ctx.moveTo(5, bob - 4); ctx.lineTo(9, bob - 10); ctx.lineTo(6, bob - 3); ctx.fill();
    ['#ff6b6b', '#ffd75e', '#6bc5ff'].forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(-8 - i * 2, bob + i, 2, 4); });
    ctx.fillStyle = '#333'; ctx.fillRect(4, bob - 2, 1, 1);
    ctx.restore();
    // Title + subtitle
    const hue = (time * 30) % 360, br = 1 + Math.sin(time * 2) * .02;
    ctx.textAlign = 'center';
    ctx.save(); ctx.translate(VW / 2, 168); ctx.scale(br, br);
    ctx.fillStyle = `hsl(${hue} 70% 62%)`; ctx.font = 'bold 30px monospace'; ctx.fillText('UNI-CORN', 0, 0);
    ctx.restore();
    ctx.fillStyle = '#ffd75e'; ctx.font = 'italic 10px monospace'; ctx.fillText('the last savior', VW / 2, 188);
    // Menu
    // NEW GAME · CONTINUE · DELETE SAVE. DELETE arms on first press, wipes on second.
    const has = hasSave();
    const opts = has ? ['NEW GAME', 'CONTINUE', delConf ? 'DELETE? PRESS AGAIN' : 'DELETE SAVE'] : ['NEW GAME'];
    opts.forEach((o, i) => {
      const y = 208 + i * 16, on = mSel === i, isDel = i === 2;
      ctx.fillStyle = on ? (isDel ? (delConf ? '#ff5d6c' : '#ff9d3c') : '#ffd75e') : (isDel ? '#a55' : '#aaa');
      ctx.font = 'bold 11px monospace';
      ctx.fillText((on ? '▶ ' : '  ') + (i + 1) + '. ' + o, VW / 2 + (on ? 6 : 0), y);
    });
    if (has) { ctx.fillStyle = '#888'; ctx.font = '8px monospace'; ctx.fillText('saved: ' + pName + ' · LV' + lvl, VW / 2, 260); }
    ctx.fillStyle = '#666'; ctx.font = '7px monospace';
    ctx.fillText('↑↓ select · ENTER accept · A/D move · SPACE jump · J swipe · L shot · S heal', VW / 2, 266);
  }
  // CHARACTER CREATE screen (phase 1) — same split-panel look as pause
  if (phase === 1) {
    portraitPanel('NEW CHARACTER', 1);
    // Right panel — name label + 3 color cyclers. Active row highlighted gold.
    ctx.textAlign = 'left'; ctx.font = 'bold 10px monospace';
    const nmVal = ent + (cRow === 0 && Math.sin(time * 4) > 0 && ent.length < 8 ? '_' : '');
    const rows = [
      ['NAME',   nmVal || '(type A–Z)', '#fff'],
      ['BODY',   PALB[bod][1], PALB[bod][0]],
      ['MANE',   PALM[man][1], PALM[man][0][0]],
      ['HORN',   PALH[hrn][1], PALH[hrn][0]],
      ['HOOVES', PALF[hof][1], PALF[hof][0]],
    ];
    rows.forEach(([lbl, val, col], i) => {
      const y = 54 + i * 18, on = cRow === i;                        // tighter row height fits 5 rows
      ctx.fillStyle = on ? '#ffd75e' : '#888'; ctx.fillText(lbl, 164, y);
      ctx.fillStyle = on ? '#fff' : '#aaa'; ctx.fillText((on && i > 0 ? '‹ ' : '  ') + val + (on && i > 0 ? ' ›' : ''), 220, y);
      if (i > 0) { ctx.fillStyle = col; ctx.fillRect(340, y - 8, 10, 10); }
    });
    // BEGIN NEW GAME button — bottom-center, clickable (tap area matches BEGIN_BTN below)
    const canBegin = ent.length > 0;
    const bx = VW / 2 - 70, by = VH - 42;
    ctx.strokeStyle = canBegin ? '#ffd75e' : '#3a3a44'; ctx.lineWidth = 1;
    ctx.fillStyle = canBegin ? 'rgba(255,215,94,.14)' : 'rgba(255,255,255,.03)';
    ctx.fillRect(bx, by, 140, 26); ctx.strokeRect(bx, by, 140, 26);
    ctx.fillStyle = canBegin ? '#ffd75e' : '#666'; ctx.font = 'bold 12px monospace'; ctx.textAlign = 'center';
    T2('▶ BEGIN NEW GAME', VW / 2, by + 17);
    ctx.fillStyle = '#666'; ctx.font = '7px monospace';
    ctx.fillText('↑↓ row · A–Z name · ←→ color · ENTER or tap BEGIN', VW / 2, VH - 6);
  }
  ctx.restore();
};

// ---------- loop ----------
load();
cam.x = Math.max(0, Math.min(W * T - VW, pl.x - VW / 2));      // camera starts ON the player (was: panned in from world origin)
cam.y = Math.max(0, Math.min(H * T - VH, pl.y - VH / 2 + 30));
// opening line fires when the player picks a name / picks Continue (see title-menu accept)
const loop = () => {
  const now = performance.now(), dt = Math.min(.033, (now - last) / 1000); last = now;
  step(dt); draw();
  requestAnimationFrame(loop);
};
loop();
