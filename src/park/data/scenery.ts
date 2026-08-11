import type { SceneryKind } from '../types/game';

export interface SceneryDef {
  kind: SceneryKind;
  name: string;
  cost: number;
  researched: boolean;
}

export const SCENERY_DEFS: SceneryDef[] = [
  { kind: 'tree', name: 'Tree', cost: 30, researched: true },
  { kind: 'bush', name: 'Bush', cost: 15, researched: true },
  { kind: 'flower', name: 'Flowerbed', cost: 12, researched: true },
  { kind: 'bench', name: 'Bench', cost: 40, researched: true },
  { kind: 'bin', name: 'Litter Bin', cost: 25, researched: true },
  { kind: 'lamp', name: 'Lamp', cost: 35, researched: true },
  { kind: 'fence', name: 'Fence', cost: 10, researched: true },
];
