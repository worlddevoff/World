import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useExperiment } from '../contexts/ExperimentContext'
import { SectionHeader } from './SectionHeader'
import { formatNumber, formatUsd } from '../utils/experimentFormat'
import { shortMint } from '../config/pump'

function feedStatusLabel(status: string, hasKey: boolean): string {
  if (!hasKey) return 'ingest offline'
  if (status === 'live') return 'pump live'
  if (status === 'connecting') return 'connecting'
  if (status === 'error') return 'feed error'
  if (status === 'no-mint') return 'no mint'
  return 'idle'
}

export function MarketFeed() {
  const { events, pump, syncMode, thinking } = useExperiment()
  const shown = events.slice(0, 12)
  const live = pump.status === 'live'
  const statusTone = live
    ? 'text-signal-teach'
    : pump.status === 'error'
      ? 'text-signal-forget'
      : syncMode === 'shared'
        ? 'text-neural'
        : 'text-slate-500'

  return (
    <section className="relative w-full max-w-4xl mx-auto px-4 py-20">
      <SectionHeader
        eyebrow="Live signal"
        title="MARKET FEED"
        description="Real PumpPortal trades teach and erase. Every fill updates the shared mind — then the AI thinks about it."
      />

      <div className="exp-glass border border-white/5 rounded-xl overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 border-b border-white/5">
          <div className="flex items-center gap-3 min-w-0">
            <span className="font-mono text-[10px] tracking-[0.25em] text-slate-500 uppercase">
              pump.stream
            </span>
            {pump.mint && (
              <span className="font-mono text-[10px] text-slate-600 truncate">
                {shortMint(pump.mint)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-widest">
            <span className="text-slate-600 tabular-nums">
              {pump.tradeCount} fills
            </span>
            {thinking && (
              <span className="text-sky-400/80">ai reacting</span>
            )}
            <span className={['flex items-center gap-1.5', statusTone].join(' ')}>
              <span
                className={[
                  'w-1.5 h-1.5 rounded-full',
                  live
                    ? 'bg-signal-teach animate-pulse'
                    : pump.status === 'error'
                      ? 'bg-signal-forget'
                      : 'bg-slate-600',
                ].join(' ')}
              />
              {feedStatusLabel(pump.status, pump.hasApiKey)}
            </span>
          </div>
        </div>

        {pump.detail && pump.status === 'error' && (
          <div className="px-4 py-2 border-b border-signal-forget/20 bg-signal-forget/5 font-mono text-[10px] text-signal-forget/90">
            {pump.detail}
          </div>
        )}

        <div className="divide-y divide-white/5 min-h-[360px]">
          <AnimatePresence initial={false}>
            {shown.map((e) => {
              const isBuy = e.kind === 'buy'
              const color = isBuy ? 'text-signal-teach' : 'text-signal-forget'
              const markColor = isBuy ? '#34d399' : '#f43f5e'
              return (
                <motion.div
                  key={e.id}
                  layout
                  initial={{
                    opacity: 0,
                    x: -16,
                    backgroundColor: isBuy
                      ? 'rgba(52,211,153,0.12)'
                      : 'rgba(244,63,94,0.12)',
                  }}
                  animate={{ opacity: 1, x: 0, backgroundColor: 'rgba(0,0,0,0)' }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5 }}
                  className="flex items-center gap-3 px-4 py-3"
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ background: markColor, boxShadow: `0 0 8px ${markColor}` }}
                  />
                  <span className="font-mono text-xs text-slate-400 w-[72px] shrink-0">
                    {e.wallet}
                  </span>
                  <span className="font-mono text-[11px] sm:text-xs text-slate-200 flex-1 truncate tracking-wide">
                    <span className={color}>{isBuy ? 'BUY' : 'SELL'}</span>
                    <span className="text-slate-600"> · </span>
                    {isBuy ? 'taught the experiment' : 'erased from the experiment'}
                    <span className="hidden sm:inline text-slate-600">
                      {' '}
                      — {e.label}
                    </span>
                  </span>
                  <span
                    className={`font-display font-semibold text-sm ${color} tabular-nums shrink-0`}
                  >
                    {isBuy ? '+' : '-'}
                    {formatNumber(e.delta)}
                  </span>
                  <span className="hidden sm:inline font-mono text-[10px] text-slate-500 w-16 text-right shrink-0 tabular-nums">
                    {formatUsd(e.amount)}
                  </span>
                </motion.div>
              )
            })}
          </AnimatePresence>
          {shown.length === 0 && (
            <div className="flex flex-col items-center justify-center h-[360px] gap-2 px-6 text-center">
              <p className="font-mono text-xs text-slate-600 uppercase tracking-widest">
                {live
                  ? 'listening for the next fill…'
                  : pump.hasApiKey
                    ? 'waiting for server ingest…'
                    : 'set PUMPPORTAL_API_KEY on the server to stream trades'}
              </p>
              <p className="font-mono text-[11px] text-slate-700 max-w-sm">
                Buys and sells land here first, then write memories and trigger AI thoughts.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
