import React from 'react';
import { motion } from 'framer-motion';
import type { WorldObject } from '../../types/world';
import { gridToScreen } from '../../utils/iso';
import { shortWallet } from '../../utils/format';
import { Sprite, Rubble } from './Sprites';

interface Props {
  obj: WorldObject;
  night: boolean;
  worldEra: number;
  selected?: boolean;
  onSelect?: (obj: WorldObject) => void;
  mine?: boolean;
  dimmed?: boolean;
  /** True while an earthquake overlay is active — amplifies tremor. */
  seismic?: boolean;
}

function hashSeed(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function needsCrane(obj: WorldObject): boolean {
  return (
    (obj.tiles ?? 1) >= 2 ||
    obj.kind === 'LANDMARK' ||
    obj.kind === 'TOWER' ||
    obj.kind === 'STADIUM' ||
    obj.kind === 'FACTORY' ||
    obj.kind === 'SHOP' ||
    obj.kind === 'RESTAURANT' ||
    (obj.purchaseAmount ?? 0) >= 250
  );
}

/** Site scaffolding + optional tower crane for bigger buys. */
function ConstructionSite({ tall, night }: { tall: boolean; night: boolean }) {
  const h = tall ? 42 : 26;
  return (
    <g>
      {/* yellow safety pad */}
      <ellipse cx={0} cy={2} rx={16} ry={7} fill="#facc15" opacity={night ? 0.35 : 0.45} />
      <ellipse
        cx={0}
        cy={2}
        rx={16}
        ry={7}
        fill="none"
        stroke="#ca8a04"
        strokeWidth={1.2}
        strokeDasharray="3 2"
        opacity={0.8}
      />
      {/* scaffold uprights */}
      <rect x={-12} y={-h} width={2.2} height={h} fill="#94a3b8" opacity={0.9} />
      <rect x={10} y={-h} width={2.2} height={h} fill="#64748b" opacity={0.9} />
      {/* cross braces */}
      {[0.25, 0.5, 0.75].map((t) => {
        const y = -h * t;
        return (
          <g key={t}>
            <line x1={-10} y1={y} x2={12} y2={y} stroke="#cbd5e1" strokeWidth={1.2} />
            <line
              x1={-10}
              y1={y + 3}
              x2={12}
              y2={y - 2}
              stroke="#94a3b8"
              strokeWidth={0.9}
              opacity={0.7}
            />
          </g>
        );
      })}
      {/* tarps */}
      <rect
        x={-10}
        y={-h * 0.55}
        width={8}
        height={h * 0.35}
        fill="#38bdf8"
        opacity={0.35}
      />
      {tall && (
        <g>
          {/* crane mast */}
          <rect x={14} y={-h - 18} width={2.4} height={h + 20} fill="#f59e0b" />
          <rect x={14} y={-h - 20} width={28} height={2.4} fill="#fbbf24" />
          <line
            x1={40}
            y1={-h - 18}
            x2={6}
            y2={-h * 0.4}
            stroke="#e2e8f0"
            strokeWidth={0.9}
            strokeDasharray="2 1.5"
          />
          {/* hook block */}
          <motion.g
            animate={{ y: [0, 6, 0] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
          >
            <rect x={4} y={-h * 0.4 - 4} width={5} height={4} rx={0.6} fill="#475569" />
          </motion.g>
          {/* cab */}
          <rect x={12} y={-h - 8} width={7} height={5} rx={0.8} fill="#fde68a" />
        </g>
      )}
    </g>
  );
}

export function WorldObjectView({
  obj,
  night,
  worldEra,
  selected,
  onSelect,
  mine,
  dimmed,
  seismic,
}: Props) {
  // Manors sit centered across their two tiles.
  const p = gridToScreen(
    obj.pos.x + (obj.span?.x ?? 0) * 0.5,
    obj.pos.y + (obj.span?.y ?? 0) * 0.5,
  );
  const seed = hashSeed(obj.id);
  const lean = seed % 2 === 0 ? 1 : -1;
  const crane = needsCrane(obj);

  if (obj.kind === 'ROAD') return null; // handled by terrain overlay

  const isConstructing = obj.stage === 'incoming' || obj.stage === 'constructing';
  const isRubble = obj.stage === 'rubble';
  const isCollapsing = obj.stage === 'collapsing';
  const isWarning = obj.stage === 'warning';
  const isDamaged = obj.stage === 'damaged';

  const shadowW = 11 + obj.height * 3.5;
  const amp = seismic ? 1.65 : 1;
  // Collapse always kicks up a dust plume; warning dust for sells / quakes.
  const dustN = isCollapsing ? 14 : isWarning ? (seismic ? 8 : 5) : 0;

  return (
    <motion.g
      animate={{ opacity: dimmed ? 0.28 : 1 }}
      transition={{ duration: 0.3 }}
      style={{ transform: `translate(${p.x}px, ${p.y}px)`, cursor: 'pointer' }}
      initial={false}
      onClick={(e) => {
        e.stopPropagation();
        onSelect?.(obj);
      }}
    >
      {/* "my territory" glow ring */}
      {mine && !selected && (
        <motion.ellipse
          cx={0}
          cy={2}
          rx={shadowW + 5}
          ry={(shadowW + 5) * 0.42}
          fill="#34d39933"
          stroke="#34d399"
          strokeWidth={2}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.55, 1, 0.55] }}
          transition={{ duration: 1.8, repeat: Infinity }}
        />
      )}

      {/* selection ring + deed label (wallet that purchased this plot) */}
      {selected && (
        <>
          <motion.ellipse
            cx={0}
            cy={2}
            rx={shadowW + 6}
            ry={(shadowW + 6) * 0.42}
            fill="none"
            stroke="#38bdf8"
            strokeWidth={2}
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: [0.5, 1, 0.5], scale: 1 }}
            transition={{ opacity: { duration: 1.4, repeat: Infinity } }}
          />
          {obj.bornBy && obj.bornBy !== 'genesis' && (
            <g transform={`translate(0, ${-28 - obj.height * 10})`}>
              <rect
                x={-28}
                y={-10}
                width={56}
                height={14}
                rx={7}
                fill="#0f172a"
                opacity={0.88}
              />
              <text
                x={0}
                y={1}
                textAnchor="middle"
                fontSize={8}
                fontWeight={700}
                fill="#e2e8f0"
                style={{ fontFamily: 'ui-monospace, monospace' }}
              >
                {obj.bornBy === 'world' ? 'WORLD' : shortWallet(obj.bornBy)}
              </text>
            </g>
          )}
        </>
      )}

      {/* ground contact shadow — keep filters off short props; SVG feDropShadow
          inside a scaled world transform can ghost-draw trees into the sky */}
      {!isConstructing && !isRubble && (
        <ellipse cx={0} cy={2} rx={shadowW} ry={shadowW * 0.42} fill="url(#groundShadow)" />
      )}

      {/* scaffolding / crane while the build is theater */}
      {isConstructing && (
        <motion.g
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          <ConstructionSite tall={crane} night={night} />
        </motion.g>
      )}

      {isRubble ? (
        <motion.g initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          <Rubble />
        </motion.g>
      ) : (
        <motion.g
          animate={
            isCollapsing
              ? {
                  x: [0, lean * 3, lean * -2, lean * 10],
                  y: [0, -3, 6, 34],
                  rotate: [0, lean * -4, lean * 8, lean * 26],
                  scaleX: [1, 1.05, 1.15, 1.35],
                  scaleY: [1, 1.08, 0.75, 0.35],
                  opacity: [1, 1, 0.85, 0],
                }
              : isWarning
                ? {
                    x: [0, -3.5, 4, -5, 4.5, -3, 2.5, 0].map((v) => v * amp),
                    y: [0, 1.2, -1.5, 2, -1, 1.5, -0.5, 0].map((v) => v * amp),
                    rotate: [0, -2.5, 3, -3.5, 2.5, -1.5, 1, 0].map((v) => v * amp),
                  }
                : isConstructing
                  ? { y: 0, scaleY: [0.05, 1], opacity: [0.25, 1] }
                  : { x: 0, y: 0, rotate: 0, scaleX: 1, scaleY: 1, opacity: 1 }
          }
          transition={
            isWarning
              ? { duration: seismic ? 0.14 : 0.22, repeat: Infinity, ease: 'linear' }
              : isCollapsing
                ? { duration: 0.95, ease: [0.55, 0.05, 0.9, 0.35], times: [0, 0.15, 0.45, 1] }
                : isConstructing
                  ? { duration: crane ? 1.85 : 1.1, ease: 'backOut' }
                  : { duration: 0.3 }
          }
          style={{ transformOrigin: 'center bottom' }}
        >
          <g
            opacity={isDamaged ? 0.85 : isConstructing ? 0.92 : 1}
            filter={
              obj.stage === 'built' &&
              obj.kind !== 'TREE' &&
              obj.kind !== 'FLOWER' &&
              obj.kind !== 'DECORATION' &&
              obj.kind !== 'FARM'
                ? 'url(#softShadow)'
                : undefined
            }
          >
            <Sprite
              kind={obj.kind}
              variant={obj.variant}
              night={night}
              tiles={obj.tiles === 2 ? 2 : 1}
              // Trees/towers/shops can mature with the world age; houses keep
              // the silhouette they were built with (no morphing into towers).
              era={
                obj.kind === 'TREE' || obj.kind === 'TOWER' || obj.kind === 'SHOP'
                  ? Math.max(obj.era, worldEra)
                  : obj.era
              }
            />
          </g>
          {/* smoke from factory */}
          {obj.kind === 'FACTORY' && obj.stage === 'built' && (
            <motion.circle
              cx={9}
              cy={-48}
              r={4}
              fill="#bdc3c7"
              animate={{ cy: [-48, -66], opacity: [0.7, 0], r: [4, 8] }}
              transition={{ duration: 2.4, repeat: Infinity }}
            />
          )}
          {/* damage cracks / fire */}
          {isDamaged && (
            <>
              <path d="M -6 -14 L -2 -6 L -6 0" stroke="#2d3436" strokeWidth={1} fill="none" />
              <motion.text
                x={4}
                y={-18}
                fontSize={10}
                animate={{ opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 0.8, repeat: Infinity }}
              >
                🔥
              </motion.text>
            </>
          )}
          {isWarning && (
            <motion.text
              x={0}
              y={-40}
              textAnchor="middle"
              fontSize={12}
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 0.4, repeat: Infinity }}
            >
              ⚠️
            </motion.text>
          )}
        </motion.g>
      )}

      {/* rising dust / debris during warning & collapse */}
      {dustN > 0 &&
        Array.from({ length: dustN }).map((_, i) => {
          const ox = ((seed + i * 17) % 25) - 12;
          const delay = (i * 0.05 + (seed % 5) * 0.02) % 0.35;
          const brown = i % 3 === 0 ? '#c4a574' : i % 3 === 1 ? '#8a7355' : '#6b5344';
          return (
            <motion.circle
              key={`dust-${i}`}
              cx={ox}
              cy={-2}
              r={1.4 + (i % 4) * 0.7}
              fill={brown}
              initial={{ opacity: 0, cy: -2 }}
              animate={{
                opacity: [0, 0.85, 0],
                cy: [-2, -22 - (i % 5) * 7, -36 - (i % 4) * 10],
                cx: [ox, ox + lean * (5 + i), ox + lean * (10 + i * 2)],
                r: [1.4, 3.2, 4.5],
              }}
              transition={{
                duration: isCollapsing ? 1.1 : 0.75,
                delay,
                repeat: isWarning ? Infinity : 0,
                ease: 'easeOut',
              }}
            />
          );
        })}

      {/* ground dust burst on collapse — wide low plume */}
      {isCollapsing &&
        Array.from({ length: 6 }).map((_, i) => {
          const ox = ((seed + i * 11) % 30) - 15;
          return (
            <motion.ellipse
              key={`plume-${i}`}
              cx={ox}
              cy={3}
              rx={4}
              ry={2}
              fill="#a89070"
              initial={{ opacity: 0, scale: 0.4 }}
              animate={{
                opacity: [0, 0.7, 0],
                scale: [0.4, 2.2, 3],
                cx: [ox, ox + lean * (8 + i * 2)],
              }}
              transition={{ duration: 1.05, delay: 0.35 + i * 0.06, ease: 'easeOut' }}
            />
          );
        })}
    </motion.g>
  );
}
