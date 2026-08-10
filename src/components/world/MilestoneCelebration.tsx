import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { MilestoneEgg } from '../../types/world';

const COLORS = ['#fde047', '#f97316', '#22d3ee', '#a855f7', '#f472b6', '#4ade80', '#fff'];

/** Full-screen fireworks / confetti when a milestone unlocks. */
export function MilestoneCelebration({ egg }: { egg: MilestoneEgg | null }) {
  const sparks = useMemo(() => {
    if (!egg) return [];
    return Array.from({ length: 48 }, (_, i) => {
      const angle = (i / 48) * Math.PI * 2 + (i % 5) * 0.15;
      const dist = 80 + (i % 7) * 28 + (i % 3) * 12;
      return {
        id: i,
        x: Math.cos(angle) * dist,
        y: Math.sin(angle) * dist * 0.75 - 40,
        color: COLORS[i % COLORS.length],
        delay: (i % 12) * 0.04,
        size: 4 + (i % 4),
      };
    });
  }, [egg?.id, egg?.startedAt]);

  return (
    <AnimatePresence>
      {egg && (
        <motion.div
          key={egg.id + egg.startedAt}
          className="pointer-events-none absolute inset-0 z-30 flex items-start justify-center overflow-hidden pt-16"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
        >
          {/* Soft flash */}
          <motion.div
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.35, 0] }}
            transition={{ duration: 1.2, times: [0, 0.15, 1] }}
            style={{
              background:
                egg.kind === 'space'
                  ? 'radial-gradient(ellipse at 50% 30%, rgba(56,189,248,0.55), transparent 55%)'
                  : egg.kind === 'metropolis'
                    ? 'radial-gradient(ellipse at 50% 30%, rgba(251,191,36,0.45), transparent 55%)'
                    : 'radial-gradient(ellipse at 50% 30%, rgba(52,211,153,0.4), transparent 55%)',
            }}
          />

          {/* Burst sparks */}
          <div className="absolute left-1/2 top-[28%]">
            {sparks.map((s) => (
              <motion.span
                key={s.id}
                className="absolute rounded-full"
                style={{
                  width: s.size,
                  height: s.size,
                  background: s.color,
                  boxShadow: `0 0 6px ${s.color}`,
                }}
                initial={{ x: 0, y: 0, opacity: 0, scale: 0.4 }}
                animate={{
                  x: s.x,
                  y: [0, s.y, s.y + 40],
                  opacity: [0, 1, 0],
                  scale: [0.4, 1.2, 0.6],
                }}
                transition={{ duration: 1.6, delay: s.delay, ease: 'easeOut' }}
              />
            ))}
          </div>

          {/* Falling confetti columns */}
          {Array.from({ length: 18 }).map((_, i) => (
            <motion.span
              key={`c-${i}`}
              className="absolute rounded-sm"
              style={{
                left: `${6 + ((i * 17) % 88)}%`,
                top: '-4%',
                width: 5 + (i % 3),
                height: 8 + (i % 4) * 2,
                background: COLORS[i % COLORS.length],
                rotate: `${(i % 5) * 12}deg`,
              }}
              initial={{ y: 0, opacity: 0 }}
              animate={{ y: [0, 520], opacity: [0, 1, 1, 0], rotate: [0, 180 + i * 20] }}
              transition={{ duration: 2.2 + (i % 4) * 0.15, delay: 0.1 + (i % 8) * 0.08 }}
            />
          ))}

          {/* Banner */}
          <motion.div
            className="relative z-10 mt-2 rounded-2xl border border-white/20 bg-black/70 px-6 py-3 text-center shadow-2xl backdrop-blur-md"
            initial={{ y: -24, scale: 0.85, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: -16, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 20 }}
          >
            <div className="text-3xl">{egg.emoji}</div>
            <p className="mt-1 text-[10px] font-black uppercase tracking-[0.3em] text-emerald-300">
              Milestone
            </p>
            <h3 className="text-xl font-black text-white">{egg.title}</h3>
            <p className="mt-0.5 text-xs font-medium text-white/70">{egg.tagline}</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
