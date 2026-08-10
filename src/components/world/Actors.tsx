import React from 'react';
import type { Vehicle, Critter, Npc } from '../../types/world';
import { gridToScreen } from '../../utils/iso';

export function CritterView({ c }: { c: Critter }) {
  const p = gridToScreen(c.x, c.y);
  if (c.kind === 'whale') {
    return (
      <g transform={`translate(${p.x}, ${p.y})`}>
        <ellipse cx={0} cy={-2} rx={12} ry={4.5} fill={c.color} />
        <ellipse cx={0} cy={-3} rx={11} ry={3} fill="#6c8fc0" opacity={0.6} />
        <polygon points="11,-2 17,-6 16,0" fill={c.color} />
        <path d="M -4 -6 q -1 -5 1 -7" stroke="#cfe6ff" strokeWidth={1.4} fill="none" opacity={0.8} />
        <path d="M -6 -6 q -2 -4 -0.5 -6.5" stroke="#cfe6ff" strokeWidth={1.2} fill="none" opacity={0.6} />
      </g>
    );
  }
  return (
    <g transform={`translate(${p.x}, ${p.y})`}>
      <ellipse cx={0} cy={-1} rx={4} ry={2} fill={c.color} />
      <polygon points="3.5,-1 6.5,-3 6,1" fill={c.color} />
      <circle cx={-2} cy={-1.4} r={0.5} fill="#0f172a" />
    </g>
  );
}

/** Snap car facing to the four isometric road axes (not free 360° top-down). */
function isoCarFacing(x: number, y: number, tx: number, ty: number): {
  angle: number;
  flip: boolean;
} {
  const gdx = tx - x;
  const gdy = ty - y;
  // Dominant grid axis — matches street lines
  if (Math.abs(gdx) >= Math.abs(gdy)) {
    // ±X on grid → screen NE / SW (≈ ±26.6°)
    return gdx >= 0 ? { angle: 26.565, flip: false } : { angle: 26.565, flip: true };
  }
  // ±Y on grid → screen SE / NW
  return gdy >= 0 ? { angle: -26.565, flip: true } : { angle: -26.565, flip: false };
}

export function VehicleView({ v }: { v: Vehicle }) {
  const p = gridToScreen(v.x, v.y);
  if (v.kind === 'boat') {
    return (
      <g transform={`translate(${p.x}, ${p.y})`}>
        <polygon points="-8,0 8,0 5,4 -5,4" fill="#8b5a2b" />
        <rect x={-1} y={-8} width={2} height={8} fill="#7f8c8d" />
        <polygon points="1,-8 8,-3 1,-3" fill="#ecf0f1" />
      </g>
    );
  }
  const faceX = v.wx ?? v.tx;
  const faceY = v.wy ?? v.ty;
  const { angle, flip } = isoCarFacing(v.x, v.y, faceX, faceY);
  // Iso 3/4 car — long axis along the road diamond, not a flat top-down sticker
  return (
    <g transform={`translate(${p.x}, ${p.y}) rotate(${angle}) scale(${flip ? -1.25 : 1.25}, 1.25)`}>
      <ellipse cx={0} cy={2.5} rx={7} ry={2.4} fill="#00000028" />
      {/* body as iso slab */}
      <polygon points="-7,1 7,1 5.5,-2.5 -5.5,-2.5" fill={v.color} />
      <polygon points="-5.5,-2.5 5.5,-2.5 5.5,-5.5 -5.5,-5.5" fill={v.color} />
      <polygon points="5.5,-2.5 7,1 7,-2 5.5,-5.5" fill="#00000033" />
      {/* cabin */}
      <polygon points="-2.5,-5.5 3.5,-5.5 2.5,-8.5 -1.5,-8.5" fill="#e2e8f0" />
      <polygon points="-1.5,-8.5 2.5,-8.5 2.5,-5.5 -1.5,-5.5" fill="#94a3b8" opacity={0.45} />
      {/* headlight / nose */}
      <rect x={5.2} y={-4.2} width={1.6} height={1.4} rx={0.3} fill="#fde68a" opacity={0.95} />
      {/* wheels */}
      <ellipse cx={-3.5} cy={1.2} rx={1.6} ry={0.9} fill="#1e293b" />
      <ellipse cx={3.2} cy={1.2} rx={1.6} ry={0.9} fill="#1e293b" />
    </g>
  );
}

/** Sidewalk figures — plaza crowds + curb walkers. */
export function PedestrianView({ n }: { n: Npc }) {
  const p = gridToScreen(n.x, n.y);
  const scale = n.kind === 'visitor' ? 1.15 : 1.1;
  return (
    <g transform={`translate(${p.x}, ${p.y}) scale(${scale})`}>
      <ellipse cx={0} cy={1.6} rx={2.2} ry={1} fill="#00000028" />
      <circle cx={0} cy={-5.2} r={1.6} fill="#f5d0a9" />
      <rect x={-1.4} y={-3.8} width={2.8} height={4.2} rx={1} fill={n.color} />
      {/* legs */}
      <line x1={-0.7} y1={0.4} x2={-0.7} y2={2.2} stroke="#1e293b" strokeWidth={0.9} strokeLinecap="round" />
      <line x1={0.7} y1={0.4} x2={0.7} y2={2.2} stroke="#1e293b" strokeWidth={0.9} strokeLinecap="round" />
    </g>
  );
}
