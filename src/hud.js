// hud.js — all GUI is DOM (≈0 render bytes): hearts, resources, prompt, DM bar,
// floating text, toasts, and the Session Zero creation screen.
import * as DM from './dm.js';
import { sfx, SND } from './audio.js';
import { isTouch } from './input.js';

const el = (t, css, parent, html) => {
  const e = document.createElement(t);
  e.style.cssText = 'position:absolute;font-family:system-ui,sans-serif;user-select:none;' + css;
  if (html != null) e.innerHTML = html;
  (parent || document.body).appendChild(e);
  return e;
};

// --- HUD chrome ---
const hearts = el('div', 'top:12px;left:14px;font-size:26px;text-shadow:0 1px 3px #000');
const res = el('div', 'top:46px;left:16px;font-size:16px;color:#fff;text-shadow:0 1px 3px #000;opacity:.92');
const prompt = el('div', 'left:50%;bottom:110px;transform:translateX(-50%);font-size:18px;color:#fff;background:#0009;padding:7px 16px;border-radius:9px;display:none');
const dmBar = el('div', 'left:50%;bottom:26px;transform:translateX(-50%);max-width:72%;font-size:17px;font-style:italic;color:#e8dcc8;background:#000a;padding:9px 18px;border-radius:10px;transition:opacity .4s;opacity:0;text-align:center');
const flash = el('div', 'inset:0;background:#f33;opacity:0;pointer-events:none;transition:opacity .3s');
const lvEl = el('div', 'top:12px;right:14px;font-size:16px;color:#ffd75e;text-shadow:0 1px 3px #000');
export const setLv = (n) => lvEl.textContent = '🦄 Lv ' + n;
const abEl = el('div', 'top:34px;right:14px;font-size:14px;letter-spacing:2px');
export const setAbil = (t) => abEl.textContent = t;
const obj = el('div', 'top:12px;left:50%;transform:translateX(-50%);font-size:14px;color:#ffec;background:#0007;padding:5px 12px;border-radius:8px;white-space:nowrap');
export const setObj = (t) => obj.textContent = t;
let dmT = 0;
DM.onSay((line) => { dmBar.textContent = line; dmBar.style.opacity = 1; dmT = 4.5; });

export const setHearts = (hp, max) =>
  hearts.textContent = '❤️'.repeat(hp) + '🖤'.repeat(Math.max(0, max - hp));
export const setRes = (inv) => {
  const ICO = { fl: '🌼', sp: '💎' };
  res.textContent = Object.keys(ICO).filter(k => inv[k]).map(k => ICO[k] + inv[k]).join('  ');
};
// death: fade to black, hold, respawn (cb), fade back — makes dying a real moment
export const deathFade = (cb) => {
  playing = 0; // reuse the world-freeze gate the creation screen already uses
  const d = el('div', 'inset:0;background:#000;opacity:0;pointer-events:none;transition:opacity .6s;display:flex;align-items:center;justify-content:center;font-size:64px;z-index:9', 0, '💀');
  requestAnimationFrame(() => d.style.opacity = '1');
  setTimeout(() => { cb(); playing = 1; d.style.opacity = '0'; setTimeout(() => d.remove(), 700); }, 1600);
};

export const setPrompt = (t) => {
  prompt.style.display = t ? 'block' : 'none';
  if (t) prompt.textContent = isTouch() ? t.replace('E — ', '✋ ').replace('F — ', '⚔️ ') : t;
};
export const hurtFlash = () => {
  flash.style.transition = 'none'; flash.style.opacity = .32;
  requestAnimationFrame(() => { flash.style.transition = 'opacity .3s'; flash.style.opacity = 0; });
};

// --- floating combat text (spawned at projected screen pos, CSS animates) ---
export const fly = (sx, sy, text, color, big) => {
  const f = el('div', `left:${sx}px;top:${sy}px;transform:translate(-50%,-50%);font-size:${big ? 30 : 19}px;font-weight:700;color:${color};text-shadow:0 1px 4px #000;transition:all 1.1s ease-out;pointer-events:none`, 0, text);
  requestAnimationFrame(() => { f.style.top = sy - 64 + 'px'; f.style.opacity = 0; });
  setTimeout(() => f.remove(), 1150);
};

// --- toast queue (never stacks visually) ---
const toasts = [];
let toasting = 0;
export const toast = (html) => {
  toasts.push(html);
  if (!toasting) nextToast();
};
const nextToast = () => {
  if (!toasts.length) { toasting = 0; return; }
  toasting = 1;
  sfx(SND.toast);
  const t = el('div', 'left:50%;bottom:-60px;transform:translateX(-50%);font-size:18px;color:#fff;background:#1b1630ee;border:1px solid #ffffff33;padding:10px 22px;border-radius:12px;transition:all .25s cubic-bezier(.2,.9,.3,1.2)', 0, toasts.shift());
  requestAnimationFrame(() => t.style.bottom = '64px');
  setTimeout(() => { t.style.opacity = 0; }, 2600);
  setTimeout(() => { t.remove(); nextToast(); }, 2950);
};

export const tick = (dt) => {
  if (dmT > 0 && (dmT -= dt) <= 0) dmBar.style.opacity = 0;
};

// --- badge grid (B toggles; grayscale until earned = visible goals) ---
// Opening pauses the world (reuses the playing gate); refuses to open while
// already paused (Session Zero, death fade) so overlays never stack.
let badgeOv = null;
export const badges = (list) => {
  if (badgeOv) { badgeOv.remove(); badgeOv = null; playing = 1; return; }
  if (!playing) return;
  playing = 0;
  badgeOv = el('div', 'inset:0;background:#0e0b16cc;display:flex;flex-wrap:wrap;align-content:center;justify-content:center;gap:10px;padding:8vw');
  for (const [emoji, label, got] of list)
    el('div', `position:static;width:150px;font-size:13px;color:#fff;background:#ffffff12;border-radius:10px;padding:10px;text-align:center;${got ? '' : 'filter:grayscale(1);opacity:.45'}`,
      badgeOv, `<span style="font-size:26px">${emoji}</span><br>${label}`);
  el('div', 'position:static;width:100%;text-align:center;font-size:14px;color:#b9a;margin-top:6px', badgeOv, 'B — close');
};

// --- Session Zero: character creation (blocks input until Start) ---
export let playing = 0;
export const creation = (onStart, onContinue) => {
  const ov = el('div', 'inset:0;background:#0e0b16dd;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;color:#eee;text-align:center');
  el('div', 'position:static;font-size:34px;font-weight:800;letter-spacing:2px;color:#fff', ov,
    'NAT <span style="color:#ffd75e">20</span> UNICORN');
  el('div', 'position:static;font-size:15px;font-style:italic;color:#b9a;margin-bottom:8px', ov,
    'Session Zero — a level 1 unicorn. Every jump you earn, you keep.');
  el('div', 'position:static;font-size:15px;color:#cbc;letter-spacing:1px', ov, 'STR · DEX · CON · INT · WIS · CHA — all 10');
  const btn = (label, css) =>
    el('button', 'position:static;font-size:15px;padding:8px 14px;border-radius:9px;border:0;cursor:pointer;' + css, ov, label);
  const start = btn('Roll for it.', 'background:#ffd75e;color:#221;font-weight:700;font-size:18px;margin-top:6px');
  start.onclick = () => { ov.remove(); playing = 1; DM.say(DM.P.start); onStart(); };
  if (onContinue) {
    const c = btn('▶ Continue', 'background:#ffffff1c;color:#fff;font-size:15px');
    c.onclick = () => { ov.remove(); playing = 1; onContinue(); };
  }
};
