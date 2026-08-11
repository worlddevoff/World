import React from 'react'
import { motion } from 'framer-motion'
import { LockIcon, GlobeIcon } from 'lucide-react'
import { SectionHeader } from './SectionHeader'
import { useExperiment } from '../contexts/ExperimentContext'
import { ABILITY_BY_ID } from '../data/abilities'
import { AnimatedNumber } from './AnimatedNumber'
import { growthForPercent } from '../engine/evolutionEngine'
import { formatUsd } from '../utils/experimentFormat'

const SEARCH_LEVEL = ABILITY_BY_ID.search.minEvolution

export function InternetAccessSection() {
  const { abilities, evolutionPercent, growth } = useExperiment()
  const unlocked = abilities.includes('search')
  const progress = Math.min(100, (evolutionPercent / SEARCH_LEVEL) * 100)
  const needUsd = Math.max(0, growthForPercent(SEARCH_LEVEL) - growth)

  return (
    <section className="relative w-full max-w-3xl mx-auto px-4 py-20">
      <SectionHeader
        eyebrow="Major milestone"
        title="INTERNET ACCESS"
        description="When the organism can leave the lab, the experiment changes permanently."
      />

      <div className="exp-glass border border-white/5 rounded-2xl overflow-hidden">
        {/* Fake browser chrome */}
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-white/5 bg-void-900/80">
          <span className="w-2.5 h-2.5 rounded-full bg-white/10" />
          <span className="w-2.5 h-2.5 rounded-full bg-white/10" />
          <span className="w-2.5 h-2.5 rounded-full bg-white/10" />
          <div className="ml-2 flex-1 h-6 rounded-md bg-white/5 border border-white/5 flex items-center px-3 font-mono text-[10px] text-slate-600 truncate">
            experiment://outbound
          </div>
        </div>

        <div className="p-8 sm:p-12 text-center min-h-[280px] flex flex-col items-center justify-center relative">
          <div className="absolute inset-0 exp-grid-bg opacity-20 pointer-events-none" />

          {!unlocked ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="relative"
            >
              <LockIcon className="w-8 h-8 mx-auto text-slate-600 mb-4" />
              <div className="font-display font-bold text-xl sm:text-2xl text-slate-200 tracking-wide">
                ACCESS LOCKED
              </div>
              <p className="font-mono text-xs sm:text-sm text-slate-500 mt-3 max-w-md mx-auto">
                The Experiment cannot currently access the outside world.
              </p>

              <div className="mt-8 w-full max-w-xs mx-auto">
                <div className="flex items-end justify-between mb-2">
                  <span className="font-display font-bold text-3xl text-neural tabular-nums">
                    <AnimatedNumber value={progress} decimals={0} />%
                  </span>
                  <span className="font-mono text-[10px] text-slate-500 tracking-widest uppercase text-right">
                    <AnimatedNumber value={evolutionPercent} decimals={0} />% / {SEARCH_LEVEL}%
                    <br />
                    {needUsd > 0 ? `~${formatUsd(Math.ceil(needUsd))} more` : 'threshold met'}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-neural"
                    style={{ boxShadow: '0 0 12px #2dd4bf' }}
                    animate={{ width: `${progress}%` }}
                    transition={{ type: 'spring', stiffness: 80, damping: 20 }}
                  />
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative"
            >
              <GlobeIcon className="w-8 h-8 mx-auto text-neural mb-4" />
              <div className="font-display font-bold text-xl sm:text-2xl text-neural tracking-wide">
                THE EXPERIMENT IS ONLINE
              </div>
              <div className="mt-6 exp-glass border border-neural/20 rounded-xl px-5 py-4 text-left max-w-md mx-auto">
                <div className="font-mono text-[10px] tracking-[0.3em] text-slate-500 uppercase mb-2">
                  Current activity
                </div>
                <p className="font-mono text-sm text-slate-300">
                  Agent channel ready. Awaiting controlled tools —
                  <span className="text-neural"> web_search</span>, browser, memory.
                </p>
                <p className="font-mono text-[11px] text-slate-600 mt-3 italic">
                  No simulated browsing. Real outbound access ships with the agent layer.
                </p>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </section>
  )
}
