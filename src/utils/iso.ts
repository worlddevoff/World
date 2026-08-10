// Isometric projection helpers. The world is a grid of diamond tiles.

export const TILE_W = 64; // full tile width in px
export const TILE_H = 32; // full tile height in px

export interface Point {
  x: number;
  y: number;
}

// Convert grid coordinates to screen (isometric) coordinates.
export function gridToScreen(gx: number, gy: number): Point {
  return {
    x: (gx - gy) * (TILE_W / 2),
    y: (gx + gy) * (TILE_H / 2),
  };
}

// Depth sort key so nearer tiles render on top.
export function depth(gx: number, gy: number): number {
  return gx + gy;
}

/** Painter's depth for a world object — use the nearest footprint cell. */
export function objectDepth(obj: {
  pos: { x: number; y: number };
  span?: { x: number; y: number } | null;
  tiles?: number;
}): number {
  let d = obj.pos.x + obj.pos.y;
  if (obj.tiles === 2 && obj.span) {
    d = Math.max(d, obj.pos.x + obj.span.x + obj.pos.y + obj.span.y);
  }
  return d;
}

// The four corner points of a tile diamond, as an SVG points string.
export function tileDiamond(gx: number, gy: number): string {
  const c = gridToScreen(gx, gy);
  const hw = TILE_W / 2;
  const hh = TILE_H / 2;
  return [
    `${c.x},${c.y - hh}`,
    `${c.x + hw},${c.y}`,
    `${c.x},${c.y + hh}`,
    `${c.x - hw},${c.y}`,
  ].join(' ');
}

// Clamp helper.
export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

// Deterministic pseudo-random from a seed (mulberry32).
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
