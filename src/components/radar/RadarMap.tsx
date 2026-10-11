'use client';

import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Compass,
  Crosshair,
  Globe2,
  Info,
  Layers,
  Minus,
  Navigation,
  Plus,
  RotateCcw,
  ShieldAlert,
} from 'lucide-react';
import { CategoryKey, Disruption, SeverityKey, categoryMeta, severityOf } from '@/lib/disruptions';
import { resolveLocation, ResolvedLocation } from '@/lib/locationMapping';
import { REFERENCE_CORRIDORS, ReferenceCorridor } from '@/lib/referenceCorridors';
import {
  LATITUDE_GRATICULES,
  LONGITUDE_GRATICULES,
  MAP_HEIGHT,
  MAP_WIDTH,
  WORLD_LAND_PATHS,
  geoToMap,
  mapToGeo,
} from './mapGeometry';
import { cn } from '@/components/ui/cn';
import { decodeEntities } from '@/lib/text';

export type MapItem = Disruption & {
  bucket: CategoryKey;
  resolvedLoc: ResolvedLocation;
  mapX: number;
  mapY: number;
};

interface RadarMapProps {
  disruptions: (Disruption & { bucket: CategoryKey })[];
  selectedId: string | null;
  onSelectDisruption: (item: Disruption & { bucket: CategoryKey }) => void;
  showCorridors?: boolean;
  onToggleCorridors?: () => void;
  className?: string;
}

const SEVERITY_COLORS: Record<SeverityKey, { fill: string; stroke: string; glow: string; text: string }> = {
  critical: { fill: '#FFFFFF', stroke: '#FFFFFF', glow: 'rgba(255, 255, 255, 0.40)', text: '#FFFFFF' },
  high: { fill: '#E4E4E7', stroke: '#FFFFFF', glow: 'rgba(255, 255, 255, 0.28)', text: '#F4F4F5' },
  medium: { fill: '#A1A1AA', stroke: '#E4E4E7', glow: 'rgba(255, 255, 255, 0.16)', text: '#D4D4D8' },
  low: { fill: '#52525B', stroke: '#71717A', glow: 'rgba(255, 255, 255, 0.08)', text: '#A1A1AA' },
};

/** Key reference ports shown as subtle geographical anchor labels */
const REFERENCE_PORT_ANCHORS = [
  { name: 'Rotterdam', lat: 51.9, lng: 4.5 },
  { name: 'Suez Canal', lat: 30.0, lng: 32.5 },
  { name: 'Bab-el-Mandeb', lat: 12.6, lng: 43.4 },
  { name: 'Strait of Hormuz', lat: 26.5, lng: 56.4 },
  { name: 'Mumbai / JNPT', lat: 18.9, lng: 72.9 },
  { name: 'Strait of Malacca', lat: 1.4, lng: 103.8 },
  { name: 'Shanghai', lat: 31.2, lng: 121.5 },
  { name: 'Taiwan Strait', lat: 24.5, lng: 120.5 },
  { name: 'Tokyo Bay', lat: 35.4, lng: 139.7 },
  { name: 'Panama Canal', lat: 9.1, lng: -79.7 },
  { name: 'LA / Long Beach', lat: 33.7, lng: -118.2 },
  { name: 'NY / New Jersey', lat: 40.7, lng: -74.0 },
];

/** Antimeridian-aware SVG path generator for corridor polylines */
function buildCorridorSvgPaths(waypoints: [number, number][]): string[] {
  const segments: [number, number][][] = [];
  let current: [number, number][] = [];

  for (let i = 0; i < waypoints.length; i++) {
    const [lat, lng] = waypoints[i];
    if (current.length === 0) {
      current.push([lat, lng]);
      continue;
    }

    const [prevLat, prevLng] = current[current.length - 1];

    if (Math.abs(lng - prevLng) > 180) {
      if (prevLng > 0 && lng < 0) {
        const t = (180 - prevLng) / (180 - prevLng + (lng - -180));
        const midLat = prevLat + t * (lat - prevLat);
        current.push([midLat, 180]);
        segments.push(current);
        current = [[midLat, -180], [lat, lng]];
      } else if (prevLng < 0 && lng > 0) {
        const t = (-180 - prevLng) / (-180 - prevLng + (lng - 180));
        const midLat = prevLat + t * (lat - prevLat);
        current.push([midLat, -180]);
        segments.push(current);
        current = [[midLat, 180], [lat, lng]];
      } else {
        segments.push(current);
        current = [[lat, lng]];
      }
    } else {
      current.push([lat, lng]);
    }
  }

  if (current.length > 0) {
    segments.push(current);
  }

  return segments.map((seg) => {
    return (
      'M ' +
      seg
        .map(([lat, lng]) => {
          const { x, y } = geoToMap(lat, lng);
          return `${x.toFixed(1)},${y.toFixed(1)}`;
        })
        .join(' L ')
    );
  });
}

export function RadarMap({
  disruptions,
  selectedId,
  onSelectDisruption,
  showCorridors = true,
  onToggleCorridors,
  className,
}: RadarMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Transform state: zoom and pan offsets
  const [zoom, setZoom] = useState(1.0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  // Floating inspection tooltip state
  const [hoveredItem, setHoveredItem] = useState<MapItem | null>(null);
  const [hoveredCorridor, setHoveredCorridor] = useState<ReferenceCorridor | null>(null);
  const [cursorGeo, setCursorGeo] = useState<{ lat: number; lng: number } | null>(null);

  // Layer toggles
  const [localCorridorsVisible, setLocalCorridorsVisible] = useState(true);
  const corridorsVisible = onToggleCorridors ? showCorridors : localCorridorsVisible;
  const toggleCorridors = () => {
    if (onToggleCorridors) onToggleCorridors();
    else setLocalCorridorsVisible((v) => !v);
  };
  const [graticulesVisible, setGraticulesVisible] = useState(true);
  const [anchorsVisible, setAnchorsVisible] = useState(true);
  const [layersMenuOpen, setLayersMenuOpen] = useState(false);

  /* ------------------------------------------------------------------ */
  /* Map Mappable Items with Jitter for Overlapping Pins                 */
  /* ------------------------------------------------------------------ */

  const mappableItems: MapItem[] = useMemo(() => {
    // Group by coordinate key to jitter slightly if overlapping
    const coordBuckets = new Map<string, (Disruption & { bucket: CategoryKey; resolvedLoc: ResolvedLocation })[]>();

    for (const d of disruptions) {
      const loc = resolveLocation(d.location);
      if (loc.mapped) {
        const key = `${loc.lat.toFixed(2)},${loc.lng.toFixed(2)}`;
        const list = coordBuckets.get(key) ?? [];
        list.push({ ...d, resolvedLoc: loc });
        coordBuckets.set(key, list);
      }
    }

    const items: MapItem[] = [];

    coordBuckets.forEach((bucketList) => {
      const count = bucketList.length;
      bucketList.forEach((item, idx) => {
        if (!item.resolvedLoc.mapped) return;

        // Apply a gentle radial offset if multiple signals map to the same port
        let lat = item.resolvedLoc.lat;
        let lng = item.resolvedLoc.lng;

        if (count > 1) {
          const angle = (idx / count) * 2 * Math.PI;
          const radius = Math.min(2.5, 0.9 * (count - 1));
          lat += Math.sin(angle) * (radius * 0.7);
          lng += (Math.cos(angle) * radius) / Math.cos((lat * Math.PI) / 180);
        }

        const { x, y } = geoToMap(lat, lng);
        items.push({
          ...item,
          mapX: x,
          mapY: y,
        });
      });
    });

    return items;
  }, [disruptions]);

  /* ------------------------------------------------------------------ */
  /* Pan & Zoom Controls with Clamping                                  */
  /* ------------------------------------------------------------------ */

  const clampZoom = (z: number) => Math.max(0.85, Math.min(5.5, z));

  const handleZoom = useCallback(
    (delta: number, focalPoint?: { clientX: number; clientY: number }) => {
      setZoom((prevZoom) => {
        const nextZoom = clampZoom(prevZoom * (1 + delta));
        if (focalPoint && containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          const cx = focalPoint.clientX - rect.left - rect.width / 2;
          const cy = focalPoint.clientY - rect.top - rect.height / 2;
          const scaleChange = nextZoom / prevZoom;

          setPan((prevPan) => ({
            x: cx - (cx - prevPan.x) * scaleChange,
            y: cy - (cy - prevPan.y) * scaleChange,
          }));
        }
        return nextZoom;
      });
    },
    [],
  );

  const resetView = useCallback(() => {
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
    setHoveredItem(null);
  }, []);

  const focusIndoPacific = useCallback(() => {
    // Indo-Pacific center: Lat ~15°N, Lng ~95°E
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const { x, y } = geoToMap(15, 95);
    const targetZoom = 2.4;

    // Center point in SVG (x, y) relative to map center
    const svgCenterX = MAP_WIDTH / 2;
    const svgCenterY = MAP_HEIGHT / 2;
    const scale = (rect.width / MAP_WIDTH) * targetZoom;

    setZoom(targetZoom);
    setPan({
      x: -(x - svgCenterX) * scale,
      y: -(y - svgCenterY) * scale,
    });
  }, []);

  const focusAtlanticEurope = useCallback(() => {
    // Europe/Atlantic: Lat ~45°N, Lng ~0°
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const { x, y } = geoToMap(45, 0);
    const targetZoom = 2.2;
    const scale = (rect.width / MAP_WIDTH) * targetZoom;

    setZoom(targetZoom);
    setPan({
      x: -(x - MAP_WIDTH / 2) * scale,
      y: -(y - MAP_HEIGHT / 2) * scale,
    });
  }, []);

  const focusAmericasPanama = useCallback(() => {
    // Americas / Panama: Lat ~15°N, Lng ~-85°W
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const { x, y } = geoToMap(15, -85);
    const targetZoom = 2.0;
    const scale = (rect.width / MAP_WIDTH) * targetZoom;

    setZoom(targetZoom);
    setPan({
      x: -(x - MAP_WIDTH / 2) * scale,
      y: -(y - MAP_HEIGHT / 2) * scale,
    });
  }, []);

  /* ------------------------------------------------------------------ */
  /* Mouse & Touch Drag Handlers                                        */
  /* ------------------------------------------------------------------ */

  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button, [data-interactive="true"]')) return;
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      panX: pan.x,
      panY: pan.y,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const clientX = e.clientX - rect.left;
      const clientY = e.clientY - rect.top;

      // Calculate geographic coordinates under cursor
      const svgScale = (rect.width / MAP_WIDTH) * zoom;
      const svgCenterX = rect.width / 2 + pan.x;
      const svgCenterY = rect.height / 2 + pan.y;

      const mapSvgX = (clientX - svgCenterX) / svgScale + MAP_WIDTH / 2;
      const mapSvgY = (clientY - svgCenterY) / svgScale + MAP_HEIGHT / 2;

      if (mapSvgX >= 0 && mapSvgX <= MAP_WIDTH && mapSvgY >= 0 && mapSvgY <= MAP_HEIGHT) {
        const geo = mapToGeo(mapSvgX, mapSvgY);
        setCursorGeo(geo);
      } else {
        setCursorGeo(null);
      }
    }

    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setPan({
      x: dragStartRef.current.panX + dx,
      y: dragStartRef.current.panY + dy,
    });
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (isDragging) {
      setIsDragging(false);
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    }
  };

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = -e.deltaY * 0.0018;
    handleZoom(delta, { clientX: e.clientX, clientY: e.clientY });
  };

  // Keyboard Navigation
  const onKeyDown = (e: React.KeyboardEvent) => {
    const step = 60;
    if (e.key === 'ArrowLeft') setPan((p) => ({ ...p, x: p.x + step }));
    else if (e.key === 'ArrowRight') setPan((p) => ({ ...p, x: p.x - step }));
    else if (e.key === 'ArrowUp') setPan((p) => ({ ...p, y: p.y + step }));
    else if (e.key === 'ArrowDown') setPan((p) => ({ ...p, y: p.y - step }));
    else if (e.key === '+' || e.key === '=') handleZoom(0.25);
    else if (e.key === '-' || e.key === '_') handleZoom(-0.25);
    else if (e.key === 'Home') resetView();
  };

  return (
    <div
      ref={containerRef}
      role="region"
      aria-label="Interactive Global Supply Chain Risk Map"
      tabIndex={0}
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onWheel={onWheel}
      className={cn(
        'relative h-full w-full select-none overflow-hidden outline-none bg-[#060a08]',
        isDragging ? 'cursor-grabbing' : 'cursor-grab',
        className,
      )}
    >
      {/* ------------------------------------------------------------- */}
      {/* Deep Ocean Ambient Gradients                                   */}
      {/* ------------------------------------------------------------- */}
      <div
        className="pointer-events-none absolute inset-0 opacity-80"
        style={{
          background:
            'radial-gradient(circle at 50% 45%, rgba(18, 30, 25, 0.22) 0%, rgba(7, 12, 10, 0.85) 60%, #050807 100%)',
        }}
      />

      {/* ------------------------------------------------------------- */}
      {/* Vector Map SVG Canvas                                         */}
      {/* ------------------------------------------------------------- */}
      <div
        className="absolute inset-0 flex items-center justify-center transition-transform duration-75 ease-out will-change-transform"
        style={{
          transform: `translate3d(${pan.x}px, ${pan.y}px, 0px) scale(${zoom})`,
          transformOrigin: 'center center',
        }}
      >
        <svg
          viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
          width={MAP_WIDTH}
          height={MAP_HEIGHT}
          className="h-auto w-full max-w-none overflow-visible"
        >
          <defs>
            {/* Pulsing Beacon Animation Glow Filter */}
            <filter id="beacon-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="corridor-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2.0" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Graticule Grid (Latitude lines) */}
          {graticulesVisible && (
            <g className="transition-opacity duration-300">
              {LATITUDE_GRATICULES.map((g) => (
                <line
                  key={`lat-${g.lat}`}
                  x1={0}
                  y1={g.y}
                  x2={MAP_WIDTH}
                  y2={g.y}
                  stroke={g.isEquator ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.04)'}
                  strokeWidth={g.isEquator ? 1.2 : 0.7}
                  strokeDasharray={g.isEquator ? undefined : '4,4'}
                />
              ))}
              {LONGITUDE_GRATICULES.map((g) => (
                <line
                  key={`lng-${g.lng}`}
                  x1={g.x}
                  y1={0}
                  x2={g.x}
                  y2={MAP_HEIGHT}
                  stroke={g.isPrimeMeridian ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.04)'}
                  strokeWidth={g.isPrimeMeridian ? 1.2 : 0.7}
                  strokeDasharray={g.isPrimeMeridian ? undefined : '4,4'}
                />
              ))}
            </g>
          )}

          {/* Continental Landmass Polygons */}
          <g>
            {WORLD_LAND_PATHS.map((d, i) => (
              <path
                key={i}
                d={d}
                fill="#121217"
                stroke="#1e1e26"
                strokeWidth={1.0 / Math.sqrt(zoom)}
                strokeLinejoin="round"
                className="transition-colors hover:fill-[#181822]"
              />
            ))}
          </g>

          {/* Reference Trade Corridors (Toggleable Layer) */}
          {corridorsVisible && (
            <g className="transition-opacity duration-300">
              {REFERENCE_CORRIDORS.map((corridor) => {
                const paths = buildCorridorSvgPaths(corridor.waypoints);
                const isHovered = hoveredCorridor?.id === corridor.id;

                return (
                  <g
                    key={corridor.id}
                    data-interactive="true"
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredCorridor(corridor)}
                    onMouseLeave={() => setHoveredCorridor((curr) => (curr?.id === corridor.id ? null : curr))}
                    onClick={() => {
                      if (onToggleCorridors) onToggleCorridors();
                    }}
                  >
                    {/* Invisible Wide Hitbox */}
                    {paths.map((p, pIdx) => (
                      <path
                        key={`hitbox-${corridor.id}-${pIdx}`}
                        d={p}
                        fill="none"
                        stroke="transparent"
                        strokeWidth={16 / Math.sqrt(zoom)}
                      />
                    ))}

                    {/* Glowing Route Trace - Monochrome Silver/White */}
                    {paths.map((p, pIdx) => (
                      <path
                        key={`glow-${corridor.id}-${pIdx}`}
                        d={p}
                        fill="none"
                        stroke={isHovered ? 'rgba(255, 255, 255, 0.95)' : 'rgba(255, 255, 255, 0.55)'}
                        strokeWidth={(isHovered ? 3.0 : 1.8) / Math.sqrt(zoom)}
                        strokeOpacity={isHovered ? 1.0 : 0.65}
                        strokeDasharray="6,4"
                        filter="url(#corridor-glow)"
                      />
                    ))}

                    {/* Waypoint Dots */}
                    {corridor.waypoints.map(([lat, lng], wIdx) => {
                      const { x, y } = geoToMap(lat, lng);
                      return (
                        <circle
                          key={`pt-${corridor.id}-${wIdx}`}
                          cx={x}
                          cy={y}
                          r={(isHovered ? 3.0 : 2.0) / Math.sqrt(zoom)}
                          fill="#FFFFFF"
                          opacity={isHovered ? 1.0 : 0.7}
                        />
                      );
                    })}
                  </g>
                );
              })}
            </g>
          )}

          {/* Strategic Port & Chokepoint Anchor Labels */}
          {anchorsVisible && (
            <g className="pointer-events-none transition-opacity duration-300">
              {REFERENCE_PORT_ANCHORS.map((anchor) => {
                const { x, y } = geoToMap(anchor.lat, anchor.lng);
                return (
                  <g key={anchor.name} transform={`translate(${x}, ${y})`}>
                    <circle r={2.0 / Math.sqrt(zoom)} fill="rgba(255, 255, 255, 0.35)" />
                    <text
                      x={5 / Math.sqrt(zoom)}
                      y={3 / Math.sqrt(zoom)}
                      fill="rgba(244, 244, 245, 0.65)"
                      fontSize={Math.max(8, 10 / Math.sqrt(zoom))}
                      fontFamily="system-ui, -apple-system, sans-serif"
                      fontWeight="500"
                      className="tracking-wider uppercase select-none"
                    >
                      {anchor.name}
                    </text>
                  </g>
                );
              })}
            </g>
          )}

          {/* Disruption Risk Markers */}
          <g>
            {mappableItems.map((item) => {
              const sev = severityOf(item.severity);
              const colors = SEVERITY_COLORS[sev];
              const isSelected = selectedId === item.id;
              const isHovered = hoveredItem?.id === item.id;
              const isCritical = sev === 'critical';

              // Base radius scaled inversely to zoom so pins remain finger-accessible
              const baseR = (isSelected ? 9.0 : isHovered ? 7.5 : 5.5) / Math.sqrt(zoom);

              return (
                <g
                  key={item.id}
                  data-interactive="true"
                  transform={`translate(${item.mapX}, ${item.mapY})`}
                  className="cursor-pointer transition-transform duration-200"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectDisruption(item);
                  }}
                  onMouseEnter={() => setHoveredItem(item)}
                  onMouseLeave={() => setHoveredItem((curr) => (curr?.id === item.id ? null : curr))}
                >
                  {/* Expanding Pulsing Ring for Critical / High disruptions */}
                  {isCritical && (
                    <circle
                      r={baseR * 2.2}
                      fill="none"
                      stroke="#FFFFFF"
                      strokeWidth={1.5 / Math.sqrt(zoom)}
                      opacity={0.7}
                      className="animate-ping origin-center"
                    />
                  )}

                  {/* Selected Reticle Target Ring - Monochrome Crisp White */}
                  {isSelected && (
                    <>
                      <circle
                        r={baseR * 2.6}
                        fill="none"
                        stroke="#FFFFFF"
                        strokeWidth={1.8 / Math.sqrt(zoom)}
                        strokeDasharray="4,3"
                        className="animate-spin origin-center"
                        style={{ animationDuration: '8s' }}
                      />
                      <circle
                        r={baseR * 1.8}
                        fill="rgba(255, 255, 255, 0.15)"
                        stroke="#FFFFFF"
                        strokeWidth={1.2 / Math.sqrt(zoom)}
                      />
                    </>
                  )}

                  {/* Outer Glow Halo */}
                  <circle
                    r={baseR * 1.4}
                    fill={colors.glow}
                    filter="url(#beacon-glow)"
                  />

                  {/* Core Marker Disc */}
                  <circle
                    r={baseR}
                    fill={colors.fill}
                    stroke="#060a08"
                    strokeWidth={2.0 / Math.sqrt(zoom)}
                  />

                  {/* Center Specular Glint */}
                  <circle
                    r={baseR * 0.35}
                    fill="#FFFFFF"
                    opacity={0.9}
                  />
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Floating Hover Tooltip (Disruption Signal)                    */}
      {/* ------------------------------------------------------------- */}
      {hoveredItem && (
        <div
          className="pointer-events-none absolute left-6 top-6 z-30 max-w-sm rounded-2xl liquid-glass-strong p-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="flex items-center gap-2">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: SEVERITY_COLORS[severityOf(hoveredItem.severity)].fill }}
            />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-white">
              {hoveredItem.severity ?? 'Medium'} Risk
            </span>
            <span className="text-white/40">·</span>
            <span className="text-[12px] text-white/70">{categoryMeta(hoveredItem.bucket).short}</span>
          </div>

          <h4 className="mt-2 text-[14px] font-medium leading-snug text-white">
            {decodeEntities(hoveredItem.title)}
          </h4>

          {hoveredItem.resolvedLoc.mapped && (
            <div className="mt-2 flex items-center gap-1.5 text-[12px] text-white/90">
              <Crosshair className="h-3 w-3 shrink-0 text-white/70" />
              <span>{hoveredItem.resolvedLoc.precisionLabel}</span>
              <span className="text-white/50">({hoveredItem.resolvedLoc.normalizedName})</span>
            </div>
          )}

          <p className="mt-1.5 line-clamp-2 text-[12px] leading-relaxed text-white/70">
            {decodeEntities(hoveredItem.description || hoveredItem.impact || '')}
          </p>

          <p className="mt-2.5 text-[11px] font-medium text-white/90">
            Click marker to open full strategic dossier →
          </p>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* Floating Hover Tooltip (Reference Corridor)                   */}
      {/* ------------------------------------------------------------- */}
      {hoveredCorridor && !hoveredItem && (
        <div
          className="pointer-events-none absolute left-6 top-6 z-30 max-w-sm rounded-2xl liquid-glass-strong p-4 shadow-2xl animate-in fade-in duration-150"
        >
          <div className="flex items-center gap-2">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full bg-white"
            />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-white">
              Reference Trade Corridor
            </span>
          </div>

          <h4 className="mt-1.5 text-[14px] font-medium text-white">
            {hoveredCorridor.name}
          </h4>

          <div className="mt-2.5 space-y-1 text-[12px] text-white/80">
            <p>
              <strong className="text-white font-medium">Annual Volume:</strong> {hoveredCorridor.annualVolume}
            </p>
            <p>
              <strong className="text-white font-medium">Vulnerability:</strong> {hoveredCorridor.riskProfile}
            </p>
          </div>

          <div className="mt-2.5 flex items-center gap-1.5 rounded-lg bg-white/[0.04] border border-white/5 px-2.5 py-1.5 text-[11px] text-white/60">
            <Info className="h-3 w-3 shrink-0 text-white/50" />
            <span>{hoveredCorridor.disclaimer}</span>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* Strategic Preset Navigator (Indo-Pacific, Europe, Americas)     */}
      {/* ------------------------------------------------------------- */}
      <div className="absolute left-4 top-4 z-20 hidden md:flex items-center gap-1.5 rounded-xl liquid-glass p-1 shadow-lg shadow-black/40">
        <button
          type="button"
          onClick={focusIndoPacific}
          title="Focus Indo-Pacific Manufacturing & Malacca Corridor"
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-white/80 transition-colors hover:bg-white/[0.08] hover:text-white"
        >
          <Navigation className="h-3.5 w-3.5 text-white rotate-45" />
          Indo-Pacific
        </button>
        <button
          type="button"
          onClick={focusAtlanticEurope}
          title="Focus Trans-Atlantic & European Gateways"
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-white/60 transition-colors hover:bg-white/[0.08] hover:text-white"
        >
          <Globe2 className="h-3.5 w-3.5 text-white/60" />
          Europe / Suez
        </button>
        <button
          type="button"
          onClick={focusAmericasPanama}
          title="Focus Americas & Panama Corridor"
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-white/60 transition-colors hover:bg-white/[0.08] hover:text-white"
        >
          <Compass className="h-3.5 w-3.5 text-white/60" />
          Americas / Panama
        </button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Zoom & Extent Control Stack (Top Right)                       */}
      {/* ------------------------------------------------------------- */}
      <div className="absolute right-4 top-4 z-20 flex flex-col gap-1.5">
        <div className="flex flex-col rounded-xl liquid-glass p-1 shadow-lg shadow-black/40">
          <button
            type="button"
            onClick={() => handleZoom(0.3)}
            aria-label="Zoom in"
            title="Zoom in (+)"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-white/80 transition-colors hover:bg-white/[0.08] hover:text-white"
          >
            <Plus className="h-4 w-4" />
          </button>
          <div className="my-0.5 h-px bg-white/10" />
          <button
            type="button"
            onClick={() => handleZoom(-0.3)}
            aria-label="Zoom out"
            title="Zoom out (-)"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-white/80 transition-colors hover:bg-white/[0.08] hover:text-white"
          >
            <Minus className="h-4 w-4" />
          </button>
        </div>

        <button
          type="button"
          onClick={resetView}
          aria-label="Reset world extent"
          title="Reset world view (Home)"
          className="flex h-9 w-9 items-center justify-center rounded-xl liquid-glass text-white/80 shadow-lg shadow-black/40 transition-colors hover:bg-white/[0.08] hover:text-white"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>

        {/* Layers Popover Toggle */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setLayersMenuOpen((v) => !v)}
            aria-label="Toggle map layers"
            title="Map layers"
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-xl liquid-glass text-white/80 shadow-lg shadow-black/40 transition-colors hover:bg-white/[0.08] hover:text-white',
              layersMenuOpen && 'border-white/30 text-white bg-white/10',
            )}
          >
            <Layers className="h-4 w-4" />
          </button>

          {layersMenuOpen && (
            <div className="absolute right-0 top-11 z-30 w-56 rounded-2xl liquid-glass-strong p-3 shadow-2xl">
              <p className="text-[11px] font-mono font-medium uppercase tracking-wider text-white/60">
                Map Layers
              </p>
              <div className="mt-2.5 space-y-2 text-[13px]">
                <label className="flex cursor-pointer items-center justify-between text-white/80 hover:text-white">
                  <span>Trade Corridors</span>
                  <input
                    type="checkbox"
                    checked={corridorsVisible}
                    onChange={toggleCorridors}
                    className="accent-white rounded"
                  />
                </label>
                <label className="flex cursor-pointer items-center justify-between text-white/80 hover:text-white">
                  <span>Strategic Ports</span>
                  <input
                    type="checkbox"
                    checked={anchorsVisible}
                    onChange={(e) => setAnchorsVisible(e.target.checked)}
                    className="accent-white rounded"
                  />
                </label>
                <label className="flex cursor-pointer items-center justify-between text-white/80 hover:text-white">
                  <span>Graticule Grid</span>
                  <input
                    type="checkbox"
                    checked={graticulesVisible}
                    onChange={(e) => setGraticulesVisible(e.target.checked)}
                    className="accent-white rounded"
                  />
                </label>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Bottom Telemetry & Coordinate Strip                           */}
      {/* ------------------------------------------------------------- */}
      <div className="pointer-events-none absolute bottom-3 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-2 text-[11px]">
        {/* Real-time Cursor Coordinates */}
        <div className="flex items-center gap-2 rounded-xl liquid-glass px-3 py-1.5 shadow-lg text-white/60">
          <Crosshair className="h-3 w-3 text-white/80" />
          <span className="text-white/90">
            {cursorGeo
              ? `${Math.abs(cursorGeo.lat).toFixed(1)}°${cursorGeo.lat >= 0 ? 'N' : 'S'}, ${Math.abs(cursorGeo.lng).toFixed(1)}°${cursorGeo.lng >= 0 ? 'E' : 'W'}`
              : 'Pan & scroll to inspect global maritime lanes'}
          </span>
          <span className="text-white/30">·</span>
          <span>Zoom: {(zoom * 100).toFixed(0)}%</span>
        </div>

        {/* Telemetry Honesty Watermark */}
        <div className="flex items-center gap-1.5 rounded-xl liquid-glass px-3 py-1.5 shadow-lg text-white/60">
          <ShieldAlert className="h-3 w-3 text-white/50" />
          <span>≈ Strategic port & corridor geometry references · No live vessel AIS</span>
        </div>
      </div>
    </div>
  );
}

