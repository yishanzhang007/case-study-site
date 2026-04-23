import { useRef, useEffect, useCallback } from 'react';

const GRID_N = 105;
const GRID_DECAY = 3.5;
const GRID_INTENSITY = 6.0;
const GRID_RADIUS = 3.0;
const GRID_R_EFF = GRID_RADIUS * 0.05;

function hexToRgb01(hex) {
  const v = hex.replace('#', '');
  const f = v.length === 3 ? v.split('').map(c => c + c).join('') : v;
  const n = parseInt(f, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

const VERT = `#version 300 es
in vec2 a_pos;
void main() {
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

const FRAG = `#version 300 es
precision highp float;

uniform float u_time;
uniform vec2 u_resolution;
uniform sampler2D u_gridTex;
uniform vec4 u_safeRect;
uniform vec3 u_colorA;
uniform vec3 u_colorB;

out vec4 fragColor;

const float GRID_SIZE = ${GRID_N.toFixed(1)};

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

  // Safe area occlusion (no UV distortion — waves flow past, rect simply occludes)
  float safeFade = 1.0;
  if (u_safeRect.z > 0.0) {
    vec2 rc = u_safeRect.xy + u_safeRect.zw * 0.5;
    vec2 hs = u_safeRect.zw * 0.5;
    float sd = sdRect(uv, rc, hs);
    safeFade = smoothstep(-0.04, 0.08, sd);
  }

  // Noise — lower scale = bigger cluster features
  vec2 nUV = vec2(uv.x * aspect, uv.y) * 0.6;
  float t = u_time * 0.45;

  float n = snoise(nUV + vec2(t * 0.15, t * 0.13));
  float noise01 = clamp(n * 0.5 + 0.5, 0.0, 1.0);
  float densityBig = smoothstep(0.45, 1.20, noise01);

  float nSmall = snoise(nUV * 1.5 + vec2(t * 0.4, -t * 0.3));
  float small01 = clamp(nSmall * 0.5 + 0.5, 0.0, 1.0);
  float densitySmall = smoothstep(0.65, 1.05, small01) * 0.2;

  float dotDensity = max(densityBig, densitySmall) * 0.1;
  dotDensity *= safeFade;

  vec2 pc = floor(gl_FragCoord.xy / 2.0);
  float bv = bayer8(pc);
  float dot = step(bv + 0.02, dotDensity);

  vec3 color = mix(u_colorA, u_colorB, dot);
  fragColor = vec4(color, 1.0);
}`;

export default function DitherShader({ onReady, safeRectRef, colorA = '#ffffff', colorB = '#A3A3A3', style, paused = false }) {
  const canvasRef = useRef(null);
  const glRef = useRef(null);
  const programRef = useRef(null);
  const rafRef = useRef(null);
  const startTime = useRef(Date.now());

  const mouseRef = useRef({ x: 0.5, y: 0.5 });
  const velRef = useRef({ x: 0, y: 0 });
  const prevPtrRef = useRef({ x: 0.5, y: 0.5, t: Date.now() });
  const lastMoveRef = useRef(0);
  const prevFrameRef = useRef(Date.now());
  const gridRef = useRef(new Float32Array(GRID_N * GRID_N * 2));
  const gridTexRef = useRef(null);
  const colorsRef = useRef({ a: hexToRgb01(colorA), b: hexToRgb01(colorB) });
  const pausedRef = useRef(paused);

  useEffect(() => {
    colorsRef.current.a = hexToRgb01(colorA);
    colorsRef.current.b = hexToRgb01(colorB);
  }, [colorA, colorB]);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  const handleMouseMove = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    mouseRef.current.x = (e.clientX - rect.left) / rect.width;
    mouseRef.current.y = 1.0 - (e.clientY - rect.top) / rect.height; // GL-style Y
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, depth: false, stencil: false, powerPreference: 'low-power' });
    if (!gl) { onReady?.(); return; }
    glRef.current = gl;

    const vs = gl.createShader(gl.VERTEX_SHADER);
    const fs = gl.createShader(gl.FRAGMENT_SHADER);
    if (!vs || !fs) { onReady?.(); return; }

    gl.shaderSource(vs, VERT);
    gl.compileShader(vs);
    gl.shaderSource(fs, FRAG);
    gl.compileShader(fs);

    if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
      console.error('Vertex shader error:', gl.getShaderInfoLog(vs));
      onReady?.(); return;
    }
    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
      console.error('Fragment shader error:', gl.getShaderInfoLog(fs));
      onReady?.(); return;
    }

    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    gl.useProgram(program);
    programRef.current = program;

    // Fullscreen quad
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(program, 'a_pos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    // Displacement grid texture (RG32F, NxN, nearest, clamp-to-edge)
    const gridTex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, gridTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RG32F, GRID_N, GRID_N, 0, gl.RG, gl.FLOAT, gridRef.current);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gridTexRef.current = gridTex;

    const uTime = gl.getUniformLocation(program, 'u_time');
    const uRes = gl.getUniformLocation(program, 'u_resolution');
    const uGridTex = gl.getUniformLocation(program, 'u_gridTex');
    const uSafeRect = gl.getUniformLocation(program, 'u_safeRect');
    const uColorA = gl.getUniformLocation(program, 'u_colorA');
    const uColorB = gl.getUniformLocation(program, 'u_colorB');
    gl.uniform1i(uGridTex, 0); // sampler2D binds to TEXTURE0

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio, 2);
      const w = Math.round(canvas.clientWidth * dpr);
      const h = Math.round(canvas.clientHeight * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
    };
    resize();

    // Pre-compute the sleep timeout. For decay=5.3, ≈1.73 s.
    const sleepMs = GRID_DECAY > 0
      ? Math.min(30000, Math.log(1e-4) / Math.log(Math.max(1e-6, 1 - GRID_DECAY * 0.016)) * 16.67)
      : 30000;
    const cutoff2 = (2 * GRID_R_EFF) * (2 * GRID_R_EFF);
    const rEff2 = GRID_R_EFF * GRID_R_EFF;

    const updateGrid = () => {
      const now = Date.now();
      const dt = Math.min(Math.max(1, now - prevFrameRef.current) / 1000, 0.016);
      prevFrameRef.current = now;

      // Per-frame velocity tracking (matches deployed: velocity is derived
      // from pointer deltas every frame, so it decays to 0 naturally when
      // the pointer stops moving even without any mousemove events).
      const px = mouseRef.current.x, py = mouseRef.current.y;
      const rawVx = dt > 0 ? (px - prevPtrRef.current.x) / dt : 0;
      const rawVy = dt > 0 ? (py - prevPtrRef.current.y) / dt : 0;
      velRef.current.x = velRef.current.x * 0.70 + rawVx * 0.30;
      velRef.current.y = velRef.current.y * 0.70 + rawVy * 0.30;
      if (Math.abs(rawVx) + Math.abs(rawVy) > 0.01) lastMoveRef.current = now;
      prevPtrRef.current.x = px;
      prevPtrRef.current.y = py;

      if (now - lastMoveRef.current > sleepMs) return false;

      const aspectF = canvas.width / Math.max(1, canvas.height);
      const vx = velRef.current.x, vy = velRef.current.y;
      const moving = Math.abs(vx) + Math.abs(vy) > 0.01;
      const fade = 1 - GRID_DECAY * dt;
      const kPush = GRID_INTENSITY * dt * 0.5;
      const grid = gridRef.current;
      const len = grid.length;

      // Pass 1: fade every cell (cheap linear scan, no per-cell branching).
      for (let i = 0; i < len; i++) {
        const v = grid[i] * fade;
        grid[i] = v < -1 ? -1 : v > 1 ? 1 : v;
      }

      // Pass 2: push only cells within the cutoff bounding box around pointer.
      if (moving) {
        const rCells = 2 * GRID_R_EFF;
        const colRange = aspectF >= 1 ? rCells / aspectF : rCells;
        const rowRange = aspectF >= 1 ? rCells : rCells * aspectF;
        const colMin = Math.max(0, Math.floor((px - colRange) * GRID_N - 0.5));
        const colMax = Math.min(GRID_N - 1, Math.ceil((px + colRange) * GRID_N - 0.5));
        const rowMin = Math.max(0, Math.floor((py - rowRange) * GRID_N - 0.5));
        const rowMax = Math.min(GRID_N - 1, Math.ceil((py + rowRange) * GRID_N - 0.5));

        for (let row = rowMin; row <= rowMax; row++) {
          const cy = (row + 0.5) / GRID_N;
          const eyBase = aspectF >= 1 ? (cy - py) : (cy - py) / aspectF;
          const ey2 = eyBase * eyBase;
          for (let col = colMin; col <= colMax; col++) {
            const cx = (col + 0.5) / GRID_N;
            const ex = aspectF >= 1 ? (cx - px) * aspectF : (cx - px);
            const d2 = ex * ex + ey2;
            if (d2 < cutoff2) {
              const g = Math.exp(-d2 / rEff2);
              const w = g * kPush;
              const tanW = Math.min(1, Math.sqrt(d2) / GRID_R_EFF) * 0.6;
              const i = (row * GRID_N + col) * 2;
              const dx = grid[i] + (vx - vy * tanW) * w;
              const dy = grid[i + 1] + (vy + vx * tanW) * w;
              grid[i]     = dx < -1 ? -1 : dx > 1 ? 1 : dx;
              grid[i + 1] = dy < -1 ? -1 : dy > 1 ? 1 : dy;
            }
          }
        }
      }
      return true;
    };

    const render = () => {
      if (pausedRef.current) {
        rafRef.current = requestAnimationFrame(render);
        return;
      }

      resize();

      if (updateGrid()) {
        gl.bindTexture(gl.TEXTURE_2D, gridTexRef.current);
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, GRID_N, GRID_N, gl.RG, gl.FLOAT, gridRef.current);
      }

      const t = (Date.now() - startTime.current) / 1000;
      gl.uniform1f(uTime, t);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform3fv(uColorA, colorsRef.current.a);
      gl.uniform3fv(uColorB, colorsRef.current.b);

      if (safeRectRef?.current) {
        const el = safeRectRef.current;
        const rect = el.getBoundingClientRect();
        const nx = rect.left / window.innerWidth;
        const ny = 1.0 - (rect.bottom) / window.innerHeight;
        const nw = rect.width / window.innerWidth;
        const nh = rect.height / window.innerHeight;
        gl.uniform4f(uSafeRect, nx, ny, nw, nh);
      } else {
        gl.uniform4f(uSafeRect, 0, 0, 0, 0);
      }

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      rafRef.current = requestAnimationFrame(render);
    };

    window.addEventListener('mousemove', handleMouseMove);
    rafRef.current = requestAnimationFrame(render);

    requestAnimationFrame(() => onReady?.());

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteBuffer(buf);
      gl.deleteTexture(gridTex);
      gridTexRef.current = null;
    };
  }, [onReady, handleMouseMove, safeRectRef]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        zIndex: 1,
        pointerEvents: 'none',
        ...style,
      }}
    />
  );
}
