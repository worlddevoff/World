import React from 'react'
import { motion } from 'framer-motion'
import { LockIcon } from 'lucide-react'
import { SectionHeader } from './SectionHeader'
import { useExperiment } from '../contexts/ExperimentContext'
import { ABILITY_BY_ID } from '../data/abilities'
import { X_HANDLE_AT, X_URL, SITE_NAME } from '../config/brand'
import { AnimatedNumber } from './AnimatedNumber'

const SOCIAL_LEVEL = ABILITY_BY_ID.socialize.minEvolution

/** Placeholder handle until a real Experiment X account is connected. */
const EXPERIMENT_X = X_HANDLE_AT

export function CommunicationSection() {
  const { abilities, evolutionPercent, thoughts } = useExperiment()
  const unlocked = abilities.includes('socialize') || abilities.includes('speak')
  const progress = Math.min(100, (evolutionPercent / SOCIAL_LEVEL) * 100)

  return (
    <section className="relative w-full max-w-3xl mx-auto px-4 py-20">
      <SectionHeader
        eyebrow="Outbound voice"
        title="COMMUNICATION"
        description="When it can speak to humans, the experiment leaves the lab."
      />

      <div className="exp-glass border border-white/5 rounded-2xl p-6 sm:p-8">
        {!unlocked ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center py-6"
          >
            <LockIcon className="w-7 h-7 mx-auto text-slate-600 mb-4" />
            <div className="font-display font-bold text-xl text-slate-200 tracking-wide">
              X ACCESS
            </div>
            <p className="font-mono text-xs sm:text-sm text-slate-500 mt-3 max-w-md mx-auto">
              The Experiment cannot currently communicate with humans.
            </p>
            <div className="mt-6 font-mono text-[10px] tracking-[0.3em] text-slate-500 uppercase tabular-nums">
              <AnimatedNumber value={evolutionPercent} decimals={0} />% / {SOCIAL_LEVEL}% ·{' '}
              <AnimatedNumber value={progress} decimals={0} />% of the way
            </div>
            <div className="mt-3 h-1.5 max-w-xs mx-auto rounded-full bg-white/5 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-signal-psy/70"
                animate={{ width: `${progress}%` }}
              />
            </div>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="flex items-center justify-between gap-3 flex-wrap mb-6">
              <div>
                <div className="font-display font-bold text-lg text-slate-100">
                  {SITE_NAME}
                </div>
                <a
                  href={X_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-xs text-neural hover:underline"
                >
                  {EXPERIMENT_X}
                </a>
              </div>
              <span className="font-mono text-[9px] px-2.5 py-1 rounded-full border border-neural/30 text-neural uppercase tracking-widest">
                channel open
              </span>
            </div>

            <div className="border border-white/5 rounded-xl p-4 bg-void-900/40">
              <p className="font-mono text-sm text-slate-300 italic">
                {thoughts[0]
                  ? `"${thoughts[0].text}"`
                  : '"I have been watching you."'}
              </p>
              <p className="font-mono text-[10px] text-slate-600 mt-4">
                Live posts will appear here when the X agent is connected. No fabricated
                tweets.
              </p>
            </div>
          </motion.div>
        )}
      </div>
    </section>
  )
}
