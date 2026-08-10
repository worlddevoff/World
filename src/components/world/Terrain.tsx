import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { tileDiamond, gridToScreen, TILE_W, TILE_H } from '../../utils/iso';
import { isWater, zoneAt } from '../../utils/worldState';
import type { WorldObject, Scar, GridPos } from '../../types/world';

/**
 * Sidewalk strip along one diamond edge (only drawn when that neighbor isn't road).
 * Edge faces: +x → E–S, +y → W–S, -x → W–N, -y → E–N.
 */
function sidewalkStrip(
  gx: number,
  gy: number,
  dx: number,
  dy: number,
  depth = 0.22,
): string {
  const c = gridToScreen(gx, gy);
  const hw = TILE_W / 2;
  const hh = TILE_H / 2;
  const N = { x: c.x, y: c.y - hh };
  const E = { x: c.x + hw, y: c.y };
  const S = { x: c.x, y: c.y + hh };
  const W = { x: c.x - hw, y: c.y };
  let a: { x: number; y: number };
  let b: { x: number; y: number };
  if (dx === 1 && dy === 0) {
    a = E;
    b = S;
  } else if (dx === 0 && dy === 1) {
    a = W;
    b = S;
  } else if (dx === -1 && dy === 0) {
    a = W;
    b = N;
  } else {
    a = E;
    b = N;
  }
  // Pull inward toward tile center for the curb face
  const ai = {
    x: a.x + (c.x - a.x) * depth,
    y: a.y + (c.y - a.y) * depth,
  };
  const bi = {
    x: b.x + (c.x - b.x) * depth,
    y: b.y + (c.y - b.y) * depth,
  };
  return `${a.x},${a.y} ${b.x},${b.y} ${bi.x},${bi.y} ${ai.x},${ai.y}`;
}

const DECK_LIFT = 8; // how high the roadway sits above the water

type BridgeRun = {
  key: string;
  cells: GridPos[]; // ordered straight span, shore → water… → shore
  alongX: boolean;
};

interface Props {
  night: boolean;
  /** Space Age — the settlement sits on lunar regolith under a black sky. */
  lunar?: boolean;
  roads: WorldObject[];
  revealed: string[];
  scars?: Scar[];
}

// Per-zone ground so districts read at a glance — not just building mix.
const ZONE_GRASS: Record<string, string[]> = {
  city: ['#5f8f6a', '#6a9a74', '#587f62', '#719e7c'], // cooler, plaza-adjacent
  village: ['#7cbc5f', '#86c668', '#74b456', '#8fce70'], // soft lawn
  industrial: ['#8f9a6b', '#98a172', '#879363', '#9aa679'], // dry, scrubby
  entertainment: ['#5aaa78', '#66b684', '#549e6e', '#72c090'], // sea-breeze green
  wilderness: ['#4f9440', '#57a047', '#498c3b', '#5aa54a'], // deep, lush
};

const MOON_DUST = ['#c9bfb0', '#b8ae9f', '#d2c8b8', '#a89e90', '#cdc3b4', '#beb4a4'];

/** Cooler CBD asphalt → warmer residential → grimy industry → boardwalk waterfront. */
function roadFillFor(zone: string, cls: number, night: boolean, lunar: boolean): string {
  if (lunar) return '#5a5550';
  if (zone === 'city') {
    if (cls >= 3) return night ? '#2f3844' : '#4a5563';
    if (cls >= 2) return night ? '#343c48' : '#556070';
    return night ? '#3a424e' : '#5c6674';
  }
  if (zone === 'industrial') {
    if (cls >= 2) return night ? '#3a342c' : '#4f463c';
    return night ? '#403830' : '#5a4e42';
  }
  if (zone === 'entertainment') {
    if (cls >= 2) return night ? '#3a3632' : '#6b5e50';
    return night ? '#423c36' : '#746658';
  }
  // village / wilderness — warm brown-gray
  if (cls >= 3) return night ? '#3a3f46' : '#555e68';
  if (cls >= 2) return night ? '#3d3a36' : '#5a5348';
  return night ? '#403c38' : '#5c5348';
}

function sidewalkFor(zone: string, night: boolean, lunar: boolean): string {
  if (lunar) return night ? '#7a7368' : '#b8b0a4';
  if (zone === 'city') return night ? '#6b7280' : '#d1d5db';
  if (zone === 'entertainment') return night ? '#78716c' : '#d6c4a8';
  if (zone === 'industrial') return night ? '#57534e' : '#a8a29e';
  return night ? '#6b6560' : '#c4beb4';
}

function tileHash(x: number, y: number): number {
  return Math.abs((x * 73856093) ^ (y * 19349663));
}

// Stable per-tile grass shade based on coordinates (no flicker as land grows),
// biased by the district the tile belongs to.
function grassFor(x: number, y: number): string {
  const zone = zoneAt({ x, y });
  const palette = ZONE_GRASS[zone] ?? ZONE_GRASS.village;
  return palette[tileHash(x, y) % palette.length];
}

function regolithFor(x: number, y: number): string {
  return MOON_DUST[tileHash(x, y) % MOON_DUST.length];
}

// Only revealed tiles are drawn — the world grows outward as land is revealed.
export function Terrain({ night, lunar = false, roads, revealed, scars = [] }: Props) {
  const revealedSet = useMemo(() => new Set(revealed), [revealed]);

  const tiles = useMemo(() => {
    return revealed
      .map((key) => {
        const [x, y] = key.split(',').map(Number);
        const water = isWater(x, y);
        const c = gridToScreen(x, y);
        const h = tileHash(x, y);
        const zone = zoneAt({ x, y });
        // A tile is on the outer rim if the tiles in front of it are missing.
        const rim = !revealedSet.has(`${x + 1},${y}`) || !revealedSet.has(`${x},${y + 1}`);
        const shore =
          !water &&
          (isWater(x + 1, y) || isWater(x - 1, y) || isWater(x, y + 1) || isWater(x, y - 1));
        return {
          key,
          x,
          y,
          pts: tileDiamond(x, y),
          fill: water ? 'url(#waterGrad)' : lunar ? regolithFor(x, y) : grassFor(x, y),
          water,
          rim,
          zone,
          shore,
          h,
          // District ground props (hash-stable, no flicker)
          plaza: !water && zone === 'city' && h % 7 === 0,
          hedge: !water && zone === 'village' && h % 5 === 1,
          stain: !water && zone === 'industrial' && h % 4 === 0,
          pier: !water && zone === 'entertainment' && shore,
          crater: !water && lunar && h % 11 === 0,
          cx: c.x,
          cy: c.y,
        };
      })
      .sort((a, b) => a.cx - b.cx);
  }, [revealed, revealedSet, lunar]);

  const roadSet = useMemo(() => new Set(roads.map((r) => `${r.pos.x},${r.pos.y}`)), [roads]);

  /** 3 = main boulevard, 2 = avenue, 0 = side street */
  const roadClass = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of roads) {
      if (r.variant === 1) continue; // bridge decks
      m.set(`${r.pos.x},${r.pos.y}`, r.variant === 3 ? 3 : r.variant === 2 ? 2 : 0);
    }
    return m;
  }, [roads]);

  const bridgeKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const r of roads) {
      if (isWater(r.pos.x, r.pos.y)) keys.add(`${r.pos.x},${r.pos.y}`);
    }
    return keys;
  }, [roads]);

  // Continuous bridge spans (water decks + touching shore road stubs).
  const bridgeRuns = useMemo(() => buildBridgeRuns(bridgeKeys, roadSet), [bridgeKeys, roadSet]);

  // Center-line marks — only along continuous corridors; main wins at junctions.
  const roadMarks = useMemo(() => {
    const isJunction = (x: number, y: number) => {
      const ew = roadSet.has(`${x + 1},${y}`) || roadSet.has(`${x - 1},${y}`);
      const ns = roadSet.has(`${x},${y + 1}`) || roadSet.has(`${x},${y - 1}`);
      return ew && ns;
    };

    const marks: {
      key: string;
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      cls: number;
    }[] = [];

    for (const r of roads) {
      if (bridgeKeys.has(`${r.pos.x},${r.pos.y}`)) continue;
      const cls = roadClass.get(`${r.pos.x},${r.pos.y}`) ?? 0;
      const a = gridToScreen(r.pos.x, r.pos.y);

      for (const [dx, dy] of [
        [1, 0],
        [0, 1],
      ] as const) {
        const nx = r.pos.x + dx;
        const ny = r.pos.y + dy;
        const nk = `${nx},${ny}`;
        if (!roadSet.has(nk) || bridgeKeys.has(nk)) continue;
        const nCls = roadClass.get(nk) ?? 0;

        // Don't let side-street dashes paint across a main/avenue tile.
        if (cls !== nCls) {
          if (Math.min(cls, nCls) === 0 && Math.max(cls, nCls) >= 2) continue;
        }
        const linkCls = Math.max(cls, nCls);

        // Skip short stubs into a junction from a lesser street — only the
        // dominant corridor keeps its stripe through the crossing.
        const aJ = isJunction(r.pos.x, r.pos.y);
        const bJ = isJunction(nx, ny);
        if ((aJ || bJ) && linkCls < 2) continue;

        const b = gridToScreen(nx, ny);
        // Inset so stripes don't blob at tile centers / junctions
        const inset = aJ || bJ ? 0.28 : 0.12;
        const x1 = a.x + (b.x - a.x) * inset;
        const y1 = a.y + (b.y - a.y) * inset;
        const x2 = b.x - (b.x - a.x) * inset;
        const y2 = b.y - (b.y - a.y) * inset;

        if (linkCls >= 3) {
          const px = -(b.y - a.y) * 0.035;
          const py = (b.x - a.x) * 0.035;
          marks.push({
            key: `${r.pos.x},${r.pos.y}->${nk}-a`,
            x1: x1 + px,
            y1: y1 + py,
            x2: x2 + px,
            y2: y2 + py,
            cls: 3,
          });
          marks.push({
            key: `${r.pos.x},${r.pos.y}->${nk}-b`,
            x1: x1 - px,
            y1: y1 - py,
            x2: x2 - px,
            y2: y2 - py,
            cls: 3,
          });
        } else {
          marks.push({
            key: `${r.pos.x},${r.pos.y}->${nk}`,
            x1,
            y1,
            x2,
            y2,
            cls: linkCls,
          });
        }
      }
    }
    // Paint hierarchy: side → avenue → main (main on top at crossings)
    marks.sort((a, b) => a.cls - b.cls);
    return marks;
  }, [roads, roadSet, bridgeKeys, roadClass]);

  return (
    <g>
      {/* Pass 1: soil / rock skirt along the outer rim */}
      {tiles
        .filter((t) => t.rim && !t.water)
        .map((t) => (
          <polygon
            key={`skirt-${t.key}`}
            points={t.pts}
            fill={lunar ? (night ? '#4a453c' : '#6a6358') : night ? '#2f5325' : '#43722f'}
            transform="translate(0,6)"
          />
        ))}

      {/* Pass 2: the surface tiles */}
      <AnimatePresence initial={false}>
        {tiles.map((t) => (
          <motion.g
            key={t.key}
            initial={{ opacity: 0, scale: 0.2 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
            style={{ transformOrigin: 'center' }}
          >
            {/* stroke matches fill to hide hairline seams between diamonds */}
            <polygon points={t.pts} fill={t.fill} stroke={t.fill} strokeWidth={0.75} />
            {/* Downtown plazas — stone diamonds in the CBD */}
            {!lunar && t.plaza && !roadSet.has(t.key) && (
              <polygon
                points={t.pts}
                fill={night ? '#64748b' : '#cbd5e1'}
                stroke={night ? '#475569' : '#94a3b8'}
                strokeWidth={0.6}
                opacity={0.85}
              />
            )}
            {/* Residential yard hedges */}
            {!lunar && t.hedge && !roadSet.has(t.key) && (
              <g opacity={0.85}>
                <ellipse cx={t.cx - 6} cy={t.cy + 1} rx={5} ry={2.2} fill="#3f8f42" />
                <ellipse cx={t.cx + 5} cy={t.cy - 1} rx={4.5} ry={2} fill="#4a9a4e" />
              </g>
            )}
            {/* Industrial dirt / oil stains */}
            {!lunar && t.stain && !roadSet.has(t.key) && (
              <ellipse
                cx={t.cx + ((t.h % 5) - 2)}
                cy={t.cy + ((t.h % 3) - 1)}
                rx={8}
                ry={3.6}
                fill="#5c5348"
                opacity={night ? 0.35 : 0.28}
              />
            )}
            {/* Waterfront pier / promenade boards on shore lots */}
            {!lunar && t.pier && !roadSet.has(t.key) && (
              <g>
                <polygon
                  points={t.pts}
                  fill={night ? '#6b5b4a' : '#c4a574'}
                  opacity={0.72}
                />
                <line
                  x1={t.cx - 10}
                  y1={t.cy - 2}
                  x2={t.cx + 10}
                  y2={t.cy + 2}
                  stroke={night ? '#4a3f34' : '#8b6914'}
                  strokeWidth={0.8}
                  opacity={0.5}
                />
                <line
                  x1={t.cx - 8}
                  y1={t.cy + 2}
                  x2={t.cx + 8}
                  y2={t.cy + 5}
                  stroke={night ? '#4a3f34' : '#8b6914'}
                  strokeWidth={0.8}
                  opacity={0.4}
                />
              </g>
            )}
            {t.water && !lunar && (
              <motion.polygon
                points={t.pts}
                fill="#ffffff"
                animate={{ opacity: [0.03, 0.12, 0.03] }}
                transition={{ duration: 3, repeat: Infinity, delay: (t.cx % 5) * 0.3 }}
              />
            )}
            {/* lunar maria — flat dark basalt, no shimmer */}
            {t.water && lunar && (
              <polygon points={t.pts} fill="#1f242c" opacity={0.35} />
            )}
            {/* scattered impact craters on the regolith */}
            {t.crater && (
              <g opacity={0.55}>
                <ellipse cx={t.cx - 2} cy={t.cy} rx={7} ry={3.6} fill="#8a8074" />
                <ellipse cx={t.cx - 2} cy={t.cy} rx={4.2} ry={2.1} fill="#6e655a" />
                <ellipse cx={t.cx - 3} cy={t.cy - 0.6} rx={1.6} ry={0.8} fill="#d8d0c4" opacity={0.5} />
              </g>
            )}
            {roadSet.has(t.key) && !t.water && (() => {
              const cls = roadClass.get(t.key) ?? 0;
              const fill = roadFillFor(t.zone, cls, night, lunar);
              const walk = sidewalkFor(t.zone, night, lunar);
              // Full asphalt keeps corridors continuous; sidewalks only on grass-facing edges.
              const dirs: [number, number][] = [
                [1, 0],
                [-1, 0],
                [0, 1],
                [0, -1],
              ];
              return (
                <g>
                  <polygon
                    points={t.pts}
                    fill={fill}
                    stroke={fill}
                    strokeWidth={0.9}
                    strokeLinejoin="round"
                  />
                  {dirs.map(([dx, dy]) => {
                    const nk = `${t.x + dx},${t.y + dy}`;
                    if (roadSet.has(nk) || bridgeKeys.has(nk)) return null;
                    return (
                      <polygon
                        key={`sw-${t.key}-${dx},${dy}`}
                        points={sidewalkStrip(t.x, t.y, dx, dy, 0.26)}
                        fill={walk}
                        stroke={walk}
                        strokeWidth={0.35}
                        strokeLinejoin="round"
                        opacity={0.95}
                      />
                    );
                  })}
                </g>
              );
            })()}
          </motion.g>
        ))}
      </AnimatePresence>

      {/* Pass 2b: continuous bridges over water (one deck per span) */}
      {bridgeRuns.map((run) => (
        <BridgeDeck key={run.key} run={run} night={night} lunar={lunar} />
      ))}

      {/* Pass 2c: street striping by class (main painted last / on top) */}
      <g strokeLinecap="round">
        {roadMarks.map((m) => {
          if (m.cls >= 3) {
            return (
              <line
                key={m.key}
                x1={m.x1}
                y1={m.y1}
                x2={m.x2}
                y2={m.y2}
                stroke={lunar ? '#c4b89a' : night ? '#eab308' : '#facc15'}
                strokeWidth={1.5}
                opacity={lunar ? 0.5 : 0.95}
              />
            );
          }
          if (m.cls >= 2) {
            return (
              <line
                key={m.key}
                x1={m.x1}
                y1={m.y1}
                x2={m.x2}
                y2={m.y2}
                stroke={lunar ? '#c4b89a' : night ? '#d4a017' : '#f1c40f'}
                strokeWidth={1.35}
                strokeDasharray="5 4"
                opacity={lunar ? 0.45 : 0.85}
              />
            );
          }
          return (
            <line
              key={m.key}
              x1={m.x1}
              y1={m.y1}
              x2={m.x2}
              y2={m.y2}
              stroke={lunar ? '#a89a7c' : night ? '#a16207' : '#d4a017'}
              strokeWidth={1}
              strokeDasharray="3 5"
              opacity={0.45}
            />
          );
        })}
      </g>

      {/* Pass 3: scorched land where buildings fell — slowly regrows to grass */}
      <AnimatePresence>
        {scars.map((s) => {
          const pts = tileDiamond(s.pos.x, s.pos.y);
          const c = gridToScreen(s.pos.x, s.pos.y);
          return (
            <motion.g key={s.id} initial={{ opacity: 0 }} exit={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {/* disturbed earth fading back to grass */}
              <motion.polygon
                points={pts}
                fill="#2b2320"
                initial={{ opacity: 0.9 }}
                animate={{ opacity: 0 }}
                transition={{ duration: s.life / 1000, ease: 'easeIn' }}
              />
              {/* fissure cracks from the collapse */}
              <motion.path
                d={`M ${c.x - 10} ${c.y + 1} L ${c.x - 3} ${c.y - 2} L ${c.x + 2} ${c.y + 2} L ${c.x + 9} ${c.y - 1}`}
                stroke="#1a1410"
                strokeWidth={1.4}
                fill="none"
                strokeLinecap="round"
                initial={{ pathLength: 0, opacity: 0.95 }}
                animate={{ pathLength: 1, opacity: 0 }}
                transition={{ pathLength: { duration: 0.35 }, opacity: { duration: s.life / 1000, ease: 'easeIn' } }}
              />
              <motion.path
                d={`M ${c.x - 2} ${c.y - 5} L ${c.x + 1} ${c.y - 1} L ${c.x - 1} ${c.y + 4}`}
                stroke="#1a1410"
                strokeWidth={1}
                fill="none"
                strokeLinecap="round"
                initial={{ pathLength: 0, opacity: 0.8 }}
                animate={{ pathLength: 1, opacity: 0 }}
                transition={{
                  pathLength: { duration: 0.4, delay: 0.08 },
                  opacity: { duration: s.life / 1000, ease: 'easeIn' },
                }}
              />
              {/* smouldering embers early on */}
              <motion.circle
                cx={c.x - 4}
                cy={c.y}
                r={1.6}
                fill="#f97316"
                initial={{ opacity: 0.9 }}
                animate={{ opacity: 0 }}
                transition={{ duration: 6 }}
              />
              <motion.circle
                cx={c.x + 5}
                cy={c.y + 3}
                r={1.2}
                fill="#fbbf24"
                initial={{ opacity: 0.8 }}
                animate={{ opacity: 0 }}
                transition={{ duration: 4.5, delay: 0.6 }}
              />
              {/* grass regrowth — skipped on the airless moon */}
              {!lunar && (
                <motion.circle
                  cx={c.x}
                  cy={c.y}
                  r={3}
                  fill="#5aa54a"
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: [0, 0.9], scale: [0, 1] }}
                  transition={{ duration: 3, delay: s.life / 1000 - 4 }}
                />
              )}
            </motion.g>
          );
        })}
      </AnimatePresence>
    </g>
  );
}

function keyOf(p: GridPos): string {
  return `${p.x},${p.y}`;
}

/**
 * Pull straight bridge spans only (one axis). Blob/zigzag water-road clusters
 * collapse to their longest straight corridor so we never draw a ribbon mess.
 */
function buildBridgeRuns(bridgeKeys: Set<string>, roadSet: Set<string>): BridgeRun[] {
  if (bridgeKeys.size === 0) return [];

  const dirs4: [number, number][] = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];
  const seenComp = new Set<string>();
  const runs: BridgeRun[] = [];

  for (const start of bridgeKeys) {
    if (seenComp.has(start)) continue;
    const comp: GridPos[] = [];
    const q = [start];
    seenComp.add(start);
    while (q.length) {
      const k = q.shift()!;
      const [x, y] = k.split(',').map(Number);
      comp.push({ x, y });
      for (const [dx, dy] of dirs4) {
        const nk = keyOf({ x: x + dx, y: y + dy });
        if (!bridgeKeys.has(nk) || seenComp.has(nk)) continue;
        seenComp.add(nk);
        q.push(nk);
      }
    }

    const compSet = new Set(comp.map(keyOf));

    // Score every maximal straight run inside this component
    type Cand = { cells: GridPos[]; alongX: boolean };
    const cands: Cand[] = [];

    // Horizontal runs
    for (const c of comp) {
      if (compSet.has(keyOf({ x: c.x - 1, y: c.y }))) continue;
      const cells: GridPos[] = [];
      let x = c.x;
      while (compSet.has(keyOf({ x, y: c.y }))) {
        cells.push({ x, y: c.y });
        x++;
      }
      if (cells.length >= 2) cands.push({ cells, alongX: true });
    }
    // Vertical runs
    for (const c of comp) {
      if (compSet.has(keyOf({ x: c.x, y: c.y - 1 }))) continue;
      const cells: GridPos[] = [];
      let y = c.y;
      while (compSet.has(keyOf({ x: c.x, y }))) {
        cells.push({ x: c.x, y });
        y++;
      }
      if (cells.length >= 2) cands.push({ cells, alongX: false });
    }

    if (cands.length === 0) {
      // Single lonely water tile — still draw a tiny span if shores exist
      const alone = comp[0];
      cands.push({ cells: [alone], alongX: true });
    }

    cands.sort((a, b) => b.cells.length - a.cells.length);
    const best = cands[0];

    const extend = (from: GridPos, dir: 1 | -1): GridPos | null => {
      const n = best.alongX
        ? { x: from.x + dir, y: from.y }
        : { x: from.x, y: from.y + dir };
      const nk = keyOf(n);
      if (roadSet.has(nk) && !bridgeKeys.has(nk) && !isWater(n.x, n.y)) return n;
      // Even without a paved stub, extend one land cell so towers sit on shore
      if (!isWater(n.x, n.y) && inBoundsLand(n)) return n;
      return null;
    };
    const before = extend(best.cells[0], -1);
    const after = extend(best.cells[best.cells.length - 1], 1);
    const cells = [...(before ? [before] : []), ...best.cells, ...(after ? [after] : [])];

    runs.push({
      key: `bridge-${best.cells[0].x},${best.cells[0].y}-${best.alongX ? 'x' : 'y'}`,
      cells,
      alongX: best.alongX,
    });
  }

  return runs;
}

function inBoundsLand(p: GridPos): boolean {
  // Cheap land check — water tiles use isWater; anything else is fine for a visual stub
  return !isWater(p.x, p.y);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Golden Gate–style suspension bridge: orange towers, main cables, suspenders, deck. */
function BridgeDeck({
  run,
  night,
  lunar,
}: {
  run: BridgeRun;
  night: boolean;
  lunar: boolean;
}) {
  if (run.cells.length < 2) return null;

  const first = run.cells[0];
  const last = run.cells[run.cells.length - 1];
  const a = gridToScreen(first.x, first.y);
  const b = gridToScreen(last.x, last.y);
  // Straight deck between shores (ignore any middle zig-zag cells)
  const x1 = a.x;
  const y1 = a.y - DECK_LIFT;
  const x2 = b.x;
  const y2 = b.y - DECK_LIFT;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const px = -uy; // perpendicular
  const py = ux;

  const orange = lunar ? '#b8956a' : night ? '#c45a3a' : '#c7482a';
  const orangeDark = lunar ? '#8a6e4a' : night ? '#8f3220' : '#8f2f1a';
  const orangeLight = lunar ? '#d4b896' : '#e86a4a';
  const deck = night ? '#3d3a36' : '#4a4540';
  const stripe = night ? '#d4a017' : '#f1c40f';

  const towerH = Math.min(68, 28 + len * 0.22);
  const t1x = lerp(x1, x2, 0.22);
  const t1y = lerp(y1, y2, 0.22);
  const t2x = lerp(x1, x2, 0.78);
  const t2y = lerp(y1, y2, 0.78);

  // Main cable peaks at tower tops; sags between
  const top1 = { x: t1x, y: t1y - towerH };
  const top2 = { x: t2x, y: t2y - towerH };
  const midSag = {
    x: lerp(t1x, t2x, 0.5),
    y: lerp(t1y, t2y, 0.5) - towerH * 0.28,
  };
  const leftAnchor = { x: x1, y: y1 - 2 };
  const rightAnchor = { x: x2, y: y2 - 2 };

  const cable = (side: 1 | -1) => {
    const o = side * 5;
    const ox = px * o;
    const oy = py * o;
    return [
      `M ${leftAnchor.x + ox} ${leftAnchor.y + oy}`,
      `Q ${top1.x + ox} ${top1.y + oy + 8} ${top1.x + ox} ${top1.y + oy}`,
      `Q ${midSag.x + ox} ${midSag.y + oy} ${top2.x + ox} ${top2.y + oy}`,
      `Q ${top2.x + ox} ${top2.y + oy + 8} ${rightAnchor.x + ox} ${rightAnchor.y + oy}`,
    ].join(' ');
  };

  // Suspender drop points along the main span between towers
  const suspenders: { x: number; y: number; cableY: number }[] = [];
  const nSus = Math.max(5, Math.round(len / 18));
  for (let i = 1; i < nSus; i++) {
    const t = i / nSus;
    // Only between the two towers
    const tt = lerp(0.22, 0.78, t);
    const dx_ = lerp(x1, x2, tt);
    const dy_ = lerp(y1, y2, tt);
    // Approximate cable height: parabola between towers
    const u = (tt - 0.22) / 0.56;
    const sag = 4 * u * (1 - u); // 0 at ends, 1 at mid
    const cableY = lerp(t1y - towerH, t2y - towerH, u) + sag * (towerH * 0.55);
    suspenders.push({ x: dx_, y: dy_, cableY });
  }

  const Tower = ({ tx, ty }: { tx: number; ty: number }) => (
    <g>
      {/* twin legs */}
      <line x1={tx - 4} y1={ty + 2} x2={tx - 4} y2={ty - towerH} stroke={orangeDark} strokeWidth={3.2} strokeLinecap="round" />
      <line x1={tx + 4} y1={ty + 2} x2={tx + 4} y2={ty - towerH} stroke={orange} strokeWidth={3.2} strokeLinecap="round" />
      {/* cross braces */}
      {[0.25, 0.5, 0.75].map((f) => {
        const yy = ty - towerH * f;
        return (
          <g key={f}>
            <line x1={tx - 4} y1={yy} x2={tx + 4} y2={yy} stroke={orangeLight} strokeWidth={1.6} />
            <line x1={tx - 4} y1={yy - 5} x2={tx + 4} y2={yy + 5} stroke={orangeDark} strokeWidth={1.1} opacity={0.85} />
            <line x1={tx - 4} y1={yy + 5} x2={tx + 4} y2={yy - 5} stroke={orangeDark} strokeWidth={1.1} opacity={0.85} />
          </g>
        );
      })}
      {/* top strut */}
      <line x1={tx - 5} y1={ty - towerH} x2={tx + 5} y2={ty - towerH} stroke={orangeLight} strokeWidth={2.4} strokeLinecap="round" />
      {/* footing in water */}
      <ellipse cx={tx} cy={ty + DECK_LIFT + 2} rx={7} ry={2.5} fill="#000000" opacity={0.14} />
    </g>
  );

  return (
    <g>
      {/* soft water reflection under the span */}
      <line
        x1={x1}
        y1={y1 + DECK_LIFT + 3}
        x2={x2}
        y2={y2 + DECK_LIFT + 3}
        stroke="#000000"
        strokeWidth={14}
        strokeLinecap="round"
        opacity={0.1}
      />

      {/* Main cables (both sides) */}
      <path d={cable(-1)} fill="none" stroke={orangeDark} strokeWidth={2.1} strokeLinecap="round" />
      <path d={cable(1)} fill="none" stroke={orange} strokeWidth={2.1} strokeLinecap="round" />

      {/* Vertical suspenders */}
      {suspenders.map((s, i) => (
        <g key={i}>
          <line x1={s.x - 4} y1={s.cableY} x2={s.x - 4} y2={s.y} stroke={orangeDark} strokeWidth={0.9} opacity={0.9} />
          <line x1={s.x + 4} y1={s.cableY} x2={s.x + 4} y2={s.y} stroke={orange} strokeWidth={0.9} opacity={0.9} />
        </g>
      ))}

      {/* Roadway deck */}
      <line x1={x1} y1={y1 + 2} x2={x2} y2={y2 + 2} stroke="#2a2622" strokeWidth={15} strokeLinecap="round" />
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={deck} strokeWidth={13} strokeLinecap="round" />
      {/* Orange side rails */}
      <line
        x1={x1 + px * 6}
        y1={y1 + py * 6}
        x2={x2 + px * 6}
        y2={y2 + py * 6}
        stroke={orange}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <line
        x1={x1 - px * 6}
        y1={y1 - py * 6}
        x2={x2 - px * 6}
        y2={y2 - py * 6}
        stroke={orangeDark}
        strokeWidth={2}
        strokeLinecap="round"
      />
      {/* Center stripe */}
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={stripe}
        strokeWidth={1.3}
        strokeDasharray="5 4"
        strokeLinecap="round"
        opacity={0.85}
      />

      {/* Towers on top of the deck */}
      <Tower tx={t1x} ty={t1y} />
      <Tower tx={t2x} ty={t2y} />
    </g>
  );
}
