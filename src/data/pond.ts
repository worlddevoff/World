/** Pond life — buys spawn fish; sells hook them out. */

export type FishTier = 'minnow' | 'fish' | 'bass' | 'tuna' | 'whale';

export interface Fish {
  id: string;
  wallet: string;
  amount: number;
  tier: FishTier;
  /** Visual scale (body length multiplier). */
  size: number;
  color: string;
  accent: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Facing: 1 = right, -1 = left */
  facing: 1 | -1;
  wobble: number;
  bornAt: number;
}

export interface HookCatch {
  id: string;
  fish: Fish;
  /** 0..1 animation progress */
  t: number;
  phase: 'drop' | 'grab' | 'lift';
  startedAt: number;
}

/** Natural pond species palettes (body / belly-fin accent). */
const TIER_COLORS: Record<FishTier, { color: string; accent: string }[]> = {
  minnow: [
    { color: '#8a9a7b', accent: '#d4dcc8' },
    { color: '#6b7280', accent: '#e5e7eb' },
  ],
  fish: [
    { color: '#c45c26', accent: '#f3d5a5' }, // goldfish / koi orange
    { color: '#b91c1c', accent: '#fecaca' }, // red koi
    { color: '#d6d3d1', accent: '#fafaf9' }, // white koi
  ],
  bass: [
    { color: '#3f4f2c', accent: '#c4b59a' }, // largemouth
    { color: '#5c4a32', accent: '#e7d5b0' },
  ],
  tuna: [
    { color: '#1e3a5f', accent: '#94a3b8' }, // steel blue
    { color: '#0f3d4c', accent: '#a7f3d0' },
  ],
  whale: [
    { color: '#1c1917', accent: '#a8a29e' }, // dark carp / koi
    { color: '#292524', accent: '#d6d3d1' },
  ],
};

export function tierFromBuy(amountUsd: number): FishTier {
  if (amountUsd >= 2500) return 'whale';
  if (amountUsd >= 1000) return 'tuna';
  if (amountUsd >= 250) return 'bass';
  if (amountUsd >= 40) return 'fish';
  return 'minnow';
}

export function sizeFromBuy(amountUsd: number): number {
  if (amountUsd >= 2500) return 2.6;
  if (amountUsd >= 1000) return 2.1;
  if (amountUsd >= 250) return 1.55;
  if (amountUsd >= 100) return 1.2;
  if (amountUsd >= 40) return 0.95;
  return 0.65;
}

export function labelForTier(tier: FishTier): string {
  switch (tier) {
    case 'whale':
      return 'whale';
    case 'tuna':
      return 'big tuna';
    case 'bass':
      return 'bass';
    case 'fish':
      return 'fish';
    default:
      return 'minnow';
  }
}

export function makeFish(
  id: string,
  wallet: string,
  amount: number,
  pondW: number,
  pondH: number,
): Fish {
  const tier = tierFromBuy(amount);
  const palette = TIER_COLORS[tier];
  const swatch = palette[Math.floor(Math.random() * palette.length)];
  // Spawn inside the water ellipse, not the rectangular view box corners
  const cx = pondW / 2;
  const cy = pondH / 2;
  const rx = pondW * 0.38;
  const ry = pondH * 0.32;
  const ang = Math.random() * Math.PI * 2;
  const rad = Math.sqrt(Math.random()) * 0.85;
  return {
    id,
    wallet,
    amount,
    tier,
    size: sizeFromBuy(amount),
    color: swatch.color,
    accent: swatch.accent,
    x: cx + Math.cos(ang) * rx * rad,
    y: cy + Math.sin(ang) * ry * rad,
    vx: (Math.random() * 0.35 + 0.12) * (Math.random() > 0.5 ? 1 : -1),
    vy: (Math.random() - 0.5) * 0.2,
    facing: 1,
    wobble: Math.random() * Math.PI * 2,
    bornAt: Date.now(),
  };
}

/** Prefer a fish whose size matches the sell — bigger dumps hook bigger fish. */
export function pickFishForSell(fish: Fish[], amountUsd: number): Fish | null {
  if (fish.length === 0) return null;
  const target = sizeFromBuy(amountUsd);
  const ranked = [...fish].sort(
    (a, b) => Math.abs(a.size - target) - Math.abs(b.size - target),
  );
  // Among close matches, slight randomness
  const top = ranked.slice(0, Math.min(3, ranked.length));
  return top[Math.floor(Math.random() * top.length)] ?? null;
}

export const POND_GOAL = 'Every buy adds a fish. Every sell gets hooked.';
/** World units for the swim space — larger = more room to school. */
export const POND_W = 168;
export const POND_H = 108;
