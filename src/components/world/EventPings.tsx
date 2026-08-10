import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { EventPing } from '../../types/world';
import { gridToScreen } from '../../utils/iso';
import { formatCurrency } from '../../utils/format';

// Transient markers that make each trade legible for spectators:
// fat sky beam → impact rings → coin → rising "$427 → 🌳" ghost.
export function EventPings({ pings }: { pings: EventPing[] }) {
  return (
    <AnimatePresence>
      {pings.map((p) => {
        const s = gridToScreen(p.pos.x, p.pos.y);
        const buy = p.kind === 'BUY';
        const accent = buy ? '#10b981' : '#ef4444';
        const soft = buy ? '#6ee7b7' : '#fca5a5';
        const big = p.amount >= 250;
        return (
          <g key={p.id} transform={`translate(${s.x}, ${s.y})`}>
            {/* Outer glow column — readable at a glance */}
            <motion.rect
              x={big ? -16 : -12}
              width={big ? 32 : 24}
              rx={12}
              fill={accent}
              initial={{ y: -280, height: 280, opacity: 0 }}
              animate={{ y: -8, height: 16, opacity: [0, 0.55, 0.15, 0] }}
              transition={{ duration: 0.85, ease: 'easeIn', times: [0, 0.35, 0.7, 1] }}
              style={{ filter: 'blur(1.5px)' }}
            />
            {/* Crisp core beam */}
            <motion.rect
              x={big ? -6 : -4}
              width={big ? 12 : 8}
              rx={4}
              fill="#ffffff"
              initial={{ y: -260, height: 260, opacity: 0 }}
              animate={{ y: -6, height: 10, opacity: [0, 0.95, 0.4, 0] }}
              transition={{ duration: 0.75, ease: 'easeIn' }}
            />
            {/* Ground flash */}
            <motion.ellipse
              cx={0}
              cy={2}
              rx={big ? 22 : 16}
              ry={big ? 10 : 7}
              fill={accent}
              initial={{ scale: 0.2, opacity: 0 }}
              animate={{ scale: [0.2, 1.4, 1], opacity: [0, 0.55, 0] }}
              transition={{ duration: 0.7, delay: 0.4 }}
            />
            {/* Impact ring 1 */}
            <motion.ellipse
              cx={0}
              cy={2}
              rx={12}
              ry={5.5}
              fill="none"
              stroke={accent}
              strokeWidth={3}
              initial={{ scale: 0.2, opacity: 0 }}
              animate={{ scale: [0.2, 2.4], opacity: [0, 1, 0] }}
              transition={{ duration: 1.05, delay: 0.4 }}
            />
            {/* Impact ring 2 */}
            <motion.ellipse
              cx={0}
              cy={2}
              rx={12}
              ry={5.5}
              fill="none"
              stroke={soft}
              strokeWidth={2}
              initial={{ scale: 0.2, opacity: 0 }}
              animate={{ scale: [0.2, 3.2], opacity: [0, 0.8, 0] }}
              transition={{ duration: 1.25, delay: 0.5 }}
            />
            {/* Coin */}
            <motion.g
              initial={{ y: -140, opacity: 0, scale: 0.6 }}
              animate={{ y: -16, opacity: [0, 1, 1, 0], scale: [0.6, 1.25, 1.1, 0.9] }}
              transition={{ duration: 1, ease: 'easeIn', times: [0, 0.35, 0.7, 1] }}
            >
              <circle
                r={big ? 10 : 8}
                fill={buy ? '#fde047' : '#fecaca'}
                stroke={accent}
                strokeWidth={2.5}
              />
              <circle
                r={big ? 7 : 5.5}
                fill="none"
                stroke={buy ? '#ca8a04' : '#b91c1c'}
                strokeWidth={1}
                opacity={0.5}
              />
              <text
                textAnchor="middle"
                dy={3.5}
                fontSize={big ? 11 : 9}
                fontWeight="bold"
                fill={accent}
              >
                {buy ? '+' : '−'}
              </text>
            </motion.g>
            {/* Rising label — high contrast for spectators */}
            <motion.g
              initial={{ y: -18, opacity: 0, scale: 0.65 }}
              animate={{ y: -56, opacity: [0, 1, 1, 0], scale: [0.65, 1.12, 1, 0.95] }}
              transition={{ duration: 2.4, delay: 0.45, times: [0, 0.12, 0.72, 1] }}
            >
              <rect
                x={big ? -42 : -36}
                y={-13}
                width={big ? 84 : 72}
                height={22}
                rx={11}
                fill="#0f172af5"
                stroke={accent}
                strokeWidth={2}
              />
              <text
                x={big ? -34 : -28}
                y={3}
                fontSize={big ? 11 : 10}
                fontWeight="bold"
                fill={accent}
              >
                {formatCurrency(p.amount)}
              </text>
              <text x={big ? 8 : 6} y={3} fontSize={big ? 12 : 10} fill="#f8fafc">
                → {p.emoji}
              </text>
            </motion.g>
          </g>
        );
      })}
    </AnimatePresence>
  );
}
