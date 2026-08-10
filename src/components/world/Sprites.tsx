// Isometric SVG sprites for every world object kind.
// Drawn around a local origin (0,0) at the tile center; the parent
// positions them via translate. Shapes use flat, playful RCT-style colors.
import React from 'react';
import type { WorldObjectKind } from '../../types/world';
import { TILE_H, TILE_W } from '../../utils/iso';

interface SpriteProps {
  kind: WorldObjectKind;
  variant: number;
  night: boolean;
  era?: number; // 0..4 — controls how modern/mature the object looks
  /** 2 = manor spanning two ground tiles */
  tiles?: 1 | 2;
}

// Screen half-extents for a ground footprint. w/d use the same units as
// tile width; depth is projected with the world's 2:1 iso ratio so building
// diamonds match the ground tiles (vertical edges stay screen-vertical).
function isoHalf(w: number, d: number = w): { hw: number; hd: number } {
  return { hw: w / 2, hd: (d / 2) * (TILE_H / TILE_W) };
}

// A small reusable isometric box: top face + left + right.
function IsoBox({
  w,
  d,
  h,
  top,
  left,
  right,
  y = 0,
}: {
  w: number;
  d: number;
  h: number;
  top: string;
  left: string;
  right: string;
  y?: number;
}) {
  const { hw, hd } = isoHalf(w, d);
  // base center at (0, y). Verticals share the same screen X.
  const topPts = `0,${y - h - hd} ${hw},${y - h} 0,${y - h + hd} ${-hw},${y - h}`;
  const leftPts = `${-hw},${y - h} 0,${y - h + hd} 0,${y + hd} ${-hw},${y}`;
  const rightPts = `${hw},${y - h} 0,${y - h + hd} 0,${y + hd} ${hw},${y}`;
  return (
    <g>
      <polygon points={leftPts} fill={left} />
      <polygon points={rightPts} fill={right} />
      {/* right face is shaded darker for directional light */}
      <polygon points={rightPts} fill="#000000" opacity={0.14} />
      <polygon points={topPts} fill={top} />
      {/* top face catches light */}
      <polygon points={topPts} fill="#ffffff" opacity={0.1} />
    </g>
  );
}

// ---- isometric surface geometry --------------------------------------
// hw/hd are *screen* half-extents (from isoHalf). Top face corners:
//   W(-hw,-h)  N(0,-h-hd)  E(hw,-h)  S(0,-h+hd)
// Visible walls: W→S (left) and S→E (right). Vertical edges are upright.

// A point on a visible wall: u runs along the wall (0..1), vh is height
// above the ground. Lets doors/windows follow the true face slant.
function facePoint(
  side: 'left' | 'right',
  hw: number,
  hd: number,
  u: number,
  vh: number,
): [number, number] {
  if (side === 'left') return [-hw + u * hw, u * hd - vh];
  return [u * hw, hd - u * hd - vh];
}

function faceQuad(
  side: 'left' | 'right',
  hw: number,
  hd: number,
  u0: number,
  u1: number,
  v0: number,
  v1: number,
): string {
  return [
    facePoint(side, hw, hd, u0, v0),
    facePoint(side, hw, hd, u1, v0),
    facePoint(side, hw, hd, u1, v1),
    facePoint(side, hw, hd, u0, v1),
  ]
    .map((p) => p.join(','))
    .join(' ');
}

const pts = (arr: number[][]) => arr.map((p) => p.join(',')).join(' ');

// A conical/pyramid tower roof that actually sits on the tower's top face.
function ConeRoof({
  hw,
  hd,
  h,
  rise,
  light,
  dark,
}: {
  hw: number;
  hd: number;
  h: number;
  rise: number;
  light: string;
  dark: string;
}) {
  const W = [-hw, -h];
  const N = [0, -h - hd];
  const E = [hw, -h];
  const S = [0, -h + hd];
  const apex = [0, -h - hd - rise];
  return (
    <g>
      <polygon points={pts([W, N, apex])} fill={dark} />
      <polygon points={pts([N, E, apex])} fill={dark} />
      <polygon points={pts([W, S, apex])} fill={light} />
      <polygon points={pts([S, E, apex])} fill={dark} />
    </g>
  );
}

// Windows show glass in daytime and glow warmly at night.
function Windows({
  night,
  rows,
  cols = 2,
  x,
  top = -14,
  gap = 8,
}: {
  night: boolean;
  rows: number;
  cols?: number;
  x: number;
  top?: number;
  gap?: number;
}) {
  return (
    <g>
      {Array.from({ length: rows }).map((_, r) =>
        Array.from({ length: cols }).map((_, c) => {
          const on = !night || (r * 3 + c * 5) % 5 !== 0;
          return (
            <g key={`${r}-${c}`}>
              {night && on && (
                <rect
                  x={x + c * 6 - 1}
                  y={top - r * gap - 1}
                  width={6}
                  height={6}
                  rx={1}
                  fill="#fde68a"
                  opacity={0.35}
                />
              )}
              <rect
                x={x + c * 6}
                y={top - r * gap}
                width={4}
                height={4}
                rx={0.6}
                fill={night ? (on ? '#fde68a' : '#1e293b') : '#93c5e8'}
                stroke={night ? (on ? '#f59e0b' : '#0f172a') : '#5b8bb0'}
                strokeWidth={0.4}
              />
            </g>
          );
        }),
      )}
    </g>
  );
}

/** Window grid that sits on a true isometric wall face. */
function FaceWindows({
  side,
  hw,
  hd,
  night,
  rows,
  cols,
  v0,
  v1,
  uPad = 0.12,
  lit,
}: {
  side: 'left' | 'right';
  hw: number;
  hd: number;
  night: boolean;
  rows: number;
  cols: number;
  v0: number;
  v1: number;
  uPad?: number;
  lit?: (r: number, c: number) => boolean;
}) {
  // At night most offices stay lit — dark windows are the minority.
  const isLit = (r: number, c: number) =>
    lit ? lit(r, c) : (r * 3 + c * 7 + side.length) % 5 !== 0;
  const glass = (r: number, c: number) => {
    if (!night) return '#8ec5e8';
    return isLit(r, c) ? '#fde68a' : '#0f172a';
  };
  const rowH = (v1 - v0) / rows;
  const colW = (1 - uPad * 2) / cols;
  return (
    <g>
      {Array.from({ length: rows }).map((_, r) =>
        Array.from({ length: cols }).map((_, c) => {
          const u0 = uPad + c * colW + colW * 0.15;
          const u1 = uPad + c * colW + colW * 0.85;
          const y0 = v0 + r * rowH + rowH * 0.2;
          const y1 = v0 + r * rowH + rowH * 0.8;
          const on = night && isLit(r, c);
          return (
            <g key={`${side}-${r}-${c}`}>
              {on && (
                <polygon
                  points={faceQuad(side, hw, hd, u0 - 0.02, u1 + 0.02, y0 - 1, y1 + 1)}
                  fill="#fbbf24"
                  opacity={0.22}
                />
              )}
              <polygon
                points={faceQuad(side, hw, hd, u0, u1, y0, y1)}
                fill={glass(r, c)}
                opacity={side === 'right' ? 0.85 : 1}
              />
            </g>
          );
        }),
      )}
    </g>
  );
}

export function Sprite({ kind, variant, night, era = 0, tiles = 1 }: SpriteProps) {
  switch (kind) {
    case 'TREE': {
      // Space Age — crystalline lunar growths instead of green canopy
      if (era >= 4) {
        const crystal = ['#c7d2e0', '#a8b8c8', '#dfe7f0', '#9aabbc'][variant % 4];
        return (
          <g>
            <rect x={-1.8} y={-14} width={3.6} height={14} rx={1} fill="#7a756c" />
            <polygon points="0,-28 -7,-14 7,-14" fill={crystal} opacity={0.92} />
            <polygon points="0,-34 -4,-22 4,-22" fill="#eef2f7" opacity={0.85} />
            <ellipse cx={-1} cy={-24} rx={1.8} ry={2.4} fill="#ffffff" opacity={night ? 0.55 : 0.35} />
          </g>
        );
      }
      const green = ['#2f7d3a', '#276e33', '#358a41', '#3f9a4c'][variant % 4];
      const lightGreen = ['#4fa85c', '#469954', '#57b866', '#63c471'][variant % 4];
      // trees keep maturing as the world ages
      const g = 1 + Math.min(era, 3) * 0.16;
      return (
        <g transform={`scale(${g})`} style={{ transformOrigin: 'center bottom' }}>
          <rect x={-2.2} y={-9} width={4.4} height={11} rx={1.5} fill="#6b4420" />
          <rect x={-2.2} y={-9} width={2} height={11} fill="#8a5a2c" />
          <ellipse cx={0} cy={-15} rx={11} ry={12} fill={green} />
          <ellipse cx={2} cy={-13} rx={8} ry={9} fill="#000000" opacity={0.12} />
          <ellipse cx={-3} cy={-19} rx={7} ry={8} fill={lightGreen} />
          {era >= 2 && <ellipse cx={4} cy={-20} rx={5} ry={6} fill={lightGreen} opacity={0.85} />}
          <ellipse cx={-4} cy={-22} rx={4} ry={4.5} fill="#ffffff" opacity={0.18} />
        </g>
      );
    }
    case 'FLOWER':
      return (
        <g>
          {[-6, 0, 6].map((dx, i) => (
            <g key={i}>
              <rect x={dx - 0.6} y={-6} width={1.2} height={6} fill="#3f7d33" />
              <circle cx={dx} cy={-7} r={2.4} fill={['#f472b6', '#facc15', '#f87171'][(variant + i) % 3]} />
            </g>
          ))}
        </g>
      );
    case 'DECORATION': {
      // Real street furniture rather than an abstract blob.
      const deco = variant % 4;
      if (deco === 0) {
        // trimmed hedge
        return (
          <g>
            <ellipse cx={0} cy={1} rx={11} ry={5} fill="#4a7d38" />
            <ellipse cx={0} cy={-2} rx={10} ry={5.5} fill="#3f8f42" />
            <ellipse cx={-2} cy={-4} rx={7} ry={4} fill="#57a95a" />
            <ellipse cx={-3} cy={-5} rx={3.5} ry={2} fill="#ffffff" opacity={0.18} />
          </g>
        );
      }
      if (deco === 1) {
        // park bench
        return (
          <g>
            <ellipse cx={0} cy={1} rx={9} ry={3.5} fill="#000000" opacity={0.12} />
            <polygon points="-9,-2 0,2 9,-2 0,-6" fill="#a9713f" />
            <polygon points="-9,-2 0,2 0,-1 -9,-5" fill="#8a5a30" />
            <polygon points="-9,-7 0,-3 9,-7 0,-11" fill="#c08850" opacity={0.95} />
            <rect x={-7} y={-4} width={1.4} height={4} fill="#5b5b5b" />
            <rect x={6} y={-4} width={1.4} height={4} fill="#5b5b5b" />
          </g>
        );
      }
      if (deco === 2) {
        // lamp post
        return (
          <g>
            <ellipse cx={0} cy={1} rx={5} ry={2.4} fill="#000000" opacity={0.14} />
            <rect x={-1} y={-22} width={2} height={23} rx={0.8} fill="#4a5257" />
            <rect x={-3} y={-1.5} width={6} height={2.5} rx={1} fill="#3b4246" />
            <path d="M -1 -22 Q -1 -26 3 -26" stroke="#4a5257" strokeWidth={1.6} fill="none" />
            <circle cx={4} cy={-25} r={2.8} fill={night ? '#fde68a' : '#dfe6e9'} />
            {night && <circle cx={4} cy={-25} r={6} fill="#fde68a" opacity={0.25} />}
          </g>
        );
      }
      // stone fountain
      return (
        <g>
          <ellipse cx={0} cy={0} rx={11} ry={5.5} fill="#b8bfc4" />
          <ellipse cx={0} cy={-1} rx={9} ry={4.5} fill="#8fa9c0" />
          <ellipse cx={0} cy={-1.4} rx={7} ry={3.4} fill="#6fa8d6" />
          <rect x={-1} y={-9} width={2} height={8} fill="#b8bfc4" />
          <ellipse cx={0} cy={-9.5} rx={4} ry={1.8} fill="#cbd3d8" />
          <ellipse cx={0} cy={-11} rx={1.6} ry={1} fill="#9fc7e8" />
        </g>
      );
    }
    case 'ROAD':
      return null; // roads are drawn as tile overlays
    case 'HOUSE': {
      // Cottages / townhouses on 1 tile; $1k manors span 2 tiles.
      const manor = tiles === 2;
      const twoStory = manor || variant % 2 === 1;
      const footprintW = manor ? 56 : 26;
      const footprintD = manor ? 36 : 26;
      const { hw, hd } = isoHalf(footprintW, footprintD);
      const h = manor ? 26 : twoStory ? 22 : 14;
      // Cottages keep a lived-in night glow; a few windows stay dark.
      const litWin = (i: number) => !night || (variant + i) % 5 !== 0;
      const glass = (i: number) =>
        night ? (litWin(i) ? '#fde68a' : '#1e293b') : '#8ec5e8';
      const wallL = ['#f0d5a8', '#e8b4a0', '#d7e0c5', '#ddd0f0'][variant % 4];
      const wallR = ['#f7e6c4', '#f0cbb8', '#e8f0d4', '#ebe3f7'][variant % 4];
      const roofL = ['#c0392b', '#6c3483', '#1a5276', '#b9770e'][variant % 4];
      const roofD = ['#922b21', '#4a235a', '#154360', '#9a7d0a'][variant % 4];
      const rise = manor ? 12 : 9;
      const eaves = 1.08;
      const W: [number, number] = [-hw * eaves, -h];
      const N: [number, number] = [0, -h - hd * eaves];
      const E: [number, number] = [hw * eaves, -h];
      const S: [number, number] = [0, -h + hd * eaves];
      const apex: [number, number] = [0, -h - hd * 0.35 - rise];
      const knob = facePoint('left', hw, hd, 0.58, 4.5);
      const winLo = twoStory ? 12 : 6;
      const winHi = twoStory ? 18 : 11;
      // Yard fence — slightly larger diamond around the house footprint
      const fhw = hw * 1.45;
      const fhd = hd * 1.45;
      const fenceH = 4.5;
      const fence = '#6b5b4a';
      const fenceLight = '#8a7864';
      const gateGap = !manor; // leave a path at the front for cottages
      return (
        <g>
          {/* yard fence (drawn under the house) */}
          <polygon
            points={pts([
              [-fhw, 0],
              [0, -fhd],
              [fhw, 0],
              [0, fhd],
            ])}
            fill="#5a8f3a"
            opacity={0.35}
          />
          {/* back + side rails */}
          <line x1={-fhw} y1={0} x2={0} y2={-fhd} stroke={fence} strokeWidth={1.2} />
          <line x1={0} y1={-fhd} x2={fhw} y2={0} stroke={fence} strokeWidth={1.2} />
          <line x1={-fhw} y1={-fenceH} x2={0} y2={-fhd - fenceH} stroke={fenceLight} strokeWidth={1.1} />
          <line x1={0} y1={-fhd - fenceH} x2={fhw} y2={-fenceH} stroke={fenceLight} strokeWidth={1.1} />
          {/* posts */}
          {[
            [-fhw, 0],
            [0, -fhd],
            [fhw, 0],
            [0, fhd],
            [-fhw * 0.5, -fhd * 0.5],
            [fhw * 0.5, -fhd * 0.5],
            [-fhw * 0.5, fhd * 0.5],
            [fhw * 0.5, fhd * 0.5],
          ].map(([px, py], i) => (
            <line key={i} x1={px} y1={py} x2={px} y2={py - fenceH} stroke={fence} strokeWidth={1.4} strokeLinecap="round" />
          ))}
          {/* front rails with optional gate gap */}
          {gateGap ? (
            <>
              <line x1={-fhw} y1={0} x2={-fhw * 0.22} y2={fhd * 0.78} stroke={fence} strokeWidth={1.2} />
              <line x1={fhw * 0.22} y1={fhd * 0.78} x2={fhw} y2={0} stroke={fence} strokeWidth={1.2} />
              <line x1={-fhw} y1={-fenceH} x2={-fhw * 0.22} y2={fhd * 0.78 - fenceH} stroke={fenceLight} strokeWidth={1.1} />
              <line x1={fhw * 0.22} y1={fhd * 0.78 - fenceH} x2={fhw} y2={-fenceH} stroke={fenceLight} strokeWidth={1.1} />
            </>
          ) : (
            <>
              <line x1={-fhw} y1={0} x2={0} y2={fhd} stroke={fence} strokeWidth={1.2} />
              <line x1={0} y1={fhd} x2={fhw} y2={0} stroke={fence} strokeWidth={1.2} />
              <line x1={-fhw} y1={-fenceH} x2={0} y2={fhd - fenceH} stroke={fenceLight} strokeWidth={1.1} />
              <line x1={0} y1={fhd - fenceH} x2={fhw} y2={-fenceH} stroke={fenceLight} strokeWidth={1.1} />
            </>
          )}

          <IsoBox w={footprintW} d={footprintD} h={h} top={wallR} left={wallL} right={wallR} />
          {/* door on near-left wall */}
          <polygon points={faceQuad('left', hw, hd, manor ? 0.48 : 0.42, manor ? 0.62 : 0.62, 0, manor ? 11 : 9)} fill="#5d4037" />
          <circle cx={knob[0]} cy={knob[1]} r={0.7} fill="#f1c40f" />
          {night && (
            <ellipse cx={0} cy={2} rx={hw * 0.9} ry={hd * 0.55} fill="#fbbf24" opacity={0.12} />
          )}
          {/* windows */}
          <polygon points={faceQuad('left', hw, hd, 0.1, 0.28, winLo, winHi)} fill={glass(0)} />
          <polygon points={faceQuad('left', hw, hd, 0.72, 0.9, winLo, winHi)} fill={glass(1)} />
          <polygon points={faceQuad('right', hw, hd, 0.12, 0.3, winLo, winHi)} fill={glass(2)} />
          <polygon points={faceQuad('right', hw, hd, 0.38, 0.56, winLo, winHi)} fill={glass(3)} />
          <polygon points={faceQuad('right', hw, hd, 0.64, 0.82, winLo, winHi)} fill={glass(4)} />
          {twoStory && (
            <>
              <polygon points={faceQuad('left', hw, hd, 0.4, 0.58, 12, 18)} fill={glass(5)} />
              {manor && <polygon points={faceQuad('left', hw, hd, 0.2, 0.35, 20, 24)} fill={glass(6)} />}
            </>
          )}
          {/* hip roof */}
          <polygon points={pts([N, E, apex])} fill={roofD} />
          <polygon points={pts([W, N, apex])} fill={roofD} />
          <polygon points={pts([W, S, apex])} fill={roofL} />
          <polygon points={pts([S, E, apex])} fill={roofD} />
          {/* chimney(s) */}
          <rect x={hw * 0.35 - 1.5} y={-h - hd * 0.2 - 12} width={3} height={10} fill="#8d6e63" />
          <rect x={hw * 0.35 - 2} y={-h - hd * 0.2 - 14} width={4} height={2.2} fill="#6d4c41" />
          {manor && (
            <>
              <rect x={-hw * 0.4 - 1.5} y={-h - hd * 0.15 - 12} width={3} height={10} fill="#8d6e63" />
              <rect x={-hw * 0.4 - 2} y={-h - hd * 0.15 - 14} width={4} height={2.2} fill="#6d4c41" />
            </>
          )}
        </g>
      );
    }
    case 'FARM': {
      const { hw, hd } = isoHalf(22);
      const h = 13;
      return (
        <g>
          {/* tilled field beside the barn */}
          <polygon points="-16,2 -2,9 6,5 -8,-2" fill="#b98a4a" />
          {[0, 1, 2].map((i) => (
            <line key={i} x1={-14 + i * 4} y1={1 + i} x2={-4 + i * 4} y2={6 + i} stroke="#8a6636" strokeWidth={0.6} />
          ))}
          {/* red barn body */}
          <IsoBox w={22} d={22} h={h} top="#b83a2e" left="#7d2a22" right="#a0332a" />
          {/* gambrel roof — 2:1 diamond matching the box top */}
          <polygon
            points={`0,${-h - hd - 8} ${hw},${-h - 2} 0,${-h + hd} ${-hw},${-h - 2}`}
            fill="#8f2f26"
          />
          <polygon points={`0,${-h - hd - 8} ${hw},${-h - 2} 0,${-h + hd}`} fill="#000000" opacity={0.14} />
          {/* white barn door + trim */}
          <polygon points={faceQuad('left', hw, hd, 0.28, 0.55, 0, 10)} fill="#ecf0f1" />
          <line
            x1={facePoint('left', hw, hd, 0.415, 9)[0]}
            y1={facePoint('left', hw, hd, 0.415, 9)[1]}
            x2={facePoint('left', hw, hd, 0.415, 1)[0]}
            y2={facePoint('left', hw, hd, 0.415, 1)[1]}
            stroke="#b83a2e"
            strokeWidth={0.7}
          />
        </g>
      );
    }
    case 'SHOP': {
      // Corner storefront — painted walls, face-mounted awning (not a mid-building slab).
      const awn = ['#e74c3c', '#27ae60', '#2980b9'][variant % 3];
      const awnDark = ['#c0392b', '#1e8449', '#1f6391'][variant % 3];
      const wallL = ['#f5e6c8', '#d6eaf8', '#fadbd8'][variant % 3];
      const wallR = ['#fbf3e0', '#ebf5fb', '#fdedec'][variant % 3];
      const footprint = 28;
      const { hw, hd } = isoHalf(footprint);
      const h = era >= 2 ? 24 : 16;
      const glass = night ? '#fde68a' : '#7eb8d8';
      // Awning: a short canopy jutting off the left (storefront) face
      const awnH = 11;
      const awnDrop = 3.2;
      const awnIn0 = facePoint('left', hw, hd, 0.08, awnH);
      const awnIn1 = facePoint('left', hw, hd, 0.92, awnH);
      // Push toward camera (south) so it reads as a shelf, not a floor through the box
      const awnOut0: [number, number] = [awnIn0[0] + hd * 0.35, awnIn0[1] + hd * 0.55];
      const awnOut1: [number, number] = [awnIn1[0] + hd * 0.35, awnIn1[1] + hd * 0.55];
      const awnOut0b: [number, number] = [awnOut0[0], awnOut0[1] + awnDrop];
      const awnOut1b: [number, number] = [awnOut1[0], awnOut1[1] + awnDrop];
      return (
        <g>
          <IsoBox w={footprint} d={footprint} h={h} top="#c5ced4" left={wallL} right={wallR} />
          {/* roof coping */}
          <polygon
            points={pts([
              [-hw * 1.06, -h],
              [0, -h - hd * 1.06],
              [hw * 1.06, -h],
              [0, -h + hd * 1.06],
            ])}
            fill="#7f8c8d"
          />
          {/* door + big shop window on storefront */}
          <polygon points={faceQuad('left', hw, hd, 0.55, 0.82, 0, 9)} fill="#5d4037" />
          <polygon points={faceQuad('left', hw, hd, 0.1, 0.5, 2, 10)} fill={glass} />
          {/* side windows */}
          <polygon points={faceQuad('right', hw, hd, 0.2, 0.42, era >= 2 ? 14 : 5, era >= 2 ? 20 : 10)} fill={glass} />
          <polygon points={faceQuad('right', hw, hd, 0.55, 0.77, era >= 2 ? 14 : 5, era >= 2 ? 20 : 10)} fill={glass} />
          {era >= 2 && (
            <polygon points={faceQuad('left', hw, hd, 0.2, 0.45, 14, 20)} fill={glass} />
          )}
          {/* striped awning canopy */}
          <polygon points={pts([awnIn0, awnIn1, awnOut1, awnOut0])} fill={awn} />
          <polygon points={pts([awnOut0, awnOut1, awnOut1b, awnOut0b])} fill={awnDark} />
          {[0.2, 0.4, 0.6, 0.8].map((u, i) => {
            const a = facePoint('left', hw, hd, u - 0.06, awnH);
            const b = facePoint('left', hw, hd, u + 0.06, awnH);
            const ao: [number, number] = [a[0] + hd * 0.35, a[1] + hd * 0.55];
            const bo: [number, number] = [b[0] + hd * 0.35, b[1] + hd * 0.55];
            return (
              <polygon
                key={i}
                points={pts([a, b, bo, ao])}
                fill={i % 2 ? '#ffffff' : awnDark}
                opacity={0.55}
              />
            );
          })}
          {/* hanging sign above the door */}
          <polygon points={faceQuad('left', hw, hd, 0.58, 0.8, 12.5, 15)} fill="#f39c12" />
        </g>
      );
    }
    case 'RESTAURANT': {
      const footprint = 30;
      const { hw, hd } = isoHalf(footprint);
      const h = 20;
      const glass = night ? '#fde68a' : '#a8d3ee';
      const rise = 8;
      const W: [number, number] = [-hw * 1.08, -h];
      const N: [number, number] = [0, -h - hd * 1.08];
      const E: [number, number] = [hw * 1.08, -h];
      const S: [number, number] = [0, -h + hd * 1.08];
      const apex: [number, number] = [0, -h - hd * 0.3 - rise];
      return (
        <g>
          <IsoBox w={footprint} d={footprint} h={h} top="#b8794a" left="#5d3a24" right="#7a4b30" />
          {/* hip roof */}
          <polygon points={pts([N, E, apex])} fill="#6e3b1e" />
          <polygon points={pts([W, N, apex])} fill="#6e3b1e" />
          <polygon points={pts([W, S, apex])} fill="#8b4518" />
          <polygon points={pts([S, E, apex])} fill="#6e3b1e" />
          {/* door + windows */}
          <polygon points={faceQuad('left', hw, hd, 0.4, 0.62, 0, 10)} fill="#3e2723" />
          <polygon points={faceQuad('left', hw, hd, 0.12, 0.32, 4, 11)} fill={glass} />
          <polygon points={faceQuad('right', hw, hd, 0.22, 0.42, 5, 12)} fill={glass} />
          <polygon points={faceQuad('right', hw, hd, 0.55, 0.75, 5, 12)} fill={glass} />
          {/* lit sign on storefront */}
          <polygon points={faceQuad('left', hw, hd, 0.35, 0.68, 12, 15)} fill={night ? '#fde68a' : '#e67e22'} />
          <circle
            cx={facePoint('left', hw, hd, 0.515, 13.5)[0]}
            cy={facePoint('left', hw, hd, 0.515, 13.5)[1]}
            r={1.6}
            fill={night ? '#fff7cc' : '#f1c40f'}
          />
        </g>
      );
    }
    case 'FACTORY':
      return (
        <g>
          <IsoBox w={38} d={38} h={24} top="#8a969a" left="#4b5658" right="#6b767a" />
          {/* corrugated banding on the lit face */}
          {[-6, -13, -20].map((yy, i) => (
            <line key={i} x1={2} y1={yy} x2={18} y2={yy - 8} stroke="#000000" strokeWidth={0.5} opacity={0.18} />
          ))}
          {/* smokestacks with caps */}
          <rect x={6} y={-46} width={7} height={26} fill="#95a5a6" />
          <rect x={6} y={-47} width={7} height={2.5} fill="#7f8c8d" />
          <rect x={-14} y={-40} width={7} height={20} fill="#95a5a6" />
          {/* roll-up door */}
          <polygon points="-12,-2 -4,2 -4,-10 -12,-14" fill="#3b4548" />
          <Windows night={night} rows={1} cols={2} x={2} top={-16} />
        </g>
      );
    case 'TOWER': {
      const lit = (r: number, c: number) => ((variant * 13 + r * 5 + c * 3) % 7) > 2;
      // City age: brick mid-rise. Metropolis+: glass skyscraper stack.
      if (era < 3) {
        const h = 36;
        const { hw, hd } = isoHalf(24);
        return (
          <g>
            <IsoBox w={24} d={24} h={h} top="#d4c4b0" left="#8a6f55" right="#a88968" />
            {Array.from({ length: 5 }).map((_, r) =>
              [0, 1].map((c) => (
                <rect
                  key={`${r}-${c}`}
                  x={c === 0 ? -8 : 2}
                  y={-h + 5 + r * 6.5}
                  width={5}
                  height={4}
                  fill={night && lit(r, c) ? '#fde68a' : '#9dc6e4'}
                  opacity={c === 0 ? 0.9 : 0.65}
                />
              )),
            )}
            <polygon
              points={`0,${-h - hd - 6} ${hw},${-h - 2} 0,${-h + hd} ${-hw},${-h - 2}`}
              fill="#6b5344"
            />
          </g>
        );
      }
      const shaft = era >= 4 ? 96 : 82;
      const base = era >= 4 ? 72 : 64;
      return (
        <g>
          <IsoBox w={26} d={26} h={base} top="#5aa0e6" left="#2c5aa0" right="#3b78c9" />
          <IsoBox w={20} d={20} h={shaft} top="#a3cbff" left="#3b6bb0" right="#4f86d6" />
          {Array.from({ length: Math.floor(shaft / 9) }).map((_, r) =>
            [0, 1].map((c) => (
              <rect
                key={`${r}-${c}`}
                x={c === 0 ? -9 : 2}
                y={-shaft + 8 + r * 8}
                width={6}
                height={5}
                fill={night ? (lit(r, c) ? '#fde68a' : '#1e3a5f') : '#bfe0f7'}
                opacity={c === 0 ? 0.85 : 0.6}
              />
            )),
          )}
          <rect x={-0.6} y={-shaft - 14} width={1.2} height={14} fill="#95a5a6" />
          <circle cx={0} cy={-shaft - 14} r={1.6} fill={night ? '#ff6b6b' : '#e74c3c'} />
        </g>
      );
    }
    case 'ATTRACTION': // ferris wheel
      return (
        <g>
          {/* A-frame supports */}
          <line x1={-10} y1={2} x2={0} y2={-34} stroke="#7f8c8d" strokeWidth={2.5} />
          <line x1={10} y1={2} x2={0} y2={-34} stroke="#95a5a6" strokeWidth={2.5} />
          <circle cx={0} cy={-34} r={22} fill="none" stroke="#e84393" strokeWidth={3} />
          <circle cx={0} cy={-34} r={22} fill="none" stroke="#ffffff" strokeWidth={1} opacity={0.4} />
          {Array.from({ length: 8 }).map((_, i) => {
            const a = (i / 8) * Math.PI * 2;
            const gx = Math.cos(a) * 22;
            const gy = -34 + Math.sin(a) * 22;
            return (
              <g key={i}>
                <line x1={0} y1={-34} x2={gx} y2={gy} stroke="#fd79a8" strokeWidth={1.5} />
                <rect x={gx - 3} y={gy - 1} width={6} height={5} rx={1.5} fill={night ? '#fde68a' : ['#f1c40f', '#2ecc71', '#3498db', '#e74c3c'][i % 4]} />
              </g>
            );
          })}
          <circle cx={0} cy={-34} r={3.5} fill="#2d3436" />
          <circle cx={0} cy={-34} r={1.5} fill="#95a5a6" />
        </g>
      );
    case 'STADIUM':
      return (
        <g>
          {/* outer bowl wall */}
          <ellipse cx={0} cy={-4} rx={30} ry={16} fill="#c7cfd3" />
          <ellipse cx={0} cy={-9} rx={30} ry={16} fill="#e6ebed" />
          {/* stands */}
          <ellipse cx={0} cy={-9} rx={24} ry={12} fill="#aab4b9" />
          <ellipse cx={0} cy={-10} rx={19} ry={9} fill="#8a969b" />
          {/* pitch */}
          <ellipse cx={0} cy={-10} rx={15} ry={7} fill="#2ea043" />
          <line x1={0} y1={-17} x2={0} y2={-3} stroke="#ffffff" strokeWidth={0.6} opacity={0.7} />
          <ellipse cx={0} cy={-10} rx={4} ry={2} fill="none" stroke="#ffffff" strokeWidth={0.6} opacity={0.7} />
          {/* floodlight masts */}
          {[-26, 26].map((mx, i) => (
            <g key={i}>
              <line x1={mx} y1={-12} x2={mx} y2={-28} stroke="#7f8c8d" strokeWidth={1.5} />
              <rect x={mx - 3} y={-31} width={6} height={4} rx={1} fill={night ? '#fff7cc' : '#dfe6e9'} />
            </g>
          ))}
        </g>
      );
    case 'LANDMARK': {
      // Big 2-tile skyline buildings — glass tower, deco, hotel, civic, twins, mega.
      const lv = variant % 6;
      const lit = (r: number, c: number) => ((variant * 11 + r * 7 + c * 3) % 5) > 1;

      // 0) Glass skyscraper
      if (lv === 0) {
        const w = 48;
        const d = 36;
        const { hw, hd } = isoHalf(w, d);
        const h = 110;
        return (
          <g>
            <IsoBox w={w} d={d} h={h} top="#c8e0f8" left="#3a6ea8" right="#4f8fd0" />
            <FaceWindows side="left" hw={hw} hd={hd} night={night} rows={14} cols={4} v0={6} v1={h - 8} lit={lit} />
            <FaceWindows side="right" hw={hw} hd={hd} night={night} rows={14} cols={3} v0={6} v1={h - 8} lit={lit} />
            <IsoBox w={w * 0.55} d={d * 0.55} h={16} top="#e8f4ff" left="#2c5a90" right="#3b78c9" y={-h} />
            <rect x={-0.7} y={-h - 28} width={1.4} height={14} fill="#95a5a6" />
            <circle cx={0} cy={-h - 28} r={2} fill={night ? '#ff6b6b' : '#e74c3c'} />
          </g>
        );
      }

      // 1) Art deco setback tower
      if (lv === 1) {
        return (
          <g>
            <IsoBox w={52} d={40} h={36} top="#d4c4a8" left="#8a7355" right="#a89068" />
            <FaceWindows side="left" hw={26} hd={10} night={night} rows={4} cols={5} v0={4} v1={32} lit={lit} />
            <FaceWindows side="right" hw={26} hd={10} night={night} rows={4} cols={4} v0={4} v1={32} lit={lit} />
            <IsoBox w={40} d={30} h={52} top="#e0d2b4" left="#7a6548" right="#9a8060" />
            <FaceWindows side="left" hw={20} hd={7.5} night={night} rows={6} cols={4} v0={38} v1={84} lit={lit} />
            <FaceWindows side="right" hw={20} hd={7.5} night={night} rows={6} cols={3} v0={38} v1={84} lit={lit} />
            <IsoBox w={26} d={20} h={78} top="#efe4c8" left="#6b5640" right="#8a7055" />
            <FaceWindows side="left" hw={13} hd={5} night={night} rows={5} cols={2} v0={88} v1={118} lit={lit} />
            <FaceWindows side="right" hw={13} hd={5} night={night} rows={5} cols={2} v0={88} v1={118} lit={lit} />
            <ConeRoof hw={14} hd={5.5} h={78} rise={18} light="#c9a227" dark="#8a7018" />
          </g>
        );
      }

      // 2) Grand hotel block
      if (lv === 2) {
        const w = 58;
        const d = 40;
        const { hw, hd } = isoHalf(w, d);
        const h = 64;
        const glass = night ? '#fde68a' : '#7eb8d8';
        return (
          <g>
            <IsoBox w={w} d={d} h={h} top="#f0e6d8" left="#c4a484" right="#dbb896" />
            <FaceWindows side="left" hw={hw} hd={hd} night={night} rows={7} cols={5} v0={14} v1={h - 6} lit={lit} />
            <FaceWindows side="right" hw={hw} hd={hd} night={night} rows={7} cols={4} v0={14} v1={h - 6} lit={lit} />
            {/* ground-floor arcade */}
            {[0.12, 0.32, 0.52, 0.72].map((u, i) => (
              <polygon
                key={i}
                points={faceQuad('left', hw, hd, u, u + 0.14, 0, 12)}
                fill={glass}
              />
            ))}
            {/* canopy */}
            <polygon
              points={pts([
                facePoint('left', hw, hd, 0.05, 13),
                facePoint('left', hw, hd, 0.95, 13),
                [facePoint('left', hw, hd, 0.95, 13)[0] + hd * 0.4, facePoint('left', hw, hd, 0.95, 13)[1] + hd * 0.55],
                [facePoint('left', hw, hd, 0.05, 13)[0] + hd * 0.4, facePoint('left', hw, hd, 0.05, 13)[1] + hd * 0.55],
              ])}
              fill="#8b3a3a"
            />
            {/* flat roof terrace + penthouse */}
            <polygon
              points={pts([
                [-hw * 1.05, -h],
                [0, -h - hd * 1.05],
                [hw * 1.05, -h],
                [0, -h + hd * 1.05],
              ])}
              fill="#a08060"
            />
            <IsoBox w={22} d={16} h={12} top="#f7efe4" left="#b89070" right="#d0a888" y={-h} />
            <rect x={-8} y={-h - 4} width={16} height={3} rx={1} fill="#c0392b" />
          </g>
        );
      }

      // 3) Civic / city hall tower
      if (lv === 3) {
        const w = 50;
        const d = 38;
        const { hw, hd } = isoHalf(w, d);
        const baseH = 42;
        const shaftH = 88;
        return (
          <g>
            <IsoBox w={w} d={d} h={baseH} top="#e8eef4" left="#8a96a4" right="#a8b4c0" />
            <FaceWindows side="left" hw={hw} hd={hd} night={night} rows={4} cols={4} v0={8} v1={baseH - 4} lit={lit} />
            <FaceWindows side="right" hw={hw} hd={hd} night={night} rows={4} cols={3} v0={8} v1={baseH - 4} lit={lit} />
            <polygon points={faceQuad('left', hw, hd, 0.38, 0.62, 0, 16)} fill="#2c3e50" />
            <IsoBox w={28} d={22} h={shaftH} top="#f0f5fa" left="#6b7a8a" right="#8798a8" />
            <FaceWindows side="left" hw={14} hd={5.5} night={night} rows={8} cols={2} v0={48} v1={shaftH - 10} lit={lit} />
            <FaceWindows side="right" hw={14} hd={5.5} night={night} rows={8} cols={2} v0={48} v1={shaftH - 10} lit={lit} />
            <ConeRoof hw={16} hd={6.5} h={shaftH} rise={22} light="#2ecc71" dark="#1e8449" />
            <circle cx={0} cy={-shaftH - 6.5 - 24} r={2.4} fill="#f1c40f" />
          </g>
        );
      }

      // 4) Twin towers
      if (lv === 4) {
        const h = 96;
        const Twin = ({ x, y }: { x: number; y: number }) => {
          const { hw, hd } = isoHalf(26, 26);
          return (
            <g transform={`translate(${x},${y})`}>
              <IsoBox w={26} d={26} h={h} top="#b8d4f0" left="#2a5080" right="#3d6aa8" />
              <FaceWindows side="left" hw={hw} hd={hd} night={night} rows={12} cols={2} v0={6} v1={h - 8} lit={lit} />
              <FaceWindows side="right" hw={hw} hd={hd} night={night} rows={12} cols={2} v0={6} v1={h - 8} lit={lit} />
              <IsoBox w={14} d={14} h={10} top="#dceaf8" left="#1e3a5f" right="#2c5080" y={-h} />
            </g>
          );
        };
        return (
          <g>
            <IsoBox w={56} d={36} h={14} top="#d0d8e0" left="#6a7480" right="#8890a0" />
            <Twin x={-14} y={-4} />
            <Twin x={16} y={4} />
            {/* skybridge */}
            <IsoBox w={22} d={10} h={6} top="#a8c4e0" left="#2a5080" right="#3d6aa8" y={-58} />
          </g>
        );
      }

      // 5) Stepped mega tower — nested setbacks from the ground
      {
        const tiers: { w: number; d: number; h: number }[] = [
          { w: 58, d: 42, h: 28 },
          { w: 46, d: 34, h: 52 },
          { w: 34, d: 26, h: 78 },
          { w: 22, d: 18, h: 108 },
        ];
        return (
          <g>
            {tiers.map((t, i) => {
              const { hw, hd } = isoHalf(t.w, t.d);
              const prev = i === 0 ? 0 : tiers[i - 1].h;
              return (
                <g key={i}>
                  <IsoBox
                    w={t.w}
                    d={t.d}
                    h={t.h}
                    top={['#e8f0f8', '#d0e4f8', '#b8d8f8', '#a0c8f0'][i]}
                    left={['#3a5a80', '#2f4f78', '#284870', '#204060'][i]}
                    right={['#4a7ab0', '#3f6fa8', '#3868a0', '#306098'][i]}
                  />
                  <FaceWindows
                    side="left"
                    hw={hw}
                    hd={hd}
                    night={night}
                    rows={Math.max(2, Math.floor((t.h - prev) / 9))}
                    cols={Math.max(2, 5 - i)}
                    v0={prev + 4}
                    v1={t.h - 4}
                    lit={lit}
                  />
                  <FaceWindows
                    side="right"
                    hw={hw}
                    hd={hd}
                    night={night}
                    rows={Math.max(2, Math.floor((t.h - prev) / 9))}
                    cols={Math.max(2, 4 - i)}
                    v0={prev + 4}
                    v1={t.h - 4}
                    lit={lit}
                  />
                </g>
              );
            })}
            <rect x={-0.8} y={-122} width={1.6} height={16} fill="#95a5a6" />
            <circle cx={0} cy={-122} r={2.2} fill={night ? '#ff6b6b' : '#e74c3c'} />
          </g>
        );
      }
    }
    case 'PARK':
      return (
        <g>
          <ellipse cx={0} cy={0} rx={16} ry={8} fill="#58d68d" />
          <rect x={-2} y={-10} width={4} height={8} fill="#7c4a1e" />
          <circle cx={0} cy={-14} r={7} fill="#2ecc71" />
        </g>
      );
    default:
      return <rect x={-6} y={-6} width={12} height={6} fill="#bdc3c7" />;
  }
}

// Rubble sprite shown after collapse.
export function Rubble() {
  return (
    <g opacity={0.95}>
      <polygon points="-14,1 0,5 14,1 0,-2" fill="#5c5348" />
      <polygon points="-10,0 -2,-1 4,2 -6,3" fill="#3d3830" opacity={0.55} />
      <rect x={-9} y={-7} width={7} height={5} fill="#8a8174" transform="rotate(16)" />
      <rect x={2} y={-5} width={6} height={4} fill="#6b6358" transform="rotate(-22)" />
      <rect x={-3} y={-4} width={4} height={3} fill="#9a9184" transform="rotate(8)" />
      <circle cx={-4} cy={-1} r={1.8} fill="#4a453e" />
      <circle cx={5} cy={0} r={1.4} fill="#5a544c" />
      <path d="M -8 2 L -3 0 L 2 3 L 8 1" stroke="#2a2520" strokeWidth={0.9} fill="none" />
    </g>
  );
}
