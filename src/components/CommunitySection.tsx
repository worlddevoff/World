import React from 'react'
import { motion } from 'framer-motion'
import { SectionHeader } from './SectionHeader'
import { AnimatedNumber } from './AnimatedNumber'
import { useExperiment } from '../contexts/ExperimentContext'
import { YOUR_CONTRIBUTION } from '../data/seed'

interface GlobalStat {
  value: number
  label: string
}

export function CommunitySection() {
  const { contributors, memory, knowledge, traits, hoursAlive } = useExperiment()

  const stats: GlobalStat[] = [
    { value: contributors, label: 'CONTRIBUTORS' },
    { value: memory, label: 'MEMORIES CREATED' },
    { value: knowledge, label: 'KNOWLEDGE POINTS' },
    { value: traits.length, label: 'TRAITS DISCOVERED' },
    { value: hoursAlive, label: 'HOURS ALIVE' },
  ]

  return (
    <section className="relative w-full max-w-4xl mx-auto px-4 py-20">
      <SectionHeader
        eyebrow="Collective"
        title="YOU ARE PART OF THE EXPERIMENT"
        description="Every wallet is a participant. What it becomes is a decision the whole community makes together."
      />

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-8">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.06 }}
            className="exp-glass border border-white/5 rounded-xl p-4 text-center"
          >
            <div className="font-display font-bold text-xl sm:text-2xl text-neural tabular-nums">
              <AnimatedNumber value={s.value} />
            </div>
            <div className="font-mono text-[9px] tracking-[0.15em] text-slate-500 uppercase mt-1">
              {s.label}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Your contribution */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="exp-glass border border-neural/20 rounded-2xl p-6 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-40 h-40 bg-neural/5 blur-3xl rounded-full" />
        <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
          <div>
            <div className="font-mono text-[10px] tracking-[0.3em] text-neural uppercase">
              Your contribution
            </div>
            <div className="font-mono text-sm text-slate-300 mt-1">
              Wallet: <span className="text-slate-100">{YOUR_CONTRIBUTION.wallet}</span>
            </div>
          </div>
          <span className="font-mono text-[10px] px-2.5 py-1 rounded-full border border-neural/30 text-neural uppercase tracking-widest">
            participant
          </span>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <div className="font-display font-bold text-2xl text-slate-100">
              {YOUR_CONTRIBUTION.memories}
            </div>
            <div className="font-mono text-[9px] text-slate-500 uppercase tracking-wider mt-1">
              Memories created
            </div>
          </div>
          <div>
            <div className="font-display font-bold text-2xl text-slate-100">
              {YOUR_CONTRIBUTION.knowledge.toLocaleString()}
            </div>
            <div className="font-mono text-[9px] text-slate-500 uppercase tracking-wider mt-1">
              Knowledge
            </div>
          </div>
          <div>
            <div className="font-display font-bold text-2xl text-slate-100">
              {YOUR_CONTRIBUTION.traits}
            </div>
            <div className="font-mono text-[9px] text-slate-500 uppercase tracking-wider mt-1">
              Traits discovered
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  )
}
