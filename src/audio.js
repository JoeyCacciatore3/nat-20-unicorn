// audio.js — ZzFXMicro v1.3.2 by Frank Force (MIT), adapted: ES module + lazy
// AudioContext (created on first user gesture — no autoplay warning) + named
// sound table with pitch variance and a global rate cap (~11/sec — juice fatigue).
/* eslint-disable */
let zzfxV = .3, zzfxX = null;
export const audioInit = () => { zzfxX = zzfxX || new AudioContext(); };
const zzfx =
(p=1,k=.05,b=220,e=0,r=0,t=.1,q=0,D=1,u=0,y=0,v=0,z=0,l=0,E=0,A=0,F=0,c=0,w=1,m=0,B=0
,N=0)=>{if(!zzfxX)return;let M=Math,d=2*M.PI,R=44100,G=u*=500*d/R/R,C=b*=(1-k+2*k*M.random(k=[]))*d/R,
g=0,H=0,a=0,n=1,I=0,J=0,f=0,h=N<0?-1:1,x=d*h*N*2/R,L=M.cos(x),Z=M.sin,K=Z(x)/4,O=1+K,
X=-2*L/O,Y=(1-K)/O,P=(1+h*L)/2/O,Q=-(h+L)/O,S=P,T=0,U=0,V=0,W=0;e=R*e+9;m*=R;r*=R;t*=
R;c*=R;y*=500*d/R**3;A*=d/R;v*=d/R;z*=R;l=R*l|0;p*=zzfxV;for(h=e+m+r+t+c|0;a<h;k[a++]
=f*p)++J%(100*F|0)||(f=q?1<q?2<q?3<q?4<q?(g/d%1<D/2)*2-1:Z(g**3):M.max(M.min(M.tan(g)
,1),-1):1-(2*g/d%2+2)%2:1-4*M.abs(M.round(g/d)-g/d):Z(g),f=(l?1-B+B*Z(d*a/l):1)*(4<q?
f:(f<0?-1:1)*M.abs(f)**D)*(a<e?a/e:a<e+m?1-(a-e)/m*(1-w):a<e+m+r?w:a<h-c?(h-a-c)/t*w:
0),f=c?f/2+(c>a?0:(a<h-c?1:(h-a)/c)*k[a-c|0]/2/p):f,N?f=W=S*T+Q*(T=U)+P*(U=f)-Y*V-X*(
V=W):0),x=(b+=u+=y)*M.cos(A*H++),g+=x+x*E*Z(a**5),n&&++n>z&&(b+=v,C+=v,n=0),!l||++I%l
||(b=C,u=G,n=n||1);X=zzfxX,p=X.createBuffer(1,h,R);p.getChannelData(0).set(k);b=X.
createBufferSource();b.buffer=p;b.connect(X.destination);b.start()}
/* eslint-enable */

// named sounds — parameter arrays are the whole "asset".
// Dot-accessed (SND.crit) so the prop mangler shortens every name for free.
export const SND = {
  swing:  [.5,.1,150,.02,,.05,,1.3,,,,,,3],
  thud:   [.9,.1,129,.01,,.15,,,,,,,,5],
  crit:   [1.2,,539,0,.04,.29,1,1.92,,,567,.02,.02,,,,.04], // also the build jingle
  fumble: [.6,.1,110,,.05,.2,2,.5,,,-99,.1],
  hurt:   [.8,.1,925,.04,.1,.3,1,.3,,6.27,-184,.09,.17],
  death:  [1.1,,333,.01,0,.9,4,1.9,,,,,,.5,,.6],
  pickup: [.6,,1675,,.06,.24,1,1.82,,,837,.06],
  level:  [1,,1046,,.08,.3,1,1.5,,,262,.06,.05],
  shard:  [1.2,,523,.04,.2,.5,1,1.5,,,392,.1,.08,,,,.1],
  dodge:  [.4,.1,247,.01,,.08,,1.5,-8],
  toast:  [.6,,1318,,.04,.18,1,1.6,,,330,.04],
  sleep:  [.6,,392,.05,.2,.5,1,1.2,,,-98,.15],
  jump:   [.35,,240,.01,.04,.13,1,1.9,5],   // soft ground hop
  jump2:  [.5,,448,.01,.06,.2,1,1.87,7],    // brighter air jump
};
SND.gem = [...SND.pickup]; SND.gem[2] = 1975; // gem = pickup, higher voice
// music: pentatonic loop that gains a voice as each chapter's color returns
const MEL = [0, 3, 2, 4, 0, 2, 3, 1, 0, 3, 4, 2, 3, 4, 1, 0];
const PENT = [0, 3, 5, 7, 10];
let mt = 0, beat = 0;
const nf = (d, o) => 110 * 2 ** ((PENT[d % 5] + 12 * o) / 12);
export const musicTick = (dt, layers) => {
  if (!zzfxX || (mt -= dt) > 0) return;
  mt = .27; const b = ++beat & 15;
  if (!(b & 3)) zzfx(.22, 0, nf(0, b & 4 ? 1 : 0), .03, .3, .35, 0, 1);            // root drone
  if (layers > 0 && !(b & 1)) zzfx(.17, .01, nf(MEL[b], 2), .01, .11, .2, 0, 1);   // melody
  if (layers > 2 && (b & 3) === 2) zzfx(.13, 0, nf(2, 1), .02, .16, .3, 1, 1);     // harmony
  if (layers > 4) zzfx(.05, .02, 4e3 + 2e3 * (b & 1), .001, .01, .04, 3, 2);       // shimmer
};
let lastT = 0;
export const sfx = (snd, always) => {
  const now = performance.now();
  if (!always && now - lastT < 90) return; // ~11/sec rate cap — juice fatigue is real
  lastT = now;
  const a = [...snd];
  a[2] *= .94 + Math.random() * .12; // pitch variance so repeats stay fresh
  zzfx(...a);
};
