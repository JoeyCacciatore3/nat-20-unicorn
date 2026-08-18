// NAT 20 UNICORN — js13k 2026 · Phase 3: core gameplay
// Combat (horn + dodge, hit-stop/shake/flash), gloomlings + drops, gathering,
// Session Zero creation, DM barks. Locked 60fps sim.
import { mul, perspective, lookAt, compose, makeProgram } from './core.js';
import * as PARTICLES from './particles.js';
import { buildCube, buildCone, PARTS, animPart } from './unicorn.js';
import { buildProps } from './props.js';
import { buildTerrain, buildTable, surfaceHeight, surfaceNormal, TABLE } from './terrain.js';
import { applyZones, regionHue, regionCenter, bloom, setBloom, tickBloom } from './zones.js';
import { audioInit, sfx, SND } from './audio.js';
import { inv, items as ITEMS, initItems, addItem, update as itemUpdate } from './items.js';
import { foes, bolts, tickSpawns, update as foeUpdate, nudgeAggro, setDiff, KINDS, bossAt } from './enemies.js';
import { S, stats, NAMES, lvl, mod, d20, gain, setOnLevel, maxHearts } from './stats.js';
import { ct, abil, freeShard, achTick, achList, setCond, save, load, hasSave } from './progress.js';
import * as DM from './dm.js';
import * as HUD from './hud.js';
import { initInput, cam, moveInput, consumeJump, consumeAttack, consumeDodge, consumeInteract, keys } from './input.js';

const c = document.getElementById('cv');
const gl = c.getContext('webgl2', { antialias: true });

const DPR = Math.min(devicePixelRatio || 1, 1.75);
const resize = () => { c.width = innerWidth * DPR; c.height = innerHeight * DPR; };
addEventListener('resize', resize); resize();

// ---------- shaders ----------
// shared GLSL: piecewise rainbow (hue 0..1 -> rgb)
const HUE = `vec3 hue(float h){return clamp(vec3(abs(h*6.-3.)-1.,2.-abs(h*6.-2.),2.-abs(h*6.-4.)),0.,1.);}`;
const MESH_VS = `#version 300 es
layout(location=0) in vec3 aP; layout(location=1) in vec3 aN; layout(location=2) in vec3 aC;
uniform mat4 uVP, uM; uniform vec3 uTint;
uniform float uGrid; uniform float uEmis; uniform float uB[8];
out vec3 vC; out vec3 vW; out float vB;
${HUE}
void main(){
  vec4 w = uM * vec4(aP, 1.);
  vW = w.xyz;
  vec3 n = normalize(mat3(uM) * aN);
  float l = max(dot(n, normalize(vec3(.5, .8, .35))), 0.) * .75 + .38;
  l = mix(l, 1.25, uEmis);
  vec3 base = aC;
  vB = 0.;
  if (uGrid > 0.) { // terrain: gray -> chapter color as its region blooms
    float r = length(w.xz);
    int i = r < 10. ? 7 : clamp(int((atan(w.x, w.z) / 6.28318 + .5) * 7.), 0, 6);
    vB = uB[i];
    vec3 hc = hue((float(i) + .5) / 7.);
    if (i == 7) hc = vec3(1., .85, .55); // house circle warms gold
    vec3 painted = (hc * .72 + .28) * (aC.g * 1.5 + .2);
    base = mix(aC, painted, vB);
  }
  vC = base * uTint * l;
  gl_Position = uVP * w;
}`;
const MESH_FS = `#version 300 es
precision highp float;
in vec3 vC; in vec3 vW; in float vB;
uniform vec3 uEye; uniform float uGrid;
out vec4 o;
void main(){
  vec3 col = vC;
  if (uGrid > 0.) { // graph paper fades as the diorama gets painted
    vec2 g = abs(fract(vW.xz / 4.) - .5);
    col *= 1. - smoothstep(.44, .5, max(g.x, g.y)) * .12 * (1. - vB * .85);
  }
  float d = length(vW - uEye);
  col = mix(col, vec3(.075, .07, .09), smoothstep(38., 135., d));
  o = vec4(col, 1.);
}`;
const SKY_VS = `#version 300 es
out vec2 v;
void main(){
  vec2 p = vec2(float(gl_VertexID << 1 & 2), float(gl_VertexID & 2));
  v = p; gl_Position = vec4(p * 2. - 1., 0., 1.);
}`;
const SKY_FS = `#version 300 es
precision mediump float;
in vec2 v; uniform float uAsp; uniform float uRb; out vec4 o;
${HUE}
void main(){
  // the room warms as the campaign comes back
  vec3 col = mix(mix(vec3(.10, .085, .08), vec3(.16, .12, .09), uRb),
                 mix(vec3(.045, .04, .07), vec3(.09, .06, .10), uRb), v.y);
  vec2 q = (v - vec2(.5, -.12)) * vec2(uAsp, 1.);
  float r = length(q);
  if (r > .55 && r < .8) { // rainbow: withheld teaser -> full arc at restoration
    col += hue((r - .55) / .25) * (.05 + uRb * .4) * smoothstep(.55, .6, r) * smoothstep(.8, .75, r);
  }
  col *= 1.05 - .4 * length(v - vec2(.5));
  o = vec4(col, 1.);
}`;
const PT_VS = `#version 300 es
layout(location=0) in vec3 aP; layout(location=1) in vec4 aC;
uniform mat4 uVP;
out vec4 vC;
void main(){
  gl_Position = uVP * vec4(aP, 1.);
  gl_PointSize = aC.w * 260. / max(gl_Position.w, 1.);
  vC = aC;
}`;
const PT_FS = `#version 300 es
precision mediump float;
in vec4 vC; out vec4 o;
void main(){
  float a = smoothstep(1., .35, length(gl_PointCoord * 2. - 1.)) * vC.w;
  o = vec4(vC.rgb * a, a);
}`;

const meshP = makeProgram(gl, MESH_VS, MESH_FS);
const skyP = makeProgram(gl, SKY_VS, SKY_FS);
const ptP = makeProgram(gl, PT_VS, PT_FS);
const U = (p, n) => gl.getUniformLocation(p, n);
const uVP = U(meshP, 'uVP'), uM = U(meshP, 'uM'), uTint = U(meshP, 'uTint'),
      uEye = U(meshP, 'uEye'), uGrid = U(meshP, 'uGrid'),
      uEmis = U(meshP, 'uEmis'), uB = U(meshP, 'uB');
const uAsp = U(skyP, 'uAsp'), uRb = U(skyP, 'uRb');
const uVPp = U(ptP, 'uVP');

// ---------- geometry (zone deltas patch the heightfield BEFORE meshing) ----------
applyZones();
const terrain = buildTerrain(gl);
const table = buildTable(gl);
const cube = buildCube(gl);
const cone = buildCone(gl);
const props = buildProps();
const IDENT = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
initItems();

// highest peak (Summit achievement target)
let peakH = 0;
for (let x = -60; x <= 60; x += 2) for (let z = -60; z <= 60; z += 2)
  peakH = Math.max(peakH, surfaceHeight(x, z));
let summitFlag = 0, dragonFlag = 0;
setCond(6, () => summitFlag);
setCond(11, () => dragonFlag);

// shard beacons: one light pillar per un-restored chapter (environment as HUD)
const beacons = [];
for (let i = 0; i < 7; i++) {
  const [bx, bz] = regionCenter(i);
  beacons.push([i, bx, surfaceHeight(bx, bz), bz]);
}

// dynamic particle buffer
const ptVao = gl.createVertexArray();
const ptBuf = gl.createBuffer();
gl.bindVertexArray(ptVao);
gl.bindBuffer(gl.ARRAY_BUFFER, ptBuf);
gl.bufferData(gl.ARRAY_BUFFER, 320 * 7 * 4, gl.DYNAMIC_DRAW);
gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 28, 0);
gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 28, 12);
gl.bindVertexArray(null);

// ---------- player + game state ----------
initInput(c);
const pl = { x: 2, y: 0, z: 9, vx: 0, vy: 0, vz: 0, yaw: 0, ground: true, gallop: 0 };
let time = 0, hueT = 0, sparkleT = 0;
let hp = 3, atkCd = 0, invulnT = 0, hitStop = 0, shakeT = 0, shakeAmp = 0;
let airJump = 0, achT = 0, prevB = 0, bossUp = 0;
let vpNow = null; // current frame's view-projection for world->screen text
const maxH = () => maxHearts() + (abil(5) ? 1 : 0); // Gloom Ward

const burst = (x, y, z, n, hue, spread) => {
  for (let i = 0; i < n; i++)
    PARTICLES.spawn(x, y, z,
      (Math.random() - .5) * spread, Math.random() * spread * .8, (Math.random() - .5) * spread,
      .5 + Math.random() * .5, hue == null ? Math.random() : hue);
};

// world -> screen (CSS px) for floating text
const flyAt = (x, y, z, text, color, big) => {
  if (!vpNow) return;
  const m = vpNow;
  const cx = m[0] * x + m[4] * y + m[8] * z + m[12],
        cy = m[1] * x + m[5] * y + m[9] * z + m[13],
        cw = m[3] * x + m[7] * y + m[11] * z + m[15];
  if (cw <= 0) return;
  HUD.fly((cx / cw * .5 + .5) * innerWidth, (.5 - cy / cw * .5) * innerHeight, text, color, big);
};

const juice = (stop, shake) => { hitStop = Math.max(hitStop, stop); shakeT = .1; shakeAmp = shake; };

const uniLv = () => 1 + lvl.reduce((a, b) => a + b, 0);
setOnLevel((s) => {
  sfx(SND.level, 1);
  HUD.setLv(uniLv());
  HUD.toast('⬆️ <b>' + NAMES[s] + ' ' + stats[s] + '</b>');
  flyAt(pl.x, pl.y + 2.6, pl.z, NAMES[s] + ' UP!', '#ffd75e', 1);
  burst(pl.x, pl.y + 1.5, pl.z, 24, null, 5);
  juice(.15, 3);
  if (s === S.CON) hp = Math.min(hp + 1, maxH());
  HUD.setHearts(hp, maxH());
});

const hurt = (n) => {
  if (invulnT > 0) return;
  hp -= n; invulnT = 1;
  sfx(hp <= 0 ? SND.death : SND.hurt, 1);
  HUD.hurtFlash(); juice(.09, 8);
  navigator.vibrate && navigator.vibrate(80);
  nudgeAggro(-.4);               // rubber-band mercy
  gain(S.CON, 6);
  if (hp <= 0) {
    DM.say(DM.P.dead);
    invulnT = 3;
    HUD.deathFade(() => {
      hp = maxH();
      pl.x = 2; pl.z = 9; pl.y = surfaceHeight(2, 9) + .5;
      pl.vx = pl.vy = pl.vz = 0;
      HUD.setHearts(hp, maxH());
    });
  } else DM.say(DM.P.hurt);
  HUD.setHearts(hp, maxH());
};


let firstKill = 0;
const kill = (f) => {
  foes.splice(foes.indexOf(f), 1);
  ct[0]++;
  if (f.k === 5) { // the finale bows out — a real victory beat
    dragonFlag = 1;
    for (let i = 0; i < 9; i++) addItem(1, f.x + Math.random() * 5 - 2.5, f.z + Math.random() * 5 - 2.5);
    burst(f.x, f.y + 2, f.z, 60, null, 12);
    juice(.25, 12);
    DM.line("It folds back into doubt. ...Good roll, little horse.");
  }
  const hue = regionHue(f.r);
  burst(f.x, f.y + 1, f.z, 22, hue, 6);
  let n = 1;
  if (Math.random() < (stats[S.CHA] - 8) * .04) { n = 2; gain(S.CHA, 8); flyAt(f.x, f.y + 2.4, f.z, 'LUCKY +2', '#7df', 0); }
  if (f.el) n++;
  for (let i = 0; i < n; i++) addItem(1, f.x + Math.random() * 2 - 1, f.z + Math.random() * 2 - 1);
  nudgeAggro(.1);
  if (!firstKill) { firstKill = 1; DM.say(DM.P.kill); }
  else if (Math.random() < .25) DM.say(DM.P.kill);
};

const step = (dt) => {
  time += dt;
  shakeT -= dt; // fixed-step so shake length is display-rate independent
  const playing = HUD.playing; // deathFade drops this gate while the fade holds
  const [ix, iy] = playing ? moveInput() : [0, 0];
  // camera-relative wish direction (DEX scales acceleration)
  const fx = -Math.sin(cam.yaw), fz = -Math.cos(cam.yaw);
  const wx = fx * -iy + -fz * ix, wz = fz * -iy + fx * ix;
  const acc = 40 * mod(S.DEX) * (abil(6) ? 1.25 : 1); // Wind Mane
  pl.vx += wx * acc * dt; pl.vz += wz * acc * dt;
  const fr = 1 / (1 + dt * 6);
  pl.vx *= fr; pl.vz *= fr;

  // dodge — burst + i-frames scaled by DEX
  if (playing && consumeDodge() && atkCd <= 0) {
    const l = Math.hypot(wx, wz);
    const dxn = l ? wx / l : Math.sin(pl.yaw), dzn = l ? wz / l : Math.cos(pl.yaw);
    const dash = abil(2) ? 24 : 14; // Sun Dash
    sfx(SND.dodge);
    pl.vx += dxn * dash; pl.vz += dzn * dash;
    invulnT = Math.max(invulnT, .32 * mod(S.DEX));
    burst(pl.x, pl.y + .6, pl.z, 8, .8, 3);
    let near = 0;
    for (const b of bolts) if (Math.hypot(pl.x - b.x, pl.z - b.z) < 3) near = 1;
    for (const f of foes) if (Math.hypot(pl.x - f.x, pl.z - f.z) < 3) near = 1;
    if (near) { ct[2]++; gain(S.DEX, 7); flyAt(pl.x, pl.y + 2.2, pl.z, 'DODGE', '#8ef', 0); }
  }

  // jump + gravity + sphere-on-heightfield (no floor past the table edge)
  if (playing && consumeJump()) {
    const jv = abil(4) ? 9.2 : 7.6; // Feather Fall
    if (pl.ground) { pl.vy = jv; pl.ground = false; airJump = 0; }
    else if (airJump < lvl.reduce((a, b) => a + b, 0)) { // air jumps = unicorn level - 1
      airJump++; pl.vy = jv * .9;
      sfx(SND.jump2);
      burst(pl.x, pl.y + .3, pl.z, 10, hueT % 1, 4);
    }
  }
  pl.vy -= 21 * dt;
  pl.x += pl.vx * dt; pl.z += pl.vz * dt; pl.y += pl.vy * dt;
  const onTable = Math.max(Math.abs(pl.x), Math.abs(pl.z)) <= TABLE;
  const sh = surfaceHeight(pl.x, pl.z);
  if (onTable && pl.y <= sh) {
    pl.y = sh; pl.vy = 0; pl.ground = true; airJump = 0;
    const fr = Math.hypot(pl.x, pl.z);
    if (Math.abs(fr - 9) < .45 && Math.abs(Math.atan2(pl.x, pl.z)) > .34) {
      const rTo = fr < 9 ? 8.5 : 9.5; // the paddock fence is solid — use the gate, or jump it
      pl.x *= rTo / fr; pl.z *= rTo / fr;
    }
    const n = surfaceNormal(pl.x, pl.z);
    if (n[1] < .62 && !abil(1)) { pl.vx += n[0] * 26 * dt; pl.vz += n[2] * 26 * dt; } // steep -> slide (Sure Hooves negates)
  } else if (!onTable) {
    pl.ground = false;
    if (pl.y < -18) { // fell off the table — the DM puts the mini back
      pl.x = 2; pl.z = 9; pl.y = surfaceHeight(2, 9) + .5;
      pl.vx = pl.vy = pl.vz = 0;
      DM.say(DM.P.fall);
    }
  }

  // facing + gallop phase
  const speed = Math.hypot(pl.vx, pl.vz);
  if (speed > .6) {
    const target = Math.atan2(pl.vx, pl.vz);
    let d = target - pl.yaw;
    d -= Math.round(d / (Math.PI * 2)) * Math.PI * 2;
    pl.yaw += d * Math.min(1, dt * 12);
  }
  pl.gallop += dt * (2.5 + speed * 1.7);

  // ---- combat: horn attack (visible d20; STR scales damage) ----
  atkCd -= dt; invulnT -= dt;
  if (playing && consumeAttack() && atkCd <= 0) {
    atkCd = .45;
    sfx(SND.swing);
    pl.vx += Math.sin(pl.yaw) * 5; pl.vz += Math.cos(pl.yaw) * 5;   // lunge
    const hx = pl.x + Math.sin(pl.yaw) * 1.7, hz = pl.z + Math.cos(pl.yaw) * 1.7;
    burst(hx, pl.y + 1.4, hz, 6, hueT % 1, 4);
    for (const f of [...foes]) {
      if (Math.hypot(f.x - hx, f.z - hz) > 2.1) continue;
      const roll = d20();
      if (roll === 1) { sfx(SND.fumble, 1); DM.say(DM.P.fumble); flyAt(f.x, f.y + 2.2, f.z, '1 ...', '#999', 1); continue; }
      const crit = roll === 20;
      sfx(crit ? SND.crit : SND.thud, 1);
      if (crit) ct[1]++;
      const dmg = Math.round((crit ? 2 : 1) * mod(S.STR) * (abil(0) ? 1.5 : 1) * 10) / 10; // Ember Horn
      f.hp -= dmg; f.flash = .1;
      const kb = 7 * mod(S.STR) * (crit ? 1.6 : 1);
      const dx = f.x - pl.x, dz = f.z - pl.z, dd = Math.hypot(dx, dz) || 1;
      f.x += dx / dd * kb * .16; f.z += dz / dd * kb * .16;
      juice(crit ? .12 : .06, crit ? 9 : 3);
      flyAt(f.x, f.y + 2.2, f.z, crit ? 'NAT 20!' : '' + roll, crit ? '#ffd75e' : '#fff', crit);
      if (crit) { DM.say(DM.P.crit); burst(f.x, f.y + 1.5, f.z, 26, null, 7); }
      gain(S.STR, 3);
      if (f.hp <= 0) kill(f);
    }
  }

  if (playing) {
    // enemies + bolts
    setDiff(ct[7]); // pack size, roster width, hp scale, elite odds — all from shards freed
    if (ct[7] === 6 && !bossUp) { // the finale: the Gloom Dragon guards the last chapter
      bossUp = 1;
      for (let i = 0; i < 7; i++) if (bloom[i] < .5) bossAt(i);
      DM.line("...that one's new. I don't remember writing that one.");
    }
    tickSpawns(dt, pl);
    foeUpdate(pl, dt, {
      touch: () => hurt(1),
      boltHit: (b) => { hurt(1); burst(b.x, b.y, b.z, 8, .78, 3); },
    });

    // gathering (WIS magnet; Bloom Step widens it)
    itemUpdate(pl, dt, 3 + (stats[S.WIS] - 10) * .25 + (abil(3) ? 2.5 : 0), (it) => {
      sfx(it.k ? SND.gem : SND.pickup);
      ct[3]++;
      gain(it.k ? S.INT : S.WIS, 2);
      burst(it.x, it.y + .5, it.z, 6, it.k ? .55 : .12, 2);
      HUD.setRes(inv);
    });

    // ---- interactions: shards, camp ----
    let pr = '';

    // free a shard: reach its beacon with no gloom nearby
    for (const [i, bx, by, bz] of beacons) {
      if (bloom[i] > .5 || Math.hypot(pl.x - bx, pl.z - bz) > 3) continue;
      let clear = 1;
      for (const f of foes) if (Math.hypot(f.x - bx, f.z - bz) < 9) clear = 0;
      pr = clear ? 'E — Free shard' : 'Clear the gloom first';
      if (clear && consumeInteract()) {
        sfx(SND.shard, 1);
        freeShard(i);
        HUD.setObj(objLine());
        burst(bx, by + 2, bz, 30, regionHue(i), 8);
        juice(.15, 5);
        HUD.setHearts(hp, maxH());
      }
    }

    // the campfire: rest at the paddock's heart — heal, save, count the night
    if (!pr && Math.hypot(pl.x, pl.z) < 2.6) {
      pr = '🛏 E — rest at camp';
      if (consumeInteract()) {
        sfx(SND.sleep, 1);
        hp = maxH(); HUD.setHearts(hp, maxH());
        ct[5]++;
        burst(0, pl.y + 2, 0, 16, .1, 3);
        DM.say(DM.P.sleep);
        save();
      }
    }
    HUD.setPrompt(pr);

  }

  // rainbow contrail while moving
  hueT += dt * .55;
  if (speed > 2.5 && pl.ground) {
    const bx = pl.x - Math.sin(pl.yaw) * .9, bz = pl.z - Math.cos(pl.yaw) * .9;
    for (let i = 0; i < 2; i++)
      PARTICLES.spawn(
        bx + (Math.random() - .5) * .4, pl.y + 1 + (Math.random() - .5) * .3, bz + (Math.random() - .5) * .4,
        -pl.vx * .15 + (Math.random() - .5), .4 + Math.random() * .8, -pl.vz * .15 + (Math.random() - .5),
        .8 + Math.random() * .3, hueT + i * .04);
  }
  // horn sparkle
  sparkleT -= dt;
  if (sparkleT <= 0) {
    sparkleT = .1;
    PARTICLES.spawn(
      pl.x + Math.sin(pl.yaw) * 1.0, pl.y + 2.25, pl.z + Math.cos(pl.yaw) * 1.0,
      (Math.random() - .5) * 1.2, .6 + Math.random(), (Math.random() - .5) * 1.2,
      .5, Math.random());
  }
  // achievements + summit + badge grid toggle
  if ((achT -= dt) <= 0) { achT = .5; achTick(); }
  if (pl.ground && pl.y >= peakH - .3) summitFlag = 1;
  if (keys.KeyB && !prevB) HUD.badges(achList());
  prevB = keys.KeyB;

  // house circle warms as chapters are restored
  let sum = 0; for (let i = 0; i < 7; i++) sum += bloom[i];
  setBloom(7, sum / 7);
  tickBloom(dt);

  HUD.tick(dt);
  PARTICLES.update(dt);
};

// ---------- render ----------
const draw = (geo, model, r, g, b, grid, emis) => {
  gl.uniformMatrix4fv(uM, false, model);
  gl.uniform3f(uTint, r, g, b);
  gl.uniform1f(uGrid, grid || 0);
  gl.uniform1f(uEmis, emis || 0);
  gl.bindVertexArray(geo.vao);
  gl.drawElements(gl.TRIANGLES, geo.n, gl.UNSIGNED_SHORT, 0);
};

const hue2 = (h) => [
  Math.min(Math.max(Math.abs(h * 6 - 3) - 1, 0), 1),
  Math.min(Math.max(2 - Math.abs(h * 6 - 2), 0), 1),
  Math.min(Math.max(2 - Math.abs(h * 6 - 4), 0), 1),
];

const render = () => {
  gl.viewport(0, 0, c.width, c.height);
  const asp = c.width / c.height;

  // camera (kept above terrain) + shake
  if (!HUD.playing) cam.yaw += .0012; // slow pre-game orbit
  const shk = shakeT > 0 ? shakeAmp * shakeT * 10 : 0;
  const jx = (Math.random() - .5) * shk * .06, jy = (Math.random() - .5) * shk * .06;
  const cp = Math.cos(cam.pitch), dist = 7.5;
  const ex = pl.x + Math.sin(cam.yaw) * cp * dist + jx,
        ez = pl.z + Math.cos(cam.yaw) * cp * dist;
  const ey = Math.max(pl.y + Math.sin(cam.pitch) * dist, surfaceHeight(ex, ez) + .6) + jy;
  const vp = mul(perspective(.95, asp, .1, 320), lookAt(ex, ey, ez, pl.x, pl.y + 1.4, pl.z));
  vpNow = vp;

  gl.disable(gl.DEPTH_TEST);
  gl.useProgram(skyP);
  gl.uniform1f(uAsp, asp);
  let rb = 0; for (let i = 0; i < 7; i++) rb += bloom[i];
  gl.uniform1f(uRb, rb / 7);
  gl.bindVertexArray(null);
  gl.drawArrays(gl.TRIANGLES, 0, 3);

  gl.enable(gl.DEPTH_TEST);
  gl.clear(gl.DEPTH_BUFFER_BIT);
  gl.useProgram(meshP);
  gl.uniformMatrix4fv(uVP, false, vp);
  gl.uniform3f(uEye, ex, ey, ez);
  gl.uniform1fv(uB, bloom);
  draw(table, IDENT, 1, 1, 1, 0);
  draw(terrain, IDENT, 1, 1, 1, 1);

  // props (house + tabletop clutter)
  for (const p of props) draw(p.prim ? cone : cube, p.m, p.c[0], p.c[1], p.c[2], 0, p.emis);

  // gatherables: flowers = tiny cone + stem, sparkles = spinning cone
  for (const it of ITEMS) {
    const bob = Math.sin(it.t * 3) * .12;
    if (it.k) draw(cone, compose(it.x, it.y + .55 + bob, it.z, 0, it.t * 2, 0, 0, 0, .3, .55, .3), .6, .85, 1, 0, .8);
    else {
      draw(cube, compose(it.x, it.y + .25, it.z, 0, 0, 0, 0, 0, .07, .5, .07), .2, .5, .2, 0);
      draw(cone, compose(it.x, it.y + .6 + bob * .4, it.z, Math.PI, it.t, 0, 0, 0, .28, .22, .28), 1, .75, .85, 0, .4);
    }
  }

  // gloomlings — wobbling dark minis, sized/horned from their KINDS row; elites glow violet
  for (const f of foes) {
    const T = KINDS[f.k], sc = T[5] * (f.el ? 1.3 : 1);
    const wob = Math.sin(f.t * 5) * .12;
    const fl = f.flash > 0 ? 1 : 0;
    const cr = fl ? 1 : .16, cg = fl ? 1 : .13, cb = fl ? 1 : (f.el ? .40 : .22);
    if (f.k === 2) { // turret: heavy cone
      draw(cone, compose(f.x, f.y + .9, f.z, 0, f.t * .7, wob * .5, 0, 0, sc, 1.8, sc), cr, cg, cb + .06, 0, fl);
    } else {
      draw(cube, compose(f.x, f.y + .75 * sc, f.z, 0, f.yaw, wob, 0, 0, sc, sc * 1.06, sc), cr, cg, cb, 0, fl);
      if (T[3]) // ranged (and the dragon): gloom horn
        draw(cone, compose(f.x, f.y + 1.6 * sc, f.z, 0, f.yaw, wob, 0, 0, .35 * sc, .7 * sc, .35 * sc), .45, .2, .6, 0, fl);
    }
    // mini base — sells the tabletop fiction
    draw(cube, compose(f.x, f.y + .06, f.z, 0, 0, 0, 0, 0, sc + .2, .12, sc + .2), .1, .09, .12, 0);
  }

  // gloom bolts
  for (const b of bolts)
    draw(cube, compose(b.x, b.y, b.z, b.life * 7, b.life * 9, 0, 0, 0, .3, .3, .3), .55, .25, .75, 0, 1);

  // shard beacons — fade out as their chapter is restored, gentle pulse
  for (const [i, bx, by, bz] of beacons) {
    const s = 1 - bloom[i];
    if (s < .02) continue;
    const [r, g, b] = hue2(regionHue(i));
    const pulse = 1 + Math.sin(time * 2 + i) * .08;
    draw(cone, compose(bx, by, bz, 0, 0, 0, 0, 0, 1.1 * pulse * s, 15 * s, 1.1 * pulse * s),
      r * s + .1, g * s + .1, b * s + .1, 0, 1);
  }

  // unicorn: blink while invulnerable
  if (invulnT <= 0 || Math.sin(time * 40) > 0) {
    const run = Math.min(Math.hypot(pl.vx, pl.vz) / 7, 1);
    const uni = compose(pl.x, pl.y, pl.z, 0, pl.yaw, 0, 0, 0, .55, .55, .55);
    for (const P of PARTS) {
      const [arx, ary, ay] = animPart(P[14], time, pl.gallop, run);
      const partM = compose(P[1], P[2] + ay, P[3], P[4] + arx, ary, P[5], P[6], P[7], P[8], P[9], P[10]);
      draw(P[0] ? cone : cube, mul(uni, partM), P[11], P[12], P[13], 0);
    }
  }

  // particles (additive, no depth write)
  const { data, count } = PARTICLES.fill();
  if (count) {
    gl.depthMask(false);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.useProgram(ptP);
    gl.uniformMatrix4fv(uVPp, false, vp);
    gl.bindVertexArray(ptVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, ptBuf);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, data, 0, count * 7);
    gl.drawArrays(gl.POINTS, 0, count);
    gl.disable(gl.BLEND);
    gl.depthMask(true);
  }
};

// generic white for meshes without a color attribute
gl.vertexAttrib3f(2, 1, 1, 1);
gl.clearColor(0, 0, 0, 1);

// ---------- boot: Session Zero (or Continue), then play ----------
// the always-on objective line — direction at a glance, updated as shards fall
const objLine = () => ct[7] >= 7 ? '🌈 The rainbow is whole'
  : ct[7] ? '🌈 ' + (7 - ct[7]) + (ct[7] === 6 ? ' shard left · follow the beams' : ' shards left · follow the beams')
  : '🌈 Free 7 shards — follow a light beam';
const bootHud = (fresh) => {
  audioInit(); // first user gesture — safe to create the AudioContext
  hp = maxH();
  HUD.setHearts(hp, maxH());
  HUD.setRes(inv);
  HUD.setLv(uniLv());
  if (fresh) { // new campaign: controls first, then the DM sets the quest
    HUD.setObj(navigator.maxTouchPoints ? '👆 stick move · ⚔️ attack · ✋ use'
      : '⌨️ WASD · F attack · E use · B badges');
    setTimeout(() => DM.line('The gloom ate our colors. Seven shards hold them.'), 6500);
    setTimeout(() => { DM.line('See the light beams? Start there.'); HUD.setObj(objLine()); }, 13000);
  } else HUD.setObj(objLine()); // returning player: straight to the standing objective
};
HUD.creation(() => bootHud(1), hasSave() ? () => { load(); bootHud(0); } : null);

// locked 60fps sim + hit-stop, render every frame
let acc = 0, last = performance.now();
const frame = (now) => {
  requestAnimationFrame(frame);
  const raw = Math.min(now - last, 100); last = now;
  if (hitStop > 0) { hitStop -= raw / 1000; render(); return; } // freeze sim, keep drawing
  acc += raw;
  while (acc >= 16.666) { step(1 / 60); acc -= 16.666; }
  render();
};
requestAnimationFrame(frame);
