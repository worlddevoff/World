import { create } from 'zustand';
import type {
  Tile, PathTile, PlacedScenery, PlacedShop, PlacedRide, Guest, Staff,
  ResearchItem, GameNotification, FinanceRecord, SimSpeed, Tool, WindowId,
  SceneryKind, CoasterSegment, StaffKind, Weather,
} from '../types/game';
import { RIDE_DEFS, SHOP_DEFS, getRideDef, getShopDef } from '../data/rides';
import { SCENERY_DEFS } from '../data/scenery';
import { FIRST_NAMES, LAST_NAMES, STAFF_NAMES, GUEST_SHIRTS, GUEST_PANTS } from '../data/names';
import { createStarterPark } from '../data/starterPark';
import { uid } from '../utils/id';
import { simTick } from './simulation';

const GRID = 40;

export interface WindowState {
  id: WindowId;
  x: number;
  y: number;
  z: number;
  open: boolean;
  payload?: string; // guest id / ride id / def id
}

export interface GameState {
  // meta
  parkName: string;
  cash: number;
  parkRating: number; // 0..999
  parkValue: number;
  loanAmount: number;
  day: number;
  month: number; // 0..7 (RCT had 8 months per year in a scenario)
  year: number;
  weather: Weather;
  speed: SimSpeed;
  ticks: number;

  // world
  grid: Tile[][];
  paths: Set<string>; // "x,y"
  scenery: PlacedScenery[];
  shops: PlacedShop[];
  rides: PlacedRide[];
  guests: Guest[];
  staff: Staff[];
  entrance: { x: number; y: number };

  // research
  research: ResearchItem[]; // queue of undiscovered
  researchProgress: number; // 0..100
  discovered: string[]; // refIds

  // finance
  finance: FinanceRecord;
  financeHistory: number[]; // profit per month
  admissionPrice: number;

  /** Live market telemetry (drives park size + rating). */
  marketHolders: number;
  marketBuyUsd: number;
  marketSellUsd: number;
  marketBuyCount: number;
  marketSellCount: number;
  marketCapUsd: number;
  marketPriceUsd: number;
  marketVolume24hUsd: number;

  // ui
  tool: Tool;
  toolPayload?: string; // sceneryKind / shopDefId / rideDefId / staffKind
  windows: WindowState[];
  topZ: number;
  notifications: GameNotification[];
  selectedRideId?: string;

  // coaster building state
  buildingCoasterId?: string;
  coasterCursor?: CoasterSegment;

  // ---- actions ----
  setSpeed: (s: SimSpeed) => void;
  tick: (dt: number) => void;
  setTool: (t: Tool, payload?: string) => void;
  openWindow: (id: WindowId, payload?: string) => void;
  closeWindow: (id: WindowId) => void;
  focusWindow: (id: WindowId) => void;
  moveWindow: (id: WindowId, x: number, y: number) => void;

  placePath: (x: number, y: number) => void;
  removeAt: (x: number, y: number) => void;
  placeScenery: (kind: SceneryKind, x: number, y: number) => void;
  placeShop: (defId: string, x: number, y: number) => void;
  placeFlatRide: (defId: string, x: number, y: number) => void;

  startCoaster: (defId: string, x: number, y: number) => void;
  addCoasterSegment: (type: CoasterSegment['type']) => void;
  undoCoasterSegment: () => void;
  finishCoaster: (open: boolean) => void;
  cancelCoaster: () => void;

  hireStaff: (kind: StaffKind, x: number, y: number) => void;
  setRidePrice: (rideId: string, price: number) => void;
  setShopPrice: (shopId: string, price: number) => void;
  setAdmission: (p: number) => void;
  setRideStatus: (rideId: string, status: 'open' | 'closed' | 'testing') => void;
  fixRide: (rideId: string) => void;

  notify: (kind: GameNotification['kind'], text: string) => void;
  dismissNotif: (id: string) => void;
  saveGame: () => void;
  loadGame: () => boolean;
}

function makeGrid(): Tile[][] {
  const g: Tile[][] = [];
  for (let y = 0; y < GRID; y++) {
    const row: Tile[] = [];
    for (let x = 0; x < GRID; x++) {
      // a small pond
      const isWater = x >= 5 && x <= 8 && y >= 28 && y <= 31;
      row.push({ kind: isWater ? 'water' : 'grass', height: 0 });
    }
    g.push(row);
  }
  return g;
}

function randName(): string {
  return `${FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)]} ${LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)]}`;
}

export function makeGuest(x: number, y: number): Guest {
  return {
    id: uid('g'),
    name: randName(),
    x, y,
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

const ENTRANCE = { x: 20, y: 39 };
const STARTER = createStarterPark(ENTRANCE);

function buildResearchQueue(): ResearchItem[] {
  const q: ResearchItem[] = [];
  RIDE_DEFS.filter((r) => !r.researched).forEach((r) =>
    q.push({ id: uid('res'), kind: 'ride', refId: r.id, name: r.name }));
  SHOP_DEFS.filter((s) => ['souvenir'].includes(s.kind)).forEach((s) =>
    q.push({ id: uid('res'), kind: 'shop', refId: s.id, name: s.name }));
  // shuffle
  return q.sort(() => Math.random() - 0.5);
}

export const useGame = create<GameState>((set, get) => ({
  parkName: 'Roller Coaster Tycoon',
  cash: STARTER.cash,
  parkRating: STARTER.parkRating,
  parkValue: STARTER.parkValue,
  loanAmount: 5000,
  day: 1,
  month: 0,
  year: 1,
  weather: 'sunny',
  speed: 1,
  ticks: 0,

  grid: makeGrid(),
  paths: STARTER.paths,
  scenery: STARTER.scenery,
  shops: STARTER.shops,
  rides: STARTER.rides,
  guests: STARTER.guests,
  staff: STARTER.staff,
  entrance: ENTRANCE,

  research: buildResearchQueue(),
  researchProgress: 0,
  discovered: [],

  finance: { rideIncome: 0, shopIncome: 0, admission: 0, staffWages: 0, construction: 0, research: 0 },
  financeHistory: [],
  admissionPrice: 0,

  marketHolders: 0,
  marketBuyUsd: 0,
  marketSellUsd: 0,
  marketBuyCount: 0,
  marketSellCount: 0,
  marketCapUsd: 0,
  marketPriceUsd: 0,
  marketVolume24hUsd: 0,

  tool: 'inspect',
  windows: [],
  topZ: 10,
  notifications: [],

  setSpeed: (s) => set({ speed: s }),

  tick: (dt) => set((state) => simTick(state, dt)),

  setTool: (t, payload) =>
    set((s) => {
      // switching away from coaster tool cancels build
      if (s.buildingCoasterId && t !== 'coaster') {
        return { tool: t, toolPayload: payload };
      }
      return { tool: t, toolPayload: payload };
    }),

  openWindow: (id, payload) =>
    set((s) => {
      const z = s.topZ + 1;
      const existing = s.windows.find((w) => w.id === id);
      let windows: WindowState[];
      if (existing) {
        windows = s.windows.map((w) =>
          w.id === id ? { ...w, open: true, z, payload: payload ?? w.payload } : w);
      } else {
        const idx = s.windows.length;
        windows = [
          ...s.windows,
          { id, x: 60 + (idx % 5) * 26, y: 60 + (idx % 5) * 22, z, open: true, payload },
        ];
      }
      return { windows, topZ: z, selectedRideId: id === 'rideinfo' ? payload : s.selectedRideId };
    }),

  closeWindow: (id) =>
    set((s) => ({ windows: s.windows.map((w) => (w.id === id ? { ...w, open: false } : w)) })),

  focusWindow: (id) =>
    set((s) => {
      const z = s.topZ + 1;
      return { windows: s.windows.map((w) => (w.id === id ? { ...w, z } : w)), topZ: z };
    }),

  moveWindow: (id, x, y) =>
    set((s) => ({ windows: s.windows.map((w) => (w.id === id ? { ...w, x, y } : w)) })),

  placePath: (x, y) =>
    set((s) => {
      const k = `${x},${y}`;
      if (s.paths.has(k)) return {};
      if (!inBounds(x, y)) return {};
      if (s.grid[y][x].kind === 'water') return {};
      if (occupied(s, x, y)) return {};
      const cost = 12;
      if (s.cash < cost) return {};
      const paths = new Set(s.paths);
      paths.add(k);
      return {
        paths,
        cash: s.cash - cost,
        finance: { ...s.finance, construction: s.finance.construction + cost },
      };
    }),

  removeAt: (x, y) =>
    set((s) => {
      const k = `${x},${y}`;
      if (s.paths.has(k)) {
        const paths = new Set(s.paths);
        paths.delete(k);
        return { paths };
      }
      const sc = s.scenery.find((o) => o.x === x && o.y === y);
      if (sc) return { scenery: s.scenery.filter((o) => o.id !== sc.id) };
      const sh = s.shops.find((o) => o.x === x && o.y === y);
      if (sh) return { shops: s.shops.filter((o) => o.id !== sh.id) };
      const rd = s.rides.find((r) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h);
      if (rd) return { rides: s.rides.filter((r) => r.id !== rd.id) };
      return {};
    }),

  placeScenery: (kind, x, y) =>
    set((s) => {
      if (!inBounds(x, y) || occupied(s, x, y) || s.paths.has(`${x},${y}`)) return {};
      if (s.grid[y][x].kind === 'water') return {};
      const def = SCENERY_DEFS.find((d) => d.kind === kind)!;
      if (s.cash < def.cost) return {};
      return {
        scenery: [...s.scenery, { id: uid('sc'), kind, x, y }],
        cash: s.cash - def.cost,
        finance: { ...s.finance, construction: s.finance.construction + def.cost },
        parkValue: s.parkValue + def.cost,
      };
    }),

  placeShop: (defId, x, y) =>
    set((s) => {
      const def = getShopDef(defId);
      if (!def) return {};
      if (!inBounds(x, y) || occupied(s, x, y) || s.paths.has(`${x},${y}`)) return {};
      if (!adjacentToPath(s, x, y, 1, 1)) {
        get().notify('bad', 'Shops must be built next to a path!');
        return {};
      }
      if (s.cash < def.cost) { get().notify('bad', 'Not enough cash!'); return {}; }
      const shop: PlacedShop = {
        id: uid('sh'), defId, kind: def.kind, name: def.name,
        x, y, price: def.defaultPrice, income: 0, customers: 0,
      };
      return {
        shops: [...s.shops, shop],
        cash: s.cash - def.cost,
        finance: { ...s.finance, construction: s.finance.construction + def.cost },
        parkValue: s.parkValue + def.cost,
      };
    }),

  placeFlatRide: (defId, x, y) =>
    set((s) => {
      const def = getRideDef(defId);
      if (!def) return {};
      const w = def.footprint.w, h = def.footprint.h;
      for (let dy = 0; dy < h; dy++)
        for (let dx = 0; dx < w; dx++)
          if (!inBounds(x + dx, y + dy) || occupied(s, x + dx, y + dy) || s.paths.has(`${x + dx},${y + dy}`) || s.grid[y + dy][x + dx].kind === 'water')
            { get().notify('bad', 'Not enough clear space!'); return {}; }
      if (!adjacentToPath(s, x, y, w, h)) { get().notify('bad', 'Ride must touch a path!'); return {}; }
      if (s.cash < def.cost) { get().notify('bad', 'Not enough cash!'); return {}; }
      const ride: PlacedRide = {
        id: uid('rd'), defId, name: def.name, category: def.category, color: def.color,
        x, y, w, h, status: 'open', price: Math.max(1, Math.round(def.baseExcitement * 0.9)),
        excitement: def.baseExcitement, intensity: def.baseIntensity, nausea: def.baseNausea,
        lengthM: 0, maxSpeed: 30 + Math.round(def.baseIntensity * 6), rideTime: 60,
        reliability: 90, breakdown: false, income: 0, totalRiders: 0,
        track: [], queue: [], riders: [], rideProgress: 0,
      };
      return {
        rides: [...s.rides, ride],
        cash: s.cash - def.cost,
        finance: { ...s.finance, construction: s.finance.construction + def.cost },
        parkValue: s.parkValue + def.cost,
        tool: 'none', toolPayload: undefined,
      };
    }),

  startCoaster: (defId, x, y) =>
    set((s) => {
      if (s.buildingCoasterId) return {};
      const def = getRideDef(defId);
      if (!def) return {};
      if (!inBounds(x, y) || occupied(s, x, y) || s.paths.has(`${x},${y}`) || s.grid[y][x].kind === 'water') {
        get().notify('bad', 'Cannot place station here!'); return {};
      }
      if (s.cash < def.cost) { get().notify('bad', 'Not enough cash!'); return {}; }
      const ride: PlacedRide = {
        id: uid('rd'), defId, name: def.name, category: 'coaster', color: def.color,
        x, y, w: 1, h: 1, status: 'building', price: 0,
        excitement: 0, intensity: 0, nausea: 0, lengthM: 0, maxSpeed: 0, rideTime: 0,
        reliability: 88, breakdown: false, income: 0, totalRiders: 0,
        track: [{ x, y, z: 0, type: 'station', dir: 0 }],
        queue: [], riders: [], rideProgress: 0,
      };
      const cursor = nextCursor(ride.track);
      return {
        rides: [...s.rides, ride],
        buildingCoasterId: ride.id,
        coasterCursor: cursor,
        cash: s.cash - def.cost,
        finance: { ...s.finance, construction: s.finance.construction + def.cost },
      };
    }),

  addCoasterSegment: (type) =>
    set((s) => {
      if (!s.buildingCoasterId) return {};
      const ride = s.rides.find((r) => r.id === s.buildingCoasterId);
      if (!ride) return {};
      const last = ride.track[ride.track.length - 1];
      let dir = last.dir;
      let z = last.z;
      if (type === 'left') dir = ((dir + 3) % 4) as CoasterSegment['dir'];
      if (type === 'right') dir = ((dir + 1) % 4) as CoasterSegment['dir'];
      const DELTA: Record<number, { x: number; y: number }> = {
        0: { x: 1, y: 0 }, 1: { x: 0, y: 1 }, 2: { x: -1, y: 0 }, 3: { x: 0, y: -1 },
      };
      const d = DELTA[dir];
      const nx = last.x + d.x;
      const ny = last.y + d.y;
      if (type === 'up') z += 1;
      if (type === 'down') z = Math.max(0, z - 1);
      if (!inBounds(nx, ny)) { get().notify('bad', 'Track off the edge!'); return {}; }
      const segCost = 55;
      if (s.cash < segCost) { get().notify('bad', 'Not enough cash for track!'); return {}; }
      const seg: CoasterSegment = { x: nx, y: ny, z, type, dir };
      const track = [...ride.track, seg];
      const rides = s.rides.map((r) => (r.id === ride.id ? { ...r, track } : r));
      return {
        rides,
        coasterCursor: nextCursor(track),
        cash: s.cash - segCost,
        finance: { ...s.finance, construction: s.finance.construction + segCost },
      };
    }),

  undoCoasterSegment: () =>
    set((s) => {
      if (!s.buildingCoasterId) return {};
      const ride = s.rides.find((r) => r.id === s.buildingCoasterId);
      if (!ride || ride.track.length <= 1) return {};
      const track = ride.track.slice(0, -1);
      const rides = s.rides.map((r) => (r.id === ride.id ? { ...r, track } : r));
      return { rides, coasterCursor: nextCursor(track), cash: s.cash + 55 };
    }),

  finishCoaster: (open) =>
    set((s) => {
      if (!s.buildingCoasterId) return {};
      const ride = s.rides.find((r) => r.id === s.buildingCoasterId);
      if (!ride) return {};
      if (ride.track.length < 4) { get().notify('bad', 'Track too short to complete!'); return {}; }
      const stats = computeCoasterStats(ride);
      const rides = s.rides.map((r) =>
        r.id === ride.id
          ? { ...r, ...stats, status: (open ? 'open' : 'testing') as PlacedRide['status'],
              price: Math.max(2, Math.round(stats.excitement * 1.3)) }
          : r);
      get().notify('good', `${ride.name} is complete!`);
      return {
        rides,
        buildingCoasterId: undefined,
        coasterCursor: undefined,
        tool: 'none', toolPayload: undefined,
        parkValue: s.parkValue + Math.round(stats.excitement * 400),
      };
    }),

  cancelCoaster: () =>
    set((s) => {
      if (!s.buildingCoasterId) return {};
      const ride = s.rides.find((r) => r.id === s.buildingCoasterId);
      const refund = ride ? ride.track.length * 55 : 0;
      return {
        rides: s.rides.filter((r) => r.id !== s.buildingCoasterId),
        buildingCoasterId: undefined,
        coasterCursor: undefined,
        cash: s.cash + refund,
        tool: 'none', toolPayload: undefined,
      };
    }),

  hireStaff: (kind, x, y) =>
    set((s) => {
      if (!s.paths.has(`${x},${y}`)) { get().notify('bad', 'Place staff on a path!'); return {}; }
      const wages: Record<StaffKind, number> = { mechanic: 80, handyman: 45, entertainer: 60, security: 70 };
      const name = STAFF_NAMES[Math.floor(Math.random() * STAFF_NAMES.length)];
      const staff: Staff = { id: uid('st'), kind, name, x, y, pathIndex: 0, wage: wages[kind] };
      return { staff: [...s.staff, staff], tool: 'none', toolPayload: undefined };
    }),

  setRidePrice: (rideId, price) =>
    set((s) => ({ rides: s.rides.map((r) => (r.id === rideId ? { ...r, price: Math.max(0, price) } : r)) })),
  setShopPrice: (shopId, price) =>
    set((s) => ({ shops: s.shops.map((sh) => (sh.id === shopId ? { ...sh, price: Math.max(0, price) } : sh)) })),
  setAdmission: (p) => set({ admissionPrice: Math.max(0, p) }),

  setRideStatus: (rideId, status) =>
    set((s) => ({ rides: s.rides.map((r) => (r.id === rideId ? { ...r, status } : r)) })),

  fixRide: (rideId) =>
    set((s) => ({
      rides: s.rides.map((r) =>
        r.id === rideId ? { ...r, breakdown: false, reliability: Math.min(100, r.reliability + 20), status: 'open' } : r),
    })),

  notify: (kind, text) =>
    set((s) => ({
      notifications: [
        ...(s.notifications ?? []).slice(-6),
        { id: uid('n'), kind, text, time: Date.now() },
      ],
    })),

  dismissNotif: (id) =>
    set((s) => ({ notifications: (s.notifications ?? []).filter((n) => n.id !== id) })),

  saveGame: () => {
    const s = get();
    const data = {
      parkName: s.parkName, cash: s.cash, parkRating: s.parkRating, parkValue: s.parkValue,
      loanAmount: s.loanAmount, day: s.day, month: s.month, year: s.year, weather: s.weather,
      paths: Array.from(s.paths), scenery: s.scenery, shops: s.shops, rides: s.rides,
      guests: s.guests, staff: s.staff, research: s.research, researchProgress: s.researchProgress,
      discovered: s.discovered, finance: s.finance, financeHistory: s.financeHistory,
      admissionPrice: s.admissionPrice,
    };
    try { localStorage.setItem('rct_save', JSON.stringify(data)); get().notify('good', 'Game saved!'); }
    catch { get().notify('bad', 'Save failed.'); }
  },

  loadGame: () => {
    try {
      const raw = localStorage.getItem('rct_save');
      if (!raw) { get().notify('bad', 'No saved game found.'); return false; }
      const d = JSON.parse(raw);
      set({
        parkName: d.parkName, cash: d.cash, parkRating: d.parkRating, parkValue: d.parkValue,
        loanAmount: d.loanAmount, day: d.day, month: d.month, year: d.year, weather: d.weather,
        paths: new Set(d.paths), scenery: d.scenery, shops: d.shops, rides: d.rides,
        guests: d.guests, staff: d.staff, research: d.research, researchProgress: d.researchProgress,
        discovered: d.discovered, finance: d.finance, financeHistory: d.financeHistory,
        admissionPrice: d.admissionPrice,
      });
      get().notify('good', 'Game loaded!');
      return true;
    } catch { get().notify('bad', 'Load failed.'); return false; }
  },
}));

// ---- helpers ---------------------------------------------------------------

function inBounds(x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < GRID && y < GRID;
}

function occupied(s: GameState, x: number, y: number): boolean {
  if (s.scenery.some((o) => o.x === x && o.y === y)) return true;
  if (s.shops.some((o) => o.x === x && o.y === y)) return true;
  if (s.rides.some((r) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h)) return true;
  return false;
}

function adjacentToPath(s: GameState, x: number, y: number, w: number, h: number): boolean {
  for (let dy = -1; dy <= h; dy++)
    for (let dx = -1; dx <= w; dx++) {
      if (dx >= 0 && dx < w && dy >= 0 && dy < h) continue;
      if (s.paths.has(`${x + dx},${y + dy}`)) return true;
    }
  return false;
}

function nextCursor(track: CoasterSegment[]): CoasterSegment {
  const last = track[track.length - 1];
  const DELTA: Record<number, { x: number; y: number }> = {
    0: { x: 1, y: 0 }, 1: { x: 0, y: 1 }, 2: { x: -1, y: 0 }, 3: { x: 0, y: -1 },
  };
  const d = DELTA[last.dir];
  return { x: last.x + d.x, y: last.y + d.y, z: last.z, type: 'straight', dir: last.dir };
}

export function computeCoasterStats(ride: PlacedRide) {
  const track = ride.track;
  const def = getRideDef(ride.defId)!;
  const len = track.length;
  let drops = 0, turns = 0, maxZ = 0, brakes = 0;
  track.forEach((t) => {
    if (t.type === 'down') drops++;
    if (t.type === 'left' || t.type === 'right') turns++;
    if (t.type === 'brake') brakes++;
    maxZ = Math.max(maxZ, t.z);
  });
  const lengthM = len * 12;
  const maxSpeed = Math.round(28 + maxZ * 9 + drops * 3);
  const rideTime = Math.round(len * 1.5);
  let excitement = def.baseExcitement * 0.4 + drops * 0.5 + turns * 0.35 + maxZ * 0.4;
  let intensity = def.baseIntensity * 0.4 + drops * 0.6 + maxZ * 0.5 + turns * 0.2;
  let nausea = def.baseNausea * 0.5 + turns * 0.4 + drops * 0.25 - brakes * 0.2;
  // brakes reduce intensity/nausea a touch
  intensity -= brakes * 0.15;
  excitement = Math.max(1, Math.min(9.9, +excitement.toFixed(2)));
  intensity = Math.max(1, Math.min(9.9, +intensity.toFixed(2)));
  nausea = Math.max(0.3, Math.min(9.9, +nausea.toFixed(2)));
  return { excitement, intensity, nausea, lengthM, maxSpeed, rideTime };
}
