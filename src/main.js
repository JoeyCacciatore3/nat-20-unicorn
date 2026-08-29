// NAT 20 UNICORN v2 — 2D metroidvania platformer. Canvas 2D, no WebGL.
//
// Design spine (locked):
//   - Dual-convention controls + touch overlay
//   - Verb economy: stomp FREE · melee GENERATES mana · shot/heal SPEND mana
//   - Progression: 3 stats (HORN/HEART/SPARK) + class at L3 + 13-perk pool
//     + level cap L15 APOTHEOSIS; skills gate on LEVEL not shard (LV3/5/7/9)
//   - Shards repaint regions + grant a bonus level (no combat prereq for skills)
//
// Phase lineage (chronological):
//   1  Bible-approved core (controls, verbs, stats, world, shards)
//   3  Combat FEEL — hitstop, screen shake, knockback, wind-up tells,
//      boss phase 2s, elite foes, Gloomcast ranged tier
//   4  Correctness + modern canvas — DPR + visualViewport + smoothing off,
//      boss-leash HP persistence, splice-race guard, UNTOUCHABLE integrity
//   5  Title screen + name entry + articulated enemy sprites (unicorn-parity)
//   6  Full leveling — class fork at L3, L15 APOTHEOSIS, +5 perks, XP bar
//   7  Cleanup — ARCHITECT bug fix, dead PAT fields removed, v6 save pin
//   8  Stomp launch (horizontal knockback + higher bounce) + tutorial-hint
//      one-shot via say() queue + v7 save (seen-flags persist across sessions)
//   9  AAA-quality HUD pass — bottom-left cluster near thumb, contextual mana
//      fade, level-up hint auto-hide (5 s or 75 % of XP bar), pause overlay
//      with full character sheet (P / ESC / ☰ tap), 2 px stroke outlines on
//      all HUD text, viewport-fit=cover for notched devices
//  10  Minimalist HUD redesign — hearts / mana bar / xp bar top-left cluster
//      always-on. Removed dice + gems + name banner + level-up hint from HUD
//      (moved to pause overlay). Contextual REST + SHOP + READ buttons dock
//      near dpad — never mid-screen. Every button gets a color-coded ring for
//      at-a-glance identity (cyan jump · white melee · purple shot · green
//      heal · gold dash / green rest). Shop is now touch-reachable.
//  11  Hearth NPC + dialogue system — proper wizard sprite next to the fire
//      (robe, hat with gold star, beard, staff with crystal). Classic RPG
//      dialogue bubble on approach: 1 TALK · 2 REST · 3 SHOP with keys +
//      touch buttons (?, Z, $). First TALK grants +10 XP boon + intro line,
//      later talks rotate through DM_LINES pool. Elite marker changed from
//      ugly outer strokeRect to a small pulsing gold crown ABOVE the head
//      (sprite-integrated, no visual "box" around the enemy). Removed
//      legacy B-opens-shop keyboard shortcut (superseded by 3 in the
//      dialogue menu). Shop close hint updated to reflect current bindings.
//  12  Consolidation — JUMP button is universal INTERACT/CONFIRM (contextual
//      glyph: ▲ jump · ☰ open dialog at fire · ↵ confirm in dialog); MELEE
//      button is BACK/CANCEL (← in dialog). Removed dedicated hearth touch
//      buttons (TBtnT/TBtnE/TBtnSh) and Digit1-3/KeyT/KeyE aliases. Dialog
//      uses ↑↓ nav + JUMP confirm + MELEE back. Wizard sprite extended with
//      proper legs so feet plant on the ground (was floating).
//  13  Removed lore-stones system entirely — world seeds, LORE array, readLore
//      fn, loreRead state, nearLore proximity, JUMP ★ label, TBtnJ handler,
//      save `r` field. SILVER_TONGUE achievement repurposed to fire on first
//      DM conversation (was "read both stones"). Save v7 → v8. Wizard given
//      longer legs (pants + planted boots at ground line cyp+8) — no more
//      floating look.
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
// phase 0 = title menu, 1 = name entry, 2 = playing (started=1)
let phase = 0, ent = '', pName = 'HORSE', mSel = 0;
const hasSave = () => !!localStorage.n20_save;
const nameKey = (e) => {
  if (e.code === 'Backspace') ent = ent.slice(0, -1);
  else if (e.code === 'Enter' && ent.length) { pName = ent; phase = 2; started = 1; save(); opener(); }
  else if (ent.length < 8 && /^[a-z]$/i.test(e.key)) ent += e.key.toUpperCase();
};
const titleKey = (e) => {
  const opts = hasSave() ? 2 : 1;
  if (e.code === 'ArrowUp' || e.code === 'KeyW') mSel = (mSel + opts - 1) % opts;
  else if (e.code === 'ArrowDown' || e.code === 'KeyS') mSel = (mSel + 1) % opts;
  else if (e.key === '1' || (mSel === 0 && (e.code === 'Enter' || e.code === 'Space'))) { phase = 1; ent = ''; }
  else if ((e.key === '2' || (mSel === 1 && (e.code === 'Enter' || e.code === 'Space'))) && hasSave()) { load(); phase = 2; started = 1; opener(); }
};
addEventListener('keydown', (e) => {
  if (e.repeat) return;
  if (e.code === 'Space' || e.code.indexOf('Arrow') === 0) e.preventDefault();
  boot();                                                    // resume audio on any key (autoplay policy)
  if (phase === 0) return titleKey(e);
  if (phase === 1) return nameKey(e);
  // DIALOG owns input — arrow keys navigate, JUMP confirms, MELEE cancels
  if (dialog) {
    if (e.code === 'ArrowUp')        dialog = ((dialog - 2 + 3) % 3) + 1;
    else if (e.code === 'ArrowDown') dialog = (dialog % 3) + 1;
    else if (J_KEYS.includes(e.code) || e.code === 'Enter') dialogDo();
    else if (M_KEYS.includes(e.code) || e.code === 'Escape') dialog = 0;
    return;
  }
  // Near NPC: JUMP becomes universal INTERACT (open dialog) — no dedicated interact key
  if (J_KEYS.includes(e.code) && nearFire) { dialog = 1; return; }
  keys.add(e.code);
  if (J_KEYS.includes(e.code)) jbuf = .12;
  if (M_KEYS.includes(e.code)) swing();
  if (SH_KEYS.includes(e.code)) shoot();
  if (['ShiftLeft', 'ShiftRight', 'KeyO'].includes(e.code)) dash();
  if (choosing) { const n = '123456'.indexOf(e.key); if (n >= 0) pick(n); }
  else if (shopping) {
    const n = '12345'.indexOf(e.key); if (n >= 0) buy(n);
    if (e.code === 'KeyE' || e.code === 'Escape') { shopping = 0; keys.delete('KeyE'); }   // E or Esc closes shop
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
  const jl = dialog ? '↵' : nearFire ? '☰' : '▲';
  const jc = dialog || nearFire ? '#ffd75e' : '#8cf';
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
  if (phase === 0) { if (vy > VH / 2 && hasSave()) { load(); phase = 2; started = 1; opener(); } else { phase = 2; started = 1; save(); opener(); } return; }
  // NAME ENTRY: tap = accept current buffer (or default HORSE), same as Enter
  if (phase === 1) { pName = ent || 'HORSE'; phase = 2; started = 1; save(); opener(); return; }
  // PAUSE overlay — top-right corner icon opens it (48px tap zone); tap anywhere to close
  if (paused) { paused = 0; return; }
  if (started && !choosing && !shopping && !dialog && vx > VW - 40 && vy < 40) { paused = 1; return; }
  // DIALOG overlay taps: JUMP btn = confirm · MELEE btn = back · bubble row = pick · else close
  if (dialog) {
    const bs = btns();
    const jb = bs.find(b => b.c === 'TBtnJ'), mb = bs.find(b => b.c === 'TBtnM');
    if (jb && Math.hypot(vx - jb.x, vy - jb.y) < jb.r + 6) { dialogDo(); return; }
    if (mb && Math.hypot(vx - mb.x, vy - mb.y) < mb.r + 6) { dialog = 0; return; }
    if (vx >= VW / 2 - 70 && vx <= VW / 2 + 70 && vy >= 56 && vy <= 100) {
      const row = ((vy - 58) / 14) | 0;
      if (row >= 0 && row <= 2) { dialog = row + 1; dialogDo(); return; }
    }
    dialog = 0; return;
  }
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
    // JUMP button contextualizes: near NPC it's INTERACT, not jump
    if (b.c === 'TBtnJ' && nearFire) { dialog = 1; return; }
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

// ---------- DM voice (queued: same-frame pileups play in order, none are eaten) ----------
let dmTxt = '', dmT = 0;
const dmQ = [];
const say = (t) => { if (dmT > 0) dmQ.push(t); else { dmTxt = t; dmT = 3.2; } };
// DM dialogue pool — first-talk grants a small XP boon (+10), later talks rotate lore/encouragement
const DM_LINES = [
  'Welcome, little hero. The table remembers a brave d20. Take this — a boon of experience.',
  'Every roll counts. Even the ones that vanish behind the DM screen.',
  'The shards want to be free. Their guardians want otherwise.',
  'Rest well. Doubt is patient — so are we.',
];

// ---------- RPG 2.0 (researched): milestone dice, modifier stats, D&D perks ----------
let ho = 1, he = 1, sp = 1;                       // HORN (+dmg) HEART (+♥) SPARK (+✦) — HOOF cut (useless + broke gate proofs)
let hp = 3, xp = 0, lvl = 1, spk = 0, cls = 0;    // cls: 0 unpicked · 1 RAMPART · 2 PRISM · 3 ROGUE (D&D-style identity, chosen at L3)
let sh = 0, abil = 0, bossDead = 0;               // sh = shards HELD (flavor now); abil = skills LEARNED; bits: 1 DJ 2 heal 4 shot 8 dash 16 heart
let mn = 5, choosing = 0, pending = 0, pk = 0, edg = 0, shp = 0, shopB = 0, shopping = 0;
const CAP = 15;                                   // hard level cap. L15 grants APOTHEOSIS (+2 dmg, +1 max ♥); post-cap XP → sparks 1:1
const SKILL_MIN = { 1: 3, 2: 5, 4: 7, 8: 9 };     // level thresholds for the 4 movement skills — leveling is the ONLY gate (shards are flavor)
let hs = 0, shk = 0;                              // combat feel: hitstop freeze + screen shake, both in seconds
const bossLive = [0, 0, 0, 0, 0];
const mHP = () => 2 + he + shp + (lvl >= CAP ? 1 : 0);      // APOTHEOSIS grants +1 max ♥ at cap
const mMN = () => 3 + sp * 2;
const DIE = () => lvl >= 12 ? 12 : lvl >= 9 ? 10 : lvl >= 6 ? 8 : lvl >= 3 ? 6 : 4; // die = LEVEL MILESTONE (Zelda-heart law)
const MOD = () => ho - 1 + edg + (lvl >= CAP ? 2 : 0) + ((pk & 256) ? (mHP() - hp) : 0); // BLOODLETTER: +1/missing ♥ · APOTHEOSIS: +2
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
  { b: 256, n: 'BLOODLETTER', d: '+1 dmg per missing ♥' },
  { b: 512, n: 'THIRST', d: 'kills refill 1 ✦' },
  { b: 1024, n: 'NIMBLE', d: '−25% dash cooldown' },
  { b: 2048, n: 'STARSEEKER', d: 'motes worth ×2 XP' },
  { b: 4096, n: 'OVERCHANNEL', d: 'heal costs 4 (was 5)' },
];
// D&D-style class picked at L3 — starter perk + starter stat + a persistent passive.
// Class doesn't add new UI beyond the L3 menu; it drives a small bonus in the systems that already exist.
const CLASSES = [
  ['RAMPART', 'melee wall · KEEN HORN · +♥', '#ff5d6c'],
  ['PRISM',   'spellweave · SCHOLAR · +✦',   '#c9a6f7'],
  ['ROGUE',   'crit hunter · REROLL 1s · +HORN', '#ffd75e'],
];
const CLASS_TITLE = ['', 'RAMPART', 'PRISM', 'ROGUE'];
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
  const nxt = lvl + 1;
  // L3 class fork replaces the normal menu entirely — one-time identity choice
  if (nxt === 3 && !cls) { CLASSES.forEach((c, i) => menu.push({ cl: i + 1, n: c[0], d: c[1], col: c[2] })); return; }
  // skill unlocks — level-gated only. Shards no longer required (they are region-rebloom flavor now).
  for (const bit of [1, 2, 4, 8]) if (!(abil & bit) && nxt >= SKILL_MIN[bit]) menu.push({ k: bit, n: SKILLS[bit][0], d: SKILLS[bit][1], col: SKILLS[bit][2] });
  const un = PERKS.filter(p => !(pk & p.b));
  if (nxt % 2 === 0 && un.length) {               // even level -> perk offer (pool of 13, take 3 random)
    for (let i = 0; i < 3 && un.length; i++) { const j = Math.random() * un.length | 0; const p = un[j]; un.splice(j, 1); menu.push({ p, n: p.n, d: p.d, col: '#c9a6f7' }); }
  } else STATS.forEach((s, i) => menu.push({ i, n: s[0], d: s[1], col: s[2] }));
  menu = menu.slice(0, 6);
};
const pick = (n) => {
  const c = menu[n]; if (!c) return;
  if (c.cl) {                                     // CLASS: starter perk + stat + persistent passive (dash cd / heal cost / etc live in-engine)
    cls = c.cl;
    if (cls === 1) { pk |= 1; he++; hp++; }       // RAMPART: KEEN HORN + HEART pip
    else if (cls === 2) { pk |= 16; sp++; mn += 2; } // PRISM: SCHOLAR + SPARK pip
    else { pk |= 4; ho++; }                       // ROGUE: REROLL 1s + HORN pip
    say('You are ' + pName + ' the ' + CLASS_TITLE[cls] + '. The table remembers.');
  } else if (c.k) { abil |= c.k; say(LEARN[c.k]); }
  else if (c.p) pk |= c.p.b;
  else STATS[c.i][3]();
  lvl++; pending--;
  fly(pl.x, pl.y - 14, c.n + '!', '#ffd75e', 1); sfx(660, 990, .15, 'triangle', .12);
  if ([3, 6, 9, 12].includes(lvl)) { fly(pl.x, pl.y - 26, '🎲 → d' + DIE(), '#fff', 1); say('The die grows. A d' + DIE() + ' now. The table approves.'); }
  if (lvl === CAP) { fly(pl.x, pl.y - 28, 'APOTHEOSIS', '#ffd75e', 1); hp = mHP(); say('APOTHEOSIS. You are the die now, ' + pName + '. The doubt is not enough.'); }
  if (!pending) { choosing = 0; save(); } else openMenu();
};

// grant one random un-owned perk (elite drop). If all owned, tip 6 sparks instead.
const grantPerk = (x, y) => {
  const un = PERKS.filter(p => !(pk & p.b));
  if (un.length) {
    const p = un[Math.random() * un.length | 0];
    pk |= p.b; fly(x, y, p.n + '!', '#c9a6f7', 1);
    say('An elite falls. Its perk is yours: ' + p.n + '.');
  } else { spk += 6; fly(x, y, '+6 💎', '#ffe28a', 1); }
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
    v: 8, e: earned, h: hp, x: xp, l: lvl, s: spk, a: abil, n: mn, q: sh, g: bossDead,
    p: pk, w: shopB, t: [ho, he, sp], c: [cp[0], cp[1]], b: regions.map(r => r.t),
    m: pName, k: cls, f: seenM | (seenH << 1) | (seenT << 2), // v8 — dropped lore-stones (r field). tutorial flags: bit 0 melee · 1 heal · 2 first-DM-talk
  });
};
const load = () => {
  try {
    const d = JSON.parse(localStorage.n20_save || '0');
    if (!d || d.v !== 8) return;                                // v8 — lore-stones removed (r field dropped). v7 saves start fresh (early access, no migration path).
    // v8 pin: every field is guaranteed present, no legacy || fallbacks needed
    d.e.forEach((v, i) => earned[i] = v);
    hp = d.h; xp = d.x; lvl = d.l; spk = d.s; abil = d.a; mn = d.n;
    sh = d.q; bossDead = d.g; pk = d.p; shopB = d.w; pName = d.m; cls = d.k;
    seenM = d.f & 1; seenH = (d.f >> 1) & 1; seenT = (d.f >> 2) & 1;
    edg = (shopB & 1) + ((shopB >> 2) & 1) + ((shopB >> 4) & 1); // rebuild shop effects from bought bits
    shp = ((shopB >> 1) & 1) + ((shopB >> 3) & 1);
    [ho, he, sp] = d.t;                                          // v8 pin: d.t always present
    cp = d.c; pl.x = cp[0]; pl.y = cp[1];
    d.b.forEach((v, i) => { regions[i].t = v; regions[i].b = v; });
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
let dialog = 0;
const dialogDo = () => {
  if (dialog === 1) {                             // TALK — first talk grants +10 XP boon
    if (!seenT) { seenT = 1; gainXp(10, pl.x, pl.y - 14); say(DM_LINES[0]); save(); }
    else say(DM_LINES[1 + (Math.random() * (DM_LINES.length - 1) | 0)]);
  } else if (dialog === 2) {                      // REST + save
    const [fx, fy] = seeds.fires[0];
    if (hp === mHP()) earned[8] = 1;              // WELL_RESTED — rest without needing it
    hp = mHP(); cp = [fx * T - 20, (fy - 1) * T]; earned[0] = 1; save();
    burst(fx * T, fy * T - 8, 12, '#fc6'); sfx(500, 900, .3, 'triangle', .1);
    say('Rest. Saved. The fire keeps what you earned.');
  } else shopping = 1;                            // SHOP
  dialog = 0;
};
let dashT = 0, dashCd = 0, adash = 0, dropT = 0;
// FIXED physics — never stat-scaled: the map gate proofs depend on these numbers
const G_RISE = 750, G_FALL = 1500, FALLCAP = 400;
const RUN = () => 115, V0 = () => 250;

const solid = (x, y) => { const v = tile(x / T | 0, y / T | 0); return v === 1 || v === 4; }; // gloom crystal is solid until shot
const spike = (x, y) => tile(x / T | 0, y / T | 0) === 3;

// ---------- entities ----------
const sparks = seeds.sparks.map(([x, y]) => ({ x: x * T, y: y * T, got: 0, ph: Math.random() * 7 }));
const motes = seeds.motes.map(([x, y]) => ({ x: x * T, y: y * T, got: 0, ph: Math.random() * 7 }));
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
  'Timber. Take your prize.',
  'The peak is yours.',
  'The doubt... surrenders.',
];

// damage a foe: dmg = die + MOD, crit doubles. Full D&D damage line, visible.
// Feel pass: knockback on non-boss/non-stomp hits, hitstop + shake on crit, boss
// phase-2 trigger at half HP, elite perk drop on kill, minion cleanup on boss death.
const strike = (f, r, gen, viaStomp) => {
  const crit = isCrit(r), dmg = (r + MOD()) * (crit ? 2 : 1);
  f.hp -= dmg; f.fl = .15;
  if (!f.bit && !viaStomp) f.vx += (crit ? 220 : 140) * (f.x > pl.x ? 1 : -1); // KNOCKBACK — bosses hold their arena
  shk = Math.max(shk, crit ? .22 : .09);
  if (crit) hs = .06;                             // hitstop punch — 60 ms world freeze on Nat crit
  fly(f.x, f.y - 8, crit ? 'NAT ' + r + '! ' + dmg : MOD() ? r + '+' + MOD() : '🎲' + r, crit ? '#ffd75e' : '#fff', crit);
  if (crit) { S_NAT(); earned[3] = 1; burst(f.x, f.y, 24, '#ffd75e'); }
  if (gen) mn = Math.min(mMN(), mn + 1);          // melee GENERATES mana
  // BOSS PHASE 2 — first crossing of half HP, permanent
  if (f.bit && !f.ph && f.hp <= f.mx / 2 && f.hp > 0) {
    f.ph = 1; say('It bleeds — the pattern turns.'); sfx(220, 110, .35, 'sawtooth', .16);
    if (f.bi === 1 || f.bi === 4) for (let n = 0; n < 2; n++)                                  // CAVES + HEART: summon minions
      foes.push({ x: f.x + n * 20 - 10, y: f.y - 10, k: 1, vx: 40 * (n ? 1 : -1), hp: 4, dm: 1, fl: 0, t: 0 });
    if (f.bi === 2 || f.bi === 4) f.rc = 1.6;     // TREETOPS + HEART: fire ranged bolts
    if (f.bi === 0 || f.bi === 4) f.spd = 1.65;   // MEADOW + HEART: faster chase + hop
  }
  if (f.hp <= 0) {
    if (f.dead) return;                                         // 2nd hit same frame — cash-out already ran
    f.dead = 1;                                                 // frame-end prune below; avoids splice-race index shift
    burst(f.x, f.y, 12, FOECOL[f.k]); gainXp(f.k * 3 + (crit ? 4 : 0), f.x, f.y - 16);
    spk += f.bit ? 5 : 1;                                       // kills drop sparkles — the shop economy's income
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
  dashT = .15; dashCd = .45 * ((pk & 1024) || cls === 3 ? .75 : 1); pl.sq = .6; sfx(600, 200, .12, 'sawtooth', .12); // NIMBLE / ROGUE class share the -25% cd
}

const hurt = (n, safe) => {
  if (pl.inv > 0 || deathT > 0) return;
  hp -= n; pl.inv = (pk & 32) ? 1.8 : 1.2; chT = 0; shk = Math.max(shk, .22);
  for (const f of foes) if (f.bit) f.hit = 1;                    // any hit disqualifies UNTOUCHABLE for the active boss(es)
  sfx(140, 55, .25, 'sawtooth', .2); burst(pl.x, pl.y + 7, 10, '#e05555'); // THICK MANE grace inside pl.inv
  if ((abil & 2) && !seenH) { seenH = 1; say('Hurt? Hold S. Channel the rainbow — but stand STILL to do it.'); }
  if (hp <= 0) { deathT = 1.6; say('The mini falls over. ...We do not stop rolling. Back to the fire.'); return; }
  if (safe) { pl.x = lastSafe[0]; pl.y = lastSafe[1]; pl.vx = pl.vy = 0; }
  else pl.vy = -180;
};

// ---------- update ----------
let last = performance.now(), time = 0;
const step = (dt) => {
  if (hs > 0) { hs -= dt; return; }               // HITSTOP — world freezes for the crit punch
  if (paused || dialog) return;                    // pause overlay or hearth dialog open: freeze sim; render still draws
  time += dt; dmT -= dt; jbuf -= dt; pl.inv -= dt; pl.t += dt; atkCd -= dt; swT -= dt; dashT -= dt; dashCd -= dt; dropT -= dt; shk -= dt;
  if (dmT <= 0 && dmQ.length) { dmTxt = dmQ.shift(); dmT = 3.2; }
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
  const healCost = (pk & 4096) ? 4 : 5;                              // OVERCHANNEL — heal costs 4
  const canHeal = (abil & 2) && mn >= healCost && hp < mHP() && pl.ground && !onPlat;
  if (canHeal && healHeld()) {
    chT += dt; pl.vx = 0;
    if (chT > 1.3 - .1 * he) { chT = 0; mn -= healCost; hp++; burst(pl.x + PW / 2, pl.y + 4, 14, '#9fe8a0'); sfx(520, 1040, .25, 'triangle', .12); fly(pl.x, pl.y - 12, '+♥', '#9fe8a0', 1); }
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
      else say('The rainbow shard is yours. The region reblooms — take a bonus level for your trouble.');
      pending++; choosing = 1; openMenu(); S_NAT();             // the RPG moment, guaranteed
      save();
    }
  }

  // -- stardust motes: exploration XP (worth a small pack of kills) --
  for (const m of motes) {
    if (m.got) continue;
    if (Math.hypot(pl.x + PW / 2 - m.x, pl.y + PH / 2 - m.y) < 13) { m.got = 1; sfx(660, 1100, .1, 'triangle', .1); burst(m.x, m.y, 8, '#8cf'); gainXp(8 * ((pk & 2048) ? 2 : 1), m.x, m.y - 10); } // STARSEEKER doubles mote XP
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
      seenM = 1; say(touch ? 'Tap ⚔ to horn-swipe. Melee earns you mana.' : 'Press J to horn-swipe. Melee earns you mana.'); save();
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

  // -- achievement watchers (all 13 Wavedash slots now live) --
  if (spk >= 30) earned[9] = 1;                                 // HOARDER
  if ((abil & 15) === 15) earned[10] = 1;                       // BELIEVER — every skill learned
  if (shopB === 31) earned[11] = 1;                             // ARCHITECT — the hearth fully built
  if (seenT) earned[7] = 1;                                     // SILVER_TONGUE — spoke with the DM at least once
  if (regionAt(pl.x + PW / 2, pl.y + 7) === regions[4]) earned[6] = 1; // SUMMIT
  if (regions.slice(1, 7).reduce((a, r) => a + r.t, 0) >= 2) earned[5] = 1; // GREEN_HOOVES — 2 zones rebloomed

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

  // SCREEN SHAKE — offset the world translate, not the HUD (which draws after the untranslate)
  const so = shk > 0 ? Math.random() * 6 - 3 : 0;
  ctx.translate((-cam.x + so) | 0, (-cam.y + so) | 0);
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

  // Hearth: campfire + DUNGEON MASTER wizard NPC (the shopkeeper — dialogue on approach)
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
    // -- proximity prompt above wizard head (only when close and dialog not yet open) --
    if (nearFire && !dialog) {
      const pf = 1 + Math.sin(time * 5) * .3;                     // pulses to draw the eye
      ctx.fillStyle = '#ffd75e'; ctx.textAlign = 'center';
      ctx.font = 'bold 6px monospace'; ctx.fillText('▲ TALK', wx, wy - 6 - pf);
    }
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
    ctx.fillStyle = f.fl > 0 ? '#fff' : f.wt > .12 ? '#ffb0b0' : FOECOL[f.k];
    if (f.bit) {                                                // GUARDIAN — hulking, crowned, region-tinted (see i-based crown row)
      ctx.fillRect(s * .6, fs - s + step, s * 1.2, s);          // leg L (steps)
      ctx.fillRect(fs - s * 1.8, fs - s - step, s * 1.2, s);    // leg R
      ctx.fillRect(0, s * 1.6 + wob * .3, fs, s * 2.6);          // body
      ctx.fillRect(s * .8, wob * .3, fs - s * 1.6, s * 1.8);     // head
      ctx.fillStyle = '#ffd75e';                                 // crown horns
      ctx.fillRect(s * .8, wob * .3 - s * .8, s * .5, s * 1);
      ctx.fillRect(fs / 2 - s * .25, wob * .3 - s * 1.1, s * .5, s * 1.3);
      ctx.fillRect(fs - s * 1.3, wob * .3 - s * .8, s * .5, s * 1);
      ctx.fillStyle = f.ph ? '#ff5d6c' : '#000';                 // eyes (turn red in phase 2)
      ctx.fillRect(s * 1.2, s * .7 + wob * .3, s * .55, s * .45);
      ctx.fillRect(fs - s * 1.75, s * .7 + wob * .3, s * .55, s * .45);
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
    ctx.fillStyle = f.c; ctx.fillText(f.txt, f.x | 0, f.y | 0);
  }
  ctx.globalAlpha = 1;
  ctx.translate((cam.x - so) | 0, (cam.y - so) | 0);            // undo world translate (incl. shake)

  // ---------- HUD (minimalist: hearts / mana / xp cluster top-left, pause icon top-right) ----------
  // Outline helper — dark stroke behind fill so text stays legible over any background
  const T2 = (t, x, y) => { ctx.strokeStyle = 'rgba(0,0,0,.85)'; ctx.lineWidth = 2; ctx.strokeText(t, x, y); ctx.fillText(t, x, y); };
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
    // DM voice — bottom-center speech plate (position clear of touch buttons)
    if (dmT > 0) {
      ctx.globalAlpha = Math.min(1, dmT); ctx.fillStyle = 'rgba(10,8,14,.82)';
      ctx.fillRect(VW / 2 - 190, VH - 108, 380, 24);
      ctx.textAlign = 'center'; ctx.fillStyle = '#e8d9b0'; ctx.font = 'italic 9px monospace';
      ctx.fillText('DM — ' + dmTxt, VW / 2, VH - 93); ctx.globalAlpha = 1;
    }
    if (deathT > 0) { ctx.fillStyle = `rgba(0,0,0,${1 - Math.abs(deathT - .8) / .8})`; ctx.fillRect(0, 0, VW, VH); }
  }

  // HEARTH DIALOG OVERLAY — view-space bubble, keyboard nav + touch row-tap. Universal JUMP=confirm, MELEE=back.
  if (dialog && started) {
    const rows = ['1 TALK', '2 REST', '3 SHOP'];
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(20,15,30,.95)'; ctx.fillRect(VW / 2 - 70, 44, 140, 60);
    ctx.strokeStyle = '#ffd75e'; ctx.lineWidth = 1; ctx.strokeRect(VW / 2 - 70, 44, 140, 60);
    ctx.fillStyle = '#ffe08a'; ctx.font = 'bold 9px monospace'; ctx.fillText('THE DM', VW / 2, 54);
    ctx.font = 'bold 8px monospace';
    for (let i = 0; i < 3; i++) {
      if (dialog === i + 1) { ctx.fillStyle = 'rgba(255,215,94,.18)'; ctx.fillRect(VW / 2 - 60, 58 + i * 14, 120, 12); }
      ctx.fillStyle = dialog === i + 1 ? '#ffd75e' : '#ddd';
      ctx.fillText(rows[i], VW / 2, 67 + i * 14);
    }
    ctx.fillStyle = '#888'; ctx.font = '6px monospace';
    ctx.fillText(touch ? 'tap row · ← back' : '↕ select · ▲ confirm · ⚔ back', VW / 2, 100);
  }

  // PAUSE OVERLAY — full character sheet (identity chrome moved out of gameplay HUD)
  if (paused && started) {
    ctx.fillStyle = 'rgba(8,6,12,.94)'; ctx.fillRect(0, 0, VW, VH);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd75e'; ctx.font = 'bold 16px monospace'; T2('CHARACTER', VW / 2, 42);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 12px monospace';
    T2(pName + (cls ? ' the ' + CLASS_TITLE[cls] : ''), VW / 2, 66);
    ctx.fillStyle = '#9fe89a'; ctx.font = 'bold 11px monospace';
    T2('LV' + lvl + '   🎲d' + DIE() + (MOD() ? '+' + MOD() : ''), VW / 2, 84);
    const nx = need(), atCap = lvl >= CAP;
    ctx.fillStyle = '#3a3a44'; ctx.fillRect(VW / 2 - 70, 94, 140, 6);
    ctx.fillStyle = atCap ? '#ffd75e' : '#9fe89a'; ctx.fillRect(VW / 2 - 70, 94, atCap ? 140 : 140 * xp / nx, 6);
    ctx.fillStyle = '#aaa'; ctx.font = '8px monospace';
    T2(atCap ? 'APOTHEOSIS — XP → 💎 1:1' : xp + ' / ' + nx + ' XP', VW / 2, 110);
    ctx.fillStyle = '#fff'; ctx.font = '10px monospace';
    T2('HORN ' + ho + '   HEART ' + he + '   SPARK ' + sp, VW / 2, 130);
    // Owned perks — one long line, wrap gracefully by joining with · dividers
    ctx.fillStyle = '#c9a6f7'; ctx.font = '9px monospace';
    const owned = PERKS.filter(p => pk & p.b).map(p => p.n);
    T2('PERKS · ' + (owned.length ? owned.join(' · ') : 'none yet'), VW / 2, 150);
    // Skills owned
    const skl = [(abil & 1) && 'DBL JUMP', (abil & 2) && 'HEAL', (abil & 4) && 'SHOT', (abil & 8) && 'DASH'].filter(Boolean).join(' · ') || 'none yet';
    ctx.fillStyle = '#8cf'; T2('SKILLS · ' + skl, VW / 2, 166);
    // Shards / regions rebloomed
    ctx.fillStyle = '#ffd75e';
    T2('SHARDS · ' + [1, 2, 4, 8, 16].filter(b => sh & b).length + ' / 5', VW / 2, 182);
    // HEARTH gems — the shop currency (moved out of gameplay HUD to eliminate dual-currency confusion)
    ctx.fillStyle = '#ffe28a'; T2('HEARTH · 💎' + spk + ' gems for the shop', VW / 2, 198);
    ctx.fillStyle = '#888'; ctx.font = '8px monospace';
    T2('press P / ESC / tap to close', VW / 2, VH - 24);
  }

  // action buttons — hidden during pause / level-up / shop (dedicated overlays own the input)
  // Colored ring per action, dark disc, glyph in accent color. Modern mobile pattern.
  if (started && !choosing && !paused && !shopping) {
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

  // level-up choice
  if (choosing) {
    ctx.fillStyle = 'rgba(8,6,12,.8)'; ctx.fillRect(0, 0, VW, VH);
    ctx.fillStyle = '#ffd75e'; ctx.font = 'bold 14px monospace';
    const isClassPick = menu[0] && menu[0].cl;
    ctx.fillText(isClassPick ? 'LEVEL 3 — WHO ARE YOU AT THE TABLE?' : 'LEVEL ' + (lvl + 1) + ' — choose your growth', VW / 2, 80);
    const pitch = 82, sx0 = VW / 2 - (menu.length * pitch - 6) / 2;
    menu.forEach((c, i) => {
      const bx = sx0 + i * pitch;
      ctx.fillStyle = (c.k || c.cl) ? 'rgba(255,215,94,.16)' : 'rgba(255,255,255,.08)';   // new skills + class picks glow
      ctx.fillRect(bx, 100, 76, 92);
      const tag = c.cl ? 'CLASS' : c.k ? 'NEW SKILL' : c.p ? 'PERK' : '';
      if (tag) { ctx.fillStyle = c.cl ? '#ffd75e' : c.k ? '#ffd75e' : '#c9a6f7'; ctx.font = '8px monospace'; ctx.fillText(tag, bx + 38, 111); }
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
    ctx.fillStyle = '#888'; ctx.fillText('1–5 buy · E or ESC to close', VW / 2, 240);
  }

  // title + name-entry screens (HUD is gated separately on `started`)
  if (phase < 2) {
    ctx.fillStyle = 'rgba(8,6,12,.85)'; ctx.fillRect(0, 0, VW, VH);
    // rainbow-shimmer title text
    const hue = (time * 30) % 360;
    ctx.fillStyle = `hsl(${hue} 70% 62%)`; ctx.font = 'bold 26px monospace';
    ctx.fillText('NAT 20 UNICORN', VW / 2, 62);
    ctx.fillStyle = '#ffd75e'; ctx.font = '9px monospace';
    ctx.fillText('the diorama has gone gray — paint it back', VW / 2, 80);
    if (phase === 0) {
      // menu — New Game / Continue
      const opts = hasSave() ? ['NEW GAME', 'CONTINUE'] : ['NEW GAME'];
      opts.forEach((o, i) => {
        const y = 120 + i * 22, on = mSel === i;
        ctx.fillStyle = on ? '#ffd75e' : '#aaa'; ctx.font = 'bold 12px monospace';
        ctx.fillText((on ? '▶ ' : '  ') + (i + 1) + '. ' + o, VW / 2, y);
      });
      if (hasSave()) { ctx.fillStyle = '#888'; ctx.font = '8px monospace'; ctx.fillText('saved: ' + pName + ' · LV' + lvl, VW / 2, 175); }
      ctx.fillStyle = '#666'; ctx.font = '8px monospace';
      ctx.fillText('↑↓ select · ENTER/SPACE accept · or press 1/2 · tap to advance', VW / 2, 210);
      ctx.fillText('A/D ←→ move · SPACE/Z jump · J/X swipe · L/C shot · S heal · SHIFT dash · E interact', VW / 2, 226);
    } else {                                                  // phase === 1: name entry
      ctx.fillStyle = '#fff'; ctx.font = 'bold 11px monospace';
      ctx.fillText('WHAT SHALL THE DM CALL YOU?', VW / 2, 118);
      // input field
      ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.fillRect(VW / 2 - 80, 130, 160, 26);
      ctx.strokeStyle = '#ffd75e'; ctx.lineWidth = 1; ctx.strokeRect(VW / 2 - 80, 130, 160, 26);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 16px monospace';
      const cur = Math.sin(time * 4) > 0 && ent.length < 8 ? '_' : ' ';
      ctx.fillText(ent + cur, VW / 2, 149);
      ctx.fillStyle = '#888'; ctx.font = '8px monospace';
      ctx.fillText('A–Z type · BACKSPACE delete · ENTER accept · tap for default (HORSE)', VW / 2, 178);
    }
  }
  ctx.restore();
};

// ---------- loop ----------
load();
cam.x = Math.max(0, Math.min(W * T - VW, pl.x - VW / 2));      // camera starts ON the player (was: panned in from world origin)
cam.y = Math.max(0, Math.min(H * T - VH, pl.y - VH / 2 + 30));
// opening line fires when the player picks a name / picks Continue (see title-menu accept)
const opener = () => say('Ah. The last painted mini wakes. Shall we finish the campaign, ' + pName + '?');
const loop = () => {
  const now = performance.now(), dt = Math.min(.033, (now - last) / 1000); last = now;
  step(dt); draw();
  requestAnimationFrame(loop);
};
loop();
