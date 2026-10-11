'use client';

import * as React from 'react';
import { useEffect, useRef } from 'react';

const MAX_DPR = 2;

// Parameter grid constants defining cloud geometry and shading
const PUFF_UP = 0.34; // ellipse radius above the puff centre
const PUFF_DOWN = 0.19; // ellipse radius below the puff centre (flat cumulus base)
const ERODE = 0.7; // fbm erosion into blob silhouette edge
const SHADOW_STEP = 0.085; // vertical sample distance for self-shadowing
const NEAR_CELL = 1.05; // cells across short side, near parallax layer
const FAR_CELL = 2.15; // cells across short side, far parallax layer
const FAR_MIX = 0.55; // aerial perspective: far clouds mixed toward the sky
const NEAR_DRIFT = 0.055; // cells/sec at base speed
const FAR_DRIFT = 0.026;
const CIRRUS_DRIFT = 0.014;
const PUFF_WMAX = 2.15;
const SHADE_BLEND = 12.0;

const VERT_SRC = `
attribute vec2 a_pos;
void main(){ gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

const FRAG_SRC = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2 uRes;
uniform float uNearX, uFarX, uCirrusX;
uniform float uCoverage, uSize, uSoftness, uShadow, uCirrus;
uniform vec3 uZenith, uHorizon, uCloud;
uniform vec4 uGlow;
uniform vec2 uSun;
uniform vec2 uParallax;

vec2 hash22(vec2 p){
  vec3 q = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  q += dot(q, q.yzx + 33.33);
  return fract((q.xx + q.yz) * q.zy);
}

float hash12(vec2 p){
  vec3 q = fract(vec3(p.xyx) * 0.1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}

float vnoise(vec2 x){
  vec2 i = floor(x), f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash12(i), hash12(i + vec2(1.0, 0.0)), f.x),
             mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), f.x), f.y);
}

float fbm(vec2 p){
  float a = 0.5, s = 0.0;
  for (int i = 0; i < 4; i++){
    s += a * vnoise(p);
    p *= 2.03;
    a *= 0.5;
  }
  return s;
}

vec2 blobs(vec2 uv, float seed){
  vec2 id = floor(uv), f = fract(uv);
  float best = -1e4;
  float wsum = 0.0, ysum = 0.0;
  float wMax = min(${PUFF_WMAX.toFixed(3)}, 0.72 * uSize);
  float reach = min(2.0, ceil(wMax + 0.85) - 1.0);
  for (int j = -2; j <= 2; j++){
    for (int i = -2; i <= 2; i++){
      vec2 o = vec2(float(i), float(j));
      if (max(abs(o.x), abs(o.y)) > reach) continue;
      vec2 h = hash22(id + o + seed);
      if (fract(h.x * 37.1) > uCoverage) continue;
      vec2 c = o + 0.15 + h * 0.7;
      float w = min(${PUFF_WMAX.toFixed(3)}, (0.30 + 0.42 * fract(h.y * 19.7)) * uSize);
      vec2 d = f - c;
      float ry = (d.y > 0.0 ? ${PUFF_UP.toFixed(3)} : ${PUFF_DOWN.toFixed(3)}) * uSize * (0.8 + 0.5 * fract(h.y * 7.3));
      float e = length(vec2(d.x / max(w, 1e-3), d.y / max(ry, 1e-3)));
      float val = 1.0 - e;
      float yN = d.y / max(ry, 1e-3);
      if (val > best){
        float k = exp(${SHADE_BLEND.toFixed(1)} * (best - val));
        wsum = wsum * k + 1.0;
        ysum = ysum * k + yN;
        best = val;
      } else {
        float g = exp(${SHADE_BLEND.toFixed(1)} * (val - best));
        wsum += g;
        ysum += g * yN;
      }
    }
  }
  return vec2(best, ysum / max(wsum, 1e-4));
}

vec2 cloudField(vec2 uv, float seed, float detailScale){
  vec2 b = blobs(uv, seed);
  float n = fbm(uv * detailScale + seed * 3.1) * 0.72
          + fbm(uv * detailScale * 3.3 + seed * 7.7) * 0.28;
  return vec2(b.x - (1.0 - n) * ${ERODE.toFixed(3)}, b.y);
}

vec3 shadeCloud(float dyNorm, vec3 sky){
  float t = smoothstep(-0.95, 0.25, dyNorm);
  vec3 base = mix(uCloud * 0.52, sky, 0.34);
  return mix(mix(uCloud, base, uShadow), uCloud, t);
}

void main(){
  vec2 frag = gl_FragCoord.xy / max(uRes.y, 1.0);
  float aspect = uRes.x / max(uRes.y, 1.0);
  vec2 p = vec2(frag.x, frag.y);

  // ---- sky gradient ------------------------------------------------------
  vec3 sky = mix(uHorizon, uZenith, smoothstep(-0.15, 1.05, p.y));
  vec2 sunP = vec2(uSun.x * aspect, uSun.y);
  float sd = length(p - sunP);
  sky += uGlow.rgb * uGlow.a * exp(-sd * 3.4) * 0.30;

  vec3 col = sky;

  // ---- cirrus high veil --------------------------------------------------
  if (uCirrus > 0.0) {
    vec2 cuv = vec2(p.x * 1.4 + uCirrusX, p.y * 5.5);
    float veil = fbm(cuv) * fbm(cuv * 2.3 + 9.0);
    veil = smoothstep(0.24, 0.55, veil) * smoothstep(0.15, 0.7, p.y);
    col = mix(col, uCloud, veil * uCirrus * 0.5);
  }

  // ---- far cumulus layer -------------------------------------------------
  vec2 fuv = vec2(p.x + uFarX, p.y) * ${FAR_CELL.toFixed(3)} + uParallax * 0.4;
  vec2 fd = cloudField(fuv, 17.0, 11.0);
  float fa = clamp(fd.x * uSoftness, 0.0, 1.0);
  if (fa > 0.0) {
    vec3 lit = shadeCloud(fd.y, sky);
    col = mix(col, mix(lit, sky, ${FAR_MIX.toFixed(3)}), fa);
  }

  // ---- near cumulus layer ------------------------------------------------
  vec2 nuv = vec2(p.x + uNearX, p.y) * ${NEAR_CELL.toFixed(3)} + uParallax;
  vec2 nd = cloudField(nuv, 3.0, 8.5);
  float na = clamp(nd.x * uSoftness, 0.0, 1.0);
  if (na > 0.0) {
    vec3 lit = shadeCloud(nd.y, sky);
    float above = clamp(cloudField(nuv + vec2(0.0, ${SHADOW_STEP.toFixed(3)}), 3.0, 8.5).x * uSoftness, 0.0, 1.0);
    lit *= 1.0 - 0.18 * uShadow * above;
    lit += uGlow.rgb * uGlow.a * 0.22 * exp(-length(p - sunP) * 1.6);
    col = mix(col, lit, na);
  }

  gl_FragColor = vec4(col, 1.0);
}
`;

function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader | null {
  const sh = gl.createShader(type);
  if (!sh) return null;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    console.error('CloudSky shader compilation failed:', gl.getShaderInfoLog(sh));
    gl.deleteShader(sh);
    return null;
  }
  return sh;
}

type RGBA = [number, number, number, number];

function parseColor(input: string | undefined, fb: RGBA): RGBA {
  if (!input) return fb;
  const str = String(input).trim();
  if (str.charAt(0) === '#') {
    let hex = str.slice(1);
    if (hex.length === 3 || hex.length === 4) {
      hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2] + (hex.length === 4 ? hex[3] + hex[3] : '');
    }
    if (hex.length >= 6) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      const a = hex.length >= 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1;
      if (!isNaN(r) && !isNaN(g) && !isNaN(b)) return [r / 255, g / 255, b / 255, a];
    }
    return fb;
  }
  const m = str.match(/[\d.]+/g);
  if (m && m.length >= 3) {
    return [
      Math.min(255, parseFloat(m[0])) / 255,
      Math.min(255, parseFloat(m[1])) / 255,
      Math.min(255, parseFloat(m[2])) / 255,
      m.length >= 4 ? Math.min(1, parseFloat(m[3])) : 1,
    ];
  }
  return fb;
}

function num(v: unknown, fb: number): number {
  return typeof v === 'number' && isFinite(v) ? v : fb;
}

function clampN(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

export type Clouds = { softness?: number; shadow?: number; cirrus?: number };
export type Sun = { x?: number; y?: number; glow?: string };
export type Pointer = { parallax?: number; wind?: number; damping?: number };

// Harmonized default values tailored for Supply Connect's atmospheric command center
const CLOUD_DEFAULTS: Required<Clouds> = { softness: 110, shadow: 75, cirrus: 35 };
const SUN_DEFAULTS: Required<Sun> = { x: 82, y: 78, glow: 'rgba(163, 240, 214, 0.40)' };
const POINTER_DEFAULTS: Required<Pointer> = { parallax: 45, wind: 35, damping: 22 };

export interface CloudSkyProps {
  className?: string;
  style?: React.CSSProperties;
  width?: number;
  height?: number;
  background?: string;
  baseColor?: string;
  accentColor?: string;
  density?: number;
  speed?: number;
  size?: number;
  clouds?: Clouds;
  sun?: Sun;
  pointer?: Pointer;
}

export default function CloudSky(props: CloudSkyProps) {
  const {
    className = '',
    style,
    background = '#040406', // Canonical Bloom deep charcoal zenith
    baseColor = '#0e0e13',  // Muted monochrome horizon
    accentColor = '#dcdcdc', // Soft silver cloud highlights
    density = 55,
    speed = 26,
    size = 120,
    clouds,
    sun,
    pointer,
    width,
    height,
  } = props;

  const clouds_ = { ...CLOUD_DEFAULTS, ...(clouds || {}) };
  const sun_ = { ...SUN_DEFAULTS, ...(sun || {}) };
  const pointer_ = { ...POINTER_DEFAULTS, ...(pointer || {}) };

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sizeRef = useRef({ w: num(width, 0), h: num(height, 0) });
  const vRef = useRef<Record<string, number | string>>({
    zenith: background,
    horizon: baseColor,
    cloud: accentColor,
    glow: sun_.glow,
    coverage: clampN(num(density, 55), 0, 100) / 100,
    speed: clampN(num(speed, 26), 0, 100) / 50,
    size: clampN(num(size, 120), 20, 300) / 100,
    softness: 4.5 / Math.max(0.15, clampN(num(clouds_.softness, 110), 20, 300) / 100),
    shadow: clampN(num(clouds_.shadow, 75), 0, 200) / 100,
    cirrus: clampN(num(clouds_.cirrus, 35), 0, 100) / 100,
    sunX: clampN(num(sun_.x, 82), 0, 100) / 100,
    sunY: clampN(num(sun_.y, 78), 0, 100) / 100,
    parallax: clampN(num(pointer_.parallax, 45), 0, 300) / 100,
    wind: clampN(num(pointer_.wind, 35), 0, 300) / 100,
    damping: clampN(num(pointer_.damping, 22), 1, 100),
  });

  useEffect(() => {
    sizeRef.current = { w: num(width, 0), h: num(height, 0) };
    vRef.current = {
      zenith: background,
      horizon: baseColor,
      cloud: accentColor,
      glow: sun_.glow,
      coverage: clampN(num(density, 55), 0, 100) / 100,
      speed: clampN(num(speed, 26), 0, 100) / 50,
      size: clampN(num(size, 120), 20, 300) / 100,
      softness: 4.5 / Math.max(0.15, clampN(num(clouds_.softness, 110), 20, 300) / 100),
      shadow: clampN(num(clouds_.shadow, 75), 0, 200) / 100,
      cirrus: clampN(num(clouds_.cirrus, 35), 0, 100) / 100,
      sunX: clampN(num(sun_.x, 82), 0, 100) / 100,
      sunY: clampN(num(sun_.y, 78), 0, 100) / 100,
      parallax: clampN(num(pointer_.parallax, 45), 0, 300) / 100,
      wind: clampN(num(pointer_.wind, 35), 0, 300) / 100,
      damping: clampN(num(pointer_.damping, 22), 1, 100),
    };
  }, [width, height, background, baseColor, accentColor, density, speed, size, clouds_.softness, clouds_.shadow, clouds_.cirrus, sun_.glow, sun_.x, sun_.y, pointer_.parallax, pointer_.wind, pointer_.damping]);

  const ptrRef = useRef({ x: 0, y: 0, inside: false });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let gl: WebGLRenderingContext | null = null;
    try {
      gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: false });
    } catch {
      // Graceful fallback if WebGL is unavailable
      return;
    }

    if (!gl) {
      console.warn('CloudSky: WebGL unavailable; falling back to CSS gradient background.');
      return;
    }

    const vs = compile(gl, gl.VERTEX_SHADER, VERT_SRC);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG_SRC);
    if (!vs || !fs) return;

    const prog = gl.createProgram();
    if (!prog) return;

    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);

    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error('CloudSky program link error:', gl.getProgramInfoLog(prog));
      return;
    }
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(prog, 'a_pos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const locs: Record<string, WebGLUniformLocation | null> = {};
    const u = (name: string) => {
      if (!(name in locs)) locs[name] = gl.getUniformLocation(prog, name);
      return locs[name];
    };

    let raf = 0;
    let last = performance.now();
    let nearX = 0;
    let farX = 0;
    let cirrusX = 0;
    let leanX = 0;
    let leanY = 0;

    // Accessibility: Respect prefers-reduced-motion
    const motionQuery = typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-reduced-motion: reduce)')
      : null;
    let prefersReducedMotion = motionQuery ? motionQuery.matches : false;

    const render = (now: number) => {
      if (!gl || !canvas) return;

      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const v = vRef.current;
      const p = ptrRef.current;

      const k = 1 - Math.exp(-(v.damping as number) * 0.12 * dt);
      leanX += ((p.inside ? p.x : 0) - leanX) * k;
      leanY += ((p.inside ? p.y : 0) - leanY) * k;

      const gust = 1 + leanX * (v.wind as number);
      const rate = prefersReducedMotion ? 0 : (v.speed as number) * gust;
      nearX = (nearX - NEAR_DRIFT * rate * dt) % 1000;
      farX = (farX - FAR_DRIFT * rate * dt) % 1000;
      cirrusX = (cirrusX - CIRRUS_DRIFT * rate * dt) % 1000;

      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      const cw = sizeRef.current.w || canvas.clientWidth || (typeof window !== 'undefined' ? window.innerWidth : 300);
      const ch = sizeRef.current.h || canvas.clientHeight || (typeof window !== 'undefined' ? window.innerHeight : 300);
      const bw = Math.max(1, Math.round(cw * dpr));
      const bh = Math.max(1, Math.round(ch * dpr));

      if (canvas.width !== bw || canvas.height !== bh) {
        canvas.width = bw;
        canvas.height = bh;
      }
      gl.viewport(0, 0, bw, bh);

      const zen = parseColor(v.zenith as string, [0.012, 0.075, 0.09, 1]);
      const hor = parseColor(v.horizon as string, [0.027, 0.137, 0.114, 1]);
      const cld = parseColor(v.cloud as string, [0.639, 0.918, 0.82, 1]);
      const glow = parseColor(v.glow as string, [0.639, 0.941, 0.839, 0.4]);

      gl.uniform2f(u('uRes'), bw, bh);
      gl.uniform1f(u('uNearX'), nearX);
      gl.uniform1f(u('uFarX'), farX);
      gl.uniform1f(u('uCirrusX'), cirrusX);
      gl.uniform1f(u('uCoverage'), v.coverage as number);
      gl.uniform1f(u('uSize'), v.size as number);
      gl.uniform1f(u('uSoftness'), v.softness as number);
      gl.uniform1f(u('uShadow'), v.shadow as number);
      gl.uniform1f(u('uCirrus'), v.cirrus as number);
      gl.uniform2f(u('uSun'), v.sunX as number, v.sunY as number);
      gl.uniform2f(u('uParallax'), -leanX * (v.parallax as number) * 0.07, -leanY * (v.parallax as number) * 0.05);
      gl.uniform3f(u('uZenith'), zen[0], zen[1], zen[2]);
      gl.uniform3f(u('uHorizon'), hor[0], hor[1], hor[2]);
      gl.uniform3f(u('uCloud'), cld[0], cld[1], cld[2]);
      gl.uniform4f(u('uGlow'), glow[0], glow[1], glow[2], glow[3]);

      gl.drawArrays(gl.TRIANGLES, 0, 3);

      if (!prefersReducedMotion) {
        raf = requestAnimationFrame(render);
      } else {
        raf = 0;
      }
    };

    // Passive pointer tracking on window so canvas can stay pointer-events-none without blocking Globe/links
    const track = (e: PointerEvent) => {
      const w = window.innerWidth || 1;
      const h = window.innerHeight || 1;
      ptrRef.current.x = (e.clientX / w) * 2 - 1;
      ptrRef.current.y = 1 - (e.clientY / h) * 2;
      ptrRef.current.inside = true;
      if (prefersReducedMotion && !raf) {
        render(performance.now());
      }
    };

    const onLeave = () => {
      ptrRef.current.inside = false;
    };

    window.addEventListener('pointermove', track, { passive: true });
    window.addEventListener('pointerleave', onLeave, { passive: true });

    const handleMotionChange = (e: MediaQueryListEvent) => {
      prefersReducedMotion = e.matches;
      if (!prefersReducedMotion && !raf) {
        last = performance.now();
        raf = requestAnimationFrame(render);
      } else if (prefersReducedMotion) {
        if (raf) cancelAnimationFrame(raf);
        raf = 0;
        render(performance.now());
      }
    };

    if (motionQuery) {
      motionQuery.addEventListener('change', handleMotionChange);
    }

    // ResizeObserver ensures canvas re-renders when parent bounds update
    const resizeObserver = new ResizeObserver(() => {
      if (prefersReducedMotion && !raf) {
        render(performance.now());
      }
    });
    resizeObserver.observe(canvas);

    raf = requestAnimationFrame(render);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', track);
      window.removeEventListener('pointerleave', onLeave);
      if (motionQuery) {
        motionQuery.removeEventListener('change', handleMotionChange);
      }
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <div
      className={`relative overflow-hidden w-full h-full pointer-events-none select-none ${className}`}
      style={{
        background: `radial-gradient(ellipse at 50% 100%, ${baseColor} 0%, ${background} 100%)`,
        isolation: 'isolate',
        width: typeof width === 'number' && width > 0 ? width : '100%',
        height: typeof height === 'number' && height > 0 ? height : '100%',
        ...style,
      }}
      aria-hidden="true"
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full block pointer-events-none"
      />
    </div>
  );
}
