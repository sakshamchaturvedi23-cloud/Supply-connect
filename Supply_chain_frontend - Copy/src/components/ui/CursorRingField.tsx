'use client';

import React, { useEffect, useRef } from 'react';

export interface CursorRingFieldProps {
  /**
   * Color palette matching the Supply Connect brand:
   * Defaults to ["#3074f9", "#7189ff", "#0f172a"].
   */
  palette?: string[];
  /** Intensity multiplier for alpha and luminosity (default: 1.0) */
  intensity?: number;
  /** Speed of wave propagation (default: 1.0) */
  speed?: number;
  /** Optional custom CSS classes */
  className?: string;
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16) / 255;
    const g = parseInt(clean[1] + clean[1], 16) / 255;
    const b = parseInt(clean[2] + clean[2], 16) / 255;
    return [r, g, b];
  }
  if (clean.length === 6) {
    const r = parseInt(clean.substring(0, 2), 16) / 255;
    const g = parseInt(clean.substring(2, 4), 16) / 255;
    const b = parseInt(clean.substring(4, 6), 16) / 255;
    return [r, g, b];
  }
  return [0.19, 0.45, 0.98];
}

const VS_SOURCE = `
attribute vec2 a_position;
varying vec2 v_uv;
void main() {
  v_uv = (a_position + 1.0) * 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const FS_SOURCE = `
precision mediump float;

varying vec2 v_uv;

uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;
uniform vec3 u_color1;
uniform vec3 u_color2;
uniform vec3 u_color3;
uniform float u_intensity;
uniform float u_speed;

void main() {
  // Normalize screen coordinate space with aspect correction
  vec2 st = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / min(u_resolution.x, u_resolution.y);
  vec2 mouseSt = (u_mouse - 0.5 * u_resolution.xy) / min(u_resolution.x, u_resolution.y);

  // Distance from pointer
  float d = length(st - mouseSt);

  // Concentric animated ring waves propagating from the cursor
  float t = u_time * u_speed;
  float ring1 = sin(d * 28.0 - t * 2.2);
  float ring2 = sin(d * 42.0 - t * 3.4 + 1.2);
  float ring3 = cos(d * 14.0 - t * 1.5);

  // Fine geometric interference rings
  float fineFrac = fract(d * 7.5 - t * 0.3);
  float fineRing = smoothstep(0.04, 0.0, abs(fineFrac - 0.5));

  // Radially decaying falloff envelopes
  float cursorCore = exp(-d * 3.0);
  float cursorMid = exp(-d * 1.8);
  float cursorAmbient = exp(-d * 0.7) * 0.35;

  // Discrete hexagonal/dot quantum grid points
  vec2 gridCoord = fract(st * 16.0) - 0.5;
  float gridDot = smoothstep(0.09, 0.02, length(gridCoord)) * (cursorMid * 1.6 + 0.12);

  // Ambient field drift
  float ambientWave = sin(st.x * 5.0 + t * 0.35) * cos(st.y * 5.0 - t * 0.28) * 0.08;

  // Composite ring field amplitude
  float waveEnergy = (0.5 + 0.5 * ring1) * cursorMid * 0.65
                   + (0.5 + 0.5 * ring2) * cursorMid * 0.35
                   + (0.5 + 0.5 * ring3) * cursorCore * 0.45
                   + fineRing * cursorMid * 0.70
                   + gridDot * 0.25
                   + ambientWave;

  // Color composition
  vec3 col = mix(u_color3, u_color1, clamp(waveEnergy * 1.1 + cursorAmbient * 0.8, 0.0, 1.0));
  col = mix(col, u_color2, clamp(fineRing * cursorMid * 0.9 + cursorCore * 0.8, 0.0, 1.0));

  // Soft edge vignette
  vec2 uvNorm = gl_FragCoord.xy / u_resolution.xy;
  float vignette = 1.0 - smoothstep(0.4, 1.3, length(uvNorm - 0.5) * 1.4);

  // Alpha computation: subtle ambient luminescence that does not overpower text
  float alpha = clamp(
    (cursorMid * 0.45 + waveEnergy * 0.38 + cursorAmbient * 0.20 + 0.02) * vignette * u_intensity,
    0.0,
    0.75
  );

  gl_FragColor = vec4(col, alpha);
}
`;

export function CursorRingField({
  palette = ['#3074f9', '#7189ff', '#0f172a'],
  intensity = 1.0,
  speed = 1.0,
  className = '',
}: CursorRingFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Initialize WebGL context
    const gl =
      canvas.getContext('webgl', {
        alpha: true,
        antialias: true,
        premultipliedAlpha: false,
        powerPreference: 'low-power',
      }) ||
      (canvas.getContext('experimental-webgl') as WebGLRenderingContext | null);

    if (!gl) {
      console.warn('WebGL is not supported in this environment.');
      return;
    }

    // Helper: compile shader
    function createShader(glCtx: WebGLRenderingContext, type: number, source: string) {
      const shader = glCtx.createShader(type);
      if (!shader) return null;
      glCtx.shaderSource(shader, source);
      glCtx.compileShader(shader);
      if (!glCtx.getShaderParameter(shader, glCtx.COMPILE_STATUS)) {
        console.error('Shader compile failed:', glCtx.getShaderInfoLog(shader));
        glCtx.deleteShader(shader);
        return null;
      }
      return shader;
    }

    const vs = createShader(gl, gl.VERTEX_SHADER, VS_SOURCE);
    const fs = createShader(gl, gl.FRAGMENT_SHADER, FS_SOURCE);
    if (!vs || !fs) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program link failed:', gl.getProgramInfoLog(program));
      return;
    }

    gl.useProgram(program);

    // Quad geometry covering [-1, -1] to [1, 1]
    const quadVertices = new Float32Array([
      -1.0, -1.0,
       1.0, -1.0,
      -1.0,  1.0,
      -1.0,  1.0,
       1.0, -1.0,
       1.0,  1.0,
    ]);

    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, quadVertices, gl.STATIC_DRAW);

    const aPosition = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(aPosition);
    gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

    // Uniform locations
    const uResolution = gl.getUniformLocation(program, 'u_resolution');
    const uMouse = gl.getUniformLocation(program, 'u_mouse');
    const uTime = gl.getUniformLocation(program, 'u_time');
    const uColor1 = gl.getUniformLocation(program, 'u_color1');
    const uColor2 = gl.getUniformLocation(program, 'u_color2');
    const uColor3 = gl.getUniformLocation(program, 'u_color3');
    const uIntensity = gl.getUniformLocation(program, 'u_intensity');
    const uSpeed = gl.getUniformLocation(program, 'u_speed');

    // Parse colors
    const c1 = hexToRgb(palette[0] || '#3074f9');
    const c2 = hexToRgb(palette[1] || '#7189ff');
    const c3 = hexToRgb(palette[2] || '#0f172a');

    gl.uniform3f(uColor1, c1[0], c1[1], c1[2]);
    gl.uniform3f(uColor2, c2[0], c2[1], c2[2]);
    gl.uniform3f(uColor3, c3[0], c3[1], c3[2]);
    gl.uniform1f(uIntensity, intensity);
    gl.uniform1f(uSpeed, speed);

    // Blending state
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // Viewport & Pointer tracking state
    let width = 0;
    let height = 0;
    let dpr = 1;

    // Smoothed pointer coordinates
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    let isPointerActive = false;

    function resize() {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.max(1, Math.floor(rect.width * dpr));
      height = Math.max(1, Math.floor(rect.height * dpr));

      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        gl?.viewport(0, 0, width, height);
      }

      if (!isPointerActive) {
        targetX = width * 0.5;
        targetY = height * 0.45;
        currentX = targetX;
        currentY = targetY;
      }
    }

    resize();
    window.addEventListener('resize', resize);

    // Global pointer listeners — coordinates reach canvas even when container has pointer-events: none
    function handlePointerMove(e: PointerEvent | MouseEvent) {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const clientX = e.clientX - rect.left;
      const clientY = e.clientY - rect.top;

      // Invert Y coordinate for WebGL viewport
      targetX = clientX * dpr;
      targetY = (rect.height - clientY) * dpr;
      isPointerActive = true;
    }

    function handlePointerLeave() {
      // Return gracefully to subtle center ambient state
      targetX = width * 0.5;
      targetY = height * 0.5;
      isPointerActive = false;
    }

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerleave', handlePointerLeave, { passive: true });
    window.addEventListener('scroll', resize, { passive: true });

    // Render loop
    let animId: number;
    let startTime = performance.now();

    function render() {
      const now = performance.now();
      const elapsed = (now - startTime) / 1000;

      // Smooth damping interpolation (lerp)
      currentX += (targetX - currentX) * 0.08;
      currentY += (targetY - currentY) * 0.08;

      // When idle, add subtle orbital breathing
      let renderX = currentX;
      let renderY = currentY;
      if (!isPointerActive) {
        renderX += Math.cos(elapsed * 0.5) * (width * 0.08);
        renderY += Math.sin(elapsed * 0.4) * (height * 0.06);
      }

      gl?.useProgram(program);
      gl?.uniform2f(uResolution, width, height);
      gl?.uniform2f(uMouse, renderX, renderY);
      gl?.uniform1f(uTime, elapsed);

      gl?.clearColor(0.0, 0.0, 0.0, 0.0);
      gl?.clear(gl.COLOR_BUFFER_BIT);

      gl?.drawArrays(gl.TRIANGLES, 0, 6);

      animId = requestAnimationFrame(render);
    }

    animId = requestAnimationFrame(render);

    // Cleanup on unmount
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerleave', handlePointerLeave);
      window.removeEventListener('scroll', resize);

      if (gl) {
        gl.deleteBuffer(vertexBuffer);
        gl.deleteShader(vs);
        gl.deleteShader(fs);
        gl.deleteProgram(program);
      }
    };
  }, [palette, intensity, speed]);

  return (
    <canvas
      ref={canvasRef}
      className={`h-full w-full block ${className}`}
      style={{ touchAction: 'none' }}
    />
  );
}

