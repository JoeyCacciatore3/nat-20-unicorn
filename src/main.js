// HOOVES OF HOPE — 2D pixel-art platformer. Canvas 2D, no WebGL.
//
// Design pillars (see OneStone project "uni-corn" for full history + rationale):
//   - Stat allocation (STR/HP/MAG/DEF/LUCK), no classes
//   - 4-slot color-driven equipment gear (BODY/MANE/HORN/HOOVES) — each drop
//     is an RPG item icon: armor / cape / horn blade / horseshoe (drawPart), tinted by roll color
//   - ONE open skill tree, 10 single-rank nodes, all player-chosen (no auto-learn)
//   - Rainbows = collection goal (one per DARKCORN boss; win = all bands, seeds.bosses.length)
//   - Unified character sheet: pause + level-up share layout
//   - 10-slot inventory (fixed max); potions live in a separate hot-bar (5 HP / 5 MP)
//     if their stat isn't full else stored for later — click to use, X to drop
//   - HP/MP color-coded: GREEN HP potion (heal-green #6cf279) + blue MP potion
//   - Fixed world palette; sky (#6bc5ff) + grass (#5ac878) RESERVED for background
//
// Build: esbuild → terser → roadroller → inline → zip → ECT → 13,312-byte gate.
//   npm run build   (also runs map audit + tpos-check, logs to SIZELOG.md)
//   wavedash build push -m "message"
//
// Save: strict v44 JSON to localStorage. Version bumps discard prior saves.

import { T, W, H, tile, seeds, DECO, BOUNCE, groundRow } from './world.js';    // map geometry + tiles + shared ground-snap
const bounceSet = new Set(BOUNCE.map(([x, r]) => r * W + x));                         // solid-row landing cells → spring launch
import { PAL, mane3, dim, SLOT_STAT, SLOT_LBL, SC, FOECOL, FT, RBC, RC, ZB, TREE, TPOS, I_MP, INTRO, TALK } from './data.js'; // static lookup tables

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
addEventListener('orientationchange', fit);   // iOS safety-net: resize doesn't always fire on rotation
visualViewport && (visualViewport.addEventListener('resize', fit), visualViewport.addEventListener('scroll', fit));   // scroll = iOS URL bar mid-slide; keeps letterbox tight during the bar's toggle animation
fit();
let SS = 1, SOX = 0, SOY = 0;                    // view transform (for pointer mapping)

// ---------- input: one scheme — WASD+arrows move, Space/W/Up jump, J dash, L shoot, H heal, S/Down crouch-drop, P menu ----------
const J_KEYS = ['Space', 'KeyW', 'ArrowUp'];        // JUMP — Space canonical, W (WASD up), ArrowUp (arcade tradition)

const keys = new Set();
let jbuf = 0, started = 0, touch = 0;
// ---------- title / name-entry / class-select flow ----------
// phase 0 = title (tMode: 0 slot list / 1 name entry), 2 = playing (started=1).
let phase = 0, ent = '', pName = 'HORSE';
let tMode = 0, sPop = 0; // title mode 0 slot · 1 name; slot popup 0 closed · 1 CONTINUE selected · 2 DELETE selected
// HIDDEN NAME INPUT — the standard mobile-canvas technique: focusing a real <input>
// inside the tap gesture summons the OS keyboard (iOS requires the gesture).
// It is the single source of truth for `ent` while focused; window keydown defers.
const NI = document.body.appendChild(document.createElement('input'));
NI.autocapitalize = 'off'; NI.autocorrect = 'off'; NI.spellcheck = false;   // oninput uppercases; no need to latch the mobile shift key
NI.style.cssText = 'position:fixed;left:-99px;top:0;width:1px;height:1px;font-size:16px;border:0;padding:0';
NI.oninput = () => { ent = NI.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 8); NI.value = ent; };
// ONE SAVE SLOT (n20_s0). sMeta reads name+level for the title label without loading.
const sMeta = () => { try { const d = JSON.parse(localStorage['n20_s0'] || '0'); return d && d.v === 44 ? d.m + ' · LV' + d.l : 0; } catch { return 0; } };
// NAME entry: A-Z type, BACKSPACE delete (empty backspace → back to slot list), ENTER begins.
// FLOW HELPERS — the ONLY code paths that change phase. Keyboard and touch both
// route here; one source of truth so the begin/resume transitions can't drift.
const beginGame = () => {
  if (!ent) return; NI.blur(); pName = ent;
  // DEVICE-CONDITIONAL TUTORIAL — touch is latched before any begin path (slot tap). Swap INTRO 6/7 to touch prompts; the highlight ring names the control, the text names the action.
  if (touch) { INTRO[6] = 'Push that to walk.'; INTRO[7] = 'That one jumps.|Jump near me to chat.|I permit it.'; }
  phase = 2; started = 1; talk(INTRO); save();
};  // name REQUIRED · auto-opens the GREATCORN intro (new game only; resume skips it)
const resumeGame = () => { load(); phase = 2; started = 1; };
const pickSlot = () => {                                               // the single slot is the only pre-play menu — no NEW GAME/CONTINUE layer
  if (sMeta()) sPop = 1;                                               // occupied → CONTINUE / DELETE confirm (default = CONTINUE, safe)
  else { fresh(); ent = ''; tMode = 1; }                               // empty → name entry (required) → begin
};
const delSlot = () => { localStorage.removeItem('n20_s0'); sPop = 0; };   // wipe save; label reverts to NEW GAME on next render
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
  // SLOT (tMode 0) — single slot; Enter/Space picks it
  if (e.code === 'Enter' || e.code === 'Space') pickSlot();
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
    else if (e.code === 'ArrowLeft' || e.code === 'KeyA') navSel(-1, 0);
    else if (e.code === 'ArrowRight' || e.code === 'KeyD') navSel(1, 0);
    else if (e.code === 'ArrowUp' || e.code === 'KeyW') navSel(0, -1);
    else if (e.code === 'ArrowDown' || e.code === 'KeyS') navSel(0, 1);
    else if (e.code === 'Enter' || e.code === 'Space') spend();
    return;
  }
  // JUMP is the universal INTERACT (NPC talk / chest open)
  if (J_KEYS.includes(e.code) && interact()) return;
  keys.add(e.code);
  if (J_KEYS.includes(e.code)) jbuf = .12;
  if (e.code === 'KeyJ') dash();                          // J = dash — the attack verb (contact damage during dash)
  if (e.code === 'KeyL') shoot();                         // L = shoot — one bolt per TAP (no rapid fire)
  if (e.code === 'KeyH') heal();
  if (e.code === 'KeyP' && deathT <= 0) { paused = 1; setRow(0); }   // P opens the menu (close handled in the paused block above)

});
addEventListener('keyup', (e) => keys.delete(e.code));
const held = (...c) => c.some(k => keys.has(k));


// ---------- touch overlay (minimal: joystick + JUMP + earned skill buttons) ----------
// JUMP is the universal interact/confirm (menu: select; gameplay: NPC/chest).
// ACTION BUTTONS — all four ALWAYS visible, uniform size. Ring is bright when USABLE
// (skill unlocked AND enough MP), else dull #555 — one rule covers both "locked" and "out of MP".
// Each: [x, y, key, brightColor, suIdx (-1 = always unlocked)]. Fan-arc = landscape thumb-reach.
const AR = 20, BVS = .7;                          // AR = touch radius (hit = AR+6) · BVS = visual scale (buttons draw at 70%, r=14, but keep the 26px touch target)
// [TOUCH x, y, key, skillGate (-1 = always)]. These are the TAP-zone centres (r=AR+6). The VISUALS draw 7px pulled toward the cluster centre (424,216) — see the render loop — so touch zones stay maximally spread (0 overlap) while the buttons cluster tight. Symmetric 2×2: touch cols VW-30/VW-82, rows VH-28/VH-80 (52px apart = exactly 2×touch-r, zones just kiss). Every non-JUMP action costs the uniform 3 MP. Ring accent = one UI color (#8cf); glyph carries identity.
const AB = [
  [VW - 30, VH - 28, 'bJ', -1],   // BR corner
  [VW - 82, VH - 28, 'bM', 6],    // BL
  [VW - 82, VH - 80, 'bS', 0],    // TL
  [VW - 30, VH - 80, 'bH', 2],    // TR
];
const PFX = VW / 2, PFY = QSY - 6;                // PLAYER FEEDBACK SPOT — one source of truth for every player-side popup EXCEPT damage: XP · MP cost · HEAL amount · quaff · pickup. Anchored above the potion hot-bar (screen-space via hud=1 flag). Damage stays in world (above player OR above enemy).
const ptrs = new Map();
const toV = (e) => [(e.clientX * DPR - SOX) / SS, (e.clientY * DPR - SOY) / SS];
// ---------- floating joystick (movement, touch only) ----------
// FIXED base pinned at home (operator directive 2026-09-05: the stick never moves on screen).
// Any touch in the LEFT 40% grabs it; joy.x/y record the grab origin so the drag is measured
// RELATIVE to the thumb (natural feel) while the visual base + ring stay drawn at home.
// Y-axis push-down = crouch/drop-through platform.
const JHX = 36, JHY = VH - 34, JR = 26, KR = 11, JMX = JR - 8, JVS = AR * BVS / JR;   // home MIRRORS the JUMP button's corner offsets (VW-36, VH-34) — symmetric thumb anchors · JR = TOUCH base r (grab/clamp math, unchanged) · JVS scales the VISUAL to the buttons' 14px draw radius
const joy = { x: JHX, y: JHY, dx: 0, dy: 0, id: -1 };

const joySet = () => {                                           // knob offset → digital movement keys
  keys.delete('bL'); keys.delete('bR'); keys.delete('bD'); keys.delete('bU');
  if (joy.dx < -6) keys.add('bL'); else if (joy.dx > 6) keys.add('bR');
  if (joy.dy > 12) keys.add('bD'); else if (joy.dy < -12) keys.add('bU');   // up = menu nav (not jump)
};
const joyEnd = () => { joy.id = -1; joy.dx = joy.dy = 0; joySet(); };   // base is FIXED at home — only clear the knob + movement keys
const grabJoy = (vx, vy, id) => { joy.id = id; joy.x = vx; joy.y = vy; joy.dx = joy.dy = 0; joySet(); };   // joy.x/y = grab ORIGIN → drag is relative to the thumb (natural feel); the visual base stays pinned at home (JHX,JHY)
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
    if (hit(VW / 2 - 100, 200, 200, 16)) pickSlot();               // single slot row (y≈208)
    return;
  }
  // Save popup — CONTINUE / EXIT GAME
  if (savePop) {
    if (hit(VW / 2 + 20, 244, 70, 20)) { savePop = 0; return; }
    if (hit(VW / 2 - 90, 244, 70, 20)) { save(); paused = 0; helpOn = 0; savePop = 0; started = 0; phase = 0; tMode = 0; sPop = 0; return; }
    return;
  }
  // Help/Settings overlay — dismiss on any tap
  if (helpOn) { helpOn = 0; return; }
  if (dq) { adv(); return; }                                     // dialogue: any tap advances one bubble (before HUD icons, so a tap can't leak through)
  // Universal in-game input — HUD icons + potions work identically in gameplay AND paused menu.
  // Wrapped in one started-guard instead of per-line, and potion hits hoisted above the paused
  // block so the SAME two hit-tests serve both states (was: duplicated inside + outside paused).
  if (started) {
    // Character menu = tap the top-left info panel (name/HP/MP/XP). Toggles open; ✕ button (top-right) closes.
    if (hit(0, 0, 90, 44)) { paused ^= 1; if (paused) setRow(0); return; }
    if (hit(VW - 60, 0, 18, 20)) { mute ^= 2; return; }   // 🔊 Speaker — leftmost of the top-right cluster (pure runtime audio toggle, NOT saved)
    if (hit(VW - 42, 0, 20, 20)) { helpOn = 1; return; }   // ? HELP — middle
    if (hit(VW - 22, 0, 22, 20)) { if (paused) paused = 0; else { save(); savePop = 1; } return; }   // ✕ BACK — corner (traditional close position) — menu: close · gameplay: save + exit popup
    // POTIONS (bottom-center): tap HP box → quaff(0), MP box → quaff(1). Padded 3px for thumbs.
    if (hit(QHX - 3, QSY - 3, QSZ + 6, QSZ + 6)) { quaff(0); return; }
    if (hit(QMX - 3, QSY - 3, QSZ + 6, QSZ + 6)) { quaff(1); return; }
    // PAUSE overlay — tap a skill-tree cell to rank up; any other tap closes
    if (paused) {                                                // CHARACTER MENU — inventory + (when points remain) stat/skill allocation, one screen
      // GAMEPAD MENU CONTROLS (checked first, take priority over cell-taps): joystick = cursor nav, JUMP = confirm/select.
      if (e.pointerType === 'touch' && Math.hypot(vx - JHX, vy - JHY) < JR + 8) { grabJoy(vx, vy, e.pointerId); return; }
      { const [bx, by] = AB[0]; if (Math.hypot(vx - bx, vy - by) < AR + 6) { spend(); ptrs.set(e.pointerId, 'bJ'); keys.add('bJ'); return; } }   // AB[0] = JUMP
      // ACTION / DROP buttons — overlap the grid (y=250-264 inside grid y=184-268), checked first.
      // LEFT box = EQUIP/UNEQUIP via spend() (dispatches by cursor region). Right box = DROP (bag only). Left placement puts primary action nearest the joystick thumb.
      if ((inv[aRow - 5] || (aRow >= EB && eq[aRow - EB])) && hit(50, 250, 50, 15)) { spend(); return; }
      if (inv[aRow - 5] && hit(110, 250, 50, 15)) { inv.splice(aRow - 5, 1); return; }
      // WORN gear slots — tap selects; the UNEQUIP button (or JUMP/confirm) acts. One action path, no redundant tap-again.
      for (const [s, ex, ey] of EQ) if (hit(ex, ey, 24, 24)) { const r = EB + s; if (aRow === r) spend(); else setRow(r); return; }   // tap selects; tap-again = UNEQUIP (also EQUIP/UNEQUIP button + JUMP)
      // Inventory grid — tap selects; tap-again = EQUIP (also EQUIP button + JUMP). Coords match render at (50, 172) after 2026-09-06 shift up-right to clear joystick visual.
      if (hit(62, 172, 140, 84)) {
        const iC = ((vx - 62) / 28) | 0, iR = ((vy - 172) / 28) | 0, iI = iR * 5 + iC;
        if (iI < BAG && inv[iI]) { const r = 5 + iI; if (aRow === r) spend(); else setRow(r); return; }
        return;                                                  // tap on empty inv area — no-op, keeps menu open
      }
      // Stat/skill tap — moves cursor there, tap selected again to spend (unified for touch)
      const ci = ((vx - 56) / 26) | 0;                                       // ci = stat-cell column index (was 'col' — shadowed unicorn palette). 56 = stat render base (sx 69) minus the same ~13px left-lead the tap zone always had
      if (vy > 156 && vy < 182 && vx > 56 && vx < 186 && ci >= 0 && ci < 5) { if (aRow === ci) spend(); else setRow(ci); return; }
      for (let i = 0; i < TREE; i++) { const [nx, ny] = TPOS[i]; if (hit(nx, ny, 26, 26)) { const r = 5 + BAG + i; if (aRow === r) spend(); else setRow(r); return; } }
      paused = 0; return;                                        // tap anywhere else closes
    }
  }
  // JOYSTICK: any touch in the left 40% grabs the fixed stick (base pinned at home; drag is relative to the grab point)
  if (started && e.pointerType === 'touch' && vx < VW * .4) { grabJoy(vx, vy, e.pointerId); return; }
  for (const [x, y, c] of AB) if (Math.hypot(vx - x, vy - y) < AR + 6) {
    // JUMP button contextualizes: near NPC it's INTERACT, not jump
    if (c === 'bJ' && interact()) return;
    ptrs.set(e.pointerId, c); keys.add(c);
    if (c === 'bJ') jbuf = .12;
    if (c === 'bM') dash();
    if (c === 'bS') shoot();   // one bolt per TAP (no rapid fire / hold-to-auto-fire)
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
let mute = 0;                                     // runtime audio toggle: 0 = on, 2 = muted. Not persisted — resets each session.
const sfx = (f0, f1, d, type = 'square', v = .12, dl = 0) => {
  if (mute || !AC) return; const r = .97 + Math.random() * .06;
  const o = AC.createOscillator(), g = AC.createGain(), t = AC.currentTime + dl;
  o.type = type; o.frequency.setValueAtTime(f0 * r, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(f1 * r, 1), t + d);
  g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.001, t + d);
  o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + d);
};
const fanfare = () => { for (let i = 0; i < 4; i++) sfx(440 * (1 + i * .25), 440 * (1 + i * .25), .1, 'square', .12, i * .07); };
// ---------- music: "Meadow Trot v3" — softer, slower, calming loop (~80 BPM, 2 bars of 8ths). Plays on TITLE + throughout the game.
// Own note() (NOT sfx): sfx's random detune + freq ramp would de-tune the melody. Envelope = 50ms soft fade-in + gentle exp decay (delicate, non-plucky onset).
const MB = [[0, 4, 7, 4, 9, 7, 4, 2], [5, 9, 12, 9, 7, 4, 2, 0]], MBS = [[0, -9], [5, 7]];
const note = (f, d, ty, v, t) => {
  const o = AC.createOscillator(), g = AC.createGain(); o.type = ty; o.frequency.value = f;
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + .05); g.gain.setTargetAtTime(0, t + .05, d * .6);
  o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + d);
};
let MP = 0;
setInterval(() => {
  if (!AC || mute || document.hidden) return;   // no !started gate → plays on TITLE (once AC woken by first input) + throughout the game
  const t = AC.currentTime + .05, b = MB[MP >> 3 & 1], s = MP & 7, c = b[s];
  if (!s || c != b[s - 1]) { let l = 1; while (s + l < 8 && b[s + l] == c) l++; note(523.25 * 2 ** (c / 12), .39 * l, 'sine', .055, t); }
  if (!(s & 3)) { const q = MBS[MP >> 3 & 1][s >> 2]; if (q > -9) note(65.41 * 2 ** (q / 12), 1.34, 'triangle', .06, t); }
  MP++;
}, 372);

// ---------- RPG: stats, equipment, skill tree ----------
// 5 stats: STR (physical dmg: dash+stomp) · HP (max ♥) · MAG (magic dmg: shoot + max ✦) · DEF (dmg reduction) · LUCK (crit + drops)
let st = [1, 1, 1, 1, 1];       // 5 base stats indexed [0]STR [1]HP [2]MAG [3]DEF [4]LCK — one array (not 5 named vars) so equip/level/save all dispatch by index, no if-else. Each starts at 1 (no dead stats).
// Unicorn part colors — one palette index per body part (0=BODY, 1=MANE, 2=HORN, 3=HOOVES).
// Equipping slot s writes col[s], which drives drawU's fill colors.
let col = [0, 0, 0, 0];
// EQUIPMENT — 4 equipped slots + inventory bag. Items = {t:type, s:slot, c:color, b:bonus}.
// Slot 0=BODY(+HP), 1=MANE(+MAG), 2=HORN(+STR), 3=HOOVES(+DEF). Bonus 0=cosmetic.
const eq = [null, null, null, null];
const inv = [];
const BAG = 10;                                       // BAG cap (fixed; STASH skill removed 2026-09-05). Inlined as a const, not a helper — measured smaller under roadroller.
// Equip: apply color + stat bonus. Unequip old item back to inventory if it has a bonus.
// Equipment folds directly into base stats (single source of truth). Delta = new bonus − old bonus;
// stat mutation mirrors spend() so HP/MP grow/shrink together with mHP/mMN (like a level-up).
// CONTRACT: caller MUST ensure bag has room (useItem splices new item out first — that's what makes the swap safe).
// STAT-INDEX applier (0 STR · 1 HP · 2 MAG · 3 DEF · 4 LUCK) — the ONE place gear touches stats. Used by primary AND sub-stats. No tiers: magnitudes come from level at drop.
// Apply an item's whole contribution: PRIMARY (its slot's stat via SLOT_STAT) + optional SUB-stat (it.u index / it.v amount). g=+1 equip, -1 unequip; clamp vitals to new max after. Direct st[i]+=d (array index replaces the old addStat if-else).
const applyItem = (it, g) => { st[SLOT_STAT[it.s]] += g * it.b; if (it.u != null) st[it.u] += g * it.v; if (hp > mHP()) hp = mHP(); if (mn > mMN()) mn = mMN(); };
const equip = (item) => {
  const old = eq[item.s];
  if (old) { applyItem(old, -1); inv.push(old); }    // strip the swapped-out item's stats fully, back to bag
  eq[item.s] = item; col[item.s] = item.c;
  applyItem(item, 1);                                 // add the new item's stats (primary + any sub)
};
// Bag holds ONLY gear (potions live in the hot-bar). Using a bag slot = EQUIP it.
const useItem = (i) => {
  const it = inv[i]; if (!it) return;
  inv.splice(i, 1); equip(it); sfx(660, 880, .12, 'triangle', .1);           // no auto-save — player owns save via ✕ button
};
// UNEQUIP — worn slot s back to the bag (needs a free slot; no-op if full). Reverse of equip: strip stats, drop tint.
const unequip = (s) => {
  const it = eq[s]; if (!it || inv.length >= BAG) return;
  applyItem(it, -1); eq[s] = null; col[s] = 0; inv.push(it); sfx(880, 660, .12, 'triangle', .1);
};
// QUICK-QUAFF — bottom quick-slot tap drinks from the HP(t0)/MP(t1) counter.
// quaff death-guard (09-08): potion taps during the 1.6s death fade were pure waste (respawn restores full vitals anyway). Paused-menu quaff stays — deliberate (hoisted hit-tests serve both states).
const quaff = (t) => { if (deathT > 0) return; const g = 10; if (t === 0) { if (hpPot > 0 && hp < mHP()) { hpPot--; hp = Math.min(mHP(), hp + g); sfx(520, 1040, .1, 'triangle', .1); fly(PFX, PFY, '+' + g, '#6cf279', 0, 1); } } else if (mpPot > 0 && mn < mMN()) { mpPot--; mn = Math.min(mMN(), mn + g); sfx(440, 880, .1, 'triangle', .1); fly(PFX, PFY, '+' + g, '#4a76ff', 0, 1); } };   // quaff popups route to unified player-feedback spot (above potion hot-bar), hud=1

// GUARD: gear-drop color range in spawnDrop (`Math.random() * 17`) is coupled to
// PAL.length (17) — ALL indices 0..16 equippable (white/PAL[0] included; it's just the unequipped body appearance, not a reserved default — equipped-ness is tracked by eq[s], not col). tpos-check.mjs enforces this pairing (swatches - base === range).
// Outline text helper (module-scope so pause overlay AND creation portrait can both use it)
const T2 = (t, x, y) => { ctx.strokeStyle = 'rgba(0,0,0,.7)'; ctx.lineWidth = 1; ctx.strokeText(t, x, y); ctx.fillText(t, x, y); };
// Stat bar: dark track + coloured fill to `frac` (clamped 0..1 so vitals > max render as full, never overflow).
const bar = (x, y, w, h, frac, c) => { ctx.fillStyle = '#2a2a33'; ctx.fillRect(x, y, w, h); ctx.fillStyle = c; ctx.fillRect(x, y, w * Math.min(1, frac), h); };
// Full-screen dim overlay — death vignette.
const fade = (a) => { if (a > 0) { ctx.fillStyle = `rgba(0,0,0,${a})`; ctx.fillRect(0, 0, VW, VH); } };
// Nested rainbow arc — 7 RC semicircles, radius r shrinking by `step` per band. Shared: HUD rainbow icon, ground rainbow pickup, title arc, particle burst. Caller sets lineWidth.
const rArc = (cx, cy, r, step) => { for (let i = 0; i < 7; i++) { ctx.strokeStyle = RC[i]; ctx.beginPath(); ctx.arc(cx, cy, r - i * step, Math.PI, 0); ctx.stroke(); } };
// Per-character rainbow title text (bold 30px, black outline, even spacing) centered on VW/2 at baseline y. Shared: LEVEL UP banner + title 'HOOVES OF HOPE'. Caller owns globalAlpha.
const rText = (s, y, f) => {
  ctx.font = 'bold ' + (f || 30) + 'px monospace'; ctx.textAlign = 'left'; ctx.strokeStyle = 'rgba(0,0,0,.7)'; ctx.lineWidth = 2;
  const w = ctx.measureText(s).width, ch = w / s.length;
  for (let i = 0; i < s.length; i++) { const cx = VW / 2 - w / 2 + ch * i; ctx.strokeText(s[i], cx, y); ctx.fillStyle = RC[i % 7]; ctx.fillText(s[i], cx, y); }
};
// Shared HP/MP/XP triple stack at (x, y): red HP + blue mana + purple XP (color-coordinated).
const bars = (x, y) => { bar(x, y, 68, 10, hp / mHP(), '#6cf279'); ctx.strokeStyle = '#1e1928'; ctx.lineWidth = 1; ctx.strokeRect(x - .5, y - .5, 69, 11); bar(x, y + 12, 68, 8, mn / mMN(), '#4a76ff'); ctx.strokeRect(x - .5, y + 11.5, 69, 9); bar(x, y + 22, 68, 3, lvl >= CAP ? 1 : xp / need(), '#b06cf0'); };   // HP=heal-green (#6cf279, matches heal cross/button/potion), MP=blue, XP=purple
// Shared portrait panel — renders the identity card (title bar, bordered box with
// HP bar at top, live unicorn silhouette) used by both the PAUSE overlay and the
// CHARACTER-CREATE screen. Title = player name on PAUSE, 'NEW CHARACTER' on create.
// PORTRAIT — opaque menu background + centered unicorn art (equipment slots layer on separately in the menu render).
// Header/bars/HP-MP numbers live in topHUD() now so they're identical between gameplay and menu.
const portraitPanel = () => {
  ctx.fillStyle = '#1e1928'; ctx.fillRect(0, 0, VW, VH);
  ctx.save(); ctx.translate(130, 94); ctx.scale(2.6, 2.6); ctx.translate(-6, -8);   // y 106→94: unicorn raised 12px so the +N pending indicator sits cleanly in the gap between BODY/HOOVES without touching the legs
  drawUo(0);
  ctx.restore();
};
// TOP-LEFT PERSISTENT HUD — identical in gameplay AND in the character menu. Renders:
//   • "LVn NAME" header — action-blue #8cf (matches the panel ring + every active-UI accent), same colour as the HP/MP numbers below (2026-09-07)
//   • mini rainbow arc + '×N' rainbow count spaced to the right of the name
//   • HP/MP/XP triple bars with number overlays
// Single font set at top: 8px bold monospace throughout — same rhythm as the stat row.
const topHUD = () => {
  // CLICKABLE PANEL — matches action-button style (rgba fill + #8cf ring). Signals "tap to open character menu" using the same visual language as every other active UI element (joystick, action buttons, top-right cluster).
  ctx.fillStyle = 'rgba(15,15,20,.75)'; ctx.fillRect(0, 0, 90, 44);
  ctx.strokeStyle = '#8cf'; ctx.lineWidth = 1.5; ctx.strokeRect(0, 0, 90, 44);
  ctx.font = 'bold 8px monospace'; ctx.textAlign = 'left';
  const hdr = 'LV' + lvl + ' ' + pName;
  ctx.fillStyle = '#8cf'; T2(hdr, 8, 14);                             // action-blue LV+name (#8cf = panel ring + active-UI accent). ×N below inherits this fillStyle (rArc sets only strokeStyle).
  const rcx = 8 + ctx.measureText(hdr).width + 20;                    // rainbow icon = 20px right of name (extra breathing room)
  ctx.lineWidth = 1; rArc(rcx, 14, 8, 1);
  T2('×' + rainbows(), rcx + 10, 14);
  bars(8, 18);                                                        // HP/MP/XP triple, top-left (tight to header)
  ctx.textAlign = 'center'; ctx.fillStyle = '#8cf';                   // HP/MP numbers in action-blue too (matches LV+name header)
  T2(hp + '/' + mHP(), 42, 26); T2((mn | 0) + '/' + mMN(), 42, 37);
};
// draw the player unicorn geometry — used by in-game player render + pause portrait.
// scale sets pixel scale. All colors come from col[0..3] (body/mane/horn/hooves).
const drawU = (bob, h) => {   // h=1 → skip the horn (used by the outline pass, which outlines the horn separately). Default (no h) draws the full sprite unchanged.
  ctx.fillStyle = PAL[col[3]];                                                                      // hooves (whole leg)
  ctx.fillRect(1, 12 + bob * .3, 2, 4 - bob * .3); ctx.fillRect(7, 12 - bob * .3, 2, 4 + bob * .3);
  ctx.fillStyle = PAL[col[0]]; ctx.fillRect(0, 5, 10, 7); ctx.fillRect(7, 0, 5, 6);                 // body + head
  ctx.fillRect(-2, 6, 2, 4); ctx.fillRect(-3, 9, 2, 2);                                              // TAIL — 2-segment: base + half-height sweep down-left
  if (!h) { ctx.fillStyle = PAL[col[2]]; ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(14, -5); ctx.lineTo(12, 1); ctx.fill(); } // horn (skipped in the outline body pass)
  mane3(col[1]).forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(5 - i * 2, 1 + i * 2, 2, 4); });// mane 3-color
  ctx.fillStyle = '#333'; ctx.fillRect(10, 2, 1.5, 1.5);                                            // eye
  // Equipment does NOT modify the visible sprite beyond the per-slot color (col[]).
  // Equipment folds bonuses directly into base stats via equip() (Joey directive 2026-09-03).
};
// drawU + enemy-style dark outline. Two-part, because the offset-silhouette trick can't outline the thin diagonal HORN cleanly (offsetting a razor triangle scatters spikes, never caps the tip):
//  1) BODY — 4-direction near-black (PAL[13]) silhouette behind the sprite (horn skipped, h=1) → clean 1px rim.
//  2) HORN — one solid dark triangle ~1px larger than the colored horn, colored horn drawn on top (the enemy oR "bigger shape behind" method) → a single clean edge that closes to a point.
// drawU is untouched for default calls, so the base sprite is unchanged.
const drawUo = (bob) => {
  const bc = col; col = [13, 13, 13, 13];
  for (const [a, b] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) { ctx.translate(a, b); drawU(bob, 1); ctx.translate(-a, -b); }   // body outline, horn skipped
  ctx.fillStyle = PAL[13]; ctx.beginPath(); ctx.moveTo(9.2, .6); ctx.lineTo(14.6, -6.1); ctx.lineTo(12, 2); ctx.fill();     // horn outline = enlarged dark triangle (capped point)
  col = bc; drawU(bob);
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
const CAP = 20;                                   // hard level cap — all stat gains come from level-up points (no hidden cap bonus)
// Skills are player-chosen via level-gated rows (canBuy = lvl>=req per node)
let hs = 0, shk = 0, hf = 0, hfc = 4;             // hs = hitstop timer (ONLY rainbow collect, 0.3s) · shk = screen shake (hurt only, 0.22s) · hf = INVULN-strobe timer · hfc = flash PAL index (4=red hurt · 15=green heal · 8=blue dash). pl.inv now covers only stomp + respawn (silent). hf>0 OR pl.inv>0 = invulnerable.
// Boss state: 0=unvisited, 1=on screen OR defeated-uncollected, 2=rainbow collected (leash stash retired 2026-09)
const bs = Array(RBC.length).fill(0);   // boss state per rainbow band — sized off RBC so new CORN are pure data

const rainbows = () => bs.filter(v => v === 2).length;   // banked-boss count. KEEP as helper — inlining the .filter body measured +12 B.
const mHP = () => 8 + st[1] * 2;                     // base 8 + HP stat (st[1])
const mMN = () => 8 + st[2] * 2;                     // base 8 + MAG stat (st[2])
// ATK (=st[0]) and LUCK% (.12+st[4]*.03) inlined at their use sites — low-use helpers are net-negative under roadroller.

const need = () => lvl * lvl + 40;               // XP to next level. +40 floor keeps early levels from flooding (~5 kills/level vs ~2); quadratic ramps toward CAP. KEPT as helper (inlining measured net-negative).
const gainXp = n => {
  if (lvl >= CAP) return;
  xp += n; fly(PFX, PFY, '+' + n + ' XP', '#b06cf0', 0, 1);   // routed to unified PFX/PFY (above potion hot-bar) — was below XP bar
  while (xp >= need() && lvl < CAP) {
    xp -= need(); lvl++; pending += 2; if (lvl < TREE + 2) spts++;    // +2 stat pts per level (2026-09-06 rebalance — was +3; 38 total across 19 level-ups prevents extreme min-max where all-STR trivialized enemies). Skill pts capped at TREE nodes (one per node).
    hp = mHP(); mn = mMN(); fanfare(); save();     // full HP+MP restore + auto-save. Two auto-save points: leveling here (milestone), respawn (setback). Manual save via ✕ + EXIT.
    foes.forEach(f => { if (!f.bit) { const u = f.hp >= f.mx; f.mx = FT[f.k][0] + (lvl * lvl >> 1); f.hp = u ? f.mx : Math.min(f.hp, f.mx); f.dm = FT[f.k][1] + (lvl >> 2); } });   // RESCALE LIVE FOES on level-up (matches mkFoe quadratic formula). u-flag FIX (09-08): undamaged foes follow the new max — without it they kept old HP forever (every foe showed a damaged HP bar after level-up and never actually scaled). Damaged foes keep their wounds. Bosses skipped (formula bakes at encounter-spawn).
    luT = time + 1.8;                             // trigger LEVEL UP banner (rainbow, top of screen, matches title font)
    if (deathT <= 0) { paused = 1; setRow(0); }   // AUTO-PAUSE into character menu on level-up — force allocation each level; banner still renders over menu
  }
  if (lvl >= CAP) xp = 0;
};
// STATS — pending-point mutators indexed 0-4 (STR/HP/MAG/DEF/LUCK). Labels/colors live in SL/SC (menu render), not here — kept lean.
// stat-point spend inlined in spend() (st[aRow]++ + HP/MAG vital bump) — the STATS closure array retired with the stat array-ize (2026-09-07).

// spts = skill points banked · su = per-node purchase count (0/1 for single-rank tree)
let spts = 0; const su = Array(TREE).fill(0);
// LEVEL-GATED unlock (2026-09-06 rework — retired LINK edge-pair prerequisite scan for a simple lvl>=N lookup).
// Row unlocks: Row1=LV1 (roots) · Row2=LV3 (DBLJ/LDASH) · Row3=LV6 (SHEAL/TRIJ/DBLS) · Row4=LV9 (FAR/TRIS).
// Matches skill-pt earn rate (spts drip in LV2-11). By LV11 every node reachable. Zero cross-references, no lines to render.
const canBuy = i => lvl >= [1,9,1,6,3,6,1,3,6,9][i];
let aRow = 0;
const EB = 5 + BAG + TREE;                        // equip-region base: worn slots (0-3) appended AFTER skills so stats/inv/skills keep their row numbers. Const (was helper) — BAG+TREE both const, value never changes.
const EQ = [[1, 64, 58], [2, 172, 58], [0, 64, 106], [3, 172, 106]];   // worn-slot layout [gearIdx, x, y] (MANE tl · HORN tr · BODY bl · HOOVES br). SINGLE source for menu render + tap — was duplicated verbatim in both, a sync hazard on every layout nudge.
const SN = EB + 4;                                // unified cursor span: stats(0-4) → inv(5..) → skills(..EB-1) → worn(EB..EB+3)
// setRow: THE single cursor mutator. Bag selection is derived from aRow on read (aRow-5 in bag range) — no separate invSel state.
const setRow = (r) => { aRow = r; };
// cxy: screen CENTRE of any cursor cell — the spatial map that powers directional nav (↑↓←→ pick the nearest cell, not linear index stepping).
// Regions: stats(0-4 row) · inventory(5-14, 5×2) · skills(15-24, TPOS grid) · worn gear(EB..EB+3, 2×2). Coords mirror the menu render block.
const cxy = (r) =>
  r < 5 ? [78 + r * 26, 157] :
  r < 5 + BAG ? [74 + (r - 5) % 5 * 28, 184 + ((r - 5) / 5 | 0) * 28] :
  r < EB ? [TPOS[r - 5 - BAG][0] + 13, TPOS[r - 5 - BAG][1] + 13] :
  [(r - EB) > 1 ? 184 : 76, (r - EB) % 3 ? 70 : 118];
// navSel: move cursor to the nearest cell in direction (dx,dy). Cost = forward distance + 2× perpendicular offset; candidates behind the direction are skipped; edge with nothing beyond = no-op.
const navSel = (dx, dy) => {
  const [x0, y0] = cxy(aRow); let b = -1, bc = 1e9;
  for (let r = 0; r < SN; r++) {
    if (r === aRow) continue;
    const [x, y] = cxy(r), ax = x - x0, ay = y - y0, p = ax * dx + ay * dy;
    if (p <= 0) continue;
    const c = p + Math.abs(ax * dy - ay * dx) * 2;
    if (c < bc) { bc = c; b = r; }
  }
  if (b >= 0) setRow(b);
};
const spend = () => {
  if (aRow < 5) {                                             // STAT — costs a pending point
    if (!pending) return;
    st[aRow]++; if (aRow === 1) hp += 2; else if (aRow === 2) mn += 2; pending--;   // raise the stat; HP(1)/MAG(2) also +2 to the current vital so the point is felt immediately
  } else if (aRow < 5 + BAG) {                                // INV — use/equip item at slot
    if (!inv[aRow - 5]) return;
    useItem(aRow - 5); return;                                // useItem plays its own sfx + splices; do NOT double-save
  } else if (aRow < EB) {                                    // SKILL node — costs a skill point (respects lock/owned)
    const i = aRow - 5 - BAG;
    if (!spts || su[i] || !canBuy(i)) return;
    su[i] = 1; spts--;
  } else { unequip(aRow - EB); return; }                     // WORN slot — take gear off; unequip plays its own sfx + guards bag-full
  sfx(660, 990, .15, 'triangle', .12);                         // no auto-save, no auto-close — player saves via ✕ when ready
};

// ---------- save (single-char keys — terser mangle-props law) ----------
const save = () => {
  localStorage['n20_s0'] = JSON.stringify({
    v: 44, h: hp, x: xp, l: lvl, n: mn, g: bs.map(v => v === 2 ? 2 : 0),
    t: st, d: pending, k: spts, y: su,
    m: pName, o: oc,
    q: eq, i: inv, P: [hpPot, mpPot],   // col derived from eq at load; NOT stored (single source of truth). mute is runtime-only — never persisted.
  });
};
const load = () => {
  try {
    const d = JSON.parse(localStorage['n20_s0'] || '0');
    if (!d || d.v !== 44) return;                               // strict v44 gate — no cross-version compat.
    resetTransient();                                             // clean-state guarantee: no velocity / cooldown / dialogue bleed from prior session
    hp = d.h; xp = d.x; lvl = d.l; mn = d.n;
    bs.fill(0); d.g.forEach((v, i) => bs[i] = v); pName = d.m; oc = d.o;   // fill(0) first: shorter saved arrays must not inherit stale slots from a prior in-session load
    chests = seedChests();
    foes = seedFoes();
    st = d.t;
    pl.x = SX; pl.y = SY;                                       // always respawn at paddock (no checkpoint system since 029aef5)
    pending = d.d;                                                 // unspent stat points survive reload — info panel glows, no auto-open
    spts = d.k; su.fill(0); d.y.forEach((v, i) => su[i] = v);
    d.q.forEach((v, i) => eq[i] = v);
    inv.length = 0; d.i.forEach(v => inv.push(v));
    hpPot = d.P[0] | 0; mpPot = d.P[1] | 0;
    col = eq.map(e => e ? e.c : 0);                                // derived from equipment (single source of truth)
  } catch (e) { /* fresh oath */ }
};

// ---------- player ----------
const PW = 10, PH = 14;
const NX = 129 * T, NGY = 60 * T;                 // GREATCORN guide: center-x (tile 129), feet baseline (tile 60 top)
const SX = 126 * T, SY = NGY - PH;                // spawn point (paddock) — feet at NGY ground baseline so intro plays with unicorn standing (no drop-in)
const NPCCOL = [7, 2, 2, 7];                       // GREATCORN isolated palette: purple body/hooves (PAL[7]), gold mane/horn (PAL[2]) — immune to player gear/color
const NSC = 10 / 7;                                // unicorn render scale, shared by player/GREATCORN/DARKCORN (boss fs=20 ÷ 14-tall bbox). Collision stays PW×PH.
const pl = { x: SX, y: SY, vx: 0, vy: 0, gr: 0, face: 1, coyote: 0, air: 0, inv: 0, t: 0 };   // gr = on-ground flag
let deathT = 0;
let nearNpc = 0;                                  // GREATCORN proximity flag (JUMP-to-interact re-talk quips)
let paused = 0, helpOn = 0, savePop = 0, luT = 0, navCD = 0;   // pause overlay; help overlay; save popup (EXIT GAME); level-up banner deadline; menu joystick-nav cooldown
// DIALOGUE — dq = active script (INTRO or a 1-line re-talk quip) or 0=closed · di = current bubble · tqi = re-talk cycle index.
// Freezes the sim (like the menu); tap/key advances ONE bubble (comedic beat), closing past the last line.
let dq = 0, di = 0, tqi = 0;
const talk = (s) => { dq = s; di = 0; };
const adv = () => { if (++di >= dq.length) { dq = 0; hp = mHP(); mn = mMN(); hf = IFR; hfc = 15; spray(pl.x + PW / 2, pl.y + PH / 2, 5, 2); } };   // dialogue closed = done talking to the GREATCORN → he blesses you: full HP+MP restore + green flash + 5 heal-cross particles. Fires for intro close AND every re-talk quip (all dialogue is GC).

// bag selection is derived: the selected item is inv[aRow-5] (undefined for non-bag rows, since inv.length ≤ BAG is invariant). No stored invSel state (retired 2026-09-07 — spatial-nav made it pure derived state).
// Chest reward: item shower only (no heal — heals come from potions / HEAL spell / level-up). LUCK adds drops.
const openChest = (i) => {
  if (oc & (1 << i)) return;
  oc |= 1 << i;
  const c = chests[i];
  spawnDrop(c.x, c.y, 2);                                     // items only — heals come from potions / HEAL spell / level-up (rest feature removed)
  fanfare();   // chest = same "positive milestone" cue as level-up + crit — one shared reward sound reduces audio noise. No burst (emerging item IS the visual).
};
let dashT = 0, dashCd = 0, adash = 0, dropT = 0;
// FIXED physics — never stat-scaled: the map gate proofs depend on these numbers
const G_RISE = 750, G_FALL = 1500, FALLCAP = 400;
const RUN = 115, V0 = 250, IFR = 1.5;   // IFR = invuln/flash window (sec) — ONE knob for hurt + heal + dash (unified 09-08, was 1.2 hurt/heal + .5 dash). Strobe (hf) and invuln share the timer, so the flash always spans the whole window. Tune here.

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
  xp = 0; lvl = 1; bs.fill(0); hpPot = mpPot = 0;
  eq.fill(null); inv.length = 0;
  pending = 0; st = [1, 1, 1, 1, 1]; col = [0, 0, 0, 0];
  oc = 0; pName = 'HORSE';
  spts = 0; su.fill(0);
  aRow = 0;   // reset menu cursor (bag selection is derived from aRow, nothing else to clear)
  shots.length = fbolts.length = parts.length = flies.length = drops.length = 0;
  chests = seedChests();
  foes = seedFoes();
  pl.x = SX; pl.y = SY;
  hp = mHP(); mn = mMN();                             // full at derived max (honest — no more 10/10 magic number coincident with the base-stat formula)
};
// Clean-gameplay-state reset — single source of truth for "what is zero at a fresh
// start." Called by fresh() (NEW GAME), load() (CONTINUE), and respawn (death).
// Without this, transient state (velocity, cooldowns, active dialogue) can bleed
// across sessions when EXIT-to-title happens without a page reload.
const resetTransient = () => {
  pl.vx = pl.vy = pl.air = pl.coyote = pl.inv = pl.gr = pl.t = 0;
  pl.face = 1;
  jbuf = dashT = dashCd = adash = dropT = deathT = hs = shk = hf = luT = dq = di = tqi = navCD = 0;
};
const interact = () => { if (nearNpc) { talk([TALK[tqi++ % TALK.length]]); return 1; } if (nearChest >= 0) { openChest(nearChest); return 1; } };   // JUMP-near: NPC → re-talk quip · chest → open
// Player-level progression: every 4 levels adds 1 scale pip. Enemies stay a threat as the
// player over-levels; bosses reuse the same formula and additionally scale via bi (+dm).

// LEVEL SCALING (2026-09-06 quadratic rework — high-level enemies must ENDURE the player's high MP + skill chain):
// - Enemy HP: fh + (lvl*lvl >> 1) — QUADRATIC (matches XP curve shape). Regulars: 1 hit LV1 → 5 hits LV20. Player has HEAL/DASH/SHOOT chains at high MP, so endurance = the fight.
// - Enemy dm: fd + (lvl>>2) (linear, gentler — grows +1 dmg per 4 levels, player DEF keeps pace)
const mkFoe = (x, y, k) => {
  // Kind + level IS the difficulty (no elite subsystem). SIZE uniform cz 4. spd = fv/28 so chase resolves to FT speed.
  const [fh, fd, fv, fb] = FT[k], zh = fh + (lvl * lvl >> 1);
  return { x, y, k, cap: fb, vx: fv * (.85 + Math.random() * .3) * (Math.random() < .5 ? 1 : -1), hp: zh, mx: zh, dm: fd + (lvl >> 2), fl: 0, t: Math.random() * 7, spd: fv / 28 };
};
const seedFoes = () => [...seeds.foes, ...seeds.foesX].map(([x, y, k]) => mkFoe(x * T, y * T, k));   // reseed helper — single source for init/load/fresh/respawn (foesX = decorative fill, held out of world.js ledge-grow to keep sky-ladder RNG stable)
let foes = seedFoes();

const shots = [], flies = [], parts = [], fbolts = [], drops = [];
const fly = (x, y, txt, c, pot, hud) => flies.push({ x, y, txt, c, pot, hud, t: 3 });   // crit differentiator (`big` flag) REMOVED 09-08 — every popup is now IDENTICAL: uniform 8px font, 3s lifetime. Crit is signalled by the 2× damage NUMBER alone (Joey: seeing 20 where you expect 10 is enough). pot=1 → mini potion glyph; hud=1 → screen-space (HUD-anchored, not world).
// Unified particle spray — n bits burst radially. Kinds: default=mini rainbow (JUMPS) · sk=1=skull sprite (DEATHS).
const spray = (x, y, n, sk = 0, z = 1) => { for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, s = 22 + Math.random() * 46; parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 42, t: 1 + Math.random() * .5, sk, z }); } };   // z = rainbow-arc size multiplier (1 = subtle jump puff, big = victory burst). lifetime 1.0-1.5s UNCHANGED. Launch speed 22-68 (was 40-130) + pop -42 (was -65): TIGHTER burst — particles stay near origin (09-07) so a death reads as "died HERE", not a sprawl that looks like incoming spread.
// Array cull — reverse iterate + splice. Default predicate = expired timer (t<=0);
// pass custom for dead-flag or bit-match culling. Used by shots/fbolts/parts/flies/foes/drops.
const prune = (a, d = e => e.t <= 0) => { for (let i = a.length; i--;) if (d(a[i])) a.splice(i, 1); };
// Pixel skull sprite — bone dome + big dark eye sockets + nose + teeth. 7×8 bitmap, O=bone D=dark .=skip. u = pixel unit (scales), a = alpha. Shared by combat/death bursts.
const SK = ['.OOOOO.', 'OOOOOOO', 'ODDODDO', 'ODDODDO', 'OOODOOO', '.OOOOO.', '.ODODO.', '..OOO..'];
const skull = (x, y, u, a = 1, bc = '#e9e3cd') => {
  ctx.globalAlpha = a;
  for (let r = 0; r < 8; r++) for (let c = 0; c < 7; c++) { const ch = SK[r][c]; if (ch === '.') continue; ctx.fillStyle = ch === 'O' ? bc : '#161210'; ctx.fillRect(x + (c - 3.5) * u, y + (r - 4) * u, u + .4, u + .4); }
};
// ITEM DROPS — physical pickups from kills/chests.
// Types: 0 HP potion (+10 HP), 1 MP potion (+10 MP), 5 gear, 9 RAINBOW (boss progression pickup → bs[i]=2).
// LUCK adds +1 drop per pip.

// Pixel sprites (bitmask rows, MSB-left). Shared 1-bit decoder: spr(data, x, y, w, col)
const spr = (d, x, y, w, c, z = 1) => { ctx.fillStyle = c; for (let r = 0; r < d.length; r++) for (let b = w; b--;) d[r] >> b & 1 && ctx.fillRect(x + (w - 1 - b) * z, y + r * z, z + .5, z + .5); };   // cells overlap by .5 (was .03) so adjacent same-colour fills merge seamlessly under the non-integer frame scale (SS) — the tiny .03 left AA seams that revealed the dark underlayer as a grid. spr is potion-only + single-colour per call, so the overlap is invisible interior (no colour smear).
// POTION — self-contained sprite: body (4-dir dark outline + solid fill) + corked stopper (dark outline + solid tan) + specular highlight.
// Same outline technique as the enemy/gear sprites (#17131f, drawn 1px larger then colour on top) so every area is crisp with no see-through. Cork lives HERE now (was a bare outline-less fillRect duplicated at each call site).
const pot = (x, y, c, z = 1) => { const o = '#17131f';
  for (const d of [-z, z]) { spr(I_MP, x + d, y, 12, o, z); spr(I_MP, x, y + d, 12, o, z); } spr(I_MP, x, y, 12, c, z);   // body: 4-dir dark outline + solid fill
  ctx.fillStyle = o; ctx.fillRect(x + 3 * z, y - 3 * z, 6 * z, 5 * z); ctx.fillStyle = '#c9a26a'; ctx.fillRect(x + 4 * z, y - 2 * z, 4 * z, 3 * z);   // cork: dark outline (1px larger) + solid tan on top
  ctx.fillStyle = '#fff'; ctx.fillRect(x + 2 * z, y + 5 * z, z, 2 * z); ctx.fillRect(x + 3 * z, y + 4 * z, z, z); };   // specular glass highlight (top-left)
// ACTION ICONS — the four glyphs on the action buttons, extracted so the skill-tree nodes render the same visuals. Every helper is centered on (x, y); tree callers wrap in scale(.65) to fit the 26px cells. Count params scale with skill upgrades (1/2/3 chevrons or stacked arcs).
const iShot = (x, y, n, r = 10) => { ctx.lineWidth = 1.5;
  if (n > 2) { const rr = r * .72, g = 10; for (let j = 0; j < 3; j++) rArc(x, y + g + rr / 2 - j * g, rr, rr * .12); }   // TRI SHOT — 3 straight rainbows stacked (r*.72 + 10px gap). Self-centered: baseline g+rr/2 puts the stack's midpoint exactly at y, still inside the 26px node.
  else for (let j = 0; j < n; j++) rArc(x, y + 4 - j * 14 + (n - 1) * 7, r, r * .12);   // 1/2 = stacked; 14px gap keeps DBL SHOT's two rainbows from overlapping; +(n-1)*7 self-centers
};
const iHeal = (x, y, up) => {
  if (up) { ctx.fillStyle = '#6cf279'; for (const [dx, dy] of [[-9, -9], [9, -9], [-9, 9], [9, 9]]) ctx.fillRect(x + dx - 1, y + dy - 1, 3, 3); }   // SUPER HEAL aura — 4 green sparkle dots in the diagonal corners (upgrade tier), shared by skill node + HUD button
  ctx.fillStyle = '#17131f'; ctx.fillRect(x - 4, y - 11, 8, 22); ctx.fillRect(x - 11, y - 4, 22, 8);
  ctx.fillStyle = '#6cf279'; ctx.fillRect(x - 3, y - 10, 6, 20); ctx.fillRect(x - 10, y - 3, 20, 6);   // solid bright-green interior + 1px dark outline; ~18% smaller (2026-09-05)
};
const iCorn = (x, y) => {   // GC-palette unicorn icon base (jump/dash nodes) — fixed purple/gold via NPCCOL (constant as the player recolors), then arms the #8cf stroke for the chevron overlay
  ctx.save(); ctx.translate(x, y); ctx.scale(.82, .82); ctx.translate(-5, -8);
  const bc = col; col = NPCCOL; drawUo(0); col = bc; ctx.restore();
  ctx.strokeStyle = '#8cf'; ctx.lineWidth = 1.5; ctx.beginPath();
};
const iJump = (x, y, n) => { iCorn(x, y);
  for (let j = 0; j < n; j++) { const by = y + 9 + j * 3; ctx.moveTo(x - 3, by + 3); ctx.lineTo(x, by); ctx.lineTo(x + 3, by + 3); }
  ctx.stroke();
};
const iDash = (x, y, n) => { iCorn(x, y);
  for (let j = 0; j < n; j++) { const bx = x - 9 - j * 3; ctx.moveTo(bx - 3, y - 3); ctx.lineTo(bx, y); ctx.lineTo(bx - 3, y + 3); }
  ctx.stroke();
};
// GEAR icon sprites — pro pixel style: selective outline + top-left light + shade, tinted by roll color c.
// slot→item: 0 BODY→chest armor · 1 MANE→cape · 2 HORN→horn blade · 3 HOOVES→horseshoe. Digits index the palette below (.=skip).
// Icon canon (see uni-corn/research tiny-pixel-icon entry): 45° tip-up-right for the blade, wavy bottom = cape (not shield),
// U-silhouette = horseshoe (beats front-facing boot pair), collar notch on armor. Gold px = class signal; outline+white+gold stay fixed under tint.
const GEAR = [
  ['.011110.','01311120','01111120','05444450','01111120','01111220','.011120.','..0220..'],              // 0 ARMOR (breastplate) batch 13: proper wide-shoulder / gold-belt class-signal / narrow-waist silhouette. Row 0 collar band, row 1 shoulders w/ top-left highlight, row 3 gold belt (gold-shade edges, gold core), rows 5-7 taper to hem. Adds the class-signal gold that this slot was missing.
  ['...44...','..0110..','.011120.','.011120.','01311120','01111220','01121120','..0220..'],              // 1 CAPE batch 13: fixes orphan-pixel hem (canon violation — old row 7 '.2.22.2.' had floating shade dots) → clean '..0220..' droplet hem connected to row 6. Row 4 gets a highlight pixel for left-shoulder light source. Gold clasp preserved as class signal.
  ['....0....','...010...','..01310..','..01310..','..01310..','..01310..','.4444444.','...020...','....4....'],   // 2 HORN BLADE batch 13: grip fix. Row 7 was '...000...' (all outline = read as second crossbar) → '...020...' (outline + shade + outline = wrapped leather grip). Blade + gold crossguard + gold pommel unchanged.
  ['000...000','040...040','010...010','.10...01.','.10...01.','.11...11.','.01...10.','.0111110.','..00000..'],  // 3 HORSESHOE batch 13: gold nail-head class signal. Row 1 was '030...030' (white caps) → '040...040' (gold nail heads = matches mane clasp / horn guard / body belt gold-signal grammar). U-silhouette unchanged.
];
const drawPart = (s, x, y, c, z = 1) => {
  const m = GEAR[s], p = ['#17131f', PAL[c], dim(PAL[c], .58), '#fff', '#e8b552', '#9c6f22'];   // 0 outline 1 base 2 shade 3 highlight 4 gold 5 gold-shade
  for (let r = 0; r < m.length; r++) for (let k = 0; k < m[r].length; k++) { const v = m[r][k]; if (v === '.') continue; ctx.fillStyle = p[+v]; ctx.fillRect(x + (k - 1) * z, y + r * z, z + .03, z + .03); }
};
// ONE loot table, flat split — GEAR is the reward (60%), potion the minority (40%, HP/MP 50/50).
// LUCK does NOT bias drop TYPE. It lifts THREE things with ONE stat: (1) DROP CHANCE at kill site (.12 + lk*.03), (2) CRIT CHANCE (same formula, unified in strike()), (3) GEAR PRIMARY TIER (below: +(lk>>3) → +1 at LUCK 8, +2 at LUCK 16). Third payoff added 2026-09-07 (batch 12) to fulfil the design intent captured in this comment (previously stale — code didn't reference LUCK for gear tier). Bosses call spawnDrop guaranteed (n=2, no chance roll).
const spawnDrop = (x, y, n) => {
  for (let i = 0; i < n; i++) {
    const d = { x, y: y - 4, vx: (Math.random() - .5) * 80, vy: -90 - Math.random() * 50, life: 0 };   // t assigned below in every branch (5=gear · 0/1=potion) — never observed as 0-init
    // GEAR (60%): slot + color + level+LUCK-scaled PRIMARY bonus + optional SUB-stat at LV4+ (a different stat, ~50%). tpos-check.mjs couples "Math.random() * 17" color range to PAL.length — ALL 17 colours (0-16). White (PAL[0]) is a valid gear tint: body/parts are equipment-driven, white is just the unequipped appearance (equipped-ness = eq[s], not col).
    if (Math.random() < .6) { d.t = 5; d.s = Math.random() * 4 | 0; d.c = Math.random() * 17 | 0; d.b = 1 + (lvl >> 2) + (st[4] >> 3); if (lvl >= 4 && Math.random() < .5) { d.u = (SLOT_STAT[d.s] + 1 + (Math.random() * 4 | 0)) % 5; d.v = 1 + (lvl >> 3); } }
    else d.t = Math.random() < .5 ? 0 : 1;      // POTION (40%): HP (0) or MP (1), 50/50
    drops.push(d);
  }
};

const strike = (f, mag) => {
  const crit = Math.random() < .12 + st[4] * .03, dmg = st[mag ? 2 : 0] * (crit ? 2 : 1);   // SHOOT=MAG(sp) · DASH/STOMP=STR(ho); ×2 on crit (LUCK .12+lk*.03). Player→enemy is RAW — enemies have NO DEF stat; DEF only reduces enemy→player (in hurt())
  f.hp -= dmg; f.fl = .4; f.vx = 0;   // UNIFIED HIT REACTION (2026-09-07): every damage source (dash/stomp/shot) gets 0.4s flash + AI pause + i-frame via ONE timer f.fl. vx=0 gives the visible "stop-and-jolt" beat. DASH + STOMP sites still overwrite f.fl to .8 AFTER strike() → physical anti-melt window preserved AND longer stagger on melee. Shot hits now gate on f.fl (line ~835) — this is a slight nerf to DBL/TRI SHOT stacking, accepted for consistency.
  fly(f.x, f.y - 8, '-' + dmg, '#ff5d6c');   // unified damage red. Crit is signalled ONLY by the 2× number (no size/lifetime/sound differentiator — all removed; a 20 where you expect 10 IS the tell).
  // crit = 2× number only. Size differentiator (13px) removed 09-08, longer-lifetime removed same day, hitstop + fanfare RETIRED 2026-09-06. The +4 crit XP bonus (below) is the only remaining crit-specific effect.
  if (f.hp <= 0) {
    if (f.dead) return;                                         // 2nd hit same frame — cash-out already ran
    f.dead = 1;                                                 // frame-end prune below; avoids splice-race index shift
    spray(f.x, f.y, 5, 1); sfx(500, 200, .08, 'square', .09); gainXp(Math.min(f.k, 3) * 4 + (f.bit ? 37 + 6 * f.bi : 0)); // foe death — HIGH punchy square (500→200, .08s) = "impact landed." Deliberately distinct from player-hurt sawtooth (140→55, .25s) = "pain received." XP: kind-capped base + boss escalation. (crit XP bonus REMOVED 09-08 — imperceptible: player can't correlate a random +4 to a crit kill; pure waste.)
    if (f.bit) spawnDrop(f.x, f.y, 2); else if (Math.random() < .12 + st[4] * .03) spawnDrop(f.x, f.y, 1);   // boss = guaranteed 2 (same system, 100%); else one drop at the same % as crit (.12 + lk*.03)
    if (f.bit) {                                                // BOSS falls — the boss itself is pruned by the frame-end `prune(foes, e => e.dead)` (line ~910); other foes are NEVER auto-cleared (Joey rule 2026-09-07: the player has to clear every enemy themselves — no boss-death sweep).
      if (bs[f.bi] !== 2) {                                     // FIRST KILL — drop the rainbow as a collectible; mark defeated (1 = stays dead while alive, not yet counted)
        bs[f.bi] = 1;
        drops.push({ x: f.x, y: f.y - 4, vx: (Math.random() - .5) * 80, vy: -120, t: 9, bi: f.bi, life: 0 });   // RAINBOW pickup — reuses loot-drop physics; collect it to bank the boss (bs→2)
      }
    }
    return 1;
  }
};

// ---------- verbs ----------
// DASH is a PURE ATTACK verb (never a traversal move — map is jump-only reachable, 2026-09-08).
// Gated behind DASH skill; LONG DASH doubles its reach. Strikes foes it passes through; hits GENERATE mana.
function shoot() {                                              // magic bolt (gold): 3 mana. TAP to fire — ONE bolt per press. NO rapid fire / hold-to-auto-fire (deliberately not wanted).
  if (!started || paused || deathT > 0 || !su[0] || mn < 3) return;   // silent fail — MP bar shows the answer
  mn -= 3; fly(PFX, PFY, '-3', '#4a76ff', 0, 1);   // SHOOT: MP cost at unified player-feedback spot (above potion hot-bar). SILENT (fire sfx removed 09-07) — both player + enemy ranged shots are now soundless; the rainbow bolt + -3 popup are the feedback.
  // Base range SHORT; FAR SHOT extends lifetime (.55s→.80s). DBL SHOT = 2 stacked straight. TRI SHOT = 3 stacked straight (adds vertical height, NO fan), same shape as the icon.
  for (let i = 0; i < 1 + su[8] + su[9]; i++) shots.push({ x: pl.x + PW / 2, y: pl.y + 5 - i * 10, vx: pl.face * 195, vy: 0, t: .75 + .3 * su[1] });   // every bolt straight (vy 0); DBL/TRI stack vertically by i*10 (bigger r=5 arcs need clear gaps). 195 + lifetime .75 (09-08, was 230/.65): slower + bigger read, reach preserved (~146px). Lifetime scales with FAR SHOT (su[1]).
}
function dash() {                                               // THE attack verb: burst + strike-through; 3 MP (uniform). Attacks NEVER regen mana (potions/level-up/boss only).
  if (!started || paused || deathT > 0 || dashCd > 0 || !su[6] || mn < 3) return;
  if (!pl.gr) { if (adash) return; adash = 1; }             // dash works in air too — once per airtime, resets on landing
  dashT = su[7] ? .22 : .11;                                    // dash burst duration × 400px/s: base .11=44px, LONG DASH .22=88px (09-08 lengthened — pure attack, no longer a traversal gate)
  dashCd = .45; mn -= 3; hf = .5; hfc = 12; sfx(600, 200, .12, 'sawtooth', .12); fly(PFX, PFY, '-3', '#4a76ff', 0, 1);   // DASH: MP cost + 0.5s WHITE flash i-frame (hfc=12 = PAL[12] #ffffff; color changed from blue 09-08, window kept short deliberately — 1.5s on a .45s cd would be near-permanent invuln). Blocks physical + projectiles via hurt()'s hf guard. Hurt/heal use the longer IFR (1.5s).
}
function heal() {                                               // instant tap-to-cast; 3 MP (uniform), +3 HP base (+6 with SUPER HEAL)
  if (!started || paused || deathT > 0 || !su[2] || mn < 3 || hp >= mHP()) return;
  const hm = 3 + su[3] * 3;
  mn -= 3; hp = Math.min(mHP(), hp + hm);
  sfx(520, 1040, .25, 'triangle', .12); fly(PFX, PFY, '-3', '#4a76ff', 0, 1); fly(PFX, PFY, '+' + hm, '#6cf279', 0, 1);   // HEAL: MP cost + HP gain both at unified PFX/PFY (above hot-bar). Popups float upward so they stagger vertically.
  hf = IFR; hfc = 15; spray(pl.x + PW / 2, pl.y + PH / 2, 5, 2);   // HEAL: IFR-sec green PAL[15] flash + i-frame, plus 5 green heal-cross particles rising from the body. green=heal · red=hurt · blue=dash.
}

const hurt = (n) => {
  if (hf > 0 || pl.inv > 0 || deathT > 0) return;              // invulnerable while ANY flash active (hf → red/green/blue) OR stomp/respawn window (pl.inv). Single guard blocks physical AND projectiles.
  n = Math.max((n >> 2) || 1, n - st[3]);                         // DEFENSE — gradient floor: 25% of raw (min 1), preserves boss threat
  hp = Math.max(0, hp - n); shk = Math.max(shk, .22); hf = IFR; hfc = 4;   // hf = invuln flash timer (IFR sec); hfc=4 = red PAL[4]. hurt/heal/dash all share the hf strobe channel (red/green/blue). hp clamped ≥0. Hurt hitstop RETIRED 2026-09-06 — only rainbow collect keeps hitstop now.
  fly(PFX, PFY, '-' + n, '#ff5d6c', 0, 1);                 // damage-taken popup routed to the unified player-feedback spot (above potion hot-bar, hud=1) — ALL main-character popups now live in ONE location (09-08 Joey): XP · MP cost · heal · quaff · pickup · damage taken. Enemy damage stays world-space over the foe.
  sfx(140, 55, .25, 'sawtooth', .12);
  if (hp <= 0) { deathT = 1.6; return; }   // player death — NO skulls (09-07): the respawn-to-paddock + fade-to-black already carry the moment; skull burst was redundant.
  pl.vy = -180;   // unified knockback recoil (spike + enemy + projectile share one response — lastSafe teleport retired 2026-09-06: -180 arc auto-clears every 1-tile pit, so no softlock possible without it)
};

// ---------- update ----------
let last = performance.now(), time = 0;
const step = (dt) => {
  if (hs > 0) { hs -= dt; return; }               // HITSTOP — world freezes ONLY on rainbow collect (0.3s). Crit + hurt hitstops retired 2026-09-06 — this branch now services 1 event.
  if (paused) {                                    // character menu freezes sim; joystick does spatial (nearest-cell) nav (keyboard nav stays in the keydown handler)
    navCD -= dt;
    let dx = keys.has('bL') ? -1 : keys.has('bR') ? 1 : 0, dy = keys.has('bU') ? -1 : keys.has('bD') ? 1 : 0;   // stick → direction bits
    if (dx && dy) { if (Math.abs(joy.dx) >= Math.abs(joy.dy)) dy = 0; else dx = 0; }   // diagonal push → dominant axis only (predictable single-step)
    if (!dx && !dy) navCD = 0;                      // stick released → next push moves instantly
    else if (navCD <= 0) { navSel(dx, dy); navCD = .16; }   // held → nearest cell in that direction, repeat every .16s
    return;
  }
  if (dq || savePop || helpOn) return;             // dialogue / save-popup / help overlays freeze the sim — they swallow input, so the world must not act while the player can't (fairness)
  time += dt; jbuf -= dt; pl.inv -= dt; pl.t += dt; dashT -= dt; dashCd -= dt; dropT -= dt; shk -= dt; hf -= dt;

  if (deathT > 0) {
    deathT -= dt;
    if (deathT <= 0) { resetTransient(); hp = mHP(); mn = mMN(); pl.x = SX; pl.y = SY; pl.inv = 1.5; foes = seedFoes(); seeds.bosses.forEach(([,,bi]) => { if (bs[bi] !== 2) bs[bi] = 0; }); drops.length = 0; save(); }   // respawn: clean transients + full HP+MP, always paddock, reseed foes, reset all non-dead bosses, clear drops, AUTO-SAVE (2026-09) so browser-close after death doesn't roll back progress; pl.inv overrides resetTransient's 0 for i-frames
    return;
  }
  if (!started) return;

  // -- drop-through: DOWN on a one-way platform falls through it (S doubles as down here) --
  const onPlat = pl.gr && tile((pl.x + PW / 2) / T | 0, (pl.y + PH + 1) / T | 0) === 2;
  if (onPlat && held('ArrowDown', 'KeyS', 'bD')) { dropT = .16; pl.gr = 0; pl.y += 3; pl.vy = 60; }

  // -- run --
  const dir = (held('KeyD', 'ArrowRight', 'bR') ? 1 : 0) - (held('KeyA', 'ArrowLeft', 'bL') ? 1 : 0);
  pl.vx += (dir * RUN - pl.vx) * Math.min(1, dt * 12 * (pl.gr ? 1 : .65));
  if (dir) pl.face = dir;

  // -- jump: buffer + coyote + variable + double --
  pl.coyote = pl.gr ? .1 : pl.coyote - dt;
  if (jbuf > 0) {
    let ok = 0;
    if (pl.coyote > 0) { pl.vy = -V0; pl.coyote = 0; pl.air = 0; ok = 1; }
    else if (su[4] && pl.air < 1 + su[5]) { pl.vy = -V0; pl.air++; ok = 1; }   // DBL/TRI JUMP — full ground-jump height, no timing/hold logic (2026-09-06 uniformity pass)
    if (ok) { jbuf = 0; sfx(280, 520, .12); spray(pl.x + PW / 2, pl.y + PH, 5); }   // jump rainbow burst — 5 particles, matches unified skull count. Rainbow trail is signature game aesthetic (unicorns = rainbows) — kept as core juice layer.
  }

  if (dashT > 0) {                                              // dash: flat burst, strike foes
    pl.vx = pl.face * 400; pl.vy = 0;
    for (const f of foes) {
      const fz = 20;
      if (f.fl <= 0 && pl.x < f.x + fz && pl.x + PW > f.x && pl.y < f.y + fz && pl.y + PH > f.y) { strike(f); f.fl = .8; }   // one hit per dash pass; then 0.8s enemy i-frame
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
  pl.gr = 0;   // hard-land audio + wasGround snapshot retired 2026-09-06 — landing is silent unless it's a stomp (which has its own square-thud sfx)
  pl.y += pl.vy * dt;
  if (pl.vy >= 0) {
    const feet = pl.y + PH, ty = feet / T | 0, top = ty * T, fc = (pl.x + PW / 2) / T | 0;
    for (const ox of [1, PW - 1]) {
      const tv = tile((pl.x + ox) / T | 0, ty);
      if (tv === 1 || (tv === 2 && py + PH <= top + 4 && dropT <= 0)) {
        if (!bounceSet.has(ty * W + fc)) {                       // normal ground (bounce handled in independent post-pass below)
          pl.y = top - PH;   // rest feet on the tile top (top already computed above for the platform from-above guard)
          pl.vy = 0; pl.gr = 1; pl.air = 0;
        }
        break;
      }
    }
  } else {
    for (const ox of [1, PW - 1]) if (solid(pl.x + ox, pl.y)) { pl.y = ((pl.y / T | 0) + 1) * T + .01; pl.vy = 0; break; }
  }
  // MUSHROOM BOUNCE — fully independent of jump system. Checks position only after all
  // movement+collision. Fires regardless of velocity direction, so air jumps can't block it.
  if (!pl.gr) {
    const bf = pl.y + PH, bty = bf / T | 0, bfc = (pl.x + PW / 2) / T | 0;
    if (bounceSet.has(bty * W + bfc) && bf >= bty * T - 4 && bf < bty * T + 8) {
      pl.y = bty * T - PH - 15;
      pl.vy = -510;
      pl.air = 0; jbuf = 0; sfx(220, 640, .16, 'sine', .13);
    }
  }
  if (pl.gr) adash = 0;                                         // air dash recharges on landing (lastSafe tracking retired 2026-09-06 — spike hurt() now uses standard -180 recoil, no teleport)

  for (const [ox, oy] of [[1, PH - 1], [PW - 1, PH - 1], [PW / 2, PH]])
    if (spike(pl.x + ox, pl.y + oy)) { hurt(2); break; }

  // -- chest proximity — JUMP-to-open handled in keydown; here just flag the nearest --
  nearChest = -1;
  for (const c of chests) if (!(oc & (1 << c.i)) && Math.hypot(pl.x + PW / 2 - c.x, pl.y + PH / 2 - c.y) < 20) { nearChest = c.i; break; }

  // -- bosses: each drops a rainbow (t:9) on first kill; collect it to bank the boss (bs→2) --
  seeds.bosses.forEach(([bx, by, bi]) => {                      // bi (rainbow band) from seed — all DARKCORN bosses share the one world
    const bit = 1 << bi;
    if (bs[bi]) return;                                           // 1 engaged OR 2 killed → skip (no leash stash — bs is only 0/1/2 now)
    if (Math.hypot(pl.x - bx * T, pl.y - by * T) < 80 && Math.abs(pl.y - by * T) < 48) {  // vertical gate: walkway under ORANGE's perch is dy=66 — must not trigger from below
      // BOSS stats (2026-09-06 quadratic rework — bosses = TRUE endurance fights, 5-11 hits across all levels):
      // - Boss HP: (20+bi*4) + lvl*lvl (double-quadratic vs regulars — LV5 boss = 45 HP, LV20 boss bi=6 = 444 HP)
      // - Boss dm: (8+bi) + (lvl>>2) (matches regular enemy dmg curve, bi shifts baseline)
      // - spd: 1+bi*.1 unchanged (per-tier speed multiplier). cap 19 = full unicorn kit.
      bs[bi] = 1;
      const bhp = (20 + bi * 4) + lvl * lvl;
      foes.push({
        x: bx * T, y: by * T, vx: 0, k: 3, bi, bit, dm: (8 + bi) + (lvl >> 2),
        fl: 0, t: 0, mx: bhp, cap: 19, hp: bhp,
        spd: 1 + bi * .1,   // spd constant per boss (no enrage/leash)
      });
      sfx(784, 1568, .3, 'triangle', .15);   // encounter sting — boss spawn sound
    }
  });

  // -- shots --
  for (const s of shots) {
    s.t -= dt; s.x += s.vx * dt; s.y += s.vy * dt;
    if (solid(s.x, s.y)) { s.t = 0; }
    if (s.t > 0) for (const f of foes) {                        // a spent bolt can't also hit a foe
      const fs = 20;
      if (f.fl <= 0 && s.x > f.x - 4 && s.x < f.x + fs + 4 && s.y > f.y - 4 && s.y < f.y + fs + 4) { s.t = 0; strike(f, 1); break; }   // SHOOT → MAG damage (mag flag). f.fl gate added 2026-09-07 — mirrors dash/stomp; all damage sources now respect the unified enemy i-frame.
    }
  }
  prune(shots);
  // -- foe bolts (CASTER + bosses): hit the player, die on solid --
  for (const b of fbolts) {
    b.t -= dt; b.x += b.vx * dt; b.y += b.vy * dt;
    if (solid(b.x, b.y)) b.t = 0;
    else if (pl.x + PW > b.x - 4 && pl.x < b.x + 4 && pl.y + PH > b.y - 4 && pl.y < b.y + 4) { hurt(b.dm); b.t = 0; }   // bolt dmg = shooter's dm (same scaled value as melee — one system)
  }
  prune(fbolts);

  // -- foes --
  for (const f of foes) {
    f.t += dt * (2 + Math.abs(f.vx) * .14); f.fl -= dt;      // UNIFIED RHYTHM: anim phase = idle base 2 + |velocity|*.14 (knobs). Fast foes scurry, stopped foes just breathe, chasing bosses auto-gallop faster — all from live vx, no per-type rates
    const fs = 20;
    // UNIFIED ATTACK ORCHESTRATION — every foe runs the same verbs; cap bits (data.js FT)
    // decide who uses which. Immediate contact damage (below) is shared by all — no wind-up tell.
    // HIT-STUN GUARD (2026-09-07) — while f.fl > 0 (invuln/flash window from strike), AI decisions
    // are paused: ranged countdown freezes mid-tell, chase doesn't re-pick vx, hop doesn't fire.
    // Gravity + horizontal momentum (below) still apply; contact damage still lands. Enemy jolts
    // to stop (strike zeros vx), holds pose during flash, then resumes AI when f.fl expires.
    if (f.fl <= 0) {
    // RANGED (cap 1) — gate the COUNTDOWN, not just the shot: bosses always in range,
    // regular foes need |dx| < 230. Prevents the charge-orb tell from ballooning off-screen.
    if (f.cap & 1 && (f.bit || Math.abs(pl.x - f.x) < 230)) {
      f.rc = (f.rc ?? 1.5 + Math.random()) - dt;
      if (f.rc <= 0) {
        f.rc = f.bit ? 1.6 : 2.1;
        const dx = pl.x + PW / 2 - f.x - fs / 2, dy = pl.y + PH / 2 - f.y - fs / 2, d = Math.hypot(dx, dy) || 1;   // bolt speed inlined 75 below, UNIFIED for bosses + casters (09-08, was 105/80): one dodge rhythm everywhere.
        fbolts.push({ x: f.x + fs / 2, y: f.y + fs / 2, vx: dx / d * 75, vy: dy / d * 75, t: 2.6, dm: f.dm });   // carry shooter dm → bolt scales exactly like melee
        if (!f.bit) f.vx = 0;                                   // ranged foe stops to fire. Enemy fire is SILENT (fire sfx removed 09-07) — the RED charge-tell skull + RED flying bolt carry the whole telegraph.
      }
    }
    // CHASE (cap 16) — home on the player; bi scales boss ground speed.
    // Floor-gated: only drive toward the player when the step is SAFE — no wall ahead
    // AND solid/platform floor 3px ahead (reuses the edge-turn probe: %3 truthy = solid/plat,
    // falsy = air/spike). Stops chasers marching off ledges or into spike pits, and — because
    // it gates air-steer too — stops hopping chasers steering into a pit mid-jump.
    if (f.cap & 16 && (f.bit || Math.abs(pl.x - f.x) < 230)) { const d = Math.sign(pl.x + PW / 2 - f.x - fs / 2), ax = f.x + (d > 0 ? fs : 0); if (f.bit || !solid(ax + d, f.y + fs / 2) && tile((ax + d * 3) / T | 0, (f.y + fs + 6) / T | 0) % 3) f.vx = d * 28 * f.spd; }   // BOSSES UNGATED (09-08 Joey): a hunting DARKCORN drives toward you ALWAYS — off ledges, into spike pits (foes are spike-immune), against walls. Regulars stay floor-gated.
    // HOP (cap 2) — one clock for boss and foe; chasers hop on rhythm, patrollers arm near the player
    {   // hop always-on: every FT kind + bosses carry bit 2 (verified 09-08) — guard `if (f.cap & 2)` was unconditionally true, removed
      f.hop = (f.hop || 1) - dt;
      if (f.hop <= 0 && f.gr && (f.cap & 16 || Math.abs(pl.x - f.x) < 200)) {
        // LANDING-GATE — a hop travels ~1 tile; if there's no solid/platform floor one tile ahead
        // in the travel dir, turn back instead of launching (stops hoppers leaping into pits/spikes).
        // Bosses hop unconditionally (arenas are flat + build-audited).
        const s = Math.sign(f.vx) || 1;
        if (f.bit || tile((f.x + fs / 2 + s * T) / T | 0, (f.y + fs + 6) / T | 0) % 3) {
          f.vy = -280; f.gr = 0; f.vx ||= s * 28 * f.spd; f.hop = (f.cap & 16 ? 2.4 : 1 + Math.random()) / f.spd;   // vx||= ANTI-FREEZE (09-08): strike()'s jolt-stop and stop-to-fire zero vx; non-chasers (k1/k6) had NO path to move again. Regulars safe (landing-gate checks floor in dir s first). Boss guard dropped same day: ungated boss chase re-picks vx EVERY non-stunned frame, so any restore here is overwritten before movement — harmless. Hit-stun pause (f.fl) untouched.   // vy -280 → jump apex ~44px = clears 2-tile pits (was -230, apex ~29px, couldn't escape spike pits)
        } else { f.vx *= -1; f.hop = .3; }
      }
    }
    }   // end HIT-STUN GUARD (f.fl <= 0)

    f.vy = Math.min(400, (f.vy || 0) + 900 * dt); f.y += f.vy * dt;   // FALLCAP for foes too — no tile tunneling
    const ty = (f.y + fs) / T | 0;
    if (f.vy > 0 && tile((f.x + fs / 2) / T | 0, ty) % 3) {   // %3 standable (solid/platform) — same idiom as chase/hop/edge gates; rest feet on tile top
      f.y = ty * T - fs; f.vy = 0; f.gr = 1;
    }
    f.x += f.vx * dt;
    // WALL SNAP + EDGE TURN — two-stage horizontal collision (mirrors player L744-746 pattern):
    // Stage 1: body-edge overlaps solid → snap back to tile boundary (prevents embedding).
    // Stage 2: no safe floor 3px ahead (air OR spikes via %3<1) → treat as edge.
    // Response shared: bosses hold ground; grounded foes reverse; airborne hoppers keep momentum.
    const ex = f.vx > 0 ? f.x + fs : f.x;
    let bl = solid(ex, f.y + fs / 2);
    if (bl) f.x = f.vx > 0 ? (ex / T | 0) * T - fs : ((ex / T | 0) + 1) * T;
    else bl = tile((ex + Math.sign(f.vx) * 3) / T | 0, (f.y + fs + 6) / T | 0) % 3 < 1;   // %3<1: air(0) AND spikes(3) = "no safe floor"
    if (bl && !f.bit && f.gr) f.vx *= -1;   // `!(f.cap & 2)` term dropped — always false now all kinds hop (was `f.gr || !(f.cap&2)`). hold-ground boss branch REMOVED (09-08): bosses never turn back and never park at edges — chase re-picks vx every frame; wall-snap above still prevents embedding. If a boss lands somewhere it can't hop out of (>2-tile pit), it's stuck until player death reseeds — accepted design.
    // CONTACT — stomp from above, else immediate touch damage (no wind-up tell). hurt() self-gates
    // repeats via its 0.8s i-frame; dash (dashT>0) grants i-frames so you dash THROUGH foes safely.
    const hit = pl.x < f.x + fs && pl.x + PW > f.x && pl.y < f.y + fs && pl.y + PH > f.y;
    if (hit && pl.vy > 0 && pl.y + PH <= f.y + fs / 2) {   // STOMP: falling + player's feet in top half of enemy body. Symmetric (both sides use CURRENT frame position) — was `py + PH <= f.y + 4` which mixed last-frame player Y with current-frame enemy Y, so fast-jumping enemies escaped the stomp gate and dealt contact damage instead.
      if (f.fl <= 0) { strike(f); f.fl = .8; }   // STOMP damage only outside the 0.8s enemy i-frame — no in-place bounce-melt
      // STOMP LAUNCH — big vertical bounce + horizontal push AWAY from foe center. pl.air=0 keeps DJ for chained stomps.
      pl.vx = (f.x + fs / 2 < pl.x + PW / 2 ? 1 : -1) * 220;
      pl.vy = -360; pl.air = 0; sfx(150, 70, .06, 'square', .07);   // STOMP BOUNCE — fixed height, no jump-held modulation (2026-09-06 uniformity pass); pl.air=0 keeps DJ available for chained stomps
      pl.inv = Math.max(pl.inv, .2);   // post-stomp silent i-frame — 0.2s (mid-tune between original 0.12s and 0.3s): enough to clear one adjacent foe from the stomp-launch vx without granting a full face-tank window
    } else if (hit) hurt(f.dm);   // touch = immediate damage; dash i-frame gate lives in hurt() now (hf-guard blocks physical + projectiles uniformly)
  }
  prune(foes, e => e.dead);   // frame-end prune — foes refill only on death (soft reset), never mid-run

  // -- NPC proximity flag (input handling lives in keydown/pointerdown; JUMP is universal interact) --
  nearNpc = Math.hypot(pl.x - NX, pl.y - NGY) < 34 ? 1 : 0;   // single fixed-point check — GREATCORN re-talk zone

  // ITEM DROPS — float, gravity, tile collision, proximity pickup
  for (const d of drops) {
    d.life += dt;   // age (float/bob only) — NO despawn: drops leave the world only on player death, exactly like foes
    d.vy = Math.min(200, d.vy + 400 * dt); d.y += d.vy * dt; d.x += d.vx * dt; d.vx *= .97;
    if (d.vy > 0 && tile(d.x / T | 0, (d.y + 3) / T | 0)) { d.vy = 0; d.y = ((d.y + 3) / T | 0) * T - 3; }   // land on ANY non-air tile — solid, platform, AND spike (drops physically settle on spikes like any surface; unlike player/enemy who use %3 to skip spikes because spikes damage them)
    // GRACE PERIOD: drop must be visible for ≥0.5s before pickup — matches the fast fade-in (below in draw loop) so you always SEE the drop before it vanishes into inventory. Fixes the stomp-kill case where drop spawned inside pickup radius and disappeared before rendering. Was 0.35s (batch 11); bumped to 0.5s batch 12 (2026-09-07) so drops always register visually as "loot appeared" before magnet-in.
    if (d.life > .5 && Math.hypot(pl.x + PW / 2 - d.x, pl.y + PH / 2 - d.y) < 18) {   // touch it → pick up (stays on ground if nowhere to put it). Radius 18 (was 14) = generous body-of-player reach; still requires deliberate approach (not vacuum). Batch 12 (2026-09-07) bump for better pickup feel — drops sitting at player's edge now register cleanly without walk-adjust.
      if (d.t === 9) {                                          // RAINBOW — progression pickup: always collected. Bank the boss (bs→2), pause, burst. Save-on-rainbow REMOVED 2026-09 — leveling + respawn are the ONLY auto-saves now (simpler mental model: "you save when you die or level up").
        bs[d.bi] = 2; d.dead = 1; hs = .3;                      // hitstop: world freezes briefly for the collect moment
        spray(pl.x + PW / 2, pl.y - 6, 12);                     // rainbow particle burst above the head (reuses the death-burst spray; no skull flag = 7-band rainbow)
        fanfare();   // unified "positive milestone" cue — same fanfare as level-up + chest open. Rainbow collect distinguished by hitstop 0.3s + 12-particle burst (not audio). One sound family for all game milestones.
        continue;
      }
      // Potion → hot-bar counter (cap 5, drop stays on ground if full). Gear → bag (drop stays on ground if bag full).
      // Potion "+1" flies are HUD-anchored above the matching hot-bar slot (HP left, MP right) — clear, separated, never fights with damage numbers at the kill site.
      const took = d.t === 0 ? (hpPot < 5 && (hpPot++, fly(PFX, PFY, '+1', '#6cf279', 1, 1), 1))
        : d.t === 1 ? (mpPot < 5 && (mpPot++, fly(PFX, PFY, '+1', '#4a76ff', 1, 1), 1))
        : inv.length < BAG && (inv.push({ s: d.s, c: d.c, b: d.b, u: d.u, v: d.v }), fly(PFX, PFY, '+BAG', '#8cf', 0, 1), 1);   // ALL pickup popups routed to unified PFX/PFY (above potion hot-bar). +BAG uses #8cf — same blue as action-button rings + joystick + top cluster (universal "active/UI" accent). u/v = optional sub-stat.
      if (took) { d.dead = 1; sfx(520, 1040, .1, 'triangle', .1); }   // only vanish when actually collected
    }
  }
  prune(drops, e => e.dead);
  // fx
  for (const p of parts) { p.t -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 300 * dt; }
  prune(parts);
  for (const f of flies) { f.t -= dt; f.y -= 22 * dt; }   // float speed 22 px/s (was 28) — text stays near origin longer, easier to read
  prune(flies);
};

// ---------- render ----------
const cam = { x: 0, y: 0 };
const draw = () => {
  SS = Math.min(cv.width / VW, cv.height / VH);
  SOX = (cv.width - VW * SS) / 2; SOY = (cv.height - VH * SS) / 2;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.setTransform(SS, 0, 0, SS, SOX, SOY);
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, VW, VH); ctx.clip();

  const tx = pl.x + PW / 2 + pl.face * 40 - VW / 2, ty = pl.y - VH / 2 + 20;   // vertical framing (2026-09-07): player sits SLIGHTLY ABOVE center (screen y≈115) — proven by physics math to fit every routine jump inside one viewport. Triple jump apex = 128 px rise × .85 lag = 109 px on-screen shift, leaves 6 px above; ground below feet at rest = 141 px (8.8 tiles), roughly doubling prior visibility from the retired -60 sky-bias.
  cam.x += (tx - cam.x) * .08; cam.y += (ty - cam.y) * .1;
  cam.x = Math.max(0, Math.min(W * T - VW, cam.x));
  cam.y = Math.max(0, Math.min(H * T - VH, cam.y));

  // SKY — bright blue gradient, white clouds, cheerful Zelda/Mario feel
  // BACKGROUND = flat blue sky + parallax clouds. Visual detail lives in the ground layer.
  const ZC = !phase ? ZB[2] : pl.y > 1136 ? ZB[6] : pl.y > 1008 ? ZB[5] : ZB.find(z => pl.x < z[0] * T);   // title=meadow; underground split by depth: y>1136 (=72*16, cavern chamber top) = INDIGO ZB[6], y>1008 = VIOLET ZB[5]; surface = x-bands
  ctx.fillStyle = ZC[5]; ctx.fillRect(0, 0, VW, VH);                        // banded sky
  // CLOUDS — procedural puffs spanning the whole map (parallax .15), culled off-screen.
  // Primes in bitwise ops give deterministic pseudo-random spread. y ≥ 50 clears HUD.
  ctx.fillStyle = 'rgba(255,255,255,.7)';
  for (let ci = 0; ci < 24; ci++) {
    const sx = ci * 82 + (ci * 37 & 31) - cam.x * .15;
    if (sx < -60 || sx > VW + 60) continue;
    const cy = 52 + (ci * 73 & 31), cw = 30 + (ci * 41 & 31);
    ctx.fillRect(sx, cy, cw, 8); ctx.fillRect(sx + 4, cy - 4, cw - 8, 6); ctx.fillRect(sx + 8, cy + 6, cw - 16, 5);
  }

  // SCREEN SHAKE — offset the world translate, not the HUD (which draws after the untranslate)
  const so = shk > 0 ? Math.random() * 6 - 3 : 0;
  ctx.translate((-cam.x + so) | 0, (-cam.y + so) | 0);
  const x0 = cam.x / T | 0, x1 = Math.min(W, x0 + VW / T + 2), y0 = Math.max(0, cam.y / T | 0), y1 = Math.min(H, y0 + VH / T + 2);
  const [, GD, GT, GF, GA] = ZC, RB = dim(GA, .75);  // band colors: [dirt, top, foliage, accent]; RB = derived rock base
  // TWO-PASS terrain: all dirt bodies first, all surface-top strips after. Interleaving
  // them per-tile made each column's dirt stomp the previous column's antialiased top-strip
  // edge — at fractional SS the re-blends never recompose, leaving a dark tick every tile
  // boundary (verified: 42.7px-period seams at SS 2.667, operator report 09-04). One strip
  // color pass over finished dirt = seam-free at any scale.
  const tops = [];
  for (let j = y0; j < y1; j++) for (let i = x0; i < x1; i++) {
    const v = tile(i, j); if (!v) continue;
    if (v === 1) {
      // SOLID GROUND — dirt body, lighter surface-top where exposed to air
      ctx.fillStyle = GD; ctx.fillRect(i * T, j * T, T + .5, T + .5);
      const a = tile(i, j - 1);
      if (a !== 1 && a !== 3) tops.push([i * T, j * T, 5]);   // no grass under spikes — they ground in dirt (grass reads safe)
    } else if (v === 2) {
      // PLATFORM — chunky: surface-top + dirt underside
      ctx.fillStyle = GD; ctx.fillRect(i * T, j * T + 2, T + .5, 7);
      tops.push([i * T, j * T, 4]);
    } else {
      // SPIKES — universal danger color. FULL-TILE height: tips at j*T so the visual fills
      // the (fully lethal) tile — and pit spikes read grounded in dirt, not floating on grass.
      ctx.fillStyle = '#e05555';
      for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(i * T + k * 4, j * T + T); ctx.lineTo(i * T + k * 4 + 2, j * T); ctx.lineTo(i * T + k * 4 + 4, j * T + T); ctx.fill(); }
    }
  }
  ctx.fillStyle = GT; for (const [tx2, ty2, th] of tops) ctx.fillRect(tx2, ty2, T + .5, th);

  // CHESTS — hand-placed (20 seeds, oc bitfield caps at 31). Opened chests vanish (persisted in oc).
  // JUMP-near-chest opens (JUMP is always usable; stand on a chest / by GREATCORN and press JUMP).
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
  // 0=tree 1=grass 2=rock 3=mushroom 5=pine 6=flower
  for (const [dx, dy, dt] of DECO) {
    const px = dx * T, py = dy * T + T;                          // py = ground surface (feet level)
    if (px < cam.x - T || px > cam.x + VW + T || py < cam.y - T || py > cam.y + VH + T) continue;
    if (dt === 0) { // TREE — round canopy, foliage palette
      ctx.fillStyle = GD; ctx.fillRect(px + 6, py - 12, 4, 12);
      ctx.fillStyle = GF;                                                     // canopy (two rects, one fillStyle)
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
    } else if (dt === 6) { // FLOWER — static petals
      ctx.fillStyle = GF; ctx.fillRect(px + 7, py - 6, 1, 6);
      ctx.fillStyle = '#f9c'; ctx.fillRect(px + 5, py - 9, 5, 3);
      ctx.fillStyle = '#ffd75e'; ctx.fillRect(px + 7, py - 8, 1, 1);
    }
  }

  // BOUNCE MUSHROOMS — red cap + white spots + cream stem; breathing squash signals "springy / interactive"
  for (const [bx, br] of BOUNCE) {
    const px = bx * T, base = br * T;
    if (px < cam.x - T || px > cam.x + VW + T) continue;
    const p = Math.sin(time * 5 + bx) * 1.2;                     // ±1.2px squash pulse
    ctx.fillStyle = '#e8e2d0'; ctx.fillRect(px + 5, base - 9, 6, 9);            // stem
    ctx.fillStyle = '#e34d4d'; ctx.fillRect(px, base - 15 + p, 16, 6 - p);      // red cap, full tile width (squashes with the pulse)
    ctx.fillStyle = '#fff'; ctx.fillRect(px + 4, base - 13 + p, 2, 2); ctx.fillRect(px + 10, base - 14 + p, 2, 2);  // spots
  }

  // ARTICULATED ENEMY SPRITES — legs step, antennae bob, robe folds. One draw path,
  // boss silhouette scaled up. cz = boss cell multiplier (kind determines base size).
  for (const f of foes) {
    // "Watching Family" v3 (2026-09-06) — TWO body families (walkers + floaters), each enemy ONE distinguishing feature (Kirby rule).
    // Kept from v2: universal round white eye + tracking pupil (species signature) + 1px black outline (figure/ground pop on any background) + FOECOL as PAL indices.
    // Changed from v2: walkers get a separate HEAD block (eye rides the head, gap between body/head/legs = negative space, per Slynyrd rule). Floaters got their arm attachments removed (arms violated Kirby "one attachment" rule and cluttered silhouettes). k2 tendrils use v1 variable-height math for organic sway.
    const s = 4, fs = 20, wob = Math.sin(f.t * .75) * 1.5, step = Math.sin(f.t) * s * .35;
    ctx.save();
    ctx.translate(f.x + fs / 2, f.y + fs);
    ctx.scale((f.vx || 1) < 0 ? -1 : 1, 1);
    if (f.k == 5) ctx.scale(f.gr ? 1.12 : .86, f.gr ? .85 : 1.18);  // k5 walker-hop squash/stretch — pivot at feet
    ctx.translate(-fs / 2, -fs);
    const pd = Math.sign(pl.x - f.x) * ((f.vx || 1) < 0 ? -1 : 1);   // pupil-track offset (flip-aware) — ONE source, shared by the DARKCORN eye + every enemy eye
    if (f.bit) {                                                // DARKCORN — unchanged (renders via drawU with colour swap)
      const bd = 13, hn = RBC[f.bi];
      ctx.scale(fs / 14, fs / 14);
      const bc = col; col = f.fl > 0 && (f.fl * 6 | 0) & 1 ? [4, 4, 4, 4] : [bd, hn, hn, bd]; drawUo(Math.sin(f.t) * 3); col = bc;   // HIT FLASH — while f.fl > 0, strobe ~6 Hz to PAL[4] red (mirrors player's hf/hfc strobe at line ~1130). Boss goes fully red on flash-on frames, back to dark-body+band-horn on flash-off.
      ctx.fillStyle = '#fff'; ctx.fillRect(9.3, 1.5, 2.4, 2.4); ctx.fillStyle = '#000'; ctx.fillRect(9.9 + pd * .7, 2.1, 1.2, 1.2);   // enemy-style tracking eyeball (DARKCORN only): white + black pupil — near-black body (PAL[13]) doubles as outline, so 2 rects. Player/GC keep drawU's plain eye.
    } else {
      const bod = f.fl > 0 && (f.fl * 6 | 0) & 1 ? PAL[4] : PAL[FOECOL[f.k]];   // HIT FLASH — while f.fl > 0, strobe ~6 Hz to PAL[4] red. Every oR() call below inherits `bod`, so the whole silhouette (body + head + legs + tendrils + spikes) flips red in sync. RED charge-tell skull (line ~1108) is drawn on top — during flash-off frames it reads sharp against normal body; during flash-on frames it merges with red body but the skull's dark eye/nose/teeth pixels (#161210) stay readable, and the 6 Hz strobe means it re-emerges 6×/sec.
      const oR = (x, y, w, h) => { ctx.fillStyle = '#000'; ctx.fillRect(x - 1, y - 1, w + 2, h + 2); ctx.fillStyle = bod; ctx.fillRect(x, y, w, h); };
      const eye = (cx, cy) => { ctx.fillStyle = '#000'; ctx.fillRect(cx - 3, cy - 3, 6, 6); ctx.fillStyle = '#fff'; ctx.fillRect(cx - 2, cy - 2, 4, 4); ctx.fillStyle = '#000'; ctx.fillRect(cx - 1 + pd, cy - 1, 2, 2); };   // standard eyeball: 6×6 black outline → 4×4 solid white → 2×2 black tracking pupil (was reversed with a white cross inside black — read as a slit not an eye)
      const flt = wob * 1.5;
      if (f.k == 1) {                                           // k1 walker-small — small body + separate head with eye + 4 stubby legs
        // 4 legs — mirror-paired around fs/2 (leg1↔leg4, leg2↔leg3). Alternating step offsets = walk animation.
        oR(s * .5, fs - s * .9 + step, s * .5, s * .9); oR(s * 1.6, fs - s * .9 - step * .7, s * .5, s * .9);
        oR(fs - s * 2.1, fs - s * .9 + step * .7, s * .5, s * .9); oR(fs - s, fs - s * .9 - step, s * .5, s * .9);
        oR(s * .8, s * 2.2 + wob * .3, fs - s * 1.6, s * 1.4); // body — width symmetric around fs/2
        oR(fs / 2 - s * 1.5 + wob * .2, wob * .3, s * 3, s * 1.9);   // head — centered on midline, wob only shifts x (no width distortion)
        eye(fs / 2 + wob * .2, s + wob * .3);                  // eye — centered on head, follows head sway
      } else if (f.k == 4) {                                    // k4 walker-fast — INTENTIONALLY asymmetric (racing pose: head forward, legs rear, speed lines trailing)
        oR(0, s * 2.6, fs * .7, s * 1.2);                      // long low body (leaves room for head to lean forward)
        oR(fs * .55, s * 2, s * 2.2, s * 2);                   // head (larger + taller, forward-lean — carries eye)
        oR(s * .3, fs - s * .8 + step, s * .5, s * .8); oR(s * 1.5, fs - s * .8 - step, s * .5, s * .8);   // 2 legs at rear
        oR(-s * .8, s * 2.7, s * .8, s * .3); oR(-s * .5, s * 3.3, s * .7, s * .3);   // 2 swept speed lines (behind, into the run)
        eye(fs * .8, s * 2.9);
      } else if (f.k == 5) {                                    // k5 walker-hop — tall body + 2 CHUNKY legs (squash/stretch preserved) — fully symmetric around fs/2
        oR(s * .7, fs - s * 1.3, s * 1.3, s * 1.3);            // chunky left leg (mirror of right)
        oR(fs - s * 2, fs - s * 1.3, s * 1.3, s * 1.3);        // chunky right leg
        oR(s * .5, s * .4 + wob * .3, fs - s, s * 3.4);        // tall body
        eye(fs / 2, s * 1.6 + wob * .3);                       // eye centered
      } else if (f.k == 2) {                                    // k2 floater-tent — dome + 3 tendrils, all centered on fs/2 (middle tendril sits on midline)
        for (let i = 0; i < 3; i++) {                          // tendrils span the width symmetrically; middle centered, outer pair equidistant
          const tx = fs / 2 - s * 1.75 + i * s * 1.5;           // i=0: fs/2 - s*1.75 · i=1: fs/2 - s*.25 (centered) · i=2: fs/2 + s*1.25
          oR(tx, s * 2.4 + flt, s * .5, s * 2 + Math.sin(f.t * 2 + i * .8) * s * .5);
        }
        oR(s * .3, s * .5 + flt, fs - s * .6, s * 2);          // dome body — centered
        eye(fs / 2, s * 1.4 + flt);
      } else if (f.k == 6) {                                    // k6 floater-spike — dome + 4 upright spikes, symmetric around fs/2 (pair-mirrored)
        for (let i = 0; i < 4; i++) oR(fs / 2 - s * 2 + i * s * 1.2, flt - s * .3, s * .4, s * .9);   // 4 spikes: pair-mirrored around midline (i=0,3 outer; i=1,2 inner)
        oR(s * .3, s * .8 + flt, fs - s * .6, s * 2.3);        // dome body — centered
        eye(fs / 2, s * 1.8 + flt);
      } else {                                                  // k3 caster — hood peak + robe body + universal eye — fully symmetric around fs/2
        oR(s * .3, s * 2.8, fs - s * .6, s * 1.4);             // lower robe (wider = shoulder line)
        oR(s * .5, s * 1.5, fs - s, s * 1.6);                  // upper robe
        oR(s * 1, wob * .3, fs - s * 2, s * 1.7);              // hood peak (taller for eye clearance)
        eye(fs / 2, s * .8 + wob * .3);                        // eye peers from hood shadow — universal round eye
      }
      if (f.rc < .7) skull(fs / 2, fs / 2, .7, 1, '#ff5d6c');   // CHARGE TELL — static RED skull at foe center (matches the RED fbolt). undefined<.7 is false so no explicit guard needed. Appearance alone signals "about to fire". Wind-up .5→.7 (09-07) — longer tell = more dodge time.
    }
    ctx.restore();
    if (f.hp < f.mx) bar(f.x, f.y - 3, fs, 1, f.hp / f.mx, '#6cf279');
  }
  for (const s of shots) { ctx.lineWidth = 1; rArc(s.x, s.y, 5, .7); }   // magic bolt = rainbow arc projectile — r=5 (10px caliber, matches skull), bolder 1px bands (09-08)
  for (const b of fbolts) skull(b.x, b.y, 1.3, 1, '#ff5d6c');   // foe RANGED bolt = flying RED skull (danger colour), u=1.3 ≈ 9×10px caliber matching the r=5 rainbow (09-08). Tell skull stays .7 — grows on launch.

  // GREATCORN — the guide NPC at the paddock. Isolated palette via col swap to NPCCOL,
  // faces left toward spawn (scale -1), gentle idle bob. Drawn before the player so the hero renders on top.
  {                                                                // always visible — title scene shows Greatcorn at the paddock
      ctx.save();
    ctx.translate(NX, NGY); ctx.scale(-NSC, NSC); ctx.translate(-PW / 2, -PH);
    const bc = col; col = NPCCOL;
    drawUo(Math.sin(time * 2));
    col = bc;
    ctx.restore();
  }

  // unicorn — always visible. Player flash (hf) is the invuln signal: red=hurt · green=heal · blue=dash. Colour = hfc PAL index, strobed. pl.inv (stomp/respawn) is silent. Any active hf OR pl.inv = immune to all damage (physical + projectile).
  ctx.save();
  ctx.translate(pl.x + PW / 2, pl.y + PH); ctx.scale(pl.face * NSC, NSC); ctx.translate(-PW / 2, -PH);   // draw at NSC to match GREATCORN + DARKCORN; feet stay planted (pivot = feet-center), collision box unchanged
  const bkc = col; if (hf > 0 && (hf * 6 | 0) & 1) col = [hfc, hfc, hfc, hfc]; else if (hp < mHP() * .2 && (time * 6 | 0) & 1) col = [4, 4, 4, 4];   // LOW-HP CUE (<20%): persistent red 6Hz strobe via global `time` — PURELY visual, NO invuln/hitstop (never touches hf/pl.inv). Yields to the hf invuln strobe when hurt.   // invuln STROBE — ~6 Hz toggle = 3 clear on/off blinks per second (deliberately slow enough to READ as a flash, not flicker). Starts tint-ON at impact for hf=1.2 (hurt/heal) AND hf=.5 (dash). hfc PAL: 4=red hurt · 15=green heal · 8=blue dash. Invuln itself is continuous (hf>0) regardless of blink phase.
  drawUo(pl.gr && Math.abs(pl.vx) > 20 ? Math.sin(pl.t * 16) * 3 : (pl.gr ? 0 : 2));
  col = bkc;
  ctx.restore();
  if (hp < mHP()) bar(pl.x - 5, pl.y - 12, 20, 1, hp / mHP(), '#6cf279');   // PLAYER floating HP bar — SAME 20×1 size as foes (bar() convention), centred over the 10px body (pl.x-5), hovering higher at pl.y-12, damaged-only, world-space

  // Item drops — pixel sprites, bob gently, fade IN at spawn (drops never despawn — cleared only on player death)
  for (const d of drops) {
    ctx.globalAlpha = Math.min(1, d.life * 3);   // fade IN over ~0.33s (was 1.0s) — reaches full opacity BEFORE the 0.5s pickup grace expires, so drops are always solidly visible when grabbed
    const dy = Math.sin(d.life * 5) * 1.5;
    if (d.t === 9) { ctx.lineWidth = 1; rArc(d.x, d.y - 6 + dy, 8, 1); }   // RAINBOW — the exact nested 7-band arc from the HUD icon, bobbing on the ground
    else if (d.t < 2) { const px = d.x - 6, py = d.y - 11 + dy; pot(px, py, d.t ? '#4a76ff' : '#6cf279'); }   // POTION drop — pot() draws body+cork+outline (HP=heal-green, MP=blue)
    else drawPart(d.s, d.x - 6, d.y - 11 + dy, d.c, 1.5);   // GEAR — bare sprite (no box), potion-sized (1.5×), rests on ground like potions
  }
  ctx.lineWidth = 1;
  for (const p of parts) {                                        // 3 particle kinds: p.sk===1 white skull (FOE death only) · p.sk===2 green heal cross (heal cast + GREATCORN blessing) · else 7-band rainbow burst (jumps + rainbow collect). spray() is the sole spawner.
    const al = Math.min(1, p.t * 2.5);
    if (p.sk === 1) { skull(p.x, p.y, .7, al); continue; }  // foe-DEATH skull = white bone (default #e9e3cd) — distinct from the RED ranged-attack skulls. (Player death no longer sprays skulls, so this is foe-death only.)
    if (p.sk === 2) { ctx.globalAlpha = al; ctx.fillStyle = '#6cf279'; ctx.fillRect(p.x - 1, p.y - 3, 2, 6); ctx.fillRect(p.x - 3, p.y - 1, 6, 2); continue; }   // HEAL cross — mini green + (scaled-down heal glyph), rises + fades. Same per-particle sprite treatment as skulls/rainbows.
    ctx.globalAlpha = al;
    ctx.lineWidth = .5 * p.z; rArc(p.x, p.y, 2.75 * p.z, .375 * p.z);   // burst rainbow — r/step/width scale together so the 7 bands stay distinct; p.z sizes it (1 = puff, big = victory)
  }
  ctx.globalAlpha = 1; ctx.lineWidth = 1;
  for (const f of flies) {                                       // textAlign inherited 'center' from topHUD (last set each frame) — damage centres on origin; hud flies offset by cam to cancel world translate
    ctx.globalAlpha = Math.min(1, f.t * 2); ctx.font = 'bold 8px monospace';   // ALL popups uniform 8px (= HUD text) — no crit size differentiator; crit reads via its 2× number alone. String dedupes with every 'bold 8px monospace' site.
    ctx.fillStyle = f.c; const fx = f.hud ? (f.x + cam.x) | 0 : f.x | 0, fy = f.hud ? (f.y + cam.y) | 0 : f.y | 0;
    ctx.fillText(f.txt, fx, fy);
    if (f.pot) pot(fx + 6, fy - 9, f.c, .7);   // mini potion glyph just right of the centred "+1"
  }
  ctx.globalAlpha = 1;
  if (dq && started) { const s = dq[di], u = s[0] === '~'; bubble(u ? pl.x + PW / 2 : NX, u ? pl.y - 4 : NGY - 26, u ? s.slice(1) : s); }   // bubble stems from the speaker's head — '~' = player reply, else GREATCORN; hidden on title
  ctx.translate((cam.x - so) | 0, (cam.y - so) | 0);            // undo world translate (incl. shake)

  // ---------- HUD (gameplay-only overlays: level-up banner, death vignette) ----------
  // Top-left LV/name/rainbow/bars live in topHUD() below (persistent, also visible in the menu).
  if (started && !paused) fade(1 - Math.abs(deathT - .8) / .8);

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
    if (pending) { ctx.fillStyle = '#ffd75e'; ctx.font = 'bold 13px monospace'; T2('+' + pending, 130, 137); }   // 13px = shared UI size; y=137 centers it vertically in the empty gap between the unicorn legs (~y116) and the MAG stat top (y146). x=130 = shared cluster centerline (3rd inv box center)
    // EQUIPMENT — 4 slots cornered around the unicorn (anatomy: MANE top-left, HORN top-right, BODY bottom-left, HOOVES bottom-right).
    ctx.font = 'bold 8px monospace';                          // reset from the 13px pending hint above (if it fired)
    EQ.forEach(([s, ex, ey]) => {
      ctx.fillStyle = eq[s] ? 'rgba(136,204,255,.14)' : '#2a2a33'; ctx.fillRect(ex, ey, 24, 24);   // equipped slot = blue ACTIONABLE fill (matches inventory + skill-tree schema, 09-08) · empty = inert dark #2a2a33 so an empty slot reads clearly vacant
      const wOn = aRow === EB + s;
      ctx.strokeStyle = wOn ? '#ffd75e' : '#555'; ctx.lineWidth = wOn ? 1 : .5; ctx.strokeRect(ex, ey, 24, 24);   // Fix B (09-08): GOLD cursor drawn on the SAME rect (single border, no double outline); grey passive otherwise. Gold = the one persistent selection colour menu-wide.
      if (eq[s]) drawPart(s, ex + 6, ey + 2, eq[s].c, 2);     // gear icon @2× — y+2 (was +4): nudged 2px UP so top margin tightens (4→2) and bottom margin opens (2→4), giving "+N" stat text at ey+22 double the breathing room.
      ctx.fillStyle = '#ccc'; T2(SLOT_LBL[s], ex + 12, ey + 35);   // label offset +35 (was +31): boxes moved up 6px (ey 64/112→58/106), labels net up ~2px, box↔word gap widened so the text no longer kisses the box bottom
      if (eq[s]) { ctx.fillStyle = SC[SLOT_STAT[s]]; T2('+' + eq[s].b, ex + 6, ey + 22);       // primary stat → BOTTOM-LEFT, in its stat colour (SC): STR red · HP green · MAG blue · DEF violet · LCK orange
        if (eq[s].u != null) { ctx.fillStyle = SC[eq[s].u]; T2('+' + eq[s].v, ex + 18, ey + 22); } }   // sub-stat → BOTTOM-RIGHT, its own colour
    });
    // STATS — one row above the inventory; cursor = blue column. Row nudged UP 12px + RIGHT 10px (2026-09-06) to give inv room to clear the joystick visual.
    const SL = ['STR', 'HP', 'MAG', 'DEF', 'LCK'];
    SL.forEach((l, i) => { const c = SC[i];
      const sx = 69 + i * 26, sel = i === aRow;
      if (sel) { ctx.strokeStyle = '#ffd75e'; ctx.lineWidth = 1; ctx.strokeRect(sx - 3, 146, 25, 23); }   // GOLD cursor (Fix B) — one persistent selection colour across the whole menu
      ctx.fillStyle = c; T2(l, sx + 9, 154);
      ctx.fillStyle = c; T2(st[i], sx + 9, 165); if (sel && pending) T2('+', sx + 18, 165);   // number always in its SC stat colour; same-colour "+" right of the number on the SELECTED stat only when points pending = "confirm to raise THIS". Replaces the old gold-number cue.
    });
    // INVENTORY — 5×2 grid UNDER the stat row (fixed 10 slots). Click to select, click again to equip. Grid shifted UP 12px + RIGHT 12px (2026-09-06) so bottom row clears the joystick visual (x=22-50, y=222-250) with edge-touching, no overlap.
    for (let i = 0; i < BAG; i++) {
      const ix = 62 + (i % 5) * 28, iy = 172 + ((i / 5) | 0) * 28, it = inv[i];
      ctx.fillStyle = it ? 'rgba(136,204,255,.14)' : 'rgba(255,255,255,.05)';   // filled slot = blue ACTIONABLE fill (holds gear you can equip) · empty = faint. Matches skill-tree available/purchased fill (09-08 universal schema).
      ctx.fillRect(ix, iy, 24, 24);
      ctx.strokeStyle = i === aRow - 5 ? '#ffd75e' : '#555';
      ctx.lineWidth = i === aRow - 5 ? 1 : .5; ctx.strokeRect(ix, iy, 24, 24);   // unified border — GOLD cursor when selected (Fix B, same rect), passive grey otherwise
      if (it) { drawPart(it.s, ix + 6, iy + 2, it.c, 2);       // inventory gear @2× — y+2 matches equipment slot nudge (top 2px / bottom 4px, opens breathing room for +N stat text).
        ctx.fillStyle = SC[SLOT_STAT[it.s]]; T2('+' + it.b, ix + 6, iy + 22);           // primary stat → BOTTOM-LEFT, its stat colour
        if (it.u != null) { ctx.fillStyle = SC[it.u]; T2('+' + it.v, ix + 18, iy + 22); } }   // sub-stat → BOTTOM-RIGHT, its own colour
    }
    // (Gear stats are now shown INLINE on every icon — bag + worn — so no selection tooltip is needed.)
    // SKILL TREE — 10 icon nodes in a 3-2-3-2 grid, gated purely by LEVEL ROW (Row1 LV1 · Row2 LV3 · Row3 LV6 · Row4 LV9). No prerequisite/connection lines; locked = dim, owned = bright + gold-tinted.
    // font + textAlign inherited from top of char sheet (unchanged since L1149)
    if (spts) { ctx.fillStyle = '#ffd75e'; ctx.font = 'bold 13px monospace'; T2('+' + spts, 338, 52); ctx.font = 'bold 8px monospace'; }   // skill points available (y 52 = above the new Row-1 top at y=58) — 13px matches the stat "+N" (uniform size + font); reset to 8px for the tree nodes
    const NS = 26;
    // No connection lines — level-gated tiers (canBuy = lvl>=[req][i]). Locked rows read as dim; unlocked rows are bright.
    // Nodes — all 10 are action skills, rendering the SAME icon as their action button (via iShot/iHeal/iJump/iDash, wrapped in scale to fit). Chevron / stacked-arc count on upgrade nodes matches the button's own scaling rule. (Modifier skills STASH/HP+5/MP+5/POT+5 removed 2026-09-05.)
    for (let i = 0; i < TREE; i++) {
      const [cx, cy] = TPOS[i];
      const av = canBuy(i);   // 3-STATE NODES (09-08, convention-researched: locked=greyed · available=lit · purchased=filled): ghost 0.25 grey → white ring 0.9 → blue ring/tint 1.0. White=ready matches dash flash; blue=#8cf owned/active accent game-wide.
      ctx.fillStyle = su[i] || av ? 'rgba(136,204,255,.14)' : 'rgba(255,255,255,.05)'; ctx.fillRect(cx, cy, NS, NS);   // blue ACTIONABLE tint for BOTH purchased (su) AND available (av, 09-08 Joey); faint white for locked only. Border still separates the two: av = white ring, su = blue ring.
      const tOn = aRow === 5 + BAG + i;
      ctx.strokeStyle = tOn ? '#ffd75e' : su[i] ? '#8cf' : av ? '#fff' : '#555'; ctx.lineWidth = tOn || su[i] || av ? 1 : .5; ctx.strokeRect(cx, cy, NS, NS);   // Fix B (09-08): single border — state colour (grey locked / white avail / blue purchased) OR GOLD cursor when selected. Gold overrides + draws on the SAME rect, so no double outline and the cursor never masquerades as a state.
      const mx = cx + 13, my = cy + 13;
      // ACTION SKILL — icon scaled to fit cell. All 10 nodes are action skills (modifier skills removed 2026-09-05; the old i>=8 text branch went with them).
      // uniform icon alpha inherited (=1; border color IS the state signal — grey/white/blue). Alpha ops removed 09-08: save/restore preserves alpha, nothing in the loop changes it.
      ctx.save(); ctx.translate(mx, my); ctx.scale(.65, .65); ctx.translate(-mx, -my);
      if (i === 0 || i === 8 || i === 9) iShot(mx, my, i === 0 ? 1 : i - 6);   // SHOT (1) / DBL SHOT (2 stacked) / TRI SHOT (3 stacked)
      else if (i === 1) {   // FAR SHOT — aiming reticle/scope: green ring + crosshair (heal-spray green), evokes long-range aim
        ctx.strokeStyle = '#6cf279'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(mx, my, 6, 0, 7);
        ctx.moveTo(mx - 10, my); ctx.lineTo(mx - 3, my); ctx.moveTo(mx + 3, my); ctx.lineTo(mx + 10, my);
        ctx.moveTo(mx, my - 10); ctx.lineTo(mx, my - 3); ctx.moveTo(mx, my + 3); ctx.lineTo(mx, my + 10);
        ctx.stroke();
      }
      else if (i === 2 || i === 3) iHeal(mx, my, i === 3);   // HEAL / SUPER HEAL — SUPER adds the 4-dot aura (upgrade tier)
      else if (i === 4 || i === 5) iJump(mx, my, i - 2);   // DBL / TRI JUMP (2 / 3 chevrons)
      else if (i === 6 || i === 7) iDash(mx, my, i - 5);   // DASH / LONG DASH (1 / 2 chevrons)
      ctx.restore();
    }
    // (rainbow indicator lives in topHUD now — top-left, persistent in gameplay + menu)
    // ACTION labels — honest verb for the selected gear: EQUIP (bag) / UNEQUIP (worn). LEFT box routes through spend(); DROP (right) is bag-only (worn gear can't be trashed — take it off first). Primary action sits on left, closer to joystick thumb. Control reference lives ONLY in the ? overlay.
    const wi = aRow - EB, act = inv[aRow - 5] ? 'EQUIP' : wi >= 0 && eq[wi] ? 'UNEQUIP' : 0;
    if (act) {
      ctx.strokeStyle = '#8cf'; ctx.lineWidth = 1; ctx.fillStyle = 'rgba(136,204,255,.14)';
      ctx.fillRect(50, 250, 50, 14); ctx.strokeRect(50, 250, 50, 14);
      if (act === 'EQUIP') { ctx.fillRect(110, 250, 50, 14); ctx.strokeRect(110, 250, 50, 14); }   // DROP box (bag only)
      ctx.fillStyle = '#8cf'; T2(act, 75, 258);
      if (act === 'EQUIP') { ctx.fillStyle = '#8cf'; T2('DROP', 135, 258); }   // DROP = same blue-on-blue treatment as EQUIP (matches every other active button in the game — joystick / action / top cluster all use #8cf)
    }
  }

  // action buttons — PERSISTENT: shown in gameplay AND the character menu (09-07).
  // Colored ring per action, dark disc, glyph in accent color. Modern mobile pattern.
  // Menu: JUMP renders as ✓ (confirm/select); a tap on any other button just closes the menu (tap-out) — no guard, by design.
  // Teaching pattern: locked skills render dim, so buying a skill visibly lights its button.
  if (started && !savePop && !helpOn) {
    ctx.textAlign = 'center';
    for (const [tx, ty, c, s] of AB) {
      const x = tx + (tx < 424 ? 7 : -2), y = ty + (ty < 216 ? 7 : -2);   // VISUAL centre = touch (tx,ty) nudged toward the cluster: LEFT/TOP cols +7, RIGHT/BOTTOM -2 (so bottom row + right column sit 5px further out → slightly more space, still a symmetric square). Touch zones (AB) unchanged. Max offset 9.9px (TL) < 12px slop → whole button stays inside its tap zone. Rest of the loop draws at x,y = visual.
      const owned = s < 0 || su[s], usable = owned && (s < 0 || mn >= 3);    // JUMP (s<0) always usable; owned skills need the uniform 3 MP
      // THREE states (09-08 Joey — supersedes the 09-05 two-state rule): usable = BLUE · owned-but-no-MP = WHITE (matches skill-tree "available") · not-owned = GREY/dim. Applies the universal menu schema to the HUD so "have it, need mana" no longer looks identical to "don't have it". Still no press-pop; a usable button doesn't animate.
      const rc = usable ? '#8cf' : owned ? '#fff' : '#555';
      ctx.globalAlpha = usable ? 1 : owned ? .6 : .3;
      // INTRO TUTORIAL — SUBTRACTIVE spotlight (research 09-04: NN/g "don't match the UI" + static
      // pop-out): during controls bubbles 6/7/8 the explained control renders full-alpha, all others
      // dim to .15. No ring, no gold — gold keeps its ONE button meaning (interact-now), and locked
      // buttons stay visibly dull-grey while spotlit (no "looks usable" lie). Scene is frozen, so a
      // static contrast jump pops preattentively — no animation needed (Treisman pop-out).
      if (dq === INTRO && di >= 6 && di <= 8) ctx.globalAlpha = (di === 7 ? c === 'bJ' : di === 8 && c !== 'bJ') ? .95 : .15;
      ctx.save(); ctx.translate(x, y); ctx.scale(BVS, BVS); ctx.translate(-x, -y);   // scale the WHOLE visual (disc+glyph+linewidths) — glyph code stays untouched
      ctx.fillStyle = 'rgba(15,15,20,.75)';
      ctx.beginPath(); ctx.arc(x, y, AR, 0, 7); ctx.fill();
      ctx.strokeStyle = rc; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x, y, AR, 0, 7); ctx.stroke();
      // Action-button glyphs — all four routed through the shared iShot / iHeal / iJump / iDash helpers (same code paths as skill-tree icons). JUMP has a paused-checkmark alternate for menu-confirm.
      if (c === 'bH') iHeal(x, y, su[3]);   // HUD HEAL button gains the SUPER HEAL aura once owned — matches the skill-node treatment (like JUMP/DASH chevrons)
      if (c === 'bJ') {
        if (paused || nearNpc || ~nearChest) {   // ✓ mode = "tap to confirm/interact" — menu confirm · NPC talk · chest open. Same glyph, one semantic: JUMP is universally the interact key.
          ctx.lineCap = 'round'; ctx.lineJoin = 'round';
          ctx.strokeStyle = '#8cf'; ctx.lineWidth = 4;   // ✓ — single stroke in the UI accent
          ctx.beginPath(); ctx.moveTo(x - 9, y + 1); ctx.lineTo(x - 3, y + 8); ctx.lineTo(x + 10, y - 8); ctx.stroke();
          ctx.lineCap = 'butt'; ctx.lineJoin = 'miter';
        } else iJump(x, y, 1 + su[4] + su[5]);
      }
      if (c === 'bM') iDash(x, y, 1 + su[7]);
      if (c === 'bS') iShot(x, y, 1 + su[8] + su[9]);   // SHOT button reflects DBL/TRI upgrades (like JUMP/DASH chevrons + the skill-tree icon)
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }
  // joystick — persistent base; knob tracks thumb; brightens while held. Gameplay only (hidden in the character menu).
  if (started && touch && !savePop && !helpOn) {   // gameplay AND character menu (menu uses it for cursor nav); hidden only under overlays
    const act = joy.id >= 0;
    ctx.globalAlpha = act ? 1 : .7;   // always usable → rests at .7 like the buttons; engaging pops to full
    if (dq === INTRO && di >= 6 && di <= 8) ctx.globalAlpha = di === 6 ? .95 : .15;   // subtractive spotlight: full while bubble 6 explains the stick, dimmed while buttons are explained
    ctx.save(); ctx.translate(JHX, JHY); ctx.scale(JVS, JVS); ctx.translate(-JHX, -JHY);   // scale WHOLE visual (base+knob+throw); base pinned at fixed home
    ctx.fillStyle = 'rgba(15,15,20,.75)';
    ctx.beginPath(); ctx.arc(JHX, JHY, JR, 0, 7); ctx.fill();
    ctx.strokeStyle = '#8cf'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(JHX, JHY, JR, 0, 7); ctx.stroke();
    ctx.fillStyle = '#8cf';   // knob inherits base alpha (fill-vs-stroke contrast distinguishes it from the ring — no separate alpha needed)
    ctx.beginPath(); ctx.arc(JHX + joy.dx, JHY + joy.dy, KR, 0, 7); ctx.fill();
    ctx.restore(); ctx.globalAlpha = 1;
  }

  // ---------- PERSISTENT HUD (top-left header + bottom-center potions) — visible in gameplay AND character menu ----------
  if (started) {
    topHUD();
    const qslot = (x, t) => {
      const n = t ? mpPot : hpPot, help = t ? mn < mMN() : hp < mHP(), usable = n > 0 && help;   // usable = HAVE a potion AND drinking would restore something (mirrors the quaff() gate exactly). Not usable at full vitals even when stocked.
      ctx.globalAlpha = usable ? 1 : n ? .6 : .3;                                    // 3-STATE (09-08, matches action buttons): usable=full · have-but-vitals-full=.6 · empty=.3
      ctx.fillStyle = 'rgba(15,15,20,.75)'; ctx.fillRect(x, QSY, QSZ, QSZ);          // dark disc — same fill as the action buttons
      ctx.strokeStyle = usable ? '#8cf' : n ? '#fff' : '#555'; ctx.lineWidth = 2; ctx.strokeRect(x, QSY, QSZ, QSZ);   // BLUE = usable now · WHITE = have potions but vitals full (matches skill-tree "available" + action-button "owned/no-MP") · GREY = empty
      ctx.globalAlpha = 1;
      pot(x + 6, QSY + 6, t ? '#4a76ff' : '#6cf279');                                 // potion glyph at full alpha → always solid + crisp (body/cork/outline in pot()), never see-through even when the box is dimmed
      ctx.fillStyle = n ? '#fff' : '#888'; ctx.font = 'bold 8px monospace'; ctx.textAlign = 'right'; ctx.fillText(n, x + QSZ - 2, QSY + QSZ - 2);   // count = white when stocked, grey when empty. Blue-at-MAX dropped 09-08 — blue is reserved for the usable STATE, not a quantity tier (the number itself shows how many).
    };
    qslot(QHX, 0); qslot(QMX, 1);
    if (time < luT) { ctx.globalAlpha = Math.min(1, (luT - time) * 3); rText('LEVEL UP', 48); ctx.globalAlpha = 1; }   // LEVEL UP banner — renders over menu (auto-pause opens char sheet on level)
  }
  // Top-right icon row — unified 12×12 buttons: blue panel fill (rgba(136,204,255,.14)) + BLUE #8cf 1.5 ring,
  // matching the skill nodes / inventory / action buttons. Blue = the universal actionable background; grey is reserved for NOT-usable states only. Glyphs are neutral #ccc (identity, not state).
  // One helper draws every wrapper; only the glyph inside changes.
  if (started) {
    // Top-right control cluster — square boxes with the shared blue ring (#8cf, same accent as action buttons + joystick).
    // Order: 🔊 Speaker (left) · ? Help (middle) · ✕ Back (corner, traditional close position). Always shown, incl. the character menu.
    const iy = 4, isz = 12, box = (x) => {
      ctx.fillStyle = 'rgba(136,204,255,.14)'; ctx.fillRect(x, iy, isz, isz);   // blue actionable panel fill (schema default 09-08) — grey is reserved for NOT-usable states only; these are always-active controls
      ctx.strokeStyle = '#8cf'; ctx.lineWidth = 1.5; ctx.strokeRect(x, iy, isz, isz);
    }, xm = (x) => { ctx.strokeStyle = '#ccc'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x + 3, iy + 3); ctx.lineTo(x + 9, iy + 9); ctx.moveTo(x + 9, iy + 3); ctx.lineTo(x + 3, iy + 9); ctx.stroke(); };   // neutral ✕ — reserved for the back button ONLY (no duplicate Xs on the top bar)
    const sx = VW - 56, hx = VW - 38, xx = VW - 20;
    box(sx);                                                    // 🔊 speaker (leftmost) — always draw the cone; add red diagonal slash when muted (standard mute glyph, visually distinct from the back ✕)
    ctx.fillStyle = mute ? '#666' : '#ccc';
    ctx.fillRect(sx + 3, iy + 5, 2, 3); ctx.beginPath(); ctx.moveTo(sx + 5, iy + 5); ctx.lineTo(sx + 8, iy + 3); ctx.lineTo(sx + 8, iy + 10); ctx.lineTo(sx + 5, iy + 8); ctx.fill();
    if (mute) { ctx.strokeStyle = '#e33'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(sx + 2, iy + 10); ctx.lineTo(sx + 10, iy + 2); ctx.stroke(); }
    box(hx);                                                    // ? help (middle)
    ctx.font = 'bold 8px monospace'; ctx.textAlign = 'center'; ctx.fillStyle = '#ccc'; ctx.fillText('?', hx + 6, iy + 10);
    box(xx); xm(xx);                                            // ✕ back/exit (corner) — the ONLY ✕ on the top bar
    // Save popup — centered: rainbow SAVED! + CONTINUE + EXIT GAME
    if (savePop) {
      fade(.8);
      // Rainbow "SAVED!" per-character
      ctx.font = 'bold 24px monospace'; ctx.textAlign = 'center';
      const sv = 'GAME SAVED', sw = ctx.measureText(sv).width, sx0 = (VW - sw) / 2;
      for (let i = 0; i < sv.length; i++) { ctx.fillStyle = RC[i % 7]; ctx.fillText(sv[i], sx0 + ctx.measureText(sv.slice(0, i)).width + ctx.measureText(sv[i]).width / 2, 110); }
      // CONTINUE + EXIT GAME
      ctx.font = 'bold 13px monospace';
      ctx.fillStyle = '#888';   T2('EXIT GAME', VW / 2 - 55, 258);   // neutral (game already saved — not a caution action; red reserved for destructive DROP/DELETE)
      ctx.fillStyle = '#8cf'; T2('CONTINUE', VW / 2 + 55, 258);
    }
  }
  // TITLE SCREEN — world scene renders behind, scrim dims it, title art on top
  if (!phase) {
    fade(.34);
    ctx.lineWidth = 3;
    rArc(VW / 2, 130, 78, 3);
    ctx.save(); ctx.translate(VW / 2, 108); ctx.scale(2.4, 2.4); ctx.translate(-6, -8);
    const bkc = col; col = [0, 0, 2, 0]; drawUo(0); col = bkc;
    ['#ff5d6c', '#ffd75e', '#6bc5ff'].forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(5 - i * 2, 1 + i * 2, 2, 4); });
    ctx.restore();
    rText('HOOVES OF HOPE', 178);
    ctx.textAlign = 'center';
    if (tMode === 1) {
      const nm = ent + (Math.sin(time * 4) > 0 && ent.length < 8 ? '_' : '');
      ctx.fillStyle = '#fff'; ctx.font = 'bold 13px monospace'; T2(nm || '(type A–Z)', VW / 2, 204);
      ctx.fillStyle = ent ? '#8cf' : '#555'; T2('BEGIN', VW / 2, 224);
    } else {
      ctx.font = 'bold 13px monospace';
      ctx.fillStyle = '#8cf';
      T2(sMeta() || 'NEW GAME', VW / 2, 208);
      if (sPop) {
        ctx.fillStyle = 'rgba(0,0,0,.7)'; ctx.fillRect(0, 240, VW, 30);
        ctx.fillStyle = sPop === 2 ? '#c33' : '#888';   T2('DELETE',   VW / 2 - 55, 258);
        ctx.fillStyle = sPop === 1 ? '#8cf' : '#888'; T2('CONTINUE', VW / 2 + 55, 258);
      }
    }
  }
  // HELP OVERLAY — controls reference, toggled by "?" button
  if (helpOn && started) {
    fade(.88);
    ctx.textAlign = 'center'; ctx.font = 'bold 8px monospace';
    ctx.fillStyle = '#fff'; T2('CONTROLS', VW / 2, 60);
    [['MOVE','A D S / ← → ↓'],['JUMP','SPACE / W / ↑'],['DASH','J'],['SHOOT','L'],['HEAL','H'],['MENU','P / tap your name']].forEach(([a, b], i) => {
      const y = 82 + i * 22;
      ctx.fillStyle = '#888'; ctx.textAlign = 'right'; T2(a, VW / 2 - 10, y);
      ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; T2(b, VW / 2 + 10, y);
    });
    ctx.textAlign = 'center'; ctx.fillStyle = '#888'; T2('tap to close', VW / 2, 230);
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
