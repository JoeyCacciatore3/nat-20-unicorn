// NAT 20 UNICORN — js13k 2026 · Phase 0 boot slice
// WebGL2, fixed 60fps step, muted pre-color world + faint rainbow teaser.

const c = document.getElementById('c');
const gl = c.getContext('webgl2', { antialias: true });

const VS = `#version 300 es
layout(location=0) in vec2 p;out vec2 v;void main(){v=p;gl_Position=vec4(p,0,1);}`;

const FS = `#version 300 es
precision highp float;in vec2 v;out vec4 o;uniform float t;uniform float a;
void main(){
  float y=v.y*.5+.5;
  // dim game-room gradient — the pre-color world
  vec3 sky=mix(vec3(.11,.10,.14),vec3(.32,.28,.40),y);
  // faint rainbow arc teaser, breathing slowly
  vec2 q=vec2(v.x*a,v.y+.65);
  float r=length(q*vec2(1.,1.55));
  float band=smoothstep(.05,.0,abs(r-.9-.02*sin(t*.6)));
  vec3 rb=.5+.5*cos(6.28318*(r*2.5+vec3(0.,.33,.67)));
  // wooden table plane at the bottom
  float table=smoothstep(.28,.27,y);
  vec3 wood=vec3(.24,.16,.10)*(0.8+0.2*sin(v.x*40.));
  o=vec4(mix(sky+band*rb*.30,wood,table),1);
}`;

function sh(ty, src) {
  const s = gl.createShader(ty);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  return s;
}
const pr = gl.createProgram();
gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS));
gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS));
gl.linkProgram(pr);
gl.useProgram(pr);

gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
gl.enableVertexAttribArray(0);
gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

const tU = gl.getUniformLocation(pr, 't');
const aU = gl.getUniformLocation(pr, 'a');

// fixed 60fps update, render on RAF (13th Floor doctrine: never run 2x on 120Hz)
const DT = 1 / 60;
let last = 0, acc = 0, T = 0;

function frame(now) {
  requestAnimationFrame(frame);
  now /= 1000;
  acc += Math.min(now - last, 0.1);
  last = now;
  while (acc >= DT) { T += DT; acc -= DT; /* update(T) hooks land here */ }

  const w = innerWidth * devicePixelRatio | 0, h = innerHeight * devicePixelRatio | 0;
  if (c.width !== w || c.height !== h) { c.width = w; c.height = h; gl.viewport(0, 0, w, h); }
  gl.uniform1f(tU, T);
  gl.uniform1f(aU, h / w); // aspect correction for the arc
  gl.drawArrays(gl.TRIANGLES, 0, 3);
}
requestAnimationFrame(frame);
