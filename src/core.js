// core.js — minimal mat4 + WebGL helpers

export const mul = (a, b) => {
  const o = new Float32Array(16);
  for (let c = 0; c < 16; c += 4) for (let r = 0; r < 4; r++)
    o[c + r] = a[r] * b[c] + a[4 + r] * b[c + 1] + a[8 + r] * b[c + 2] + a[12 + r] * b[c + 3];
  return o;
};

export const perspective = (fov, asp, n, f) => {
  const t = 1 / Math.tan(fov / 2), d = 1 / (n - f);
  return new Float32Array([t / asp, 0, 0, 0, 0, t, 0, 0, 0, 0, (n + f) * d, -1, 0, 0, 2 * n * f * d, 0]);
};

export const lookAt = (ex, ey, ez, tx, ty, tz) => {
  let zx = ex - tx, zy = ey - ty, zz = ez - tz;
  const zl = Math.hypot(zx, zy, zz) || 1; zx /= zl; zy /= zl; zz /= zl;
  let xx = zz, xz = -zx;
  const xl = Math.hypot(xx, xz) || 1; xx /= xl; xz /= xl;
  const yx = zy * xz, yy = zz * xx - zx * xz, yz = -zy * xx;
  return new Float32Array([
    xx, yx, zx, 0,
    0, yy, zy, 0,
    xz, yz, zz, 0,
    -(xx * ex + xz * ez), -(yx * ex + yy * ey + yz * ez), -(zx * ex + zy * ey + zz * ez), 1,
  ]);
};

// T(pos) · Ry(ry) · Rx(rx) · T(pivot offset) · S — pivot-aware transform in one shot
export const compose = (px, py, pz, rx, ry, ox, oy, oz, sa, sb, sc) => {
  const cx = Math.cos(rx), sx = Math.sin(rx), cy = Math.cos(ry), sy = Math.sin(ry);
  const a0 = cy, a1 = 0, a2 = -sy,
        b0 = sy * sx, b1 = cx, b2 = cy * sx,
        c0 = sy * cx, c1 = -sx, c2 = cy * cx;
  return new Float32Array([
    a0 * sa, a1 * sa, a2 * sa, 0,
    b0 * sb, b1 * sb, b2 * sb, 0,
    c0 * sc, c1 * sc, c2 * sc, 0,
    px + a0 * ox + b0 * oy + c0 * oz,
    py + a1 * ox + b1 * oy + c1 * oz,
    pz + a2 * ox + b2 * oy + c2 * oz, 1,
  ]);
};

export const makeProgram = (gl, vs, fs) => {
  const sh = (t, src) => {
    const s = gl.createShader(t);
    gl.shaderSource(s, src); gl.compileShader(s);
    // dev-only diagnostics — terser drop_console strips this from the shipped zip
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(s));
    return s;
  };
  const p = gl.createProgram();
  gl.attachShader(p, sh(gl.VERTEX_SHADER, vs));
  gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) console.error(gl.getProgramInfoLog(p));
  return p;
};

// interleaved VAO: pos(3) normal(3) [color(3)] + element index
export const makeVao = (gl, verts, idx, hasColor) => {
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);
  const stride = hasColor ? 36 : 24;
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, stride, 0);
  gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, stride, 12);
  if (hasColor) { gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 3, gl.FLOAT, false, stride, 24); }
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
  gl.bindVertexArray(null);
  return { vao, n: idx.length };
};
