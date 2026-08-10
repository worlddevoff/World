import type { ZoneId, WorldObjectKind, GridPos } from '../types/world';
import { WORLD_CENTER, EARTH_W, EARTH_H } from './earth';

export { WORLD_CENTER, EARTH_W, EARTH_H };
export { GRID_SIZE } from './earth';

export interface ZoneDef {
  id: ZoneId;
  name: string;
  label: string;
  emoji: string;
}

// Named districts — rings around the seed: CBD → residential → industry/fun → wild.
export const ZONES: ZoneDef[] = [
  { id: 'city', name: 'Downtown', label: 'Downtown', emoji: '🏙️' },
  { id: 'village', name: 'Residential', label: 'Residential', emoji: '🏘️' },
  { id: 'industrial', name: 'Industrial Zone', label: 'Industry', emoji: '🏭' },
  { id: 'entertainment', name: 'Waterfront District', label: 'Waterfront', emoji: '🎡' },
  { id: 'wilderness', name: 'The Wilderness', label: 'Wild', emoji: '🌲' },
];

export function distFromCenter(pos: GridPos): number {
  return Math.abs(pos.x - WORLD_CENTER.x) + Math.abs(pos.y - WORLD_CENTER.y);
}

/** Districts radiate outward — dense downtown at the seed, suburbs beyond. */
export function zoneAt(pos: GridPos): ZoneId {
  const d = distFromCenter(pos);
  if (d <= 10) return 'city'; // CBD / skyline
  if (d <= 26) return 'village'; // residential neighborhoods
  if (d <= 48) {
    const dx = pos.x - WORLD_CENTER.x;
    const dy = pos.y - WORLD_CENTER.y;
    const angle = Math.atan2(dy, dx);
    return angle >= 0 ? 'industrial' : 'entertainment';
  }
  return 'wilderness';
}

export function isDowntown(pos: GridPos): boolean {
  return zoneAt(pos) === 'city';
}

/** Preferred home district for each building kind. */
export const OBJECT_ZONE: Record<WorldObjectKind, ZoneId> = {
  DECORATION: 'village',
  FLOWER: 'village',
  TREE: 'wilderness',
  ROAD: 'city',
  HOUSE: 'village',
  FARM: 'wilderness',
  SHOP: 'city',
  PARK: 'village',
  RESTAURANT: 'city',
  FACTORY: 'industrial',
  TOWER: 'city',
  ATTRACTION: 'entertainment',
  LANDMARK: 'city',
  STADIUM: 'entertainment',
};

/**
 * How well a kind fits a district. Positive = pull, negative = push.
 * Strong enough to override weak “near center” noise.
 */
export function zoneAffinity(kind: WorldObjectKind, zone: ZoneId): number {
  const home = OBJECT_ZONE[kind];
  if (zone === home) return 80;

  switch (kind) {
    case 'LANDMARK':
    case 'TOWER':
      if (zone === 'city') return 80;
      if (zone === 'entertainment') return 10;
      if (zone === 'village') return -40;
      return -90;
    case 'SHOP':
    case 'RESTAURANT':
      if (zone === 'city') return 80;
      if (zone === 'village') return 25; // corner store OK
      if (zone === 'entertainment') return 35;
      return -50;
    case 'HOUSE':
      if (zone === 'village') return 80;
      if (zone === 'city') return 15; // some downtown housing
      if (zone === 'entertainment') return 5;
      if (zone === 'industrial') return -35;
      return -20;
    case 'FARM':
      if (zone === 'wilderness') return 90;
      if (zone === 'village') return -10;
      if (zone === 'city') return -120;
      return -40;
    case 'TREE':
    case 'FLOWER':
      if (zone === 'wilderness') return 70;
      if (zone === 'village') return 30;
      if (zone === 'city') return -55; // keep downtown built-up
      return 10;
    case 'PARK':
      if (zone === 'village') return 70;
      if (zone === 'city') return 40; // plaza
      if (zone === 'wilderness') return 20;
      return -20;
    case 'FACTORY':
      if (zone === 'industrial') return 90;
      if (zone === 'city') return -80;
      return -40;
    case 'ATTRACTION':
    case 'STADIUM':
      if (zone === 'entertainment') return 90;
      if (zone === 'city') return 20;
      return -50;
    default:
      return zone === home ? 40 : 0;
  }
}
