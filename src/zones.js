// zones.js — the 7 campaign chapters (angular wedges around the house hill),
// gray→color bloom state, and editor-authored height deltas.
import { applyDeltas } from './terrain.js';

const TAU = Math.PI * 2;

// region i covers wedge [i/7, (i+1)/7) of the circle; 7 = house circle (r<10)
// (region membership is computed in-shader from world pos — no JS lookup needed)
export const regionHue = (i) => (i + .5) / 7;
export const regionCenter = (i) => {
  const a = ((i + .5) / 7 - .5) * TAU;
  return [Math.sin(a) * 24, Math.cos(a) * 24];
};

// bloom: 0 = drained grey, 1 = fully painted. index 7 = house circle.
// bloomTarget is the AUTHORITATIVE game state; bloom is the visual lerp toward it.
// Logic (saves, abilities, boss trigger, spawn gates) must read bloomTarget —
// reading bloom during the ~0.8s lerp caused save desync + double-boss bugs.
export const bloom = new Float32Array(8);
export const bloomTarget = new Float32Array(8);
export const setBloom = (i, v) => bloomTarget[i] = v;
export const tickBloom = (dt) => {
  for (let i = 0; i < 8; i++) bloom[i] += (bloomTarget[i] - bloom[i]) * Math.min(1, dt * .9);
};

// editor-authored height deltas vs the procedural baseline.
// Written by tools/export-zone.mjs — do not hand-edit between the markers.
const DELTA_B64 = /*DELTA*/''/*END*/;

export const applyZones = () => {
  if (!DELTA_B64) return;
  const s = atob(DELTA_B64), b = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i);
  applyDeltas(b);
};
