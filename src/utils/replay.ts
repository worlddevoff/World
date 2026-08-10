import type { BuildLogEntry, WorldObject } from '../types/world';
import { revealAround, keyOf, WORLD_CENTER } from './worldState';

// Reconstruct the world exactly as it stood at time `t` from the append-only
// build log: every object created on or before `t` that had not yet been
// destroyed. Land is regrown around each standing object so the terrain
// visibly grows during replay.
export function snapshotAt(
  log: BuildLogEntry[],
  t: number,
): { objects: WorldObject[]; revealed: string[] } {
  const revealed = new Set<string>();
  revealed.add(keyOf(WORLD_CENTER));
  const objects: WorldObject[] = [];

  for (const e of log) {
    if (e.createdAt > t) continue;
    const destroyed = e.destroyedAt != null && e.destroyedAt <= t;
    // reveal land wherever a building has ever stood by this time
    revealAround(revealed, e.pos, 1);
    if (destroyed) continue;
    objects.push({
      id: e.id,
      kind: e.kind,
      pos: e.pos,
      zone: e.zone,
      stage: 'built',
      createdAt: e.createdAt,
      bornBy: e.bornBy,
      purchaseAmount: e.purchaseAmount,
      variant: e.variant,
      height: e.height,
      era: e.era,
      tiles: e.tiles ?? 1,
      span: e.span,
    });
    if (e.tiles === 2 && e.span) {
      revealAround(revealed, { x: e.pos.x + e.span.x, y: e.pos.y + e.span.y }, 1);
    }
  }

  return { objects, revealed: Array.from(revealed) };
}
