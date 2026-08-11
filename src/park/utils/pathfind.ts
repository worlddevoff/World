import type { GridPos } from '../types/game';

// Simple BFS pathfinding over the walkable path-tile set.
export function findPath(
  start: GridPos,
  goal: GridPos,
  walkable: Set<string>,
): GridPos[] | null {
  const key = (x: number, y: number) => `${x},${y}`;
  const sk = key(Math.round(start.x), Math.round(start.y));
  const gk = key(goal.x, goal.y);
  if (!walkable.has(gk)) return null;
  if (sk === gk) return [goal];

  const queue: string[] = [sk];
  const cameFrom = new Map<string, string | null>();
  cameFrom.set(sk, null);

  const neighbors = (k: string): string[] => {
    const [x, y] = k.split(',').map(Number);
    return [
      key(x + 1, y),
      key(x - 1, y),
      key(x, y + 1),
      key(x, y - 1),
    ].filter((n) => walkable.has(n));
  };

  let found = false;
  let iter = 0;
  while (queue.length && iter < 6000) {
    iter++;
    const cur = queue.shift()!;
    if (cur === gk) {
      found = true;
      break;
    }
    for (const n of neighbors(cur)) {
      if (!cameFrom.has(n)) {
        cameFrom.set(n, cur);
        queue.push(n);
      }
    }
  }

  if (!found) return null;
  const path: GridPos[] = [];
  let cur: string | null = gk;
  while (cur) {
    const [x, y] = cur.split(',').map(Number);
    path.unshift({ x, y });
    cur = cameFrom.get(cur) ?? null;
  }
  return path;
}

// Pick a random walkable tile.
export function randomWalkable(walkable: Set<string>): GridPos | null {
  if (walkable.size === 0) return null;
  const arr = Array.from(walkable);
  const k = arr[Math.floor(Math.random() * arr.length)];
  const [x, y] = k.split(',').map(Number);
  return { x, y };
}
