// Core domain types for the WORLD living civilization.

export type ZoneId =
  | 'village'
  | 'city'
  | 'industrial'
  | 'entertainment'
  | 'wilderness';

// A raw transaction as it would arrive from Solana (or the simulator).
export interface WorldTransaction {
  type: 'BUY' | 'SELL';
  amount: number;
  wallet: string;
  timestamp: string;
  transaction: string;
}

// The normalized world-facing event produced by the event engine.
export interface WorldEvent {
  type: 'BUILD' | 'DAMAGE' | 'DESTROY' | 'DISASTER';
  object: WorldObjectKind | DisasterKind;
  location: GridPos;
  magnitude: number; // 1 = small ... 6 = massive
  source: WorldTransaction;
  label: string; // human summary e.g. "New house constructed"
  emoji: string;
  variant?: number; // pins the exact sprite variant so name + look match
  /** Ground tiles occupied (1 = cottage, 2 = manor). */
  tiles?: 1 | 2;
}

export type DisasterKind =
  | 'EARTHQUAKE'
  | 'METEOR'
  | 'FLOOD'
  | 'FIRE'
  | 'STORM';

export type WorldObjectKind =
  | 'DECORATION'
  | 'FLOWER'
  | 'TREE'
  | 'ROAD'
  | 'HOUSE'
  | 'FARM'
  | 'SHOP'
  | 'PARK'
  | 'RESTAURANT'
  | 'FACTORY'
  | 'TOWER'
  | 'ATTRACTION'
  | 'LANDMARK'
  | 'STADIUM';

export type ObjectStage =
  | 'incoming' // materials arriving
  | 'constructing'
  | 'built'
  | 'warning'
  | 'damaged'
  | 'collapsing'
  | 'rubble';

export interface GridPos {
  x: number;
  y: number;
}

export interface WorldObject {
  id: string;
  kind: WorldObjectKind;
  pos: GridPos;
  zone: ZoneId;
  stage: ObjectStage;
  createdAt: number;
  /** Solana wallet that bought this plot into existence. */
  bornBy: string;
  /** USD notional of the buy that created this plot. */
  purchaseAmount?: number;
  variant: number; // deterministic style seed
  height: number; // visual footprint scale
  era: number; // world era at time of construction (0..4)
  /** How many ground tiles this building occupies. */
  tiles?: 1 | 2;
  /** Second tile offset from `pos` when tiles === 2. */
  span?: GridPos;
}

// Ambient sea life that appears as the world's waters grow.
export interface Critter {
  id: string;
  x: number; // continuous grid coords
  y: number;
  kind: 'fish' | 'whale';
  speed: number;
  color: string;
  phase: number;
}

export interface WorldEra {
  index: number; // 0..4
  name: string;
  emoji: string;
}

// A transient marker that visually links a trade to the tile it changed:
// a coin/beam drops onto the spot and a "$427 → 🌳" ghost rises.
export interface EventPing {
  id: string;
  pos: GridPos;
  emoji: string;
  amount: number;
  kind: 'BUY' | 'SELL';
  ts: number;
}

// Camera focus request. `ts` retriggers the fly-to; `mode` decides how far.
// `follow` = spectator ease (launch-day stream camera) — locks onto a trader.
export interface FocusTarget {
  pos: GridPos;
  ts: number;
  mode: 'nudge' | 'center' | 'follow';
  /** Wallet being followed (Live cam badge). */
  wallet?: string;
  /** Optional target zoom for follow shots. */
  zoom?: number;
}

// Per-wallet tallies powering the leaderboards.
export interface WalletStat {
  wallet: string;
  built: number;
  destroyed: number;
  landmarks: number;
  contributed: number;
}

// A lasting mark on the land where a building was destroyed. It slowly
// regrows back into grass, so disasters leave visible history in the map.
export interface Scar {
  id: string;
  pos: GridPos;
  bornAt: number;
  life: number; // ms until fully regrown
}

// Append-only record of every object ever built, with when it was created
// and (if it fell) when it was destroyed — powers the time-machine replay.
export interface BuildLogEntry {
  id: string;
  kind: WorldObjectKind;
  pos: GridPos;
  zone: ZoneId;
  variant: number;
  height: number;
  era: number;
  bornBy: string;
  purchaseAmount?: number;
  createdAt: number;
  destroyedAt?: number;
  tiles?: 1 | 2;
  span?: GridPos;
}

export interface Npc {
  id: string;
  x: number; // continuous grid coords
  y: number;
  tx: number; // target
  ty: number;
  speed: number;
  kind: 'walker' | 'worker' | 'visitor';
  color: string;
}

export interface Vehicle {
  id: string;
  x: number;
  y: number;
  tx: number;
  ty: number;
  /** Next road cell the car is committed to (stops per-frame path flicker). */
  wx?: number;
  wy?: number;
  speed: number;
  kind: 'car' | 'boat';
  color: string;
}

export type MilestoneEggKind =
  | 'village'
  | 'city'
  | 'metropolis'
  | 'space'
  | 'civilization';

/** What a milestone watches — reachable on a real Pump.fun launch. */
export type MilestoneMetric = 'volume' | 'buyers' | 'mcap';

export interface Milestone {
  id: string;
  metric: MilestoneMetric;
  threshold: number;
  emoji: string;
  title: string;
  unlockLabel: string;
  unlocked: boolean;
}

/** Short-lived celebration when a milestone unlocks. */
export interface MilestoneEgg {
  id: string; // milestone id
  kind: MilestoneEggKind;
  emoji: string;
  title: string;
  tagline: string;
  startedAt: number;
}

export interface HistoryEntry {
  id: string;
  date: string;
  emoji: string;
  text: string;
  major: boolean;
  timestamp: number;
}

export interface PlayerProfile {
  wallet: string;
  contribution: number;
  buildingsCreated: number;
  buildingsDestroyed: number;
  population: number;
  territory: string;
}

export interface ShareMoment {
  id: string;
  /** OWNED = plot from a tracked on-chain build; CITIZEN = holder identity (exchange OK). */
  kind: 'EVENT' | 'DISASTER' | 'OWNED' | 'MILESTONE' | 'CITIZEN';
  headline: string;
  subject: string;
  amount: number;
  detail: string;
  emoji: string;
  population: number;
  timestamp: number;
  owner?: string; // wallet, for ownership / citizen cards
}

export interface WorldStats {
  /** Token holder count (synced from live feed). */
  population: number;
  buildings: number;
  worldValue: number;
  /** Cumulative USD buy volume (milestone fuel). */
  volumeUsd: number;
  /** Distinct buyer wallets seen this session. */
  uniqueBuyers: number;
  createdAt: number;
}

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';
