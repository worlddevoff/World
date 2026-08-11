import type { CoasterSegment } from '../types/game';

const DELTA: Record<number, { x: number; y: number }> = {
  0: { x: 1, y: 0 },
  1: { x: 0, y: 1 },
  2: { x: -1, y: 0 },
  3: { x: 0, y: -1 },
};

/**
 * Classic out-and-back: lift → crest → drop → turnaround → return → brakes.
 * Guaranteed no overlapping tiles (reads as a real coaster, not a pile).
 */
export const CLASSIC_COASTER_LAYOUT: CoasterSegment['type'][] = [
  'straight',
  'up',
  'up',
  'up',
  'straight',
  'down',
  'down',
  'down',
  'left',
  'straight',
  'straight',
  'straight',
  'left',
  'straight',
  'straight',
  'straight',
  'straight',
  'straight',
  'straight',
  'left',
  'straight',
  'brake',
];

/** Build a continuous track from a station origin. Returns null if out of bounds. */
export function buildCoasterTrack(
  sx: number,
  sy: number,
  types: CoasterSegment['type'][] = CLASSIC_COASTER_LAYOUT,
  grid = 40,
): CoasterSegment[] | null {
  const track: CoasterSegment[] = [{ x: sx, y: sy, z: 0, type: 'station', dir: 0 }];
  const seen = new Set<string>([`${sx},${sy}`]);

  for (const type of types) {
    const last = track[track.length - 1]!;
    let dir = last.dir;
    let z = last.z;
    if (type === 'left') dir = ((dir + 3) % 4) as CoasterSegment['dir'];
    if (type === 'right') dir = ((dir + 1) % 4) as CoasterSegment['dir'];
    const d = DELTA[dir]!;
    if (type === 'up') z += 1;
    if (type === 'down') z = Math.max(0, z - 1);
    const x = last.x + d.x;
    const y = last.y + d.y;
    if (x < 0 || y < 0 || x >= grid || y >= grid) return null;
    const k = `${x},${y}`;
    if (seen.has(k)) return null; // refuse self-intersections
    seen.add(k);
    track.push({ x, y, z, type, dir });
  }
  return track;
}
