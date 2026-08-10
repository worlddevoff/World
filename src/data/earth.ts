import type { GridPos } from '../types/world';

/**
 * Equirectangular Earth grid — large enough to feel unbounded for a living sim.
 * x → longitude (−180…180), y → latitude (90…−90).
 */
export const EARTH_W = 180;
export const EARTH_H = 90;

/** Back-compat alias used by boats / canvas centering. */
export const GRID_SIZE = EARTH_W;

// Western Europe landfall — civilization starts here and grows across the globe.
export const WORLD_CENTER: GridPos = { x: 98, y: 20 };

interface Blob {
  lon: number;
  lat: number;
  rx: number;
  ry: number;
}

// Soft continent silhouettes in lon/lat space (not cartographic-perfect —
// readable Earth shape that plays well as an isometric growth mask).
const CONTINENTS: Blob[] = [
  // North America
  { lon: -100, lat: 48, rx: 52, ry: 26 },
  { lon: -85, lat: 58, rx: 38, ry: 16 },
  { lon: -110, lat: 30, rx: 28, ry: 14 },
  // Central America bridge
  { lon: -90, lat: 15, rx: 14, ry: 12 },
  // South America
  { lon: -60, lat: -12, rx: 20, ry: 38 },
  { lon: -70, lat: -35, rx: 14, ry: 18 },
  // Greenland
  { lon: -42, lat: 72, rx: 18, ry: 10 },
  // Europe
  { lon: 12, lat: 50, rx: 28, ry: 16 },
  { lon: 25, lat: 60, rx: 18, ry: 10 },
  // Africa
  { lon: 20, lat: 8, rx: 26, ry: 38 },
  { lon: 25, lat: -20, rx: 18, ry: 16 },
  // Middle East / India
  { lon: 50, lat: 28, rx: 22, ry: 14 },
  { lon: 78, lat: 22, rx: 20, ry: 16 },
  // Asia
  { lon: 100, lat: 50, rx: 55, ry: 24 },
  { lon: 110, lat: 30, rx: 40, ry: 20 },
  { lon: 135, lat: 45, rx: 22, ry: 14 },
  // SE Asia / Indonesia hints
  { lon: 115, lat: 2, rx: 22, ry: 10 },
  // Australia
  { lon: 134, lat: -24, rx: 24, ry: 16 },
  // New Zealand
  { lon: 172, lat: -42, rx: 8, ry: 10 },
];

export function tileToLonLat(x: number, y: number): { lon: number; lat: number } {
  const lon = ((x + 0.5) / EARTH_W) * 360 - 180;
  const lat = 90 - ((y + 0.5) / EARTH_H) * 180;
  return { lon, lat };
}

export function inEarthBounds(x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < EARTH_W && y < EARTH_H;
}

/** True when the tile sits on a continent (buildable / growable land). */
export function isEarthLand(x: number, y: number): boolean {
  if (!inEarthBounds(x, y)) return false;
  const { lon, lat } = tileToLonLat(x, y);

  // Antarctica ice sheet
  if (lat < -62) return true;
  // Arctic scrap — keep most polar ocean open
  if (lat > 78) return lon > -50 && lon < 50;

  for (const b of CONTINENTS) {
    // wrap-aware lon delta for the date line
    let dLon = lon - b.lon;
    if (dLon > 180) dLon -= 360;
    if (dLon < -180) dLon += 360;
    const dx = dLon / b.rx;
    const dy = (lat - b.lat) / b.ry;
    // Slight edge noise so coasts aren't perfect ellipses
    const n = Math.sin(x * 1.7 + y * 0.9) * 0.08 + Math.cos(x * 0.6 - y * 1.3) * 0.06;
    if (dx * dx + dy * dy < 1 + n) return true;
  }
  return false;
}

export function isEarthWater(x: number, y: number): boolean {
  return !isEarthLand(x, y);
}
