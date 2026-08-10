// Persistent world state operations: seeding the initial landscape,
// placing new objects deterministically, and applying damage/destruction.

import type {
  WorldObject,
  WorldObjectKind,
  GridPos,
  ZoneId,
} from '../types/world';
import {
  zoneAt,
  zoneAffinity,
  isDowntown,
  distFromCenter,
  WORLD_CENTER,
} from '../data/zones';
import { inEarthBounds, isEarthWater } from '../data/earth';

export { zoneAt, WORLD_CENTER, distFromCenter };

export function keyOf(pos: GridPos): string {
  return `${pos.x},${pos.y}`;
}

// Oceans + seas from the Earth land mask — continents are buildable.
export function isWater(x: number, y: number): boolean {
  return isEarthWater(x, y);
}

// ---- city planning / street hierarchy ----------------------------------
/** Smaller blocks = tighter neighborhood street grid. */
export const BLOCK_SIZE = 3;
/** Every Nth street line (besides Main) is an avenue. */
export const AVENUE_EVERY = 3;
/** ROAD.variant: 0 side · 1 bridge · 2 avenue · 3 main street */
export const BRIDGE_VARIANT = 1;
export const ARTERIAL_VARIANT = 2;
export const MAIN_STREET_VARIANT = 3;

export type StreetClass = 'main' | 'avenue' | 'side';

/** Snap a coord to the nearest street-line axis value. */
function snapToStreetAxis(v: number): number {
  const base = Math.floor((v - 1) / BLOCK_SIZE) * BLOCK_SIZE + 1;
  const next = base + BLOCK_SIZE;
  return Math.abs(v - base) <= Math.abs(v - next) ? base : next;
}

/** The N–S and E–W axes of Main Street through the city seed. */
export function mainStreetAxes(): { vx: number; hy: number } {
  return {
    vx: snapToStreetAxis(WORLD_CENTER.x),
    hy: snapToStreetAxis(WORLD_CENTER.y),
  };
}

export function isStreetLine(x: number, y: number): boolean {
  return (x - 1) % BLOCK_SIZE === 0 || (y - 1) % BLOCK_SIZE === 0;
}

/** Grand boulevard crossing at the seed — busiest corridor in the city. */
export function isMainStreet(x: number, y: number): boolean {
  if (!isStreetLine(x, y)) return false;
  const { vx, hy } = mainStreetAxes();
  return x === vx || y === hy;
}

/** Secondary avenues — every Nth street line, excluding Main. */
export function isAvenueStreet(x: number, y: number): boolean {
  if (!isStreetLine(x, y) || isMainStreet(x, y)) return false;
  const period = BLOCK_SIZE * AVENUE_EVERY;
  const onVert = (x - 1) % BLOCK_SIZE === 0 && (x - 1) % period === 0;
  const onHoriz = (y - 1) % BLOCK_SIZE === 0 && (y - 1) % period === 0;
  return onVert || onHoriz;
}

export function streetClassAt(x: number, y: number): StreetClass | null {
  if (!isStreetLine(x, y)) return null;
  if (isMainStreet(x, y)) return 'main';
  if (isAvenueStreet(x, y)) return 'avenue';
  return 'side';
}

/** Main + avenues — the busy network that pulls shops and towers. */
export function isArterialStreet(x: number, y: number): boolean {
  const c = streetClassAt(x, y);
  return c === 'main' || c === 'avenue';
}

export function roadVariantFor(x: number, y: number): number {
  const c = streetClassAt(x, y);
  if (c === 'main') return MAIN_STREET_VARIANT;
  if (c === 'avenue') return ARTERIAL_VARIANT;
  return 0;
}

const DIRS4 = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

const DIRS8 = [
  ...DIRS4,
  [1, 1],
  [-1, -1],
  [1, -1],
  [-1, 1],
];

function liveAt(
  objects: Map<string, WorldObject>,
  x: number,
  y: number,
): WorldObject | null {
  const o = objects.get(keyOf({ x, y }));
  if (!o || o.stage === 'rubble') return null;
  return o;
}

function isPlayerOwned(o: WorldObject): boolean {
  return o.bornBy !== 'world' && o.bornBy !== 'genesis';
}

/**
 * Soft props a new build may replace. Player buys are never overwriteable —
 * only empty lots, rubble, or world-seeded greenery.
 */
function isReplaceable(o: WorldObject | null | undefined): boolean {
  if (!o) return true;
  if (o.stage === 'rubble') return true;
  if (isPlayerOwned(o)) return false;
  return o.kind === 'FLOWER' || o.kind === 'DECORATION' || o.kind === 'TREE' || o.kind === 'PARK';
}

/** Tall sprites that visually spill onto neighboring tiles. */
export function isTallBuilding(kind: WorldObjectKind, tiles: 1 | 2 = 1): boolean {
  return (
    kind === 'LANDMARK' ||
    kind === 'TOWER' ||
    kind === 'STADIUM' ||
    kind === 'ATTRACTION' ||
    (kind === 'HOUSE' && tiles === 2)
  );
}

function isSolidBuilding(o: WorldObject): boolean {
  if (isReplaceable(o) || o.kind === 'ROAD') return false;
  return true;
}

/** True when every cell is free of solid buildings (roads never host builds). */
export function canPlaceAt(
  objects: Map<string, WorldObject>,
  cells: GridPos[],
): boolean {
  for (const c of cells) {
    if (!inBounds(c.x, c.y) || isWater(c.x, c.y) || isStreetLine(c.x, c.y)) return false;
    const o = objects.get(keyOf(c));
    if (!o) continue;
    if (o.kind === 'ROAD') return false;
    if (!isReplaceable(o)) return false;
  }
  return true;
}

/** Halo around a footprint — used so tall buildings don't share a fence-line with cottages. */
function footprintHalo(cells: GridPos[], radius = 1): GridPos[] {
  const core = new Set(cells.map(keyOf));
  const out: GridPos[] = [];
  const seen = new Set<string>();
  for (const c of cells) {
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (dx === 0 && dy === 0) continue;
        const p = { x: c.x + dx, y: c.y + dy };
        const k = keyOf(p);
        if (core.has(k) || seen.has(k)) continue;
        seen.add(k);
        out.push(p);
      }
    }
  }
  return out;
}

function hasSolidInHalo(objects: Map<string, WorldObject>, cells: GridPos[]): boolean {
  for (const p of footprintHalo(cells, 1)) {
    const o = liveAt(objects, p.x, p.y);
    if (o && isSolidBuilding(o)) return true;
  }
  return false;
}

function hasTallNeighbor(objects: Map<string, WorldObject>, cells: GridPos[]): boolean {
  for (const p of footprintHalo(cells, 1)) {
    const o = liveAt(objects, p.x, p.y);
    if (o && isTallBuilding(o.kind, o.tiles === 2 ? 2 : 1)) return true;
  }
  return false;
}

/** Remove every map key belonging to this object id (full multi-tile footprint). */
export function evictObject(map: Map<string, WorldObject>, id: string): void {
  const keys: string[] = [];
  map.forEach((o, k) => {
    if (o.id === id) keys.push(k);
  });
  for (const k of keys) map.delete(k);
}

function hasRoadAdjacent(objects: Map<string, WorldObject>, pos: GridPos): boolean {
  return DIRS4.some(([dx, dy]) => liveAt(objects, pos.x + dx, pos.y + dy)?.kind === 'ROAD');
}

/** Best street class touching this lot (main > avenue > side > none). */
function adjacentStreetClass(
  objects: Map<string, WorldObject>,
  pos: GridPos,
): StreetClass | null {
  let best: StreetClass | null = null;
  const rank = (c: StreetClass) => (c === 'main' ? 3 : c === 'avenue' ? 2 : 1);
  for (const [dx, dy] of DIRS4) {
    const x = pos.x + dx;
    const y = pos.y + dy;
    const o = liveAt(objects, x, y);
    let cls: StreetClass | null = null;
    if (o?.kind === 'ROAD') {
      if (o.variant === MAIN_STREET_VARIANT) cls = 'main';
      else if (o.variant === ARTERIAL_VARIANT) cls = 'avenue';
      else if (o.variant !== BRIDGE_VARIANT) cls = streetClassAt(x, y) ?? 'side';
    } else if (isStreetLine(x, y)) {
      cls = streetClassAt(x, y);
    }
    if (!cls) continue;
    if (!best || rank(cls) > rank(best)) best = cls;
  }
  return best;
}

function sameKindNearby(
  objects: Map<string, WorldObject>,
  pos: GridPos,
  kind: WorldObjectKind,
): number {
  let n = 0;
  for (const [dx, dy] of DIRS8) {
    if (liveAt(objects, pos.x + dx, pos.y + dy)?.kind === kind) n++;
  }
  return n;
}

function builtNeighbours(objects: Map<string, WorldObject>, pos: GridPos): number {
  let n = 0;
  for (const [dx, dy] of DIRS8) {
    const o = liveAt(objects, pos.x + dx, pos.y + dy);
    if (o && isSolidBuilding(o)) n++;
  }
  return n;
}

function isCommercial(kind: WorldObjectKind): boolean {
  return kind === 'SHOP' || kind === 'RESTAURANT';
}

function isSkyline(kind: WorldObjectKind): boolean {
  return kind === 'LANDMARK' || kind === 'TOWER';
}

/** Lot touches both an E–W and N–S street — natural shop / tower corner. */
function isCornerLot(pos: GridPos): boolean {
  let horiz = false;
  let vert = false;
  for (const [dx, dy] of DIRS4) {
    const nx = pos.x + dx;
    const ny = pos.y + dy;
    if (!isStreetLine(nx, ny)) continue;
    if ((ny - 1) % BLOCK_SIZE === 0) horiz = true;
    if ((nx - 1) % BLOCK_SIZE === 0) vert = true;
  }
  return horiz && vert;
}

/** Buildings that form the street wall (not trees / parks / lamps). */
function isStructural(o: WorldObject | null | undefined): boolean {
  if (!o || o.stage === 'rubble') return false;
  return (
    o.kind === 'HOUSE' ||
    o.kind === 'SHOP' ||
    o.kind === 'RESTAURANT' ||
    o.kind === 'FACTORY' ||
    o.kind === 'TOWER' ||
    o.kind === 'LANDMARK' ||
    o.kind === 'STADIUM' ||
    o.kind === 'ATTRACTION' ||
    o.kind === 'FARM'
  );
}

function isGreenery(kind: WorldObjectKind): boolean {
  return kind === 'TREE' || kind === 'FLOWER' || kind === 'PARK' || kind === 'FARM';
}

/** Lot sits inside a block (no curb) — courtyards, pocket parks, trees. */
function isInteriorLot(objects: Map<string, WorldObject>, pos: GridPos): boolean {
  if (isStreetLine(pos.x, pos.y)) return false;
  return !hasRoadAdjacent(objects, pos);
}

/**
 * Which axis runs along the curb for this lot?
 * Horizontal street (constant y) → face runs in X; vertical street → face in Y.
 */
function streetFaceAxis(pos: GridPos): 'x' | 'y' | null {
  let alongX = false;
  let alongY = false;
  for (const [dx, dy] of DIRS4) {
    const nx = pos.x + dx;
    const ny = pos.y + dy;
    if (!isStreetLine(nx, ny)) continue;
    if ((ny - 1) % BLOCK_SIZE === 0) alongX = true;
    if ((nx - 1) % BLOCK_SIZE === 0) alongY = true;
  }
  if (alongX && !alongY) return 'x';
  if (alongY && !alongX) return 'y';
  if (alongX && alongY) return 'x'; // corner: either face works; prefer X
  return null;
}

/**
 * True when this lot sits between two structural buildings on the street face —
 * the classic "fill the gap in the row" move.
 */
function isStreetWallGap(objects: Map<string, WorldObject>, pos: GridPos): boolean {
  const axis = streetFaceAxis(pos);
  if (!axis) return false;
  const a = axis === 'x' ? { x: pos.x - 1, y: pos.y } : { x: pos.x, y: pos.y - 1 };
  const b = axis === 'x' ? { x: pos.x + 1, y: pos.y } : { x: pos.x, y: pos.y + 1 };
  return isStructural(liveAt(objects, a.x, a.y)) && isStructural(liveAt(objects, b.x, b.y));
}

/** Extends an existing curb row (exactly one structural neighbor on the face). */
function isStreetWallExtend(objects: Map<string, WorldObject>, pos: GridPos): boolean {
  const axis = streetFaceAxis(pos);
  if (!axis) return false;
  const a = axis === 'x' ? { x: pos.x - 1, y: pos.y } : { x: pos.x, y: pos.y - 1 };
  const b = axis === 'x' ? { x: pos.x + 1, y: pos.y } : { x: pos.x, y: pos.y + 1 };
  const sa = isStructural(liveAt(objects, a.x, a.y));
  const sb = isStructural(liveAt(objects, b.x, b.y));
  return (sa || sb) && !(sa && sb);
}

/**
 * Prefer filling gaps in a street wall: a lot with buildings on both sides
 * along the curb completes the block face.
 */
function blockCompletionBonus(objects: Map<string, WorldObject>, pos: GridPos): number {
  let bonus = 0;
  const face = streetFaceAxis(pos);

  const axes: { axis: 'x' | 'y'; a: GridPos; b: GridPos }[] = [
    {
      axis: 'x',
      a: { x: pos.x - 1, y: pos.y },
      b: { x: pos.x + 1, y: pos.y },
    },
    {
      axis: 'y',
      a: { x: pos.x, y: pos.y - 1 },
      b: { x: pos.x, y: pos.y + 1 },
    },
  ];

  for (const { axis, a, b } of axes) {
    const sa = isStructural(liveAt(objects, a.x, a.y));
    const sb = isStructural(liveAt(objects, b.x, b.y));
    const onFace = face === axis;
    if (sa && sb) bonus += onFace ? 130 : 40; // close a gap on the curb
    else if (sa || sb) bonus += onFace ? 55 : 18; // extend the row
  }

  // Look one further along the face — reward almost-finished block sides
  if (face) {
    const step = face === 'x' ? ([1, 0] as const) : ([0, 1] as const);
    let run = 0;
    for (const dir of [1, -1]) {
      for (let i = 1; i <= 2; i++) {
        const o = liveAt(objects, pos.x + step[0] * dir * i, pos.y + step[1] * dir * i);
        if (!isStructural(o)) break;
        run++;
      }
    }
    bonus += run * 12;
  }

  return bonus;
}

function skylineNearby(objects: Map<string, WorldObject>, pos: GridPos, radius = 3): number {
  let n = 0;
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      if (dx === 0 && dy === 0) continue;
      const o = liveAt(objects, pos.x + dx, pos.y + dy);
      if (o && isSkyline(o.kind)) n++;
    }
  }
  return n;
}

/** Centroid of existing towers — the CBD core new landmarks must hug. */
function skylineCentroid(objects: Map<string, WorldObject>): GridPos | null {
  let sx = 0;
  let sy = 0;
  let n = 0;
  const seen = new Set<string>();
  objects.forEach((o) => {
    if (!isSkyline(o.kind) || o.stage === 'rubble') return;
    if (seen.has(o.id)) return;
    seen.add(o.id);
    sx += o.pos.x + (o.span?.x ?? 0) * 0.5;
    sy += o.pos.y + (o.span?.y ?? 0) * 0.5;
    n++;
  });
  if (n === 0) return null;
  return { x: sx / n, y: sy / n };
}

/** Preferred chebyshev distance from CBD centroid for a new tower (soft bias). */
const CBD_CLUSTER_RADIUS = 5;

/** Grow the preferred skyline footprint as more towers land — never a hard ceiling. */
function skylineClusterRadius(objects: Map<string, WorldObject>): number {
  let n = 0;
  const seen = new Set<string>();
  objects.forEach((o) => {
    if (!isSkyline(o.kind) || o.stage === 'rubble') return;
    if (seen.has(o.id)) return;
    seen.add(o.id);
    n++;
  });
  // 5 → 7 → 9 … up to a wide downtown so $2500 buys never stop placing.
  return Math.min(22, CBD_CLUSTER_RADIUS + Math.floor(n / 2) * 2);
}

function parkNearby(objects: Map<string, WorldObject>, pos: GridPos, radius = 4): boolean {
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      if (dx === 0 && dy === 0) continue;
      if (liveAt(objects, pos.x + dx, pos.y + dy)?.kind === 'PARK') return true;
    }
  }
  return false;
}

export function heightFor(kind: WorldObjectKind, tiles: 1 | 2 = 1): number {
  const map: Record<WorldObjectKind, number> = {
    DECORATION: 0.4,
    FLOWER: 0.4,
    TREE: 0.9,
    ROAD: 0.15,
    HOUSE: tiles === 2 ? 1.7 : 1,
    FARM: 0.8,
    SHOP: 1.1,
    PARK: 0.6,
    RESTAURANT: 1.3,
    FACTORY: 1.6,
    TOWER: 2.4,
    ATTRACTION: 2,
    LANDMARK: tiles === 2 ? 3.4 : 2.8,
    STADIUM: 1.8,
  };
  return map[kind];
}

/** Unique objects from the tile map (2-tile buildings share one id across keys). */
export function uniqueObjects(map: Map<string, WorldObject>): WorldObject[] {
  const seen = new Set<string>();
  const out: WorldObject[] = [];
  map.forEach((o) => {
    if (seen.has(o.id)) return;
    seen.add(o.id);
    out.push(o);
  });
  return out;
}

/**
 * Register an object on every tile it occupies.
 * Only clears replaceable soft props / rubble — never another player's buy.
 */
export function occupyTiles(map: Map<string, WorldObject>, obj: WorldObject): void {
  const cells = footprintPositions(obj);
  // Bail before any mutation if a cell is held by another buy.
  for (const c of cells) {
    const cur = map.get(keyOf(c));
    if (cur && cur.id !== obj.id && !isReplaceable(cur)) return;
  }

  const evictIds = new Set<string>();
  for (const c of cells) {
    const cur = map.get(keyOf(c));
    if (cur && cur.id !== obj.id && isReplaceable(cur)) evictIds.add(cur.id);
  }
  // Tall builds clear *world* greenery in a 1-tile halo (never player trees).
  if (isTallBuilding(obj.kind, obj.tiles === 2 ? 2 : 1)) {
    for (const p of footprintHalo(cells, 1)) {
      const cur = map.get(keyOf(p));
      if (cur && isReplaceable(cur)) evictIds.add(cur.id);
    }
  }
  for (const id of evictIds) evictObject(map, id);

  for (const c of cells) {
    map.set(keyOf(c), obj);
  }
}

export function footprintPositions(obj: WorldObject): GridPos[] {
  const out = [obj.pos];
  if (obj.tiles === 2 && obj.span) {
    out.push({ x: obj.pos.x + obj.span.x, y: obj.pos.y + obj.span.y });
  }
  return out;
}

/**
 * Rebuild tile → object ownership so each cell has at most one building.
 * Older objects keep their lots — later buys never steal a claimed tile.
 */
export function sanitizeOccupancy(map: Map<string, WorldObject>): void {
  const all = uniqueObjects(map).sort((a, b) => a.createdAt - b.createdAt);
  map.clear();
  for (const o of all) {
    const cells = footprintPositions(o);
    const blocked = cells.some((c) => {
      const cur = map.get(keyOf(c));
      return !!cur && cur.id !== o.id;
    });
    if (blocked) continue;
    for (const c of cells) map.set(keyOf(c), o);
  }
  // Clear only world-seeded greenery in tall-building skirts.
  for (const o of uniqueObjects(map)) {
    if (!isTallBuilding(o.kind, o.tiles === 2 ? 2 : 1)) continue;
    for (const p of footprintHalo(footprintPositions(o), 1)) {
      const cur = map.get(keyOf(p));
      if (cur && isReplaceable(cur)) evictObject(map, cur.id);
    }
  }
  pruneCrowdedBridges(map);
}

function inBounds(x: number, y: number): boolean {
  return inEarthBounds(x, y);
}

function makeRoad(pos: GridPos, bornBy = 'world'): WorldObject {
  return {
    id: `road-${pos.x}-${pos.y}`,
    kind: 'ROAD',
    pos,
    zone: zoneAt(pos),
    stage: 'built',
    createdAt: Date.now(),
    bornBy,
    variant: roadVariantFor(pos.x, pos.y),
    height: heightFor('ROAD'),
    era: 0,
    tiles: 1,
  };
}

/** Pave a continuous starter street grid so the first houses plug into a network. */
function seedStarterStreets(
  objects: Map<string, WorldObject>,
  revealed: Set<string>,
): void {
  const paved: GridPos[] = [];
  const pave = (x: number, y: number): boolean => {
    if (!inBounds(x, y) || isWater(x, y) || !isStreetLine(x, y)) return false;
    const pos = { x, y };
    const k = keyOf(pos);
    if (!objects.has(k)) objects.set(k, makeRoad(pos));
    if (objects.get(k)?.kind === 'ROAD') paved.push(pos);
    return true;
  };

  // Local street lattice (side streets + avenues) around the seed.
  // Skip water so we never seed roads on a far shore of a bay.
  for (let dy = -9; dy <= 9; dy++) {
    for (let dx = -9; dx <= 9; dx++) {
      pave(WORLD_CENTER.x + dx, WORLD_CENTER.y + dy);
    }
  }

  // Main Street walks outward from the seed and *stops at water* —
  // otherwise distant land across a bay gets its own floating reveal blob.
  const { vx, hy } = mainStreetAxes();
  for (const dir of [-1, 1] as const) {
    for (let t = 1; t <= 18; t++) {
      const y = WORLD_CENTER.y + dir * t;
      if (!inBounds(vx, y) || isWater(vx, y)) break;
      pave(vx, y);
    }
  }
  for (const dir of [-1, 1] as const) {
    for (let t = 1; t <= 18; t++) {
      const x = WORLD_CENTER.x + dir * t;
      if (!inBounds(x, hy) || isWater(x, hy)) break;
      pave(x, hy);
    }
  }

  for (const p of paved) revealAround(revealed, p, 1);
}

/**
 * Drop revealed tiles (and anything on them) that aren't 4-connected to the
 * seed — kills floating islands left by coast / water gaps.
 */
function pruneDisconnectedReveal(
  objects: Map<string, WorldObject>,
  revealed: Set<string>,
): void {
  const start = keyOf(WORLD_CENTER);
  if (!revealed.has(start)) return;

  const reach = new Set<string>();
  const queue: GridPos[] = [WORLD_CENTER];
  reach.add(start);
  while (queue.length > 0) {
    const p = queue.pop()!;
    for (const [dx, dy] of DIRS4) {
      const n = { x: p.x + dx, y: p.y + dy };
      const k = keyOf(n);
      if (!revealed.has(k) || reach.has(k)) continue;
      reach.add(k);
      queue.push(n);
    }
  }

  for (const k of Array.from(revealed)) {
    if (reach.has(k)) continue;
    revealed.delete(k);
    objects.delete(k);
  }
}

function makeSeedObject(
  kind: WorldObjectKind,
  pos: GridPos,
  variant: number,
  tiles: 1 | 2 = 1,
  span?: GridPos,
): WorldObject {
  return {
    id: `seed-${kind}-${pos.x}-${pos.y}`,
    kind,
    pos,
    zone: zoneAt(pos),
    stage: 'built',
    createdAt: Date.now() - 60_000,
    bornBy: 'genesis',
    variant,
    height: heightFor(kind, tiles),
    era: 0,
    tiles,
    span: tiles === 2 ? span : undefined,
  };
}

/**
 * Prefill a small downtown so the first screenshot isn't empty asphalt.
 * Shops on Main / corners, houses on side streets, a park, yard trees, lamps.
 */
function seedStarterCity(
  objects: Map<string, WorldObject>,
  revealed: Set<string>,
): number {
  revealAround(revealed, WORLD_CENTER, 6);

  type Lot = GridPos & { corner: boolean; main: boolean; interior: boolean };
  const lots: Lot[] = [];
  for (let dy = -5; dy <= 5; dy++) {
    for (let dx = -5; dx <= 5; dx++) {
      const pos = { x: WORLD_CENTER.x + dx, y: WORLD_CENTER.y + dy };
      if (!inBounds(pos.x, pos.y) || isWater(pos.x, pos.y) || isStreetLine(pos.x, pos.y)) {
        continue;
      }
      if (!canPlaceAt(objects, [pos])) continue;
      const onRoad = hasRoadAdjacent(objects, pos);
      lots.push({
        ...pos,
        corner: onRoad && isCornerLot(pos),
        main: onRoad && adjacentStreetClass(objects, pos) === 'main',
        interior: !onRoad,
      });
    }
  }

  const take = (pred: (l: Lot) => boolean): Lot | null => {
    const i = lots.findIndex(pred);
    if (i < 0) return null;
    return lots.splice(i, 1)[0];
  };

  let built = 0;
  const plant = (obj: WorldObject, counts = true) => {
    const cells = footprintPositions(obj);
    if (!canPlaceAt(objects, cells)) return;
    for (const c of cells) {
      objects.set(keyOf(c), obj);
      revealed.add(keyOf(c));
    }
    if (counts) built++;
  };

  // 1–2 corner / Main Street shops
  for (let i = 0; i < 2; i++) {
    const lot =
      take((l) => l.corner && l.main) ??
      take((l) => l.corner) ??
      take((l) => l.main && !l.interior);
    if (!lot) break;
    plant(makeSeedObject('SHOP', lot, i % 3));
  }

  // Cafe on the strip
  {
    const lot = take((l) => l.main && !l.interior) ?? take((l) => !l.interior);
    if (lot) plant(makeSeedObject('RESTAURANT', lot, 0));
  }

  // Row of houses on side streets
  for (let i = 0; i < 6; i++) {
    const lot = take((l) => !l.interior && !l.main) ?? take((l) => !l.interior);
    if (!lot) break;
    plant(makeSeedObject('HOUSE', lot, i % 4));
  }

  // Pocket park inside a block
  {
    const lot =
      take((l) => l.interior) ??
      take((l) => !l.main && !l.corner);
    if (lot) plant(makeSeedObject('PARK', lot, 0));
  }

  // Yard trees (interior greenery) — ambience, not building count
  for (let i = 0; i < 4; i++) {
    const lot = take((l) => l.interior) ?? take((l) => !l.main);
    if (!lot) break;
    plant(makeSeedObject('TREE', lot, i % 4), false);
  }

  // Street lamps along paved Main / avenues near center
  let lamps = 0;
  objects.forEach((o) => {
    if (lamps >= 14) return;
    if (o.kind !== 'ROAD' || o.stage === 'rubble') return;
    if (o.variant !== MAIN_STREET_VARIANT && o.variant !== ARTERIAL_VARIANT) return;
    if (distFromCenter(o.pos) > 8) return;
    if (isWater(o.pos.x, o.pos.y)) return;
    const flanks = DIRS4.map(([dx, dy]) => ({ x: o.pos.x + dx, y: o.pos.y + dy })).filter(
      (p) =>
        inBounds(p.x, p.y) &&
        !isWater(p.x, p.y) &&
        !isStreetLine(p.x, p.y) &&
        !liveAt(objects, p.x, p.y),
    );
    if (flanks.length === 0) return;
    if (lampNearby(objects, o.pos, 1)) return;
    const spot = flanks[0];
    const deco = makeSeedObject('DECORATION', spot, 2); // lamp
    objects.set(keyOf(spot), deco);
    revealed.add(keyOf(spot));
    lamps++;
  });

  return built;
}

// Seed on a European land tile — the civilization expands across Earth from here.
export function seedWorld(): {
  objects: Map<string, WorldObject>;
  revealed: Set<string>;
  buildings: number;
} {
  const objects = new Map<string, WorldObject>();
  const revealed = new Set<string>();
  revealed.add(keyOf(WORLD_CENTER));
  // Peek a little coastline so the starting plot doesn't feel like a lone island tile
  revealAround(revealed, WORLD_CENTER, 2);
  seedStarterStreets(objects, revealed);
  const buildings = seedStarterCity(objects, revealed);
  // Main / lattice reveals can still leave orphan coast scraps — keep one continent.
  pruneDisconnectedReveal(objects, revealed);
  return { objects, revealed, buildings };
}

// Reveal a patch; land becomes grass, water becomes visible ocean coastline.
export function revealAround(
  revealed: Set<string>,
  pos: GridPos,
  radius: number,
): void {
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      if (Math.abs(dx) + Math.abs(dy) > radius + 1) continue;
      const x = pos.x + dx;
      const y = pos.y + dy;
      if (inBounds(x, y)) revealed.add(keyOf({ x, y }));
    }
  }
}

// Growth frontier — only across contiguous Earth land (won't hop oceans).
export function frontierTiles(revealed: Set<string>): GridPos[] {
  const out: GridPos[] = [];
  const seen = new Set<string>();
  const dirs = [
    [1, 0], [-1, 0], [0, 1], [0, -1],
    [1, 1], [-1, -1], [1, -1], [-1, 1],
  ];
  revealed.forEach((k) => {
    const [sx, sy] = k.split(',').map(Number);
    if (isWater(sx, sy)) return;
    for (const [dx, dy] of dirs) {
      const x = sx + dx;
      const y = sy + dy;
      const nk = keyOf({ x, y });
      if (!inBounds(x, y) || revealed.has(nk) || seen.has(nk) || isWater(x, y)) continue;
      seen.add(nk);
      out.push({ x, y });
    }
  });
  return out;
}

function emptyRevealed(
  objects: Map<string, WorldObject>,
  revealed: Set<string>,
): GridPos[] {
  const out: GridPos[] = [];
  revealed.forEach((k) => {
    const [x, y] = k.split(',').map(Number);
    if (isWater(x, y) || isStreetLine(x, y)) return;
    const existing = objects.get(k);
    // Only empty / rubble / world props — never a tile another buy already owns.
    if (!existing || isReplaceable(existing)) out.push({ x, y });
  });
  return out;
}

export function findPlacement(
  objects: Map<string, WorldObject>,
  revealed: Set<string>,
  kind: WorldObjectKind,
  tiles: 1 | 2 = 1,
): { pos: GridPos; span?: GridPos; expanded: boolean } | null {
  const empties = emptyRevealed(objects, revealed);
  const frontier = frontierTiles(revealed);
  // Greenery stays on solid revealed land — frontier tips read as "trees in the sky".
  // Buildings prefer healing empty/rubble lots before expanding the frontier.
  const greeneryOnly =
    kind === 'TREE' || kind === 'FLOWER' || kind === 'PARK' || kind === 'FARM';
  // Prefer infill; keep frontier as fallback when empties exist but are unusable.
  const candidates = greeneryOnly
    ? [...empties]
    : empties.length > 0
      ? [...empties, ...frontier]
      : [...frontier];
  if (candidates.length === 0) return null;

  const isRoad = kind === 'ROAD';
  const cbd = skylineCentroid(objects);

  /** City planner: districts, block faces, corners, CBD skyline. */
  const scoreLot = (pos: GridPos): number => {
    let score = 0;
    const zone = zoneAt(pos);
    const downtown = isDowntown(pos);
    const onRoad = hasRoadAdjacent(objects, pos);
    const frontage = adjacentStreetClass(objects, pos);
    const corner = isCornerLot(pos);

    const interior = isInteriorLot(objects, pos);
    const gapFill = isStreetWallGap(objects, pos);
    const wallExtend = isStreetWallExtend(objects, pos);

    // Heal first: rubble / empty revealed lots beat frontier sprawl.
    const lotKey = keyOf(pos);
    const existing = objects.get(lotKey);
    if (revealed.has(lotKey)) {
      score += 70;
      if (existing?.stage === 'rubble') score += 110;
      else if (!existing || isReplaceable(existing)) score += 40;
    } else {
      score -= 55;
    }

    // Street frontage for buildings; greenery wants the block interior
    if (isGreenery(kind) || kind === 'FLOWER') {
      if (interior) score += 90;
      else if (onRoad) score -= 95; // never be the main street wall
      else score -= 20;
    } else if (onRoad) {
      score += 100;
    } else {
      score -= 50;
    }

    // Hierarchy: Main → shops/towers; avenues → commerce; side streets → homes
    if (frontage === 'main') {
      if (isCommercial(kind) || isSkyline(kind)) score += 95;
      else if (kind === 'HOUSE' && tiles === 2) score += 25;
      else if (kind === 'HOUSE') score -= 20;
      else if (isGreenery(kind)) score -= 70;
      else score += 20;
    } else if (frontage === 'avenue') {
      if (isCommercial(kind) || isSkyline(kind)) score += 70;
      else if (kind === 'HOUSE' && tiles === 2) score += 40;
      else if (kind === 'HOUSE') score += 8;
      else if (isGreenery(kind)) score -= 50;
      else score += 15;
    } else if (frontage === 'side') {
      if (kind === 'HOUSE') score += 45;
      else if (isCommercial(kind)) score -= 25;
      else if (isSkyline(kind)) score -= 40;
      else if (kind === 'PARK') score += 10; // side-street pocket OK; still prefer interior
    }

    // District fit (strong)
    score += zoneAffinity(kind, zone);

    // Complete street walls / fill gaps between buildings
    if (kind === 'HOUSE' || isCommercial(kind) || kind === 'FACTORY' || isSkyline(kind)) {
      score += blockCompletionBonus(objects, pos);
      if (gapFill) score += 80;
      else if (wallExtend) score += 35;
    }

    // Corners → shops & towers; quiet mid-block → homes / plazas
    if (corner) {
      if (isCommercial(kind)) score += 110;
      else if (isSkyline(kind)) score += 85;
      else if (kind === 'HOUSE') score += 8;
      else if (isGreenery(kind)) score -= 60;
    } else if (isCommercial(kind)) {
      score -= 45;
    }

    // Neighborhood packing
    const n = builtNeighbours(objects, pos);
    score += Math.min(n, 6) * 14;
    const same = sameKindNearby(objects, pos, kind);
    if (isCommercial(kind)) {
      score += same * 22;
      const nearHouse = sameKindNearby(objects, pos, 'HOUSE');
      score += Math.min(nearHouse, 3) * 8;
    } else if (kind === 'HOUSE') {
      score += same * 14;
      if (tiles === 2 && downtown) score -= 90;
      if (downtown && tiles === 1) score -= 25;
    } else if (isSkyline(kind)) {
      const clusterR = skylineClusterRadius(objects);
      if (cbd) {
        const cd = Math.max(Math.abs(pos.x - cbd.x), Math.abs(pos.y - cbd.y));
        // Soft preference only — far lots score worse but stay legal (no hard cap).
        if (cd > clusterR) score -= 40 + (cd - clusterR) * 8;
        else score += (clusterR - cd) * 55;
      } else if (downtown) {
        score += 120;
      } else {
        score -= 40;
      }
      score += skylineNearby(objects, pos, 4) * 45;
      if (!downtown) score -= 25;
    } else if (kind === 'TREE' || kind === 'FLOWER' || kind === 'FARM') {
      score += same * 6;
      if (downtown) score -= 80;
      // Yard trees behind the curb: ringed by buildings, off the street wall
      if (interior && n >= 2) score += 55;
      if (cbd) {
        const cd = Math.max(Math.abs(pos.x - cbd.x), Math.abs(pos.y - cbd.y));
        if (cd <= CBD_CLUSTER_RADIUS + 1) score -= 60;
      }
    } else if (kind === 'PARK') {
      // Deliberate plaza voids: mid-block, ringed by buildings, spaced apart
      if (parkNearby(objects, pos, 4)) score -= 120;
      if (n >= 3) score += 70;
      if (n >= 5) score += 40;
      if (interior) score += 75;
      else if (onRoad) score -= 70;
      if (frontage === 'main' || frontage === 'avenue') score -= 50;
      if (downtown) score += 30;
      score -= same * 20;
    }

    // Density gradient: skyline/commerce inward; trees in yards — not the void rim
    const d = distFromCenter(pos);
    if (isSkyline(kind) || isCommercial(kind)) score -= d * 4.2;
    else if (kind === 'HOUSE') score -= Math.abs(d - 16) * 1.8;
    else if (kind === 'TREE' || kind === 'FLOWER') score -= Math.abs(d - 14) * 2.2;
    else if (kind === 'FARM') score += d * 0.6;
    else if (kind === 'PARK') score -= Math.abs(d - 12) * 1.2;
    else score -= d * 1.5;

    // Prefer lots nestled in land (2+ revealed neighbors) so props don't float on tips
    if (kind === 'TREE' || kind === 'FLOWER' || kind === 'PARK') {
      let landN = 0;
      for (const [dx, dy] of DIRS4) {
        if (revealed.has(keyOf({ x: pos.x + dx, y: pos.y + dy })) && !isWater(pos.x + dx, pos.y + dy)) {
          landN++;
        }
      }
      if (landN < 2) score -= 120;
      else score += landN * 12;
    }

    if (revealed.has(keyOf(pos))) score += 35;
    else score -= 30;

    score += Math.random() * 5;
    return score;
  };

  /**
   * Skyline may place anywhere near the city — prefer the growing CBD, but
   * never hard-reject so whale buys cannot "cap out."
   */
  const skylineAllowed = (pos: GridPos): boolean => {
    if (!isSkyline(kind)) return true;
    if (isDowntown(pos)) return true;
    if (!cbd) return distFromCenter(pos) <= 18;
    const cd = Math.max(Math.abs(pos.x - cbd.x), Math.abs(pos.y - cbd.y));
    return cd <= skylineClusterRadius(objects) + 8 || distFromCenter(pos) <= 22;
  };

  const placingTall = isTallBuilding(kind, tiles);
  const skylineKind = isSkyline(kind);

  if (tiles === 2 && !isRoad) {
    // Pass 0: prefer breathing room. Pass 1: pack tight so landmarks never stall.
    for (const allowPacked of [false, true] as const) {
      let bestPos: GridPos | null = null;
      let bestSpan: GridPos | null = null;
      let bestScore = -Infinity;

      for (const pos of candidates) {
        for (const [dx, dy] of DIRS4) {
          const b: GridPos = { x: pos.x + dx, y: pos.y + dy };
          const cells = [pos, b];
          if (!canPlaceAt(objects, cells)) continue;
          if (!skylineAllowed(pos) || !skylineAllowed(b)) continue;
          // Tall / 2-tile homes need breathing room so sprites don't clip neighbors.
          // Landmarks may pack once the CBD is dense (no artificial buy cap).
          if (placingTall && !allowPacked && hasSolidInHalo(objects, cells)) continue;
          if (placingTall && allowPacked && !skylineKind && hasSolidInHalo(objects, cells)) {
            continue;
          }
          // Second cell must be revealed (or growable frontier)
          const bKey = keyOf(b);
          const bOk =
            revealed.has(bKey) || frontier.some((f) => f.x === b.x && f.y === b.y);
          if (!bOk) continue;

          let score = scoreLot(pos) + scoreLot(b) * 0.5;
          if (hasRoadAdjacent(objects, b)) score += 40;
          if (allowPacked) score -= 30; // still prefer open lots when available

          if (score > bestScore) {
            bestScore = score;
            bestPos = pos;
            bestSpan = { x: dx, y: dy };
          }
        }
      }

      if (bestPos && bestSpan) {
        return {
          pos: bestPos,
          span: bestSpan,
          expanded:
            !revealed.has(keyOf(bestPos)) ||
            !revealed.has(keyOf({ x: bestPos.x + bestSpan.x, y: bestPos.y + bestSpan.y })),
        };
      }
    }
  }

  let best: GridPos | null = null;
  let bestScore = -Infinity;

  /** Shops must face a road; prefer intersection corners when any exist. */
  const commerceNeedsFrontage = isCommercial(kind);
  const cornerCandidates = commerceNeedsFrontage
    ? candidates.filter(
        (p) =>
          canPlaceAt(objects, [p]) &&
          hasRoadAdjacent(objects, p) &&
          isCornerLot(p),
      )
    : [];
  const requireCorner = commerceNeedsFrontage && cornerCandidates.length > 0;

  // When a curb gap exists, fill it before sprinkling a new lonely lot.
  const fillsBlock =
    kind === 'HOUSE' || isCommercial(kind) || kind === 'FACTORY';
  const gapCandidates = fillsBlock
    ? candidates.filter(
        (p) => canPlaceAt(objects, [p]) && isStreetWallGap(objects, p),
      )
    : [];
  const requireGap = fillsBlock && gapCandidates.length > 0;

  // Greenery prefers courtyards / park lots over stealing curb frontage.
  const greenery = isGreenery(kind) || kind === 'FLOWER';
  const landNestled = (p: GridPos): boolean => {
    let n = 0;
    for (const [dx, dy] of DIRS4) {
      const nx = p.x + dx;
      const ny = p.y + dy;
      if (revealed.has(keyOf({ x: nx, y: ny })) && !isWater(nx, ny)) n++;
    }
    return n >= 2;
  };
  const interiorCandidates = greenery
    ? candidates.filter(
        (p) => canPlaceAt(objects, [p]) && isInteriorLot(objects, p) && landNestled(p),
      )
    : [];
  const requireInterior = greenery && interiorCandidates.length > 0;

  for (const pos of candidates) {
    const onStreet = isStreetLine(pos.x, pos.y);
    let score = 0;

    if (isRoad) {
      if (!onStreet) continue;
      if (hasRoadAdjacent(objects, pos)) score += 80;
      else score -= 40;
      score -= distFromCenter(pos) * 1.4;
      score += Math.random() * 6;
    } else {
      if (!canPlaceAt(objects, [pos])) continue;
      if (!skylineAllowed(pos)) continue;
      // Storefronts never go off-street; corners win when available.
      if (commerceNeedsFrontage) {
        if (!hasRoadAdjacent(objects, pos)) continue;
        if (requireCorner && !isCornerLot(pos)) continue;
      }
      // Finish the block face before starting a new sprinkle.
      if (requireGap && !isStreetWallGap(objects, pos)) continue;
      // Trees/parks go inside the block when an interior lot exists.
      if (requireInterior && !isInteriorLot(objects, pos)) continue;
      // Never plant greenery on one-tile rim tips (reads as floating in the sky).
      if (greenery && !landNestled(pos)) continue;
      // Cottages/trees stay off the skirt of towers; plazas may sit beside them.
      // Landmarks may pack tight so whale buys never stall out.
      if (placingTall && !skylineKind && hasSolidInHalo(objects, [pos])) continue;
      if (
        !placingTall &&
        kind !== 'PARK' &&
        kind !== 'SHOP' &&
        kind !== 'RESTAURANT' &&
        hasTallNeighbor(objects, [pos])
      ) {
        continue;
      }
      score = scoreLot(pos);
      // Prefer open lots for towers when available, but still allow packed ones.
      if (skylineKind && placingTall && hasSolidInHalo(objects, [pos])) score -= 35;
    }

    if (score > bestScore) {
      bestScore = score;
      best = pos;
    }
  }

  if (!best) {
    // Last resort: only truly placeable lots — never drop a building on another.
    // Soften gap/interior requirements so we still place when the block is empty.
    const fallback = candidates.filter((p) => {
      if (isRoad) return isStreetLine(p.x, p.y);
      if (!canPlaceAt(objects, [p])) return false;
      if (!skylineAllowed(p)) return false;
      if (commerceNeedsFrontage && !hasRoadAdjacent(objects, p)) return false;
      if (greenery && !landNestled(p)) return false;
      // Skyline: ignore halo so dense CBDs keep growing.
      if (placingTall && !skylineKind && hasSolidInHalo(objects, [p])) return false;
      if (
        !placingTall &&
        kind !== 'PARK' &&
        kind !== 'SHOP' &&
        kind !== 'RESTAURANT' &&
        hasTallNeighbor(objects, [p])
      ) {
        return false;
      }
      return true;
    });
    if (fallback.length === 0) return null;
    // Still prefer gap-fills / interiors among fallbacks when present.
    const preferred = fillsBlock
      ? fallback.filter((p) => isStreetWallGap(objects, p) || isStreetWallExtend(objects, p))
      : greenery
        ? fallback.filter((p) => isInteriorLot(objects, p))
        : [];
    const pool = preferred.length > 0 ? preferred : fallback;
    best = pool[Math.floor(Math.random() * pool.length)];
  }

  return { pos: best, expanded: !revealed.has(keyOf(best)) };
}

function streetWalkable(
  objects: Map<string, WorldObject>,
  x: number,
  y: number,
): boolean {
  if (!inBounds(x, y)) return false;
  const o = liveAt(objects, x, y);
  // Existing pavement is always walkable — including bridge decks over water.
  if (o?.kind === 'ROAD') return true;
  if (isWater(x, y) || !isStreetLine(x, y)) return false;
  return !o;
}

/** Max water tiles a single bridge may span (long enough for a real crossing). */
const MAX_BRIDGE_SPAN = 10;
/** Ignore puddle hops — Golden Gate style needs a real channel. */
const MIN_BRIDGE_SPAN = 3;
/**
 * Real cities don't put a suspension bridge on every block.
 * Chebyshev distance between distinct crossings.
 */
const MIN_BRIDGE_SEPARATION = 16;

/** Empty (or rubble) street cell we can pave. */
function streetPaveable(
  objects: Map<string, WorldObject>,
  x: number,
  y: number,
): boolean {
  if (!inBounds(x, y) || isWater(x, y) || !isStreetLine(x, y)) return false;
  const o = objects.get(keyOf({ x, y }));
  return !o || o.stage === 'rubble';
}

function frontageStreets(footprint: GridPos[]): GridPos[] {
  const seen = new Set<string>();
  const out: GridPos[] = [];
  for (const p of footprint) {
    for (const [dx, dy] of DIRS4) {
      const x = p.x + dx;
      const y = p.y + dy;
      if (!isStreetLine(x, y) || isWater(x, y) || !inBounds(x, y)) continue;
      const k = keyOf({ x, y });
      if (seen.has(k)) continue;
      seen.add(k);
      out.push({ x, y });
    }
  }
  return out;
}

/** Prefer routing new pavement along Main / avenues (cheaper) vs quiet side streets. */
function streetTraverseCost(x: number, y: number): number {
  const c = streetClassAt(x, y);
  if (c === 'main') return 1;
  if (c === 'avenue') return 1.35;
  return 2.4;
}

/**
 * Cost-based search along the street grid to the nearest ROAD in `goalKeys`.
 * Prefers Main Street and avenues so growth follows the urban spine.
 */
function pathToNearestRoad(
  objects: Map<string, WorldObject>,
  starts: GridPos[],
  goalKeys: Set<string>,
): GridPos[] | null {
  if (goalKeys.size === 0) return null;
  const startKeys = new Set(starts.map(keyOf));

  const dist = new Map<string, number>();
  const prev = new Map<string, string | null>();
  const queue: { pos: GridPos; cost: number }[] = [];

  for (const s of starts) {
    if (!streetWalkable(objects, s.x, s.y) && !streetPaveable(objects, s.x, s.y)) continue;
    const k = keyOf(s);
    if (dist.has(k)) continue;
    dist.set(k, 0);
    prev.set(k, null);
    queue.push({ pos: s, cost: 0 });
  }

  let end: GridPos | null = null;
  while (queue.length) {
    queue.sort((a, b) => a.cost - b.cost);
    const { pos: cur, cost } = queue.shift()!;
    const ck = keyOf(cur);
    if (cost > (dist.get(ck) ?? Infinity)) continue;
    if (goalKeys.has(ck) && !startKeys.has(ck)) {
      end = cur;
      break;
    }
    for (const [dx, dy] of DIRS4) {
      const n = { x: cur.x + dx, y: cur.y + dy };
      const nk = keyOf(n);
      if (!streetWalkable(objects, n.x, n.y) && !streetPaveable(objects, n.x, n.y)) continue;
      const nextCost = cost + streetTraverseCost(n.x, n.y);
      if (nextCost >= (dist.get(nk) ?? Infinity)) continue;
      dist.set(nk, nextCost);
      prev.set(nk, ck);
      queue.push({ pos: n, cost: nextCost });
    }
  }
  if (!end) return null;

  const path: GridPos[] = [];
  let k: string | null = keyOf(end);
  while (k) {
    const [x, y] = k.split(',').map(Number);
    path.push({ x, y });
    k = prev.get(k) ?? null;
  }
  path.reverse();
  return path;
}

/** Snapshot of road tile keys currently in the map. */
function existingRoadKeys(objects: Map<string, WorldObject>): Set<string> {
  const keys = new Set<string>();
  objects.forEach((o) => {
    if (o.kind === 'ROAD' && o.stage !== 'rubble') keys.add(keyOf(o.pos));
  });
  return keys;
}

/** Extend street paving toward world center when no network exists yet. */
function pathTowardCenter(start: GridPos, maxLen = 8): GridPos[] {
  const path: GridPos[] = [start];
  let cur = start;
  for (let i = 0; i < maxLen; i++) {
    const options = DIRS4
      .map(([dx, dy]) => ({ x: cur.x + dx, y: cur.y + dy }))
      .filter((p) => isStreetLine(p.x, p.y) && inBounds(p.x, p.y) && !isWater(p.x, p.y));
    if (options.length === 0) break;
    options.sort((a, b) => distFromCenter(a) - distFromCenter(b));
    const next = options[0];
    if (path.some((p) => p.x === next.x && p.y === next.y)) break;
    path.push(next);
    cur = next;
    if (distFromCenter(cur) === 0) break;
  }
  return path;
}

function lampNearby(objects: Map<string, WorldObject>, pos: GridPos, radius = 2): boolean {
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const o = liveAt(objects, pos.x + dx, pos.y + dy);
      if (o?.kind === 'DECORATION' && o.variant % 4 === 2) return true;
    }
  }
  return false;
}

export interface InfraMeta {
  wallet: string;
  amount?: number;
  era: number;
  idFactory: () => string;
}

/**
 * Lay street frontage for a new building, connect it into the road network,
 * and plant street lamps / curb hedges along the new pavement.
 */
export function ensureConnectedRoads(
  objects: Map<string, WorldObject>,
  revealed: Set<string>,
  footprint: GridPos[],
  meta: InfraMeta,
): GridPos[] {
  const frontage = frontageStreets(footprint);
  if (frontage.length === 0) return [];

  // Snapshot network BEFORE paving curb — otherwise new stubs count as "connected"
  // and pathfinding returns a zero-length path (the bug that left orphan road tiles).
  const network = existingRoadKeys(objects);

  const paved: GridPos[] = [];
  const pave = (p: GridPos) => {
    if (!streetPaveable(objects, p.x, p.y)) return;
    if (liveAt(objects, p.x, p.y)?.kind === 'ROAD') return;
    const road = makeRoad(p, meta.wallet);
    road.id = meta.idFactory();
    road.era = meta.era;
    road.purchaseAmount = meta.amount;
    objects.set(keyOf(p), road);
    revealAround(revealed, p, 1);
    paved.push(p);
  };

  // Find connector path to the *pre-existing* network, then pave curb + path.
  let path = pathToNearestRoad(objects, frontage, network);
  if (!path) {
    frontage.sort((a, b) => distFromCenter(a) - distFromCenter(b));
    path = pathTowardCenter(frontage[0], 16);
  }

  for (const p of frontage) pave(p);
  for (const p of path) pave(p);

  // Heal any older orphan stubs left from before this fix
  repairOrphanRoads(objects, revealed, meta, paved);

  placeStreetFurniture(objects, revealed, paved, meta);
  return paved;
}

interface BridgeCandidate {
  water: GridPos[];
  shore: GridPos;
  landfall: GridPos;
  span: number;
  streetAligned: boolean;
}

/** Coastal land near anchors that touches water in at least one cardinal direction. */
function coastalShoresNear(anchors: GridPos[], revealed: Set<string>): GridPos[] {
  const out: GridPos[] = [];
  const seen = new Set<string>();
  for (const a of anchors) {
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const x = a.x + dx;
        const y = a.y + dy;
        const k = keyOf({ x, y });
        if (!inBounds(x, y) || seen.has(k) || isWater(x, y) || !revealed.has(k)) continue;
        const touchesWater = DIRS4.some(([ox, oy]) => {
          const nx = x + ox;
          const ny = y + oy;
          return inBounds(nx, ny) && isWater(nx, ny);
        });
        if (!touchesWater) continue;
        seen.add(k);
        out.push({ x, y });
      }
    }
  }
  return out;
}

/**
 * Cast from a shore tile across open water. Returns a bridge candidate when
 * land is reached within MAX_BRIDGE_SPAN and the water cells are clear.
 */
function bridgeCast(
  objects: Map<string, WorldObject>,
  shore: GridPos,
  dx: number,
  dy: number,
): BridgeCandidate | null {
  const firstX = shore.x + dx;
  const firstY = shore.y + dy;
  if (!inBounds(firstX, firstY) || !isWater(firstX, firstY)) return null;

  const water: GridPos[] = [];
  let x = firstX;
  let y = firstY;
  while (inBounds(x, y) && isWater(x, y) && water.length < MAX_BRIDGE_SPAN) {
    const o = liveAt(objects, x, y);
    if (o && o.kind !== 'ROAD') return null; // blocked by something else
    water.push({ x, y });
    x += dx;
    y += dy;
  }
  if (water.length < MIN_BRIDGE_SPAN || water.length > MAX_BRIDGE_SPAN) return null;
  if (!inBounds(x, y) || isWater(x, y)) return null;

  // Already fully bridged — nothing to do
  if (water.every((w) => liveAt(objects, w.x, w.y)?.kind === 'ROAD')) return null;

  // Only straight street-axis crossings (no diagonal / meander bridges)
  const streetAligned =
    (dy === 0 && (shore.y - 1) % BLOCK_SIZE === 0) ||
    (dx === 0 && (shore.x - 1) % BLOCK_SIZE === 0);
  if (!streetAligned) return null;

  return {
    water,
    shore,
    landfall: { x, y },
    span: water.length,
    streetAligned,
  };
}

function isBridgeRoad(o: WorldObject | null | undefined): boolean {
  return !!o && o.kind === 'ROAD' && o.variant === BRIDGE_VARIANT && o.stage !== 'rubble';
}

function chebyshev(a: GridPos, b: GridPos): number {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}

/** Midpoint of a bridge candidate — used for spacing checks. */
function bridgeMid(c: BridgeCandidate): GridPos {
  const i = Math.floor(c.water.length / 2);
  return c.water[i] ?? c.shore;
}

/** Existing water-bridge deck tiles (one sample per connected span). */
function existingBridgeMids(objects: Map<string, WorldObject>): GridPos[] {
  const bridgeSet = new Set<string>();
  objects.forEach((o, k) => {
    if (isBridgeRoad(o) && isWater(o.pos.x, o.pos.y)) bridgeSet.add(k);
  });
  if (bridgeSet.size === 0) return [];

  const seen = new Set<string>();
  const mids: GridPos[] = [];
  for (const start of bridgeSet) {
    if (seen.has(start)) continue;
    const cells: GridPos[] = [];
    const q = [start];
    seen.add(start);
    while (q.length) {
      const k = q.shift()!;
      const [x, y] = k.split(',').map(Number);
      cells.push({ x, y });
      for (const [dx, dy] of DIRS4) {
        const nk = keyOf({ x: x + dx, y: y + dy });
        if (seen.has(nk) || !bridgeSet.has(nk)) continue;
        seen.add(nk);
        q.push(nk);
      }
    }
    mids.push(cells[Math.floor(cells.length / 2)]);
  }
  return mids;
}

function tooCloseToBridge(mid: GridPos, existing: GridPos[], minDist = MIN_BRIDGE_SEPARATION): boolean {
  return existing.some((e) => chebyshev(mid, e) < minDist);
}

/**
 * Tear down parallel bridges that ended up too close — keep the oldest span
 * in each cluster so the map looks like a real city, not a marina of Golden Gates.
 */
export function pruneCrowdedBridges(objects: Map<string, WorldObject>): void {
  const bridgeSet = new Set<string>();
  objects.forEach((o, k) => {
    if (isBridgeRoad(o) && isWater(o.pos.x, o.pos.y)) bridgeSet.add(k);
  });
  if (bridgeSet.size === 0) return;

  type Span = { cells: GridPos[]; mid: GridPos; createdAt: number };
  const spans: Span[] = [];
  const seen = new Set<string>();
  for (const start of bridgeSet) {
    if (seen.has(start)) continue;
    const cells: GridPos[] = [];
    let createdAt = Infinity;
    const q = [start];
    seen.add(start);
    while (q.length) {
      const k = q.shift()!;
      const [x, y] = k.split(',').map(Number);
      cells.push({ x, y });
      const o = objects.get(k);
      if (o) createdAt = Math.min(createdAt, o.createdAt);
      for (const [dx, dy] of DIRS4) {
        const nk = keyOf({ x: x + dx, y: y + dy });
        if (seen.has(nk) || !bridgeSet.has(nk)) continue;
        seen.add(nk);
        q.push(nk);
      }
    }
    spans.push({
      cells,
      mid: cells[Math.floor(cells.length / 2)],
      createdAt: Number.isFinite(createdAt) ? createdAt : 0,
    });
  }

  spans.sort((a, b) => a.createdAt - b.createdAt);
  const kept: GridPos[] = [];
  for (const span of spans) {
    if (tooCloseToBridge(span.mid, kept)) {
      for (const c of span.cells) {
        const o = objects.get(keyOf(c));
        if (o && isBridgeRoad(o)) objects.delete(keyOf(c));
      }
    } else {
      kept.push(span.mid);
    }
  }
}

/**
 * When the settlement reaches water, pave a rare bridge so growth can hop
 * channels — never a bridge-per-block marina.
 */
export function ensureBridgesNear(
  objects: Map<string, WorldObject>,
  revealed: Set<string>,
  anchors: GridPos[],
  meta: InfraMeta,
  maxBridges = 1,
): GridPos[] {
  if (anchors.length === 0 || maxBridges <= 0) return [];

  // Heal any dense parallel spans from older builds before considering a new one.
  pruneCrowdedBridges(objects);

  const shores = coastalShoresNear(anchors, revealed);
  if (shores.length === 0) return [];

  const existingMids = existingBridgeMids(objects);

  const candidates: BridgeCandidate[] = [];
  const seen = new Set<string>();
  for (const shore of shores) {
    // Only launch from an actual paved street hitting the water — not every lawn.
    if (liveAt(objects, shore.x, shore.y)?.kind !== 'ROAD') continue;
    for (const [dx, dy] of DIRS4) {
      const c = bridgeCast(objects, shore, dx, dy);
      if (!c) continue;
      if (tooCloseToBridge(bridgeMid(c), existingMids)) continue;
      const id = `${c.shore.x},${c.shore.y}->${c.landfall.x},${c.landfall.y}`;
      if (seen.has(id)) continue;
      seen.add(id);
      candidates.push(c);
    }
  }
  if (candidates.length === 0) return [];

  // Prefer opening new land, then longer dramatic spans — and only one try.
  candidates.sort((a, b) => {
    const aNew = revealed.has(keyOf(a.landfall)) ? 1 : 0;
    const bNew = revealed.has(keyOf(b.landfall)) ? 1 : 0;
    if (aNew !== bNew) return aNew - bNew;
    return b.span - a.span;
  });

  const paved: GridPos[] = [];
  let built = 0;
  const placedMids = [...existingMids];

  for (const c of candidates) {
    if (built >= maxBridges) break;
    const mid = bridgeMid(c);
    if (tooCloseToBridge(mid, placedMids)) continue;

    const paveBridge = (p: GridPos) => {
      const existing = liveAt(objects, p.x, p.y);
      if (existing?.kind === 'ROAD') return;
      if (existing) return;
      const o = objects.get(keyOf(p));
      if (o && o.stage !== 'rubble') return;
      const road = makeRoad(p, meta.wallet);
      road.id = meta.idFactory();
      road.era = meta.era;
      road.purchaseAmount = meta.amount;
      road.variant = BRIDGE_VARIANT;
      objects.set(keyOf(p), road);
      revealAround(revealed, p, 1);
      paved.push(p);
    };

    for (const w of c.water) paveBridge(w);

    // Shore + landfall stubs so the bridge plugs into the street grid
    const stubs = [c.shore, c.landfall];
    for (const s of stubs) {
      if (!streetPaveable(objects, s.x, s.y)) continue;
      const road = makeRoad(s, meta.wallet);
      road.id = meta.idFactory();
      road.era = meta.era;
      road.purchaseAmount = meta.amount;
      objects.set(keyOf(s), road);
      revealAround(revealed, s, 1);
      paved.push(s);
    }

    // Open the far bank so the frontier can grow onto the new land
    revealAround(revealed, c.landfall, 2);
    placedMids.push(mid);
    built++;
  }

  return paved;
}

/** Connect road tiles that aren't reachable from the largest paved component. */
function repairOrphanRoads(
  objects: Map<string, WorldObject>,
  revealed: Set<string>,
  meta: InfraMeta,
  pavedOut: GridPos[],
): void {
  const roads = existingRoadKeys(objects);
  if (roads.size < 2) return;

  // BFS components
  const seen = new Set<string>();
  let largest: string[] = [];
  for (const start of roads) {
    if (seen.has(start)) continue;
    const comp: string[] = [];
    const q = [start];
    seen.add(start);
    while (q.length) {
      const k = q.shift()!;
      comp.push(k);
      const [x, y] = k.split(',').map(Number);
      for (const [dx, dy] of DIRS4) {
        const nk = keyOf({ x: x + dx, y: y + dy });
        if (!roads.has(nk) || seen.has(nk)) continue;
        seen.add(nk);
        q.push(nk);
      }
    }
    if (comp.length > largest.length) largest = comp;
  }

  const main = new Set(largest);
  const orphans = [...roads].filter((k) => !main.has(k));
  if (orphans.length === 0) return;

  const pave = (p: GridPos) => {
    if (!streetPaveable(objects, p.x, p.y)) return;
    if (liveAt(objects, p.x, p.y)?.kind === 'ROAD') return;
    const road = makeRoad(p, meta.wallet);
    road.id = meta.idFactory();
    road.era = meta.era;
    road.purchaseAmount = meta.amount;
    objects.set(keyOf(p), road);
    revealAround(revealed, p, 1);
    pavedOut.push(p);
  };

  // Connect each orphan seed to the main network (limit work per call)
  const seeds = orphans.slice(0, 12).map((k) => {
    const [x, y] = k.split(',').map(Number);
    return { x, y };
  });
  for (const seed of seeds) {
    const path = pathToNearestRoad(objects, [seed], main);
    if (path) for (const p of path) pave(p);
  }
}

/** Main Street: lamp every lot. Avenues: dense lamps. Side streets: sparse + hedges.
 *  Downtown gets denser lamps; residential prefers hedges on side streets. */
function placeStreetFurniture(
  objects: Map<string, WorldObject>,
  revealed: Set<string>,
  paved: GridPos[],
  meta: InfraMeta,
): void {
  paved.forEach((pos, i) => {
    const roadObj = liveAt(objects, pos.x, pos.y);
    const variant = roadObj?.kind === 'ROAD' ? roadObj.variant : undefined;
    const cls =
      variant === MAIN_STREET_VARIANT
        ? 'main'
        : variant === ARTERIAL_VARIANT
          ? 'avenue'
          : streetClassAt(pos.x, pos.y) ?? 'side';
    const zone = zoneAt(pos);
    const downtown = zone === 'city';
    const residential = zone === 'village';
    // Side streets: every other curb (every curb downtown); avenues/main always
    if (cls === 'side' && !downtown && i % 2 !== 0) return;
    if (isWater(pos.x, pos.y)) return;

    const flanks = DIRS4
      .map(([dx, dy]) => ({ x: pos.x + dx, y: pos.y + dy }))
      .filter(
        (p) =>
          inBounds(p.x, p.y) &&
          !isWater(p.x, p.y) &&
          !isStreetLine(p.x, p.y) &&
          !liveAt(objects, p.x, p.y),
      );
    if (flanks.length === 0) return;
    flanks.sort((a, b) => distFromCenter(a) - distFromCenter(b));
    const spot = flanks[0];
    const lampRadius = downtown ? 0 : cls === 'main' ? 0 : cls === 'avenue' ? 1 : 2;
    if (lampNearby(objects, spot, lampRadius)) return;

    // Downtown: always lamps. Residential side streets: mostly hedges. Else mostly lamps.
    let isLamp = cls !== 'side' || i % 4 !== 2;
    if (downtown) isLamp = true;
    else if (residential && cls === 'side') isLamp = i % 3 === 0;
    const deco: WorldObject = {
      id: meta.idFactory(),
      kind: 'DECORATION',
      pos: spot,
      zone: zoneAt(spot),
      stage: 'built',
      createdAt: Date.now(),
      bornBy: meta.wallet,
      purchaseAmount: meta.amount,
      variant: isLamp ? 2 : 0, // lamp | hedge
      height: heightFor('DECORATION'),
      era: meta.era,
      tiles: 1,
    };
    objects.set(keyOf(spot), deco);
    revealAround(revealed, spot, 0);
  });
}

/** @deprecated use ensureConnectedRoads — kept for callers that only need a stub */
export function findRoadFor(
  objects: Map<string, WorldObject>,
  pos: GridPos,
): GridPos | null {
  const options: GridPos[] = [];
  for (const [dx, dy] of DIRS4) {
    const x = pos.x + dx;
    const y = pos.y + dy;
    if (!inBounds(x, y) || isWater(x, y)) continue;
    if (!isStreetLine(x, y)) continue;
    if (liveAt(objects, x, y)) continue;
    options.push({ x, y });
  }
  if (options.length === 0) return null;
  options.sort(
    (a, b) =>
      (hasRoadAdjacent(objects, b) ? 1 : 0) - (hasRoadAdjacent(objects, a) ? 1 : 0) ||
      distFromCenter(a) - distFromCenter(b),
  );
  return options[0];
}

const BUILDING_KINDS = new Set([
  'HOUSE',
  'SHOP',
  'RESTAURANT',
  'TOWER',
  'FACTORY',
  'ATTRACTION',
  'LANDMARK',
  'STADIUM',
  'FARM',
  'PARK',
]);

/** Structures that count toward the Buildings stat (excludes roads / rubble). */
export function countStandingBuildings(objects: Map<string, WorldObject>): number {
  let n = 0;
  objects.forEach((o) => {
    if (o.stage === 'rubble' || o.stage === 'collapsing') return;
    if (o.kind === 'ROAD') return;
    if (BUILDING_KINDS.has(o.kind)) n += 1;
  });
  return n;
}

function collectVictims(
  objects: Map<string, WorldObject>,
  buildingsOnly: boolean,
  ownerWallet?: string,
  allowGenesis = true,
): WorldObject[] {
  const pool: WorldObject[] = [];
  objects.forEach((o) => {
    if (o.stage === 'rubble' || o.stage === 'collapsing') return;
    if (o.kind === 'ROAD') return;
    if (ownerWallet && o.bornBy !== ownerWallet) return;
    if (
      !allowGenesis &&
      (o.bornBy === 'genesis' || o.bornBy === 'world')
    ) {
      return;
    }
    if (buildingsOnly && !BUILDING_KINDS.has(o.kind)) return;
    pool.push(o);
  });
  return pool;
}

export type VictimMode = 'owned' | 'soft' | 'disaster';

/**
 * Pick something to remove on a sell.
 * - owned/soft: seller's deeds first, then greenery — never the genesis downtown
 *   or other players' skyline (orphan sells used to erase the whole city on load).
 * - disaster: may hit other players' normal builds; genesis seed stays protected.
 */
export function pickVictim(
  objects: Map<string, WorldObject>,
  buildingsOnly = true,
  ownerWallet?: string,
  mode: VictimMode = 'soft',
): WorldObject | null {
  const tryPick = (pool: WorldObject[]) =>
    pool.length > 0 ? pool[Math.floor(Math.random() * pool.length)] : null;

  if (ownerWallet) {
    const owned = tryPick(collectVictims(objects, true, ownerWallet));
    if (owned) return owned;
    const ownedProp = tryPick(
      collectVictims(objects, false, ownerWallet).filter(
        (o) => o.kind === 'TREE' || o.kind === 'DECORATION' || o.kind === 'FLOWER',
      ),
    );
    if (ownedProp) return ownedProp;
  }

  // Soft sells with no local deeds only trim greenery — keep the map livable.
  const greenery = tryPick(
    collectVictims(objects, false, undefined, true).filter(
      (o) =>
        (o.bornBy === 'genesis' || o.bornBy === 'world' || !isPlayerOwned(o)) &&
        (o.kind === 'TREE' || o.kind === 'DECORATION' || o.kind === 'FLOWER'),
    ),
  );
  if (mode !== 'disaster') return greenery;

  const otherNormal = tryPick(
    collectVictims(objects, true, undefined, false).filter(
      (o) => isPlayerOwned(o) && o.kind !== 'LANDMARK' && o.kind !== 'TOWER',
    ),
  );
  if (otherNormal) return otherNormal;

  return greenery;
}

const MIN_SKYLINE = 8;

/**
 * If sells left a road-only ghost town, replant a small downtown so the first
 * paint never sticks as empty lots. Idempotent — skips occupied cells.
 */
export function ensureMinimumSkyline(
  objects: Map<string, WorldObject>,
  revealed: Set<string>,
): number {
  if (countStandingBuildings(objects) >= MIN_SKYLINE) return 0;
  const before = countStandingBuildings(objects);
  // Re-run starter city planting; plant() already skips occupied lots.
  seedStarterCity(objects, revealed);
  return Math.max(0, countStandingBuildings(objects) - before);
}

const CORE_KEEP_RADIUS = 6;

/**
 * After heavy selling, retract empty fringe land so the civilization contracts
 * instead of staying a giant abandoned sprawl. Protects the seed core and
 * anything near standing buildings/roads.
 */
export function contractEmptyFrontier(
  objects: Map<string, WorldObject>,
  revealed: Set<string>,
  intensity: 1 | 2 = 1,
): number {
  const protect = new Set<string>();
  for (let dy = -CORE_KEEP_RADIUS; dy <= CORE_KEEP_RADIUS; dy++) {
    for (let dx = -CORE_KEEP_RADIUS; dx <= CORE_KEEP_RADIUS; dx++) {
      if (Math.abs(dx) + Math.abs(dy) > CORE_KEEP_RADIUS + 1) continue;
      const x = WORLD_CENTER.x + dx;
      const y = WORLD_CENTER.y + dy;
      if (inBounds(x, y)) protect.add(keyOf({ x, y }));
    }
  }

  objects.forEach((o) => {
    if (o.stage === 'rubble' || o.stage === 'collapsing') return;
    const r = o.kind === 'ROAD' ? 1 : 2;
    const cells = footprintPositions(o);
    for (const c of cells) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          protect.add(keyOf({ x: c.x + dx, y: c.y + dy }));
        }
      }
    }
  });

  type Cand = { k: string; dist: number; neigh: number };
  const cands: Cand[] = [];
  for (const k of revealed) {
    if (protect.has(k)) continue;
    const o = objects.get(k);
    // Only retract empty lots or rubble — never pull land out from under a live build.
    if (o && o.stage !== 'rubble') continue;
    const [x, y] = k.split(',').map(Number);
    let neigh = 0;
    for (const [dx, dy] of DIRS4) {
      if (revealed.has(keyOf({ x: x + dx, y: y + dy }))) neigh++;
    }
    // Fringe first (fewer neighbors).
    if (neigh > 3) continue;
    cands.push({ k, dist: distFromCenter({ x, y }), neigh });
  }

  cands.sort((a, b) => b.dist - a.dist || a.neigh - b.neigh);
  const budget = Math.min(cands.length, intensity === 2 ? 32 : 16);
  let removed = 0;
  for (let i = 0; i < budget; i++) {
    const { k } = cands[i];
    revealed.delete(k);
    objects.delete(k);
    removed++;
  }
  if (removed > 0) pruneDisconnectedReveal(objects, revealed);
  return removed;
}

/**
 * Always find a lot for a buy — expand the reveal ring until something fits.
 * Returns null only if the map is pathologically full.
 */
export function ensurePlacement(
  objects: Map<string, WorldObject>,
  revealed: Set<string>,
  kind: WorldObjectKind,
  tiles: 1 | 2 = 1,
): { pos: GridPos; span?: GridPos; expanded: boolean } | null {
  let placement = findPlacement(objects, revealed, kind, tiles);
  if (placement) return placement;

  // Soften: try a cottage-sized footprint when the fancy lot can't fit.
  if (tiles === 2) {
    placement = findPlacement(objects, revealed, kind, 1);
    if (placement) return placement;
  }

  // Grow the city outward from existing structures / center until a lot opens.
  const anchors: GridPos[] = [WORLD_CENTER];
  objects.forEach((o) => {
    if (o.kind !== 'ROAD' && o.stage !== 'rubble') anchors.push(o.pos);
  });
  for (let radius = 2; radius <= 10; radius++) {
    for (let i = 0; i < Math.min(anchors.length, 12); i++) {
      const a = anchors[(i * 7) % anchors.length];
      revealAround(revealed, a, radius);
    }
    placement = findPlacement(objects, revealed, kind === 'LANDMARK' ? 'HOUSE' : kind, 1);
    if (placement) return placement;
    // Last ditch: any greenery/house lot after expansion
    placement = findPlacement(objects, revealed, 'HOUSE', 1);
    if (placement) return placement;
    placement = findPlacement(objects, revealed, 'TREE', 1);
    if (placement) return placement;
  }
  return null;
}

export function objectsInZone(
  objects: Map<string, WorldObject>,
  zone: ZoneId,
): WorldObject[] {
  const out: WorldObject[] = [];
  objects.forEach((o) => {
    if (o.zone === zone) out.push(o);
  });
  return out;
}
