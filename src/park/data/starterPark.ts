/**
 * Hand-crafted opening park so the first viewport isn't empty grass.
 * Market growth expands from here; floors in targetsFromMarket protect it.
 */

import type {
  Guest,
  PlacedRide,
  PlacedScenery,
  PlacedShop,
  SceneryKind,
  Staff,
} from '../types/game';
import { getRideDef, getShopDef } from './rides';
import { buildCoasterTrack } from './coasterLayouts';
import { FIRST_NAMES, LAST_NAMES, STAFF_NAMES, GUEST_SHIRTS, GUEST_PANTS } from './names';
import { uid } from '../utils/id';

const GRID = 40;

function key(x: number, y: number) {
  return `${x},${y}`;
}

function addPath(paths: Set<string>, x: number, y: number) {
  if (x >= 0 && y >= 0 && x < GRID && y < GRID) paths.add(key(x, y));
}

function coasterStats(ride: PlacedRide) {
  const track = ride.track;
  const def = getRideDef(ride.defId)!;
  let drops = 0;
  let turns = 0;
  let maxZ = 0;
  let brakes = 0;
  track.forEach((t) => {
    if (t.type === 'down') drops++;
    if (t.type === 'left' || t.type === 'right') turns++;
    if (t.type === 'brake') brakes++;
    maxZ = Math.max(maxZ, t.z);
  });
  const lengthM = track.length * 12;
  const maxSpeed = Math.round(28 + maxZ * 9 + drops * 3);
  const rideTime = Math.round(track.length * 1.5);
  let excitement = def.baseExcitement * 0.4 + drops * 0.5 + turns * 0.35 + maxZ * 0.4;
  let intensity = def.baseIntensity * 0.4 + drops * 0.6 + maxZ * 0.5 + turns * 0.2;
  let nausea = def.baseNausea * 0.5 + turns * 0.4 + drops * 0.25 - brakes * 0.2;
  intensity -= brakes * 0.15;
  excitement = Math.max(1, Math.min(9.9, +excitement.toFixed(2)));
  intensity = Math.max(1, Math.min(9.9, +intensity.toFixed(2)));
  nausea = Math.max(0.3, Math.min(9.9, +nausea.toFixed(2)));
  return { excitement, intensity, nausea, lengthM, maxSpeed, rideTime };
}

function makeOpenCoaster(defId: string, x: number, y: number): PlacedRide | null {
  const def = getRideDef(defId);
  if (!def) return null;
  const track = buildCoasterTrack(x, y);
  if (!track) return null;

  const xs = track.map((t) => t.x);
  const ys = track.map((t) => t.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const ride: PlacedRide = {
    id: uid('rd'),
    defId,
    name: def.name,
    category: 'coaster',
    color: def.color,
    x: minX,
    y: minY,
    w: Math.max(...xs) - minX + 1,
    h: Math.max(...ys) - minY + 1,
    status: 'open',
    price: 0,
    excitement: 0,
    intensity: 0,
    nausea: 0,
    lengthM: 0,
    maxSpeed: 0,
    rideTime: 0,
    reliability: 92,
    breakdown: false,
    income: 0,
    totalRiders: 0,
    track,
    queue: [],
    riders: [],
    rideProgress: 0,
    buildProgress: track.length,
  };
  const stats = coasterStats(ride);
  return {
    ...ride,
    ...stats,
    price: Math.max(2, Math.round(stats.excitement * 1.3)),
  };
}

function makeFlat(defId: string, x: number, y: number): PlacedRide | null {
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
    reliability: 94,
    breakdown: false,
    income: 0,
    totalRiders: 0,
    track: [],
    queue: [],
    riders: [],
    rideProgress: 0,
  };
}

function makeShop(defId: string, x: number, y: number): PlacedShop | null {
  const def = getShopDef(defId);
  if (!def) return null;
  return {
    id: uid('sh'),
    defId: def.id,
    kind: def.kind,
    name: def.name,
    x,
    y,
    price: def.defaultPrice,
    income: 0,
    customers: 0,
  };
}

function sc(kind: SceneryKind, x: number, y: number): PlacedScenery {
  return { id: uid('sc'), kind, x, y };
}

function starterGuest(x: number, y: number): Guest {
  return {
    id: uid('g'),
    name: `${FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)]} ${LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)]}`,
    x,
    y,
    pathIndex: 0,
    state: 'walking',
    happiness: 70 + Math.random() * 20,
    hunger: Math.random() * 25,
    thirst: Math.random() * 25,
    energy: 80 + Math.random() * 20,
    nausea: 0,
    money: 25 + Math.floor(Math.random() * 60),
    thought: 'What a lovely park!',
    thoughtTimer: 60,
    colorShirt: GUEST_SHIRTS[Math.floor(Math.random() * GUEST_SHIRTS.length)],
    colorPants: GUEST_PANTS[Math.floor(Math.random() * GUEST_PANTS.length)],
    busyTimer: 0,
    inPark: true,
  };
}

export interface StarterPark {
  paths: Set<string>;
  rides: PlacedRide[];
  shops: PlacedShop[];
  scenery: PlacedScenery[];
  staff: Staff[];
  guests: Guest[];
  parkValue: number;
  parkRating: number;
  cash: number;
}

/** Build the opening park around the entrance. */
export function createStarterPark(entrance: { x: number; y: number }): StarterPark {
  const { x: ex, y: ey } = entrance;
  const paths = new Set<string>();

  // Main avenue up from the gate
  for (let y = ey; y >= ey - 16; y--) addPath(paths, ex, y);
  // Cross streets
  for (let x = ex - 8; x <= ex + 8; x++) addPath(paths, x, ey - 5);
  for (let x = ex - 8; x <= ex + 8; x++) addPath(paths, x, ey - 11);
  // Side loops
  for (let y = ey - 11; y <= ey - 5; y++) {
    addPath(paths, ex - 8, y);
    addPath(paths, ex + 8, y);
  }
  // Queue spurs
  for (let x = ex - 3; x <= ex - 1; x++) addPath(paths, x, ey - 8);
  for (let x = ex + 1; x <= ex + 3; x++) addPath(paths, x, ey - 8);

  const rides: PlacedRide[] = [];
  const carousel = makeFlat('carousel', ex + 2, ey - 10);
  const ferris = makeFlat('ferris_wheel', ex - 5, ey - 10);
  const coaster = makeOpenCoaster('wooden_coaster', ex - 8, ey - 16);
  if (carousel) rides.push(carousel);
  if (ferris) rides.push(ferris);
  if (coaster) rides.push(coaster);

  // Path to coaster station
  if (coaster) {
    for (let y = ey - 16; y <= ey - 11; y++) addPath(paths, ex - 8, y);
    addPath(paths, ex - 9, ey - 11);
  }

  const shops: PlacedShop[] = [];
  const food = makeShop('food_stall', ex - 2, ey - 6);
  const drinks = makeShop('drink_stall', ex + 2, ey - 6);
  const info = makeShop('info_kiosk', ex + 1, ey - 1);
  if (food) shops.push(food);
  if (drinks) shops.push(drinks);
  if (info) shops.push(info);

  const scenery: PlacedScenery[] = [];
  for (const [x, y] of [
    [ex - 1, ey - 2],
    [ex + 1, ey - 2],
    [ex - 1, ey - 4],
    [ex + 1, ey - 4],
    [ex - 9, ey - 7],
    [ex + 9, ey - 7],
    [ex - 9, ey - 12],
    [ex + 9, ey - 12],
    [ex - 4, ey - 13],
    [ex + 5, ey - 13],
    [ex - 6, ey - 3],
    [ex + 6, ey - 3],
  ] as const) {
    if (!paths.has(key(x, y))) scenery.push(sc('tree', x, y));
  }
  scenery.push(sc('flower', ex - 2, ey - 1));
  scenery.push(sc('flower', ex + 2, ey - 1));
  scenery.push(sc('bush', ex - 3, ey - 3));
  scenery.push(sc('bush', ex + 3, ey - 3));
  scenery.push(sc('bench', ex - 1, ey - 7));
  scenery.push(sc('bench', ex + 1, ey - 7));
  scenery.push(sc('bin', ex - 1, ey - 9));
  scenery.push(sc('bin', ex + 1, ey - 9));
  scenery.push(sc('lamp', ex - 1, ey - 3));
  scenery.push(sc('lamp', ex + 1, ey - 3));
  scenery.push(sc('lamp', ex - 1, ey - 13));
  scenery.push(sc('lamp', ex + 1, ey - 13));
  scenery.push(sc('fence', ex - 4, ey - 1));
  scenery.push(sc('fence', ex + 4, ey - 1));

  const staff: Staff[] = [
    {
      id: uid('st'),
      kind: 'handyman',
      name: STAFF_NAMES[0] ?? 'Pat',
      x: ex - 3,
      y: ey - 5,
      pathIndex: 0,
      wage: 60,
    },
    {
      id: uid('st'),
      kind: 'mechanic',
      name: STAFF_NAMES[1] ?? 'Sam',
      x: ex + 3,
      y: ey - 5,
      pathIndex: 0,
      wage: 80,
    },
  ];

  const guests: Guest[] = [];
  for (const [gx, gy] of [
    [ex, ey - 1],
    [ex, ey - 3],
    [ex, ey - 6],
    [ex - 2, ey - 5],
    [ex + 2, ey - 5],
    [ex, ey - 9],
    [ex - 4, ey - 11],
    [ex + 4, ey - 11],
  ] as const) {
    guests.push(starterGuest(gx, gy));
  }

  return {
    paths,
    rides,
    shops,
    scenery,
    staff,
    guests,
    parkValue: 28_000,
    parkRating: 620,
    cash: 15_000,
  };
}

/** Minimum park size — keeps the starter from being demolished on low market. */
export const STARTER_FLOORS = {
  pathTiles: 55,
  rides: 3,
  shops: 3,
  scenery: 18,
  staff: 2,
} as const;
