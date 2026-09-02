// UNI-CORN, Hooves of Hope — 2D pixel-art platformer. Canvas 2D, no WebGL.
//
// Design pillars (see OneStone project "uni-corn" for full history + rationale):
//   - Stat allocation (STR/HP/MAG/DEF/LUCK), no classes
//   - 4-slot color-driven equipment gear (BODY/MANE/HORN/HOOVES) — each drop
//     visually IS the body part it replaces (drawPart uses drawU primitives)
//   - ONE open skill tree, 10 single-rank nodes, all player-chosen (no auto-learn)
//   - Rainbow shards = collection goal (5 bosses)
//   - Unified character sheet: pause + level-up share layout
//   - 5-slot inventory (+5 SADDLE BAG, +5 SADDLE BAGS); consumables auto-consume
//     if their stat isn't full else stored for later — click to use, X to drop
//   - HP/MP color-coded: red HP potion + blue MP potion (Diablo convention)
//   - Fixed world palette; sky (#6bc5ff) + grass (#5ac878) RESERVED for background
//
// Build: esbuild → terser → roadroller → inline → zip → ECT → 13,312-byte gate.
//   npm run build   (also runs map audit + tpos-check, logs to SIZELOG.md)
//   wavedash build push -m "message"
//
// Save: strict v34 JSON to localStorage. Version bumps discard prior saves.

import { T, W, H, grid, tile, seeds, DECO, loadZone, groundRow } from './world.js';           // map geometry + tiles + shared ground-snap
import { PAL, TC, mane3, dim, SLOT_STAT, SLOT_LBL, FOECOL, FT, P2, BN, RBC, RC, ZN, ZBG, ZG, TREE, TPOS, I_GEM, I_MP } from './data.js'; // static lookup tables

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
const J_KEYS = ['Space', 'KeyW', 'ArrowUp'];        // JUMP — Space canonical, W (WASD up), ArrowUp (arcade tradition)
const M_KEYS = ['KeyJ'], SH_KEYS = ['KeyL'], HE_KEYS = ['KeyH'];
const keys = new Set();
let jbuf = 0, started = 0, touch = 0;
// ---------- title / name-entry / class-select flow ----------
// phase 0 = title (tMode: menu/name/slots), 2 = playing (started=1).
let phase = 0, ent = '', pName = 'HORSE', mSel = 0;
let tMode = 0, sSel = 0, slot = 0, slotNew = 0; // title mode 0 menu · 1 name · 2 slots; active save slot
// HIDDEN NAME INPUT — the standard mobile-canvas technique: focusing a real <input>
// inside the tap gesture summons the OS keyboard (iOS requires the gesture).
// It is the single source of truth for `ent` while focused; window keydown defers.
const NI = document.body.appendChild(document.createElement('input'));
NI.autocapitalize = 'characters'; NI.autocorrect = 'off'; NI.spellcheck = false;
NI.style.cssText = 'position:fixed;left:-99px;top:0;width:1px;height:1px;font-size:16px;border:0;padding:0';
NI.oninput = () => { ent = NI.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 8); NI.value = ent; };
// 3 SAVE SLOTS (n20_s0..2). sMeta reads name+level for the slot list without loading.
const sMeta = (i) => { try { const d = JSON.parse(localStorage['n20_s' + i] || '0'); return d && d.v === 34 ? d.m + ' · LV' + d.l : 0; } catch { return 0; } };
const hasSave = () => [0, 1, 2].some(sMeta);
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
    if (e.code === 'Backspace')                        { if (ent.length) ent = ent.slice(0, -1); else tMode = 0; }
    else if (ent.length < 8 && /^[a-z]$/i.test(e.key)) ent += e.key.toUpperCase();
    else if (e.code === 'Enter')                       toSlots(1);
    return;
  }
  if (tMode === 2) {                                                   // SLOT SELECT (3 slots + BACK)
    if (e.code === 'ArrowUp' || e.code === 'KeyW')        sSel = (sSel + 3) % 4;
    else if (e.code === 'ArrowDown' || e.code === 'KeyS') sSel = (sSel + 1) % 4;
    else if (e.code === 'Enter' || e.code === 'Space')    pickSlot(sSel);
    else if (e.code === 'Backspace')                      tMode = 0;
    return;
  }
  const opts = hasSave() ? 2 : 1;                                      // NEW GAME · CONTINUE
  if (e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'ArrowDown' || e.code === 'KeyS') mSel = (mSel + 1) % opts;
  else if (e.code === 'Enter' || e.code === 'Space') { if (mSel === 0) toName(); else toSlots(0); }
};
addEventListener('keydown', (e) => {
  if (e.repeat) return;
  if (e.target === NI) {                                       // hidden input owns chars while focused;
    if (e.code === 'Enter' || e.code === 'ArrowDown') NI.blur(); else return;
  }
  if (e.code === 'Space' || e.code.indexOf('Arrow') === 0) e.preventDefault();
  boot();                                                    // resume audio on any key (autoplay policy)
  if (savePop) { if (e.code === 'Enter' || e.code === 'Space' || e.code === 'KeyP') savePop = 0; return; }
  if (helpOn) { helpOn = 0; return; }
  if (phase === 0) return titleKey(e);
  if (choosing) {                                              // LEVEL-UP menu owns input first — no world-interact swallow (Space/W/ArrowUp near hearth/chest)
    const n = STATS.length;
    if (e.code === 'ArrowLeft' || e.code === 'KeyA' || e.code === 'ArrowUp' || e.code === 'KeyW') aRow = (aRow + n - 1) % n;
    else if (e.code === 'ArrowRight' || e.code === 'KeyD' || e.code === 'ArrowDown' || e.code === 'KeyS') aRow = (aRow + 1) % n;
    else if (e.code === 'Enter' || e.code === 'Space') allocate();
    return;
  }
  // Near hearth: JUMP is the universal INTERACT (auto REST)
  if (J_KEYS.includes(e.code) && nearFire) { rest(); return; }
  if (J_KEYS.includes(e.code) && nearChest >= 0) { openChest(nearChest); return; }
  if (J_KEYS.includes(e.code) && nearDoor >= 0) { const d = seeds.doors[nearDoor]; enterZone(d[2], d[3], d[4]); return; }
  keys.add(e.code);
  if (J_KEYS.includes(e.code)) jbuf = .12;
  if (M_KEYS.includes(e.code)) dash();                          // J = dash — the attack verb (contact damage during dash)
  if (SH_KEYS.includes(e.code)) shoot();
  if (e.code === 'KeyP' && deathT <= 0) paused = paused ? 0 : 1;   // P only — Escape exits fullscreen in browsers/Wavedash

});
addEventListener('keyup', (e) => keys.delete(e.code));
const held = (...c) => c.some(k => keys.has(k));
const jumpHeld = () => J_KEYS.some(k => keys.has(k)) || keys.has('bJ'); // button jump gets full hold-height too
const healHeld = () => HE_KEYS.some(k => keys.has(k)) || keys.has('bH');

// ---------- touch overlay (minimal: dpad + JUMP + MELEE + earned skills; JUMP + MELEE contextualize) ----------
// No dedicated hearth buttons — JUMP is the universal interact/confirm, MELEE is back/cancel.
const btns = () => {
  // JUMP ring recolors near interactables (gold = actionable)
  const jc = nearFire || nearChest >= 0 || nearDoor >= 0 ? '#ffd75e' : '#8cf';
  // Fan-arc around bottom-right corner = landscape thumb-reach pattern.
  const b = [
    { x: VW - 36, y: VH - 34, r: 24, c: 'bJ', col: jc },
  ];
  if (su[6]) b.push({ x: VW - 92, y: VH - 30, r: 20, c: 'bM', col: '#ffd75e' });
  if (su[0]) b.push({ x: VW - 78,  y: VH - 78, r: 20, c: 'bS', col: '#c9a6f7' });
  if (su[2]) b.push({ x: VW - 36,  y: VH - 88, r: 20, c: 'bH', col: '#9fe89a' });
  return b;
};
const ptrs = new Map();
const toV = (e) => [(e.clientX * DPR - SOX) / SS, (e.clientY * DPR - SOY) / SS];
// ---------- floating joystick (movement, touch only) ----------
// Persistent base at a home position (operator preference: always visible), but any
// touch in the LEFT 40% re-anchors it under the thumb (Dead Cells floating pattern,
// ~80% player preference per Playdigious postmortem). Snaps home on release.
// Y-axis push-down on joystick = crouch/drop-through platform.
const JHX = 52, JHY = VH - 52, JR = 26, KR = 11, JMX = JR - 8;   // home, base r, knob r, max knob throw
const joy = { x: JHX, y: JHY, dx: 0, dy: 0, id: -1 };

const joySet = () => {                                           // knob offset → digital movement keys
  keys.delete('bL'); keys.delete('bR'); keys.delete('bD'); keys.delete('bU');
  if (joy.dx < -6) keys.add('bL'); else if (joy.dx > 6) keys.add('bR');
  if (joy.dy > 12) keys.add('bD'); else if (joy.dy < -12) keys.add('bU');   // up = menu nav (not jump)
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
  // Save popup — CONTINUE / EXIT GAME
  if (savePop) {
    if (vy >= 136 && vy <= 150 && vx > 160 && vx < 320) { savePop = 0; return; }
    if (vy >= 161 && vy <= 175 && vx > 160 && vx < 320) { save(); paused = 0; helpOn = 0; savePop = 0; started = 0; phase = 0; tMode = 0; mSel = 0; return; }
    return;
  }
  // Help/Settings overlay — SFX button, then dismiss
  if (helpOn) { helpOn = 0; return; }
  // HUD icon taps: Scroll | Floppy | Speaker | ? — SAME row in play AND menu.
  // Scroll TOGGLES the sheet (open when playing, close when open) — no bespoke ✕.
  if (started && !choosing && vx > VW - 78 && vx < VW - 60 && vy < 20) { paused ^= 1; return; }
  if (started && vx > VW - 60 && vx < VW - 42 && vy < 20) { save(); sfx(660, 990, .15, 'triangle', .12); savePop = 1; return; }
  if (started && vx > VW - 42 && vx < VW - 22 && vy < 20) { mute ^= 2; save(); return; }
  if (started && vx > VW - 22 && vy < 20) { helpOn = 1; return; }
  // PAUSE overlay — tap a skill-tree cell to rank up; any other tap closes
  if (paused) {
    const tot = su.reduce((a,v)=>a+v,0);
    for (let i = 0; i < TREE.length; i++) {
      const req = TREE[i][1], [cx, cy] = TPOS[i];
      if (vx >= cx && vx <= cx + 26 && vy >= cy && vy <= cy + 26) {
        const locked = req === -2 ? tot < 2 : req === -3 ? tot < 5 : false;
        if (spts > 0 && !su[i] && !locked) { su[i] = 1; spts--; sfx(660, 990, .15, 'triangle', .12); save(); }
        return;
      }
    }
    // (save/exit on HUD floppy; SFX in help overlay)
    if (vy >= 184 && vy < 184 + 28 * 3 && vx >= 18 && vx < 18 + 28 * 5) {
      const iC = ((vx - 18) / 28) | 0, iR = ((vy - 184) / 28) | 0, iI = iR * 5 + iC;
      if (iI < invMax() && inv[iI]) { invSel = iI; return; }
      invSel = -1; return;
    }
    if (invSel >= 0 && inv[invSel] && vy >= 250 && vy <= 264) {
      if (vx >= 30 && vx <= 80) { useItem(invSel); return; }
      if (vx >= 90 && vx <= 140) { inv.splice(invSel, 1); invSel = -1; return; }
    }
    paused = 0; return;
  }
  if (choosing) {
    // Stat COLUMNS along the gold box bottom (x = 22 + i*26, y 162-185). FIRST tap
    // selects (cursor moves); tap the SELECTED column again to spend — no accidental one-tap.
    // Check BEFORE joystick grab so touch taps on stats aren't intercepted.
    const col = ((vx - 19) / 26) | 0;
    if (vy > 150 && vy < 180 && vx > 19 && vx < 149 && col >= 0 && col < STATS.length) { if (aRow === col) allocate(); else aRow = col; return; }
    // SPEND button — circular tap target at bottom-right (same position as JUMP)
    if (Math.hypot(vx - (VW - 36), vy - (VH - 44)) < 36) { allocate(); return; }
    if (e.pointerType === 'touch' && vx < VW * .3) { grabJoy(vx, vy, e.pointerId); return; }   // stick navigates
    return;
  }
  // JOYSTICK: any touch in the left 40% grabs the stick and re-anchors it there
  if (started && e.pointerType === 'touch' && vx < VW * .4) { grabJoy(vx, vy, e.pointerId); return; }
  for (const b of btns()) if (Math.hypot(vx - b.x, vy - b.y) < b.r + 6) {
    // JUMP button contextualizes: near NPC it's INTERACT, not jump
    if (b.c === 'bJ' && nearFire) { rest(); return; }
    if (b.c === 'bJ' && nearChest >= 0) { openChest(nearChest); return; }
    if (b.c === 'bJ' && nearDoor >= 0) { const d = seeds.doors[nearDoor]; enterZone(d[2], d[3], d[4]); return; }
    ptrs.set(e.pointerId, b.c); keys.add(b.c);
    if (b.c === 'bJ') jbuf = .12;
    if (b.c === 'bM') dash();
    if (b.c === 'bS') shoot();
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
addEventListener('blur', () => { keys.clear(); ptrs.clear(); joyEnd(); });   // focus loss = release everything (stuck-key guard)
addEventListener('contextmenu', (e) => e.preventDefault());                                     // long-press menu suppression (mobile)

// ---------- audio ----------
let AC;
function boot() { if (!AC) AC = new AudioContext(); AC.resume(); }        // audio-only wake — the game only starts when the title menu is accepted
let mute = 0;                                     // bit 1 = sfx mute
// SFX toggle — shown in help overlay. [x, w, labelFn, actionFn]
// SFX toggle is now the speaker HUD icon (tap to mute/unmute)
const sfx = (f0, f1, d, type = 'square', v = .12, dl = 0) => {
  if (mute & 2) return; if (!AC) return; const r = .97 + Math.random() * .06;
  const o = AC.createOscillator(), g = AC.createGain(), t = AC.currentTime + dl;
  o.type = type; o.frequency.setValueAtTime(f0 * r, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(f1 * r, 1), t + d);
  g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.001, t + d);
  o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + d);
};
const fanfare = () => { for (let i = 0; i < 4; i++) sfx(440 * (1 + i * .25), 440 * (1 + i * .25), .1, 'square', .12, i * .07); };

// ---------- RPG: stats, equipment, skill tree ----------
// 5 stats: STR (ATK) HP (max ♥) MAG (max ✦) DEF (dmg reduction) LUCK (crit + drops)
let ho = 1, he = 1, sp = 1, df = 1, lk = 1;       // every stat starts at 1 — no dead stats at creation
// Unicorn part colors — one palette index per body part (0=BODY, 1=MANE, 2=HORN, 3=HOOVES).
// Equipping slot s writes col[s], which drives drawU's fill colors.
let col = [0, 0, 0, 0];
// EQUIPMENT — 4 equipped slots + inventory bag. Items = {t:type, s:slot, c:color, b:bonus}.
// Slot 0=BODY(+HP), 1=MANE(+MAG), 2=HORN(+STR), 3=HOOVES(+DEF). Bonus 0=cosmetic.
const eq = [null, null, null, null];
const inv = [];
const invMax = () => 5 + (su[8] + su[9]) * 5;       // BAG cap: 5 base, +5 SADDLE BAG, +5 SADDLE BAGS
// Equip: apply color + stat bonus. Unequip old item back to inventory if it has a bonus.
const equip = (item) => {
  const old = eq[item.s];
  if (old && old.b > 0 && inv.length < invMax()) inv.push(old);  // stash old if it had stats
  eq[item.s] = item;
  col[item.s] = item.c;                            // update unicorn color
  eqB = eq.map(e => e ? e.b : 0);
};
// Use an inventory slot — equip gear (t=5), consume HP/MP potion (t=0/1). Returns true if consumed.
const useItem = (i) => {
  const it = inv[i]; if (!it) return;
  if (it.t === 5) { inv.splice(i, 1); equip(it); sfx(660, 880, .12, 'triangle', .1); }
  else if (it.t === 0 && hp < mHP()) { hp = Math.min(mHP(), hp + 3); inv.splice(i, 1); sfx(520, 1040, .1, 'triangle', .1); }
  else if (it.t === 1 && mn < mMN()) { mn = Math.min(mMN(), mn + 3); inv.splice(i, 1); sfx(440, 880, .1, 'triangle', .1); }
  invSel = -1;
};
// Cached equipment bonuses (additive on top of base stats)
let eqB = [0, 0, 0, 0];
// GUARD: gear-drop color range in spawnDrop (`4 + Math.random() * 11`) is coupled to
// PAL.length (15) — indices 4..14. tpos-check.mjs enforces this pairing.
// Outline text helper (module-scope so pause overlay AND creation portrait can both use it)
const T2 = (t, x, y) => { ctx.strokeStyle = 'rgba(0,0,0,.7)'; ctx.lineWidth = 1; ctx.strokeText(t, x, y); ctx.fillText(t, x, y); };
// Stat bar: dark track + coloured fill to `frac` (0..1). Shared by portrait, HUD, boss/tier bars.
const bar = (x, y, w, h, frac, c) => { ctx.fillStyle = '#2a2a33'; ctx.fillRect(x, y, w, h); ctx.fillStyle = c; ctx.fillRect(x, y, w * frac, h); };
// Shared portrait panel — renders the identity card (title bar, bordered box with
// HP bar at top, live unicorn silhouette) used by both the PAUSE overlay and the
// CHARACTER-CREATE screen. Title = player name on PAUSE, 'NEW CHARACTER' on create.
const portraitPanel = (title) => {
  ctx.fillStyle = '#1e1928'; ctx.fillRect(0, 0, VW, VH);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd75e'; ctx.font = 'bold 13px monospace'; T2(title, 84, 24);   // NAME · LV n on one line (same font), above the bars — no overlap
  ctx.font = 'bold 8px monospace';
  const bx2 = 50, bw2 = 68;
  bar(bx2, 34, bw2, 10, hp / mHP(), '#ff5d6c');
  ctx.strokeStyle = '#1a1a22'; ctx.strokeRect(bx2 - .5, 33.5, bw2 + 1, 11);
  ctx.fillStyle = '#fff'; T2(hp + '/' + mHP(), bx2 + bw2 / 2, 42);
  bar(bx2, 47, bw2, 8, mn / mMN(), '#4a76ff');
  ctx.strokeStyle = '#1a1a22'; ctx.strokeRect(bx2 - .5, 46.5, bw2 + 1, 9);
  ctx.fillStyle = '#fff'; T2(mn + '/' + mMN(), bx2 + bw2 / 2, 54);
  const atCap = lvl >= CAP;
  bar(bx2, 58, bw2, 3, atCap ? 1 : xp / need(), atCap ? '#ffd75e' : '#9fe89a');
  ctx.save(); ctx.translate(84, 96); ctx.scale(2.6, 2.6); ctx.translate(-6, -8);
  drawU(0);
  ctx.restore();
};
// draw the player unicorn geometry — used by in-game player render + pause portrait.
// scale sets pixel scale. All colors come from col[0..3] (body/mane/horn/hooves).
const drawU = (bob) => {
  ctx.fillStyle = PAL[col[3]];                                                                      // hooves (whole leg)
  ctx.fillRect(1, 12 + bob * .3, 2, 4 - bob * .3); ctx.fillRect(7, 12 - bob * .3, 2, 4 + bob * .3);
  ctx.fillStyle = PAL[col[0]]; ctx.fillRect(0, 5, 10, 7); ctx.fillRect(7, 0, 5, 6);                 // body + head
  ctx.fillRect(-2, 6, 2, 4); ctx.fillRect(-3, 9, 2, 2);                                              // TAIL — 2-segment: base + half-height sweep down-left
  ctx.fillStyle = PAL[col[2]]; ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(14, -5); ctx.lineTo(12, 1); ctx.fill(); // horn
  mane3(col[1]).forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(5 - i * 2, 1 + i * 2, 2, 4); });// mane 3-color
  ctx.fillStyle = '#333'; ctx.fillRect(10, 2, 1.5, 1.5);                                            // eye
  // EQUIPMENT — a geared part wears a tier trim (colour = which gear, trim = level).
  const et = s => eq[s] ? TC[eq[s].b] : 0, a3 = et(3), a0 = et(0), a2 = et(2), a1 = et(1);
  if (a3) { ctx.fillStyle = a3; ctx.fillRect(1, 15, 2, 1); ctx.fillRect(7, 15, 2, 1); }              // hoof cuffs
  if (a0) { ctx.fillStyle = a0; ctx.fillRect(0, 5, 10, 1); }                                         // barding stripe
  if (a2) { ctx.fillStyle = a2; ctx.fillRect(9, 0, 2, 1); }                                          // horn ring
  if (a1) { ctx.fillStyle = a1; ctx.fillRect(5, 1, 2, 1); }                                          // mane spark
};
let hp = 10, xp = 0, lvl = 1;
let mn = 5, choosing = 0, pending = 0;
const CAP = 15;                                   // hard level cap. L15 APOTHEOSIS: +2 ATK, +2 max HP
// Skills are player-chosen via the 3-tier tree
let hs = 0, shk = 0;                              // combat feel: hitstop freeze + screen shake, both in seconds
// Boss state: 0=unvisited, 1=on screen, 2=killed(shard taken), {hp,ph,spd,rc}=leash stash
const bs = [0, 0, 0, 0, 0];
const shards = () => bs.filter(v => v === 2).length;
const mHP = () => 8 + (he + eqB[0]) * 2 + (lvl >= CAP ? 2 : 0); // body eq boosts HP
const mMN = () => 3 + (sp + eqB[1]) * 2;                        // mane eq boosts MAG
const ATK = () => ho + eqB[2] + (lvl >= CAP ? 2 : 0);    // STR + horn gear + apotheosis
const critChance = () => .08 + lk * .02;                      // 10% base + 2% per LUCK (LUCK 1 = 10%)
const isCrit = () => Math.random() < critChance();
const need = () => lvl * lvl + 12;
const gainXp = (n, x, y) => {
  if (lvl >= CAP) return;
  xp += n; fly(x, y, '+' + n + ' XP', '#9fe89a');
  while (xp >= need() && lvl < CAP) {
    xp -= need(); lvl++; pending += 3; spts++;    // EVERY LEVEL: +3 stat pts, +1 skill pt
    fly(pl.x, pl.y - 40, 'LEVEL UP · LV ' + lvl, '#ffd75e', 1);
    fly(pl.x, pl.y - 28, '+1 SKILL', '#8cf');
    if (lvl === CAP) { fly(pl.x, pl.y - 52, 'APOTHEOSIS', '#ffd75e', 1); hp = mHP(); }
  }
  if (lvl >= CAP) xp = 0;
  if (pending && !choosing) { choosing = 1; aRow = 0; navT = .4; fanfare(); }   // navT swallows held stick input on open
};
// STATS — [name, applyFn]. Colors live inline in the SL render array (below).
const STATS = [
  ['STR', () => ho++],
  ['HP', () => { he++; hp += 2; }],
  ['MAG', () => { sp++; mn += 2; }],
  ['DEF', () => df++],
  ['LUCK', () => lk++],
];

// spts = skill points banked · su = per-node purchase count (0/1 for single-rank tree)
let spts = 0; const su = Array(TREE.length).fill(0);
let aRow = 0;
const allocate = () => {
  if (!pending) return;
  STATS[aRow][1](); pending--;
  fly(pl.x, pl.y - 14, STATS[aRow][0] + '!', '#ffd75e', 1); sfx(660, 990, .15, 'triangle', .12);
  if (!pending) { choosing = 0; if (spts > 0) paused = 1; save(); }
};

// ---------- save (single-char keys — terser mangle-props law) ----------
const save = () => {
  localStorage['n20_s' + slot] = JSON.stringify({
    v: 34, h: hp, x: xp, l: lvl, n: mn, g: bs.map(v => v === 2 ? 2 : 0),
    t: [ho, he, sp, df, lk], c: [cp[0], cp[1]], d: pending, k: spts, y: su,
    m: pName, o: oc, z: curZone,
    u: col,
    q: eq, i: inv, p: mute,
  });
};
const load = () => {
  try {
    const d = JSON.parse(localStorage['n20_s' + slot] || '0');
    if (!d || d.v !== 34) return;                               // strict v34 gate — no cross-version compat.
    hp = d.h; xp = d.x; lvl = d.l; mn = d.n;
    d.g.forEach((v, i) => bs[i] = v); pName = d.m; oc = d.o;
    curZone = d.z | 0; loadZone(curZone);
    chests = seeds.chests.map(snapChest);
    foes = seeds.foes.map(([x, y, k]) => mkFoe(x * T, y * T, k));
    [ho, he, sp, df, lk] = d.t;
    col = d.u;
    cp = d.c; pl.x = cp[0]; pl.y = cp[1];
    pending = d.d; if (pending) { choosing = 1; aRow = 0; }        // unspent stat points survive reload
    spts = d.k; d.y.forEach((v, i) => su[i] = v);
    d.q.forEach((v, i) => eq[i] = v);
    inv.length = 0; d.i.forEach(v => inv.push(v));
    eqB = eq.map(e => e ? e.b : 0); mute = d.p | 0;
  } catch (e) { /* fresh oath */ }
};

// ---------- player ----------
const PW = 10, PH = 14;
const SX = 126 * T, SY = 57 * T;                  // spawn point (paddock)
const pl = { x: SX, y: SY, vx: 0, vy: 0, ground: 0, face: 1, coyote: 0, air: 0, sq: 1, inv: 0, t: 0 };
let cp = [SX, SY], lastSafe = [SX, SY], deathT = 0;
let chT = 0, nearFire = 0, nearDoor = -1;         // proximity flags: hearth, doorway
let curZone = 0, zBann = 0, zFade = 0;            // active zone id, banner timer, fade timer
let paused = 0, helpOn = 0, savePop = 0;            // pause overlay; help overlay; save popup (shows EXIT GAME)
let invSel = -1;                                  // selected inventory slot (-1 = none) — first click selects, second click on same slot uses/equips
// HEARTH ACTION — JUMP-near-fire = auto REST: full heal + checkpoint + save + welcome-boon on first touch.
const rest = () => {
  const [fx, fy] = seeds.fires[0];
  hp = mHP(); cp = [fx * T - 20, (fy - 1) * T];
  burst(fx * T, fy * T - 8, 12, '#ffd75e'); sfx(500, 900, .3, 'triangle', .1);
  fly(pl.x, pl.y - 16, 'SAVED', '#9fe89a', 1);
  save();
};
// ZONE TRANSITION — swap grid to target zone, teleport player, reset transient state.
// Called from doorway JUMP-interact. Boss/chest persistence lives in bs[] / oc bitfield.
const enterZone = (tz, sx, sy) => {
  loadZone(tz); curZone = tz;
  chests = seeds.chests.map(snapChest);
  foes = seeds.foes.map(([x, y, k]) => mkFoe(x * T, y * T, k));
  pl.x = sx * T; pl.y = sy * T; pl.vx = pl.vy = 0; pl.ground = 0;
  cp = [pl.x, pl.y]; lastSafe = [pl.x, pl.y];
  drops.length = shots.length = fbolts.length = flies.length = parts.length = 0;
  zBann = time + 2.5; zFade = time + .3;             // banner + brief fade
  save();
};
// Chest reward: item shower + full heal. LUCK adds drops.
const openChest = (i) => {
  if (oc & (1 << (curZone * 6 + i))) return;
  oc |= 1 << (curZone * 6 + i);
  const c = chests[i]; hp = mHP();
  spawnDrop(c.x, c.y, 2);
  burst(c.x, c.y - 4, 18, '#ffd75e'); sfx(660, 990, .15, 'triangle', .12);
  fly(c.x + 6, c.y - 4, '+HEAL', '#9fe89a');
  save();
};
let dashT = 0, dashCd = 0, adash = 0, dropT = 0, navT = 0;   // navT = menu-nav repeat clock (joystick)
// FIXED physics — never stat-scaled: the map gate proofs depend on these numbers
const G_RISE = 750, G_FALL = 1500, FALLCAP = 400;
const RUN = 115, V0 = 250;

const solid = (x, y) => { const v = tile(x / T | 0, y / T | 0); return v === 1 || v === 4; }; // cracked wall (4) is solid until hit
const smash = (px, py) => { const tc = px / T | 0, tr = py / T | 0; if (tile(tc, tr) !== 4) return; for (let j = tr - 1; j <= tr + 1; j++) for (let i = tc - 1; i <= tc + 1; i++) if (tile(i, j) === 4) { grid[j * W + i] = 0; burst(i * T + 8, j * T + 8, 5, '#a08060'); } sfx(900, 220, .2, 'square', .1); };
const spike = (x, y) => tile(x / T | 0, y / T | 0) === 3;

// ---------- entities ----------
// Chests: exploration rewards. `oc` bitfield tracks opened state per-zone (bit = zone*8 + i).
const snapChest = ([x, y], i) => ({ x: x * T, y: groundRow((x * T + 4) / T | 0, y | 0) * T - 5, i });  // seat base on surface row below seed (shared groundRow); -5: body renders to c.y+5
let chests = seeds.chests.map(snapChest);
let oc = 0, nearChest = -1;                       // opened bitfield · which chest index the player is standing on (-1 = none)
// FULL progression reset — NEW GAME zeroes every globals so it can't inherit prior saved state.
const fresh = () => {
  hp = 10; xp = 0; lvl = 1; mn = 5; bs.fill(0);
  eq.fill(null); inv.length = 0; eqB = [0, 0, 0, 0];
  pending = 0; choosing = 0; ho = he = sp = df = lk = 1; col = [0, 0, 0, 0];
  oc = 0; pName = 'HORSE';
  spts = 0; su.fill(0);
  curZone = 0; loadZone(0);
  chests = seeds.chests.map(snapChest);
  foes = seeds.foes.map(([x, y, k]) => mkFoe(x * T, y * T, k));
  cp = [SX, SY]; lastSafe = [SX, SY]; pl.x = SX; pl.y = SY; pl.vx = pl.vy = 0;
};
// Non-ranged foes roll a strength tier in mkFoe (0 base / 1 tough / 2 select). Boss banner state:
let bann = 0, bTxt = '', bSub = '';
// Zone tier 0-4 from world x position. Scales enemy HP and damage.
const zT = x => Math.max(0, Math.min(4, (150 - x / T) / 35 | 0));
const mkFoe = (x, y, k) => {
  // ENEMY TIER (tr): 0 base · 1 tough · 2 select — a random strength organization layered ON TOP of
  // zone tier t. Non-ranged only (ranged foes stay base). ~75% base / 19% tough / 6% select (tunable).
  const [fh, fd, fv, fz, fb] = FT[k], fr = fb & 1, t = curZone || zT(x), tr = fr ? 0 : Math.random() < .06 ? 2 : Math.random() < .2 ? 1 : 0;
  const zh = fh * (1 + tr) * (2 + t) / 2 | 0;                    // HP ×(1+tr): tough 2×, select 3×
  return { x, y, k, cap: fb, vx: fv * (.85 + Math.random() * .3) * (Math.random() < .5 ? 1 : -1), hp: zh, mx: zh, dm: fd + tr + t, tr, fl: 0, t: Math.random() * 7, cz: fz + (tr > 1 ? 1 : 0) };
};
let foes = seeds.foes.map(([x, y, k]) => mkFoe(x * T, y * T, k));
const fsz = (f) => 5 * (f.cz || 1 + f.k);          // one size rule for sprites + collision
const shots = [], flies = [], parts = [], fbolts = [], drops = [];
const fly = (x, y, txt, c, big) => flies.push({ x, y, txt, c, big, t: 1.2 });
const burst = (x, y, n, c) => { for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, s = 40 + Math.random() * 80; parts.push({ x, y, vx: Math.sin(a) * s, vy: Math.cos(a) * s - 60, t: .5 + Math.random() * .4, c }); } };
const rburst = (x, y, n) => { for (let i = 0; i < n; i++) burst(x, y, 1, RC[(Math.random() * 7) | 0]); };
// Rainbow gem — I_GEM bitmask (data.js) drawn with spr(), colour cycling via HSL.
const drawGem = (x, y, t) => { spr(I_GEM, x, y, 6, `hsl(${(t * 90) % 360} 80% 60%)`); ctx.fillStyle = '#fff'; ctx.fillRect(x + 2, y + 1, 1, 1); };
// ITEM DROPS — physical pickups from kills/chests.
// Types: 0 HP potion (+3 HP), 1 MP potion (+3 MP), 5 gear. Shards are progression-only (bs[i]=2, not drops).
// LUCK adds +1 drop per pip.

// Pixel sprites (bitmask rows, MSB-left). Shared 1-bit decoder: spr(data, x, y, w, col)
const spr = (d, x, y, w, c) => { ctx.fillStyle = c; for (let r = 0; r < d.length; r++) for (let b = w; b--;) d[r] >> b & 1 && ctx.fillRect(x + w - 1 - b, y + r, 1, 1); };
// CONSUMABLE icon — ONE potion bottle (I_MP bitmask, data.js) for every consumable;
// the fill color tells what it heals: red = HP (#ff5d6c bar), blue = MP (#4a76ff bar).
// The cork is a dark-brown 2×1 rect painted on top at the pickup site.
// GEAR icons — REUSE drawU's exact body-part primitives (visual consistency: the drop IS the part).
// s=0 BODY (torso + head + tail nub) · s=1 MANE (3-color cascade) · s=2 HORN (triangle) · s=3 HOOVES (two legs, back one higher)
const drawPart = (s, x, y, c) => {
  ctx.fillStyle = PAL[c];
  if (s === 0) { ctx.fillRect(x, y+2, 6, 4); ctx.fillRect(x+4, y, 4, 4); ctx.fillRect(x-1, y+3, 1, 2); }
  else if (s === 2) { ctx.beginPath(); ctx.moveTo(x+3, y); ctx.lineTo(x+6, y+6); ctx.lineTo(x+1, y+6); ctx.fill(); }
  else if (s === 3) { ctx.fillRect(x, y+1, 2, 5); ctx.fillRect(x+3, y, 2, 5); }
  else mane3(c).forEach((mc, i) => { ctx.fillStyle = mc; ctx.fillRect(x + 4 - i * 2, y + i * 2, 2, 3); });
};
// ONE loot table: HP POTION floor → MP POTION → GEAR (LUCK lifts roll, raising tier & frequency).
// Bosses grant their shard as a progression token on first kill (auto-collected, not a drop).
const spawnDrop = (x, y, n) => {
  for (let i = 0; i < n; i++) {
    const d = { x, y: y - 4, vx: (Math.random() - .5) * 80, vy: -90 - Math.random() * 50, t: 0, life: 10, grace: .6 };
    const r = (Math.random() * 100 | 0) + Math.min(lk, 10) * 4;  // % roll + LUCK
    // gear tier: random roll + LUCK + level vs thresholds
    if (r >= 85) { d.t = 5; d.s = Math.random() * 4 | 0; d.c = (4 + Math.random() * 11) | 0; const t = (1 + Math.random() * 20 | 0) + (lk >> 1) + (lvl >> 2); d.b = t >= 24 ? 3 : t >= 17 ? 2 : 1; }
    else if (r >= 58) d.t = 1;                  // MP POTION (else t=0: HP POTION)
    drops.push(d);
  }
};

const strike = (f, gen, viaStomp) => {
  const crit = isCrit(), dmg = ATK() * (crit ? 2 : 1);
  f.hp -= dmg; f.fl = .15;
  if (!f.bit && !viaStomp) f.vx += (crit ? 220 : 140) * (f.x > pl.x ? 1 : -1); // KNOCKBACK — bosses hold their arena
  shk = Math.max(shk, crit ? .22 : .09);
  fly(f.x, f.y - 8, (crit ? 'CRIT ' : '') + '-' + dmg, crit ? '#ffd75e' : '#ff5d6c', crit);
  if (crit) { hs = .06; fanfare(); burst(f.x, f.y, 24, '#ffd75e'); }
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
    if (f.bit) spawnDrop(f.x, f.y, 2); else if (f.tr || Math.random() < .15 + lk * .03) spawnDrop(f.x, f.y, 1);   // tier>0 guarantees a drop
    if (f.tr) { burst(f.x, f.y, 18, '#ffd75e'); sfx(784, 1568, .3, 'triangle', .15); }   // tier kill reward flourish
    if (f.bit) {                                                // BOSS falls
      for (let i = foes.length; i--;) if (foes[i].bit === f.bit) foes.splice(i, 1);
      if (bs[f.bi] !== 2) {                                     // FIRST KILL — collect rainbow shard automatically (progression token, not an item)
        bs[f.bi] = 2;
        hp = mHP(); mn = mMN();                                 // boss reward: full HP + MP restore
        rburst(f.x, f.y, 20); fly(f.x, f.y - 8, 'RAINBOW SHARD ' + shards() + ' / 5', RBC[f.bi], 1);
        if (shards() === 5) {                                   // ALL 5 — the game's objective PAYS OFF
          bann = time + 6; bTxt = 'THE DARKNESS LIFTS'; bSub = 'UNI-CORN · HOOVES OF HOPE';   // victory: color/rainbows restored to the world
        }
        sfx(523, 523, .14, 'triangle', .15); sfx(659, 659, .14, 'triangle', .15, .12); sfx(784, 1568, .3, 'triangle', .15, .24);
        save();
      }
      gainXp(12 + 6 * f.bi, f.x, f.y - 26); burst(f.x, f.y, 30, '#fff');
    }
    return 1;
  }
};

// ---------- verbs ----------
// DASH is the attack verb: gated behind DASH skill. Half distance base, LONG DASH doubles.
// Strikes foes it passes through, hits GENERATE mana.
function shoot() {                                              // magic bolt (gold): 3 mana
  if (!started || choosing || deathT > 0 || !su[0]) return;
  if (mn < 3) { fly(pl.x, pl.y - 12, 'need ✦3', '#f9c'); return; }   // flat 3 MP
  mn -= 3; sfx(700, 1300, .12, 'triangle', .09);
  shots.push({ x: pl.x + PW / 2, y: pl.y + 5, vx: pl.face * 270, t: .55 + .25 * su[1] });   // base range SHORT; FAR SHOT extends (.55s→.80s)
}
function dash() {                                               // THE attack verb: burst + strike-through; gated behind DASH skill
  if (!started || choosing || deathT > 0 || dashCd > 0 || !su[6]) return;
  if (!pl.ground) { if (adash) return; adash = 1; }             // dash works in air too — once per airtime, resets on landing
  chT = 0;                                                      // dash cancels a heal channel (no move-while-rooted exploit)
  dashT = su[7] ? .15 : .075;                                   // base = HALF distance; LONG DASH doubles it (gates the spike lake)
  dashCd = .45; pl.sq = .6; sfx(600, 200, .12, 'sawtooth', .12);
}

const hurt = (n, safe) => {
  if (pl.inv > 0 || deathT > 0) return;
  n = Math.max((n >> 2) || 1, n - df - eqB[3]);                // DEFENSE — gradient floor: 25% of raw (min 1), preserves boss threat
  hp -= n; pl.inv = 1.2; chT = 0; shk = Math.max(shk, .22);
  sfx(140, 55, .25, 'sawtooth', .12); burst(pl.x, pl.y + 7, 10, '#e05555');

  if (hp <= 0) { deathT = 1.6; return; }
  if (safe) { pl.x = lastSafe[0]; pl.y = lastSafe[1]; pl.vx = pl.vy = 0; }
  else pl.vy = -180;
};

// ---------- update ----------
let last = performance.now(), time = 0;
const step = (dt) => {
  if (hs > 0) { hs -= dt; return; }               // HITSTOP — world freezes for the crit punch
  if (choosing) {                                  // JOYSTICK MENU NAV — stick moves between horizontal stats, JUMP allocates
    navT -= dt;
    const lt = keys.has('bL') || keys.has('bU'), rt = keys.has('bR') || keys.has('bD'), jp = keys.has('bJ');
    if (navT <= 0 && (lt || rt || jp)) {
      navT = .3;
      if (jp) allocate(); else aRow = (aRow + (rt ? 1 : 4)) % 5;
    }
    if (!lt && !rt && !jp) navT = 0;
  }
  if (paused || choosing) return;                  // pause / level-up freezes sim; render still draws
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
  if (onPlat && held('ArrowDown', 'KeyS', 'bD')) { dropT = .16; pl.ground = 0; pl.y += 3; pl.vy = 60; chT = 0; }

  // -- heal channel: rooted, costs 5 mana, restores 3 HP (HEAL +2/+4 nodes → 5/7) --
  if (su[2] && mn >= 5 && hp < mHP() && pl.ground && !onPlat && healHeld()) {
    chT += dt; pl.vx = 0;
    if (chT > 1.2) { const hm = 3 + su[3] * 3; chT = 0; mn -= 5; hp = Math.min(mHP(), hp + hm); burst(pl.x + PW / 2, pl.y + 4, 14, '#9fe89a'); sfx(520, 1040, .25, 'triangle', .12); fly(pl.x, pl.y - 12, '+' + hm, '#9fe89a', 1); }   // HEAL: 3, SUPER HEAL: 6
  } else chT = 0;
  const rooted = chT > 0;

  // -- run --
  const dir = rooted ? 0 : (held('KeyD', 'ArrowRight', 'bR') ? 1 : 0) - (held('KeyA', 'ArrowLeft', 'bL') ? 1 : 0);
  pl.vx += (dir * RUN - pl.vx) * Math.min(1, dt * 12 * (pl.ground ? 1 : .65));
  if (dir) pl.face = dir;

  // -- jump: buffer + coyote + variable + double --
  pl.coyote = pl.ground ? .1 : pl.coyote - dt;
  if (jbuf > 0 && !rooted) {
    if (pl.coyote > 0) { pl.vy = -V0; pl.coyote = 0; pl.air = 0; jbuf = 0; pl.sq = .7; sfx(280, 520, .12); rburst(pl.x, pl.y + PH, 4); }
    else if (su[4] && pl.air < 1 + su[5]) { pl.vy = -(V0 - 20); pl.air++; jbuf = 0; pl.sq = .7; sfx(280, 520, .12); rburst(pl.x, pl.y + PH, 6); }   // TRI JUMP — same sound as ground jump (unified)
  }
  if (pl.vy < 0 && !jumpHeld()) pl.vy *= .82;
  if (dashT > 0) {                                              // dash: flat burst, strike foes, break walls
    pl.vx = pl.face * 400; pl.vy = 0;
    const dc = `hsl(${pl.x * 4 % 360} 80% 60%)`;                 // rainbow dash smear — hue tied to POSITION (coherent trail), not time (flicker)
    parts.push({ x: pl.x + PW / 2, y: pl.y + 5, vx: 0, vy: 0, t: .3, c: dc });    // 2 particles/frame at 2 heights → fuller, brighter ribbon
    parts.push({ x: pl.x + PW / 2, y: pl.y + 13, vx: 0, vy: 0, t: .3, c: dc });
    smash(pl.x + (pl.face > 0 ? PW + 2 : -2), pl.y + PH / 2);
    for (const f of [...foes]) {
      const fz = fsz(f);
      if (f.fl <= 0 && pl.x < f.x + fz && pl.x + PW > f.x && pl.y < f.y + fz && pl.y + PH > f.y) strike(f, 1, 0);
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
        if (!wasGround && pl.vy > 250) { pl.sq = 1.35; rburst(pl.x + PW / 2, feet, 5); sfx(150, 70, .06, 'square', .07); }
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
  for (const c of chests) if (!(oc & (1 << (curZone * 6 + c.i))) && Math.hypot(pl.x + PW / 2 - c.x, pl.y + PH / 2 - c.y) < 20) { nearChest = c.i; break; }

  // -- bosses: each grants a rainbow shard on first kill (auto-collected progression token, no drop) --
  seeds.bosses.forEach(([bx, by]) => {                          // each zone has 1 boss; boss id = curZone (indexes bs[], BN[], P2[])
    const bi = curZone, bit = 1 << bi;
    if (bs[bi] === 1) return;
    if (Math.hypot(pl.x - bx * T, pl.y - by * T) < 80) {
      const st = bs[bi], fresh = !st || st === 2;
      bs[bi] = 1;
      foes.push({
        x: bx * T, y: by * T, vx: 0, vy: 0, k: 3, bi, bit, cz: 4, dm: 5 + bi * 2,
        fl: 0, t: 0, mx: 40 + 15 * bi,
        cap: 18 | (fresh ? 0 : st.ph && P2[bi]),
        hp: fresh ? 40 + 15 * bi : st.hp,
        ph: fresh ? 0 : st.ph, spd: fresh ? 0 : st.spd, rc: fresh ? undefined : st.rc,
      });
      sfx(110, 55, .5, 'sawtooth', .18);
      bann = time + 2.2; bTxt = 'DARK ' + BN[bi] + ' CORN'; bSub = st === 2 ? '' : 'KEEPER OF A RAINBOW SHARD';
    }
  });

  // -- shots --
  for (const s of shots) {
    s.t -= dt; s.x += s.vx * dt;
    parts.push({ x: s.x, y: s.y, vx: 0, vy: 0, t: .25, c: `hsl(${s.x * 4 % 360} 80% 60%)` });   // rainbow-wave comet — per-frame trail, hue by position → coherent streak from the horn
    const tc = s.x / T | 0, tr = s.y / T | 0;
    if (tile(tc, tr) === 4) { smash(s.x, s.y); s.t = 0; }
    else if (solid(s.x, s.y)) { s.t = 0; burst(s.x, s.y, 6, '#fff'); }
    if (s.t > 0) for (const f of foes) {                        // a spent bolt can't also hit a foe
      const fs = fsz(f);
      if (s.x > f.x && s.x < f.x + fs && s.y > f.y && s.y < f.y + fs) { s.t = 0; strike(f, 0, 0); break; }
    }
  }
  for (let i = shots.length; i--;) if (shots[i].t <= 0) shots.splice(i, 1);
  // -- foe bolts (CASTER + boss phase 2): hit the player, die on solid --
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
    // UNIFIED ATTACK ORCHESTRATION — every foe runs the same verbs; cap bits (data.js FT)
    // decide who uses which. Contact damage (.wt tell) below is shared by all.
    // RANGED (cap 1) — gate the COUNTDOWN, not just the shot: bosses always in range,
    // regular foes need |dx| < 230. Prevents the charge-orb tell from ballooning off-screen.
    if (f.cap & 1 && (f.bit || Math.abs(pl.x - f.x) < 230)) {
      f.rc = (f.rc ?? 1.5 + Math.random()) - dt;
      if (f.rc <= 0) {
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
        shk = Math.max(shk, .3); burst(f.x + fs / 2, f.y + fs, 16, '#fff'); sfx(90, 40, .3, 'sawtooth', .18);   // shockwave: white impact energy (matches shot-hits-wall vocabulary)
        if (pl.ground && Math.abs(pl.x - f.x) < 64) hurt(3, 0);
      }
    }
    f.x += f.vx * dt;
    const ahead = f.x + fs / 2 + Math.sign(f.vx) * fs * .7;
    const blockedAhead = solid(ahead, f.y + fs / 2) || tile(ahead / T | 0, (f.y + fs + 6) / T | 0) === 0;
    if (blockedAhead) { if (f.bit) f.vx = 0; else if (f.gr || !(f.cap & 2)) f.vx *= -1; } // bosses hold ground at edges; airborne hoppers keep momentum (land, then turn)
    // CONTACT with wind-up tell: touching sets .wt clock; hurt only fires after 0.3s (visible red flash).
    // Cooldown holds .wt < 0 until the strike can re-arm.
    const hit = pl.x < f.x + fs && pl.x + PW > f.x && pl.y < f.y + fs && pl.y + PH > f.y;
    if (hit && pl.vy > 40 && pl.y + PH - f.y < 10) {
      strike(f, 0, 1);
      // STOMP LAUNCH — big vertical bounce + horizontal push AWAY from foe center.
      // pl.air = 0 keeps DJ available so a skilled player can chain stomps; the
      // horizontal push means an unskilled player lands far away instead of bunny-hopping.
      pl.vx = (f.x + fs / 2 < pl.x + PW / 2 ? 1 : -1) * 220;
      pl.vy = jumpHeld() ? -360 : -280; pl.air = 0; pl.sq = .75; sfx(150, 70, .06, 'square', .07);
      // .wt is NOT reset here — repeat-bouncing must accumulate threat (anti-exploit)
    } else if (hit && (f.wt || 0) >= 0) {
      f.wt = (f.wt || 0) + dt;
      // Arm on 0.22s of slow contact (telegraph / red-flash for standing melee) OR immediately on a
      // FAST impact: a quick pass-by (fast foe, or you moving) can't sustain 0.22s in the ~20px
      // overlap window, so relative speed >90px/s registers on the FIRST overlap frame — no more
      // running through / behind enemies for free. Guarded to !dashT so the offensive dash-through
      // stays a clean engage; the 1.2s hurt() i-frame prevents any double-dip.
      if (f.wt > .22 || (dashT <= 0 && Math.abs((pl.vx || 0) - (f.vx || 0)) > 90)) { hurt(f.dm, 0); f.wt = -.7; }
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
  nearFire = 0; nearDoor = -1;
  for (const [fx, fy] of seeds.fires) if (Math.hypot(pl.x - fx * T, pl.y - fy * T) <= 26) { nearFire = 1; break; }
  for (let i = 0; i < seeds.doors.length; i++) { const [dx, dy] = seeds.doors[i]; if (Math.hypot(pl.x - dx * T, pl.y - dy * T) <= 22) { nearDoor = i; break; } }

  // ITEM DROPS — float, gravity, tile collision, proximity pickup
  for (const d of drops) {
    d.life -= dt;
    if (d.mag > 0) {                                             // MAGNETIZE — fly to player, then trigger effects
      d.mag -= dt;
      d.x += (pl.x + PW / 2 - d.x) * .3; d.y += (pl.y + PH / 2 - d.y) * .3;
      if (d.mag > 0) continue;
      d.life = 0;
      // Consumables auto-consume if their stat isn't full, else land in inventory (click later).
      // Gear ALWAYS lands in inventory — player picks when to equip.
      const bag = () => { if (inv.length < invMax()) { inv.push({ t: d.t, s: d.s, c: d.c, b: d.b }); fly(d.x, d.y, '+BAG', PAL[d.c] || '#ffd75e'); } else fly(d.x, d.y, 'BAG FULL', '#ff5d6c'); };
      if (d.t === 0) hp < mHP() ? (hp = Math.min(mHP(), hp + 3), fly(d.x, d.y, '+3 HP', '#ff5d6c')) : bag();
      else if (d.t === 1) mn < mMN() ? (mn = Math.min(mMN(), mn + 3), fly(d.x, d.y, '+3 MP', '#4a76ff')) : bag();
      else bag();                                                // GEAR (t=5) always goes to bag
      continue;
    }
    d.grace -= dt;
    d.vy = Math.min(200, d.vy + 400 * dt); d.y += d.vy * dt; d.x += d.vx * dt; d.vx *= .97;
    if (d.vy > 0 && solid(d.x, d.y + 3)) { d.vy = 0; d.y = ((d.y + 3) / T | 0) * T - 3; }
    if (d.grace <= 0 && Math.hypot(pl.x + PW / 2 - d.x, pl.y + PH / 2 - d.y) < 18) {
      d.mag = .2;                                                // start 200ms fly-in to player
      sfx(520, 1040, .1, 'triangle', .1);                        // pickup — same as HP-potion sfx (unified near-dupe)
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
  // BACKGROUND = flat blue sky + parallax clouds. Visual detail lives in the ground layer.
  ctx.fillStyle = ZBG[curZone]; ctx.fillRect(0, 0, VW, VH);                 // per-zone backdrop
  // CLOUDS — parallax puffs, outdoor zones only (caves/depths stay dark)
  if (curZone !== 1 && curZone !== 4) for (const [cx, cy, cw] of [[80, 30, 40], [200, 50, 55], [350, 25, 35], [500, 60, 45], [650, 35, 30]]) {
    const sx = ((cx - cam.x * .15) % (VW + 100)) - 50;
    ctx.fillStyle = 'rgba(255,255,255,.6)';
    ctx.fillRect(sx, cy, cw, 8); ctx.fillRect(sx + 4, cy - 4, cw - 8, 6); ctx.fillRect(sx + 8, cy + 6, cw - 16, 5);
  }

  // SCREEN SHAKE — offset the world translate, not the HUD (which draws after the untranslate)
  const so = shk > 0 ? Math.random() * 6 - 3 : 0;
  ctx.translate((-cam.x + so) | 0, (-cam.y + so) | 0);
  const x0 = cam.x / T | 0, x1 = Math.min(W, x0 + VW / T + 2), y0 = Math.max(0, cam.y / T | 0), y1 = Math.min(H, y0 + VH / T + 2);
  const [GD, GT, GF, GA] = ZG[curZone], RB = dim(GA, .75);   // per-zone [dirt, top, foliage, accent]; RB = derived rock base
  for (let j = y0; j < y1; j++) for (let i = x0; i < x1; i++) {
    const v = tile(i, j); if (!v) continue;
    if (v === 1) {
      // SOLID GROUND — zone dirt body, lighter surface-top where exposed to air
      ctx.fillStyle = GD; ctx.fillRect(i * T, j * T, T + .5, T + .5);
      if (tile(i, j - 1) !== 1) { ctx.fillStyle = GT; ctx.fillRect(i * T, j * T, T + .5, 5); }
    } else if (v === 2) {
      // PLATFORM — chunky: zone surface-top + dirt underside
      ctx.fillStyle = GD; ctx.fillRect(i * T, j * T + 2, T + .5, 7);
      ctx.fillStyle = GT; ctx.fillRect(i * T, j * T, T + .5, 4);
    } else if (v === 4) {                                       // cracked wall — subtle cracks on stone
      ctx.fillStyle = '#6a5a4a'; ctx.fillRect(i * T, j * T, T + .5, T + .5);
      ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = .5;
      ctx.beginPath(); ctx.moveTo(i*T+3, j*T); ctx.lineTo(i*T+8, j*T+8); ctx.lineTo(i*T+5, j*T+16); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(i*T+12, j*T+2); ctx.lineTo(i*T+9, j*T+10); ctx.stroke();
    } else {
      // SPIKES — universal danger color
      ctx.fillStyle = '#e05555';
      for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(i * T + k * 4, j * T + T); ctx.lineTo(i * T + k * 4 + 2, j * T + 8); ctx.lineTo(i * T + k * 4 + 4, j * T + T); ctx.fill(); }
    }
  }

  // Hearth: campfire only — save/checkpoint/full-heal on JUMP-near (rest())
  for (const [fx, fy] of seeds.fires) {
    const cxp = fx * T, cyp = fy * T;
    // Campfire: pure static decoration — log + two flame triangles. The shape IS the feature (no animation).
    ctx.fillStyle = '#6b4a2b'; ctx.fillRect(cxp - 8, cyp + 4, 16, 4);                                                                                // log base
    ctx.fillStyle = '#ff9d3c'; ctx.beginPath(); ctx.moveTo(cxp - 5, cyp + 5); ctx.lineTo(cxp, cyp - 4); ctx.lineTo(cxp + 5, cyp + 5); ctx.fill();     // outer flame
    ctx.fillStyle = '#ffe08a'; ctx.beginPath(); ctx.moveTo(cxp - 2.5, cyp + 5); ctx.lineTo(cxp, cyp - .4); ctx.lineTo(cxp + 2.5, cyp + 5); ctx.fill(); // inner core
  }
  // RAINBOW PORTAL DOORS — archway: flat bottom on the ground surface, half-round top,
  // dark wood/stone frame, rainbow-band interior. JUMP-near to enter the target zone.
  for (const [dx, dy] of seeds.doors) {
    const cx = dx * T, gy = dy * T + T, w = 8, rH = 13, H2 = rH + w;   // gy = ground surface (flat bottom sits here); door a hair taller than the unicorn
    const arch = (hw, hh) => { ctx.beginPath(); ctx.moveTo(cx - hw, gy); ctx.lineTo(cx - hw, gy - hh); ctx.arc(cx, gy - hh, hw, Math.PI, 2 * Math.PI); ctx.lineTo(cx + hw, gy); ctx.closePath(); };
    ctx.save(); arch(w + 3, rH + 3); ctx.clip();                       // GRAY-BRICK FRAME — solid stone block, mortar courses scored on, bottom cuff cut off
    ctx.fillStyle = '#5c5c66'; ctx.fillRect(cx - w - 3, gy - H2 - 6, w * 2 + 6, H2 + 6);
    ctx.strokeStyle = '#33333b'; ctx.beginPath();
    for (let yy = gy - 3; yy > gy - H2 - 6; yy -= 4) { ctx.moveTo(cx - w - 3, yy); ctx.lineTo(cx + w + 3, yy); }   // horizontal mortar → stacked brick courses
    ctx.stroke(); ctx.restore();
    ctx.save(); arch(w, rH); ctx.clip();                               // RAINBOW INTERIOR — clipped to inner arch, cycling bands (overdraws the center mortar, leaving it on the frame ring)
    for (let i = 0; i < 7; i++) { ctx.fillStyle = RC[(i + (time * 2 | 0)) % 7]; ctx.fillRect(cx - w, gy - H2 + i * H2 / 7, w * 2, H2 / 7 + 1); }
    ctx.restore();
  }
  // CHESTS — hand-placed per zone (3-4 each). Opened chests render with lid up.
  // Prompt "▲ OPEN" pulses above the nearest unopened chest.
  for (const c of chests) {
    const opened = oc & (1 << (curZone * 6 + c.i));
    ctx.fillStyle = '#6b4a2b';                              // dark oak base
    ctx.fillRect(c.x - 6, c.y - 2, 12, 7);                  // body
    ctx.fillStyle = '#8a6a3a';                              // lighter oak (lid or interior)
    if (opened) ctx.fillRect(c.x - 6, c.y - 6, 12, 3);      // lid tilted back (open)
    else ctx.fillRect(c.x - 6, c.y - 5, 12, 3);             // lid down (closed)
    ctx.fillStyle = '#ffd75e';                              // gold latch/band
    ctx.fillRect(c.x - 1, c.y - 1, 2, 3);
  }
  // WORLD DECORATIONS — data-driven from DECO seeds. Positions are data, draw is shared.
  // 0=tree 1=grass 2=rock 3=mushroom 4=dead tree 5=ice crystal 6=flower
  for (const [dx, dy, dt] of DECO) {
    const px = dx * T, py = dy * T + T;                          // py = ground surface (feet level)
    if (px < cam.x - T || px > cam.x + VW + T || py < cam.y - T || py > cam.y + VH + T) continue;
    if (dt === 0 || dt === 4) { // TREE — shared geometry; 0 live (zone palette), 4 dead (gray+purple)
      ctx.fillStyle = dt ? '#444' : GD; ctx.fillRect(px + 6, py - 12, 4, 12);
      ctx.fillStyle = dt ? '#3a2244' : GF;                                   // canopy (two rects, one fillStyle)
      ctx.fillRect(px + 1, py - 20, 14, 9); ctx.fillRect(px + 3, py - 23, 10, 5);
    } else if (dt === 1) { // GRASS — zone-foliage blades (static)
      ctx.fillStyle = GF;
      ctx.fillRect(px + 3, py - 5, 1, 5); ctx.fillRect(px + 7, py - 7, 1, 7); ctx.fillRect(px + 11, py - 4, 1, 4);
    } else if (dt === 2) { // ROCK — zone-accent boulder (base = derived-darker accent)
      ctx.fillStyle = RB; ctx.fillRect(px + 3, py - 4, 10, 4);
      ctx.fillStyle = GA; ctx.fillRect(px + 4, py - 6, 8, 3);
    } else if (dt === 3) { // MUSHROOM — glowing cave fungus
      ctx.fillStyle = '#8a5a3a'; ctx.fillRect(px + 7, py - 5, 2, 5);
      ctx.fillStyle = '#c47fe0'; ctx.fillRect(px + 4, py - 9, 8, 5);
      ctx.fillStyle = '#e0b0ff'; ctx.fillRect(px + 6, py - 10, 4, 2);
    } else if (dt === 5) { // ICE CRYSTAL — cyan/white angular
      ctx.fillStyle = '#8cf'; ctx.fillRect(px + 5, py - 8, 6, 8);
      ctx.fillStyle = '#cef'; ctx.fillRect(px + 6, py - 10, 4, 3);
      ctx.fillStyle = '#fff'; ctx.fillRect(px + 7, py - 9, 1, 1);
    } else if (dt === 6) { // FLOWER — static petals
      ctx.fillStyle = GF; ctx.fillRect(px + 7, py - 6, 1, 6);
      ctx.fillStyle = '#f9c'; ctx.fillRect(px + 5, py - 9, 5, 3);
      ctx.fillStyle = '#ffd75e'; ctx.fillRect(px + 7, py - 8, 1, 1);
    }
  }

  // ARTICULATED ENEMY SPRITES — legs step, antennae bob, robe folds. One draw per tier,
  // boss shares the silhouette scaled up. cz = select-tier/boss cell multiplier.
  for (const f of foes) {
    const s = f.cz || 1 + f.k, fs = 5 * s, wob = Math.sin(f.t * 6) * 1.5, sh = FT[f.k][5]; // sh = body shape from the type table
    const step = Math.sin(f.t * 8) * s * .35;                   // leg-step animation, shared
    ctx.save();
    ctx.translate(f.x + fs / 2, f.y + fs);
    ctx.scale((f.vx || 1) < 0 ? -1 : 1, 1);
    ctx.translate(-fs / 2, -fs);
    // colour: white flash on hit > red pre-strike wind-up tell > tier base
    // TIER color: select(2)=flat aqua PAL[9] (bigger too) · tough(1)=darkened base via dim() · base=FOECOL. boss=charcoal.
    ctx.fillStyle = f.fl > 0 ? '#fff' : f.wt > .12 ? '#ffb0b0' : f.bit ? '#2a2a33' : f.tr === 2 ? PAL[9] : f.tr ? dim(FOECOL[f.k], .62) : FOECOL[f.k];
    if (f.bit) {                                                // DARK CORN — reflection of the player unicorn: same shape,
      // BLACK body, per-boss eye/horn color (bi 0..4), spectral gray mane.
      // Eye + horn flip to bright rage colors in phase 2 (half HP transition).
      const ec = f.ph ? '#fff' : RBC[f.bi];   // horn + eye = the rainbow band this corn holds (rage-white in phase 2)
      const sc = fs / 14, ph = Math.sin(f.t * 8) * 3;            // scale player unicorn bbox → fs; walk cycle
      ctx.scale(sc, sc);
      ctx.fillRect(1, 12 + ph * .3, 2, 4 - ph * .3);              // leg L (steps)
      ctx.fillRect(7, 12 - ph * .3, 2, 4 + ph * .3);              // leg R
      ctx.fillRect(0, 5, 10, 7);                                  // body
      ctx.fillRect(7, 0, 5, 6);                                   // head
      ctx.fillStyle = ec;
      ctx.beginPath();
      ctx.moveTo(10, 0); ctx.lineTo(14, -5); ctx.lineTo(12, 1); ctx.fill();
      ctx.fillStyle = '#333';                                     // spectral gray mane
      ctx.fillRect(5, 1, 2, 4); ctx.fillRect(3, 3, 2, 4); ctx.fillRect(1, 5, 2, 4);
      ctx.fillStyle = ec;
      ctx.fillRect(10, 2, 1.5, 1.5);
    } else if (sh === 1) {                                      // CRAWLER shape — 4 legs + antennae (k1 CRAWLER, k4 RUNNER, k5 HOPPER)
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
    } else if (sh === 2) {                                      // JELLY shape — dome + 3 dangling tendrils (k2 BLOB, k6 PUFF)
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
    } else {                                                    // CASTER shape — hooded robe + glowing rune-eye (k3 CASTER)
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
    if (f.bit) bar(f.x, f.y - 8, fs, 3, f.hp / f.mx, f.ph ? '#ffd75e' : '#e05555');   // boss HP bar
    else if (f.tr && f.hp < f.mx) bar(f.x, f.y - 3, fs, 1, f.hp / f.mx, f.tr === 2 ? PAL[9] : '#ff5d6c');   // tier HP tick (select=aqua, tough=red; hidden until first hit)
  }
  for (const s of shots) { ctx.fillStyle = `hsl(${s.x * 4 % 360} 80% 60%)`; ctx.fillRect(s.x - 3, s.y - 2, 6, 4); }   // magic bolt head: spatial-hue rainbow (matches its comet trail; hue by position, not time)
  for (const b of fbolts) {                                     // foe bolt: purple diamond with a pale core
    ctx.fillStyle = '#c47fe0'; ctx.fillRect(b.x - 3, b.y - 3, 6, 6);
    ctx.fillStyle = '#fff'; ctx.fillRect(b.x - 1, b.y - 1, 2, 2);
  }

  // unicorn — hidden on the title (phase 0) so the meadow backdrop shows no duplicate
  // player under the big branding unicorn; the spawn framing is otherwise clean.
  if (started && (pl.inv <= 0 || Math.sin(time * 40) > 0)) {
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
    if (d.t < 2) { spr(I_MP, dx, ddy, 6, d.t ? '#4a76ff' : '#ff5d6c'); ctx.fillStyle = '#4a3828'; ctx.fillRect(dx + 2, ddy, 2, 1); }   // POTION — t=0 red HP, t=1 blue MP, dark-brown cork
    else { drawPart(d.s, dx - 1, ddy - 1, d.c); ctx.strokeStyle = TC[d.b]; ctx.lineWidth = .5; ctx.strokeRect(dx - 2, ddy - 2, 10, 10); }   // GEAR (t=5) — drawU primitives + tier ring
  }
  for (const p of parts) { ctx.globalAlpha = Math.min(1, p.t * 2); ctx.fillStyle = p.c; ctx.fillRect(p.x - 1.5, p.y - 1.5, 3, 3); }
  ctx.globalAlpha = 1;
  for (const f of flies) {
    ctx.globalAlpha = Math.min(1, f.t * 2); ctx.font = (f.big ? 'bold 13px' : 'bold 8px') + ' monospace';
    ctx.fillStyle = f.c; ctx.fillText(f.txt, f.x | 0, f.y | 0);
  }
  ctx.globalAlpha = 1;
  ctx.translate((cam.x - so) | 0, (cam.y - so) | 0);            // undo world translate (incl. shake)

  // ---------- HUD (minimalist: HP / mana / xp bars top-left, pause icon top-right) ----------
  if (started && !paused) {
    ctx.textAlign = 'left';
    // TOP-LEFT CLUSTER — HP · mana · xp bars, one visual language: continuous fill,
    // numbers INSIDE the bar (WoW/MOBA unit-frame pattern — no extra screen real estate).
    const bw = 68, bx = 8;
    bar(bx, 6, bw, 10, hp / mHP(), '#ff5d6c');                      // HP: dark track + red fill
    ctx.strokeStyle = '#1a1a22'; ctx.lineWidth = 1; ctx.strokeRect(bx - .5, 5.5, bw + 1, 11);
    bar(bx, 18, bw, 8, mn / mMN(), '#4a76ff');                      // mana
    ctx.strokeRect(bx - .5, 17.5, bw + 1, 9);
    bar(bx, 28, bw, 3, lvl >= CAP ? 1 : xp / need(), lvl >= CAP ? '#ffd75e' : '#9fe89a');   // xp
    ctx.textAlign = 'center'; ctx.font = 'bold 8px monospace'; ctx.fillStyle = '#fff';
    T2(hp + '/' + mHP(), bx + bw / 2, 14);
    T2((mn | 0) + '/' + mMN(), bx + bw / 2, 25);
    if (time < bann) {                                          // BOSS BANNER — arena-entry announcement (font already set to bold 13px above at ☰; reuse)
      ctx.textAlign = 'center'; ctx.fillStyle = '#ffd75e';
      T2(bTxt, VW / 2, 58);
      if (bSub) { ctx.font = 'bold 8px monospace'; ctx.fillStyle = '#fff'; T2(bSub, VW / 2, 68); }
    }
    if (time < zBann) {                                         // ZONE BANNER — zone-entry announcement (top of screen, gold)
      ctx.textAlign = 'center'; ctx.font = 'bold 13px monospace'; ctx.fillStyle = '#ffd75e';
      T2(ZN[curZone], VW / 2, 44);
    }
    if (time < zFade) { ctx.fillStyle = `rgba(0,0,0,${(zFade - time) / .3})`; ctx.fillRect(0, 0, VW, VH); }
    if (deathT > 0) { ctx.fillStyle = `rgba(0,0,0,${1 - Math.abs(deathT - .8) / .8})`; ctx.fillRect(0, 0, VW, VH); }
  }

  // CHARACTER SHEET overlay — pause (view) + level-up ALLOCATION (spend points).
  // Both share the split-panel layout; allocation mode adds ‹ › cursor + skill-unlock rows.
  if ((paused || choosing) && started) {
    const alloc = !!choosing;
    // Alloc mode borrows the NAME line above the box for its banner
    portraitPanel(alloc ? 'LV' + lvl + ' · ' + pending + ' PT' + (pending > 1 ? 'S' : '') : pName + ' · LV' + lvl);
    // EQUIPMENT — 4 slots INSIDE the gold box, cornered around the unicorn (anatomy: MANE top-left, HORN top-right, BODY bottom-left, HOOVES bottom-right).
    // portraitPanel's save/restore preserves textAlign='center' + font='bold 8px monospace' — no re-set needed.
    // Mirror-symmetric: left boxes 10px from left wall (x24), right boxes 10px from
    // right wall (x130 = 154−10−14). Labels center under each box → length self-adjusts.
    [[1, 18, 64], [2, 126, 64], [0, 18, 112], [3, 126, 112]].forEach(([s, ex, ey]) => {
      ctx.fillStyle = eq[s] ? PAL[eq[s].c] : '#2a2a33'; ctx.fillRect(ex, ey, 24, 24);
      ctx.strokeStyle = eq[s] ? TC[eq[s].b] : '#555'; ctx.lineWidth = .5; ctx.strokeRect(ex, ey, 24, 24);
      ctx.fillStyle = '#ccc'; T2(SLOT_LBL[s], ex + 12, ey + 31);
      if (eq[s]) { ctx.fillStyle = '#fff'; T2('+' + eq[s].b, ex + 12, ey + 14); }
    });
    // STATS — one row across the bottom of the box; alloc cursor = gold column
    const SL = [['STR', ho, '#ffd75e'], ['HP', he, '#ff5d6c'], ['MAG', sp, '#4a76ff'], ['DEF', df, '#8cf'], ['LCK', lk, '#9fe89a']];
    SL.forEach(([l, v, c], i) => {
      const sx = 22 + i * 26, sel = alloc && i === aRow;
      if (sel) { ctx.fillStyle = 'rgba(255,215,94,.14)'; ctx.fillRect(sx - 3, 152, 25, 23); ctx.strokeStyle = '#ffd75e'; ctx.lineWidth = 1; ctx.strokeRect(sx - 3, 152, 25, 23);
        ctx.fillStyle = '#ffd75e'; T2('+1', sx + 9, 150); }
      ctx.fillStyle = c; ctx.font = 'bold 8px monospace'; T2(l, sx + 9, 160);
      T2(v, sx + 9, 171);
    });
    // INVENTORY — 5×3 grid UNDER the gold box (5 base, +5 SADDLE BAG, +5 SADDLE BAGS). Click to select, click again to use/equip.
    const iMax = invMax(), iSz = 24, iGap = 28;
    for (let i = 0; i < iMax; i++) {
      const ix = 18 + (i % 5) * iGap, iy = 184 + ((i / 5) | 0) * iGap, it = inv[i];
      ctx.fillStyle = it ? 'rgba(255,255,255,.08)' : 'rgba(255,255,255,.03)';
      ctx.fillRect(ix, iy, iSz, iSz);
      ctx.strokeStyle = i === invSel ? '#ffd75e' : (it ? TC[it.b] || '#888' : '#444');
      ctx.lineWidth = i === invSel ? 1 : .5; ctx.strokeRect(ix, iy, iSz, iSz);
      if (it) {
        if (it.t < 2) { spr(I_MP, ix + 9, iy + 8, 6, it.t ? '#4a76ff' : '#ff5d6c'); ctx.fillStyle = '#4a3828'; ctx.fillRect(ix + 11, iy + 8, 2, 1); }
        else drawPart(it.s, ix + 8, iy + 9, it.c);
      }
    }
    // Tooltip: item name+effect above the grid (in the 6px band under the gold box). Action hint replaces the keybind line at the bottom.
    if (invSel >= 0 && inv[invSel]) {
      const it = inv[invSel];
      const desc = it.t === 0 ? 'HP POTION · +3 HP' : it.t === 1 ? 'MP POTION · +3 MP' : SLOT_LBL[it.s] + ' +' + it.b + ' ' + STATS[SLOT_STAT[it.s]][0];   // t=5 GEAR
      ctx.fillStyle = '#ffd75e'; T2(desc, 84, 192);
    }
    // SKILL TREE — 3-tier layout. Tier 1 free, tier 2 needs 2 skills, tier 3 needs 5.
    // purchased = gold glow · available = pulsing cyan · locked = dark "?"
    ctx.font = 'bold 8px monospace'; ctx.textAlign = 'center';
    if (spts) { ctx.fillStyle = '#ffd75e'; T2(spts + ' PTS', 358, 42); }
    // Tier dividers
    ctx.strokeStyle = '#333'; ctx.lineWidth = .5;
    ctx.beginPath(); ctx.moveTo(246, 86); ctx.lineTo(470, 86); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(246, 132); ctx.lineTo(470, 132); ctx.stroke();
    // Nodes
    const tot = su.reduce((a,v)=>a+v,0);
    const NS = 26;
    TREE.forEach(([nm, req], i) => {
      const [cx, cy] = TPOS[i], locked = req === -2 ? tot < 2 : req === -3 ? tot < 5 : false;
      // UNIFORM unselected: every unpicked node (available OR locked) reads the same muted
      // gray; only a PICKED node goes gold — no pulse (the colors + name/"?" already carry state).
      ctx.fillStyle = '#1a1a22'; ctx.fillRect(cx, cy, NS, NS);
      ctx.fillStyle = su[i] ? 'rgba(255,215,94,.18)' : 'rgba(255,255,255,.05)'; ctx.fillRect(cx, cy, NS, NS);
      ctx.strokeStyle = su[i] ? '#ffd75e' : '#555'; ctx.lineWidth = su[i] ? 1 : .5; ctx.strokeRect(cx, cy, NS, NS);
      ctx.fillStyle = su[i] ? '#ffd75e' : '#888';
      if (locked) ctx.fillText('?', cx + NS / 2, cy + 17);
      else { const w = nm.split(' '); if (w.length > 1) { ctx.fillText(w[0], cx + NS / 2, cy + 11); ctx.fillText(w.slice(1).join(' '), cx + NS / 2, cy + 21); } else ctx.fillText(nm, cx + NS / 2, cy + 17); }
    });
    // Footer — 5 rainbow shards under the tree, each dot colored by boss's band (grey = not yet held)
    ctx.textAlign = 'center'; ctx.font = 'bold 8px monospace';
    ctx.fillStyle = '#ffd75e'; T2('SHARDS · ' + shards() + ' / 5', 300, 228);
    for (let i = 0; i < 5; i++) { if (bs[i] === 2) drawGem(278 + i * 10, 232, time + i * .8); else { ctx.fillStyle = '#2a2a33'; ctx.fillRect(280 + i * 10, 233, 5, 5); } }
    ctx.fillStyle = '#888'; ctx.font = 'bold 8px monospace'; ctx.textAlign = 'center';
    if (choosing) T2('MOVE ← → · SPEND SPACE', VW / 2, VH - 4);
    else if (invSel >= 0 && inv[invSel]) {
      ctx.fillStyle = 'rgba(255,215,94,.14)'; ctx.strokeStyle = '#ffd75e'; ctx.lineWidth = 1;
      ctx.fillRect(30, 250, 50, 14); ctx.strokeRect(30, 250, 50, 14);
      ctx.fillRect(90, 250, 50, 14); ctx.strokeRect(90, 250, 50, 14);
      ctx.fillStyle = '#ffd75e'; T2('USE', 55, 260); ctx.fillStyle = '#c33'; T2('DROP', 115, 260);
    }
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
      // disc + colored ring — the intentional button design (icon-free for byte economy)
      ctx.globalAlpha = pressed ? 1 : .9;
    }
    ctx.globalAlpha = 1;
  }
  // SPEND button — during level-up on touch, replaces JUMP in the bottom-right
  if (started && choosing && touch) {
    const bx = VW - 36, by = VH - 44;
    ctx.globalAlpha = .65; ctx.fillStyle = 'rgba(15,15,20,.75)';
    ctx.beginPath(); ctx.arc(bx, by, 30, 0, 7); ctx.fill();
    ctx.strokeStyle = '#ffd75e'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(bx, by, 30, 0, 7); ctx.stroke();
    ctx.fillStyle = '#ffd75e'; ctx.font = 'bold 8px monospace'; ctx.textAlign = 'center';
    T2('SPEND', bx, by + 4); ctx.globalAlpha = 1;
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

  // Top-right icon row — persistent in play AND the character sheet (one draw path,
  // no paused special-case, no bespoke ✕: the Scroll icon toggles the sheet closed).
  if (started) {
    if (!choosing) {                                            // Scroll · Floppy · Speaker (hidden during level-up)
      const iy = 4, isz = 12;
      const px = VW - 74, r = 2, sh = 14; ctx.fillStyle = '#c8b888';   // Scroll — character-sheet toggle
      ctx.beginPath(); ctx.arc(px + r, iy + r, r, Math.PI, Math.PI * 1.5); ctx.arc(px + isz - r, iy + r, r, Math.PI * 1.5, 0); ctx.arc(px + isz - r, iy + sh - r, r, 0, Math.PI * .5); ctx.arc(px + r, iy + sh - r, r, Math.PI * .5, Math.PI); ctx.closePath(); ctx.fill();
      for (let i = 0; i < 4; i++) { const ly = iy + 4 + i * 2; ctx.strokeStyle = '#555'; ctx.beginPath(); ctx.moveTo(px + 3, ly); ctx.lineTo(px + 9, ly); ctx.stroke(); ctx.strokeStyle = '#eee'; ctx.beginPath(); ctx.moveTo(px + 3, ly + .5); ctx.lineTo(px + 9, ly + .5); ctx.stroke(); }
      const sx = VW - 56; ctx.fillStyle = '#2a2a33'; ctx.fillRect(sx, iy, isz, isz);   // Floppy — save
      ctx.fillStyle = '#999'; ctx.fillRect(sx + 3, iy, 6, 5); ctx.fillStyle = '#555'; ctx.fillRect(sx + 6, iy + 1, 2, 3);
      ctx.fillStyle = '#444'; ctx.fillRect(sx + 2, iy + 8, 8, 3);
      const mx = VW - 38; ctx.fillStyle = '#2a2a33'; ctx.fillRect(mx, iy, isz, isz);   // Speaker — mute
      if (mute & 2) { ctx.strokeStyle = '#c33'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(mx + 2, iy + 2); ctx.lineTo(mx + 10, iy + 10); ctx.stroke(); ctx.moveTo(mx + 10, iy + 2); ctx.lineTo(mx + 2, iy + 10); ctx.stroke(); }
      else { ctx.fillStyle = '#ccc'; ctx.fillRect(mx + 2, iy + 4, 3, 4); ctx.beginPath(); ctx.moveTo(mx + 5, iy + 4); ctx.lineTo(mx + 8, iy + 2); ctx.lineTo(mx + 8, iy + 10); ctx.lineTo(mx + 5, iy + 8); ctx.fill(); ctx.strokeStyle = '#ccc'; ctx.lineWidth = .5; ctx.beginPath(); ctx.arc(mx + 9, iy + 6, 2, -0.8, 0.8); ctx.stroke(); }
    }
    ctx.font = 'bold 8px monospace'; ctx.textAlign = 'center';   // ? — help (always, incl. level-up)
    ctx.fillStyle = '#fff'; ctx.fillRect(VW - 20, 4, 12, 12); ctx.fillStyle = '#c33'; ctx.fillText('?', VW - 14, 14);
    // Save popup — centered: rainbow SAVED! + CONTINUE + EXIT GAME
    if (savePop) {
      ctx.fillStyle = 'rgba(0,0,0,.8)'; ctx.fillRect(0, 0, VW, VH);
      // Rainbow "SAVED!" per-character
      ctx.font = 'bold 24px monospace'; ctx.textAlign = 'center';
      const sv = 'GAME SAVED', sw = ctx.measureText(sv).width, sx0 = (VW - sw) / 2;
      for (let i = 0; i < sv.length; i++) { ctx.fillStyle = RC[i % 7]; ctx.fillText(sv[i], sx0 + ctx.measureText(sv.slice(0, i)).width + ctx.measureText(sv[i]).width / 2, 110); }
      // CONTINUE + EXIT GAME
      ctx.fillStyle = '#ffd75e';
      ctx.font = 'bold 13px monospace'; T2('CONTINUE', VW / 2, 148);
      ctx.font = 'bold 13px monospace'; T2('EXIT GAME', VW / 2, 175);
    }
  }
  // TITLE screen (phase 0) — the live MEADOW renders behind this (sim frozen while
  // !started), so the opening zone doubles as the title backdrop. A light scrim dims
  // the scene just enough to keep the branding legible over the lively foliage.
  if (phase === 0) {
    ctx.fillStyle = 'rgba(0,0,0,.34)'; ctx.fillRect(0, 0, VW, VH);
    // Rainbow arc — uses module-level RC palette (shared with title + effects)
    ctx.lineWidth = 3;
    RC.forEach((c, i) => {
      ctx.strokeStyle = c; ctx.beginPath(); ctx.arc(VW / 2, 130, 78 - i * 3, Math.PI, 0); ctx.stroke();
    });
    // Centered unicorn — reuses drawU (same tail, hooves, mane geometry). Title sets
    // gold horn via col override + rainbow-mane overlay for iconic title branding.
    ctx.save(); ctx.translate(VW / 2, 108); ctx.scale(2.4, 2.4); ctx.translate(-6, -8);
    const bkc = col; col = [0, 0, 2, 0]; drawU(0); col = bkc;
    ['#ff5d6c', '#ffd75e', '#6bc5ff'].forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(5 - i * 2, 1 + i * 2, 2, 4); });
    ctx.restore();
    // Title — rainbow per-character matching the arc; subtitle in white
    ctx.font = 'bold 30px monospace'; ctx.textAlign = 'left';
    ctx.strokeStyle = 'rgba(0,0,0,.7)'; ctx.lineWidth = 2;
    const tc = 'UNI-CORN', tw = ctx.measureText(tc).width, cw = tw / 8;
    for (let i = 0; i < 8; i++) { const cx = VW / 2 - tw / 2 + cw * i; ctx.strokeText(tc[i], cx, 168); ctx.fillStyle = RC[i % 7]; ctx.fillText(tc[i], cx, 168); }
    ctx.textAlign = 'center'; ctx.fillStyle = '#9fe89a'; ctx.font = 'bold 13px monospace'; T2('Hooves of Hope', VW / 2, 188);
    // Title art above stays in EVERY mode — menu / name entry / slot select swap below it.
    if (tMode === 1) {                                             // NAME ENTRY
      const nm = ent + (Math.sin(time * 4) > 0 && ent.length < 8 ? '_' : '');
      ctx.fillStyle = '#fff'; ctx.font = 'bold 13px monospace'; T2(nm || '(type A–Z)', VW / 2, 224);
      ctx.strokeStyle = '#ffd75e'; ctx.lineWidth = 1; ctx.fillStyle = 'rgba(255,215,94,.14)';
      ctx.fillRect(VW / 2 - 60, 236, 120, 20); ctx.strokeRect(VW / 2 - 60, 236, 120, 20);
      ctx.fillStyle = '#ffd75e'; T2('BEGIN', VW / 2, 250);
    } else if (tMode === 2) {                                      // SLOT SELECT — name + level per slot
      ctx.font = 'bold 13px monospace';
      for (let i = 0; i < 4; i++) {
        const m = i < 3 ? sMeta(i) : 0, on = sSel === i, y = 206 + i * 16;
        ctx.fillStyle = on ? '#ffd75e' : (i < 3 && !m && !slotNew) ? '#555' : '#888';
        T2(i === 3 ? '← BACK' : 'SLOT ' + (i + 1) + ' · ' + (m || 'EMPTY'), VW / 2, y);
      }
    } else {                                                       // MENU — gold highlight IS the selection indicator; ▶ cursor removed as redundant
      const opts = hasSave() ? ['NEW GAME', 'CONTINUE'] : ['NEW GAME'];
      opts.forEach((o, i) => {
        ctx.fillStyle = mSel === i ? '#ffd75e' : '#888'; ctx.font = 'bold 13px monospace';
        T2(o, VW / 2, 208 + i * 16);
      });
    }
  }
  // HELP OVERLAY — controls reference, toggled by "?" button
  if (helpOn && started) {
    ctx.fillStyle = 'rgba(0,0,0,.88)'; ctx.fillRect(0, 0, VW, VH);
    ctx.textAlign = 'center'; ctx.font = 'bold 8px monospace';
    ctx.fillStyle = '#ffd75e'; T2('CONTROLS', VW / 2, 60);
    [['MOVE','A D S / ← → ↓'],['JUMP','SPACE / W / ↑'],['DASH','J'],['SHOOT','L'],['HEAL','H (hold)'],['PAUSE','P']].forEach(([a, b], i) => {
      const y = 82 + i * 22;
      ctx.fillStyle = '#c8a830'; ctx.textAlign = 'right'; T2(a, VW / 2 - 10, y);
      ctx.fillStyle = '#ffd75e'; ctx.textAlign = 'left'; T2(b, VW / 2 + 10, y);
    });
    ctx.textAlign = 'center'; ctx.fillStyle = '#c8a830'; T2('tap to close', VW / 2, 230);
  }
  ctx.restore();
};

// ---------- loop ----------
// Saves load lazily when a slot is picked; title only reads sMeta previews.
const loop = () => {
  const now = performance.now(), dt = Math.min(.033, (now - last) / 1000); last = now;
  step(dt); draw();
  requestAnimationFrame(loop);
};
loop();
