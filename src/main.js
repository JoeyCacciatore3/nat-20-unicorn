// NAT 20 UNICORN — js13k 2026 · Phase 1: engine slice
// WebGL2 heightfield world, third-person camera, sphere-vs-terrain player,
// primitive unicorn with gallop + rainbow contrail. Locked 60fps sim.
import { mul, perspective, lookAt, compose, makeProgram } from './core.js';
import { buildTerrain, buildTable, surfaceHeight, surfaceNormal } from './terrain.js';
import { buildCube, buildCone, PARTS, animPart } from './unicorn.js';
import * as PARTICLES from './particles.js';
import { initInput, cam, moveInput, consumeJump } from './input.js';

const c = document.getElementById('c');
const gl = c.getContext('webgl2', { antialias: true });

const DPR = Math.min(devicePixelRatio || 1, 1.75);
const resize = () => { c.width = innerWidth * DPR; c.height = innerHeight * DPR; };
addEventListener('resize', resize); resize();

// ---------- shaders ----------
const MESH_VS = `#version 300 es
layout(location=0) in vec3 aP; layout(location=1) in vec3 aN; layout(location=2) in vec3 aC;
uniform mat4 uVP, uM; uniform vec3 uTint;
out vec3 vC; out vec3 vW;
void main(){
  vec4 w = uM * vec4(aP, 1.);
  vW = w.xyz;
  vec3 n = normalize(mat3(uM) * aN);
  float l = max(dot(n, normalize(vec3(.5, .8, .35))), 0.) * .75 + .38;
  vC = aC * uTint * l;
  gl_Position = uVP * w;
}`;
const MESH_FS = `#version 300 es
precision mediump float;
in vec3 vC; in vec3 vW;
uniform vec3 uEye; uniform float uGrid;
out vec4 o;
void main(){
  vec3 col = vC;
  if (uGrid > 0.) { // faint graph paper on the grey world
    vec2 g = abs(fract(vW.xz / 4.) - .5);
    col *= 1. - smoothstep(.44, .5, max(g.x, g.y)) * .12;
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
in vec2 v; uniform float uAsp; out vec4 o;
void main(){
  vec3 col = mix(vec3(.10, .085, .08), vec3(.045, .04, .07), v.y); // warm table glow -> dark room
  vec2 q = (v - vec2(.5, -.12)) * vec2(uAsp, 1.);
  float r = length(q);
  if (r > .55 && r < .8) { // faint rainbow teaser over the horizon
    float h = (r - .55) / .25;
    vec3 hb = clamp(vec3(abs(h * 6. - 3.) - 1., 2. - abs(h * 6. - 2.), 2. - abs(h * 6. - 4.)), 0., 1.);
    col += hb * .05 * smoothstep(.55, .6, r) * smoothstep(.8, .75, r);
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
      uEye = U(meshP, 'uEye'), uGrid = U(meshP, 'uGrid');
const uAsp = U(skyP, 'uAsp');
const uVPp = U(ptP, 'uVP');

// ---------- geometry ----------
const terrain = buildTerrain(gl);
const table = buildTable(gl);
const cube = buildCube(gl);
const cone = buildCone(gl);
const IDENT = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);

// dynamic particle buffer
const ptVao = gl.createVertexArray();
const ptBuf = gl.createBuffer();
gl.bindVertexArray(ptVao);
gl.bindBuffer(gl.ARRAY_BUFFER, ptBuf);
gl.bufferData(gl.ARRAY_BUFFER, 320 * 7 * 4, gl.DYNAMIC_DRAW);
gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 28, 0);
gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 28, 12);
gl.bindVertexArray(null);

// ---------- player ----------
initInput(c);
const pl = { x: 2, y: 0, z: 9, vx: 0, vy: 0, vz: 0, yaw: 0, ground: true, gallop: 0 };
let time = 0, hueT = 0, sparkleT = 0;

const step = (dt) => {
  time += dt;
  const [ix, iy] = moveInput();
  // camera-relative wish direction
  const fx = -Math.sin(cam.yaw), fz = -Math.cos(cam.yaw);
  const wx = fx * -iy + -fz * ix, wz = fz * -iy + fx * ix;
  pl.vx += wx * 40 * dt; pl.vz += wz * 40 * dt;
  const fr = 1 / (1 + dt * 6);
  pl.vx *= fr; pl.vz *= fr;

  // jump + gravity + sphere-on-heightfield
  if (consumeJump() && pl.ground) { pl.vy = 7.6; pl.ground = false; }
  pl.vy -= 21 * dt;
  pl.x += pl.vx * dt; pl.z += pl.vz * dt; pl.y += pl.vy * dt;
  const sh = surfaceHeight(pl.x, pl.z);
  if (pl.y <= sh) {
    pl.y = sh; pl.vy = 0; pl.ground = true;
    const n = surfaceNormal(pl.x, pl.z);
    if (n[1] < .62) { pl.vx += n[0] * 26 * dt; pl.vz += n[2] * 26 * dt; } // steep -> slide
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
  PARTICLES.update(dt);
};

// ---------- render ----------
const draw = (geo, model, r, g, b, grid) => {
  gl.uniformMatrix4fv(uM, false, model);
  gl.uniform3f(uTint, r, g, b);
  gl.uniform1f(uGrid, grid || 0);
  gl.bindVertexArray(geo.vao);
  gl.drawElements(gl.TRIANGLES, geo.n, gl.UNSIGNED_SHORT, 0);
};

const render = () => {
  gl.viewport(0, 0, c.width, c.height);
  const asp = c.width / c.height;

  // camera (kept above terrain)
  const cp = Math.cos(cam.pitch), dist = 7.5;
  const ex = pl.x + Math.sin(cam.yaw) * cp * dist,
        ez = pl.z + Math.cos(cam.yaw) * cp * dist;
  const ey = Math.max(pl.y + Math.sin(cam.pitch) * dist, surfaceHeight(ex, ez) + .6);
  const vp = mul(perspective(.95, asp, .1, 320), lookAt(ex, ey, ez, pl.x, pl.y + 1.4, pl.z));

  gl.disable(gl.DEPTH_TEST);
  gl.useProgram(skyP);
  gl.uniform1f(uAsp, asp);
  gl.bindVertexArray(null);
  gl.drawArrays(gl.TRIANGLES, 0, 3);

  gl.enable(gl.DEPTH_TEST);
  gl.clear(gl.DEPTH_BUFFER_BIT);
  gl.useProgram(meshP);
  gl.uniformMatrix4fv(uVP, false, vp);
  gl.uniform3f(uEye, ex, ey, ez);
  draw(table, IDENT, 1, 1, 1, 0);
  draw(terrain, IDENT, 1, 1, 1, 1);

  // unicorn: unicorn-space × part-space (pivot-aware)
  const run = Math.min(Math.hypot(pl.vx, pl.vz) / 7, 1);
  const uni = compose(pl.x, pl.y, pl.z, 0, pl.yaw, 0, 0, 0, .55, .55, .55);
  for (const P of PARTS) {
    const [arx, ary, ay] = animPart(P[14], time, pl.gallop, run);
    const partM = compose(P[1], P[2] + ay, P[3], P[4] + arx, ary, P[5], P[6], P[7], P[8], P[9], P[10]);
    draw(P[0] ? cone : cube, mul(uni, partM), P[11], P[12], P[13], 0);
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

// locked 60fps sim, render every frame
let acc = 0, last = performance.now();
const frame = (now) => {
  requestAnimationFrame(frame);
  acc += Math.min(now - last, 100); last = now;
  while (acc >= 16.666) { step(1 / 60); acc -= 16.666; }
  render();
};
requestAnimationFrame(frame);
