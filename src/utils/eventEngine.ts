// The deterministic event engine.
// Converts a standardized WorldTransaction into a WorldEvent.
// This is the seam where real Solana data replaces simulated data:
// feed real transactions in the same shape and everything downstream works.

import type {
  WorldTransaction,
  WorldEvent,
  WorldObjectKind,
  DisasterKind,
} from '../types/world';

interface PoolEntry {
  kind: WorldObjectKind;
  weight: number;
  label: string;
  emoji: string;
  variant?: number; // pins a specific sprite so the name matches the look
  tiles?: 1 | 2;
}

interface BuyTier {
  min: number;
  kind: WorldObjectKind;
  magnitude: number;
  label: string;
  emoji: string;
  tiles?: 1 | 2;
  variant?: number;
  // Small buys draw from a varied pool so a stream of them builds out a real
  // settlement (paths, trees, little homes) instead of endless decorations.
  pool?: PoolEntry[];
}

// Dust buys (< $10) — petals and street clutter, not real structures.
const DUST_POOL: PoolEntry[] = [
  { kind: 'FLOWER', weight: 3, label: 'Flowers planted', emoji: '🌷' },
  { kind: 'DECORATION', weight: 2, label: 'Street furniture added', emoji: '🌸' },
];

// ~$10 — greenery mix so the map isn't a tree monoculture.
const GREEN_POOL: PoolEntry[] = [
  { kind: 'TREE', weight: 4, label: 'Tree planted', emoji: '🌳' },
  { kind: 'FLOWER', weight: 3, label: 'Flower bed planted', emoji: '🌷' },
  { kind: 'PARK', weight: 2, label: 'Little park opened', emoji: '🌳' },
  { kind: 'DECORATION', weight: 2, label: 'Hedge trimmed', emoji: '🌿', variant: 0 },
  { kind: 'DECORATION', weight: 1, label: 'Park bench placed', emoji: '🪑', variant: 1 },
];

// ~$40 — cottages, with the occasional corner store so streets aren't all homes.
const COTTAGE_POOL: PoolEntry[] = [
  { kind: 'HOUSE', weight: 6, tiles: 1, label: 'Cottage built', emoji: '🏠' },
  { kind: 'HOUSE', weight: 3, tiles: 1, label: 'Small house built', emoji: '🏠' },
  { kind: 'SHOP', weight: 3, label: 'Corner shop opened', emoji: '🏪' },
  { kind: 'PARK', weight: 1, label: 'Neighborhood park opened', emoji: '🌳' },
  { kind: 'FARM', weight: 1, label: 'Farm plot started', emoji: '🌾' },
];

// ~$100 — storefront strip: shops & cafes lead, homes fill the gaps.
const TOWN_POOL: PoolEntry[] = [
  { kind: 'SHOP', weight: 5, label: 'Shop opened on the avenue', emoji: '🏪' },
  { kind: 'RESTAURANT', weight: 4, label: 'Cafe opened', emoji: '🍽️' },
  { kind: 'HOUSE', weight: 3, tiles: 1, label: 'Townhouse built', emoji: '🏠' },
  { kind: 'SHOP', weight: 2, variant: 1, label: 'Boutique opened', emoji: '🛍️' },
  { kind: 'PARK', weight: 1, label: 'Town square opened', emoji: '🌳' },
];

// ~$250 — denser commerce + apartment massing (house→shop→apartment→tower ladder).
const URBAN_POOL: PoolEntry[] = [
  { kind: 'SHOP', weight: 4, label: 'Storefront opened', emoji: '🏪' },
  { kind: 'RESTAURANT', weight: 4, label: 'Restaurant opened', emoji: '🍽️' },
  { kind: 'HOUSE', weight: 3, tiles: 1, variant: 1, label: 'Apartment walk-up built', emoji: '🏢' },
  { kind: 'SHOP', weight: 2, variant: 2, label: 'Market opened', emoji: '🛒' },
  { kind: 'HOUSE', weight: 2, tiles: 2, label: 'Apartment block raised', emoji: '🏙️' },
  { kind: 'FACTORY', weight: 1, label: 'Workshop opened', emoji: '🏭' },
];

// Landmark buys — big 2-tile civic / skyline buildings (placement pulls them downtown).
const LANDMARK_POOL: PoolEntry[] = [
  { kind: 'LANDMARK', weight: 1, variant: 0, tiles: 2, label: 'A glass skyscraper rose', emoji: '🏢' },
  { kind: 'LANDMARK', weight: 1, variant: 1, tiles: 2, label: 'An art deco tower rose', emoji: '🏙️' },
  { kind: 'LANDMARK', weight: 1, variant: 2, tiles: 2, label: 'A grand hotel opened', emoji: '🏨' },
  { kind: 'LANDMARK', weight: 1, variant: 3, tiles: 2, label: 'A civic tower was built', emoji: '🏛️' },
  { kind: 'LANDMARK', weight: 1, variant: 4, tiles: 2, label: 'Twin towers rose skyward', emoji: '🏙️' },
  { kind: 'LANDMARK', weight: 1, variant: 5, tiles: 2, label: 'A mega tower was raised', emoji: '🌆' },
];

// Tuned for pump.fun ticket sizes.
// Greenery → homes → storefronts → manors → skyline.
const BUY_TIERS: BuyTier[] = [
  { min: 0, kind: 'FLOWER', magnitude: 1, label: 'Flowers planted', emoji: '🌷', pool: DUST_POOL },
  { min: 10, kind: 'TREE', magnitude: 1, label: 'Tree planted', emoji: '🌳', pool: GREEN_POOL },
  { min: 40, kind: 'HOUSE', magnitude: 2, label: 'New house constructed', emoji: '🏠', tiles: 1, pool: COTTAGE_POOL },
  { min: 100, kind: 'HOUSE', magnitude: 2, label: 'Townhouse built', emoji: '🏠', tiles: 1, pool: TOWN_POOL },
  { min: 250, kind: 'SHOP', magnitude: 3, label: 'City block developed', emoji: '🏪', tiles: 1, pool: URBAN_POOL },
  { min: 1000, kind: 'HOUSE', magnitude: 4, label: 'Manor estate built', emoji: '🏡', tiles: 2 },
  { min: 2500, kind: 'LANDMARK', magnitude: 5, label: 'A landmark tower rose', emoji: '🏢', tiles: 2, pool: LANDMARK_POOL },
  { min: 10000, kind: 'LANDMARK', magnitude: 6, label: 'A mega landmark rose', emoji: '🌆', tiles: 2, pool: LANDMARK_POOL },
];

interface SellTier {
  min: number;
  type: WorldEvent['type'];
  object: WorldObjectKind | DisasterKind;
  magnitude: number;
  label: string;
  emoji: string;
}

// Every sell removes structure(s). No "damage-only" tiers — buildings must track sells.
const SELL_TIERS: SellTier[] = [
  { min: 0, type: 'DESTROY', object: 'TREE', magnitude: 1, label: 'A tree vanished', emoji: '🍂' },
  { min: 40, type: 'DESTROY', object: 'HOUSE', magnitude: 1, label: 'Building destroyed', emoji: '🏚️' },
  { min: 100, type: 'DESTROY', object: 'HOUSE', magnitude: 2, label: 'Buildings torn down', emoji: '🧱' },
  { min: 250, type: 'DISASTER', object: 'FIRE', magnitude: 3, label: 'Fire broke out', emoji: '🔥' },
  { min: 500, type: 'DISASTER', object: 'STORM', magnitude: 3, label: 'A storm swept through', emoji: '⛈️' },
  { min: 1000, type: 'DISASTER', object: 'EARTHQUAKE', magnitude: 4, label: 'Earthquake damaged the district', emoji: '🌍' },
  { min: 2500, type: 'DISASTER', object: 'FLOOD', magnitude: 5, label: 'The lands flooded', emoji: '🌊' },
  { min: 10000, type: 'DISASTER', object: 'METEOR', magnitude: 6, label: 'A meteor struck the world', emoji: '☄️' },
];

/** Minimum world-era index required before a kind may be newly constructed. */
const KIND_MIN_ERA: Partial<Record<WorldObjectKind, number>> = {
  // Cafes/shops are Settlement-legal — streets need storefronts early.
  FACTORY: 1,
  TOWER: 2,
  ATTRACTION: 2,
  STADIUM: 3,
};

/** Age-appropriate stand-ins when a buy would otherwise spawn a locked kind. */
const ERA_FALLBACK: Record<string, PoolEntry> = {
  TOWER: { kind: 'HOUSE', weight: 1, label: 'A grand house was raised', emoji: '🏠', tiles: 1 },
  ATTRACTION: { kind: 'SHOP', weight: 1, label: 'A shop opened on the strip', emoji: '🏪' },
  STADIUM: { kind: 'HOUSE', weight: 1, label: 'An estate house was raised', emoji: '🏡', tiles: 2 },
  FACTORY: { kind: 'SHOP', weight: 1, label: 'A workshop storefront opened', emoji: '🏪' },
};

function pickTier<T extends { min: number }>(tiers: T[], amount: number): T {
  let chosen = tiers[0];
  for (const t of tiers) {
    if (amount >= t.min) chosen = t;
  }
  return chosen;
}

function pickFromPool(pool: PoolEntry[]): PoolEntry {
  const total = pool.reduce((s, p) => s + p.weight, 0);
  let r = Math.random() * total;
  for (const p of pool) {
    r -= p.weight;
    if (r <= 0) return p;
  }
  return pool[0];
}

function kindUnlocked(kind: WorldObjectKind, eraIndex: number): boolean {
  return eraIndex >= (KIND_MIN_ERA[kind] ?? 0);
}

function fitToEra(entry: PoolEntry, eraIndex: number): PoolEntry {
  if (kindUnlocked(entry.kind, eraIndex)) return entry;
  return ERA_FALLBACK[entry.kind] ?? {
    kind: 'HOUSE',
    weight: 1,
    label: 'A sturdy house was built',
    emoji: '🏠',
    tiles: 1,
  };
}

function filterPool(pool: PoolEntry[], eraIndex: number): PoolEntry[] {
  return pool.map((p) => fitToEra(p, eraIndex));
}

// The main transform: transaction -> world event.
// location is filled in by the world state placement logic (it knows the map),
// so here we return a placeholder that the reducer overrides.
// `eraIndex` keeps construction age-appropriate (no glass towers in Settlement).
export function transactionToEvent(
  tx: WorldTransaction,
  eraIndex = 0,
): Omit<WorldEvent, 'location'> {
  if (tx.type === 'BUY') {
    const tier = pickTier(BUY_TIERS, tx.amount);
    if (tier.pool) {
      const entry = pickFromPool(filterPool(tier.pool, eraIndex));
      return {
        type: 'BUILD',
        object: entry.kind,
        magnitude: tier.magnitude,
        source: tx,
        label: entry.label,
        emoji: entry.emoji,
        variant: entry.variant,
        tiles: entry.tiles ?? tier.tiles ?? 1,
      };
    }
    const fitted = fitToEra(
      {
        kind: tier.kind,
        weight: 1,
        label: tier.label,
        emoji: tier.emoji,
        variant: tier.variant,
        tiles: tier.tiles,
      },
      eraIndex,
    );
    return {
      type: 'BUILD',
      object: fitted.kind,
      magnitude: tier.magnitude,
      source: tx,
      label: fitted.label,
      emoji: fitted.emoji,
      variant: fitted.variant ?? tier.variant,
      tiles: fitted.tiles ?? tier.tiles ?? 1,
    };
  }
  const tier = pickTier(SELL_TIERS, tx.amount);
  return {
    type: tier.type,
    object: tier.object,
    magnitude: tier.magnitude,
    source: tx,
    label: tier.label,
    emoji: tier.emoji,
  };
}

// Map a disaster button to a synthetic transaction so the same pipeline runs.
export function disasterTransaction(
  disaster: DisasterKind,
  wallet: string,
): WorldTransaction {
  const amounts: Record<DisasterKind, number> = {
    FIRE: 250,
    STORM: 500,
    EARTHQUAKE: 1000,
    FLOOD: 2500,
    METEOR: 10000,
  };
  return {
    type: 'SELL',
    amount: amounts[disaster],
    wallet,
    timestamp: new Date().toISOString(),
    transaction: 'sim',
  };
}
