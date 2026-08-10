import type { WorldObject, WorldObjectKind } from '../types/world';

const KIND_LABEL: Record<WorldObjectKind, string> = {
  DECORATION: 'Street furniture',
  FLOWER: 'Garden',
  TREE: 'Tree',
  ROAD: 'Road',
  HOUSE: 'House',
  FARM: 'Farm',
  SHOP: 'Shop',
  PARK: 'Park',
  RESTAURANT: 'Cafe',
  FACTORY: 'Factory',
  TOWER: 'Tower',
  ATTRACTION: 'Attraction',
  LANDMARK: 'Landmark',
  STADIUM: 'Stadium',
};

const LANDMARK_NAMES = [
  'Glass Skyscraper',
  'Art Deco Tower',
  'Grand Hotel',
  'Civic Tower',
  'Twin Towers',
  'Mega Tower',
];

export function labelForObject(obj: Pick<WorldObject, 'kind' | 'variant' | 'tiles'>): string {
  if (obj.kind === 'LANDMARK') return LANDMARK_NAMES[obj.variant % LANDMARK_NAMES.length];
  if (obj.kind === 'HOUSE' && obj.tiles === 2) return 'Manor';
  return KIND_LABEL[obj.kind] ?? obj.kind;
}
