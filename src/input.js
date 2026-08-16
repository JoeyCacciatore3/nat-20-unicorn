// input.js — unified keyboard + pointer/touch (left = stick, right = camera, tap = jump)
export const keys = {};
export const cam = { yaw: 2.7, pitch: .52 };
const stick = { id: -1, sx: 0, sy: 0, x: 0, y: 0 };
let camId = -1, lx = 0, ly = 0, downT = 0, moved = 0, jump = 0, attack = 0, dodge = 0, interact = 0;

// touch combat buttons — created on first touch so desktop never sees them
let touchUI = 0;
const mkTouchUI = () => {
  if (touchUI) return;
  touchUI = 1;
  const mk = (label, right, fn) => {
    const b = document.createElement('div');
    b.style.cssText = `position:absolute;right:${right}px;bottom:26px;width:64px;height:64px;border-radius:50%;background:#ffffff2b;font-size:30px;display:flex;align-items:center;justify-content:center;touch-action:none`;
    b.textContent = label;
    b.addEventListener('pointerdown', (e) => { e.stopPropagation(); fn(); });
    document.body.appendChild(b);
  };
  mk('⚔️', 22, () => attack = 1);
  mk('💨', 98, () => dodge = 1);
  mk('✋', 174, () => interact = 1);
};

export const initInput = (c) => {
  addEventListener('keydown', (e) => {
    keys[e.code] = 1;
    if (!e.repeat) {
      if (e.code === 'Space') jump = 1;
      if (e.code === 'KeyF' || e.code === 'KeyJ') attack = 1;
      if (e.code === 'KeyE' || e.code === 'Enter') interact = 1;
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') dodge = 1;
    }
    if (/^(Space|Arrow)/.test(e.code)) e.preventDefault();
  });
  addEventListener('keyup', (e) => keys[e.code] = 0);
  c.addEventListener('pointerdown', (e) => {
    try { c.setPointerCapture(e.pointerId); } catch { /* synthetic/stale pointer */ }
    if (e.pointerType === 'touch') mkTouchUI();
    if (e.pointerType === 'touch' && e.clientX < innerWidth * .45) {
      stick.id = e.pointerId; stick.sx = e.clientX; stick.sy = e.clientY;
    } else {
      camId = e.pointerId; lx = e.clientX; ly = e.clientY; downT = performance.now(); moved = 0;
    }
  });
  c.addEventListener('pointermove', (e) => {
    if (e.pointerId === stick.id) {
      stick.x = (e.clientX - stick.sx) / 55; stick.y = (e.clientY - stick.sy) / 55;
      const l = Math.hypot(stick.x, stick.y);
      if (l > 1) { stick.x /= l; stick.y /= l; }
    } else if (e.pointerId === camId) {
      moved += Math.abs(e.clientX - lx) + Math.abs(e.clientY - ly);
      cam.yaw -= (e.clientX - lx) * .006;
      cam.pitch = Math.min(1.25, Math.max(.12, cam.pitch + (e.clientY - ly) * .004));
      lx = e.clientX; ly = e.clientY;
    }
  });
  const up = (e) => {
    if (e.pointerId === stick.id) { stick.id = -1; stick.x = stick.y = 0; }
    if (e.pointerId === camId) {
      if (performance.now() - downT < 220 && moved < 12)
        e.pointerType === 'touch' ? jump = 1 : attack = 1; // tap = jump (touch) / attack (mouse)
      camId = -1;
    }
  };
  c.addEventListener('pointerup', up);
  c.addEventListener('pointercancel', up);
};

// [x strafe, y fwd(-1)/back(+1)] camera-relative, unit-clamped
export const moveInput = () => {
  let x = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0) + stick.x;
  let y = (keys.KeyS || keys.ArrowDown ? 1 : 0) - (keys.KeyW || keys.ArrowUp ? 1 : 0) + stick.y;
  const l = Math.hypot(x, y);
  if (l > 1) { x /= l; y /= l; }
  return [x, y];
};

export const consumeJump = () => { const j = jump; jump = 0; return j; };
export const consumeAttack = () => { const a = attack; attack = 0; return a; };
export const consumeDodge = () => { const d = dodge; dodge = 0; return d; };
export const consumeInteract = () => { const i = interact; interact = 0; return i; };
