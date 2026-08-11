import React from 'react'
import { motion } from 'framer-motion'
import { useExperiment } from '../contexts/ExperimentContext'
import { AnimatedNumber } from './AnimatedNumber'
import { PERSONALITY_COLOR } from '../data/seed'

interface StatProps {
  label: string
  children: React.ReactNode
  accent?: string
  delay?: number
}

function StatPanel({ label, children, accent = '#2dd4bf', delay = 0 }: StatProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay }}
      className="exp-glass border border-white/5 rounded-lg px-4 py-3 min-w-[150px]"
    >
      <div className="flex items-center gap-1.5 mb-1">
        <span
          className="w-1 h-1 rounded-full animate-pulse"
          style={{ background: accent, boxShadow: `0 0 6px ${accent}` }}
        />
        <span className="font-mono text-[9px] tracking-[0.25em] text-slate-500 uppercase">
          {label}
        </span>
      </div>
      <div className="font-display font-semibold text-lg text-slate-100 tabular-nums">
        {children}
      </div>
    </motion.div>
  )
}

export function StatusHUD() {
  const {
    consciousness,
    memory,
    knowledge,
    evolutionLevel,
    personality,
    status,
  } = useExperiment()
  const color = PERSONALITY_COLOR[personality]

  const statusColor =
    status === 'UNSTABLE' ? '#f43f5e' : status === 'EVOLVING' ? '#a78bfa' : '#34d399'

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full">
      <StatPanel label="Consciousness" accent="#5eead4" delay={0}>
        <AnimatedNumber value={consciousness} decimals={0} />%
      </StatPanel>
      <StatPanel label="Memory" accent="#34d399" delay={0.05}>
        <AnimatedNumber value={memory} />
      </StatPanel>
      <StatPanel label="Knowledge" accent="#38bdf8" delay={0.1}>
        <AnimatedNumber value={knowledge} />
      </StatPanel>
      <StatPanel label="Personality" accent={color} delay={0.15}>
        <span style={{ color }} className={personality === 'UNKNOWN' ? '' : 'exp-text-glitch'}>
          {personality === 'UNKNOWN' ? '????' : personality}
        </span>
      </StatPanel>
      <StatPanel label="Evolution Level" accent="#fbbf24" delay={0.2}>
        <AnimatedNumber value={evolutionLevel} />
      </StatPanel>
      <StatPanel label="Experiment Status" accent={statusColor} delay={0.25}>
        <span style={{ color: statusColor }}>{status}</span>
      </StatPanel>
    </div>
  )
}
