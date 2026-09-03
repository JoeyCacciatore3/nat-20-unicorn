// UNICORN, Hooves of Hope — 2D pixel-art platformer. Canvas 2D, no WebGL.
//
// Design pillars (see OneStone project "uni-corn" for full history + rationale):
//   - Stat allocation (STR/HP/MAG/DEF/LUCK), no classes
//   - 4-slot color-driven equipment gear (BODY/MANE/HORN/HOOVES) — each drop
//     is an RPG item icon: armor / cape / sword / boots (drawPart), tinted by roll color
//   - ONE open skill tree, 12 single-rank nodes, all player-chosen (no auto-learn)
//   - Rainbow shards = collection goal (one per DARK CORN boss; win = all bands, seeds.bosses.length)
//   - Unified character sheet: pause + level-up share layout
//   - 5-slot inventory (+5 via STASH skill, max 10); potions live in a separate hot-bar
//     if their stat isn't full else stored for later — click to use, X to drop
//   - HP/MP color-coded: red HP potion + blue MP potion (Diablo convention)
//   - Fixed world palette; sky (#6bc5ff) + grass (#5ac878) RESERVED for background
//
// Build: esbuild → terser → roadroller → inline → zip → ECT → 13,312-byte gate.
//   npm run build   (also runs map audit + tpos-check, logs to SIZELOG.md)
//   wavedash build push -m "message"
//
// Save: strict v42 JSON to localStorage. Version bumps discard prior saves.

import { T, W, H, grid, tile, seeds, DECO, BOUNCE, groundRow } from './world.js';    // map geometry + tiles + shared ground-snap
const bounceSet = new Set(BOUNCE.map(([x, r]) => r * W + x));                         // solid-row landing cells → spring launch
import { PAL, mane3, dim, SLOT_STAT, SLOT_LBL, SC, FOECOL, FT, P2, RBC, RC, ZBG, ZG, TREE, TPOS, I_MP, INTRO, TALK } from './data.js'; // static lookup tables

const cv = document.getElementById('cv'), ctx = cv.getContext('2d');
const VW = 480, VH = 270;
const QSZ = 24, QSY = VH - 28, QHX = VW / 2 - 27, QMX = VW / 2 + 3;   // potion quick-slots: box size · y · HP-box x · MP-box x (bottom-center)
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

const keys = new Set();
let jbuf = 0, started = 0, touch = 0;
// ---------- title / name-entry / class-select flow ----------
// phase 0 = title (tMode: 0 slot list / 1 name entry), 2 = playing (started=1).
let phase = 0, ent = '', pName = 'HORSE';
let tMode = 0, sSel = 0, slot = 0, sPop = 0; // title mode 0 slots · 1 name; slot cursor; active save slot; slot popup 0 closed · 1 CONTINUE selected · 2 DELETE selected
// HIDDEN NAME INPUT — the standard mobile-canvas technique: focusing a real <input>
// inside the tap gesture summons the OS keyboard (iOS requires the gesture).
// It is the single source of truth for `ent` while focused; window keydown defers.
const NI = document.body.appendChild(document.createElement('input'));
NI.autocapitalize = 'off'; NI.autocorrect = 'off'; NI.spellcheck = false;   // oninput uppercases; no need to latch the mobile shift key
NI.style.cssText = 'position:fixed;left:-99px;top:0;width:1px;height:1px;font-size:16px;border:0;padding:0';
NI.oninput = () => { ent = NI.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 8); NI.value = ent; };
// 2 SAVE SLOTS (n20_s0..1). sMeta reads name+level for the slot list without loading.
const sMeta = (i) => { try { const d = JSON.parse(localStorage['n20_s' + i] || '0'); return d && d.v === 42 ? d.m + ' · LV' + d.l : 0; } catch { return 0; } };
// NAME entry: A-Z type, BACKSPACE delete (empty backspace → back to slot list), ENTER begins.
// FLOW HELPERS — the ONLY code paths that change phase. Keyboard and touch both
// route here; one source of truth so the begin/resume transitions can't drift.
const beginGame = () => { if (!ent) return; NI.blur(); pName = ent; phase = 2; started = 1; talk(INTRO); save(); };  // name REQUIRED · auto-opens the GREAT CORN intro (new game only; resume skips it)
const resumeGame = () => { load(); phase = 2; started = 1; };
const pickSlot = (i) => {                                              // slot list is the single pre-play menu — no NEW GAME/CONTINUE layer
  slot = sSel = i;                                                     // sync cursor to touched slot so highlight tracks intent
  if (sMeta(i)) sPop = 1;                                              // occupied → CONTINUE / DELETE confirm (default = CONTINUE, safe)
  else { fresh(); ent = ''; tMode = 1; }                               // empty → name entry (required) → begin
};
const delSlot = () => { localStorage.removeItem('n20_s' + slot); sPop = 0; };   // wipe save; label reverts to NEW GAME on next render
const titleKey = (e) => {
  if (sPop) {                                                          // CONTINUE / DELETE confirm on an occupied slot
    if (e.code === 'ArrowLeft' || e.code === 'ArrowRight' || e.code === 'KeyA' || e.code === 'KeyD') sPop = 3 - sPop;
    else if (e.code === 'Enter' || e.code === 'Space') { if (sPop === 2) delSlot(); else { sPop = 0; resumeGame(); } }
    else if (e.code === 'Backspace' || e.code === 'Escape') sPop = 0;
    return;
  }
  if (tMode === 1) {                                                   // NAME ENTRY (after picking an empty slot)
    if (e.code === 'Backspace')                        { if (ent.length) ent = ent.slice(0, -1); else tMode = 0; }   // empty → back to slot list
    else if (ent.length < 8 && /^[a-z]$/i.test(e.key)) ent += e.key.toUpperCase();
    else if (e.code === 'Enter')                       beginGame();   // no-op unless a name is entered
    return;
  }
  // SLOT LIST (tMode 0) — the only pre-play menu; W/S/↑/↓ toggles cursor, Enter/Space picks
  if (e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'ArrowDown' || e.code === 'KeyS') sSel ^= 1;
  else if (e.code === 'Enter' || e.code === 'Space') pickSlot(sSel);
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
  if (dq) { adv(); return; }                                 // dialogue: any key advances one bubble (closes past the last)
  if (phase === 0) return titleKey(e);
  if (paused) {                                                // CHARACTER MENU owns input — cursor always active (stats → inv → skills)
    if (e.code === 'KeyP') paused = 0;                          // P closes
    else if (e.code === 'ArrowLeft' || e.code === 'KeyA' || e.code === 'ArrowUp' || e.code === 'KeyW') setRow((aRow + SN() - 1) % SN());
    else if (e.code === 'ArrowRight' || e.code === 'KeyD' || e.code === 'ArrowDown' || e.code === 'KeyS') setRow((aRow + 1) % SN());
    else if (e.code === 'Enter' || e.code === 'Space') spend();
    return;
  }
  // Near hearth: JUMP is the universal INTERACT (auto REST)
  if (J_KEYS.includes(e.code) && interact()) return;
  keys.add(e.code);
  if (J_KEYS.includes(e.code)) jbuf = .12;
  if (e.code === 'KeyJ') dash();                          // J = dash — the attack verb (contact damage during dash)
  if (e.code === 'KeyL') shoot();
  if (e.code === 'KeyH') heal();
  if (e.code === 'KeyP' && deathT <= 0) { paused = 1; setRow(0); }   // P opens the menu (close handled in the paused block above)

});
addEventListener('keyup', (e) => keys.delete(e.code));
const held = (...c) => c.some(k => keys.has(k));
const jumpHeld = () => J_KEYS.some(k => keys.has(k)) || keys.has('bJ'); // button jump gets full hold-height too

// ---------- touch overlay (minimal: dpad + JUMP + MELEE + earned skills; JUMP + MELEE contextualize) ----------
// No dedicated hearth buttons — JUMP is the universal interact/confirm, MELEE is back/cancel.
// ACTION BUTTONS — all four ALWAYS visible, uniform size. Ring is bright when USABLE
// (skill unlocked AND enough MP), else dull #555 — one rule covers both "locked" and "out of MP".
// Each: [x, y, key, brightColor, suIdx (-1 = always unlocked), mpCost]. Fan-arc = landscape thumb-reach.
const AR = 20;
const AB = [
  [VW - 36, VH - 34, 'bJ', '#8cf', -1, 0],
  [VW - 92, VH - 30, 'bM', '#ffd75e', 6, 1],
  [VW - 78, VH - 78, 'bS', '#c9a6f7', 0, 2],
  [VW - 36, VH - 88, 'bH', '#9fe89a', 2, 3],
];
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
  const hit = (x, y, w, h) => vx >= x && vx < x + w && vy >= y && vy < y + h;   // shared rectangular hit-test
  // TITLE — slot list (tMode 0) or name entry (tMode 1); hit-y offsets MUST match render y's
  if (phase === 0) {
    if (sPop) {                                                    // DELETE / CONTINUE popup (bottom strip) — destructive on the LEFT, safe on the RIGHT (thumb naturally reaches for CONTINUE)
      if (hit(VW / 2 - 90, 244, 70, 20)) { delSlot(); return; }                // DELETE (left)
      if (hit(VW / 2 + 20, 244, 70, 20)) { sPop = 0; resumeGame(); return; }   // CONTINUE (right)
      sPop = 0;                                                    // tap elsewhere = cancel; fall through so a tap on a slot row re-picks fluidly
    }
    if (tMode === 1) {                                             // name entry
      if (hit(VW / 2 - 60, 210, 120, 21)) { beginGame(); return; }  // ▶ BEGIN (needs a name)
      if (vy > 188 && vy < 207) { NI.value = ent; NI.focus(); e.preventDefault(); return; }  // tap the name = OS keyboard (preventDefault stops mobile follow-up events from stealing focus back)
      tMode = 0; return;                                           // tap elsewhere = back to slot list
    }
    const row = ((vy - 197) / 16) | 0;                             // slot rows at y=208+i*16
    if (row >= 0 && row <= 1 && vx > VW / 2 - 100 && vx < VW / 2 + 100) pickSlot(row);
    return;
  }
  // Save popup — CONTINUE / EXIT GAME
  if (savePop) {
    if (hit(160, 136, 160, 15)) { savePop = 0; return; }
    if (hit(160, 161, 160, 15)) { save(); paused = 0; helpOn = 0; savePop = 0; started = 0; phase = 0; tMode = 0; sSel = 0; sPop = 0; return; }
    return;
  }
  // Help/Settings overlay — dismiss on any tap
  if (helpOn) { helpOn = 0; return; }
  if (dq) { adv(); return; }                                     // dialogue: any tap advances one bubble (before HUD icons, so a tap can't leak through)
  // HUD icon taps: Menu | Save | Mute | ? — SAME row in play AND menu.
  // Menu TOGGLES the sheet (open when playing, close when open) — no bespoke ✕.
  if (started && hit(VW - 78, 0, 18, 20)) { paused ^= 1; if (paused) setRow(0); return; }
  if (started && hit(VW - 60, 0, 18, 20)) { save(); sfx(660, 990, .15, 'triangle', .12); savePop = 1; return; }
  if (started && hit(VW - 42, 0, 20, 20)) { mute ^= 2; save(); return; }
  if (started && hit(VW - 22, 0, 22, 20)) { helpOn = 1; return; }
  // PAUSE overlay — tap a skill-tree cell to rank up; any other tap closes
  if (paused) {                                                // CHARACTER MENU — inventory + (when points remain) stat/skill allocation, one screen
    // GAMEPAD MENU CONTROLS (checked first, take priority over cell-taps): joystick = cursor nav, JUMP = confirm/select.
    if (e.pointerType === 'touch' && Math.hypot(vx - joy.x, vy - joy.y) < JR + 8) { grabJoy(joy.x, joy.y, e.pointerId); return; }
    { const [bx, by] = AB[0]; if (Math.hypot(vx - bx, vy - by) < AR + 6) { spend(); ptrs.set(e.pointerId, 'bJ'); keys.add('bJ'); return; } }   // AB[0] = JUMP
    // USE/DROP buttons FIRST — they overlap the grid (y=250-264 sits inside grid y=184-268).
    // POTION HOT-BAR — tappable in menu too (persistent affordance, matches HUD icon behavior)
    if (hit(QHX - 3, QSY - 3, QSZ + 6, QSZ + 6)) { quaff(0); return; }
    if (hit(QMX - 3, QSY - 3, QSZ + 6, QSZ + 6)) { quaff(1); return; }
    if (invSel >= 0 && inv[invSel]) {
      if (hit(50, 250, 50, 15)) { useItem(invSel); return; }
      if (hit(110, 250, 50, 15)) { inv.splice(invSel, 1); return; }
    }
    // Inventory grid — tap moves cursor to slot; tap USE/DROP button (above) to act
    if (hit(38, 184, 140, 84)) {
      const iC = ((vx - 38) / 28) | 0, iR = ((vy - 184) / 28) | 0, iI = iR * 5 + iC;
      if (iI < invMax() && inv[iI]) { setRow(5 + iI); return; }
      return;                                                  // tap on empty inv area — no-op, keeps menu open
    }
    // Stat/skill tap — moves cursor there, tap selected again to spend (unified for touch)
    const ci = ((vx - 39) / 26) | 0;                                       // ci = stat-cell column index (was 'col' — shadowed unicorn palette)
    if (vy > 150 && vy < 180 && vx > 39 && vx < 169 && ci >= 0 && ci < STATS.length) { if (aRow === ci) spend(); else setRow(ci); return; }
    for (let i = 0; i < TREE.length; i++) { const [nx, ny] = TPOS[i]; if (hit(nx, ny, 26, 26)) { const r = 5 + invMax() + i; if (aRow === r) spend(); else setRow(r); return; } }
    paused = 0; return;                                        // tap anywhere else closes
  }
  // POTION QUICK-SLOTS (bottom-center): tap HP box → quaff(0), MP box → quaff(1). Padded 3px for thumbs.
  if (started && hit(QHX - 3, QSY - 3, QSZ + 6, QSZ + 6)) { quaff(0); return; }
  if (started && hit(QMX - 3, QSY - 3, QSZ + 6, QSZ + 6)) { quaff(1); return; }
  // JOYSTICK: any touch in the left 40% grabs the stick and re-anchors it there
  if (started && e.pointerType === 'touch' && vx < VW * .4) { grabJoy(vx, vy, e.pointerId); return; }
  for (const [x, y, c] of AB) if (Math.hypot(vx - x, vy - y) < AR + 6) {
    // JUMP button contextualizes: near NPC it's INTERACT, not jump
    if (c === 'bJ' && interact()) return;
    ptrs.set(e.pointerId, c); keys.add(c);
    if (c === 'bJ') jbuf = .12;
    if (c === 'bM') dash();
    if (c === 'bS') shoot();
    if (c === 'bH') heal();
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
const invMax = () => 5 + su[8] * 5;                  // BAG cap: 5 base, +5 STASH (max 10)
// Equip: apply color + stat bonus. Unequip old item back to inventory if it has a bonus.
// Equipment folds directly into base stats (single source of truth). Delta = new bonus − old bonus;
// stat mutation mirrors spend() so HP/MP grow/shrink together with mHP/mMN (like a level-up).
// CONTRACT: caller MUST ensure bag has room (useItem splices new item out first — that's what makes the swap safe).
const equip = (item) => {
  const old = eq[item.s], d = item.b - (old ? old.b : 0);
  if (old) inv.push(old);
  eq[item.s] = item;
  col[item.s] = item.c;
  if (item.s === 0) { he += d; hp += d * 2; }        // body  → HP  stat (spend() pattern: +2 hp per point)
  else if (item.s === 1) { sp += d; mn += d * 2; }   // mane  → MAG stat (spend() pattern: +2 mp per point)
  else if (item.s === 2) ho += d;                    // horn  → STR stat
  else df += d;                                      // hooves → DEF stat
  if (hp < 1) hp = 1; if (mn < 0) mn = 0;            // safety: unequipping better body/mane can't drop you below 1 hp / 0 mp
};
// Use an inventory slot — equip gear (t=5), consume HP/MP potion (t=0/1). Returns true if consumed.
// Inventory holds ONLY gear now. Potions live exclusively in the bottom hot-bar (see quaff).
const useItem = (i) => {
  const it = inv[i]; if (!it) return;
  inv.splice(i, 1); equip(it); sfx(660, 880, .12, 'triangle', .1); save();   // auto-save: equipment change is progression, matches spend()/openChest()/strike() pattern
};
// QUICK-QUAFF — bottom quick-slot tap drinks from the HP(t0)/MP(t1) counter.
const quaff = (t) => { const g = 10 + su[11] * 5; if (t === 0) { if (hpPot > 0 && hp < mHP()) { hpPot--; hp = Math.min(mHP(), hp + g); sfx(520, 1040, .1, 'triangle', .1); } } else if (mpPot > 0 && mn < mMN()) { mpPot--; mn = Math.min(mMN(), mn + g); sfx(440, 880, .1, 'triangle', .1); } };

// GUARD: gear-drop color range in spawnDrop (`4 + Math.random() * 11`) is coupled to
// PAL.length (15) — indices 4..14. tpos-check.mjs enforces this pairing.
// Outline text helper (module-scope so pause overlay AND creation portrait can both use it)
const T2 = (t, x, y) => { ctx.strokeStyle = 'rgba(0,0,0,.7)'; ctx.lineWidth = 1; ctx.strokeText(t, x, y); ctx.fillText(t, x, y); };
// Stat bar: dark track + coloured fill to `frac` (clamped 0..1 so vitals > max render as full, never overflow).
const bar = (x, y, w, h, frac, c) => { ctx.fillStyle = '#2a2a33'; ctx.fillRect(x, y, w, h); ctx.fillStyle = c; ctx.fillRect(x, y, w * Math.min(1, frac), h); };
// Full-screen dim overlay — death vignette.
const fade = (a) => { if (a > 0) { ctx.fillStyle = `rgba(0,0,0,${a})`; ctx.fillRect(0, 0, VW, VH); } };
// Nested rainbow arc — 7 RC semicircles, radius r shrinking by `step` per band. Shared: HUD shard icon, title arc, particle burst. Caller sets lineWidth.
const rArc = (cx, cy, r, step) => { for (let i = 0; i < 7; i++) { ctx.strokeStyle = RC[i]; ctx.beginPath(); ctx.arc(cx, cy, r - i * step, Math.PI, 0); ctx.stroke(); } };
// Per-character rainbow title text (bold 30px, black outline, even spacing) centered on VW/2 at baseline y. Shared: LEVEL UP banner + title 'UNICORN'. Caller owns globalAlpha.
const rText = (s, y) => {
  ctx.font = 'bold 30px monospace'; ctx.textAlign = 'left'; ctx.strokeStyle = 'rgba(0,0,0,.7)'; ctx.lineWidth = 2;
  const w = ctx.measureText(s).width, ch = w / s.length;
  for (let i = 0; i < s.length; i++) { const cx = VW / 2 - w / 2 + ch * i; ctx.strokeText(s[i], cx, y); ctx.fillStyle = RC[i % 7]; ctx.fillText(s[i], cx, y); }
};
// Shared HP/MP/XP triple stack at (x, y): red HP + blue mana + purple XP (color-coordinated).
const bars = (x, y) => { bar(x, y, 68, 10, hp / mHP(), '#ff5d6c'); ctx.strokeStyle = '#1a1a22'; ctx.lineWidth = 1; ctx.strokeRect(x - .5, y - .5, 69, 11); bar(x, y + 12, 68, 8, mn / mMN(), '#4a76ff'); ctx.strokeRect(x - .5, y + 11.5, 69, 9); bar(x, y + 22, 68, 3, lvl >= CAP ? 1 : xp / need(), '#b06cf0'); };
// Shared portrait panel — renders the identity card (title bar, bordered box with
// HP bar at top, live unicorn silhouette) used by both the PAUSE overlay and the
// CHARACTER-CREATE screen. Title = player name on PAUSE, 'NEW CHARACTER' on create.
// PORTRAIT — opaque menu background + centered unicorn art (equipment slots layer on separately in the menu render).
// Header/bars/HP-MP numbers live in topHUD() now so they're identical between gameplay and menu.
const portraitPanel = () => {
  ctx.fillStyle = '#1e1928'; ctx.fillRect(0, 0, VW, VH);
  ctx.save(); ctx.translate(104, 106); ctx.scale(2.6, 2.6); ctx.translate(-6, -8);
  drawU(0);
  ctx.restore();
};
// TOP-LEFT PERSISTENT HUD — identical in gameplay AND in the character menu. Renders:
//   • "LVn NAME" header (LV cyan, name gold — monospace overpaint trick), matches stat font size
//   • mini rainbow arc + '×N' shard count spaced to the right of the name
//   • HP/MP/XP triple bars with number overlays
// Single font set at top: 8px bold monospace throughout — same rhythm as the stat row.
const topHUD = () => {
  ctx.font = 'bold 8px monospace'; ctx.textAlign = 'left';
  const hdr = 'LV' + lvl + ' ' + pName;
  ctx.fillStyle = '#ffd75e'; T2(hdr, 8, 14);                          // whole header — gold
  ctx.fillStyle = '#8cf'; T2('LV' + lvl, 8, 14);                      // LV n overpaint — cyan
  const rcx = 8 + ctx.measureText(hdr).width + 20;                    // rainbow center = 20px right of name (extra breathing room)
  ctx.lineWidth = 1; rArc(rcx, 14, 8, 1);
  ctx.fillStyle = '#ffd75e'; T2('×' + shards(), rcx + 10, 14);
  bars(8, 18);                                                        // HP/MP/XP triple, top-left (tight to header)
  ctx.textAlign = 'center'; ctx.fillStyle = '#fff';
  T2(hp + '/' + mHP(), 42, 26); T2((mn | 0) + '/' + mMN(), 42, 37);
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
  // Equipment does NOT modify the visible sprite beyond the per-slot color (col[]).
  // Equipment folds bonuses directly into base stats via equip() (Joey directive 2026-09-03).
};
// CHAT BUBBLE — reusable speech bubble that stems from a head at world (hx, topY).
// Single continuous path: rounded corners (arcTo) + a downward tail merged into the bottom edge,
// so one fill+stroke yields a clean outlined bubble with no seam. txt optional ('' = open bubble,
// the structure future dialogue lines drop into — for either the NPC or the player's head).
const bubble = (hx, topY, txt) => {
  const rows = txt.split('|'), w = 100, h = 8 + rows.length * 9, x = hx - w / 2, R = hx + w / 2, y = topY - h - 7, B = y + h, r = 4;   // grows one row per '|' segment
  ctx.fillStyle = '#fffdf5'; ctx.strokeStyle = '#3a2f4a'; ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(R - r, y); ctx.arcTo(R, y, R, y + r, r);          // top edge + TR corner
  ctx.lineTo(R, B - r); ctx.arcTo(R, B, R - r, B, r);          // right edge + BR corner
  ctx.lineTo(hx + 5, B); ctx.lineTo(hx, B + 6); ctx.lineTo(hx - 5, B);   // bottom edge dips into the tail
  ctx.lineTo(x + r, B); ctx.arcTo(x, B, x, B - r, r);          // bottom edge + BL corner
  ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r);          // left edge + TL corner
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#3a2f4a'; ctx.font = '7px monospace'; ctx.textAlign = 'center';
  rows.forEach((s, i) => ctx.fillText(s, hx, y + 12 + i * 9));
};
let hp = 10, xp = 0, lvl = 1;
let mn = 10, pending = 0;
let hpPot = 0, mpPot = 0;                          // POTION HOT-BAR — HP/MP quaff counts (0–5); pickups fill here, overflow spills to bag
const CAP = 15;                                   // hard level cap — all stat gains come from level-up points (no hidden cap bonus)
// Skills are player-chosen via the prerequisite tree (LINK)
let hs = 0, shk = 0;                              // combat feel: hitstop freeze + screen shake, both in seconds
// Boss state: 0=unvisited, 1=on screen, 2=killed(shard taken), {hp,ph,spd,rc}=leash stash
const bs = Array(RBC.length).fill(0);   // boss state per rainbow band — sized off RBC so new CORN are pure data
const shards = () => bs.filter(v => v === 2).length;
const mHP = () => 8 + he * 2 + su[9] * 5;         // base 8 + HP stat (equipment folded in) + HP+ skill (+5)
const mMN = () => 8 + sp * 2 + su[10] * 5;        // base 8 + MAG stat (equipment folded in) + MP+ skill (+5)
const ATK = () => ho;                             // STR stat (equipment folded in)
const critChance = () => .08 + lk * .02;                      // 10% base + 2% per LUCK (LUCK 1 = 10%)
const isCrit = () => Math.random() < critChance();
const need = () => lvl * lvl + 12;
const gainXp = (n, x, y) => {
  if (lvl >= CAP) return;
  xp += n; fly(x, y, '+' + n, '#b06cf0');   // XP text matches the purple XP bar; no label word
  while (xp >= need() && lvl < CAP) {
    xp -= need(); lvl++; pending += 3; spts++;    // EVERY LEVEL: +3 stat pts, +1 skill pt
    hp = mHP(); mn = mMN(); fanfare();            // full HP+MP restore + celebratory sting each level
    luT = time + 1.8;                             // trigger LEVEL UP banner (rainbow, top of screen, matches title font)
  }
  if (lvl >= CAP) xp = 0;
  // NO auto-pause: leveling never freezes play. The ☰ menu button glows (see HUD) to
  // signal pending points; tapping it opens the allocation screen deliberately.
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
// LINK encodes the prerequisite tree: pairs [parent, child]. A node is buyable when any parent is owned (roots always available).
const LINK = [0,10, 0,4, 2,4, 2,7, 6,7, 6,8, 10,9, 4,9, 4,5, 7,5, 7,11, 8,11, 9,3, 5,3, 5,1, 11,1];
const canBuy = i => { let r = 1; for (let k = 1; k < LINK.length; k += 2) if (LINK[k] === i) { if (su[LINK[k-1]]) return 1; r = 0; } return r; };
let aRow = 0;
const SN = () => 5 + invMax() + TREE.length;                  // unified cursor span: stats(0-4) → inv(5..5+iMax-1) → skills(5+iMax..end)
// setRow: assign cursor + auto-sync invSel so existing tooltip / USE-DROP button logic works unchanged.
const setRow = (r) => { const iMax = invMax(); aRow = r; invSel = r >= 5 && r < 5 + iMax ? r - 5 : -1; };
const spend = () => {
  const iMax = invMax();
  if (aRow < 5) {                                             // STAT — costs a pending point
    if (!pending) return;
    STATS[aRow][1](); pending--;
  } else if (aRow < 5 + iMax) {                               // INV — use/equip item at slot
    if (!inv[aRow - 5]) return;
    useItem(aRow - 5); return;                                // useItem plays its own sfx + splices; do NOT double-save
  } else {                                                    // SKILL node — costs a skill point (respects lock/owned)
    const i = aRow - 5 - iMax;
    if (!spts || su[i] || !canBuy(i)) return;
    su[i] = 1; spts--;
  }
  sfx(660, 990, .15, 'triangle', .12); save();                // no auto-close — you stay in the character menu (☰/P/tap-out closes)
};

// ---------- save (single-char keys — terser mangle-props law) ----------
const save = () => {
  localStorage['n20_s' + slot] = JSON.stringify({
    v: 42, h: hp, x: xp, l: lvl, n: mn, g: bs.map(v => v === 2 ? 2 : 0),
    t: [ho, he, sp, df, lk], c: [cp[0], cp[1]], d: pending, k: spts, y: su,
    m: pName, o: oc,
    q: eq, i: inv, p: mute, P: [hpPot, mpPot],   // col derived from eq at load; NOT stored (single source of truth)
  });
};
const load = () => {
  try {
    const d = JSON.parse(localStorage['n20_s' + slot] || '0');
    if (!d || d.v !== 42) return;                               // strict v42 gate — no cross-version compat.
    resetTransient();                                             // clean-state guarantee: no velocity / cooldown / dialogue bleed from prior session
    hp = d.h; xp = d.x; lvl = d.l; mn = d.n;
    d.g.forEach((v, i) => bs[i] = v); pName = d.m; oc = d.o;
    chests = seedChests();
    foes = seedFoes();
    [ho, he, sp, df, lk] = d.t;
    cp = d.c; pl.x = cp[0]; pl.y = cp[1];
    pending = d.d;                                                 // unspent stat points survive reload — ☰ glows, no auto-open
    spts = d.k; d.y.forEach((v, i) => su[i] = v);
    d.q.forEach((v, i) => eq[i] = v);
    inv.length = 0; d.i.forEach(v => inv.push(v));
    hpPot = d.P[0] | 0; mpPot = d.P[1] | 0;
    col = eq.map(e => e ? e.c : 0);                                // derived from equipment (single source of truth)
    mute = d.p | 0;
  } catch (e) { /* fresh oath */ }
};

// ---------- player ----------
const PW = 10, PH = 14;
const NX = 129 * T, NGY = 60 * T;                 // GREAT CORN guide: center-x (tile 129), feet baseline (tile 60 top) — 56px right of the fire so talk/rest zones never overlap
const SX = 126 * T, SY = NGY - PH;                // spawn point (paddock) — feet at NGY ground baseline so intro plays with unicorn standing (no drop-in)
const NPCCOL = [7, 2, 2, 7];                       // GREAT CORN isolated palette: purple body/hooves (PAL[7]), gold mane/horn (PAL[2]) — immune to player gear/color
const NSC = 10 / 7;                                // GREAT CORN render scale — matches the DARK CORN boss silhouette (boss fs=20 ÷ drawU 14-tall bbox)
const pl = { x: SX, y: SY, vx: 0, vy: 0, ground: 0, face: 1, coyote: 0, air: 0, sq: 1, inv: 0, t: 0 };
let cp = [SX, SY], lastSafe = [SX, SY], deathT = 0;
let nearFire = 0, nearNpc = 0;                    // hearth + GREAT CORN proximity flags (JUMP-to-interact)
let paused = 0, helpOn = 0, savePop = 0, luT = 0, navCD = 0;   // pause overlay; help overlay; save popup (EXIT GAME); level-up banner deadline; menu joystick-nav cooldown
// DIALOGUE — dq = active script (INTRO or a 1-line re-talk quip) or 0=closed · di = current bubble · tqi = re-talk cycle index.
// Freezes the sim (like the menu); tap/key advances ONE bubble (comedic beat), closing past the last line.
let dq = 0, di = 0, tqi = 0;
const talk = (s) => { dq = s; di = 0; };
const adv = () => { if (++di >= dq.length) dq = 0; };
let invSel = -1;                                  // selected inventory slot (-1 = none) — first click selects, second click on same slot uses/equips
// HEARTH ACTION — JUMP-near-fire = REST: full HP + MP restore, respawn checkpoint set.
// NOTE: does NOT save the game — the only manual save is the floppy HUD icon (so players
// can't accidentally save at a bad moment by hitting a checkpoint).
const rest = () => {
  const [fx, fy] = seeds.fires[0];
  hp = mHP(); mn = mMN(); cp = [fx * T - 20, (fy - 1) * T];
  spray(pl.x + PW / 2, pl.y + PH / 2, 6); pl.inv = .6; sfx(500, 900, .3, 'triangle', .1);   // full heal → rainbow burst ON the unicorn + brief flash (reuses inv blink); no text needed
};
// Chest reward: item shower only (no heal — fire hearth is the sole heal point). LUCK adds drops.
const openChest = (i) => {
  if (oc & (1 << i)) return;
  oc |= 1 << i;
  const c = chests[i];
  spawnDrop(c.x, c.y, 2);                                     // items only — no heal (fire hearth is the only heal point)
  spray(c.x, c.y - 4, 4); sfx(660, 990, .15, 'triangle', .12);
  save();
};
let dashT = 0, dashCd = 0, adash = 0, dropT = 0;
// FIXED physics — never stat-scaled: the map gate proofs depend on these numbers
const G_RISE = 750, G_FALL = 1500, FALLCAP = 400;
const RUN = 115, V0 = 250;

const solid = (x, y) => tile(x / T | 0, y / T | 0) === 1;
const spike = (x, y) => tile(x / T | 0, y / T | 0) === 3;

// ---------- entities ----------
// Chests: exploration rewards. `oc` bitfield tracks opened state (bit = chest index).
const snapChest = ([x, y], i) => ({ x: x * T, y: groundRow((x * T + 4) / T | 0, y | 0) * T - 5, i });  // seat base on surface row below seed (shared groundRow); -5: body renders to c.y+5
const seedChests = () => seeds.chests.map(snapChest);   // reseed helper — single source for init/load/fresh
let chests = seedChests();
let oc = 0, nearChest = -1;                       // opened bitfield · which chest index the player is standing on (-1 = none)
// FULL progression reset — NEW GAME zeroes every globals so it can't inherit prior saved state.
const fresh = () => {
  resetTransient();                                     // clean-state guarantee (velocity, cooldowns, dialogue) — shared with load() + respawn
  hp = 10; xp = 0; lvl = 1; mn = 10; bs.fill(0); hpPot = mpPot = 0;
  eq.fill(null); inv.length = 0;
  pending = 0; ho = he = sp = df = lk = 1; col = [0, 0, 0, 0];
  oc = 0; pName = 'HORSE';
  spts = 0; su.fill(0);
  shots.length = fbolts.length = parts.length = flies.length = drops.length = 0;
  chests = seedChests();
  foes = seedFoes();
  cp = [SX, SY]; lastSafe = [SX, SY]; pl.x = SX; pl.y = SY;
};
// Non-ranged foes roll for elite status in mkFoe (~6%). Boss banner state:
let bann = 0, bTxt = '', bSub = '';
// Clean-gameplay-state reset — single source of truth for "what is zero at a fresh
// start." Called by fresh() (NEW GAME), load() (CONTINUE), and respawn (death).
// Without this, transient state (velocity, cooldowns, active dialogue) can bleed
// across sessions when EXIT-to-title happens without a page reload.
const resetTransient = () => {
  pl.vx = pl.vy = pl.air = pl.coyote = pl.inv = pl.ground = pl.t = 0;
  pl.face = 1; pl.sq = 1;
  jbuf = dashT = dashCd = adash = dropT = deathT = hs = shk = luT = bann = dq = di = tqi = navCD = 0;
};
const interact = () => { if (nearNpc) { talk([TALK[tqi++ % TALK.length]]); return 1; } if (nearFire) { rest(); return 1; } if (nearChest >= 0) { openChest(nearChest); return 1; } };   // JUMP-near-NPC → cycle a re-talk quip
// Player-level progression: every 4 levels adds 1 scale pip. Enemies stay a threat as the
// player over-levels; bosses reuse the same formula and additionally scale via bi (+dm).
const scl = () => 2 + (lvl >> 2);
const mkFoe = (x, y, k) => {
  // ELITE (el): rare 6% event on non-ranged foes → 3× HP, +2 dmg, +1 size, aqua PAL[9] color,
  // guaranteed drop + gold burst + XP bonus on kill. Provides the "mini-boss moment".
  const [fh, fd, fv, fz, fb] = FT[k], el = Math.random() < .06 ? 1 : 0;
  const zh = fh * (1 + el * 2) * scl() / 2 | 0;                   // el=1 → 3× base HP
  return { x, y, k, cap: fb, vx: fv * (.85 + Math.random() * .3) * (Math.random() < .5 ? 1 : -1), hp: zh, mx: zh, dm: fd + el * 2, el, fl: 0, t: Math.random() * 7, cz: fz + el };
};
const seedFoes = () => seeds.foes.map(([x, y, k]) => mkFoe(x * T, y * T, k));   // reseed helper — single source for init/load/fresh/respawn
let foes = seedFoes();
const fsz = (f) => 5 * f.cz;                      // one size rule for sprites + collision (cz always set by mkFoe/boss inline)
const shots = [], flies = [], parts = [], fbolts = [], drops = [];
const fly = (x, y, txt, c, big) => flies.push({ x, y, txt, c, big, t: big ? 2.2 : 1.4 });   // big texts (crit / heal / shard) linger longer — the distinct signal, no label word needed
// Unified particle spray — n bits burst radially. sk=0 → mini rainbow (7 RC bands: jump/heal/chest/shard/etc) · sk=1 → skull sprite (combat/death). One fan, one code path.
const spray = (x, y, n = 4, sk = 0) => { for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, s = 40 + Math.random() * 90; parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 65, t: .5 + Math.random() * .35, sk }); } };
// Pixel skull sprite — bone dome + big dark eye sockets + nose + teeth. 7×8 bitmap, O=bone D=dark .=skip. u = pixel unit (scales), a = alpha. Shared by combat/death bursts + elite markers.
const SK = ['.OOOOO.', 'OOOOOOO', 'ODDODDO', 'ODDODDO', 'OOODOOO', '.OOOOO.', '.ODODO.', '..OOO..'];
const skull = (x, y, u, a = 1) => {
  ctx.globalAlpha = a;
  for (let r = 0; r < 8; r++) for (let c = 0; c < 7; c++) { const ch = SK[r][c]; if (ch === '.') continue; ctx.fillStyle = ch === 'O' ? '#e9e3cd' : '#161210'; ctx.fillRect(x + (c - 3.5) * u, y + (r - 4) * u, u + .4, u + .4); }
};
// (skull bursts call spray(x, y, n, 1) — the unified helper above; render loop draws p.sk as the bone sprite)
// ITEM DROPS — physical pickups from kills/chests.
// Types: 0 HP potion (+10 HP), 1 MP potion (+10 MP), 5 gear. Shards are progression-only (bs[i]=2, not drops).
// LUCK adds +1 drop per pip.

// Pixel sprites (bitmask rows, MSB-left). Shared 1-bit decoder: spr(data, x, y, w, col)
const spr = (d, x, y, w, c) => { ctx.fillStyle = c; for (let r = 0; r < d.length; r++) for (let b = w; b--;) d[r] >> b & 1 && ctx.fillRect(x + w - 1 - b, y + r, 1, 1); };
// CONSUMABLE icon — ONE potion bottle (I_MP bitmask, data.js) for every consumable;
// the fill color tells what it heals: red = HP (#ff5d6c bar), blue = MP (#4a76ff bar).
// The cork is a dark-brown 2×1 rect painted on top at the pickup site.
// GEAR icons — REUSE drawU's exact body-part primitives (visual consistency: the drop IS the part).
// Gear icon sprites — pro pixel style: dark outline + top-left highlight + shade, tinted by roll color c.
// slot→item: 0 BODY→chest armor · 1 MANE→cape · 2 HORN→sword · 3 HOOVES→boots. Digits index the palette below (.=skip).
const GEAR = [
  ['.011110.','03111120','03111120','03121120','00311200','.031120.','..0220..'],                        // 0 ARMOR (metal breastplate + pauldrons)
  ['...44...','..0110..','.011120.','.011120.','01111120','01111120','01121120','01222210'],              // 1 CAPE (draping fabric + gold clasp)
  ['...31...','..0310..','..0310..','..0310..','..0310..','.044440.','..0550..','...0....'],              // 2 SWORD (highlit blade + gold guard)
  ['011.011.','031.031.','031.031.','031.031.','0111031.','00220022'],                                    // 3 BOOTS (paired boots + dark soles)
];
const drawPart = (s, x, y, c) => {
  const m = GEAR[s], p = ['#17131f', PAL[c], dim(PAL[c], .58), '#fff', '#e8b552', '#9c6f22'];   // 0 outline 1 base 2 shade 3 highlight 4 gold 5 gold-shade
  for (let r = 0; r < m.length; r++) for (let k = 0; k < m[r].length; k++) { const v = m[r][k]; if (v === '.') continue; ctx.fillStyle = p[+v]; ctx.fillRect(x + k - 1, y + r, 1.03, 1.03); }
};
// ONE loot table: HP POTION floor → MP POTION → GEAR (LUCK lifts roll, raising tier & frequency).
// Bosses grant their shard as a progression token on first kill (auto-collected, not a drop).
const spawnDrop = (x, y, n) => {
  for (let i = 0; i < n; i++) {
    const d = { x, y: y - 4, vx: (Math.random() - .5) * 80, vy: -90 - Math.random() * 50, t: 0, life: 0 };
    const r = (Math.random() * 100 | 0) + Math.min(lk, 10) * 4;  // % roll + LUCK
    // gear tier: random roll + LUCK + level vs thresholds
    if (r >= 85) { d.t = 5; d.s = Math.random() * 4 | 0; d.c = (4 + Math.random() * 12) | 0; const t = (1 + Math.random() * 20 | 0) + (lk >> 1) + (lvl >> 2); d.b = t >= 24 ? 3 : t >= 17 ? 2 : 1; }
    else if (r >= 58) d.t = 1;                  // MP POTION (else t=0: HP POTION)
    drops.push(d);
  }
};

const strike = (f, gen, viaStomp) => {
  const crit = isCrit(), dmg = ATK() * (crit ? 2 : 1);
  f.hp -= dmg; f.fl = .15;
  if (!f.bit && !viaStomp) f.vx += (crit ? 220 : 140) * (f.x > pl.x ? 1 : -1); // KNOCKBACK — bosses hold their arena
  shk = Math.max(shk, crit ? .22 : .09);
  fly(f.x, f.y - 8, '-' + dmg, '#ff5d6c', crit);   // unified damage red; crit signaled by bigger size + longer lifetime + fanfare + skull burst (no label word)
  if (crit) { hs = .06; fanfare(); spray(f.x, f.y, 3, 1); }
  if (gen) mn = Math.min(mMN(), mn + 1);          // dash hits GENERATE mana
  // BOSS PHASE 2 — first crossing of half HP, permanent
  if (f.bit && !f.ph && f.hp <= f.mx / 2 && f.hp > 0) {
    f.ph = 1; sfx(220, 110, .35, 'sawtooth', .16);
    const g2 = f.cap |= P2[f.bi];                 // phase 2 GRANTS capabilities — same vocab, pure data
    if (P2[f.bi] & 4) for (let n = 0; n < 2; n++) {                                            // summon minions (event bit — fires on gain). mkFoe() gives full foe contract (cz/mx/cap) so they render + collide + die; without it fsz()→NaN made them invisible ghosts.
      const m = mkFoe(f.x + n * 20 - 10, f.y - 10, 1); m.vx = 40 * (n ? 1 : -1); foes.push(m);
    }
    if (g2 & 32) f.spd = 1.65;                    // SWIFT — faster chase + hop
  }
  if (f.hp <= 0) {
    if (f.dead) return;                                         // 2nd hit same frame — cash-out already ran
    f.dead = 1;                                                 // frame-end prune below; avoids splice-race index shift
    spray(f.x, f.y, 5, 1); gainXp(Math.min(f.k, 3) * 4 + (f.el || 0) * 8 + (crit ? 4 : 0) + (f.bit ? 37 + 6 * f.bi : 0), f.x, f.y - 22); // XP y-22 clears damage at y-8. Elite +8; boss bonus 37+6·bi (was split across two fly texts, now one — foes and bosses share the same visual pattern).
    if (f.bit) spawnDrop(f.x, f.y, 2); else if (f.el || Math.random() < .15 + lk * .03) spawnDrop(f.x, f.y, 1);   // elite guarantees a drop
    if (f.el) sfx(784, 1568, .3, 'triangle', .15);   // elite kill flourish (aqua death burst above signals visually)
    if (f.bit) {                                                // BOSS falls
      for (let i = foes.length; i--;) if (foes[i].bit === f.bit) foes.splice(i, 1);
      if (bs[f.bi] !== 2) {                                     // FIRST KILL — collect rainbow shard automatically (progression token, not an item)
        bs[f.bi] = 2;
        hp = mHP(); mn = mMN();                                 // boss reward: full HP + MP restore
        spray(f.x, f.y, 8); fly(f.x, f.y - 42, 'RAINBOW SHARD ' + shards() + ' / ' + seeds.bosses.length, PAL[RBC[f.bi]], 1);   // y-42 keeps the shard milestone well above damage (y-8) and XP (y-22, y-32)
        if (shards() === seeds.bosses.length) {                 // ALL bosses down — the game's objective PAYS OFF
          bann = time + 6; bTxt = 'THE DARKNESS LIFTS'; bSub = 'UNICORN · HOOVES OF HOPE';   // victory: color/rainbows restored to the world
        }
        sfx(523, 523, .14, 'triangle', .15); sfx(659, 659, .14, 'triangle', .15, .12); sfx(784, 1568, .3, 'triangle', .15, .24);
        save();
      }

    }
    return 1;
  }
};

// ---------- verbs ----------
// DASH is the attack verb: gated behind DASH skill. Half distance base, LONG DASH doubles.
// Strikes foes it passes through, hits GENERATE mana.
function shoot() {                                              // magic bolt (gold): 2 mana
  if (!started || paused || deathT > 0 || !su[0]) return;
  if (mn < 2) return;                                              // silent fail — matches HEAL/DASH convention (MP bar shows the answer)
  mn -= 2; sfx(700, 1300, .12, 'triangle', .09);
  shots.push({ x: pl.x + PW / 2, y: pl.y + 5, vx: pl.face * 270, t: .55 + .25 * su[1] });   // base range SHORT; FAR SHOT extends (.55s→.80s)
}
function dash() {                                               // THE attack verb: burst + strike-through; 1 mana (dash-hits refund it via `gen` in strike)
  if (!started || paused || deathT > 0 || dashCd > 0 || !su[6] || mn < 1) return;
  if (!pl.ground) { if (adash) return; adash = 1; }             // dash works in air too — once per airtime, resets on landing
  dashT = su[7] ? .15 : .075;                                   // base = HALF distance; LONG DASH doubles it (gates the spike lake)
  dashCd = .45; pl.sq = .6; mn -= 1; sfx(600, 200, .12, 'sawtooth', .12);
}
function heal() {                                               // instant tap-to-cast; 3 mana, +3 HP base (+6 with SUPER HEAL)
  if (!started || paused || deathT > 0 || !su[2] || mn < 3 || hp >= mHP()) return;
  const hm = 3 + su[3] * 3;
  mn -= 3; hp = Math.min(mHP(), hp + hm);
  spray(pl.x + PW / 2, pl.y + 4, 4); sfx(520, 1040, .25, 'triangle', .12); fly(pl.x, pl.y - 12, '+' + hm, '#9fe89a', 1);
}

const hurt = (n, safe) => {
  if (pl.inv > 0 || deathT > 0) return;
  n = Math.max((n >> 2) || 1, n - df);                         // DEFENSE — gradient floor: 25% of raw (min 1), preserves boss threat
  hp -= n; pl.inv = 1.2; shk = Math.max(shk, .22);
  sfx(140, 55, .25, 'sawtooth', .12); spray(pl.x, pl.y + 7, 4);

  if (hp <= 0) { deathT = 1.6; spray(pl.x + PW / 2, pl.y + PH / 2, 7, 1); return; }   // player death — skulls burst from the fallen unicorn
  if (safe) { pl.x = lastSafe[0]; pl.y = lastSafe[1]; pl.vx = pl.vy = 0; }
  else pl.vy = -180;
};

// ---------- update ----------
let last = performance.now(), time = 0;
const step = (dt) => {
  if (hs > 0) { hs -= dt; return; }               // HITSTOP — world freezes for the crit punch
  if (paused) {                                    // character menu freezes sim; joystick steps the linear cursor (keyboard nav stays in the keydown handler)
    navCD -= dt;
    const nd = keys.has('bL') || keys.has('bU') ? -1 : keys.has('bR') || keys.has('bD') ? 1 : 0;   // left/up = prev · right/down = next
    if (!nd) navCD = 0;                             // stick released → next push moves instantly
    else if (navCD <= 0) { setRow((aRow + nd + SN()) % SN()); navCD = .16; }   // held → repeat every .16s
    return;
  }
  if (dq) return;                                  // dialogue overlay freezes the sim (like the menu); a tap/key advances it
  time += dt; jbuf -= dt; pl.inv -= dt; pl.t += dt; dashT -= dt; dashCd -= dt; dropT -= dt; shk -= dt;
  pl.sq += (1 - pl.sq) * Math.min(1, dt * 10);

  if (deathT > 0) {
    deathT -= dt;
    if (deathT <= 0) { resetTransient(); hp = mHP(); mn = mMN(); pl.x = cp[0]; pl.y = cp[1]; pl.inv = 1.5; foes = seedFoes(); seeds.bosses.forEach(([,,bi]) => { if (bs[bi] !== 2) bs[bi] = 0; }); drops.length = 0; }   // respawn: clean transients + full HP+MP, reseed foes, reset all non-dead bosses, clear drops; pl.inv overrides resetTransient's 0 for i-frames
    return;
  }
  if (!started) return;

  // -- drop-through: DOWN on a one-way platform falls through it (S doubles as down here) --
  const onPlat = pl.ground && tile((pl.x + PW / 2) / T | 0, (pl.y + PH + 1) / T | 0) === 2;
  if (onPlat && held('ArrowDown', 'KeyS', 'bD')) { dropT = .16; pl.ground = 0; pl.y += 3; pl.vy = 60; }

  // -- run --
  const dir = (held('KeyD', 'ArrowRight', 'bR') ? 1 : 0) - (held('KeyA', 'ArrowLeft', 'bL') ? 1 : 0);
  pl.vx += (dir * RUN - pl.vx) * Math.min(1, dt * 12 * (pl.ground ? 1 : .65));
  if (dir) pl.face = dir;

  // -- jump: buffer + coyote + variable + double --
  pl.coyote = pl.ground ? .1 : pl.coyote - dt;
  if (jbuf > 0) {
    if (pl.coyote > 0) { pl.vy = -V0; pl.coyote = 0; pl.air = 0; jbuf = 0; pl.sq = .7; sfx(280, 520, .12); spray(pl.x + PW / 2, pl.y + PH, 3); }
    else if (su[4] && pl.air < 1 + su[5]) { pl.vy = -(V0 - 20); pl.air++; jbuf = 0; pl.sq = .7; sfx(280, 520, .12); spray(pl.x + PW / 2, pl.y + PH, 3); }   // TRI JUMP — same sound as ground jump (unified)
  }
  if (pl.vy < 0 && !jumpHeld()) pl.vy *= .82;
  if (dashT > 0) {                                              // dash: flat burst, strike foes
    pl.vx = pl.face * 400; pl.vy = 0;
    const dc = `hsl(${pl.x * 4 % 360} 80% 60%)`;                 // rainbow dash smear — hue tied to POSITION (coherent trail), not time (flicker)
    parts.push({ x: pl.x + PW / 2, y: pl.y + 5, vx: 0, vy: 0, t: .3, c: dc });    // 2 particles/frame at 2 heights → fuller, brighter ribbon
    parts.push({ x: pl.x + PW / 2, y: pl.y + 13, vx: 0, vy: 0, t: .3, c: dc });
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
    const feet = pl.y + PH, ty = feet / T | 0, top = ty * T, fc = (pl.x + PW / 2) / T | 0;
    for (const ox of [1, PW - 1]) {
      const tv = tile((pl.x + ox) / T | 0, ty);
      if (tv === 1 || (tv === 2 && py + PH <= top + 4 && dropT <= 0)) {
        pl.y = top - PH;
        if (bounceSet.has(ty * W + fc)) {                        // BOUNCE MUSHROOM — big launch; air=0 keeps DJ/TRI for the combo
          pl.vy = jumpHeld() ? -480 : -430; pl.air = 0; pl.sq = .6; spray(pl.x + PW / 2, feet, 5); sfx(220, 640, .16, 'sine', .13);
        } else {
          if (!wasGround && pl.vy > 250) { pl.sq = 1.35; spray(pl.x + PW / 2, feet, 4); sfx(150, 70, .06, 'square', .07); }
          pl.vy = 0; pl.ground = 1; pl.air = 0;
        }
        break;
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

  // -- bosses: each grants a rainbow shard on first kill (auto-collected progression token, no drop) --
  seeds.bosses.forEach(([bx, by, bi]) => {                      // bi (rainbow band) from seed — all DARK CORN bosses share the one world
    const bit = 1 << bi;
    if (bs[bi] === 1 || bs[bi] === 2) return;                     // engaged OR killed → skip (killed bosses stay dead)
    if (Math.hypot(pl.x - bx * T, pl.y - by * T) < 80) {
      const st = bs[bi], fresh = !st;                             // st truthy only when leash-stashed (mid-fight state)
      // BOSS stat formula: hp = 20*scl() (player-level scaled); dm = 8+bi (per-boss ramp:
      // RED=8, ORANGE=9, YELLOW=10, BLUE=11, VIOLET=12). cz=4 = 4× foe cell size (visual+hit).
      bs[bi] = 1;
      const bhp = 20 * scl() | 0;
      foes.push({
        x: bx * T, y: by * T, vx: 0, vy: 0, k: 3, bi, bit, cz: 4, dm: 8 + bi,
        fl: 0, t: 0, mx: bhp,
        cap: 18 | (fresh ? 0 : st.ph && P2[bi]),
        hp: fresh ? bhp : st.hp,
        ph: fresh ? 0 : st.ph, spd: fresh ? 0 : st.spd, rc: fresh ? undefined : st.rc,
      });
      sfx(110, 55, .5, 'sawtooth', .18);
      bann = time + 2.2; bTxt = 'DARK CORN'; bSub = 'KEEPER OF A RAINBOW SHARD';   // all bosses share the name; horn+mane color = identity
    }
  });

  // -- shots --
  for (const s of shots) {
    s.t -= dt; s.x += s.vx * dt;
    parts.push({ x: s.x, y: s.y, vx: 0, vy: 0, t: .25, c: `hsl(${s.x * 4 % 360} 80% 60%)` });   // rainbow-wave comet — per-frame trail, hue by position → coherent streak from the horn
    if (solid(s.x, s.y)) { s.t = 0; spray(s.x, s.y, 3); }
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
        const dx = pl.x + PW / 2 - f.x - fs / 2, dy = pl.y + PH / 2 - f.y - fs / 2, d = Math.hypot(dx, dy) || 1, psp = f.bit ? 115 : 90;   // psp = projectile speed (was 'sp' — shadowed MAG stat)
        fbolts.push({ x: f.x + fs / 2, y: f.y + fs / 2, vx: dx / d * psp, vy: dy / d * psp, t: 2.6 });
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
    if (f.vy > 0 && (tv === 1 || tv === 2)) {
      f.y = ty * T - fs; f.vy = 0; f.gr = 1;
      // SHOCKWAVE (cap 8) — ring the ground on landing; bosses gain it at phase 2, any foe row can carry it
      if (f.cap & 8 && !wasGr) {
        shk = Math.max(shk, .3); spray(f.x + fs / 2, f.y + fs, 4); sfx(90, 40, .3, 'sawtooth', .18);   // shockwave: white impact energy (matches shot-hits-wall vocabulary)
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
  for (let i = foes.length; i--;) if (foes[i].dead) foes.splice(i, 1);   // frame-end prune — foes refill only on death (soft reset), never mid-run

  // -- HEARTH proximity flag (input handling lives in keydown/pointerdown; JUMP is universal interact) --
  nearFire = 0;
  for (const [fx, fy] of seeds.fires) if (Math.hypot(pl.x - fx * T, pl.y - fy * T) <= 26) { nearFire = 1; break; }
  nearNpc = Math.hypot(pl.x - NX, pl.y - NGY) < 34 ? 1 : 0;   // single fixed-point check (no loop) — GREAT CORN re-talk zone; 56px from the fire so zones never overlap

  // ITEM DROPS — float, gravity, tile collision, proximity pickup
  for (const d of drops) {
    d.life += dt;   // age (float/bob only) — NO despawn: drops leave the world only on player death, exactly like foes
    d.vy = Math.min(200, d.vy + 400 * dt); d.y += d.vy * dt; d.x += d.vx * dt; d.vx *= .97;
    if (d.vy > 0 && solid(d.x, d.y + 3)) { d.vy = 0; d.y = ((d.y + 3) / T | 0) * T - 3; }   // land on ground
    if (Math.hypot(pl.x + PW / 2 - d.x, pl.y + PH / 2 - d.y) < 14) {   // touch it → pick up (stays on ground if nowhere to put it)
      // Potion → hot-bar counter (cap 5, drop stays on ground if full). Gear → bag (drop stays on ground if bag full).
      const took = d.t === 0 ? (hpPot < 5 && (hpPot++, fly(d.x, d.y, '+HP POT', '#ff5d6c'), 1))
        : d.t === 1 ? (mpPot < 5 && (mpPot++, fly(d.x, d.y, '+MP POT', '#4a76ff'), 1))
        : inv.length < invMax() && (inv.push({ s: d.s, c: d.c, b: d.b }), fly(d.x, d.y, '+BAG', '#ffd75e'), 1);
      if (took) { d.dead = 1; sfx(520, 1040, .1, 'triangle', .1); }   // only vanish when actually collected
    }
  }
  for (let i = drops.length; i--;) if (drops[i].dead) drops.splice(i, 1);
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

  const tx = pl.x + PW / 2 + pl.face * 40 - VW / 2, ty = pl.y - VH / 2 - 60;   // vertical bias: player sits low on screen → grass near bottom, sky/play-area above, dirt strip below for clear level separation
  cam.x += (tx - cam.x) * .08; cam.y += (ty - cam.y) * .1;
  cam.x = Math.max(0, Math.min(W * T - VW, cam.x));
  cam.y = Math.max(0, Math.min(H * T - VH, cam.y));

  // SKY — bright blue gradient, white clouds, cheerful Zelda/Mario feel
  // BACKGROUND = flat blue sky + parallax clouds. Visual detail lives in the ground layer.
  ctx.fillStyle = ZBG; ctx.fillRect(0, 0, VW, VH);                          // sky backdrop
  // CLOUDS — parallax puffs
  for (const [cx, cy, cw] of [[80, 30, 40], [200, 50, 55], [350, 25, 35], [500, 60, 45], [650, 35, 30]]) {
    const sx = ((cx - cam.x * .15) % (VW + 100)) - 50;
    ctx.fillStyle = 'rgba(255,255,255,.6)';
    ctx.fillRect(sx, cy, cw, 8); ctx.fillRect(sx + 4, cy - 4, cw - 8, 6); ctx.fillRect(sx + 8, cy + 6, cw - 16, 5);
  }

  // SCREEN SHAKE — offset the world translate, not the HUD (which draws after the untranslate)
  const so = shk > 0 ? Math.random() * 6 - 3 : 0;
  ctx.translate((-cam.x + so) | 0, (-cam.y + so) | 0);
  const x0 = cam.x / T | 0, x1 = Math.min(W, x0 + VW / T + 2), y0 = Math.max(0, cam.y / T | 0), y1 = Math.min(H, y0 + VH / T + 2);
  const [GD, GT, GF, GA] = ZG, RB = dim(GA, .75);   // [dirt, top, foliage, accent]; RB = derived rock base
  for (let j = y0; j < y1; j++) for (let i = x0; i < x1; i++) {
    const v = tile(i, j); if (!v) continue;
    if (v === 1) {
      // SOLID GROUND — dirt body, lighter surface-top where exposed to air
      ctx.fillStyle = GD; ctx.fillRect(i * T, j * T, T + .5, T + .5);
      if (tile(i, j - 1) !== 1) { ctx.fillStyle = GT; ctx.fillRect(i * T, j * T, T + .5, 5); }
    } else if (v === 2) {
      // PLATFORM — chunky: surface-top + dirt underside
      ctx.fillStyle = GD; ctx.fillRect(i * T, j * T + 2, T + .5, 7);
      ctx.fillStyle = GT; ctx.fillRect(i * T, j * T, T + .5, 4);
    } else {
      // SPIKES — universal danger color
      ctx.fillStyle = '#e05555';
      for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(i * T + k * 4, j * T + T); ctx.lineTo(i * T + k * 4 + 2, j * T + 8); ctx.lineTo(i * T + k * 4 + 4, j * T + T); ctx.fill(); }
    }
  }

  // Hearth: campfire — checkpoint + full HP/MP restore on JUMP-near (rest()). Does NOT save.
  for (const [fx, fy] of seeds.fires) {
    const cxp = fx * T, cyp = fy * T;
    // Campfire: pure static decoration — log + two flame triangles. The shape IS the feature (no animation).
    ctx.fillStyle = '#6b4a2b'; ctx.fillRect(cxp - 8, cyp + 4, 16, 4);                                                                                // log base
    ctx.fillStyle = '#ff9d3c'; ctx.beginPath(); ctx.moveTo(cxp - 5, cyp + 5); ctx.lineTo(cxp, cyp - 4); ctx.lineTo(cxp + 5, cyp + 5); ctx.fill();     // outer flame
    ctx.fillStyle = '#ffe08a'; ctx.beginPath(); ctx.moveTo(cxp - 2.5, cyp + 5); ctx.lineTo(cxp, cyp - .4); ctx.lineTo(cxp + 2.5, cyp + 5); ctx.fill(); // inner core
  }
  // CHESTS — hand-placed (currently 4). Opened chests vanish (persisted in oc).
  // JUMP-near-chest opens (touch JUMP button glows gold when nearChest ≥ 0).
  for (const c of chests) {
    if (oc & (1 << c.i)) continue;                          // claimed → gone forever (persisted in oc)
    ctx.fillStyle = '#6b4a2b';                              // dark oak base
    ctx.fillRect(c.x - 6, c.y - 2, 12, 7);                  // body
    ctx.fillStyle = '#8a6a3a';                              // lighter oak lid
    ctx.fillRect(c.x - 6, c.y - 5, 12, 3);                  // lid down (closed)
    ctx.fillStyle = '#ffd75e';                              // gold latch/band
    ctx.fillRect(c.x - 1, c.y - 1, 2, 3);
  }
  // WORLD DECORATIONS — data-driven from DECO seeds. Positions are data, draw is shared.
  // 0=tree 1=grass 2=rock 3=mushroom 4=dead tree 5=ice crystal 6=flower 7=cattail 8=crystal cluster
  for (const [dx, dy, dt] of DECO) {
    const px = dx * T, py = dy * T + T;                          // py = ground surface (feet level)
    if (px < cam.x - T || px > cam.x + VW + T || py < cam.y - T || py > cam.y + VH + T) continue;
    if (dt === 0 || dt === 4) { // TREE — shared geometry; 0 live (foliage palette), 4 dead (gray+purple)
      ctx.fillStyle = dt ? '#444' : GD; ctx.fillRect(px + 6, py - 12, 4, 12);
      ctx.fillStyle = dt ? '#3a2244' : GF;                                   // canopy (two rects, one fillStyle)
      ctx.fillRect(px + 1, py - 20, 14, 9); ctx.fillRect(px + 3, py - 23, 10, 5);
    } else if (dt === 1) { // GRASS — foliage blades (static)
      ctx.fillStyle = GF;
      ctx.fillRect(px + 3, py - 5, 1, 5); ctx.fillRect(px + 7, py - 7, 1, 7); ctx.fillRect(px + 11, py - 4, 1, 4);
    } else if (dt === 2) { // ROCK — accent boulder (base = derived-darker accent)
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
    } else if (dt === 7) { // CATTAIL — reed stems + brown seed head (wetland / meadow edge)
      ctx.fillStyle = GF;
      ctx.fillRect(px + 5, py - 9, 1, 9); ctx.fillRect(px + 8, py - 13, 1, 13); ctx.fillRect(px + 11, py - 7, 1, 7);
      ctx.fillStyle = '#7a5230'; ctx.fillRect(px + 7, py - 13, 3, 5);        // seed head on the tall stem
    } else if (dt === 8) { // CRYSTAL CLUSTER — gem shards on a rock base (cavern / peak flair)
      ctx.fillStyle = RB; ctx.fillRect(px + 3, py - 3, 10, 3);               // rock base
      ctx.fillStyle = '#c47fe0'; ctx.fillRect(px + 4, py - 7, 2, 4); ctx.fillRect(px + 10, py - 6, 2, 3);   // side shards
      ctx.fillStyle = '#e0b0ff'; ctx.fillRect(px + 7, py - 11, 2, 8);        // tall center shard
      ctx.fillStyle = '#fff'; ctx.fillRect(px + 7, py - 11, 1, 2);           // glint
    }
  }

  // BOUNCE MUSHROOMS — red cap + white spots + cream stem; breathing squash signals "springy / interactive"
  for (const [bx, br] of BOUNCE) {
    const px = bx * T, base = br * T;
    if (px < cam.x - T || px > cam.x + VW + T) continue;
    const p = Math.sin(time * 5 + bx) * 1.2;                     // ±1.2px squash pulse
    ctx.fillStyle = '#e8e2d0'; ctx.fillRect(px + 5, base - 6, 5, 6);            // stem
    ctx.fillStyle = '#e34d4d'; ctx.fillRect(px + 1, base - 10 + p, 14, 5 - p);  // red cap (squashes with the pulse)
    ctx.fillStyle = '#fff'; ctx.fillRect(px + 4, base - 8 + p, 2, 1); ctx.fillRect(px + 9, base - 9 + p, 2, 1);  // spots
  }

  // ARTICULATED ENEMY SPRITES — legs step, antennae bob, robe folds. One draw path,
  // boss/elite share the silhouette scaled up. cz = elite/boss cell multiplier.
  for (const f of foes) {
    const s = f.cz, fs = 5 * s, wob = Math.sin(f.t * 6) * 1.5, sh = FT[f.k][5];   // sh = body shape from the type table
    const step = Math.sin(f.t * 8) * s * .35;                   // leg-step animation, shared
    ctx.save();
    ctx.translate(f.x + fs / 2, f.y + fs);
    ctx.scale((f.vx || 1) < 0 ? -1 : 1, 1);
    ctx.translate(-fs / 2, -fs);
    // colour: white flash on hit > red pre-strike wind-up tell > elite/base tint. boss=charcoal.
    ctx.fillStyle = f.fl > 0 ? '#fff' : f.wt > .12 ? '#ffb0b0' : f.bit ? '#2a2a33' : f.el ? PAL[9] : FOECOL[f.k];
    if (f.bit) {                                                // DARK CORN — renders via drawU (canonical unicorn) with a temporary col swap.
      // Body/hooves: PAL[13] dark (flash→12 white, tell→4 red). Horn+mane: PAL[RBC[bi]] identity band (rage→12 white in phase 2).
      const bd = f.fl > 0 ? 12 : f.wt > .12 ? 4 : 13, hn = f.ph ? 12 : RBC[f.bi];
      ctx.scale(fs / 14, fs / 14);                              // scale drawU 14-bbox → fs
      const bc = col; col = [bd, hn, hn, bd]; drawU(Math.sin(f.t * 8) * 3); col = bc;
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
    if (f.hp < f.mx) bar(f.x, f.y - 3, fs, 1, f.hp / f.mx, '#ff5d6c');   // shared HP bar (all foes + bosses, shown when damaged)
  }
  for (const s of shots) { ctx.fillStyle = `hsl(${s.x * 4 % 360} 80% 60%)`; ctx.fillRect(s.x - 3, s.y - 2, 6, 4); }   // magic bolt head: spatial-hue rainbow (matches its comet trail; hue by position, not time)
  for (const b of fbolts) {                                     // foe bolt: purple diamond with a pale core
    ctx.fillStyle = '#c47fe0'; ctx.fillRect(b.x - 3, b.y - 3, 6, 6);
    ctx.fillStyle = '#fff'; ctx.fillRect(b.x - 1, b.y - 1, 2, 2);
  }

  // DEFEATED DARK CORNs — linger at their arena as friendly NPCs: GREAT-CORN purple body/hooves,
  // but keeping their own band-colored horn + mane. Face the player, gentle idle bob. Same sprite as the boss.
  if (started) for (const [bx, by, bi] of seeds.bosses) if (bs[bi] === 2) {
    const fx = bx * T, fy = by * T;
    ctx.save();
    ctx.translate(fx + 10, fy + 20); ctx.scale(pl.x + PW / 2 < fx + 10 ? -1 : 1, 1); ctx.translate(-10, -20); ctx.scale(NSC, NSC);
    const bc = col; col = [7, RBC[bi], RBC[bi], 7]; drawU(Math.sin(time * 2 + bi)); col = bc;   // redeemed corn: purple body + rainbow horn/mane
    ctx.restore();
  }

  // GREAT CORN — the guide NPC standing beside the fire. Isolated palette via col swap to NPCCOL,
  // faces left toward spawn (scale -1), gentle idle bob. Drawn before the player so the hero renders on top.
  if (started) {
    ctx.save();
    ctx.translate(NX, NGY); ctx.scale(-NSC, NSC); ctx.translate(-PW / 2, -PH);   // boss-sized, feet planted at NGY, faces left
    const bc = col; col = NPCCOL;
    drawU(Math.sin(time * 2));
    col = bc;
    ctx.restore();
  }

  // unicorn — hidden on the title (phase 0) so the meadow backdrop shows no duplicate
  // player under the big branding unicorn; the spawn framing is otherwise clean.
  if (started && (pl.inv <= 0 || Math.sin(time * 40) > 0)) {
    ctx.save();
    ctx.translate(pl.x + PW / 2, pl.y + PH); ctx.scale((2 - pl.sq) * pl.face, pl.sq); ctx.translate(-PW / 2, -PH);
    drawU(pl.ground && Math.abs(pl.vx) > 20 ? Math.sin(pl.t * 16) * 3 : (pl.ground ? 0 : 2));
    ctx.restore();
  }

  // Item drops — pixel sprites, bob gently, fade near end of life
  for (const d of drops) {
    ctx.globalAlpha = Math.min(1, d.life);
    const dy = Math.sin(d.life * 5) * 1.5, dx = d.x - 3, ddy = d.y - 3 + dy;
    if (d.t < 2) { const px = d.x - 6, py = d.y - 6 + dy; spr(I_MP, px, py, 12, d.t ? '#4a76ff' : '#ff5d6c'); ctx.fillStyle = '#c9a26a'; ctx.fillRect(px + 4, py - 2, 4, 3); }   // POTION 12×14 body + 4×3 opaque tan cork — matches hot-bar (single-source dims)
    else { drawPart(d.s, dx - 1, ddy - 1, d.c); ctx.strokeStyle = SC[SLOT_STAT[d.s]]; ctx.lineWidth = d.b * .5; ctx.strokeRect(dx - 2, ddy - 2, 10, 10); }   // GEAR (t=5) — stat-color stroke; tier via width
  }
  ctx.lineWidth = 1;
  for (const p of parts) {                                        // 3 particle kinds: p.sk = skull sprite (combat/death) · p.c = single-hue trail dot (dash smear / shot comet) · else = full 7-band rainbow burst
    const al = Math.min(1, p.t * 2.5);
    if (p.sk) { skull(p.x, p.y, 1.4, al); continue; }
    ctx.globalAlpha = al;
    if (p.c) { ctx.fillStyle = p.c; ctx.fillRect(p.x - 1.5, p.y - 1.5, 3, 3); continue; }   // coherent hue trail — cheap dot, not a full rainbow
    rArc(p.x, p.y, 5.5, .75);
  }
  ctx.globalAlpha = 1;
  for (const f of flies) {
    ctx.globalAlpha = Math.min(1, f.t * 2); ctx.font = (f.big ? 'bold 13px' : 'bold 8px') + ' monospace';
    ctx.fillStyle = f.c; ctx.fillText(f.txt, f.x | 0, f.y | 0);
  }
  ctx.globalAlpha = 1;
  if (dq) { const s = dq[di], u = s[0] === '~'; bubble(u ? pl.x + PW / 2 : NX, u ? pl.y - 4 : NGY - 26, u ? s.slice(1) : s); }   // bubble stems from the speaker's head — '~' = player reply, else GREAT CORN
  ctx.translate((cam.x - so) | 0, (cam.y - so) | 0);            // undo world translate (incl. shake)

  // ---------- HUD (gameplay-only overlays: boss banner, level-up banner, death vignette) ----------
  // Top-left LV/name/rainbow/bars live in topHUD() below (persistent, also visible in the menu).
  if (started && !paused) {
    if (time < bann) {                                          // BOSS BANNER — arena-entry announcement
      ctx.textAlign = 'center'; ctx.font = 'bold 13px monospace'; ctx.fillStyle = '#ffd75e';
      T2(bTxt, VW / 2, 58);
      if (bSub) { ctx.font = 'bold 8px monospace'; ctx.fillStyle = '#fff'; T2(bSub, VW / 2, 68); }
    }
    if (time < luT) {                                           // LEVEL UP BANNER — rainbow per-char, matches title 'UNICORN' font/style
      ctx.globalAlpha = Math.min(1, (luT - time) * 3);          // pop in, fade last .33s
      rText('LEVEL UP', 48);
      ctx.globalAlpha = 1;
    }
    fade(1 - Math.abs(deathT - .8) / .8);
  }

  // CHARACTER SHEET overlay — cursor navigates freely across stats / inventory / skill tree.
  // Space/Enter on cursor position dispatches: spend stat pt, use item, or spend skill pt.
  if (paused && started) {
    portraitPanel();                                          // opaque menu bg + centered unicorn art
    // Establish text baseline for the entire menu block: center-aligned, 8px monospace.
    // Every subsequent label / value / hint in this block expects these defaults; without
    // this explicit set they inherit whatever textAlign was left from the previous frame
    // and equipment labels / stat numbers render offset to the right of their boxes.
    ctx.textAlign = 'center'; ctx.font = 'bold 8px monospace';
    // Stat points available — "+N" centered just under the unicorn
    if (pending) { ctx.fillStyle = '#ffd75e'; ctx.font = 'bold 11px monospace'; T2('+' + pending, 104, 136); }
    // EQUIPMENT — 4 slots cornered around the unicorn (anatomy: MANE top-left, HORN top-right, BODY bottom-left, HOOVES bottom-right).
    ctx.font = 'bold 8px monospace';                          // reset from the 11px pending hint above (if it fired)
    [[1, 38, 64], [2, 146, 64], [0, 38, 112], [3, 146, 112]].forEach(([s, ex, ey]) => {
      ctx.fillStyle = eq[s] ? 'rgba(255,255,255,.06)' : '#2a2a33'; ctx.fillRect(ex, ey, 24, 24);   // dark cell so the colored gear icon pops (matches inventory)
      ctx.strokeStyle = SC[SLOT_STAT[s]]; ctx.lineWidth = eq[s] ? eq[s].b * .5 : .5; ctx.strokeRect(ex, ey, 24, 24);   // stat-color outline; tier shown via stroke width (0.5 / 1 / 1.5)
      if (eq[s]) drawPart(s, ex + 8, ey + 9, eq[s].c);        // actual gear icon (armor/cape/sword/boots) in its roll color — same sprite as inventory/drops
      ctx.fillStyle = '#ccc'; T2(SLOT_LBL[s], ex + 12, ey + 31);
      if (eq[s]) { ctx.fillStyle = '#fff'; T2('+' + eq[s].b, ex + 19, ey + 8); }   // tier tucked top-right so it clears the centered icon
    });
    // STATS — one row across the bottom of the box; cursor = gold column (always visible; "+1" hint only when a point is available)
    const SL = [['STR', ho], ['HP', he], ['MAG', sp], ['DEF', df], ['LCK', lk]];
    SL.forEach(([l, v], i) => { const c = SC[i];
      const sx = 42 + i * 26, sel = i === aRow;
      if (sel) { ctx.fillStyle = 'rgba(255,215,94,.14)'; ctx.fillRect(sx - 3, 152, 25, 23); ctx.strokeStyle = '#ffd75e'; ctx.lineWidth = 1; ctx.strokeRect(sx - 3, 152, 25, 23);
        if (pending) { ctx.fillStyle = '#ffd75e'; T2('+1', sx + 9, 150); } }
      ctx.fillStyle = c; ctx.font = 'bold 8px monospace'; T2(l, sx + 9, 160);
      T2(v, sx + 9, 171);
    });
    // INVENTORY — 5×2 grid UNDER the gold box (5 base, +5 STASH → max 10). Click to select, click again to equip.
    const iMax = invMax(), iSz = 24, iGap = 28;
    for (let i = 0; i < iMax; i++) {
      const ix = 38 + (i % 5) * iGap, iy = 184 + ((i / 5) | 0) * iGap, it = inv[i];
      ctx.fillStyle = it ? 'rgba(255,255,255,.08)' : 'rgba(255,255,255,.03)';
      ctx.fillRect(ix, iy, iSz, iSz);
      ctx.strokeStyle = i === invSel ? '#ffd75e' : (it ? SC[SLOT_STAT[it.s]] : '#444');
      ctx.lineWidth = i === invSel ? 1 : (it ? it.b * .5 : .5); ctx.strokeRect(ix, iy, iSz, iSz);   // stat-color stroke, tier via width
      if (it) drawPart(it.s, ix + 8, iy + 9, it.c);            // inventory holds ONLY gear now — always draws the part
    }
    // Tooltip: opaque panel pops up-right from the selected slot toward screen center.
    // Same box style as skill nodes (#1e1928 bg + gold border). Dynamic per-slot so the
    // popup direction (up + slight right) reads naturally from wherever the user tapped.
    if (invSel >= 0 && inv[invSel]) {
      const it = inv[invSel];
      const desc = SLOT_LBL[it.s] + ' +' + it.b + ' ' + STATS[SLOT_STAT[it.s]][0];   // gear only (potions live in the hot-bar)
      const tw = 130, tx = Math.min(VW - tw - 4, 48 + (invSel % 5) * 28);
      const ty = Math.max(4, 156 + ((invSel / 5) | 0) * 28);   // 4px above the selected slot's row
      ctx.fillStyle = '#1e1928'; ctx.fillRect(tx, ty, tw, 20);
      ctx.strokeStyle = '#ffd75e'; ctx.lineWidth = 1; ctx.strokeRect(tx, ty, tw, 20);
      ctx.fillStyle = '#ffd75e'; T2(desc, tx + tw / 2, ty + 13);
    }
    // SKILL TREE — prerequisite layout (4 rows). Names always visible (locked = dim gray, picked = gold).
    // Diagonal cosmetic paths draw first (behind nodes), showing positional progression:
    // each T1 links to the T2 pair it sits between, each T2 links to adjacent T3(s).
    ctx.font = 'bold 8px monospace'; ctx.textAlign = 'center';
    if (spts) { ctx.fillStyle = '#ffd75e'; T2('+' + spts, 338, 42); }   // skill points available, above the tree
    const NS = 26;
    // Diagonal connection lines — prerequisite tree (LINK) parent→child paths
    ctx.strokeStyle = '#444'; ctx.lineWidth = .5;
    for (let k = 0; k < LINK.length; k += 2) {
      const [ax, ay] = TPOS[LINK[k]], [bx, by] = TPOS[LINK[k + 1]];
      ctx.beginPath(); ctx.moveTo(ax + NS / 2, ay + NS); ctx.lineTo(bx + NS / 2, by); ctx.stroke();
    }
    // Nodes — always show name; locked/available/purchased differentiated by color/stroke only.
    TREE.forEach((nm, i) => {
      const [cx, cy] = TPOS[i];
      ctx.fillStyle = '#1a1a22'; ctx.fillRect(cx, cy, NS, NS);
      ctx.fillStyle = su[i] ? 'rgba(255,215,94,.18)' : 'rgba(255,255,255,.05)'; ctx.fillRect(cx, cy, NS, NS);
      ctx.strokeStyle = su[i] ? '#ffd75e' : '#555'; ctx.lineWidth = su[i] ? 1 : .5; ctx.strokeRect(cx, cy, NS, NS);
      if (aRow === 5 + iMax + i) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.strokeRect(cx - 1, cy - 1, NS + 2, NS + 2); }   // cursor on this skill node
      ctx.fillStyle = su[i] ? '#ffd75e' : '#888';
      const w = nm.split(' ');
      if (w.length > 1) { ctx.fillText(w[0], cx + NS / 2, cy + 11); ctx.fillText(w.slice(1).join(' '), cx + NS / 2, cy + 21); }
      else ctx.fillText(nm, cx + NS / 2, cy + 17);
    });
    // (shards indicator lives in topHUD now — top-left, persistent in gameplay + menu)
    // USE/DROP are functional button labels (not a control hint) — control reference lives ONLY in the ? overlay.
    if (invSel >= 0 && inv[invSel]) {
      ctx.font = 'bold 8px monospace'; ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(255,215,94,.14)'; ctx.strokeStyle = '#ffd75e'; ctx.lineWidth = 1;
      ctx.fillRect(50, 250, 50, 14); ctx.strokeRect(50, 250, 50, 14);
      ctx.fillRect(110, 250, 50, 14); ctx.strokeRect(110, 250, 50, 14);
      ctx.fillStyle = '#ffd75e'; T2('USE', 75, 260); ctx.fillStyle = '#c33'; T2('DROP', 135, 260);
    }
  }

  // action buttons — hidden during pause / level-up (dedicated overlays own the input)
  // Colored ring per action, dark disc, glyph in accent color. Modern mobile pattern.
  // Shown in gameplay AND the character menu (menu: JUMP = confirm/select, MELEE = back/close).
  if (started && !savePop && !helpOn) {
    ctx.textAlign = 'center';
    for (const [x, y, c, col, s, mp] of AB) {
      if (paused && c !== 'bJ') continue;            // menu shows only JUMP (= confirm/select); joystick handles nav, back stays on ☰/tap-out
      const usable = (s < 0 || su[s]) && mn >= mp;
      // usable → bright (JUMP recolors gold near interactables); locked OR low-MP → dull #555
      const rc = usable ? (c === 'bJ' && (nearFire || nearChest >= 0 || nearNpc) ? '#ffd75e' : col) : '#555';
      ctx.globalAlpha = keys.has(c) ? .85 : (touch ? .55 : .38);
      ctx.fillStyle = 'rgba(15,15,20,.75)';
      ctx.beginPath(); ctx.arc(x, y, AR, 0, 7); ctx.fill();
      ctx.strokeStyle = rc; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x, y, AR, 0, 7); ctx.stroke();
      // HEAL glyph — bold green cross fills the disc: vibrant darker-green outline + bright vibrant-green core.
      // Own green palette (NOT the lock-dimmed ring color rc) so the icon reads green even when unavailable; alpha still conveys state.
      if (c === 'bH') {
        ctx.fillStyle = '#28a84a';                                        // outline — vibrant darker green
        ctx.fillRect(x - 4, y - 12, 8, 24); ctx.fillRect(x - 12, y - 4, 24, 8);
        ctx.fillStyle = '#6cf279';                                        // core — bright vibrant green
        ctx.fillRect(x - 2, y - 10, 4, 20); ctx.fillRect(x - 10, y - 2, 20, 4);
      }
      // JUMP glyph — two-tone (deep-blue outline + bright core), matching the HEAL cross treatment.
      // Context-swaps: menu → checkmark (confirm/select); gameplay → double up-chevron (leap), gold near fire/chest (REST/OPEN).
      if (c === 'bJ') {
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        const gold = !paused && (nearFire || nearChest >= 0 || nearNpc);
        const oc = gold ? '#b8801f' : '#2f6fb0', cc = gold ? '#ffe08a' : '#cfeeff';   // outline / core (gold when an interact is available)
        const path = paused
          ? () => { ctx.beginPath(); ctx.moveTo(x - 9, y + 1); ctx.lineTo(x - 3, y + 8); ctx.lineTo(x + 10, y - 8); ctx.stroke(); }              // ✓ confirm
          : () => { for (const py of [y - 8, y + 2]) { ctx.beginPath(); ctx.moveTo(x - 9, py + 7); ctx.lineTo(x, py); ctx.lineTo(x + 9, py + 7); ctx.stroke(); } };  // ⌃⌃ leap
        ctx.strokeStyle = oc; ctx.lineWidth = 6; path();
        ctx.strokeStyle = cc; ctx.lineWidth = 3; path();
        ctx.lineCap = 'butt'; ctx.lineJoin = 'miter';
      }
      // DASH glyph — gold two-tone: forward arrow + trailing speed lines (the lunging strike). Own gold palette, alpha conveys locked/low-MP.
      if (c === 'bM') {
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        const arrow = () => { ctx.beginPath(); ctx.moveTo(x - 5, y); ctx.lineTo(x + 9, y); ctx.moveTo(x + 3, y - 7); ctx.lineTo(x + 10, y); ctx.lineTo(x + 3, y + 7); ctx.stroke(); };
        const speed = () => { ctx.beginPath(); ctx.moveTo(x - 12, y - 6); ctx.lineTo(x - 7, y - 6); ctx.moveTo(x - 12, y + 6); ctx.lineTo(x - 7, y + 6); ctx.stroke(); };   // motion streaks
        ctx.strokeStyle = '#b8801f'; ctx.lineWidth = 6; arrow(); ctx.lineWidth = 4; speed();   // outline — darker gold
        ctx.strokeStyle = '#ffe08a'; ctx.lineWidth = 3; arrow(); ctx.lineWidth = 2; speed();   // core — bright gold
        ctx.lineCap = 'butt'; ctx.lineJoin = 'miter';
      }
      // SHOOT glyph — purple two-tone lightning bolt (filled zigzag + dark edge), matching the family flair.
      if (c === 'bS') {
        ctx.lineJoin = 'round';
        const bolt = () => { ctx.beginPath(); ctx.moveTo(x + 5, y - 12); ctx.lineTo(x - 6, y + 1); ctx.lineTo(x - 1, y + 1); ctx.lineTo(x - 4, y + 12); ctx.lineTo(x + 7, y - 3); ctx.lineTo(x + 1, y - 3); ctx.closePath(); };
        bolt(); ctx.strokeStyle = '#7b3fd4'; ctx.lineWidth = 4; ctx.stroke();   // outline — deep vibrant purple
        ctx.fillStyle = '#e2c9ff'; ctx.fill();                                 // core — bright lavender
        ctx.lineJoin = 'miter';
      }
    }
    ctx.globalAlpha = 1;
  }
  // joystick — persistent base; knob tracks thumb; brightens while held. Gameplay only (hidden in the character menu).
  if (started && touch && !savePop && !helpOn) {   // gameplay AND character menu (menu uses it for cursor nav); hidden only under overlays
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

  // ---------- PERSISTENT HUD (top-left header + bottom-center potions) — visible in gameplay AND character menu ----------
  if (started) {
    topHUD();
    const qslot = (x, t) => {
      const n = t ? mpPot : hpPot;
      ctx.fillStyle = 'rgba(255,255,255,' + (n ? '.08' : '.03') + ')'; ctx.fillRect(x, QSY, QSZ, QSZ);
      ctx.strokeStyle = n ? '#555' : '#444'; ctx.lineWidth = .5; ctx.strokeRect(x, QSY, QSZ, QSZ);
      ctx.globalAlpha = n ? 1 : .4; spr(I_MP, x + 6, QSY + 6, 12, t ? '#4a76ff' : '#ff5d6c'); ctx.globalAlpha = 1; ctx.fillStyle = '#c9a26a'; ctx.fillRect(x + 10, QSY + 4, 4, 3);   // 4×3 opaque cork (alpha reset before cork so empty slots keep cork solid). Bitmap has 3 skinny neck rows; cork covers r0, r1-2 visible as clear skinny-neck feature.
      ctx.fillStyle = n ? '#fff' : '#888'; ctx.font = 'bold 8px monospace'; ctx.textAlign = 'right'; ctx.fillText(n, x + QSZ - 2, QSY + QSZ - 2);
    };
    qslot(QHX, 0); qslot(QMX, 1);
  }
  // Top-right icon row — unified 12×12 buttons using the character-menu box style
  // (rgba(255,255,255,.05) fill + #555 0.5-stroke, matching inventory + skill nodes).
  // One helper draws every wrapper; only the glyph inside changes.
  if (started) {
    const iy = 4, isz = 12, box = (x) => {
      ctx.fillStyle = 'rgba(255,255,255,.05)'; ctx.fillRect(x, iy, isz, isz);
      ctx.strokeStyle = '#555'; ctx.lineWidth = .5; ctx.strokeRect(x, iy, isz, isz);
    };
    const px = VW - 74; box(px);                               // Menu (hamburger) — ALWAYS shown; toggles sheet / closes allocation
    if (!paused && (pending || spts)) { ctx.strokeStyle = RC[(time * 6 | 0) % 7]; ctx.lineWidth = 1; ctx.strokeRect(px, iy, isz, isz); }   // rainbow glow = points to spend (stat OR skill)
    ctx.fillStyle = '#c8b888';
    for (let i = 0; i < 3; i++) ctx.fillRect(px + 3, iy + 3 + i * 3, 6, 1);
    {                                                          // Save · Mute — always shown (incl. the character menu)
      const sx = VW - 56; box(sx);                              // Floppy — save
      ctx.fillStyle = '#ccc'; ctx.fillRect(sx + 3, iy + 2, 6, 5); ctx.fillStyle = '#555'; ctx.fillRect(sx + 6, iy + 3, 2, 3);
      ctx.fillStyle = '#888'; ctx.fillRect(sx + 2, iy + 8, 8, 3);
      const mx = VW - 38; box(mx);                              // Speaker — mute
      if (mute & 2) { ctx.strokeStyle = '#c33'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(mx + 3, iy + 3); ctx.lineTo(mx + 9, iy + 9); ctx.moveTo(mx + 9, iy + 3); ctx.lineTo(mx + 3, iy + 9); ctx.stroke(); }
      else { ctx.fillStyle = '#ccc'; ctx.fillRect(mx + 3, iy + 5, 2, 3); ctx.beginPath(); ctx.moveTo(mx + 5, iy + 5); ctx.lineTo(mx + 8, iy + 3); ctx.lineTo(mx + 8, iy + 10); ctx.lineTo(mx + 5, iy + 8); ctx.fill(); }
    }
    box(VW - 20);                                               // ? — help (always, incl. level-up)
    ctx.font = 'bold 8px monospace'; ctx.textAlign = 'center'; ctx.fillStyle = '#c33'; ctx.fillText('?', VW - 14, iy + 10);
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
  // TITLE screen (phase 0) — the live world renders behind this (sim frozen while
  // !started), so the paddock view doubles as the title backdrop. A light scrim dims
  // the scene just enough to keep the branding legible over the lively foliage.
  if (phase === 0) {
    ctx.fillStyle = 'rgba(0,0,0,.34)'; ctx.fillRect(0, 0, VW, VH);
    // Rainbow arc — uses module-level RC palette (shared with title + effects)
    ctx.lineWidth = 3;
    rArc(VW / 2, 130, 78, 3);
    // Centered unicorn — reuses drawU (same tail, hooves, mane geometry). Title sets
    // gold horn via col override + rainbow-mane overlay for iconic title branding.
    ctx.save(); ctx.translate(VW / 2, 108); ctx.scale(2.4, 2.4); ctx.translate(-6, -8);
    const bkc = col; col = [0, 0, 2, 0]; drawU(0); col = bkc;
    ['#ff5d6c', '#ffd75e', '#6bc5ff'].forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(5 - i * 2, 1 + i * 2, 2, 4); });
    ctx.restore();
    // Title — rainbow per-character matching the arc; subtitle in white
    rText('UNICORN', 168);
    ctx.textAlign = 'center'; ctx.fillStyle = '#9fe89a'; ctx.font = 'bold 13px monospace'; T2('Hooves of Hope', VW / 2, 188);
    // Title art above stays in EVERY mode — menu / name entry / slot select swap below it.
    if (tMode === 1) {                                             // NAME ENTRY
      const nm = ent + (Math.sin(time * 4) > 0 && ent.length < 8 ? '_' : '');
      ctx.fillStyle = '#fff'; ctx.font = 'bold 13px monospace'; T2(nm || '(type A–Z)', VW / 2, 204);
      ctx.fillStyle = ent ? '#ffd75e' : '#555'; T2('BEGIN', VW / 2, 224);   // plain text, dim until a name is entered (no panel)
    } else {                                                       // SLOT LIST (tMode 0) — the only pre-play menu; occupied → resume, empty → name entry
      ctx.font = 'bold 13px monospace';
      for (let i = 0; i < 2; i++) {
        ctx.fillStyle = sSel === i ? '#ffd75e' : '#888';
        T2('SLOT ' + (i + 1) + ' · ' + (sMeta(i) || 'NEW GAME'), VW / 2, 208 + i * 16);
      }
      if (sPop) {                                                  // DELETE / CONTINUE popup — bottom strip, slot list stays visible above so player sees which slot is being acted on
        ctx.fillStyle = 'rgba(0,0,0,.7)'; ctx.fillRect(0, 240, VW, 30);
        ctx.fillStyle = sPop === 2 ? '#f66' : '#666';   T2('DELETE',   VW / 2 - 55, 258);   // destructive on the LEFT
        ctx.fillStyle = sPop === 1 ? '#ffd75e' : '#888'; T2('CONTINUE', VW / 2 + 55, 258);  // safe on the RIGHT (thumb-natural default)
      }
    }
  }
  // HELP OVERLAY — controls reference, toggled by "?" button
  if (helpOn && started) {
    ctx.fillStyle = 'rgba(0,0,0,.88)'; ctx.fillRect(0, 0, VW, VH);
    ctx.textAlign = 'center'; ctx.font = 'bold 8px monospace';
    ctx.fillStyle = '#ffd75e'; T2('CONTROLS', VW / 2, 60);
    [['MOVE','A D S / ← → ↓'],['JUMP','SPACE / W / ↑'],['DASH','J'],['SHOOT','L'],['HEAL','H'],['PAUSE','P']].forEach(([a, b], i) => {
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
