import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FlaskConicalIcon, XIcon } from 'lucide-react'
import { useExperiment } from '../contexts/ExperimentContext'
import { formatUsd } from '../utils/experimentFormat'

const BUY_AMOUNTS = [10, 100, 1000, 10000]
const SELL_AMOUNTS = [10, 100, 1000, 10000]

/** Only the local Vite dev server — never on the public site. */
function useDevVisible(): boolean {
  return import.meta.env.DEV
}

/** Dev simulation — same evolution engine as production PumpPortal trades. */
export function DevSimPanel() {
  const visible = useDevVisible()
  const [open, setOpen] = useState(true)
  const {
    trigger,
    forceMutation,
    forceEvolution,
    forceMemoryLoss,
    forceThink,
    resetExperiment,
    evolutionPercent,
    growth,
    abilities,
    syncMode,
  } = useExperiment()

  if (!visible) return null

  return (
    <div className="fixed bottom-4 right-4 z-[60] max-w-[min(100vw-2rem,340px)]">
      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="exp-glass border border-neural/25 rounded-xl shadow-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-3 py-2 border-b border-white/5 bg-void-900/80">
              <span className="font-mono text-[10px] tracking-[0.25em] text-neural uppercase flex items-center gap-1.5">
                <FlaskConicalIcon className="w-3 h-3" />
                Dev sim
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-slate-500 hover:text-slate-300"
                aria-label="Collapse"
              >
                <XIcon className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-3 space-y-3 max-h-[70vh] overflow-y-auto">
              <p className="font-mono text-[9px] text-slate-500 leading-relaxed">
                Same engine as live trades. Mode:{' '}
                <span className={syncMode === 'shared' ? 'text-neural' : 'text-signal-warn'}>
                  {syncMode}
                </span>{' '}
                · Evo {Math.round(evolutionPercent)}% · growth {formatUsd(Math.round(growth))} ·{' '}
                {abilities.length} abilities
              </p>

              <div>
                <div className="font-mono text-[9px] text-signal-teach tracking-widest uppercase mb-1.5">
                  Buy = teach
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {BUY_AMOUNTS.map((a) => (
                    <button
                      key={`b${a}`}
                      type="button"
                      onClick={() => trigger('buy', a, 'DEV_WALLET')}
                      className="rounded-md border border-signal-teach/30 bg-signal-teach/10 hover:bg-signal-teach/20 px-1 py-2 font-mono text-[10px] text-signal-teach"
                    >
                      {formatUsd(a)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="font-mono text-[9px] text-signal-forget tracking-widest uppercase mb-1.5">
                  Sell = forget
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {SELL_AMOUNTS.map((a) => (
                    <button
                      key={`s${a}`}
                      type="button"
                      onClick={() => trigger('sell', a, 'DEV_WALLET')}
                      className="rounded-md border border-signal-forget/30 bg-signal-forget/10 hover:bg-signal-forget/20 px-1 py-2 font-mono text-[10px] text-signal-forget"
                    >
                      {formatUsd(a)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-1.5">
                <button
                  type="button"
                  onClick={forceMutation}
                  className="rounded-md border border-signal-psy/30 bg-signal-psy/10 hover:bg-signal-psy/20 px-2 py-2 font-mono text-[10px] text-signal-psy uppercase tracking-wider"
                >
                  Trigger mutation
                </button>
                <button
                  type="button"
                  onClick={forceEvolution}
                  className="rounded-md border border-neural/30 bg-neural/10 hover:bg-neural/20 px-2 py-2 font-mono text-[10px] text-neural uppercase tracking-wider"
                >
                  Trigger evolution
                </button>
                <button
                  type="button"
                  onClick={forceMemoryLoss}
                  className="rounded-md border border-signal-warn/30 bg-signal-warn/10 hover:bg-signal-warn/20 px-2 py-2 font-mono text-[10px] text-signal-warn uppercase tracking-wider"
                >
                  Trigger memory loss
                </button>
                <button
                  type="button"
                  onClick={forceThink}
                  className="rounded-md border border-sky-400/30 bg-sky-400/10 hover:bg-sky-400/20 px-2 py-2 font-mono text-[10px] text-sky-300 uppercase tracking-wider"
                >
                  Trigger AI thought
                </button>
                <button
                  type="button"
                  onClick={resetExperiment}
                  className="rounded-md border border-white/10 hover:border-white/20 px-2 py-2 font-mono text-[10px] text-slate-500 uppercase tracking-wider"
                >
                  Reset organism
                </button>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.button
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={() => setOpen(true)}
            className="exp-glass border border-neural/30 rounded-full px-3 py-2 font-mono text-[10px] text-neural tracking-widest uppercase flex items-center gap-1.5"
          >
            <FlaskConicalIcon className="w-3 h-3" />
            Dev
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}
