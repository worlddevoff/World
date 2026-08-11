import React from 'react'
import { motion } from 'framer-motion'
import { Organism } from './Organism/Organism'
import { ThoughtFeed } from './ThoughtFeed'
import { EnvironmentStage } from './EnvironmentStage'
import { useExperiment } from '../contexts/ExperimentContext'
import { PERSONALITY_COLOR } from '../data/seed'
import { ABILITY_BY_ID, progressTowardAbility } from '../data/abilities'
import { AnimatedNumber } from './AnimatedNumber'
import { growthForPercent } from '../engine/evolutionEngine'
import { formatUsd } from '../utils/experimentFormat'
import { BRAND_TAGLINE } from '../config/brand'

function EvolutionRing({ percent, color }: { percent: number; color: string }) {
  const r = 54
  const c = 2 * Math.PI * r
  const offset = c * (1 - Math.max(0, Math.min(1, percent / 100)))

  return (
    <div className="relative w-36 h-36 mx-auto">
      <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="6"
        />
        <motion.circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={c}
          animate={{ strokeDashoffset: offset }}
          transition={{ type: 'spring', stiffness: 60, damping: 18 }}
          style={{ filter: `drop-shadow(0 0 6px ${color})` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-[9px] tracking-[0.35em] text-slate-500 uppercase">
          Evolution
        </span>
        <span className="font-display font-bold text-2xl text-slate-50 tabular-nums">
          <AnimatedNumber value={percent} decimals={0} />%
        </span>
      </div>
    </div>
  )
}

export function HeroSection() {
  const { evolutionPercent, nextAbility, personality, growth, abilities } =
    useExperiment()
  const color = PERSONALITY_COLOR[personality]
  const next = nextAbility
  const nextMeta = next ? ABILITY_BY_ID[next.id] : null
  const toward = nextMeta
    ? progressTowardAbility(evolutionPercent, nextMeta, abilities)
    : 1
  const needUsd = nextMeta
    ? Math.max(0, growthForPercent(nextMeta.minEvolution) - growth)
    : 0

  return (
    <EnvironmentStage>
      <section className="relative min-h-screen w-full flex flex-col items-center justify-center px-4 pt-24 pb-16">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,transparent,#040507_82%)] pointer-events-none" />

        <div className="relative w-full max-w-5xl mx-auto flex flex-col items-center">
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="font-display font-bold text-4xl sm:text-6xl lg:text-7xl tracking-[0.1em] text-slate-50 text-center exp-flicker"
          >
            THE EXPERIMENT
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="font-mono text-sm sm:text-base text-slate-300 italic text-center mt-4 mb-2 max-w-lg tracking-wide"
          >
            {BRAND_TAGLINE}
          </motion.p>

          <div className="my-2 sm:my-0 w-full flex justify-center scale-110 sm:scale-125 origin-center">
            <Organism />
          </div>

          <ThoughtFeed />

          <div className="mt-8 flex flex-col sm:flex-row items-center gap-8 sm:gap-14">
            <EvolutionRing percent={evolutionPercent} color={color} />

            <motion.div
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              className="exp-glass border border-white/5 rounded-xl px-5 py-4 min-w-[240px] w-full max-w-[280px] text-center sm:text-left"
            >
              <div className="font-mono text-[9px] tracking-[0.35em] text-slate-500 uppercase mb-2">
                Next unlock
              </div>
              {nextMeta ? (
                <>
                  <div
                    className="font-display font-bold text-xl tracking-wide"
                    style={{ color }}
                  >
                    {nextMeta.label}
                  </div>
                  <p className="font-mono text-[11px] text-slate-500 mt-1">
                    {nextMeta.description}
                  </p>

                  <div className="mt-4 flex items-baseline justify-between gap-2 font-mono text-[10px] tracking-widest uppercase">
                    <span style={{ color }}>
                      <AnimatedNumber value={evolutionPercent} decimals={0} />%
                    </span>
                    <span className="text-slate-600">→</span>
                    <span className="text-slate-400">{nextMeta.minEvolution}%</span>
                  </div>
                  <div className="mt-2 h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: color, boxShadow: `0 0 10px ${color}` }}
                      animate={{ width: `${toward * 100}%` }}
                      transition={{ type: 'spring', stiffness: 80, damping: 18 }}
                    />
                  </div>
                  <div className="mt-2 font-mono text-[10px] text-slate-500">
                    {evolutionPercent >= nextMeta.minEvolution
                      ? 'Threshold met — awaiting conditions'
                      : `${Math.max(0, Math.ceil(nextMeta.minEvolution - evolutionPercent))}% away · ~${formatUsd(Math.ceil(needUsd))} more teaching`}
                  </div>
                </>
              ) : (
                <div className="font-display text-lg text-signal-psy exp-text-glitch">???</div>
              )}
            </motion.div>
          </div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-10 font-display font-semibold text-sm sm:text-base tracking-[0.25em] text-slate-400 uppercase text-center"
          >
            What will it become?
          </motion.p>
        </div>
      </section>
    </EnvironmentStage>
  )
}
