import React from 'react'
import { motion } from 'framer-motion'
import { useExperiment } from '../contexts/ExperimentContext'
import { PERSONALITY_COLOR } from '../data/seed'
import type { AbilityId } from '../data/abilities'

/** Environment evolves with unlocked abilities — cinematic, not a dashboard. */
export function EnvironmentStage({ children }: { children: React.ReactNode }) {
  const { abilities, personality, evolutionPercent } = useExperiment()
  const color = PERSONALITY_COLOR[personality]
  const has = (id: AbilityId) => abilities.includes(id)

  return (
    <div className="relative w-full overflow-hidden">
      {/* Base void */}
      <div className="absolute inset-0 bg-void-950" />
      <div className="absolute inset-0 exp-grid-bg opacity-25 pointer-events-none" />
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-1000"
        style={{
          background: `radial-gradient(circle at 50% 42%, ${color}18, transparent 55%)`,
          opacity: 0.35 + evolutionPercent / 200,
        }}
      />

      {/* OBSERVE — sensors */}
      {has('observe') && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <motion.div
              key={`s${i}`}
              className="absolute w-1 h-1 rounded-full"
              style={{
                left: `${12 + i * 15}%`,
                top: `${20 + (i % 3) * 22}%`,
                background: color,
                boxShadow: `0 0 10px ${color}`,
              }}
              animate={{ opacity: [0.2, 0.9, 0.2], scale: [1, 1.6, 1] }}
              transition={{ duration: 3 + i * 0.4, repeat: Infinity, delay: i * 0.3 }}
            />
          ))}
        </div>
      )}

      {/* REMEMBER / THINK — pathways */}
      {(has('remember') || has('think')) && (
        <svg
          className="pointer-events-none absolute inset-0 w-full h-full opacity-40"
          preserveAspectRatio="none"
        >
          {Array.from({ length: 8 }).map((_, i) => (
            <motion.line
              key={`p${i}`}
              x1={`${10 + i * 11}%`}
              y1="15%"
              x2={`${20 + i * 9}%`}
              y2="85%"
              stroke={color}
              strokeWidth="0.5"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ opacity: [0.15, 0.45, 0.15] }}
              transition={{ duration: 4 + i * 0.2, repeat: Infinity }}
            />
          ))}
        </svg>
      )}

      {/* LEARN — knowledge fragments */}
      {has('learn') && (
        <div className="pointer-events-none absolute inset-0">
          {['SIGNAL', 'PATTERN', 'DELTA', 'TRACE', 'NODE'].map((word, i) => (
            <motion.span
              key={word}
              className="absolute font-mono text-[9px] tracking-[0.3em] text-slate-600"
              style={{ left: `${8 + i * 18}%`, top: `${70 + (i % 2) * 8}%` }}
              animate={{ y: [0, -12, 0], opacity: [0.2, 0.55, 0.2] }}
              transition={{ duration: 5 + i, repeat: Infinity, delay: i * 0.5 }}
            >
              {word}
            </motion.span>
          ))}
        </div>
      )}

      {/* SEARCH — ghost browser frames */}
      {has('search') && (
        <div className="pointer-events-none absolute top-24 right-6 hidden lg:block w-48 opacity-30">
          <div className="border border-neural/30 rounded-md bg-void-900/60 p-2">
            <div className="h-1.5 w-full rounded bg-white/10 mb-2" />
            <div className="space-y-1">
              <div className="h-1 w-3/4 rounded bg-neural/20" />
              <div className="h-1 w-1/2 rounded bg-white/10" />
            </div>
          </div>
        </div>
      )}

      {/* SOCIALIZE / SPEAK — feed shards */}
      {(has('speak') || has('socialize')) && (
        <div className="pointer-events-none absolute bottom-32 left-6 hidden lg:flex flex-col gap-2 opacity-35">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-40 h-8 rounded border border-white/10 bg-void-900/50"
              animate={{ x: [0, 4, 0], opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 3 + i, repeat: Infinity }}
            />
          ))}
        </div>
      )}

      {/* AUTONOMY — environment manipulation glow */}
      {has('autonomy') && (
        <motion.div
          className="pointer-events-none absolute inset-8 rounded-[40%] border border-signal-psy/20"
          animate={{ rotate: [0, 2, -2, 0], scale: [1, 1.01, 1] }}
          transition={{ duration: 8, repeat: Infinity }}
        />
      )}

      <div className="relative z-10">{children}</div>
    </div>
  )
}
