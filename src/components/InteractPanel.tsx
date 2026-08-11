import React from 'react'
import { motion } from 'framer-motion'
import { useExperiment } from '../contexts/ExperimentContext'
import { formatUsd } from '../utils/experimentFormat'

interface TierButton {
  amount: number
  effect: string
}

// Cumulative buy volume is what grows the creature — these are the
// canonical milestones on the emergence path.
const BUY_TIERS: TierButton[] = [
  { amount: 25, effect: 'new connection' },
  { amount: 500, effect: 'sensory organ' },
  { amount: 2000, effect: 'an eye' },
  { amount: 10000, effect: 'a mouth' },
  { amount: 25000, effect: 'first word' },
]

const SELL_TIERS: TierButton[] = [
  { amount: 10, effect: 'minor loss' },
  { amount: 500, effect: 'knowledge lost' },
  { amount: 5000, effect: 'trait forgotten' },
  { amount: 25000, effect: 'critical wipe' },
]

export function InteractPanel() {
  const { trigger } = useExperiment()

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="text-center mb-5">
        <p className="font-mono text-[10px] tracking-[0.35em] text-slate-500 uppercase">
          Influence the experiment
        </p>
        <p className="font-display text-lg text-slate-200 mt-1">
          <span className="text-signal-teach">BUY = TEACH</span>
          <span className="text-slate-600 mx-3">/</span>
          <span className="text-signal-forget">SELL = FORGET</span>
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {/* Teach */}
        <div className="exp-glass border border-signal-teach/20 rounded-xl p-4">
          <div className="font-mono text-[10px] tracking-[0.3em] text-signal-teach uppercase mb-3">
            Teach it
          </div>
          <div className="flex flex-wrap gap-2">
            {BUY_TIERS.map((t) => (
              <motion.button
                key={t.amount}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => trigger('buy', t.amount)}
                className="group flex-1 min-w-[92px] rounded-lg border border-signal-teach/25 bg-signal-teach/5 hover:bg-signal-teach/15 px-3 py-2.5 text-left transition-colors"
              >
                <div className="font-display font-semibold text-signal-teach">
                  {formatUsd(t.amount)}
                </div>
                <div className="font-mono text-[9px] text-slate-500 group-hover:text-slate-400 uppercase tracking-wider">
                  {t.effect}
                </div>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Forget */}
        <div className="exp-glass border border-signal-forget/20 rounded-xl p-4">
          <div className="font-mono text-[10px] tracking-[0.3em] text-signal-forget uppercase mb-3">
            Make it forget
          </div>
          <div className="flex flex-wrap gap-2">
            {SELL_TIERS.map((t) => (
              <motion.button
                key={t.amount}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => trigger('sell', t.amount)}
                className="group flex-1 min-w-[92px] rounded-lg border border-signal-forget/25 bg-signal-forget/5 hover:bg-signal-forget/15 px-3 py-2.5 text-left transition-colors"
              >
                <div className="font-display font-semibold text-signal-forget">
                  {formatUsd(t.amount)}
                </div>
                <div className="font-mono text-[9px] text-slate-500 group-hover:text-slate-400 uppercase tracking-wider">
                  {t.effect}
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
