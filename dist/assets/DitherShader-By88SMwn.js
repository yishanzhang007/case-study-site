import{a as e}from"./rolldown-runtime-COnpUsM8.js";import{a as t,i as n}from"./framer-BlZFp0d4.js";var r=e(t()),i=n(),a=105,o=3.5,s=12,c=3*.05;function l(e){let t=e.replace(`#`,``),n=t.length===3?t.split(``).map(e=>e+e).join(``):t,r=parseInt(n,16);return[(r>>16&255)/255,(r>>8&255)/255,(r&255)/255]}var u=`#version 300 es
in vec2 a_pos;
void main() {
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`,d=`#version 300 es
precision highp float;

uniform float u_time;
uniform vec2 u_resolution;
uniform sampler2D u_gridTex;
uniform vec4 u_safeRect;
uniform vec3 u_colorA;
uniform vec3 u_colorB;

out vec4 fragColor;

const float GRID_SIZE = ${a.toFixed(1)};

// --- Simplex 2D noise ---
vec3 mod289v3(vec3 x) { return x - floor(x / 289.0) * 289.0; }
vec3 permute(vec3 x) { return mod289v3((x * 34.0 + 1.0) * x); }

float snoise(vec2 v) {
  vec4 C = vec4(0.211324865, 0.366025404, -0.577350269, 0.024390244);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289v3(vec3(i, 0.0)).xy;
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m * m * m;
  vec3 x_ = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x_) - 0.5;
  vec3 a0 = x_ - floor(x_ + 0.5);
  m *= 1.79284 - 0.85374 * (a0 * a0 + h * h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

// --- Bayer 8x8 (unrolled, no loop) ---
float bayer8(vec2 coord) {
  int x = int(mod(coord.x, 8.0));
  int y = int(mod(coord.y, 8.0));
  int bx0 = x & 1; int by0 = y & 1;
  int v0 = by0 * 3 + bx0 * 2 - bx0 * by0 * 4;
  int bx1 = (x >> 1) & 1; int by1 = (y >> 1) & 1;
  int v1 = by1 * 3 + bx1 * 2 - bx1 * by1 * 4;
  int bx2 = (x >> 2) & 1; int by2 = (y >> 2) & 1;
  int v2 = by2 * 3 + bx2 * 2 - bx2 * by2 * 4;
  return float(v0 * 16 + v1 * 4 + v2) / 64.0;
}

// --- Safe area SDF ---
float sdRect(vec2 p, vec2 center, vec2 halfSize) {
  vec2 d = abs(p - center) - halfSize;
  return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  float aspect = u_resolution.x / u_resolution.y;

  // Pointer grid distortion (port of @paper-design GridDistortion)
  // Aspect-adaptive grid dims so cells stay square in screen space.
  float gw = (aspect > 1.0) ? GRID_SIZE           : GRID_SIZE * aspect;
  float gh = (aspect > 1.0) ? GRID_SIZE / aspect  : GRID_SIZE;
  gw = max(gw, 1.0); gh = max(gh, 1.0);
  vec2 cellIdx  = floor(vec2(uv.x * gw, uv.y * gh));
  vec2 cellUV   = (cellIdx + 0.5) / vec2(gw, gh);
  vec2 disp     = texture(u_gridTex, cellUV).xy;
  disp          = clamp(disp, vec2(-0.22), vec2(0.22));
  uv           -= disp;
  uv            = clamp(uv, vec2(0.0), vec2(1.0)); // match edges: 'stretch'

  // Safe area repulsion
  float safeFade = 1.0;
  if (u_safeRect.z > 0.0) {
    vec2 rc = u_safeRect.xy + u_safeRect.zw * 0.5;
    vec2 hs = u_safeRect.zw * 0.5 * 1.0;
    float sd = sdRect(uv, rc, hs);
    float repel = 1.0 - smoothstep(-0.18, 0.28, sd);
    vec2 rd = uv - rc;
    float rl = length(rd);
    rd = (rl > 0.001) ? rd / rl : vec2(0.0);
    uv += rd * repel * 0.9;
    safeFade = smoothstep(-0.04, 0.08, sd);
  }

  // Noise — lower scale = bigger cluster features
  vec2 nUV = vec2(uv.x * aspect, uv.y) * 0.10;
  float t = u_time * 0.3;

  float n = snoise(nUV + vec2(t * 0.15, t * 0.13));
  float noise01 = clamp(n * 0.5 + 0.5, 0.0, 1.0);
  float densityBig = smoothstep(0.70, 1.20, noise01);

  float nSmall = snoise(nUV * 5.0 + vec2(t * 0.4, -t * 0.3));
  float small01 = clamp(nSmall * 0.5 + 0.5, 0.0, 1.0);
  float densitySmall = smoothstep(0.65, 1.05, small01) * 0.5;

  float dotDensity = max(densityBig, densitySmall) * 0.4;
  dotDensity *= safeFade;

  vec2 pc = floor(gl_FragCoord.xy / 3.0);
  float bv = bayer8(pc);
  float dot = step(bv + 0.02, dotDensity);

  vec3 color = mix(u_colorA, u_colorB, dot);
  fragColor = vec4(color, 1.0);
}`;function f({onReady:e,safeRectRef:t,colorA:n=`#ffffff`,colorB:f=`#b8b8b8`,style:p,paused:m=!1}){let h=(0,r.useRef)(null),g=(0,r.useRef)(null),_=(0,r.useRef)(null),v=(0,r.useRef)(null),y=(0,r.useRef)(Date.now()),b=(0,r.useRef)({x:.5,y:.5}),x=(0,r.useRef)({x:0,y:0}),S=(0,r.useRef)({x:.5,y:.5,t:Date.now()}),C=(0,r.useRef)(0),w=(0,r.useRef)(Date.now()),T=(0,r.useRef)(new Float32Array(a*a*2)),E=(0,r.useRef)(null),D=(0,r.useRef)({a:l(n),b:l(f)}),O=(0,r.useRef)(m);(0,r.useEffect)(()=>{D.current.a=l(n),D.current.b=l(f)},[n,f]),(0,r.useEffect)(()=>{O.current=m},[m]);let k=(0,r.useCallback)(e=>{let t=h.current;if(!t)return;let n=t.getBoundingClientRect();n.width===0||n.height===0||(b.current.x=(e.clientX-n.left)/n.width,b.current.y=1-(e.clientY-n.top)/n.height)},[]);return(0,r.useEffect)(()=>{let n=h.current;if(!n)return;let r=n.getContext(`webgl2`,{antialias:!1,alpha:!1,depth:!1,stencil:!1,powerPreference:`low-power`});if(!r){e?.();return}g.current=r;let i=r.createShader(r.VERTEX_SHADER),l=r.createShader(r.FRAGMENT_SHADER);if(!i||!l){e?.();return}if(r.shaderSource(i,u),r.compileShader(i),r.shaderSource(l,d),r.compileShader(l),!r.getShaderParameter(i,r.COMPILE_STATUS)){console.error(`Vertex shader error:`,r.getShaderInfoLog(i)),e?.();return}if(!r.getShaderParameter(l,r.COMPILE_STATUS)){console.error(`Fragment shader error:`,r.getShaderInfoLog(l)),e?.();return}let f=r.createProgram();r.attachShader(f,i),r.attachShader(f,l),r.linkProgram(f),r.useProgram(f),_.current=f;let p=r.createBuffer();r.bindBuffer(r.ARRAY_BUFFER,p),r.bufferData(r.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),r.STATIC_DRAW);let m=r.getAttribLocation(f,`a_pos`);r.enableVertexAttribArray(m),r.vertexAttribPointer(m,2,r.FLOAT,!1,0,0);let A=r.createTexture();r.activeTexture(r.TEXTURE0),r.bindTexture(r.TEXTURE_2D,A),r.texImage2D(r.TEXTURE_2D,0,r.RG32F,a,a,0,r.RG,r.FLOAT,T.current),r.texParameteri(r.TEXTURE_2D,r.TEXTURE_MIN_FILTER,r.NEAREST),r.texParameteri(r.TEXTURE_2D,r.TEXTURE_MAG_FILTER,r.NEAREST),r.texParameteri(r.TEXTURE_2D,r.TEXTURE_WRAP_S,r.CLAMP_TO_EDGE),r.texParameteri(r.TEXTURE_2D,r.TEXTURE_WRAP_T,r.CLAMP_TO_EDGE),E.current=A;let j=r.getUniformLocation(f,`u_time`),M=r.getUniformLocation(f,`u_resolution`),N=r.getUniformLocation(f,`u_gridTex`),P=r.getUniformLocation(f,`u_safeRect`),F=r.getUniformLocation(f,`u_colorA`),I=r.getUniformLocation(f,`u_colorB`);r.uniform1i(N,0);let L=()=>{let e=Math.min(window.devicePixelRatio,2),t=Math.round(n.clientWidth*e),i=Math.round(n.clientHeight*e);(n.width!==t||n.height!==i)&&(n.width=t,n.height=i,r.viewport(0,0,t,i))};L();let R=o>0?Math.min(3e4,Math.log(1e-4)/Math.log(Math.max(1e-6,1-o*.016))*16.67):3e4,z=2*c*(2*c),B=c*c,V=()=>{let e=Date.now(),t=Math.min(Math.max(1,e-w.current)/1e3,.016);w.current=e;let r=b.current.x,i=b.current.y,l=t>0?(r-S.current.x)/t:0,u=t>0?(i-S.current.y)/t:0;if(x.current.x=x.current.x*.7+l*.3,x.current.y=x.current.y*.7+u*.3,Math.abs(l)+Math.abs(u)>.01&&(C.current=e),S.current.x=r,S.current.y=i,e-C.current>R)return!1;let d=n.width/Math.max(1,n.height),f=x.current.x,p=x.current.y,m=Math.abs(f)+Math.abs(p)>.01,h=1-o*t,g=s*t*.5,_=T.current,v=_.length;for(let e=0;e<v;e++){let t=_[e]*h;_[e]=t<-1?-1:t>1?1:t}if(m){let e=2*c,t=d>=1?e/d:e,n=d>=1?e:e*d,o=Math.max(0,Math.floor((r-t)*a-.5)),s=Math.min(a-1,Math.ceil((r+t)*a-.5)),l=Math.max(0,Math.floor((i-n)*a-.5)),u=Math.min(a-1,Math.ceil((i+n)*a-.5));for(let e=l;e<=u;e++){let t=(e+.5)/a,n=d>=1?t-i:(t-i)/d,l=n*n;for(let t=o;t<=s;t++){let n=(t+.5)/a,i=d>=1?(n-r)*d:n-r,o=i*i+l;if(o<z){let n=Math.exp(-o/B)*g,r=Math.min(1,Math.sqrt(o)/c)*.6,i=(e*a+t)*2,s=_[i]+(f-p*r)*n,l=_[i+1]+(p+f*r)*n;_[i]=s<-1?-1:s>1?1:s,_[i+1]=l<-1?-1:l>1?1:l}}}}return!0},H=()=>{if(O.current){v.current=requestAnimationFrame(H);return}L(),V()&&(r.bindTexture(r.TEXTURE_2D,E.current),r.texSubImage2D(r.TEXTURE_2D,0,0,0,a,a,r.RG,r.FLOAT,T.current));let e=(Date.now()-y.current)/1e3;if(r.uniform1f(j,e),r.uniform2f(M,n.width,n.height),r.uniform3fv(F,D.current.a),r.uniform3fv(I,D.current.b),t?.current){let e=t.current.getBoundingClientRect(),n=e.left/window.innerWidth,i=1-e.bottom/window.innerHeight,a=e.width/window.innerWidth,o=e.height/window.innerHeight;r.uniform4f(P,n,i,a,o)}else r.uniform4f(P,0,0,0,0);r.drawArrays(r.TRIANGLE_STRIP,0,4),v.current=requestAnimationFrame(H)};return window.addEventListener(`mousemove`,k),v.current=requestAnimationFrame(H),requestAnimationFrame(()=>e?.()),()=>{window.removeEventListener(`mousemove`,k),v.current&&cancelAnimationFrame(v.current),r.deleteProgram(f),r.deleteShader(i),r.deleteShader(l),r.deleteBuffer(p),r.deleteTexture(A),E.current=null}},[e,k,t]),(0,i.jsx)(`canvas`,{ref:h,style:{position:`fixed`,inset:0,width:`100%`,height:`100%`,zIndex:1,pointerEvents:`none`,...p}})}export{f as t};