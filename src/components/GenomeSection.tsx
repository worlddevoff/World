import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { RotateCcwIcon, DnaIcon } from 'lucide-react'
import { SectionHeader } from './SectionHeader'
import { useExperiment } from '../contexts/ExperimentContext'
import { PERSONALITY_COLOR } from '../data/seed'
import { formatUsd } from '../utils/experimentFormat'

const CATEGORY_STYLE: Record<string, { label: string; color: string }> = {
  physical: { label: 'PHYSICAL', color: '#2dd4bf' },
  behavioral: { label: 'BEHAVIORAL', color: '#a78bfa' },
  cognitive: { label: 'COGNITIVE', color: '#38bdf8' },
  structural: { label: 'STRUCTURAL', color: '#64748b' },
}

export function GenomeSection() {
  const {
    traits,
    growth,
    nextThreshold,
    progressToNext,
    totalStages,
    personality,
    wordsSpoken,
    memories,
    stats,
    resetExperiment,
    emergenceIndex,
  } = useExperiment()
  const accent = PERSONALITY_COLOR[personality]

  const grouped = {
    physical: traits.filter((t) => t.category === 'physical'),
    behavioral: traits.filter((t) => t.category === 'behavioral'),
    cognitive: traits.filter((t) => t.category === 'cognitive'),
  }

  return (
    <section className="relative w-full max-w-4xl mx-auto px-4 py-20">
      <SectionHeader
        eyebrow="Internal state"
        title="WHAT IT IS BECOMING"
        description="The market is its environment. Buys are evolutionary pressure. Stats and memories shape a unique creature."
      />

      {/* Personality vectors */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
        {(
          [
            ['curiosity', stats.curiosity],
            ['intelligence', stats.intelligence],
            ['fear', stats.fear],
            ['confidence', stats.confidence],
          ] as const
        ).map(([label, value]) => (
          <div
            key={label}
            className="exp-glass border border-white/5 rounded-lg px-3 py-2"
          >
            <div className="font-mono text-[9px] tracking-[0.2em] text-slate-500 uppercase">
              {label}
            </div>
            <div className="font-display font-semibold text-slate-100 tabular-nums">
              {Math.round(value)}
            </div>
          </div>
        ))}
      </div>

      {/* Next mutation progress */}
      <div className="exp-glass border border-white/5 rounded-xl p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <span className="font-mono text-[10px] tracking-[0.3em] text-slate-500 uppercase">
            Next emergence
          </span>
          <span className="font-mono text-[10px] text-slate-400">
            {emergenceIndex} / {totalStages} stages · {memories.length} memories
          </span>
        </div>
        <div className="h-2 rounded-full bg-white/5 overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ background: accent, boxShadow: `0 0 12px ${accent}` }}
            animate={{ width: `${progressToNext * 100}%` }}
            transition={{ type: 'spring', stiffness: 120, damping: 20 }}
          />
        </div>
        <div className="flex items-center justify-between mt-2 font-mono text-[10px] text-slate-500">
          <span>{formatUsd(Math.round(growth))} absorbed</span>
          <span className="text-slate-400">
            next trait at {formatUsd(nextThreshold)}
          </span>
        </div>
      </div>

      {traits.length === 0 ? (
        <div className="exp-glass border border-white/5 rounded-xl p-10 text-center">
          <DnaIcon className="w-6 h-6 mx-auto text-slate-600 mb-3" />
          <p className="font-mono text-sm text-slate-500">
            Day 1. A tiny glowing blob. No face. No personality. It has not grown anything yet.
          </p>
          <p className="font-mono text-xs text-slate-600 mt-2">
            Teach it to begin the emergence.
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-3 gap-4">
          {(['physical', 'behavioral', 'cognitive'] as const).map((cat) => {
            const style = CATEGORY_STYLE[cat]
            const items = grouped[cat]
            return (
              <div
                key={cat}
                className="exp-glass border border-white/5 rounded-xl p-4"
              >
                <div
                  className="font-mono text-[10px] tracking-[0.3em] uppercase mb-3"
                  style={{ color: style.color }}
                >
                  {style.label}
                </div>
                {items.length === 0 ? (
                  <p className="font-mono text-[11px] text-slate-600 italic">
                    none yet
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    <AnimatePresence>
                      {items.map((t) => (
                        <motion.span
                          key={t.id}
                          initial={{ opacity: 0, scale: 0.6 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.6 }}
                          className="font-mono text-[10px] px-2 py-1 rounded border tracking-wider"
                          style={{
                            borderColor: `${style.color}40`,
                            color: style.color,
                            background: `${style.color}0d`,
                          }}
                        >
                          {t.label}
                        </motion.span>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {wordsSpoken.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-6 text-center font-mono text-sm text-slate-300"
        >
          It has spoken:{' '}
          {wordsSpoken.map((w, i) => (
            <span key={i} className="exp-text-glitch text-neural mx-1">
              &ldquo;{w}&rdquo;
            </span>
          ))}
        </motion.div>
      )}

      {memories.length > 0 && (
        <div className="mt-6 exp-glass border border-white/5 rounded-xl p-4">
          <div className="font-mono text-[10px] tracking-[0.3em] text-slate-500 uppercase mb-3">
            Persistent memories
          </div>
          <ul className="space-y-2">
            {memories.slice(0, 5).map((m) => (
              <li key={m.id} className="font-mono text-xs text-slate-400 italic">
                &ldquo;{m.text}&rdquo;
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-8 flex items-center justify-center">
        <button
          onClick={resetExperiment}
          className="group inline-flex items-center gap-2 font-mono text-[10px] tracking-[0.2em] uppercase text-slate-500 hover:text-slate-300 border border-white/10 hover:border-white/20 rounded-full px-4 py-2 transition-colors"
        >
          <RotateCcwIcon className="w-3 h-3 group-hover:-rotate-90 transition-transform" />
          Restart the experiment — grow a different creature
        </button>
      </div>
    </section>
  )
}
