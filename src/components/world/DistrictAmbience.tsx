import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { tileDiamond, gridToScreen } from '../../utils/iso';
import { isWater, zoneAt } from '../../utils/worldState';

interface Props {
  revealed: string[];
  night: boolean;
}

/**
 * Per-district atmosphere so each area reads as its own place:
 *  - Downtown: cool plaza wash + dense lamp glow at night
 *  - Residential: warm soft porch light
 *  - Industrial: grimy haze + smokestack puffs
 *  - Waterfront: promenade neon / pier lights
 */
export function DistrictAmbience({ revealed, night }: Props) {
  const bits = useMemo(() => {
    const downtown: { x: number; y: number }[] = [];
    const residential: { x: number; y: number }[] = [];
    const neon: { x: number; y: number }[] = [];
    const haze: string[] = [];
    const stacks: { x: number; y: number }[] = [];
    const piers: { x: number; y: number }[] = [];

    for (const key of revealed) {
      const [x, y] = key.split(',').map(Number);
      if (isWater(x, y)) continue;
      const zone = zoneAt({ x, y });
      const h = Math.abs((x * 73856093) ^ (y * 19349663));

      if (zone === 'city') {
        if (h % 3 === 0) downtown.push({ x, y });
      } else if (zone === 'village') {
        if (h % 5 === 0) residential.push({ x, y });
      } else if (zone === 'entertainment') {
        neon.push({ x, y });
        const shore =
          isWater(x + 1, y) || isWater(x - 1, y) || isWater(x, y + 1) || isWater(x, y - 1);
        if (shore && h % 2 === 0) piers.push({ x, y });
      } else if (zone === 'industrial') {
        haze.push(key);
        if (h % 11 === 0) stacks.push({ x, y });
      }
    }
    return { downtown, residential, neon, haze, stacks, piers };
  }, [revealed]);

  const NEON = ['#ec4899', '#22d3ee', '#a855f7', '#f59e0b'];

  return (
    <g>
      {/* Downtown cool wash */}
      {bits.downtown.map(({ x, y }) => (
        <polygon
          key={`cbd-${x}-${y}`}
          points={tileDiamond(x, y)}
          fill="#64748b"
          opacity={night ? 0.1 : 0.07}
        />
      ))}

      {/* Residential warm night porch glow */}
      {night &&
        bits.residential.map(({ x, y }, i) => {
          const c = gridToScreen(x, y);
          return (
            <motion.circle
              key={`porch-${x}-${y}`}
              cx={c.x}
              cy={c.y - 4}
              r={14}
              fill="#fbbf24"
              style={{ mixBlendMode: 'screen' }}
              initial={{ opacity: 0.08 }}
              animate={{ opacity: [0.08, 0.22, 0.08] }}
              transition={{ duration: 3.2 + (i % 3) * 0.4, repeat: Infinity, delay: (i % 4) * 0.2 }}
            />
          );
        })}

      {/* Dense downtown night lamps */}
      {night &&
        bits.downtown.map(({ x, y }, i) => {
          const c = gridToScreen(x, y);
          return (
            <motion.circle
              key={`lampglow-${x}-${y}`}
              cx={c.x + 2}
              cy={c.y - 8}
              r={10}
              fill="#e0f2fe"
              style={{ mixBlendMode: 'screen' }}
              animate={{ opacity: [0.15, 0.38, 0.15] }}
              transition={{ duration: 2.1 + (i % 3) * 0.3, repeat: Infinity }}
            />
          );
        })}

      {/* Industrial haze */}
      {bits.haze.map((key) => {
        const [x, y] = key.split(',').map(Number);
        return (
          <polygon
            key={`haze-${key}`}
            points={tileDiamond(x, y)}
            fill="#6b7280"
            opacity={night ? 0.16 : 0.24}
          />
        );
      })}

      {/* Smokestack puffs */}
      {bits.stacks.map(({ x, y }, i) => {
        const c = gridToScreen(x, y);
        return (
          <motion.circle
            key={`stack-${x}-${y}`}
            cx={c.x + 4}
            cy={c.y - 18}
            r={3}
            fill="#94a3b8"
            animate={{ cy: [c.y - 18, c.y - 36], opacity: [0.55, 0], r: [3, 8] }}
            transition={{ duration: 2.8 + (i % 3) * 0.4, repeat: Infinity, delay: (i % 5) * 0.35 }}
          />
        );
      })}

      {/* Waterfront neon */}
      {night &&
        bits.neon.map(({ x, y }, i) => {
          const c = gridToScreen(x, y);
          const color = NEON[(x * 3 + y) % NEON.length];
          return (
            <motion.circle
              key={`neon-${x}-${y}`}
              cx={c.x}
              cy={c.y}
              r={22}
              fill={color}
              style={{ mixBlendMode: 'screen' }}
              initial={{ opacity: 0.12 }}
              animate={{ opacity: [0.12, 0.4, 0.12] }}
              transition={{ duration: 2.4 + (i % 4) * 0.5, repeat: Infinity, delay: (i % 5) * 0.3 }}
            />
          );
        })}

      {/* Promenade pier lights */}
      {night &&
        bits.piers.map(({ x, y }, i) => {
          const c = gridToScreen(x, y);
          return (
            <motion.circle
              key={`pier-${x}-${y}`}
              cx={c.x}
              cy={c.y - 2}
              r={7}
              fill="#fde68a"
              style={{ mixBlendMode: 'screen' }}
              animate={{ opacity: [0.25, 0.55, 0.25] }}
              transition={{ duration: 1.8 + (i % 2) * 0.3, repeat: Infinity }}
            />
          );
        })}
    </g>
  );
}
