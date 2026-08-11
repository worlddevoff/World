import React from 'react'
import { motion } from 'framer-motion'
import { CheckIcon, LockIcon } from 'lucide-react'
import { SectionHeader } from './SectionHeader'
import { useExperiment } from '../contexts/ExperimentContext'
import { ABILITIES, progressTowardAbility } from '../data/abilities'
import { PERSONALITY_COLOR } from '../data/seed'
import { AnimatedNumber } from './AnimatedNumber'

export function AbilitiesSection() {
  const { abilities, personality, evolutionPercent, stats } = useExperiment()
  const color = PERSONALITY_COLOR[personality]

  return (
    <section className="relative w-full max-w-3xl mx-auto px-4 py-20">
      <SectionHeader
        eyebrow="Capability ladder"
        title="WHAT IT CAN DO"
        description="Unlock % tracks live market pressure. Buys push forward. Sells pull it back."
      />

      <div className="space-y-2">
        {ABILITIES.map((ability, i) => {
          const unlocked = abilities.includes(ability.id)
          const lockedFinal = ability.id === 'unknown'
          const toward = progressTowardAbility(evolutionPercent, ability, abilities)
          const pctAway = Math.max(0, Math.ceil(ability.minEvolution - evolutionPercent))
          const statsReady =
            !ability.requires ||
            Object.entries(ability.requires).every(
              ([k, min]) => (stats[k as keyof typeof stats] ?? 0) >= (min ?? 0),
            )

          return (
            <motion.div
              key={ability.id}
              initial={{ opacity: 0, x: -10 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ delay: i * 0.04 }}
              className={[
                'exp-glass rounded-xl border px-4 py-3.5 flex items-start gap-3 transition-colors',
                unlocked
                  ? 'border-neural/30 bg-neural/5'
                  : 'border-white/5 opacity-80',
              ].join(' ')}
            >
              <span
                className={[
                  'mt-0.5 w-7 h-7 rounded-md flex items-center justify-center shrink-0 border',
                  unlocked
                    ? 'border-neural/40 text-neural'
                    : 'border-white/10 text-slate-600',
                ].join(' ')}
                style={unlocked ? { boxShadow: `0 0 12px ${color}33` } : undefined}
              >
                {unlocked ? (
                  <CheckIcon className="w-3.5 h-3.5" />
                ) : (
                  <LockIcon className="w-3.5 h-3.5" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <span
                    className={[
                      'font-display font-semibold tracking-wide',
                      unlocked ? 'text-slate-100' : 'text-slate-500',
                      lockedFinal ? 'exp-text-glitch text-signal-psy' : '',
                    ].join(' ')}
                  >
                    {ability.label}
                  </span>
                  {!unlocked && (
                    <span className="font-mono text-[10px] text-slate-500 tracking-widest uppercase tabular-nums">
                      <AnimatedNumber value={evolutionPercent} decimals={0} />% /{' '}
                      {ability.minEvolution}%
                      {evolutionPercent < ability.minEvolution
                        ? ` · ${pctAway}% away`
                        : statsReady
                          ? ''
                          : ' · stats short'}
                    </span>
                  )}
                  {unlocked && (
                    <span className="font-mono text-[9px] text-neural tracking-widest uppercase">
                      active
                    </span>
                  )}
                </div>
                <p className="font-mono text-[11px] text-slate-500 mt-0.5">
                  {ability.description}
                </p>
                {!unlocked && !lockedFinal && (
                  <div className="mt-2.5 h-1 rounded-full bg-white/5 overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{
                        background: toward >= 1 ? color : 'rgba(148,163,184,0.5)',
                      }}
                      animate={{ width: `${toward * 100}%` }}
                      transition={{ type: 'spring', stiffness: 90, damping: 20 }}
                    />
                  </div>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>
    </section>
  )
}
