import type { GridPos } from '../types/game';

// Isometric tile dimensions (base, before zoom). Classic 2:1 diamond.
export const TILE_W = 32;
export const TILE_H = 16;
export const Z_STEP = 12; // pixels per height level

export interface Camera {
  offsetX: number;
  offsetY: number;
  zoom: number;
}

// Grid (x,y) -> screen-space (before camera offset), given zoom.
export function gridToScreen(x: number, y: number, z: number, cam: Camera) {
  const tw = TILE_W * cam.zoom;
  const th = TILE_H * cam.zoom;
  const zs = Z_STEP * cam.zoom;
  const sx = (x - y) * (tw / 2) + cam.offsetX;
  const sy = (x + y) * (th / 2) - z * zs + cam.offsetY;
  return { sx, sy };
}

// Screen -> grid (inverse), z assumed 0. Returns fractional grid coords.
export function screenToGrid(sx: number, sy: number, cam: Camera): GridPos {
  const tw = TILE_W * cam.zoom;
  const th = TILE_H * cam.zoom;
  const px = sx - cam.offsetX;
  const py = sy - cam.offsetY;
  const gx = (px / (tw / 2) + py / (th / 2)) / 2;
  const gy = (py / (th / 2) - px / (tw / 2)) / 2;
  return { x: gx, y: gy };
}

// Depth sort key for painter's algorithm.
export function depthKey(x: number, y: number, z = 0): number {
  return (x + y) * 1000 + z;
}

export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

// Manhattan-ish distance in grid units
export function gridDist(a: GridPos, b: GridPos): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

// 4 iso directions -> grid delta (NE, SE, SW, NW)
export const DIR_DELTA: Record<number, GridPos> = {
  0: { x: 1, y: 0 },
  1: { x: 0, y: 1 },
  2: { x: -1, y: 0 },
  3: { x: 0, y: -1 },
};

export function rotateDir(dir: number, turn: number): number {
  return (((dir + turn) % 4) + 4) % 4;
}

// Shade a hex color by amount (-1..1)
export function shade(hex: string, amt: number): string {
  const c = hex.replace('#', '');
  const n = parseInt(c.length === 3 ? c.split('').map((x) => x + x).join('') : c, 16);
  let r = (n >> 16) & 255;
  let g = (n >> 8) & 255;
  let b = n & 255;
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(v + 255 * amt)));
  r = f(r); g = f(g); b = f(b);
  return `rgb(${r},${g},${b})`;
}
