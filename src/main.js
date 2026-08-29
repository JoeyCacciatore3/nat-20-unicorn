// UNI-CORN, the last savior — 2D pixel-art platformer. Canvas 2D, no WebGL.
//
// Design pillars (see OneStone project "uni-corn" for full history + rationale):
//   - D&D-style stat allocation (STR/HP/MAG/DEF/LUCK), no classes
//   - 4-slot color customization + equipment gear (BODY/MANE/HORN/HOOVES)
//   - 3-branch skill tree (FURY/VIGOR/FINESSE), all player-chosen — no auto-learn
//   - Rainbow shards = collection goal (5 bosses)
//   - Unified character sheet: pause + level-up + creation share layout
//   - No overlay narrator — feedback via fly() and NPC dialog only
//   - Fixed world palette (no rebloom)
//
// Systems intentionally REMOVED (don't re-add without explicit ask):
//   classes · shop · region rebloom · overlay narrator · lore stones ·
//   scattered map currency (motes/sparks pickups) · STARSEEKER perk ·
//   L3 class fork · perks (folded into tree v18).
//
// Build: esbuild → terser → roadroller → inline → zip → ECT → 13,312-byte gate.
//   npm run build   (also runs map audit, logs to SIZELOG.md)
//   wavedash build push -m "message"
//
// Save: version-gated JSON to localStorage. Version bumps discard prior saves.

import { T, W, H, grid, tile, seeds, DECO } from './world.js';

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
const M_KEYS = ['KeyJ', 'KeyX', 'ShiftLeft', 'ShiftRight', 'KeyO'], SH_KEYS = ['KeyL', 'KeyC'], HE_KEYS = ['KeyS', 'KeyI'];  // M = dash (the attack verb)
const keys = new Set();
let jbuf = 0, started = 0, touch = 0;
// ---------- title / name-entry / class-select flow ----------
// phase 0 = title (tMode: menu/name/slots), 2 = playing (started=1). Phase 1 no longer exists.
let phase = 0, ent = '', pName = 'HORSE', mSel = 0;
let tMode = 0, sSel = 0, slot = 0, slotNew = 0, svT = 0; // title mode 0 menu · 1 name · 2 slots; active save slot; SAVED toast clock
// HIDDEN NAME INPUT — the standard mobile-canvas technique: focusing a real <input>
// inside the tap gesture summons the OS keyboard (iOS requires the gesture).
// It is the single source of truth for `ent` while focused; window keydown defers.
const NI = document.body.appendChild(Object.assign(document.createElement('input'), {
  type: 'text', maxLength: 8, autocapitalize: 'characters',
  oninput() { ent = NI.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 8); NI.value = ent; }
}));
NI.style.cssText = 'position:fixed;left:-99px;opacity:0';
// Stardust particles for the title screen — 22 dots falling at varied speeds, wrap
// at bottom, procedural (no assets). Ambient motion = "living world," the single
// cheapest first-impression polish (Celeste snow / Hollow Knight rain pattern).
const stars = Array.from({ length: 22 }, () => ({
  x: Math.random() * VW, y: Math.random() * VH,
  s: 1 + (Math.random() * 1.5 | 0), v: 4 + Math.random() * 14, a: .3 + Math.random() * .5,
}));
// 3 SAVE SLOTS (n20_s0..2). sMeta reads name+level for the slot list without loading.
const sMeta = (i) => { try { const d = JSON.parse(localStorage['n20_s' + i] || '0'); return d && d.v === 28 ? d.m + ' · LV' + d.l : 0; } catch { return 0; } };
const hasSave = () => !!(sMeta(0) || sMeta(1) || sMeta(2));
// Character create: UP/DOWN pick row (name/body/mane/horn), then row-specific input:
//   NAME row → A-Z type, BACKSPACE delete · ENTER begins.
// FLOW HELPERS — the ONLY code paths that change phase. Keyboard and touch both
// route here; one source of truth so the begin/resume/create transitions can't drift.
const beginGame = () => { NI.blur(); pName = ent || pName; phase = 2; started = 1; save(); };
const resumeGame = () => { load(); phase = 2; started = 1; };
const toName  = () => { fresh(); ent = ''; slotNew = 1; tMode = 1; };  // NEW GAME → type name (title art stays)
const toSlots = (nw) => { slotNew = nw; sSel = 0; tMode = 2; };        // then/or pick a slot
const pickSlot = (i) => {                                              // row 3 = BACK
  if (i === 3) { tMode = 0; return; }
  if (slotNew) { slot = i; tMode = 0; beginGame(); }                   // new game: any slot (occupied = overwrite)
  else if (sMeta(i)) { slot = i; tMode = 0; resumeGame(); }            // continue: occupied slots only
};
const titleKey = (e) => {
  if (tMode === 1) {                                                   // NAME ENTRY on the title screen
    if (e.code === 'Backspace')                        ent = ent.slice(0, -1);
    else if (ent.length < 8 && /^[a-z]$/i.test(e.key)) ent += e.key.toUpperCase();
    else if (e.code === 'Enter')                       toSlots(1);
    else if (e.code === 'Escape')                      tMode = 0;
    return;
  }
  if (tMode === 2) {                                                   // SLOT SELECT (3 slots + BACK)
    if (e.code === 'ArrowUp' || e.code === 'KeyW')        sSel = (sSel + 3) % 4;
    else if (e.code === 'ArrowDown' || e.code === 'KeyS') sSel = (sSel + 1) % 4;
    else if (e.code === 'Enter' || e.code === 'Space')    pickSlot(sSel);
    else if (e.code === 'Escape')                         tMode = 0;
    return;
  }
  const opts = hasSave() ? 2 : 1;                                      // NEW GAME · CONTINUE
  if (e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'ArrowDown' || e.code === 'KeyS') mSel = (mSel + 1) % opts;
  else if (e.code === 'Enter' || e.code === 'Space') { if (mSel === 0) toName(); else toSlots(0); }
};
addEventListener('keydown', (e) => {
  if (e.repeat) return;
  if (e.target === NI) {                                       // hidden input owns chars while focused;
    if (e.code === 'Enter' || e.code === 'Escape' || e.code === 'ArrowDown') NI.blur(); else return;
  }
  if (e.code === 'Space' || e.code.indexOf('Arrow') === 0) e.preventDefault();
  boot();                                                    // resume audio on any key (autoplay policy)
  if (phase === 0) return titleKey(e);
  // DIALOG owns input — arrow keys navigate, JUMP confirms, MELEE cancels
  if (dialog) {
    if (e.code === 'ArrowUp')        dialog = dialog === 1 ? 2 : 1;
    else if (e.code === 'ArrowDown') dialog = dialog === 2 ? 1 : 2;
    else if (J_KEYS.includes(e.code) || e.code === 'Enter') dialogDo();
    else if (M_KEYS.includes(e.code) || e.code === 'Escape') dialog = 0;
    return;
  }
  // Near NPC: JUMP becomes universal INTERACT (open dialog) — no dedicated interact key
  if (J_KEYS.includes(e.code) && nearFire) { dialog = 1; navT = .4; return; }
  if (J_KEYS.includes(e.code) && nearChest >= 0) { openChest(nearChest); return; }
  keys.add(e.code);
  if (J_KEYS.includes(e.code)) jbuf = .12;
  if (M_KEYS.includes(e.code)) dash();                          // J/X = dash (the attack verb) — old swipe muscle memory preserved
  if (SH_KEYS.includes(e.code)) shoot();
  if (choosing) {
    const n = picks().length;
    if (e.code === 'ArrowUp' || e.code === 'KeyW') aRow = (aRow + n - 1) % n;
    else if (e.code === 'ArrowDown' || e.code === 'KeyS') aRow = (aRow + 1) % n;
    else if (e.code === 'ArrowRight' || e.code === 'KeyD' || e.code === 'Enter' || e.code === 'Space') allocate();
  }
  else if ((e.code === 'KeyP' || e.code === 'Escape') && deathT <= 0) paused = paused ? 0 : 1;   // no pause during death anim — softlock guard
});
addEventListener('keyup', (e) => keys.delete(e.code));
const held = (...c) => c.some(k => keys.has(k));
const jumpHeld = () => J_KEYS.some(k => keys.has(k)) || keys.has('TBtnJ'); // button jump gets full hold-height too
const healHeld = () => HE_KEYS.some(k => keys.has(k)) || keys.has('TBtnH');

// ---------- touch overlay (minimal: dpad + JUMP + MELEE + earned skills; JUMP + MELEE contextualize) ----------
// No dedicated hearth buttons — JUMP is the universal interact/confirm, MELEE is back/cancel.
const btns = () => {
  // JUMP contextualizes: dialog open = ↵ confirm · nearFire (closed) = ☰ open dialog · else = ▲ jump
  const jl = dialog ? '↵' : nearFire ? '☰' : nearChest >= 0 ? '▣' : '▲';
  const jc = dialog || nearFire || nearChest >= 0 ? '#ffd75e' : '#8cf';
  // ATTACK button contextualizes: dialog open = ← back · else = » dash
  const ml = dialog ? '←' : '»';
  // Unified button system: primary JUMP r=24, ALL secondary r=20 (was 18/20/22/26 mix).
  // Fan-arc around bottom-right corner = landscape thumb-reach pattern (Brawl Stars /
  // Dead Cells mobile). Movement lives on the left joystick — dpad buttons removed.
  const b = [
    { x: VW - 36, y: VH - 34, r: 24, l: jl, h: 'SPACE', c: 'TBtnJ', col: jc },
    { x: VW - 92, y: VH - 30, r: 20, l: ml, h: 'J',     c: 'TBtnM', col: '#ffd75e' },
  ];
  if (su[0]) b.push({ x: VW - 78,  y: VH - 78, r: 20, l: '✦', h: 'L',     c: 'TBtnS', col: '#c9a6f7' });
  if (su[4]) b.push({ x: VW - 36,  y: VH - 88, r: 20, l: '＋', h: 'S',    c: 'TBtnH', col: '#9fe89a' });
  // (dedicated dash fan button removed — the always-on attack button IS dash now)
  return b;
};
const ptrs = new Map();
const toV = (e) => [(e.clientX * DPR - SOX) / SS, (e.clientY * DPR - SOY) / SS];
// ---------- floating joystick (movement, touch only) ----------
// Persistent base at a home position (operator preference: always visible), but any
// touch in the LEFT 40% re-anchors it under the thumb (Dead Cells floating pattern,
// ~80% player preference per Playdigious postmortem). Snaps home on release.
// Y-axis push-down = crouch/drop — replaces the old ◀ ▼ ▶ button trio.
const JHX = 52, JHY = VH - 52, JR = 26, KR = 11, JMX = JR - 8;   // home, base r, knob r, max knob throw
const joy = { x: JHX, y: JHY, dx: 0, dy: 0, id: -1 };
let dHP = 0;                                                     // HUD damage-chip ghost value
const joySet = () => {                                           // knob offset → digital movement keys
  keys.delete('TBtnL'); keys.delete('TBtnR'); keys.delete('TBtnDn'); keys.delete('TBtnUp');
  if (joy.dx < -6) keys.add('TBtnL'); else if (joy.dx > 6) keys.add('TBtnR');
  if (joy.dy > 12) keys.add('TBtnDn'); else if (joy.dy < -12) keys.add('TBtnUp');   // up = menu nav (not jump)
};
const joyEnd = () => { joy.id = -1; joy.x = JHX; joy.y = JHY; joy.dx = joy.dy = 0; joySet(); };
const grabJoy = (vx, vy, id) => {                                // shared: gameplay + menu-nav grabs
  joy.id = id;
  joy.x = Math.min(Math.max(vx, JR + 6), VW * .4 - 12);
  joy.y = Math.min(Math.max(vy, 44), VH - JR - 6);
  joy.dx = joy.dy = 0; joySet();
};
addEventListener('pointerdown', (e) => {
  boot();
  if (e.pointerType === 'touch') touch = 1;
  const [vx, vy] = toV(e);
  // TITLE — every mode fully clickable (row hitboxes MUST match the render y's)
  if (phase === 0) {
    if (tMode === 1) {                                             // name entry
      if (vx >= VW / 2 - 60 && vx <= VW / 2 + 60 && vy >= 236 && vy <= 256) { toSlots(1); return; }  // ▶ BEGIN
      if (vy > 198 && vy < 230) { NI.value = ent; NI.focus(); return; }  // tap the name = OS keyboard (in-gesture)
      tMode = 0; return;                                           // tap elsewhere = back
    }
    if (tMode === 2) {                                             // slot select: rows at y=206+i*16
      const row = ((vy - 195) / 16) | 0;
      if (row >= 0 && row <= 3 && vx > VW / 2 - 100 && vx < VW / 2 + 100) pickSlot(row); else tMode = 0;
      return;
    }
    const row = ((vy - 197) / 16) | 0;                             // menu rows at y=208+i*16
    if (row === 0) toName(); else if (row === 1 && hasSave()) toSlots(0);
    return;
  }
  // PAUSE overlay — tap a skill-tree cell to rank up; any other tap closes
  if (paused) {
    for (let i = 0; i < TREE.length; i++) {
      const req = TREE[i][1], [cx, cy] = TPOS[i];   // SAME TPOS as the render — cannot drift
      if (vx >= cx - 2 && vx <= cx + 74 && vy >= cy - 9 && vy <= cy + 3) {
        const locked = req >= 0 && !su[req];
        if (spts > 0 && !su[i] && !locked) { su[i] = 1; spts--; sfx(660, 990, .15, 'triangle', .12); save(); }
        return;
      }
    }
    // SAVE / SAVE & EXIT buttons (y 236-252) — save only writes the slot, no heal, no side effects
    if (vy >= 236 && vy <= 252) {
      if (vx >= 24 && vx <= 88)  { save(); svT = time + 1.2; sfx(660, 990, .15, 'triangle', .12); return; }
      if (vx >= 96 && vx <= 168) { save(); paused = 0; started = 0; phase = 0; tMode = 0; mSel = 0; return; }
    }
    paused = 0; return;
  }
  if (started && !choosing && !dialog && vx > VW - 40 && vy < 40) { paused = 1; return; }
  // DIALOG overlay taps: JUMP btn = confirm · MELEE btn = back · bubble row = pick · else close
  if (dialog) {
    if (touch && e.pointerType === 'touch' && vx < VW * .3) { grabJoy(vx, vy, e.pointerId); return; }   // stick navigates
    const bts = btns();
    const jb = bts.find(b => b.c === 'TBtnJ'), mb = bts.find(b => b.c === 'TBtnM');
    if (jb && Math.hypot(vx - jb.x, vy - jb.y) < jb.r + 6) { dialogDo(); return; }
    if (mb && Math.hypot(vx - mb.x, vy - mb.y) < mb.r + 6) { dialog = 0; return; }
    if (vx >= VW / 2 - 70 && vx <= VW / 2 + 70 && vy >= 56 && vy <= 86) {
      const row = ((vy - 58) / 14) | 0;
      if (row >= 0 && row <= 1) { const nr = row + 1; if (dialog === nr) dialogDo(); else dialog = nr; return; }   // tap selects · tap again confirms
    }
    dialog = 0; return;
  }
  if (choosing) {
    if (touch && e.pointerType === 'touch' && vx < VW * .3) { grabJoy(vx, vy, e.pointerId); return; }   // stick navigates
    // Stat COLUMNS along the gold box bottom (x = 22 + i*26, y 162-185). FIRST tap
    // selects (cursor moves); tap the SELECTED column again to spend — no accidental one-tap.
    const col = ((vx - 19) / 26) | 0;
    if (vy > 160 && vy < 190 && vx > 19 && vx < 149 && col >= 0 && col < picks().length) { if (aRow === col) allocate(); else aRow = col; }
    return;
  }
  // JOYSTICK: any touch in the left 40% grabs the stick and re-anchors it there
  if (touch && started && e.pointerType === 'touch' && vx < VW * .4) { grabJoy(vx, vy, e.pointerId); return; }
  for (const b of btns()) if (Math.hypot(vx - b.x, vy - b.y) < b.r + 6) {
    // JUMP button contextualizes: near NPC it's INTERACT, not jump
    if (b.c === 'TBtnJ' && nearFire) { dialog = 1; navT = .4; return; }
    if (b.c === 'TBtnJ' && nearChest >= 0) { openChest(nearChest); return; }
    ptrs.set(e.pointerId, b.c); keys.add(b.c);
    if (b.c === 'TBtnJ') jbuf = .12;
    if (b.c === 'TBtnM') dash();
    if (b.c === 'TBtnS') shoot();
    if (b.c === 'TBtnD') dash();
  }
});
addEventListener('pointermove', (e) => {
  if (e.pointerId !== joy.id) return;
  const [vx, vy] = toV(e);
  const dx = vx - joy.x, dy = vy - joy.y, m = Math.hypot(dx, dy);
  const s = m > JMX ? JMX / m : 1;
  joy.dx = dx * s; joy.dy = dy * s; joySet();
});
const ptrUp = (e) => { if (e.pointerId === joy.id) joyEnd(); const c = ptrs.get(e.pointerId); if (c) { keys.delete(c); ptrs.delete(e.pointerId); } };
addEventListener('pointerup', ptrUp); addEventListener('pointercancel', ptrUp);
addEventListener('blur', () => { keys.clear(); ptrs.clear(); if (joy.id !== -1) joyEnd(); });   // focus loss = release everything (stuck-key guard)
addEventListener('contextmenu', (e) => e.preventDefault());                                     // long-press menu suppression (mobile)

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
// S_SHARD inlined at its single call site (boss death)
const S_NAT = () => { for (let i = 0; i < 4; i++) sfx(440 * (1 + i * .25), 440 * (1 + i * .25), .1, 'square', .12, i * .07); };

// Narrator overlay removed — feedback comes via fly() text over the player/NPC.

// ---------- RPG (researched): milestone dice, modifier stats, skill tree ----------
// 5-stat system: STR (dmg) HP (max ♥) MAG (max ✦) DEF (dmg reduction) LUCK (drop bonus)
let ho = 1, he = 1, sp = 1, df = 1, lk = 1;       // every stat starts at 1 — no dead stats at creation
// Unicorn customization — palette indices picked at character creation. Four body types:
// bod (skin/body), man (mane sweep), hrn (horn tip), hof (hooves/legs).
let bod = 0, man = 0, hrn = 0, hof = 0;
// EQUIPMENT — 4 equipped slots + inventory bag. Items = {s:slot, c:color, b:bonus}.
// Slot 0=BODY(+HP), 1=MANE(+MAG), 2=HORN(+STR), 3=HOOVES(+DEF). Bonus 0=cosmetic.
const eq = [null, null, null, null];               // equipped items (4 slots)
const inv = [];                                    // inventory bag (max invMax)
let invMax = 5;                                    // → 10 when all 6 chests are opened (SADDLEBAGS, see openChest)
const SLOT_STAT = [1, 2, 0, 3];                    // slot→stat index: HP, MAG, STR, DEF
const SLOT_LBL = ['BODY', 'MANE', 'HORN', 'HOOVES'];
// Starting palette — the 5 neutral colors available at creation (indices into PAL)
// (STARTER palette removed 2026-08-29 — creation is name-only; colors come from gear)
// Equip: apply color + stat bonus. Unequip old item back to inventory if it has a bonus.
const equip = (item) => {
  const old = eq[item.s];
  if (old && old.b > 0 && inv.length < invMax) inv.push(old);  // stash old if it had stats
  eq[item.s] = item;
  [bod, man, hrn, hof][item.s] = item.c;          // update unicorn color
  recalcEq();
};
// Recalc equipment stat bonuses (additive on top of base stats)
let eqB = [0, 0, 0, 0];                           // cached bonus per slot
const recalcEq = () => { eqB = eq.map(e => e ? e.b : 0); };
// Gear tier trim colour — shared by the unicorn's worn accents AND the ground drop
// borders, so "which level" reads the same everywhere. Index by bonus: 1/2/3.
const TC = [, '#d8d8e0', '#ffe08a', '#8cf'];       // 1 silver · 2 gold · 3 prismatic
// UNIFIED PALETTE — 18 colors, same for all 4 body parts.
// Mane gradient auto-derived: base → 85% → 70% brightness (no stored triples).
const PAL = [
  '#f5f1f4','#f7d9c0','#ffd75e','#ff9d3c','#ff5d6c','#f9c',
  '#e08ae0','#c47fe0','#6bc5ff','#3ac4ff','#40e8b0','#5ac878',
  '#c8f0d3','#d8d8e0','#fff','#2a1f14','#4a3828','#ff5d6c'
];
// (PN color-name strings removed 2026-08-29 — creation now shows colors ON the
// corner part-slots, pause-sheet style; ~18 shipped string literals reclaimed.)
const PC = PAL.length;
// Derive mane sweep: darken base color in 3 steps for the flowing gradient
const dim = (h, f) => '#' + h.slice(1).match(/../g).map(c => (Math.max(0, parseInt(c, 16) * f | 0)).toString(16).padStart(2, '0')).join('');
const mane3 = i => [PAL[i], dim(PAL[i], .85), dim(PAL[i], .7)];
// Outline text helper (module-scope so pause overlay AND creation portrait can both use it)
const T2 = (t, x, y) => { ctx.strokeStyle = 'rgba(0,0,0,.85)'; ctx.lineWidth = 2; ctx.strokeText(t, x, y); ctx.fillText(t, x, y); };
// Shared portrait panel — renders the identity card (title bar, bordered box with
// HP bar at top, live unicorn silhouette) used by both the PAUSE overlay and the
// CHARACTER-CREATE screen. Title = player name on PAUSE, 'NEW CHARACTER' on create.
const portraitPanel = (title) => {
  ctx.fillStyle = 'rgba(8,6,12,.96)'; ctx.fillRect(0, 0, VW, VH);
  ctx.textAlign = 'center';
  // NAME — right above the gold box (the whole left side is the unicorn's domain)
  ctx.fillStyle = '#ffd75e'; ctx.font = 'bold 13px monospace'; T2(title, 84, 28);
  // Gold box (enlarged) — holds HP+LVL, XP gauge, the unicorn, gear corners, stats
  ctx.strokeStyle = '#ffd75e'; ctx.lineWidth = 1;
  ctx.fillStyle = 'rgba(255,255,255,.05)'; ctx.fillRect(14, 34, 140, 154); ctx.strokeRect(14, 34, 140, 154);
  // Identity block (2026-08-29 layout): LVL stacked at the LEFT · HP bar · MP bar
  // beneath it · XP strip under both. All inside the gold box, all aligned x48-146.
  ctx.font = 'bold 8px monospace';
  ctx.fillStyle = '#ffd75e'; T2('LVL', 33, 48); T2(lvl, 33, 60);
  ctx.fillStyle = '#2a2a33'; ctx.fillRect(48, 42, 98, 9);
  ctx.fillStyle = '#ff5d6c'; ctx.fillRect(48, 42, 98 * hp / mHP(), 9);
  ctx.strokeStyle = '#1a1a22'; ctx.strokeRect(47.5, 41.5, 99, 10);
  ctx.fillStyle = '#fff'; T2(hp + '/' + mHP(), 97, 50);
  ctx.fillStyle = '#2a2a33'; ctx.fillRect(48, 54, 98, 9);
  ctx.fillStyle = '#e08ae0'; ctx.fillRect(48, 54, 98 * mn / mMN(), 9);
  ctx.strokeStyle = '#1a1a22'; ctx.strokeRect(47.5, 53.5, 99, 10);
  ctx.fillStyle = '#fff'; T2(mn + '/' + mMN(), 97, 62);
  // XP gauge — under both bars, above the unicorn
  const atCap = lvl >= CAP;
  ctx.fillStyle = '#3a3a44'; ctx.fillRect(48, 67, 98, 3);
  ctx.fillStyle = atCap ? '#ffd75e' : '#9fe89a'; ctx.fillRect(48, 67, atCap ? 98 : 98 * xp / need(), 3);
  // Unicorn — 2.6× scale, gentle bob, centered in the middle band
  ctx.save(); ctx.translate(84, 108); ctx.scale(2.6, 2.6); ctx.translate(-6, -8);
  drawU(Math.sin(time * 1.4) * .8);
  ctx.restore();
};
// draw the player unicorn geometry — used by in-game player render + pause portrait.
// scale sets pixel scale. All colors come from current bod/man/hrn palette picks.
const drawU = (bob) => {
  const bc = PAL[bod], mc = mane3(man), hc = PAL[hrn], fc = PAL[hof];
  ctx.fillStyle = fc;                                                                               // hooves (whole leg)
  ctx.fillRect(1, 12 + bob * .3, 2, 4 - bob * .3); ctx.fillRect(7, 12 - bob * .3, 2, 4 + bob * .3);
  ctx.fillStyle = bc; ctx.fillRect(0, 5, 10, 7); ctx.fillRect(7, 0, 5, 6);                          // body + head
  ctx.fillStyle = hc; ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(14, -5); ctx.lineTo(12, 1); ctx.fill(); // horn
  mc.forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(5 - i * 2, 1 + i * 2, 2, 4); });           // mane 3-color
  ctx.fillStyle = '#333'; ctx.fillRect(10, 2, 1.5, 1.5);                                            // eye
  // EQUIPMENT — a geared part wears a tier trim (colour = which gear, trim = level).
  const et = s => eq[s] && eq[s].b ? TC[eq[s].b] : 0, a3 = et(3), a0 = et(0), a2 = et(2), a1 = et(1);
  if (a3) { ctx.fillStyle = a3; ctx.fillRect(1, 15, 2, 1); ctx.fillRect(7, 15, 2, 1); }              // hoof cuffs
  if (a0) { ctx.fillStyle = a0; ctx.fillRect(0, 5, 10, 1); }                                         // barding stripe
  if (a2) { ctx.fillStyle = a2; ctx.fillRect(9, 0, 2, 1); }                                          // horn ring
  if (a1) { ctx.fillStyle = a1; ctx.fillRect(5, 1, 2, 1); }                                          // mane spark
};
let hp = 10, xp = 0, lvl = 1;
// (abil bitfield removed 2026-08-29 — it was a pure mirror of su[]; reads go straight to the tree)
let mn = 5, choosing = 0, pending = 0;
const CAP = 15;                                   // hard level cap. L15 grants APOTHEOSIS (+2 dmg, +2 max HP); post-cap XP ignored
// Skills are ALL player-chosen via the 3-branch tree — no auto-learn milestones
let hs = 0, shk = 0;                              // combat feel: hitstop freeze + screen shake, both in seconds
// Boss state: 0=unvisited, 1=on screen, 2=killed(shard taken), {hp,ph,spd,rc}=leash stash
const bs = [0, 0, 0, 0, 0];
const shards = () => bs.filter(v => v === 2).length;
const mHP = () => 8 + (he + eqB[0]) * 2 + (su[7] + su[8]) * 3 + (lvl >= CAP ? 2 : 0); // body eq boosts HP
const mMN = () => 3 + (sp + eqB[1]) * 2 + (su[9] + su[10]) * 2;            // mane eq boosts MAG · MAX MP nodes
const DIE = () => [4,4,6,6,6,8,8,8,10,10,10,12,12,12,12][lvl - 1] || 4; // die = LEVEL MILESTONE (Zelda-heart law)
const MOD = () => ho + eqB[2] - 1 + (lvl >= CAP ? 2 : 0); // horn eq boosts STR
const roll = () => 1 + (Math.random() * DIE() | 0);   // one honest die (dice-trick skills removed 2026-08-29)
const isCrit = (r) => r >= DIE();                             // crit = max face of the die, always
const earned = Array(13).fill(0);
const need = () => 8 + lvl * 6;
const gainXp = (n, x, y) => {
  if (lvl >= CAP) return;
  xp += n; fly(x, y, '+' + n + ' XP', '#9fe89a');
  while (xp >= need() && lvl < CAP) {
    xp -= need(); lvl++; pending += 3; spts++;    // EVERY LEVEL: +3 stat pts, +1 skill pt
    fly(pl.x, pl.y - 34, '+1 SKILL', '#8cf');
    if (lvl === CAP) { fly(pl.x, pl.y - 28, 'APOTHEOSIS', '#ffd75e', 1); hp = mHP(); }
  }
  if (lvl >= CAP) xp = 0;
  if (pending && !choosing) { choosing = 1; aRow = 0; navT = .4; S_NAT(); }   // navT swallows held stick input on open
};
const STATS = [
  ['STR', '+1 damage', '#ffd75e', () => ho++],
  ['HP', '+2 max HP', '#ff5d6c', () => { he++; hp += 2; }],
  ['MAG', '+2 max mana', '#e08ae0', () => { sp++; mn += 2; }],
  ['DEF', '-1 damage taken', '#8cf', () => df++],
  ['LUCK', 'better loot rolls', '#9fe89a', () => lk++],
];

// UNIFIED SKILL TREE — 3 branches, 19 nodes, 24 ranks. Perks folded in.
// [name, branch(0/1/2), prereq idx(-1=none), max rank]
// OPEN TREE (2026-08-29, save v22): every node is ONE rank with a name that states
// its exact effect — no tooltips needed, nothing misinterpretable. Old multi-rank
// skills are now CHAINS of separate skills (classic RPG). [name, branch, reqIndex].
// 27 nodes = the old 27 total ranks — point economy unchanged.
// ONE OPEN TREE (2026-08-29): no branches, no branch names — a single constellation
// laid out in TIER ROWS (tier = chain distance from a root; roots on top, rows of 4,
// Elder-Scrolls style). Rows: [name, reqIndex]. su indices UNCHANGED from v22.
const TREE = [
  // 2026-08-29 prune (save v28): 17 skills. CRIT 19-20 removed — crit is simply
  // the MAX FACE of your die, always; no dice jargon anywhere the player reads.
  ['SHOT',      -1],['FAR SHOT',   0],['SNIPER',     1],['SHOT THRU',  0],  // 0-3  bolt (3MP) · range chain · fly-through
  ['HEAL',      -1],['HEAL +2',    4],['HEAL +4',    5],                     // 4-6  heal (5MP) · amount chain
  ['MAX HP +3', -1],['MAX HP +6',  7],['MAX MP +2', -1],['MAX MP +4',  9],  // 7-10 HP chain · MP chain
  ['GUARD TIME',-1],                                                         // 11   longer post-hit safety
  ['DBL JUMP',  -1],['TRI JUMP',  12],['LONG DASH', -1],                     // 12-14 jump chain · dash extension
  ['SPEED +12%',-1],['SPEED +24%',15],                                       // 15-16 run speed chain
];
// Tier depth per node (prereqs always come earlier in TREE), then grid positions:
// each tier starts a fresh row, 4 nodes per row. Shared by render AND tap hitboxes.
const TD = []; TREE.forEach((n, i) => TD[i] = n[1] < 0 ? 0 : TD[n[1]] + 1);
// Children sort by their parent's column → they land under their parents, lines stay short.
const TPOS = []; { let r = 0; for (let t = 0; t <= Math.max(...TD); t++) {
  const tier = []; TREE.forEach((n, i) => TD[i] === t && tier.push(i));
  tier.sort((a, b) => (TREE[a][1] < 0 ? a * 20 : TPOS[TREE[a][1]][0]) - (TREE[b][1] < 0 ? b * 20 : TPOS[TREE[b][1]][0]));
  let c = 0; tier.forEach(i => { if (c === 4) { c = 0; r++; } TPOS[i] = [170 + c * 78, 54 + r * 16]; c++; }); r++;
} }
// (branch names/colors removed 2026-08-29 — one tree, one visual language)
let spts = 0; const su = Array(TREE.length).fill(0);
// (abilSync removed with the abil mirror)
let aRow = 0;
const picks = () => STATS.map((s, i) => ({ i, n: s[0], col: s[2] }));
const allocate = () => {
  const c = picks()[aRow]; if (!c || !pending) return;
  STATS[c.i][3](); pending--;
  fly(pl.x, pl.y - 14, c.n + '!', '#ffd75e', 1); sfx(660, 990, .15, 'triangle', .12);
  if (!pending) { choosing = 0; save(); }
};

// ---------- save (single-char keys — terser mangle-props law) ----------
const save = () => {
  localStorage['n20_s' + slot] = JSON.stringify({
    v: 29, e: earned, h: hp, x: xp, l: lvl, n: mn, g: bs.map(v => v === 2 ? 2 : 0),
    t: [ho, he, sp, df, lk], c: [cp[0], cp[1]], d: pending, k: spts, y: su,
    m: pName, o: oc,
    u: [bod, man, hrn, hof],
    q: eq, i: inv, im: invMax,
  });
};
const load = () => {
  try {
    const d = JSON.parse(localStorage['n20_s' + slot] || '0');
    if (!d || d.v !== 29) return;                               // v29 — no abil mirror.
    d.e.forEach((v, i) => earned[i] = v);
    hp = d.h; xp = d.x; lvl = d.l; mn = d.n;
    d.g.forEach((v, i) => bs[i] = v); pName = d.m; oc = d.o;

    [ho, he, sp, df, lk] = d.t;
    [bod, man, hrn, hof] = d.u;
    cp = d.c; pl.x = cp[0]; pl.y = cp[1];
    pending = d.d; if (pending) { choosing = 1; aRow = 0; }        // unspent stat points survive reload
    spts = d.k; d.y.forEach((v, i) => su[i] = v);
    d.q.forEach((v, i) => eq[i] = v);
    inv.length = 0; d.i.forEach(v => inv.push(v));
    invMax = d.im; recalcEq();
  } catch (e) { /* fresh oath */ }
};

// ---------- player ----------
const PW = 10, PH = 14;
const SX = 126 * T, SY = 57 * T;                  // spawn point (paddock)
const pl = { x: SX, y: SY, vx: 0, vy: 0, ground: 0, face: 1, coyote: 0, air: 0, sq: 1, inv: 0, t: 0 };
let cp = [SX, SY], lastSafe = [SX, SY], deathT = 0;
let chT = 0, nearFire = 0;
let paused = 0;                                   // pause overlay open — freezes sim, character sheet renders
// hearth dialog: 0 = closed, 1 = TALK, 2 = REST.
// JUMP button is the universal interact/confirm; MELEE button is back. No separate dialogue buttons.
// Hearth dialog: 2 options — 1 TALK · 2 REST
let dialog = 0;
const dialogDo = () => {
  if (dialog === 1) {                             // TALK — first talk grants +10 XP boon
    if (!earned[7]) { earned[7] = 1; gainXp(10, pl.x, pl.y - 14); fly(pl.x, pl.y - 16, '+10 XP · WELCOME', '#9fe89a', 1); save(); }
    else fly(pl.x, pl.y - 16, 'the sage nods', '#c9a6f7', 1);
  } else {                                        // REST + save
    const [fx, fy] = seeds.fires[0];
    if (hp === mHP()) earned[8] = 1;              // WELL_RESTED — rest without needing it
    hp = mHP(); cp = [fx * T - 20, (fy - 1) * T]; earned[0] = 1; save();
    burst(fx * T, fy * T - 8, 12, '#ffd75e'); sfx(500, 900, .3, 'triangle', .1);
    fly(pl.x, pl.y - 16, 'SAVED', '#9fe89a', 1);
  }
  dialog = 0;
};
// Chest reward: item shower + full heal. LUCK adds drops.
const openChest = (i) => {
  if (oc & (1 << i)) return;
  oc |= 1 << i;
  const c = chests[i]; hp = mHP();
  spawnDrop(c.x, c.y, 5);
  burst(c.x, c.y - 4, 18, '#ffd75e'); sfx(660, 990, .18, 'triangle', .12);
  fly(c.x + 6, c.y - 4, '+HEAL', '#9fe89a');
  // ALL 6 CHESTS → SADDLEBAGS: bag 5→10. Makes the long-promised invMax upgrade
  // real (it was saved/loaded but never granted) and gives chest-hunting a meta-reward.
  if (oc === 63) { invMax = 10; fly(c.x + 6, c.y - 14, 'SADDLEBAGS · BAG 10', '#ffd75e', 1); }
  save();
};
let dashT = 0, dashCd = 0, adash = 0, dropT = 0, navT = 0;   // navT = menu-nav repeat clock (joystick)
// FIXED physics — never stat-scaled: the map gate proofs depend on these numbers
const G_RISE = 750, G_FALL = 1500, FALLCAP = 400;
const RUN = () => 115 * (1 + (su[15] + su[16]) * .12), V0 = () => 250;  // SPEED nodes boost run speed

const solid = (x, y) => { const v = tile(x / T | 0, y / T | 0); return v === 1 || v === 4; }; // gloom crystal is solid until shot
const spike = (x, y) => tile(x / T | 0, y / T | 0) === 3;

// ---------- entities ----------
// Chests: exploration rewards. `oc` bitfield tracks opened state (persisted v9).
const chests = seeds.chests.map(([x, y], i) => ({ x: x * T, y: y * T, i }));
let oc = 0, nearChest = -1;                       // opened bitfield · which chest index the player is standing on (-1 = none)
// FULL progression reset — NEW GAME must NOT inherit a boot-loaded save's state
// (boot load() fills globals; without this, "new" characters kept old lvl/stats/bosses)
const fresh = () => {
  hp = 10; xp = 0; lvl = 1; mn = 5; bs.fill(0);
  eq.fill(null); inv.length = 0; invMax = 5; eqB = [0, 0, 0, 0];
  pending = 0; choosing = 0; ho = he = sp = df = lk = 1; bod = man = hrn = hof = 0;
  oc = 0; pName = 'HORSE'; earned.fill(0);
  spts = 0; su.fill(0);
  cp = [SX, SY]; lastSafe = [SX, SY]; pl.x = SX; pl.y = SY; pl.vx = pl.vy = 0;
};
const FOECOL = ['', '#c9a6f7', '#6bc5ff', '#e05555', '#e08ae0', '#9fe89a', '#8cf'];
// SPAWN LAW — every non-boss foe carries: dm (contact damage), el (elite roll),
// rc (ranged clock if tier 3 = Gloomcast). Boss adds ph / spd / rc at 50%-HP
// phase 2, plus wt (wind-up-tell clock) filled on first contact.
// FOE TYPE TABLE — row index = kind k: [hp, dm, speed, size, cap, shape].
// cap = capability bits, SAME vocabulary as P2 (see there) — compose freely.
// shape picks the sprite body: 1 crawler · 2 jelly · 3 caster — COLOR sells the
// variant (players learn color = behavior), sprites are reused for free.
// New enemy type = ONE row + a FOECOL color + seeds.foes entries with that k.
// Elites (17%, non-ranged kinds only): 2x hp, +1 dm, +1 size. XP capped at k=3 rate.
// k1 DOUBTLING purple crawler · k2 GLOOMER blue jelly · k3 GLOOMCAST red caster (ranged)
// k4 SPRINTLING pink fast crawler · k5 HOPLING green jumping crawler · k6 GALEJELLY cyan ranged jelly
const FT = [, [4, 3, 44, 2, 0, 1], [8, 4, 31, 3, 0, 2], [12, 5, 26.7, 4, 1, 3], [5, 3, 70, 2, 0, 1], [6, 4, 36, 3, 2, 1], [9, 4, 22, 3, 1, 2]];
// BOSS PHASE-2 TABLE — capability bits per boss index: 1 speed · 2 summon ·
// 4 ranged · 8 landing shockwave. New boss = seeds.bosses row + bits here.
// UNIFIED CAPABILITY VOCABULARY — one bitfield (f.cap) drives EVERY attack verb
// for foes and bosses alike; the code is shared, the data decides who uses what.
// Turn a verb off for a lower kind by omitting its bit from the FT row.
//   1 ranged bolts · 2 hop · 4 summon minions (event: fires when gained)
//   8 landing shockwave · 16 chase the player · 32 swift (spd 1.65)
// P2 = capabilities GRANTED at boss phase 2 (OR'd into f.cap), by boss index.
const P2 = [32, 4, 1, 8, 37];
// Boss names by index — all dark mirrors of the player; ' MARE' composed once at
// display (one shared literal). Banner state: bann = time deadline, set on arena entry.
const BN = ['DUSK', 'HOLLOW', 'GALE', 'FROST', 'GLOOM'];
let bann = 0, bTxt = '', bSub = '';
const mkFoe = (x, y, k) => {
  const [fh, fd, fv, fz, fb] = FT[k], fr = fb & 1, el = !fr && Math.random() < .17;
  // per-spawn speed jitter (±15%) — same kind, individual gait; the cheap "randomness" that reads fair
  return { x, y, k, cap: fb, vx: fv * (.85 + Math.random() * .3) * (Math.random() < .5 ? 1 : -1), hp: fh * (el ? 2 : 1), mx: fh * (el ? 2 : 1), dm: fd + (el ? 1 : 0), el, fl: 0, t: Math.random() * 7, cz: el ? fz + 1 : fz };
};
const foes = seeds.foes.map(([x, y, k]) => mkFoe(x * T, y * T, k));
const fsz = (f) => 5 * (f.cz || 1 + f.k);          // one size rule for sprites + collision
const shots = [], flies = [], parts = [], fbolts = [], drops = [];
const fly = (x, y, txt, c, big) => flies.push({ x, y, txt, c, big, t: 1.2 });
const burst = (x, y, n, c) => { for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, s = 40 + Math.random() * 80; parts.push({ x, y, vx: Math.sin(a) * s, vy: Math.cos(a) * s - 60, t: .5 + Math.random() * .4, c }); } };
// ITEM DROPS — physical pickups from kills/chests.
// Types: 0 heart (+3 HP), 1 mana (+2 MP), 2 XP gem, 3 rainbow (3% rare full heal).
// Type 4 = GOLDEN RAINBOW SHARD (boss first-kill ONLY — game objective, 5 total).
// LUCK adds +1 drop per pip.

// Pixel sprites (bitmask rows, MSB-left). Shared 1-bit decoder: spr(data, x, y, w, col)
const spr = (d, x, y, w, c) => { ctx.fillStyle = c; for (let r = 0; r < d.length; r++) for (let b = w; b--;) d[r] >> b & 1 && ctx.fillRect(x + w - 1 - b, y + r, 1, 1); };
// HEART 6×6
const I_HP = [0b010010, 0b111111, 0b111111, 0b011110, 0b001100, 0b000000];
// POTION 6×7 (cork top, rounded bottle body)
const I_MP = [0b001100, 0b001100, 0b011110, 0b111111, 0b111111, 0b011110, 0b000000];
// ICE CREAM 6×7 (round scoop + cone bottom) — drawn TWO-TONE at the call site:
// I_XP full shape in cone-tan, I_XS scoop rows overdrawn in mint. Looks like ice cream.
const I_XP = [0b011110, 0b111111, 0b111111, 0b011110, 0b001100, 0b001100, 0b000000];
const I_XS = [0b011110, 0b111111, 0b111111, 0b011110];
// Skill tree branch icons 5×5
// (branch icons removed with the branch headers 2026-08-29)
// GEAR PART ICONS — each looks like the body part it equips (Joey 2026-08-29):
// a hoof in your bag looks like a hoof, colored by its item color, tier border = power.
const I_HN = [0b00010, 0b00110, 0b01100, 0b11000, 0b11000]; // HORN — tapered spire
const I_MN = [0b11000, 0b11100, 0b01110, 0b00111, 0b00011]; // MANE — flowing cascade of hair
const I_BD = [0b01110, 0b11111, 0b11111, 0b10101, 0b10101]; // BODY — torso on legs (animal silhouette)
const I_HF = [0b01100, 0b01100, 0b01100, 0b11110, 0b11110]; // HOOF — leg into flared hoof base
const SLOTICON = [I_BD, I_MN, I_HN, I_HF];         // gear drop icon by slot [BODY,MANE,HORN,HOOVES]
// (sprC multi-color decoder removed 2026-08-29 — zero call sites, and the measured
// law killed its premise: data-string sprites cost MORE than fillRect code under roadroller.)
// ONE loot table for every drop — a D&D loot check. Ladder floor→ceiling:
// XP → heart → mana → GEAR (the ceiling LUCK maximizes; tier climbs with the roll).
// Rainbow (full heal) is a separate rare check so LUCK can't spam it. Each LUCK pip
// lifts the roll +4 → more gear AND higher-tier gear. Golden boss shard is the ONLY
// drop outside this table. Thresholds are single literals — tune freely.
const spawnDrop = (x, y, n) => {
  for (let i = 0; i < n; i++) {
    const d = { x, y: y - 4, vx: (Math.random() - .5) * 80, vy: -90 - Math.random() * 50, t: 2, life: 6 };
    if (Math.random() < .03 + Math.min(lk, 10) * .004) d.t = 3;   // rainbow — rare, gentle LUCK scaling (3%→7%)
    else {
      const r = (Math.random() * 100 | 0) + Math.min(lk, 10) * 4; // % roll + LUCK; GEAR is the ceiling
      // GEAR TIER = a real D&D check: d20 + LUCK/2 + LEVEL/4 vs DC 17 (gold) / 24
      // (prismatic — needs high level AND luck; was UNREACHABLE before). Tune the two DCs.
      if (r >= 85) { d.t = 5; d.life = 10; d.s = Math.random() * 4 | 0; d.c = (4 + Math.random() * (PC - 4)) | 0; const t = (1 + Math.random() * 20 | 0) + (lk >> 1) + (lvl >> 2); d.b = t >= 24 ? 3 : t >= 17 ? 2 : 1; }
      else if (r >= 58) d.t = 1;                  // mana
      else if (r >= 30) d.t = 0;                  // heart  (else: XP gem, the floor)
    }
    drops.push(d);
  }
};

// damage a foe: dmg = die + MOD, crit doubles. Full D&D damage line, visible.
// Feel pass: knockback on non-boss/non-stomp hits, hitstop + shake on crit, boss
// phase-2 trigger at half HP, minion cleanup on boss death. Drops: one shared loot
// roll for all kills (elites/bosses just roll more times); golden shard is the only
// guaranteed boss drop.
const strike = (f, r, gen, viaStomp) => {
  const crit = isCrit(r), dmg = (r + MOD()) * (crit ? 2 : 1);
  f.hp -= dmg; f.fl = .15;
  if (!f.bit && !viaStomp) f.vx += (crit ? 220 : 140) * (f.x > pl.x ? 1 : -1); // KNOCKBACK — bosses hold their arena
  shk = Math.max(shk, crit ? .22 : .09);
  if (crit) hs = .06;                             // hitstop punch — 60 ms world freeze on Nat crit
  fly(f.x, f.y - 8, (crit ? 'CRIT ' : '') + '-' + dmg, crit ? '#ffd75e' : '#ff5d6c', crit);
  if (crit) { S_NAT(); earned[3] = 1; burst(f.x, f.y, 24, '#ffd75e'); }
  if (gen) mn = Math.min(mMN(), mn + 1);          // dash hits GENERATE mana
  // BOSS PHASE 2 — first crossing of half HP, permanent
  if (f.bit && !f.ph && f.hp <= f.mx / 2 && f.hp > 0) {
    f.ph = 1; sfx(220, 110, .35, 'sawtooth', .16);
    const g2 = f.cap |= P2[f.bi];                 // phase 2 GRANTS capabilities — same vocab, pure data
    if (P2[f.bi] & 4) for (let n = 0; n < 2; n++)                                              // summon minions (event bit — fires on gain)
      foes.push({ x: f.x + n * 20 - 10, y: f.y - 10, k: 1, vx: 40 * (n ? 1 : -1), hp: 4, dm: 2, fl: 0, t: 0 });
    if (g2 & 32) f.spd = 1.65;                    // SWIFT — faster chase + hop
  }
  if (f.hp <= 0) {
    if (f.dead) return;                                         // 2nd hit same frame — cash-out already ran
    f.dead = 1;                                                 // frame-end prune below; avoids splice-race index shift
    burst(f.x, f.y, 12, FOECOL[f.k]); gainXp(Math.min(f.k, 3) * 4 + (crit ? 4 : 0) + (f.bit ? 25 : 0), f.x, f.y - 16); // XP capped at k=3 rate — k4+ are variants, not a farm ladder
    spawnDrop(f.x, f.y, f.el || f.bit ? 3 : 1);                 // elites & bosses share ONE "higher chance" tier (more rolls) — never a guaranteed gear drop. Golden shard (below) is the ONLY boss guarantee.
    if (f.el) { burst(f.x, f.y, 18, '#ffd75e'); sfx(880, 1760, .3, 'triangle', .14); }
    if (f.bit) {                                                // BOSS falls
      for (let i = foes.length; i--;) if (foes[i].bit === f.bit) foes.splice(i, 1);
      if (!f.hit) earned[4] = 1;                                // UNTOUCHABLE
      if (bs[f.bi] !== 2) {                                     // FIRST KILL — golden rainbow shard
        bs[f.bi] = 2; earned[1] = 1;
        if (shards() === 5) {                                   // ALL 5 — the game's objective PAYS OFF (was: silent achievement only)
          earned[12] = 1;
          bann = time + 6; bTxt = 'THE GLOOM LIFTS'; bSub = 'UNI-CORN · THE LAST SAVIOR';   // victory via the boss-banner system — zero new structure
        }
        drops.push({ x: f.x, y: f.y - 12, vx: 0, vy: -130, t: 4, life: 15 });
        sfx(523, 523, .14, 'triangle', .15); sfx(659, 659, .14, 'triangle', .15, .12); sfx(784, 1568, .3, 'triangle', .15, .24);
        save();
      }
      if (bs[f.bi] !== 2) bs[f.bi] = 0;
      gainXp(12 + 6 * f.bi, f.x, f.y - 26); burst(f.x, f.y, 30, '#fff');
    }
    earned[2] = 1;                                                  // GLOOMBUSTER — first kill
    return 1;
  }
};

// ---------- verbs ----------
// (swing/melee removed 2026-08-29 — DASH is the attack verb now: available from
// the start at half distance, always strikes foes it passes through, and hits
// GENERATE mana (inheriting melee's role in the economy). Celeste-validated
// pattern: one celebrated gesture, "dash attack" window. LONG DASH doubles distance.)
function shoot() {                                              // rainbow shot: 3 mana
  if (!started || choosing || deathT > 0 || !su[0]) return;
  if (mn < 3) { fly(pl.x, pl.y - 12, 'need ✦3', '#f9c'); return; }   // flat 3 MP (cost chain removed)
  mn -= 3; sfx(700, 1300, .12, 'sawtooth', .09);
  shots.push({ x: pl.x + PW / 2, y: pl.y + 5, vx: pl.face * 270, t: .55 + .25 * (su[1] + su[2]) });   // base range SHORT; FAR SHOT + SNIPER extend (.55s→1.3s)
}
function dash() {                                               // THE attack verb: burst + strike-through; air use resets on landing
  if (!started || choosing || deathT > 0 || dashCd > 0) return;
  if (!pl.ground) { if (adash) return; adash = 1; }             // dash works in air too — once per airtime, resets on landing
  chT = 0;                                                      // dash cancels a heal channel (no move-while-rooted exploit)
  dashT = su[14] ? .15 : .075;                                  // base = HALF distance; LONG DASH doubles it (gates the spike lake)
  dashCd = .45; pl.sq = .6; sfx(600, 200, .12, 'sawtooth', .12); // flat cooldown (cd skill removed)
}

const hurt = (n, safe) => {
  if (pl.inv > 0 || deathT > 0) return;
  n = Math.max(1, n - df - eqB[3]);                            // DEFENSE — stat + hooves eq bonus
  hp -= n; pl.inv = su[11] ? 1.8 : 1.2; chT = 0; shk = Math.max(shk, .22);
  for (const f of foes) if (f.bit) f.hit = 1;                    // any hit disqualifies UNTOUCHABLE for the active boss(es)
  sfx(140, 55, .25, 'sawtooth', .2); burst(pl.x, pl.y + 7, 10, '#e05555'); // GUARD TIME extends pl.inv

  if (hp <= 0) { deathT = 1.6; return; }
  if (safe) { pl.x = lastSafe[0]; pl.y = lastSafe[1]; pl.vx = pl.vy = 0; }
  else pl.vy = -180;
};

// ---------- update ----------
let last = performance.now(), time = 0;
const step = (dt) => {
  if (hs > 0) { hs -= dt; return; }               // HITSTOP — world freezes for the crit punch
  if (dialog || choosing) {                        // JOYSTICK MENU NAV — stick up/down moves, push right allocates
    navT -= dt;
    const up = keys.has('TBtnUp'), dn = keys.has('TBtnDn'), rt = keys.has('TBtnR');
    if (navT <= 0 && (up || dn || (rt && choosing))) {
      navT = .3; sfx(520, 640, .05, 'square', .05);
      if (rt && choosing) allocate();
      else if (choosing) aRow = (aRow + (dn ? 1 : 4)) % 5;
      else dialog = dn ? 2 : 1;
    }
    if (!up && !dn && !rt) navT = 0;
  }
  if (paused || dialog || choosing) return;        // pause / dialog / level-up allocation freezes sim; render still draws
  time += dt; jbuf -= dt; pl.inv -= dt; pl.t += dt; dashT -= dt; dashCd -= dt; dropT -= dt; shk -= dt;
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

  // -- heal channel: rooted, costs 5 mana, restores 3 HP (HEAL +2/+4 nodes → 5/7) --
  const canHeal = su[4] && mn >= 5 && hp < mHP() && pl.ground && !onPlat;
  if (canHeal && healHeld()) {
    chT += dt; pl.vx = 0;
    if (chT > 1.2) { const hm = 3 + 2 * (su[5] + su[6]); chT = 0; mn -= 5; hp = Math.min(mHP(), hp + hm); burst(pl.x + PW / 2, pl.y + 4, 14, '#9fe89a'); sfx(520, 1040, .25, 'triangle', .12); fly(pl.x, pl.y - 12, '+' + hm, '#9fe89a', 1); }   // HEAL +2/+4: 3→5→7
  } else chT = 0;
  // (REGEN skill + its regT timer removed 2026-08-29)
  const rooted = chT > 0;

  // -- run --
  const dir = rooted ? 0 : (held('KeyD', 'ArrowRight', 'TBtnR') ? 1 : 0) - (held('KeyA', 'ArrowLeft', 'TBtnL') ? 1 : 0);
  pl.vx += (dir * RUN() - pl.vx) * Math.min(1, dt * 12 * (pl.ground ? 1 : .65));
  if (dir) pl.face = dir;

  // -- jump: buffer + coyote + variable + double --
  pl.coyote = pl.ground ? .1 : pl.coyote - dt;
  if (jbuf > 0 && !rooted) {
    if (pl.coyote > 0) { pl.vy = -V0(); pl.coyote = 0; pl.air = 0; jbuf = 0; pl.sq = .7; sfx(280, 520, .12); burst(pl.x, pl.y + PH, 4, '#ccc'); }
    else if (su[12] && pl.air < 1 + su[13]) { pl.vy = -(V0() - 20); pl.air++; jbuf = 0; pl.sq = .7; sfx(390, 760, .12, 'triangle'); burst(pl.x, pl.y + PH, 6, '#f9c'); }   // TRI JUMP node = third jump
  }
  if (pl.vy < 0 && !jumpHeld()) pl.vy *= .82;
  if (dashT > 0) {                                              // dash overrides physics: flat burst
    pl.vx = pl.face * 400; pl.vy = 0;
    parts.push({ x: pl.x + PW / 2, y: pl.y + 8, vx: 0, vy: 0, t: .3, c: `hsl(${(time * 500) % 360} 80% 65%)` });
    for (const f of [...foes]) {                                // DASH ATTACK — dashing through a foe IS the strike; hits generate mana
      const fz = fsz(f);
      if (f.fl <= 0 && pl.x < f.x + fz && pl.x + PW > f.x && pl.y < f.y + fz && pl.y + PH > f.y) strike(f, roll(), 1, 0);   // dash strike — flat die roll; power scales via STR/gear
    }
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
        if (!wasGround && pl.vy > 250) { pl.sq = 1.35; burst(pl.x + PW / 2, feet, 5, '#ccc'); sfx(150, 70, .06, 'square', .07); }
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
    if (spike(pl.x + ox, pl.y + oy)) { hurt(2, 1); break; }
  if (pl.y > H * T) hurt(2, 1);

  // -- chest proximity — JUMP-to-open handled in keydown; here just flag the nearest --
  nearChest = -1;
  for (const c of chests) if (!(oc & (1 << c.i)) && Math.hypot(pl.x + PW / 2 - c.x, pl.y + PH / 2 - c.y) < 20) { nearChest = c.i; break; }

  // -- bosses: each drops a golden rainbow shard on first kill --
  seeds.bosses.forEach(([bx, by], i) => {
    const bit = 1 << i;
    // bs[i]: 0=unvisited, 1=on screen, 2=killed(shard taken), {hp,ph,...}=leash stash
    if (bs[i] === 1) return;                                     // already on screen
    if (Math.hypot(pl.x - bx * T, pl.y - by * T) < 80) {
      const st = bs[i], fresh = !st || st === 2;               // 0=new, 2=killed before → fresh spawn
      bs[i] = 1;
      foes.push({
        x: bx * T, y: by * T, vx: 0, vy: 0, k: 3, bi: i, bit, cz: 4, dm: 4 + i,
        fl: 0, t: 0, hit: 0, mx: 24 + 10 * i,
        cap: 18 | (fresh ? 0 : st.ph && P2[i]),  // boss base = hop+chase; re-entry restores phase-2 grants
        hp: fresh ? 24 + 10 * i : st.hp,
        ph: fresh ? 0 : st.ph, spd: fresh ? 0 : st.spd, rc: fresh ? undefined : st.rc,
      });
sfx(110, 55, .5, 'sawtooth', .18);
      // BANNER — announce the arena; "keeper" line only while its shard is unclaimed
      bann = time + 2.2; bTxt = BN[i] + ' MARE'; bSub = st === 2 ? '' : 'KEEPER OF THE GOLDEN SHARD';
    }
  });

  // -- shots --
  for (const s of shots) {
    s.t -= dt; s.x += s.vx * dt;
    parts.push({ x: s.x, y: s.y + Math.sin(time * 30) * 2, vx: 0, vy: 0, t: .25, c: `hsl(${(time * 500) % 360} 80% 65%)` });
    const tc = s.x / T | 0, tr = s.y / T | 0;
    if (tile(tc, tr) === 4) {                                   // shatter gloom crystal (3x3)
      for (let j = tr - 1; j <= tr + 1; j++) for (let i = tc - 1; i <= tc + 1; i++)
        if (tile(i, j) === 4) { grid[j * W + i] = 0; burst(i * T + 8, j * T + 8, 5, '#c9a6f7'); }
      s.t = 0; sfx(900, 200, .2, 'square', .15);
    } else if (solid(s.x, s.y)) { s.t = 0; burst(s.x, s.y, 6, '#fff'); }
    if (s.t > 0) for (const f of foes) {                        // a spent bolt can't also hit a foe
      const fs = fsz(f);
      if (s.x > f.x && s.x < f.x + fs && s.y > f.y && s.y < f.y + fs) { if (!su[3]) s.t = 0; strike(f, roll(), 0, 0); break; } // SHOT THRU keeps flying
    }
  }
  for (let i = shots.length; i--;) if (shots[i].t <= 0) shots.splice(i, 1);
  // -- foe bolts (Gloomcast + boss phase 2): hit the player, die on solid --
  for (const b of fbolts) {
    b.t -= dt; b.x += b.vx * dt; b.y += b.vy * dt;
    if (solid(b.x, b.y)) b.t = 0;
    else if (pl.x + PW > b.x - 2 && pl.x < b.x + 2 && pl.y + PH > b.y - 2 && pl.y < b.y + 2) { hurt(2, 0); b.t = 0; }
  }
  for (let i = fbolts.length; i--;) if (fbolts[i].t <= 0) fbolts.splice(i, 1);

  // -- foes --
  for (const f of [...foes]) {
    f.t += dt; f.fl -= dt;
    const fs = fsz(f);
    // ===== UNIFIED ATTACK ORCHESTRATION — every foe runs the same verbs; =====
    // ===== cap bits (data) decide who uses which. Contact damage (.wt tell) =====
    // ===== below is the base attack every enemy shares.                    =====
    // RANGED (cap 1) — lazy clock init (one init site for foes AND bosses)
    if (f.cap & 1) {
      f.rc = (f.rc ?? 1.5 + Math.random()) - dt;
      if (f.rc <= 0 && Math.abs(pl.x - f.x) < 230) {
        f.rc = f.bit ? 1.6 : 2.1;
        const dx = pl.x + PW / 2 - f.x - fs / 2, dy = pl.y + PH / 2 - f.y - fs / 2, d = Math.hypot(dx, dy) || 1, sp = f.bit ? 115 : 90;
        fbolts.push({ x: f.x + fs / 2, y: f.y + fs / 2, vx: dx / d * sp, vy: dy / d * sp, t: 2.6 });
        sfx(f.bit ? 260 : 380, 180, .14, 'sawtooth', .09);
        if (!f.bit) f.vx = 0;                                   // ranged foe stops to fire
      }
    }
    if (f.bit && Math.hypot(pl.x - f.x, pl.y - f.y) > 220) {    // BOSS LEASH — walk-out: stash hp/phase so re-trigger resumes, no free heal
      bs[f.bi] = { hp: f.hp, ph: f.ph || 0, spd: f.spd || 0, rc: f.rc };
      foes.splice(foes.indexOf(f), 1); continue;
    }
    // CHASE (cap 16) — home on the player; bi scales boss ground speed
    if (f.cap & 16) f.vx = Math.sign(pl.x + PW / 2 - f.x - fs / 2) * (28 + (f.bi || 0) * 5) * (f.spd || 1);
    // HOP (cap 2) — one clock for boss and foe; chasers hop on rhythm, patrollers arm near the player
    if (f.cap & 2) {
      f.hop = (f.hop || 1) - dt;
      if (f.hop <= 0 && f.gr && (f.cap & 16 || Math.abs(pl.x - f.x) < 200)) {
        f.vy = -230; f.gr = 0; f.hop = (f.cap & 16 ? 2.4 : 1 + Math.random()) / (f.spd || 1);
      }
    }
    const wasGr = f.gr;
    f.vy = Math.min(400, (f.vy || 0) + 900 * dt); f.y += f.vy * dt;   // FALLCAP for foes too — no tile tunneling
    const ty = (f.y + fs) / T | 0;
    const tv = tile((f.x + fs / 2) / T | 0, ty);
    if (f.vy > 0 && (tv === 1 || tv === 2 || tv === 4)) {
      f.y = ty * T - fs; f.vy = 0; f.gr = 1;
      // SHOCKWAVE (cap 8) — ring the ground on landing; bosses gain it at phase 2, any foe row can carry it
      if (f.cap & 8 && !wasGr) {
        shk = Math.max(shk, .3); burst(f.x + fs / 2, f.y + fs, 16, '#e08ae0'); sfx(90, 40, .3, 'sawtooth', .18);
        if (pl.ground && Math.abs(pl.x - f.x) < 64) hurt(3, 0);
      }
    }
    f.x += f.vx * dt;
    const ahead = f.x + fs / 2 + Math.sign(f.vx) * fs * .7;
    const blockedAhead = solid(ahead, f.y + fs / 2) || tile(ahead / T | 0, (f.y + fs + 6) / T | 0) === 0;
    if (blockedAhead) { if (f.bit) f.vx = 0; else if (f.gr || !(f.cap & 2)) f.vx *= -1; } // bosses hold ground at edges; airborne hoppers keep momentum (land, then turn)
    // CONTACT with wind-up tell: touching sets .wt clock; hurt only fires after 0.3s
    // (visible red flash). Cooldown holds .wt < 0 until the strike can re-arm.
    const hit = pl.x < f.x + fs && pl.x + PW > f.x && pl.y < f.y + fs && pl.y + PH > f.y;
    if (hit && pl.vy > 40 && pl.y + PH - f.y < 10) {
      strike(f, roll(), 0, 1);
      // STOMP LAUNCH — big vertical bounce + horizontal push AWAY from foe center.
      // pl.air = 0 keeps DJ available so a skilled player can chain stomps; the
      // horizontal push means an unskilled player lands far away instead of bunny-hopping.
      pl.vx = (f.x + fs / 2 < pl.x + PW / 2 ? 1 : -1) * 220;
      pl.vy = jumpHeld() ? -360 : -280; pl.air = 0; pl.sq = .75; sfx(200, 55, .1, 'square', .2);
      // NOTE: stomp no longer resets .wt — repeat-bouncing accumulates threat (exploit fix)
    } else if (hit && (f.wt || 0) >= 0) {
      f.wt = (f.wt || 0) + dt;
      if (f.wt > .22) { hurt(f.dm, 0); f.wt = -.7; }
    } else if (!hit && (f.wt || 0) > 0) f.wt = Math.max(0, f.wt - dt * 2);  // DECAY, not reset — brief separation keeps threat
    if (f.wt < 0) f.wt = Math.min(0, f.wt + dt);
  }
  for (let i = foes.length; i--;) if (foes[i].dead) foes.splice(i, 1);   // frame-end prune
  // FOE RESPAWN — off-screen seed positions refill the world (enemies reappear)
  if (foes.filter(f => !f.bit).length < seeds.foes.length) {
    for (const [x, y, k] of seeds.foes) {
      const wx = x * T, wy = y * T;
      if (Math.abs(wx - pl.x) < VW || Math.abs(wy - pl.y) < VH) continue;
      if (foes.some(f => !f.bit && Math.abs(f.x - wx) < T && Math.abs(f.y - wy) < T)) continue;
      foes.push(mkFoe(wx, wy, k));
    }
  }

  // -- HEARTH proximity flag (input handling lives in keydown/pointerdown; JUMP is universal interact) --
  nearFire = 0;
  for (const [fx, fy] of seeds.fires) if (Math.hypot(pl.x - fx * T, pl.y - fy * T) <= 26) { nearFire = 1; break; }
  if (!nearFire && dialog) dialog = 0;                    // walk-away auto-closes dialog

  // -- achievement watchers (all 13 Wavedash slots live) --
  if (lvl >= 10) earned[9] = 1;                                  // HOARDER — reach LV10
  if (su[0] && su[4] && su[12] && su[14]) earned[10] = 1;       // BELIEVER — shot+heal+dbl jump+long dash learned
  // earned[7] = SILVER_TONGUE — set directly in dialogDo() on first talk
  if (pl.x < 64 * T && pl.y < 30 * T) earned[6] = 1;                  // SUMMIT — reached the peak area
  if (hof === 4) earned[5] = 1;                                 // GREEN_HOOVES (Wavedash slot 5) — fires on RUBY hooves (idx 4); name is legacy
  if (bod && man && hrn && hof) earned[11] = 1;                 // ARCHITECT — all 4 body parts customized off default

  // ITEM DROPS — float, gravity, tile collision, proximity pickup
  for (const d of drops) {
    d.life -= dt; d.vy = Math.min(200, d.vy + 400 * dt); d.y += d.vy * dt; d.x += d.vx * dt; d.vx *= .97;
    if (d.vy > 0 && solid(d.x, d.y + 3)) { d.vy = 0; d.y = ((d.y + 3) / T | 0) * T - 3; }
    if (Math.hypot(pl.x + PW / 2 - d.x, pl.y + PH / 2 - d.y) < 18) {
      d.life = 0;
      if (d.t === 0) { hp = Math.min(mHP(), hp + 3); fly(d.x, d.y, '+3 HP', '#ff5d6c'); }
      else if (d.t === 1) { mn = Math.min(mMN(), mn + 2); fly(d.x, d.y, '+2 MP', '#c9a6f7'); }
      else if (d.t === 2) gainXp(2 + lvl, d.x, d.y);
      else if (d.t === 3) { hp = mHP(); mn = mMN(); fly(d.x, d.y, 'FULL HEAL!', '#ffd75e', 1); burst(d.x, d.y, 12, '#ffd75e'); }
      else if (d.t === 4) { hp = mHP(); mn = mMN(); fly(d.x, d.y, 'RAINBOW SHARD!', '#ffd75e', 1); burst(d.x, d.y, 20, '#ffd75e'); sfx(523, 523, .14, 'triangle', .15); sfx(784, 1568, .3, 'triangle', .15, .24); }
      else if (d.t === 5) {                                     // GEAR PICKUP — into inventory or auto-equip
        if (inv.length < invMax) {
          const item = { s: d.s, c: d.c, b: d.b };
          if (!eq[d.s] || eq[d.s].b < d.b) { equip(item); fly(d.x, d.y, '+' + d.b + ' ' + STATS[SLOT_STAT[d.s]][0], PAL[d.c], 1); }
          else { inv.push(item); fly(d.x, d.y, SLOT_LBL[d.s] + ' GEAR', PAL[d.c]); }
          sfx(660, 880, .12, 'triangle', .1);
        } else fly(d.x, d.y, 'BAG FULL', '#ff5d6c');
      }
      else { hp = mHP(); mn = mMN(); fly(d.x, d.y, 'RAINBOW SHARD!', '#ffd75e', 1); } // type 4 — boss only
      sfx(520, 1040, .06, 'triangle', .08);
    }
  }
  for (let i = drops.length; i--;) if (drops[i].life <= 0) drops.splice(i, 1);
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

  // SKY — bright blue gradient, white clouds, cheerful Zelda/Mario feel
  // BACKGROUND = ONE flat blue + clouds (2026-08-29: bands + hills removed — all
  // visual detail lives in the ground layer; simpler zones, fewer color combos)
  ctx.fillStyle = '#6bc5ff'; ctx.fillRect(0, 0, VW, VH);                    // sky
  // CLOUDS — 5 soft white puffs, parallax scroll
  for (const [cx, cy, cw] of [[80, 30, 40], [200, 50, 55], [350, 25, 35], [500, 60, 45], [650, 35, 30]]) {
    const sx = ((cx - cam.x * .15) % (VW + 100)) - 50;
    ctx.fillStyle = 'rgba(255,255,255,.6)';
    ctx.fillRect(sx, cy, cw, 8); ctx.fillRect(sx + 4, cy - 4, cw - 8, 6); ctx.fillRect(sx + 8, cy + 6, cw - 16, 5);
  }

  // SCREEN SHAKE — offset the world translate, not the HUD (which draws after the untranslate)
  const so = shk > 0 ? Math.random() * 6 - 3 : 0;
  ctx.translate((-cam.x + so) | 0, (-cam.y + so) | 0);
  const x0 = cam.x / T | 0, x1 = Math.min(W, x0 + VW / T + 2), y0 = Math.max(0, cam.y / T | 0), y1 = Math.min(H, y0 + VH / T + 2);
  for (let j = y0; j < y1; j++) for (let i = x0; i < x1; i++) {
    const v = tile(i, j); if (!v) continue;
    if (v === 1) {
      // SOLID GROUND — brown earth, bright green grass top when exposed to air
      ctx.fillStyle = '#5a3a1e'; ctx.fillRect(i * T, j * T, T + .5, T + .5);
      if (tile(i, j - 1) !== 1) { ctx.fillStyle = '#4a9a3a'; ctx.fillRect(i * T, j * T, T + .5, 5); }
    } else if (v === 2) {
      // PLATFORM — chunky: green grass top + brown dirt underside
      ctx.fillStyle = '#5a3a1e'; ctx.fillRect(i * T, j * T + 2, T + .5, 7);
      ctx.fillStyle = '#4a9a3a'; ctx.fillRect(i * T, j * T, T + .5, 4);
    } else if (v === 4) {                                       // gloom crystal — pulses
      ctx.fillStyle = `hsl(280 60% ${26 + Math.sin(time * 4 + i + j) * 8}%)`;
      ctx.fillRect(i * T, j * T, T + .5, T + .5);
      ctx.fillStyle = 'hsl(290 80% 60%)'; ctx.fillRect(i * T + 5, j * T + 5, 6, 6);
    } else {
      // SPIKES — universal danger color
      ctx.fillStyle = '#e05555';
      for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(i * T + k * 4, j * T + T); ctx.lineTo(i * T + k * 4 + 2, j * T + 8); ctx.lineTo(i * T + k * 4 + 4, j * T + T); ctx.fill(); }
    }
  }

  // Hearth: campfire + SAGE wizard NPC (dialogue on approach)
  ctx.font = 'bold 8px monospace'; ctx.textAlign = 'center';
  for (const [fx, fy] of seeds.fires) {
    const cxp = fx * T, cyp = fy * T;
    // -- fire --
    ctx.fillStyle = '#6b4a2b'; ctx.fillRect(cxp - 8, cyp + 4, 16, 4);
    const fl = 8 + Math.sin(time * 13) * 2 + Math.sin(time * 31) * 1.5;
    ctx.fillStyle = '#ff9d3c'; ctx.beginPath(); ctx.moveTo(cxp - 5, cyp + 5); ctx.lineTo(cxp, cyp + 5 - fl); ctx.lineTo(cxp + 5, cyp + 5); ctx.fill();
    ctx.fillStyle = '#ffe08a'; ctx.beginPath(); ctx.moveTo(cxp - 2.5, cyp + 5); ctx.lineTo(cxp, cyp + 5 - fl * .6); ctx.lineTo(cxp + 2.5, cyp + 5); ctx.fill();
    // WIZARD NPC — procedural, same fillRect quality as the unicorn drawU
    const wx = cxp + 16, wy = cyp, wb = Math.sin(time * 2) * .4;   // wy=cyp plants boots INTO the grass cap (was cyp-2 = hovering)
    ctx.fillStyle = '#8a6a3a'; ctx.fillRect(wx + 5, wy - 13, 1, 17);         // staff
    ctx.fillStyle = '#8cf'; ctx.fillRect(wx + 4, wy - 14, 3, 2);             // crystal tip (glow)
    ctx.fillStyle = '#3a2f5c';                                                // robe
    ctx.fillRect(wx - 3, wy - 3, 6, 8);                                      // torso
    ctx.fillRect(wx - 4, wy + 3, 8, 3);                                      // skirt flare
    ctx.fillRect(wx + 2, wy - 2, 4, 2);                                      // right arm → staff
    ctx.fillRect(wx - 3, wy - 8, 6, 2);                                      // hat brim
    ctx.fillRect(wx - 2, wy - 10, 4, 2);                                     // hat mid
    ctx.fillRect(wx - 1, wy - 12, 2, 2);                                     // hat tip
    ctx.fillStyle = '#f7d9c0'; ctx.fillRect(wx - 2, wy - 6, 4, 3);          // face
    ctx.fillStyle = '#d8d8e0'; ctx.fillRect(wx - 2, wy - 4, 4, 2);          // beard
    ctx.fillStyle = '#000';                                                   // eyes
    ctx.fillRect(wx - 1, wy - 5, 1, 1); ctx.fillRect(wx + 1, wy - 5, 1, 1);
    ctx.fillStyle = '#ffd75e'; ctx.fillRect(wx, wy - 13 + wb, 1, 1);        // gold star on hat
    ctx.fillStyle = '#3a2f5c';                                                // boots — at wy+8: sunk into the tile, unmistakably grounded
    ctx.fillRect(wx - 3, wy + 8, 2, 1); ctx.fillRect(wx + 1, wy + 8, 2, 1);
    ctx.fillStyle = '#3a2f5c';                                                // legs — 2× height (2026-08-29: was 2px, read as floating)
    ctx.fillRect(wx - 2, wy + 4, 1, 4); ctx.fillRect(wx + 1, wy + 4, 1, 4);
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
      ctx.font = 'bold 8px monospace'; ctx.fillText('▲ OPEN', c.x, c.y - 10 - pf);
    }
  }



  // WORLD DECORATIONS — trees, grass, rocks, flowers, mushrooms. Data-driven from DECO seeds.
  // type 0=tree, 1=grass tuft, 2=rock. Nearly free: positions are data, draw is shared.
  for (const [dx, dy, dt] of DECO) {
    const px = dx * T, py = dy * T + T;                          // py = ground surface (feet level)
    if (px < cam.x - T || px > cam.x + VW + T || py < cam.y - T || py > cam.y + VH + T) continue;
    if (dt === 0) { // TREE — brown trunk, green canopy
      ctx.fillStyle = '#5a3a1e'; ctx.fillRect(px + 6, py - 12, 4, 12);
      ctx.fillStyle = '#4a9a3a'; ctx.fillRect(px + 1, py - 20, 14, 9);
      ctx.fillStyle = '#4a9a3a'; ctx.fillRect(px + 3, py - 23, 10, 5);
    } else if (dt === 1) { // GRASS — green blades swaying
      const sw = Math.sin(time * 2.5 + dx) * 1.5;
      ctx.fillStyle = '#4a9a3a';
      ctx.fillRect(px + 3 + sw, py - 5, 1, 5); ctx.fillRect(px + 7 + sw * .7, py - 7, 1, 7); ctx.fillRect(px + 11 + sw * .4, py - 4, 1, 4);
    } else if (dt === 2) { // ROCK — gray boulder
      ctx.fillStyle = '#666'; ctx.fillRect(px + 3, py - 4, 10, 4);
      ctx.fillStyle = '#888'; ctx.fillRect(px + 4, py - 6, 8, 3);
    }
    // (flower/mushroom deco types removed 2026-08-29 — they read as collectible
    // items; loot comes ONLY from foes/chests, so scenery must never look like loot)
  }

  // ARTICULATED ENEMY SPRITES — unicorn-quality (legs step, antennae bob,
  // hoods, glowing rune-eyes, robe folds). One draw fn per tier, boss shares
  // the caster-with-crown silhouette scaled up. cz=elite/boss cell multiplier.
  for (const f of foes) {
    const s = f.cz || 1 + f.k, fs = 5 * s, wob = Math.sin(f.t * 6) * 1.5, sh = FT[f.k][5]; // sh = body shape from the type table
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
    ctx.fillStyle = f.fl > 0 ? '#fff' : f.wt > .12 ? '#ffb0b0' : f.bit ? '#000' : FOECOL[f.k];
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
    } else if (sh === 1) {                                      // CRAWLER shape — 4 legs + antennae (Doubtling family)
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
    } else if (sh === 2) {                                      // JELLY shape — dome + 3 dangling tendrils (Gloomer family)
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
    } else {                                                    // CASTER shape — hooded robe + glowing rune-eye (Gloomcast family)
      ctx.fillRect(s * .2, s * 1.5, fs - s * .4, s * 2.7);       // robe
      ctx.fillRect(0, s * 2, s * .4, s * 1.5);                   // shoulders
      ctx.fillRect(fs - s * .4, s * 2, s * .4, s * 1.5);
      ctx.fillRect(s * 1.2, wob * .3, fs - s * 2.4, s * 1.4);    // hood top
      ctx.fillRect(s * .8, wob * .3 + s * .6, fs - s * 1.6, s * 1); // hood brim
      ctx.fillStyle = '#ffd75e';                                 // rune eye
      ctx.fillRect(fs / 2 - s * .3, s * .9 + wob * .3, s * .6, s * .35);
    }
    if (!f.bit && f.rc !== undefined && f.rc < .5) {            // charge orb tell — ANY ranged foe, any shape
      const p = (.5 - f.rc) * 2;
      ctx.fillStyle = '#c47fe0';
      ctx.fillRect(fs - s * .5, s * 2.5, s * (.8 + p * .6), s * (.8 + p * .6));
    }
    ctx.restore();
    if (f.bit) {                                                // boss HP bar
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
    ctx.restore();
    if (chT > 0) {                                               // heal channel ring
      ctx.strokeStyle = '#9fe89a'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(pl.x + PW / 2, pl.y + 6, 12, -1.57, -1.57 + 6.28 * chT / 1.2); ctx.stroke();  // denominator MUST match the heal tick threshold
    }
  }

  // Item drops — pixel sprites, bob gently, fade near end of life
  for (const d of drops) {
    ctx.globalAlpha = Math.min(1, d.life);
    const dy = Math.sin(d.life * 5) * 1.5, dx = d.x - 3, ddy = d.y - 3 + dy;
    if (d.t === 0) spr(I_HP, dx, ddy, 6, '#ff5d6c');
    else if (d.t === 1) { spr(I_MP, dx, ddy, 6, '#c9a6f7'); ctx.fillStyle = '#d4a24e'; ctx.fillRect(dx + 2, ddy, 2, 1); }
    else if (d.t === 2) { spr(I_XP, dx, ddy, 6, '#d4a24e'); spr(I_XS, dx, ddy, 6, '#9fe89a'); }   // ICE CREAM — mint scoop on tan cone
    else if (d.t === 3) for (let i = 4; i--;) { ctx.beginPath(); ctx.strokeStyle = ['#ff5d6c','#ff9d3c','#9fe89a','#8cf'][i]; ctx.lineWidth = 1; ctx.arc(dx + 3, ddy + 4 + dy, 2 + i, Math.PI, 0); ctx.stroke(); }
    else if (d.t === 4) for (let i = 5; i--;) { ctx.beginPath(); ctx.strokeStyle = `hsl(${40 + i * 8} 90% ${55 + i * 8}%)`; ctx.lineWidth = 1.5; ctx.arc(dx + 3, ddy + 4 + dy, 3 + i, Math.PI, 0); ctx.stroke(); }
    else if (d.t === 5) { ctx.fillStyle = '#1a1a22'; ctx.fillRect(dx, ddy, 7, 7); spr(SLOTICON[d.s], dx + 1, ddy + 1, 5, PAL[d.c]); ctx.strokeStyle = TC[d.b] || '#ffd75e'; ctx.lineWidth = .75; ctx.strokeRect(dx - .5, ddy - .5, 8, 8); }
    else for (let i = 5; i--;) { ctx.beginPath(); ctx.strokeStyle = `hsl(${40 + i * 8} 90% ${55 + i * 8}%)`; ctx.lineWidth = 1.5; ctx.arc(d.x, d.y + 5 + dy, 3 + i, Math.PI, 0); ctx.stroke(); } // rainbow shard (boss only)
  }
  for (const p of parts) { ctx.globalAlpha = Math.min(1, p.t * 2); ctx.fillStyle = p.c; ctx.fillRect(p.x - 1.5, p.y - 1.5, 3, 3); }
  ctx.globalAlpha = 1;
  for (const f of flies) {
    ctx.globalAlpha = Math.min(1, f.t * 2); ctx.font = (f.big ? 'bold 12px' : '9px') + ' monospace';
    ctx.fillStyle = f.c; ctx.fillText(f.txt, f.x | 0, f.y | 0);
  }
  ctx.globalAlpha = 1;
  ctx.translate((cam.x - so) | 0, (cam.y - so) | 0);            // undo world translate (incl. shake)

  // ---------- HUD (minimalist: HP / mana / xp bars top-left, pause icon top-right) ----------
  if (started && !paused) {
    ctx.textAlign = 'left';
    // TOP-LEFT CLUSTER — HP · mana · xp bars, one visual language: continuous fill,
    // numbers INSIDE the bar (WoW/MOBA unit-frame pattern — no extra screen real
    // estate) + a fighting-game "damage chip" ghost on HP that drains after hits.
    const bw = 90, bx = 8;
    dHP = dHP < hp ? hp : dHP + (hp - dHP) * .08;                   // chip lingers on damage, snaps on heal
    ctx.fillStyle = '#2a2a33'; ctx.fillRect(bx, 6, bw, 11);         // HP track
    ctx.fillStyle = '#ffb0b0'; ctx.fillRect(bx, 6, bw * dHP / mHP(), 11);   // ghost chip
    ctx.fillStyle = '#ff5d6c'; ctx.fillRect(bx, 6, bw * hp / mHP(), 11);    // HP fill
    ctx.strokeStyle = '#1a1a22'; ctx.lineWidth = 1; ctx.strokeRect(bx - .5, 5.5, bw + 1, 12);
    ctx.fillStyle = '#2a2a33'; ctx.fillRect(bx, 19, bw, 9);         // mana track (no notches — too dense at high MAG)
    ctx.fillStyle = '#e08ae0'; ctx.fillRect(bx, 19, bw * mn / mMN(), 9);
    ctx.strokeRect(bx - .5, 18.5, bw + 1, 10);
    ctx.fillStyle = '#2a2a33'; ctx.fillRect(bx, 31, bw, 3);         // xp strip (no text — level is less urgent)
    ctx.fillStyle = lvl >= CAP ? '#ffd75e' : '#9fe89a'; ctx.fillRect(bx, 31, lvl >= CAP ? bw : bw * xp / need(), 3);
    ctx.textAlign = 'center'; ctx.font = 'bold 8px monospace'; ctx.fillStyle = '#fff';
    T2(hp + '/' + mHP(), bx + bw / 2, 15);
    T2((mn | 0) + '/' + mMN(), bx + bw / 2, 26);
    // TOP-RIGHT — pause icon (48px+ tap zone handled in pointerdown)
    ctx.textAlign = 'right'; ctx.fillStyle = '#888'; ctx.font = 'bold 13px monospace';
    T2('☰', VW - 10, 18);
    // Overlay narrator removed per design pivot. NPC dialog uses its own bubble.
    if (time < bann) {                                          // BOSS BANNER — arena-entry announcement (fonts reuse existing literals)
      ctx.textAlign = 'center'; ctx.fillStyle = '#ffd75e'; ctx.font = 'bold 13px monospace';
      T2(bTxt, VW / 2, 58);
      if (bSub) { ctx.font = 'bold 8px monospace'; ctx.fillStyle = '#fff'; T2(bSub, VW / 2, 68); }
    }
    if (deathT > 0) { ctx.fillStyle = `rgba(0,0,0,${1 - Math.abs(deathT - .8) / .8})`; ctx.fillRect(0, 0, VW, VH); }
  }

  // HEARTH DIALOG OVERLAY — view-space bubble, keyboard nav + touch row-tap. Universal JUMP=confirm, MELEE=back.
  if (dialog && started) {
    const rows = ['1 TALK', '2 REST'];
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(8,6,12,.96)'; ctx.fillRect(VW / 2 - 70, 44, 140, 46);
    ctx.strokeStyle = '#ffd75e'; ctx.lineWidth = 1; ctx.strokeRect(VW / 2 - 70, 44, 140, 46);
    ctx.fillStyle = '#ffe08a'; ctx.font = 'bold 8px monospace'; ctx.fillText('THE SAGE', VW / 2, 54);
    ctx.font = 'bold 8px monospace';
    for (let i = 0; i < 2; i++) {
      if (dialog === i + 1) { ctx.fillStyle = 'rgba(255,215,94,.14)'; ctx.fillRect(VW / 2 - 60, 58 + i * 14, 120, 12); }
      ctx.fillStyle = dialog === i + 1 ? '#ffd75e' : '#ccc';
      ctx.fillText(rows[i], VW / 2, 67 + i * 14);
    }
    ctx.fillStyle = '#888'; ctx.font = 'bold 8px monospace';
    ctx.fillText(touch ? 'tap row · ← back' : '↕ select · ▲ confirm · ⚔ back', VW / 2, 100);
  }

  // CHARACTER SHEET overlay — pause (view) + level-up ALLOCATION (spend points).
  // Both share the split-panel layout; allocation mode adds ‹ › cursor + skill-unlock rows.
  if ((paused || choosing) && started) {
    const alloc = !!choosing;
    // Alloc mode borrows the NAME line above the box for its banner
    portraitPanel(alloc ? 'LEVEL UP · ' + pending + ' PT' + (pending > 1 ? 'S' : '') : pName);
    ctx.textAlign = 'center';
    // EQUIPMENT — 4 slots INSIDE the gold box, cornered around the unicorn
    // (anatomy map: MANE top-left, HORN top-right, BODY bottom-left, HOOVES bottom-right)
    ctx.font = 'bold 8px monospace';
    // Mirror-symmetric: left boxes 10px from left wall (x24), right boxes 10px from
    // right wall (x130 = 154−10−14). Labels center under each box → length self-adjusts.
    [['MANE', 24, 74, 1], ['HORN', 130, 74, 2], ['BODY', 24, 122, 0], ['HOOVES', 130, 122, 3]].forEach(([lb, ex, ey, s]) => {
      ctx.fillStyle = eq[s] ? PAL[eq[s].c] : '#2a2a33'; ctx.fillRect(ex, ey, 14, 14);
      ctx.strokeStyle = eq[s] && eq[s].b ? TC[eq[s].b] : '#555'; ctx.lineWidth = .5; ctx.strokeRect(ex, ey, 14, 14);
      ctx.fillStyle = '#888'; T2(lb, ex + 7, ey + 21);
      if (eq[s] && eq[s].b) { ctx.fillStyle = '#fff'; T2('+' + eq[s].b, ex + 7, ey + 10); }
    });
    // STATS — one row across the bottom of the box; alloc cursor = gold column
    const SL = [['STR', ho, '#ffd75e'], ['HP', he, '#ff5d6c'], ['MAG', sp, '#e08ae0'], ['DEF', df, '#8cf'], ['LCK', lk, '#9fe89a']];
    SL.forEach(([l, v, c], i) => {
      const sx = 22 + i * 26, sel = alloc && i === aRow;
      if (sel) { ctx.fillStyle = 'rgba(255,215,94,.14)'; ctx.fillRect(sx - 3, 162, 25, 23); ctx.strokeStyle = '#ffd75e'; ctx.lineWidth = 1; ctx.strokeRect(sx - 3, 162, 25, 23); }
      ctx.fillStyle = c; ctx.font = 'bold 8px monospace'; T2(l, sx + 9, 170);
      ctx.font = 'bold 8px monospace'; T2(v, sx + 9, 181);
    });
    // INVENTORY — visible bag squares UNDER the gold box (5 per row; SADDLEBAGS adds row 2)
    for (let i = 0; i < invMax; i++) {
      const ix = 22 + (i % 5) * 26, iy = 196 + ((i / 5) | 0) * 18, it = inv[i];
      ctx.fillStyle = it ? PAL[it.c] : 'rgba(255,255,255,.05)'; ctx.fillRect(ix, iy, 12, 12);
      ctx.strokeStyle = it && it.b ? TC[it.b] : '#555'; ctx.lineWidth = .5; ctx.strokeRect(ix, iy, 12, 12);
    }
    // (BAG count label removed 2026-08-29 — the empty squares ARE the count)
    // 3-COLUMN SKILL TREE — the ENTIRE right side is the tree's now
    ctx.textAlign = 'left'; ctx.font = 'bold 8px monospace';
    if (spts) { ctx.fillStyle = '#ffd75e'; ctx.font = 'bold 8px monospace'; ctx.fillText(spts + ' PT' + (spts > 1 ? 'S' : ''), 420, 42); }
    // ONE CONSTELLATION TREE: pass 1 draws every prereq line (under), pass 2 the boxes
    // (over) — diagonals tuck behind boxes. Tier rows top→bottom, no branch anything.
    ctx.font = 'bold 8px monospace'; ctx.textAlign = 'left';
    ctx.lineWidth = 1;
    TREE.forEach(([nm, req], i) => {
      if (req < 0) return;
      const [cx, cy] = TPOS[i], [px, py] = TPOS[req];
      ctx.strokeStyle = su[req] ? '#888' : '#2a2a33';              // paths LIGHT UP as prereqs are bought (Elder-Scrolls reveal); unlit ≈ invisible
      ctx.beginPath(); ctx.moveTo(px + 36, py + 3); ctx.lineTo(cx + 36, cy - 9); ctx.stroke();
    });
    TREE.forEach(([nm, req], i) => {
      const [cx, cy] = TPOS[i];
      const locked = req >= 0 && !su[req], can = spts > 0 && !su[i] && !locked, col = locked ? '#555' : '#ccc';
      ctx.fillStyle = '#1a1a22'; ctx.fillRect(cx - 2, cy - 9, 76, 12);                 // OPAQUE base — pathway lines hide behind boxes
      ctx.fillStyle = su[i] ? 'rgba(255,215,94,.14)' : 'rgba(255,255,255,.05)'; ctx.fillRect(cx - 2, cy - 9, 76, 12);
      ctx.strokeStyle = su[i] ? '#ffd75e' : col; ctx.lineWidth = su[i] ? 1 : .5; ctx.strokeRect(cx - 2, cy - 9, 76, 12);
      ctx.fillStyle = su[i] ? '#ffd75e' : col; ctx.fillText(nm, cx + 2, cy);
      if (can) { ctx.strokeStyle = '#ffd75e'; ctx.lineWidth = 1; ctx.strokeRect(cx - 3, cy - 10, 78, 14); }   // buyable glow ring
    });
    // Footer — shard tally under the tree; equipment + bag now live on the LEFT side
    ctx.textAlign = 'center'; ctx.font = 'bold 8px monospace';
    ctx.fillStyle = '#ffd75e'; T2('RAINBOW SHARDS · ' + shards() + ' / 5', 300, 250);
    // SAVE / SAVE & EXIT — clickable (no hotkeys required); save = write slot ONLY
    ctx.font = 'bold 8px monospace';
    [[24, 64, 'SAVE'], [96, 72, 'SAVE & EXIT']].forEach(([bx, bw, lb]) => {
      ctx.strokeStyle = '#ffd75e'; ctx.lineWidth = 1; ctx.fillStyle = 'rgba(255,215,94,.14)';
      ctx.fillRect(bx, 236, bw, 16); ctx.strokeRect(bx, 236, bw, 16);
      ctx.fillStyle = '#ffd75e'; T2(lb, bx + bw / 2, 247);
    });
    if (time < svT) { ctx.fillStyle = '#9fe89a'; T2('SAVED', 96, 230); }
    ctx.fillStyle = '#666'; ctx.font = 'bold 8px monospace';
    T2(alloc ? '↑↓ pick · ↵ spend' : 'tap skill to buy · P close', VW / 2, VH - 4);
  }

  // action buttons — hidden during pause / level-up (dedicated overlays own the input)
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
      ctx.fillStyle = b.col; ctx.font = 'bold 18px monospace';    // glyph fills the disc (was 14px — read as tiny)
      ctx.fillText(b.l, b.x, b.y + 6);
      if (!touch && b.h) {                                        // key hint for desktop users
        ctx.globalAlpha = .7; ctx.fillStyle = '#ccc'; ctx.font = 'bold 8px monospace';
        ctx.fillText(b.h, b.x, b.y - b.r - 3);
      }
    }
    ctx.globalAlpha = 1;
  }
  // joystick — persistent base; knob tracks thumb; brightens while held. ALSO
  // shown during dialog + level-up so the stick can navigate those menus.
  if (started && touch && !paused) {
    const act = joy.id >= 0;
    ctx.globalAlpha = act ? .6 : .35;
    ctx.fillStyle = 'rgba(15,15,20,.75)';
    ctx.beginPath(); ctx.arc(joy.x, joy.y, JR, 0, 7); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(joy.x, joy.y, JR, 0, 7); ctx.stroke();
    ctx.globalAlpha = act ? .9 : .5; ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(joy.x + joy.dx, joy.y + joy.dy, KR, 0, 7); ctx.fill();
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
    ['#ff5d6c', '#ff9d3c', '#ffd75e', '#9fe89a', '#8cf', '#c47fe0', '#c9a6f7'].forEach((c, i) => {
      ctx.strokeStyle = c; ctx.beginPath(); ctx.arc(VW / 2, 130, 78 - i * 3, Math.PI, 0); ctx.stroke();
    });
    // Centered white unicorn silhouette (default palette look — pre-customization)
    const bob = Math.sin(time * 1.6) * 1;
    ctx.save(); ctx.translate(VW / 2, 108); ctx.scale(2.4, 2.4);
    ctx.fillStyle = '#f5f1f4';
    ctx.fillRect(-6, bob, 12, 7); ctx.fillRect(2, bob - 4, 5, 5);
    ctx.fillStyle = '#ffd75e'; ctx.beginPath();
    ctx.moveTo(5, bob - 4); ctx.lineTo(9, bob - 10); ctx.lineTo(6, bob - 3); ctx.fill();
    ['#ff5d6c', '#ffd75e', '#6bc5ff'].forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(-8 - i * 2, bob + i, 2, 4); });
    ctx.fillStyle = '#333'; ctx.fillRect(4, bob - 2, 1, 1);
    ctx.restore();
    // Title + subtitle
    const hue = (time * 30) % 360, br = 1 + Math.sin(time * 2) * .02;
    ctx.textAlign = 'center';
    ctx.save(); ctx.translate(VW / 2, 168); ctx.scale(br, br);
    ctx.fillStyle = `hsl(${hue} 70% 62%)`; ctx.font = 'bold 30px monospace'; ctx.fillText('UNI-CORN', 0, 0);
    ctx.restore();
    ctx.fillStyle = '#ffd75e'; ctx.font = 'bold 13px monospace'; ctx.fillText('the last savior', VW / 2, 188);
    // Title art above stays in EVERY mode — menu / name entry / slot select swap below it.
    if (tMode === 1) {                                             // NAME ENTRY
      const nm = ent + (Math.sin(time * 4) > 0 && ent.length < 8 ? '_' : '');
      ctx.fillStyle = '#888'; ctx.font = 'bold 8px monospace'; ctx.fillText('NAME YOUR UNICORN', VW / 2, 206);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 13px monospace'; ctx.fillText(nm || '(type A–Z)', VW / 2, 224);
      ctx.strokeStyle = '#ffd75e'; ctx.lineWidth = 1; ctx.fillStyle = 'rgba(255,215,94,.14)';
      ctx.fillRect(VW / 2 - 60, 236, 120, 20); ctx.strokeRect(VW / 2 - 60, 236, 120, 20);
      ctx.fillStyle = '#ffd75e'; ctx.fillText('▶ BEGIN', VW / 2, 250);
      ctx.fillStyle = '#666'; ctx.font = 'bold 8px monospace';
      ctx.fillText('A–Z name · ENTER or tap BEGIN · ESC back', VW / 2, 266);
    } else if (tMode === 2) {                                      // SLOT SELECT — name + level per slot
      ctx.font = 'bold 13px monospace';
      for (let i = 0; i < 4; i++) {
        const m = i < 3 ? sMeta(i) : 0, on = sSel === i, y = 206 + i * 16;
        ctx.fillStyle = on ? '#ffd75e' : (i < 3 && !m && !slotNew) ? '#555' : '#888';
        ctx.fillText(i === 3 ? '← BACK' : 'SLOT ' + (i + 1) + ' · ' + (m || 'EMPTY'), VW / 2, y);
        if (on) ctx.fillText('▶', VW / 2 - 90, y);
      }
      ctx.fillStyle = '#666'; ctx.font = 'bold 8px monospace';
      ctx.fillText(slotNew ? 'pick a slot for the new game' : 'pick a save to continue', VW / 2, 266);
    } else {                                                       // MENU
      const opts = hasSave() ? ['NEW GAME', 'CONTINUE'] : ['NEW GAME'];
      opts.forEach((o, i) => {
        const y = 208 + i * 16, on = mSel === i;
        ctx.fillStyle = on ? '#ffd75e' : '#888'; ctx.font = 'bold 13px monospace';
        ctx.fillText(o, VW / 2, y);
        if (on) ctx.fillText('▶', VW / 2 - 72, y);            // cursor in a fixed column — can't skew centering
      });
      ctx.fillStyle = '#666'; ctx.font = 'bold 8px monospace';
      ctx.fillText('↑↓ select · ENTER accept · A/D move · SPACE jump · J dash · L shot · S heal', VW / 2, 266);
    }
  }
  // (character-create screen removed 2026-08-29 — name entry lives ON the title; phase 1 no longer exists)
  ctx.restore();
};

// ---------- loop ----------
// (no boot-time load — saves load when a slot is picked; title reads sMeta only)
cam.x = Math.max(0, Math.min(W * T - VW, pl.x - VW / 2));      // camera starts ON the player (was: panned in from world origin)
cam.y = Math.max(0, Math.min(H * T - VH, pl.y - VH / 2 + 30));
// opening line fires when the player picks a name / picks Continue (see title-menu accept)
const loop = () => {
  const now = performance.now(), dt = Math.min(.033, (now - last) / 1000); last = now;
  step(dt); draw();
  requestAnimationFrame(loop);
};
loop();
