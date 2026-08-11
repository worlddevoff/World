// Shared game domain types for the RCT-style theme park sim.

export type Weather = 'sunny' | 'cloudy' | 'rain' | 'thunder';

export type SimSpeed = 0 | 1 | 2 | 3;

export type Tool =
  | 'none'
  | 'path'
  | 'bulldoze'
  | 'scenery'
  | 'shop'
  | 'ride'
  | 'coaster'
  | 'staff'
  | 'inspect';

export type Direction = 0 | 1 | 2 | 3; // NE, SE, SW, NW (isometric)

export interface GridPos {
  x: number;
  y: number;
}

// ---- Terrain / tiles -------------------------------------------------------

export type TileKind = 'grass' | 'water';

export interface Tile {
  kind: TileKind;
  height: number; // reserved for future elevation
}

// ---- Placeable objects on the grid ----------------------------------------

export type SceneryKind =
  | 'tree'
  | 'bush'
  | 'flower'
  | 'bench'
  | 'bin'
  | 'lamp'
  | 'fence';

export interface PlacedScenery {
  id: string;
  kind: SceneryKind;
  x: number;
  y: number;
}

export interface PathTile {
  x: number;
  y: number;
}

// ---- Shops / stalls --------------------------------------------------------

export type ShopKind = 'food' | 'drink' | 'info' | 'restroom' | 'souvenir';

export interface ShopDef {
  id: string;
  kind: ShopKind;
  name: string;
  cost: number;
  defaultPrice: number;
  color: string;
}

export interface PlacedShop {
  id: string;
  defId: string;
  kind: ShopKind;
  name: string;
  x: number;
  y: number;
  price: number;
  income: number;
  customers: number;
}

// ---- Rides -----------------------------------------------------------------

export type RideCategory = 'coaster' | 'flat' | 'transport';

export interface RideDef {
  id: string;
  name: string;
  category: RideCategory;
  cost: number;
  footprint: { w: number; h: number };
  color: string;
  baseExcitement: number;
  baseIntensity: number;
  baseNausea: number;
  capacity: number;
  isTrackBuilt?: boolean; // coasters require building track
  researched: boolean;
}

export type RideStatus = 'building' | 'testing' | 'open' | 'closed' | 'broken';

export interface CoasterSegment {
  x: number;
  y: number;
  z: number; // height level
  type: 'station' | 'straight' | 'left' | 'right' | 'up' | 'down' | 'brake';
  dir: Direction;
}

export interface PlacedRide {
  id: string;
  defId: string;
  name: string;
  category: RideCategory;
  color: string;
  x: number;
  y: number;
  w: number;
  h: number;
  status: RideStatus;
  price: number;
  // stats
  excitement: number;
  intensity: number;
  nausea: number;
  lengthM: number;
  maxSpeed: number;
  rideTime: number;
  reliability: number; // 0..100
  breakdown: boolean;
  // economy
  income: number;
  totalRiders: number;
  // coaster track (empty for flat rides)
  track: CoasterSegment[];
  queue: string[]; // guest ids
  riders: string[]; // guest ids currently riding
  rideProgress: number; // 0..1 for current cycle
  /** Segments laid while status==='building' (fractional for anim). Fully built when >= track.length. */
  buildProgress?: number;
}

// ---- Guests ----------------------------------------------------------------

export type GuestState =
  | 'walking'
  | 'queuing'
  | 'riding'
  | 'buying'
  | 'sitting'
  | 'vomiting'
  | 'leaving';

export interface Guest {
  id: string;
  name: string;
  // pixel position in world (grid units, fractional)
  x: number;
  y: number;
  targetPath?: GridPos[];
  pathIndex: number;
  state: GuestState;
  happiness: number; // 0..100
  hunger: number; // 0..100 (100 = starving)
  thirst: number;
  energy: number; // 0..100 (0 = exhausted)
  nausea: number; // 0..100
  money: number;
  thought: string;
  thoughtTimer: number;
  colorShirt: string;
  colorPants: string;
  targetRideId?: string;
  targetShopId?: string;
  busyTimer: number;
  inPark: boolean;
}

// ---- Staff -----------------------------------------------------------------

export type StaffKind = 'mechanic' | 'handyman' | 'entertainer' | 'security';

export interface Staff {
  id: string;
  kind: StaffKind;
  name: string;
  x: number;
  y: number;
  targetPath?: GridPos[];
  pathIndex: number;
  wage: number;
}

// ---- Research --------------------------------------------------------------

export interface ResearchItem {
  id: string;
  kind: 'ride' | 'shop' | 'scenery';
  refId: string;
  name: string;
}

// ---- Notifications ---------------------------------------------------------

export type NotifKind = 'info' | 'good' | 'bad' | 'research';

export interface GameNotification {
  id: string;
  kind: NotifKind;
  text: string;
  time: number;
}

// ---- Finance ---------------------------------------------------------------

export interface FinanceRecord {
  rideIncome: number;
  shopIncome: number;
  admission: number;
  staffWages: number;
  construction: number;
  research: number;
}

// ---- Windows ---------------------------------------------------------------

export type WindowId =
  | 'rides'
  | 'coaster'
  | 'paths'
  | 'scenery'
  | 'shops'
  | 'parkinfo'
  | 'finances'
  | 'research'
  | 'guests'
  | 'ridelist'
  | 'staff'
  | 'guestinfo'
  | 'rideinfo'
  | 'saveload';
