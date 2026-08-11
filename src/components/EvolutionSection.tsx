import React from 'react'
import { motion } from 'framer-motion'
import { LockIcon } from 'lucide-react'
import { SectionHeader } from './SectionHeader'
import { EVOLUTION_STAGES } from '../data/seed'
import { useExperiment } from '../contexts/ExperimentContext'

export function EvolutionSection() {
  const { evolutionLevel } = useExperiment()

  return (
    <section className="relative w-full max-w-4xl mx-auto px-4 py-20">
      <SectionHeader
        eyebrow="Trajectory"
        title="EVOLUTION"
        description="Progress is not a straight line. History shapes what unlocks next. The final stage stays unknown."
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {EVOLUTION_STAGES.map((stage, i) => {
          const reached = evolutionLevel >= stage.level
          const locked = !stage.revealed
          return (
            <motion.div
              key={stage.level}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
              className={[
                'relative exp-glass rounded-xl p-4 border text-center overflow-hidden',
                locked
                  ? 'border-signal-psy/30'
                  : reached
                    ? 'border-neural/40'
                    : 'border-white/5',
              ].join(' ')}
            >
              {reached && !locked && (
                <div className="absolute inset-0 bg-neural/5 pointer-events-none" />
              )}
              <div
                className={[
                  'font-display font-bold text-2xl mb-1',
                  reached && !locked ? 'text-neural' : 'text-slate-600',
                ].join(' ')}
              >
                {stage.level}
              </div>
              <div className="font-mono text-[10px] tracking-[0.15em] uppercase flex items-center justify-center gap-1">
                {locked ? (
                  <>
                    <LockIcon className="w-3 h-3 text-signal-psy" />
                    <span className="text-signal-psy exp-text-glitch">{stage.name}</span>
                  </>
                ) : (
                  <span className={reached ? 'text-slate-200' : 'text-slate-500'}>
                    {stage.name}
                  </span>
                )}
              </div>
              {reached && !locked && (
                <div className="mt-2 font-mono text-[8px] text-neural/70 uppercase tracking-widest">
                  reached
                </div>
              )}
            </motion.div>
          )
        })}
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="text-center font-mono text-xs text-slate-600 mt-8 italic"
      >
        Current stage: Level {evolutionLevel} — the experiment has not finished becoming.
      </motion.p>
    </section>
  )
}
