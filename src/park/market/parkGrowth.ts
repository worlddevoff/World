/**
 * Market → park: buys expand the park, sells tear it down.
 * Holders + market cap set the target size of the experiment.
 */

import type { GameState } from '../store/gameStore';
import type {
  PlacedRide,
  PlacedShop,
  PlacedScenery,
  SceneryKind,
  Staff,
} from '../types/game';
import { RIDE_DEFS, SHOP_DEFS, getRideDef } from '../data/rides';
import { SCENERY_DEFS } from '../data/scenery';
import { STAFF_NAMES } from '../data/names';
import { uid } from '../utils/id';
import { computeCoasterStats } from '../store/gameStore';
import { STARTER_FLOORS } from '../data/starterPark';
import { buildCoasterTrack } from '../data/coasterLayouts';

const GRID = 40;

export interface MarketSnapshot {
  holders: number;
  marketCapUsd: number;
  priceUsd: number | null;
}

export interface ParkTargets {
  pathTiles: number;
  rides: number;
  shops: number;
  scenery: number;
  staff: number;
  cash: number;
  parkValue: number;
}

/** Park rating 0–999 from market performance (buys↑ / sells↓ / holders / mcap). */
export function ratingFromMarket(input: {
  holders: number;
  marketCapUsd: number;
  buyUsd: number;
  sellUsd: number;
  rideCount: number;
  shopCount: number;
}): number {
  const h = Math.max(0, input.holders);
  const mcap = Math.max(0, input.marketCapUsd);
  const buys = Math.max(0, input.buyUsd);
  const sells = Math.max(0, input.sellUsd);
  const net = buys - sells;

  let rating = 420;
  rating += Math.min(180, Math.log10(10 + h) * 55);
  rating += Math.min(160, Math.log10(1_000 + mcap) * 28);
  rating += Math.min(200, Math.log10(10 + Math.max(0, net)) * 40);
  rating -= Math.min(160, Math.log10(10 + sells) * 28);
  rating += Math.min(80, input.rideCount * 8);
  rating += Math.min(40, input.shopCount * 4);
  return Math.round(Math.max(80, Math.min(999, rating)));
}

/** Unlock every ride for market-driven builds. */
export function unlockAllRides(): void {
  for (const r of RIDE_DEFS) r.researched = true;
}

export function targetsFromMarket(m: MarketSnapshot): ParkTargets {
  const h = Math.max(0, m.holders || 0);
  const mcap = Math.max(0, m.marketCapUsd || 0);
  // Logarithmic so early holders matter, whales still push size
  const holdScale = Math.log10(10 + h);
  const mcapScale = Math.log10(1_000 + mcap);

  return {
    pathTiles: Math.max(STARTER_FLOORS.pathTiles, Math.min(420, Math.floor(18 + h * 1.1 + holdScale * mcapScale * 6))),
    rides: Math.max(STARTER_FLOORS.rides, Math.min(22, Math.floor(h / 12 + mcap / 40_000 + holdScale))),
    shops: Math.max(STARTER_FLOORS.shops, Math.min(16, Math.floor(h / 20 + mcap / 70_000 + holdScale * 0.5))),
    scenery: Math.max(STARTER_FLOORS.scenery, Math.min(90, Math.floor(h / 4 + holdScale * mcapScale * 3))),
    staff: Math.max(STARTER_FLOORS.staff, Math.min(18, Math.floor(h / 35 + mcap / 120_000 + 1))),
    cash: Math.floor(Math.min(5_000_000, Math.max(12_000, mcap * 0.012 + h * 40))),
    parkValue: Math.floor(Math.min(8_000_000, Math.max(20_000, 8_000 + mcap * 0.02 + h * 120))),
  };
}

function inBounds(x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < GRID && y < GRID;
}

function key(x: number, y: number): string {
  return `${x},${y}`;
}

function occupied(s: GameState, x: number, y: number): boolean {
  if (s.scenery.some((o) => o.x === x && o.y === y)) return true;
  if (s.shops.some((o) => o.x === x && o.y === y)) return true;
  if (s.rides.some((r) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h)) return true;
  if (s.rides.some((r) => r.track.some((t) => t.x === x && t.y === y))) return true;
  return false;
}

function adjacentToPath(s: GameState, x: number, y: number, w: number, h: number): boolean {
  for (let dy = -1; dy <= h; dy++) {
    for (let dx = -1; dx <= w; dx++) {
      if (dx >= 0 && dx < w && dy >= 0 && dy < h) continue;
      if (s.paths.has(key(x + dx, y + dy))) return true;
    }
  }
  return false;
}

function pathFrontier(s: GameState): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [];
  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];
  for (const k of s.paths) {
    const [px, py] = k.split(',').map(Number);
    for (const [dx, dy] of dirs) {
      const x = px + dx;
      const y = py + dy;
      if (!inBounds(x, y)) continue;
      if (s.paths.has(key(x, y))) continue;
      if (s.grid[y][x].kind === 'water') continue;
      if (occupied(s, x, y)) continue;
      out.push({ x, y });
    }
  }
  return out;
}

function pick<T>(arr: T[]): T | null {
  if (!arr.length) return null;
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function findSpot(
  s: GameState,
  w: number,
  h: number,
  needPath: boolean,
): { x: number; y: number } | null {
  const candidates: { x: number; y: number }[] = [];
  for (let y = 2; y < GRID - 2; y++) {
    for (let x = 2; x < GRID - 2; x++) {
      let ok = true;
      for (let dy = 0; dy < h && ok; dy++) {
        for (let dx = 0; dx < w && ok; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (!inBounds(nx, ny) || s.paths.has(key(nx, ny)) || occupied(s, nx, ny)) ok = false;
          else if (s.grid[ny][nx].kind === 'water') ok = false;
        }
      }
      if (!ok) continue;
      if (needPath && !adjacentToPath(s, x, y, w, h)) continue;
      candidates.push({ x, y });
    }
  }
  return pick(candidates);
}

function makeFlatRide(defId: string, x: number, y: number): PlacedRide | null {
  const def = getRideDef(defId);
  if (!def || def.isTrackBuilt) return null;
  return {
    id: uid('rd'),
    defId,
    name: def.name,
    category: def.category,
    color: def.color,
    x,
    y,
    w: def.footprint.w,
    h: def.footprint.h,
    status: 'open',
    price: Math.max(1, Math.round(def.baseExcitement * 0.9)),
    excitement: def.baseExcitement,
    intensity: def.baseIntensity,
    nausea: def.baseNausea,
    lengthM: 0,
    maxSpeed: 30 + Math.round(def.baseIntensity * 6),
    rideTime: 60,
    reliability: 90,
    breakdown: false,
    income: 0,
    totalRiders: 0,
    track: [],
    queue: [],
    riders: [],
    rideProgress: 0,
  };
}

/** Auto-coaster: lift hill, big drop, turnaround, return run, brakes. */
function makeAutoCoaster(defId: string, x: number, y: number): PlacedRide | null {
  const def = getRideDef(defId);
  if (!def) return null;
  const track = buildCoasterTrack(x, y);
  if (!track) return null;

  const xs = track.map((t) => t.x);
  const ys = track.map((t) => t.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const w = Math.max(...xs) - minX + 1;
  const h = Math.max(...ys) - minY + 1;

  const ride: PlacedRide = {
    id: uid('rd'),
    defId,
    name: def.name,
    category: 'coaster',
    color: def.color,
    x: minX,
    y: minY,
    w,
    h,
    status: 'building',
    price: 0,
    excitement: 0,
    intensity: 0,
    nausea: 0,
    lengthM: 0,
    maxSpeed: 0,
    rideTime: 0,
    reliability: 88,
    breakdown: false,
    income: 0,
    totalRiders: 0,
    track,
    queue: [],
    riders: [],
    rideProgress: 0,
    buildProgress: 1, // station drops first; track lays over time
  };
  const stats = computeCoasterStats(ride);
  return {
    ...ride,
    ...stats,
    price: Math.max(2, Math.round(stats.excitement * 1.3)),
  };
}

function growOne(s: GameState): Partial<GameState> | null {
  const paths = new Set(s.paths);
  const scenery = [...s.scenery];
  const shops = [...s.shops];
  const rides = [...s.rides];
  const staff = [...s.staff];

  // Prefer filling the biggest deficit relative to a soft ideal mix
  const needPath = paths.size < 30 || Math.random() < 0.45;
  if (needPath) {
    const spot = pick(pathFrontier({ ...s, paths }));
    if (spot) {
      paths.add(key(spot.x, spot.y));
      return { paths };
    }
  }

  if (Math.random() < 0.35 || rides.length === 0) {
    const flats = RIDE_DEFS.filter((r) => !r.isTrackBuilt);
    const coasters = RIDE_DEFS.filter((r) => r.isTrackBuilt);
    const wantCoaster = rides.filter((r) => r.category === 'coaster').length < 2 && Math.random() < 0.35;
    if (wantCoaster) {
      const def = pick(coasters);
      // lift hill + drop needs ~10×5 clear footprint
      const spot = def ? findSpot(s, 10, 6, true) : null;
      if (def && spot) {
        // station near path edge; circuit runs +x / −y
        const ride = makeAutoCoaster(def.id, spot.x + 1, spot.y + 4);
        if (ride) {
          paths.add(key(spot.x, spot.y + 4));
          const notifications = [
            ...(s.notifications ?? []).slice(-6),
            {
              id: uid('n'),
              kind: 'info' as const,
              text: `Construction started on ${ride.name}!`,
              time: Date.now(),
            },
          ];
          return { rides: [...rides, ride], paths, notifications };
        }
      }
    }
    const def = pick(flats);
    if (def) {
      const spot = findSpot(s, def.footprint.w, def.footprint.h, true);
      if (spot) {
        const ride = makeFlatRide(def.id, spot.x, spot.y);
        if (ride) return { rides: [...rides, ride] };
      }
    }
  }

  if (Math.random() < 0.4) {
    const def = pick(SHOP_DEFS);
    const spot = def ? findSpot(s, 1, 1, true) : null;
    if (def && spot) {
      const shop: PlacedShop = {
        id: uid('sh'),
        defId: def.id,
        kind: def.kind,
        name: def.name,
        x: spot.x,
        y: spot.y,
        price: def.defaultPrice,
        income: 0,
        customers: 0,
      };
      return { shops: [...shops, shop] };
    }
  }

  if (Math.random() < 0.5) {
    const def = pick(SCENERY_DEFS);
    const spot = def ? findSpot(s, 1, 1, false) : null;
    if (def && spot && !s.paths.has(key(spot.x, spot.y))) {
      const sc: PlacedScenery = { id: uid('sc'), kind: def.kind as SceneryKind, x: spot.x, y: spot.y };
      return { scenery: [...scenery, sc] };
    }
  }

  if (staff.length < 20) {
    const kinds = ['mechanic', 'handyman', 'entertainer', 'security'] as const;
    const kind = pick([...kinds])!;
    const pathKeys = Array.from(paths);
    const pk = pick(pathKeys);
    if (pk) {
      const [x, y] = pk.split(',').map(Number);
      const wages = { mechanic: 80, handyman: 45, entertainer: 60, security: 70 };
      const st: Staff = {
        id: uid('st'),
        kind,
        name: STAFF_NAMES[Math.floor(Math.random() * STAFF_NAMES.length)],
        x,
        y,
        pathIndex: 0,
        wage: wages[kind],
      };
      return { staff: [...staff, st] };
    }
  }

  // fallback path
  const spot = pick(pathFrontier({ ...s, paths }));
  if (spot) {
    paths.add(key(spot.x, spot.y));
    return { paths };
  }
  return null;
}

function shrinkOne(s: GameState): Partial<GameState> | null {
  // Tear down in reverse priority: scenery → shops → rides → staff → outer paths
  if (s.scenery.length) {
    return { scenery: s.scenery.slice(0, -1) };
  }
  if (s.shops.length) {
    return { shops: s.shops.slice(0, -1) };
  }
  if (s.rides.length) {
    return { rides: s.rides.slice(0, -1) };
  }
  if (s.staff.length) {
    return { staff: s.staff.slice(0, -1) };
  }
  // Trim path tiles farthest from entrance (keep avenue core)
  if (s.paths.size <= 12) return null;
  let worst: string | null = null;
  let worstD = -1;
  for (const k of s.paths) {
    const [x, y] = k.split(',').map(Number);
    const d = Math.abs(x - s.entrance.x) + Math.abs(y - s.entrance.y);
    if (d > worstD && d > 4) {
      worstD = d;
      worst = k;
    }
  }
  if (!worst) return null;
  const paths = new Set(s.paths);
  paths.delete(worst);
  return { paths };
}

/** Apply N growth steps (from buys / holder growth). */
export function applyGrowth(s: GameState, steps: number): Partial<GameState> {
  unlockAllRides();
  let cur = s;
  let patch: Partial<GameState> = {};
  for (let i = 0; i < steps; i++) {
    const next = growOne({ ...cur, ...patch, paths: patch.paths ?? cur.paths } as GameState);
    if (!next) break;
    patch = {
      ...patch,
      ...next,
      paths: next.paths ?? patch.paths ?? cur.paths,
      scenery: next.scenery ?? patch.scenery ?? cur.scenery,
      shops: next.shops ?? patch.shops ?? cur.shops,
      rides: next.rides ?? patch.rides ?? cur.rides,
      staff: next.staff ?? patch.staff ?? cur.staff,
      ...(next.notifications
        ? { notifications: next.notifications }
        : patch.notifications
          ? { notifications: patch.notifications }
          : {}),
    };
    cur = { ...cur, ...patch } as GameState;
  }
  return patch;
}

/** Apply N shrink steps (from sells / holder loss). */
export function applyShrink(s: GameState, steps: number): Partial<GameState> {
  let cur = s;
  let patch: Partial<GameState> = {};
  for (let i = 0; i < steps; i++) {
    const next = shrinkOne({ ...cur, ...patch } as GameState);
    if (!next) break;
    patch = { ...patch, ...next };
    cur = { ...cur, ...patch } as GameState;
  }
  return patch;
}

/** Reconcile park contents toward market-derived targets. */
export function reconcileToTargets(s: GameState, t: ParkTargets): Partial<GameState> {
  unlockAllRides();
  let cur = { ...s, paths: new Set(s.paths) } as GameState;
  let patch: Partial<GameState> = {
    cash: t.cash,
    parkValue: t.parkValue,
  };

  const merge = (p: Partial<GameState>) => {
    patch = {
      ...patch,
      ...p,
      paths: p.paths ?? patch.paths ?? cur.paths,
      scenery: p.scenery ?? patch.scenery ?? cur.scenery,
      shops: p.shops ?? patch.shops ?? cur.shops,
      rides: p.rides ?? patch.rides ?? cur.rides,
      staff: p.staff ?? patch.staff ?? cur.staff,
      ...(p.notifications
        ? { notifications: p.notifications }
        : patch.notifications
          ? { notifications: patch.notifications }
          : {}),
    };
    cur = { ...cur, ...patch, paths: (patch.paths as Set<string>) ?? cur.paths } as GameState;
  };

  let guard = 0;
  while ((cur.paths.size < t.pathTiles || cur.rides.length < t.rides || cur.shops.length < t.shops || cur.scenery.length < t.scenery || cur.staff.length < t.staff) && guard++ < 80) {
    const g = growOne(cur);
    if (!g) break;
    merge(g);
  }

  guard = 0;
  while ((cur.rides.length > t.rides || cur.shops.length > t.shops || cur.scenery.length > t.scenery || cur.staff.length > t.staff || cur.paths.size > t.pathTiles + 40) && guard++ < 80) {
    // Prefer removing excess of the over-target category
    if (cur.scenery.length > t.scenery) {
      merge({ scenery: cur.scenery.slice(0, -1) });
      continue;
    }
    if (cur.shops.length > t.shops) {
      merge({ shops: cur.shops.slice(0, -1) });
      continue;
    }
    if (cur.rides.length > t.rides) {
      merge({ rides: cur.rides.slice(0, -1) });
      continue;
    }
    if (cur.staff.length > t.staff) {
      merge({ staff: cur.staff.slice(0, -1) });
      continue;
    }
    const sh = shrinkOne(cur);
    if (!sh) break;
    merge(sh);
  }

  return patch;
}

/** How many build steps a buy of $amount should trigger. */
export function growthStepsForBuy(amountUsd: number): number {
  if (amountUsd < 5) return 1;
  if (amountUsd < 50) return 2;
  if (amountUsd < 250) return 4;
  if (amountUsd < 1000) return 7;
  return 12;
}

export function shrinkStepsForSell(amountUsd: number): number {
  if (amountUsd < 5) return 1;
  if (amountUsd < 50) return 2;
  if (amountUsd < 250) return 5;
  if (amountUsd < 1000) return 9;
  return 14;
}
