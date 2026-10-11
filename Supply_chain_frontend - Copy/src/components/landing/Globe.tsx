'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  LAND_POINTS,
  LAND_OUTLINES,
  STRATEGIC_NODES,
  TRADE_CORRIDORS,
  type SupplyNode,
} from './globeData';

export interface GlobeProps {
  className?: string;
  onSelectNode?: (node: SupplyNode | null) => void;
}

interface ActiveTooltip {
  node: SupplyNode;
  x: number;
  y: number;
}

export function Globe({ className = '', onSelectNode }: GlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [activeTooltip, setActiveTooltip] = useState<ActiveTooltip | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    // --- 1. Scene, Camera, Renderer ---
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    camera.position.z = 2.60;

    let renderer: THREE.WebGLRenderer | null = null;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance',
      });
    } catch (e) {
      console.error('WebGL not supported or context lost:', e);
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    // Master globe container group for rotation
    const globeGroup = new THREE.Group();
    // Default pleasant camera pitch angle showcasing Northern Hemisphere trade routes
    globeGroup.rotation.x = 0.32;
    // Initial rotation presenting Eurasia / Indo-Pacific corridor
    globeGroup.rotation.y = -1.6;
    scene.add(globeGroup);

    const GLOBE_RADIUS = 1.0;

    // --- 2. Ocean Core Sphere ---
    // Deep midnight charcoal ocean base harmonized with Bloom Liquid-Glass
    const oceanGeo = new THREE.SphereGeometry(GLOBE_RADIUS * 0.994, 64, 64);
    const oceanMat = new THREE.MeshBasicMaterial({
      color: 0x08080c,
      transparent: true,
      opacity: 0.96,
    });
    const oceanMesh = new THREE.Mesh(oceanGeo, oceanMat);
    globeGroup.add(oceanMesh);

    // Subtle atmospheric rim glow (backface halo) harmonized with silver/white highlights
    const haloGeo = new THREE.SphereGeometry(GLOBE_RADIUS * 1.018, 64, 64);
    const haloMat = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        void main() {
          float intensity = pow(0.68 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.6);
          gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0) * intensity * 0.35;
        }
      `,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
    });
    const haloMesh = new THREE.Mesh(haloGeo, haloMat);
    scene.add(haloMesh);

    // --- 3. Latitude & Longitude Precision Grid ---
    const gridGroup = new THREE.Group();
    const gridMat = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.04,
    });

    // Latitude circles: -60, -30, 0 (Equator), 30, 60
    const lats = [-60, -30, 0, 30, 60];
    for (const lat of lats) {
      const phi = (90 - lat) * (Math.PI / 180);
      const r = Math.sin(phi) * GLOBE_RADIUS * 0.998;
      const y = Math.cos(phi) * GLOBE_RADIUS * 0.998;
      const segments = 64;
      const points: THREE.Vector3[] = [];
      for (let i = 0; i <= segments; i++) {
        const theta = (i / segments) * Math.PI * 2;
        points.push(new THREE.Vector3(Math.cos(theta) * r, y, Math.sin(theta) * r));
      }
      const ringGeo = new THREE.BufferGeometry().setFromPoints(points);
      const ring = new THREE.Line(ringGeo, gridMat);
      gridGroup.add(ring);
    }

    // Longitude meridians (every 30 degrees)
    for (let deg = 0; deg < 180; deg += 30) {
      const segments = 64;
      const points: THREE.Vector3[] = [];
      const rad = (deg * Math.PI) / 180;
      for (let i = 0; i <= segments; i++) {
        const theta = (i / segments) * Math.PI * 2;
        const x = Math.sin(theta) * Math.cos(rad) * GLOBE_RADIUS * 0.998;
        const y = Math.cos(theta) * GLOBE_RADIUS * 0.998;
        const z = Math.sin(theta) * Math.sin(rad) * GLOBE_RADIUS * 0.998;
        points.push(new THREE.Vector3(x, y, z));
      }
      const meridianGeo = new THREE.BufferGeometry().setFromPoints(points);
      const meridian = new THREE.Line(meridianGeo, gridMat);
      gridGroup.add(meridian);
    }
    globeGroup.add(gridGroup);

    // --- 4. Dotted Landmass Representation ---
    // Pale mint / warm off-white dots (#DCE8DF)
    const dotCount = LAND_POINTS.length;
    const positions = new Float32Array(dotCount * 3);
    const colors = new Float32Array(dotCount * 3);

    // Soft palette tones - Pure silver/white monochrome
    const baseColor = new THREE.Color(0xffffff);
    const accentDotColor = new THREE.Color(0xd0d0d0);

    for (let i = 0; i < dotCount; i++) {
      const [ux, uy, uz] = LAND_POINTS[i];
      // Slightly push dots above ocean surface
      positions[i * 3 + 0] = ux * GLOBE_RADIUS * 1.002;
      positions[i * 3 + 1] = uy * GLOBE_RADIUS * 1.002;
      positions[i * 3 + 2] = uz * GLOBE_RADIUS * 1.002;

      // Slight natural variation based on latitude for organic depth
      const t = Math.abs(uy);
      const c = baseColor.clone().lerp(accentDotColor, t * 0.45);
      colors[i * 3 + 0] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    const dotGeo = new THREE.BufferGeometry();
    dotGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    dotGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // Custom circle sprite texture to render anti-aliased round dots
    const dotCanvas = document.createElement('canvas');
    dotCanvas.width = 64;
    dotCanvas.height = 64;
    const dotCtx = dotCanvas.getContext('2d');
    if (dotCtx) {
      dotCtx.clearRect(0, 0, 64, 64);
      const radGrad = dotCtx.createRadialGradient(32, 32, 0, 32, 32, 30);
      radGrad.addColorStop(0, 'rgba(255, 255, 255, 1)');
      radGrad.addColorStop(0.65, 'rgba(255, 255, 255, 0.92)');
      radGrad.addColorStop(0.85, 'rgba(255, 255, 255, 0.45)');
      radGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      dotCtx.fillStyle = radGrad;
      dotCtx.beginPath();
      dotCtx.arc(32, 32, 30, 0, Math.PI * 2);
      dotCtx.fill();
    }
    const dotTexture = new THREE.CanvasTexture(dotCanvas);

    const dotMat = new THREE.PointsMaterial({
      size: 0.019,
      vertexColors: true,
      map: dotTexture,
      transparent: true,
      alphaTest: 0.03,
      opacity: 0.85,
      depthWrite: false,
    });
    const landDots = new THREE.Points(dotGeo, dotMat);
    globeGroup.add(landDots);

    // --- 5. Geographic Land Outlines ---
    const outlinesGroup = new THREE.Group();
    const outlineMat = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.10,
    });

    for (const ring of LAND_OUTLINES) {
      if (ring.length < 2) continue;
      const pts = ring.map(
        ([x, y, z]) => new THREE.Vector3(x * GLOBE_RADIUS * 1.001, y * GLOBE_RADIUS * 1.001, z * GLOBE_RADIUS * 1.001)
      );
      const ringGeo = new THREE.BufferGeometry().setFromPoints(pts);
      const line = new THREE.Line(ringGeo, outlineMat);
      outlinesGroup.add(line);
    }
    globeGroup.add(outlinesGroup);

    // Coordinate conversion helper
    function latLngToVec3(lat: number, lng: number, r: number) {
      const phi = (90 - lat) * (Math.PI / 180);
      const theta = (lng + 180) * (Math.PI / 180);
      return new THREE.Vector3(
        -r * Math.sin(phi) * Math.cos(theta),
        r * Math.cos(phi),
        r * Math.sin(phi) * Math.sin(theta)
      );
    }

    // --- 6. Strategic Supply Chain Node Markers ---
    const markersGroup = new THREE.Group();
    const interactiveMeshes: { mesh: THREE.Mesh; node: SupplyNode }[] = [];
    const pulseRings: { mesh: THREE.Mesh; baseScale: number; speed: number; phase: number }[] = [];

    const markerAnchorGeo = new THREE.SphereGeometry(0.012, 16, 16);
    const markerAnchorMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    // Subtle radar pulse ring geometry
    const ringGeo = new THREE.RingGeometry(0.016, 0.020, 32);

    for (const node of STRATEGIC_NODES) {
      const pos = latLngToVec3(node.lat, node.lng, GLOBE_RADIUS * 1.004);
      const isIndia = node.id === 'in-bom';

      // Core glowing anchor
      const anchorMesh = new THREE.Mesh(
        markerAnchorGeo,
        new THREE.MeshBasicMaterial({ color: 0xffffff })
      );
      anchorMesh.position.copy(pos);
      anchorMesh.userData = { node };
      markersGroup.add(anchorMesh);
      interactiveMeshes.push({ mesh: anchorMesh, node });

      // Outward pulse wave
      const pulseMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: isIndia ? 0.35 : 0.20,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const pulseMesh = new THREE.Mesh(ringGeo, pulseMat);
      pulseMesh.position.copy(pos.clone().multiplyScalar(1.002));
      // Align ring tangent to the sphere surface
      pulseMesh.lookAt(pos.clone().multiplyScalar(2));
      markersGroup.add(pulseMesh);

      pulseRings.push({
        mesh: pulseMesh,
        baseScale: 1.0,
        speed: isIndia ? 0.9 : 1.0 + Math.random() * 0.3,
        phase: Math.random() * Math.PI * 2,
      });
    }
    globeGroup.add(markersGroup);

    // --- 7. Trade Route Connection Arcs ---
    const nodeMap = new Map(STRATEGIC_NODES.map((n) => [n.id, n]));
    const arcsGroup = new THREE.Group();

    interface AnimatedArcPulse {
      curve: THREE.CatmullRomCurve3;
      pulseMesh: THREE.Mesh;
      speed: number;
      offset: number;
    }

    const animatedPulses: AnimatedArcPulse[] = [];
    const arcPulseGeo = new THREE.SphereGeometry(0.009, 12, 12);
    const arcPulseMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    const staticArcMat = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.12,
    });

    for (const corridor of TRADE_CORRIDORS) {
      const n1 = nodeMap.get(corridor.from);
      const n2 = nodeMap.get(corridor.to);
      if (!n1 || !n2) continue;

      const p1 = latLngToVec3(n1.lat, n1.lng, GLOBE_RADIUS * 1.004);
      const p2 = latLngToVec3(n2.lat, n2.lng, GLOBE_RADIUS * 1.004);

      // Elevated great-circle arc
      const dist = p1.distanceTo(p2);
      const mid = p1.clone().add(p2).multiplyScalar(0.5);
      const arcElevation = 1.0 + Math.min(0.25, Math.max(0.08, dist * 0.18));
      mid.normalize().multiplyScalar(GLOBE_RADIUS * arcElevation);

      const curve = new THREE.CatmullRomCurve3([p1, mid, p2]);
      const curvePoints = curve.getPoints(48);
      const curveGeo = new THREE.BufferGeometry().setFromPoints(curvePoints);
      const curveLine = new THREE.Line(curveGeo, staticArcMat);
      arcsGroup.add(curveLine);

      // Animated traveling pulse along the trade corridor
      const pulseMesh = new THREE.Mesh(arcPulseGeo, arcPulseMat);
      arcsGroup.add(pulseMesh);

      animatedPulses.push({
        curve,
        pulseMesh,
        speed: corridor.flowSpeed * 0.16,
        offset: Math.random(),
      });
    }
    globeGroup.add(arcsGroup);

    // --- 8. Interactivity (Dragging, Hover, Inertia, Raycasting) ---
    let isDragging = false;
    let isHovered = false;
    let prevMouseX = 0;
    let prevMouseY = 0;
    let rotationVelocityX = 0;
    let rotationVelocityY = 0.0014;
    const baseAutoRotation = 0.0012;

    const raycaster = new THREE.Raycaster();
    const mouseNDC = new THREE.Vector2(-999, -999);

    const onPointerDown = (e: PointerEvent) => {
      isDragging = true;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
      canvas.setPointerCapture(e.pointerId);
    };

    const onPointerMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      if (isDragging) {
        const deltaX = e.clientX - prevMouseX;
        const deltaY = e.clientY - prevMouseY;
        prevMouseX = e.clientX;
        prevMouseY = e.clientY;

        rotationVelocityY = deltaX * 0.004;
        rotationVelocityX = deltaY * 0.004;

        globeGroup.rotation.y += rotationVelocityY;
        globeGroup.rotation.x = Math.max(-0.65, Math.min(0.65, globeGroup.rotation.x + rotationVelocityX));
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      isDragging = false;
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {
        // Safe fallback
      }
    };

    const onPointerEnter = () => {
      isHovered = true;
    };

    const onPointerLeave = () => {
      isHovered = false;
      isDragging = false;
      mouseNDC.set(-999, -999);
      setActiveTooltip(null);
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp);
    canvas.addEventListener('pointerenter', onPointerEnter);
    canvas.addEventListener('pointerleave', onPointerLeave);

    // --- 9. Resizing ---
    const handleResize = () => {
      const rect = container.getBoundingClientRect();
      const w = Math.max(1, rect.width);
      const h = Math.max(1, rect.height);

      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer?.setSize(w, h, false);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);
    handleResize();

    // --- 10. Animation Loop & Lifecycle ---
    let animId = 0;
    let isIntersecting = true;
    const clock = new THREE.Clock();

    const loop = () => {
      clock.getDelta();
      const elapsed = clock.getElapsedTime();

      const prefersReducedMotion =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      // Inertia & Auto-Rotation
      if (!isDragging) {
        // Slow down slightly on hover; freeze auto-rotation if reduced motion requested
        const targetRot = prefersReducedMotion ? 0 : isHovered ? baseAutoRotation * 0.35 : baseAutoRotation;
        rotationVelocityY = rotationVelocityY * 0.94 + targetRot * 0.06;
        rotationVelocityX = rotationVelocityX * 0.90;

        globeGroup.rotation.y += rotationVelocityY;
        globeGroup.rotation.x += rotationVelocityX;
      }

      // Animate strategic marker radar pulse waves with restrained subtle expansion
      for (const ring of pulseRings) {
        const cycle = ((elapsed * ring.speed + ring.phase) % 1);
        const s = 1.0 + cycle * 0.35;
        ring.mesh.scale.set(s, s, s);
        (ring.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, (1 - cycle) * 0.22);
      }

      // Animate trade pulses along corridors
      for (const arc of animatedPulses) {
        const t = (elapsed * arc.speed + arc.offset) % 1;
        const pos = arc.curve.getPoint(t);
        arc.pulseMesh.position.copy(pos);
      }

      // Raycasting for interactive marker hover
      if (mouseNDC.x > -2 && mouseNDC.y > -2) {
        raycaster.setFromCamera(mouseNDC, camera);
        const intersects = raycaster.intersectObjects(
          interactiveMeshes.map((m) => m.mesh),
          false
        );

        if (intersects.length > 0) {
          canvas.style.cursor = 'pointer';
          const hit = intersects[0];
          const node = hit.object.userData.node as SupplyNode;

          // Convert hit 3D position to 2D screen coordinate for tooltip
          const screenPos = hit.point.clone().project(camera);
          const rect = canvas.getBoundingClientRect();
          const px = ((screenPos.x + 1) * 0.5) * rect.width;
          const py = ((-screenPos.y + 1) * 0.5) * rect.height;

          // Only show tooltip if marker is facing the camera (Z > 0 in camera space)
          const camSpacePos = hit.point.clone().applyMatrix4(camera.matrixWorldInverse);
          if (camSpacePos.z < 0) {
            setActiveTooltip({ node, x: px, y: py });
            onSelectNode?.(node);
          } else {
            setActiveTooltip(null);
          }
        } else {
          canvas.style.cursor = isDragging ? 'grabbing' : 'grab';
          setActiveTooltip(null);
        }
      }

      renderer?.render(scene, camera);
      animId = isIntersecting && !document.hidden ? requestAnimationFrame(loop) : 0;
    };

    const intersectionObserver = new IntersectionObserver(([entry]) => {
      isIntersecting = entry?.isIntersecting ?? true;
      if (isIntersecting && !animId) {
        clock.start();
        animId = requestAnimationFrame(loop);
      } else if (!isIntersecting && animId) {
        cancelAnimationFrame(animId);
        animId = 0;
      }
    });
    intersectionObserver.observe(container);

    const handleVisibility = () => {
      if (document.hidden && animId) {
        cancelAnimationFrame(animId);
        animId = 0;
      } else if (!document.hidden && isIntersecting && !animId) {
        clock.start();
        animId = requestAnimationFrame(loop);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    animId = requestAnimationFrame(loop);

    // --- Cleanup ---
    return () => {
      if (animId) cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      document.removeEventListener('visibilitychange', handleVisibility);

      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerUp);
      canvas.removeEventListener('pointerenter', onPointerEnter);
      canvas.removeEventListener('pointerleave', onPointerLeave);

      // Dispose geometries & materials
      oceanGeo.dispose();
      oceanMat.dispose();
      haloGeo.dispose();
      haloMat.dispose();
      dotGeo.dispose();
      dotMat.dispose();
      dotTexture.dispose();
      markerAnchorGeo.dispose();
      markerAnchorMat.dispose();
      ringGeo.dispose();
      arcPulseGeo.dispose();
      arcPulseMat.dispose();
      staticArcMat.dispose();
      gridMat.dispose();
      outlineMat.dispose();

      renderer?.dispose();
    };
  }, [onSelectNode]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full flex items-center justify-center select-none ${className}`}
      style={{ touchAction: 'none' }}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full block cursor-grab active:cursor-grabbing outline-none"
        aria-label="Interactive 3D Global Supply Chain Globe"
        role="img"
      />

      {/* Floating Node Inspection Tooltip */}
      {activeTooltip && (
        <div
          className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full pb-3 transition-transform duration-75"
          style={{
            left: `${activeTooltip.x}px`,
            top: `${activeTooltip.y}px`,
          }}
        >
          <div className="rounded-xl border border-white/20 liquid-glass-strong px-3 py-2 text-xs shadow-2xl backdrop-blur-xl">
            <div className="flex items-center gap-1.5 font-medium text-white">
              <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping" />
              <span>{activeTooltip.node.name}</span>
            </div>
            <p className="mt-0.5 text-[11px] text-white/60">{activeTooltip.node.hub}</p>
            <div className="mt-1 flex items-center gap-2 border-t border-white/10 pt-1 text-[10px] text-white/70">
              <span>Telemetry: Active</span>
              <span>•</span>
              <span>Corridor Node</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
