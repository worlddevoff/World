// Ambient city life: cars on avenues, walkers on curbs, plaza crowds.

import type { GridPos, Npc, Vehicle, WorldObject } from '../types/world';
import {
  ARTERIAL_VARIANT,
  BLOCK_SIZE,
  BRIDGE_VARIANT,
  MAIN_STREET_VARIANT,
  isWater,
} from './worldState';
import { uid } from './format';

/** Push walkers onto the sidewalk band (perpendicular to the street axis). */
function curbOffset(x: number, y: number, side?: number): { ox: number; oy: number } {
  const s = side ?? (Math.random() < 0.5 ? 1 : -1);
  const CURB = 0.56;
  const onVert = (x - 1) % BLOCK_SIZE === 0;
  const onHoriz = (y - 1) % BLOCK_SIZE === 0;
  if (onVert && !onHoriz) return { ox: s * CURB, oy: 0 };
  if (onHoriz && !onVert) return { ox: 0, oy: s * CURB };
  // Junction / corner — pick one axis so they don't cut the lane
  return Math.random() < 0.5 ? { ox: s * CURB, oy: 0 } : { ox: 0, oy: s * CURB };
}

/** Tiny lane jitter so cars sit in the asphalt, not on the curb. */
function laneOffset(): { ox: number; oy: number } {
  return {
    ox: (Math.random() - 0.5) * 0.1,
    oy: (Math.random() - 0.5) * 0.1,
  };
}

const DIRS4: [number, number][] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

const CAR_COLORS = ['#dc2626', '#2563eb', '#16a34a', '#facc15', '#f97316', '#a855f7', '#0ea5e9'];
const PED_COLORS = ['#1e293b', '#334155', '#475569', '#7c2d12', '#1d4ed8', '#166534', '#9f1239'];

export interface RoadCell {
  x: number;
  y: number;
  arterial: boolean;
  /** 3 = main, 2 = avenue, 0 = side */
  rank: number;
}

export function collectRoadCells(objects: WorldObject[]): RoadCell[] {
  const out: RoadCell[] = [];
  const seen = new Set<string>();
  for (const o of objects) {
    if (o.kind !== 'ROAD' || o.stage === 'rubble') continue;
    const k = `${o.pos.x},${o.pos.y}`;
    if (seen.has(k)) continue;
    seen.add(k);
    // Cars stay on land pavement — not bridge decks over water.
    if (o.variant === BRIDGE_VARIANT || isWater(o.pos.x, o.pos.y)) continue;
    const rank =
      o.variant === MAIN_STREET_VARIANT ? 3 : o.variant === ARTERIAL_VARIANT ? 2 : 0;
    out.push({
      x: o.pos.x,
      y: o.pos.y,
      arterial: rank >= 2,
      rank,
    });
  }
  return out;
}

function pickBusyRoad(roads: RoadCell[]): RoadCell | null {
  const main = roads.filter((r) => r.rank === 3);
  if (main.length >= 2) return main[Math.floor(Math.random() * main.length)];
  const avenues = roads.filter((r) => r.rank >= 2);
  if (avenues.length >= 4) return avenues[Math.floor(Math.random() * avenues.length)];
  return roads.length ? roads[Math.floor(Math.random() * roads.length)] : null;
}

export function collectParks(objects: WorldObject[]): GridPos[] {
  const out: GridPos[] = [];
  const seen = new Set<string>();
  for (const o of objects) {
    if (o.kind !== 'PARK' || o.stage === 'rubble') continue;
    const k = `${o.pos.x},${o.pos.y}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(o.pos);
  }
  return out;
}

function roadSetOf(roads: RoadCell[]): Set<string> {
  return new Set(roads.map((r) => `${r.x},${r.y}`));
}

function pick<T>(arr: T[]): T | null {
  if (arr.length === 0) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Pick the next road cell toward (tx, ty). Deterministic — no per-frame random. */
function pickNeighbor(
  cx: number,
  cy: number,
  tx: number,
  ty: number,
  set: Set<string>,
  avoid: GridPos | null,
): GridPos | null {
  let best: GridPos | null = null;
  let bestScore = Infinity;
  for (const [dx, dy] of DIRS4) {
    const nx = cx + dx;
    const ny = cy + dy;
    if (!set.has(`${nx},${ny}`)) continue;
    if (avoid && avoid.x === nx && avoid.y === ny) continue;
    // Tiny deterministic bias breaks ties so cars don't flicker
    const score = Math.abs(nx - tx) + Math.abs(ny - ty) + dx * 0.01 + dy * 0.003;
    if (score < bestScore) {
      bestScore = score;
      best = { x: nx, y: ny };
    }
  }
  if (best) return best;
  // Dead end — allow reverse
  if (avoid) return pickNeighbor(cx, cy, tx, ty, set, null);
  for (const [dx, dy] of DIRS4) {
    const nx = cx + dx;
    const ny = cy + dy;
    if (set.has(`${nx},${ny}`)) return { x: nx, y: ny };
  }
  return null;
}

function nearestRoad(x: number, y: number, roads: RoadCell[]): RoadCell | null {
  if (roads.length === 0) return null;
  let best = roads[0];
  let bestD = Infinity;
  for (const r of roads) {
    const d = Math.abs(r.x - x) + Math.abs(r.y - y);
    if (d < bestD) {
      bestD = d;
      best = r;
    }
  }
  return best;
}

export function makeCar(roads: RoadCell[]): Vehicle | null {
  if (roads.length === 0) return null;
  // ~70% of traffic stays on Main / avenues
  const start = (Math.random() < 0.72 ? pickBusyRoad(roads) : pick(roads)) ?? pick(roads);
  if (!start) return null;
  const farPool = roads.filter((r) => Math.abs(r.x - start.x) + Math.abs(r.y - start.y) > 3);
  const goal =
    (Math.random() < 0.72 ? pickBusyRoad(farPool.length ? farPool : roads) : pick(farPool.length ? farPool : roads)) ??
    pick(roads);
  if (!goal) return null;
  const busy = start.rank >= 2;
  const next = pickNeighbor(start.x, start.y, goal.x, goal.y, roadSetOf(roads), null);
  const lane = laneOffset();
  return {
    id: uid('car'),
    x: start.x + lane.ox,
    y: start.y + lane.oy,
    tx: goal.x,
    ty: goal.y,
    wx: next?.x ?? start.x,
    wy: next?.y ?? start.y,
    speed: (busy ? 0.055 : 0.035) + Math.random() * 0.03,
    kind: 'car',
    color: CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)],
  };
}

export function makeBoat(): Vehicle {
  return {
    id: uid('boat'),
    x: 0, // filled by caller
    y: 0,
    tx: 0,
    ty: 0,
    speed: 0.02,
    kind: 'boat',
    color: '#0ea5e9',
  };
}

export function makePedestrian(
  roads: RoadCell[],
  parks: GridPos[],
  crowd = false,
): Npc | null {
  if (crowd && parks.length > 0) {
    const park = pick(parks)!;
    const ox = (Math.random() - 0.5) * 1.4;
    const oy = (Math.random() - 0.5) * 1.4;
    return {
      id: uid('npc'),
      x: park.x + ox,
      y: park.y + oy,
      tx: park.x + (Math.random() - 0.5) * 1.6,
      ty: park.y + (Math.random() - 0.5) * 1.6,
      speed: 0.008 + Math.random() * 0.01,
      kind: 'visitor',
      color: PED_COLORS[Math.floor(Math.random() * PED_COLORS.length)],
    };
  }
  if (roads.length === 0) return null;
  // Walk the sidewalk — offset perpendicular to the street axis
  const cell = pick(roads)!;
  const { ox, oy } = curbOffset(cell.x, cell.y);
  // Drift a little along the curb so they aren't stacked
  const along = (Math.random() - 0.5) * 0.35;
  const ax = Math.abs(ox) > Math.abs(oy) ? 0 : along;
  const ay = Math.abs(oy) >= Math.abs(ox) ? 0 : along;
  return {
    id: uid('npc'),
    x: cell.x + ox + ax,
    y: cell.y + oy + ay,
    tx: cell.x + ox + ax,
    ty: cell.y + oy + ay,
    speed: 0.012 + Math.random() * 0.012,
    kind: Math.random() < 0.2 ? 'worker' : 'walker',
    color: PED_COLORS[Math.floor(Math.random() * PED_COLORS.length)],
  };
}

/** Greedy step along the paved graph toward (tx, ty), committed to a waypoint. */
export function stepOnRoads(
  x: number,
  y: number,
  tx: number,
  ty: number,
  speed: number,
  dt: number,
  roads: RoadCell[],
  wx?: number,
  wy?: number,
): { x: number; y: number; tx: number; ty: number; wx: number; wy: number; arrived: boolean } {
  const set = roadSetOf(roads);
  if (set.size === 0) {
    return { x, y, tx, ty, wx: x, wy: y, arrived: true };
  }

  // Stranded off the graph (road removed) — snap back onto pavement
  const cellKey = `${Math.round(x)},${Math.round(y)}`;
  const waypointOk = wx !== undefined && wy !== undefined && set.has(`${wx},${wy}`);
  if (!set.has(cellKey) && !waypointOk) {
    const nest = nearestRoad(x, y, roads);
    if (!nest) return { x, y, tx, ty, wx: x, wy: y, arrived: true };
    x = nest.x;
    y = nest.y;
    wx = undefined;
    wy = undefined;
  }

  const goalDist = Math.abs(tx - x) + Math.abs(ty - y);
  if (goalDist < 0.35) {
    return { x: tx, y: ty, tx, ty, wx: tx, wy: ty, arrived: true };
  }

  let nextX = wx;
  let nextY = wy;
  const atWaypoint =
    nextX === undefined ||
    nextY === undefined ||
    !set.has(`${nextX},${nextY}`) ||
    Math.hypot(nextX - x, nextY - y) < 0.18;

  if (atWaypoint) {
    const prevX = x;
    const prevY = y;
    const cx =
      nextX !== undefined && nextY !== undefined && set.has(`${nextX},${nextY}`)
        ? nextX
        : Math.round(x);
    const cy =
      nextX !== undefined && nextY !== undefined && set.has(`${nextX},${nextY}`)
        ? nextY
        : Math.round(y);
    x = cx;
    y = cy;

    // Don't immediately U-turn into the cell we just drove in from
    let avoid: GridPos | null = null;
    if (nextX !== undefined && nextY !== undefined) {
      const adx = cx - prevX;
      const ady = cy - prevY;
      if (Math.abs(adx) > Math.abs(ady) && Math.abs(adx) > 0.01) {
        avoid = { x: cx - Math.sign(adx), y: cy };
      } else if (Math.abs(ady) > 0.01) {
        avoid = { x: cx, y: cy - Math.sign(ady) };
      }
    }

    const next = pickNeighbor(cx, cy, tx, ty, set, avoid);
    if (!next) {
      return { x, y, tx, ty, wx: x, wy: y, arrived: false };
    }
    nextX = next.x;
    nextY = next.y;
  }

  const step = speed * (dt / 16);
  const dx = nextX! - x;
  const dy = nextY! - y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = x + (dx / len) * Math.min(step, len);
  const ny = y + (dy / len) * Math.min(step, len);
  return { x: nx, y: ny, tx, ty, wx: nextX!, wy: nextY!, arrived: false };
}

export function stepPedestrian(
  npc: Npc,
  dt: number,
  roads: RoadCell[],
  parks: GridPos[],
): Npc {
  const dist = Math.hypot(npc.tx - npc.x, npc.ty - npc.y);
  if (dist < 0.2) {
    // Plaza visitors mill; street walkers pick a new road cell
    if (npc.kind === 'visitor' && parks.length > 0) {
      const park = pick(parks)!;
      return {
        ...npc,
        tx: park.x + (Math.random() - 0.5) * 1.8,
        ty: park.y + (Math.random() - 0.5) * 1.8,
      };
    }
    const cell = pick(roads);
    if (!cell) return npc;
    const { ox, oy } = curbOffset(cell.x, cell.y);
    const along = (Math.random() - 0.5) * 0.4;
    const ax = Math.abs(ox) > Math.abs(oy) ? 0 : along;
    const ay = Math.abs(oy) >= Math.abs(ox) ? 0 : along;
    return {
      ...npc,
      tx: cell.x + ox + ax,
      ty: cell.y + oy + ay,
    };
  }
  const step = npc.speed * (dt / 16);
  const dx = npc.tx - npc.x;
  const dy = npc.ty - npc.y;
  const len = Math.hypot(dx, dy) || 1;
  return {
    ...npc,
    x: npc.x + (dx / len) * Math.min(step, len),
    y: npc.y + (dy / len) * Math.min(step, len),
  };
}

export function retargetCar(v: Vehicle, roads: RoadCell[]): Vehicle {
  const far = roads.filter((r) => Math.abs(r.x - v.x) + Math.abs(r.y - v.y) > 3);
  const pool = far.length ? far : roads;
  const goal = (Math.random() < 0.75 ? pickBusyRoad(pool) : pick(pool)) ?? pick(pool);
  if (!goal) return v;
  // Keep current hop; only the final destination changes
  return { ...v, tx: goal.x, ty: goal.y };
}
