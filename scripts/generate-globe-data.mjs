import fs from 'fs';
import path from 'path';

async function generate() {
  console.log('Fetching Natural Earth 110m land data...');
  const res = await fetch('https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_land.geojson');
  if (!res.ok) throw new Error(`HTTP error ${res.status}`);
  const geojson = await res.json();

  function pointInPoly(pt, ring) {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const xi = ring[i][0], yi = ring[i][1];
      const xj = ring[j][0], yj = ring[j][1];
      const intersect = ((yi > pt[1]) !== (yj > pt[1])) &&
        (pt[0] < (xj - xi) * (pt[1] - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  function isLand(lng, lat) {
    const pt = [lng, lat];
    for (const f of geojson.features) {
      const geom = f.geometry;
      if (geom.type === 'Polygon') {
        if (pointInPoly(pt, geom.coordinates[0])) return true;
      } else if (geom.type === 'MultiPolygon') {
        for (const poly of geom.coordinates) {
          if (pointInPoly(pt, poly[0])) return true;
        }
      }
    }
    return false;
  }

  function latLngToUnit(lat, lng) {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lng + 180) * (Math.PI / 180);
    const x = -(Math.sin(phi) * Math.cos(theta));
    const y = Math.cos(phi);
    const z = Math.sin(phi) * Math.sin(theta);
    return [+x.toFixed(4), +y.toFixed(4), +z.toFixed(4)];
  }

  // Fibonacci sphere sampling
  const N = 36000;
  const landPoints = [];
  const phi = (1 + Math.sqrt(5)) / 2;
  for (let i = 0; i < N; i++) {
    const y = 1 - (i / (N - 1)) * 2;
    const radiusAtY = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = 2 * Math.PI * i / phi;
    const x = Math.cos(theta) * radiusAtY;
    const z = Math.sin(theta) * radiusAtY;

    // Convert (x, y, z) to lat, lng matching our standard orientation
    const lat = Math.asin(Math.max(-1, Math.min(1, y))) * (180 / Math.PI);
    const lng = Math.atan2(z, -x) * (180 / Math.PI) - 180;
    const normalizedLng = ((lng + 180) % 360) - 180;

    if (isLand(normalizedLng, lat)) {
      landPoints.push([+x.toFixed(4), +y.toFixed(4), +z.toFixed(4)]);
    }
  }

  console.log('Sampled land dots:', landPoints.length);

  // Coastline polygons to 3D line rings
  const outlines = [];
  for (const f of geojson.features) {
    const geom = f.geometry;
    const rings = geom.type === 'Polygon' ? [geom.coordinates[0]] : geom.coordinates.map(c => c[0]);
    for (const ring of rings) {
      if (ring.length < 3) continue;
      const pts = [];
      const step = ring.length > 50 ? 2 : 1;
      for (let i = 0; i < ring.length; i += step) {
        pts.push(latLngToUnit(ring[i][1], ring[i][0]));
      }
      outlines.push(pts);
    }
  }

  console.log('Processed outlines rings:', outlines.length);

  const lines = [
    '/**',
    ' * Pre-computed high-fidelity landmass geometry for the Supply Connect Globe.',
    ' * Sourced from Natural Earth 110m vector data.',
    ' * Zero runtime fetch, 100% offline, instantaneous WebGL initialization.',
    ' */',
    '',
    'export interface SupplyNode {',
    '  id: string;',
    '  name: string;',
    '  hub: string;',
    '  lat: number;',
    '  lng: number;',
    '  highlight?: boolean;',
    '}',
    '',
    'export interface TradeCorridor {',
    '  from: string;',
    '  to: string;',
    '  label: string;',
    '  flowSpeed: number;',
    '}',
    '',
    '/** 5-8 Strategic Supply Chain Hubs across the globe */',
    'export const STRATEGIC_NODES: SupplyNode[] = [',
    "  { id: 'in-bom', name: 'India', hub: 'Mumbai / JNPT Port', lat: 18.95, lng: 72.95, highlight: true },",
    "  { id: 'sg-sin', name: 'Singapore', hub: 'Strait of Malacca Terminal', lat: 1.35, lng: 103.82, highlight: true },",
    "  { id: 'cn-sha', name: 'China', hub: 'Shanghai / Ningbo Port', lat: 31.23, lng: 121.47, highlight: true },",
    "  { id: 'nl-rtm', name: 'Europe', hub: 'Port of Rotterdam', lat: 51.92, lng: 4.47, highlight: true },",
    "  { id: 'ae-dxb', name: 'Middle East', hub: 'Dubai / Jebel Ali', lat: 25.20, lng: 55.27, highlight: true },",
    "  { id: 'us-lax', name: 'United States', hub: 'Port of Los Angeles / Long Beach', lat: 33.74, lng: -118.26, highlight: true },",
    "  { id: 'us-nyc', name: 'US Atlantic', hub: 'Port of NY & NJ', lat: 40.68, lng: -74.04 },",
    "  { id: 'jp-tyo', name: 'East Asia', hub: 'Tokyo / Yokohama Port', lat: 35.44, lng: 139.64 },",
    '];',
    '',
    '/** Core global trade corridors & maritime routes */',
    'export const TRADE_CORRIDORS: TradeCorridor[] = [',
    "  { from: 'in-bom', to: 'sg-sin', label: 'Indo-Pacific Maritime Corridor', flowSpeed: 1.0 },",
    "  { from: 'sg-sin', to: 'nl-rtm', label: 'Eurasia Sea Trade Route', flowSpeed: 0.8 },",
    "  { from: 'cn-sha', to: 'in-bom', label: 'East-South Asia Manufacturing Link', flowSpeed: 1.1 },",
    "  { from: 'cn-sha', to: 'us-lax', label: 'Trans-Pacific Freight Highway', flowSpeed: 0.9 },",
    "  { from: 'ae-dxb', to: 'nl-rtm', label: 'Middle East - Europe Energy & Cargo', flowSpeed: 0.85 },",
    "  { from: 'sg-sin', to: 'cn-sha', label: 'South China Sea Line', flowSpeed: 1.2 },",
    '];',
    '',
    '/** Flat float coordinates [x, y, z] on unit sphere */',
    `export const LAND_POINTS: readonly [number, number, number][] = ${JSON.stringify(landPoints)};`,
    '',
    '/** Coastline line rings for geographic continent outlines */',
    `export const LAND_OUTLINES: readonly (readonly [number, number, number][])[] = ${JSON.stringify(outlines)};`,
    ''
  ];

  const outDir = path.resolve('src/components/landing');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'globeData.ts'), lines.join('\n'), 'utf-8');
  console.log(`Successfully written globeData.ts (${landPoints.length} points, ${outlines.length} outline rings).`);
}

generate().catch(err => {
  console.error(err);
  process.exit(1);
});
